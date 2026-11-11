<!-- app/pages/admin/review.vue -->
<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui';
import { LlmStatusEnum, VerificationStatusEnum } from '#shared/enums/pdrb';
import { formatDateId, formatPeriodLabel } from '#shared/utils/period';
import type { AdminArticleItem, AdminArticlesResponse } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { setQueueCounts } = useAdminSession();
const {
  getKbliShortCodeName,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getLlmStatusBadge,
  isSafeHttpUrl,
} = usePdrbLabels();

const activeStatus = ref<VerificationStatusEnum>(VerificationStatusEnum.PENDING);
const onlyLlmFailed = ref(false);
const searchInput = ref('');
const debouncedSearch = ref('');
const page = ref(1);
const PAGE_LIMIT = 20;

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (val: string) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedSearch.value = val.trim();
    page.value = 1;
  }, 300);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

const queryParams = computed(() => {
  const q: Record<string, string | number> = {
    status: activeStatus.value,
    page: page.value,
    limit: PAGE_LIMIT,
  };
  if (onlyLlmFailed.value) q.llmStatus = LlmStatusEnum.FAILED;
  if (debouncedSearch.value) q.q = debouncedSearch.value;
  return q;
});

const {
  data: reviewData,
  pending,
  refresh,
} = await useFetch<AdminArticlesResponse>('/api/admin/articles', {
  query: queryParams,
  watch: [queryParams],
  credentials: 'include',
});

watchEffect(() => {
  const counts = reviewData.value?.summaryCounts;
  if (counts) {
    setQueueCounts(counts.pendingCount, counts.llmFailedCount);
  }
});

const tabValueModel = computed<string | number>({
  get: () => activeStatus.value,
  set: (val: string | number) => {
    activeStatus.value = val as VerificationStatusEnum;
    page.value = 1;
    clearSelection();
  },
});

const tabItems = computed<TabsItem[]>(() => {
  const counts = reviewData.value?.summaryCounts;
  return [
    {
      label: 'Menunggu Review',
      value: VerificationStatusEnum.PENDING,
      icon: 'i-lucide-clock',
      badge: counts
        ? { label: String(counts.pendingCount), color: 'warning', variant: 'subtle' }
        : undefined,
    },
    {
      label: 'Terverifikasi',
      value: VerificationStatusEnum.VERIFIED,
      icon: 'i-lucide-check-circle-2',
      badge: counts
        ? { label: String(counts.verifiedCount), color: 'success', variant: 'subtle' }
        : undefined,
    },
    {
      label: 'Diabaikan',
      value: VerificationStatusEnum.IGNORED,
      icon: 'i-lucide-archive-x',
      badge: counts
        ? { label: String(counts.ignoredCount), color: 'neutral', variant: 'subtle' }
        : undefined,
    },
  ];
});

watch(onlyLlmFailed, () => {
  page.value = 1;
  clearSelection();
});

// Batch selection state keyed by article UUID
const selectedMap = ref<Record<string, boolean>>({});
const selectedIds = computed(() =>
  Object.entries(selectedMap.value)
    .filter(([, checked]) => checked)
    .map(([id]) => id),
);

function clearSelection() {
  selectedMap.value = {};
}

const currentRows = computed<AdminArticleItem[]>(() => reviewData.value?.items ?? []);

const headerCheckboxState = computed<boolean | 'indeterminate'>(() => {
  if (currentRows.value.length === 0) return false;
  const checkedCount = currentRows.value.filter(
    (row: AdminArticleItem) => Boolean(selectedMap.value[row.id]),
  ).length;
  if (checkedCount === 0) return false;
  if (checkedCount === currentRows.value.length) return true;
  return 'indeterminate';
});

function toggleSelectAll(nextState: boolean | 'indeterminate') {
  const shouldSelect = nextState === true;
  const updated = { ...selectedMap.value };
  for (const row of currentRows.value) {
    if (shouldSelect) {
      updated[row.id] = true;
    } else {
      delete updated[row.id];
    }
  }
  selectedMap.value = updated;
}

function toggleRowSelection(id: string, nextState: boolean | 'indeterminate') {
  const updated = { ...selectedMap.value };
  if (nextState === true) {
    updated[id] = true;
  } else {
    delete updated[id];
  }
  selectedMap.value = updated;
}

// Slide-over Drawer State
const drawerOpen = ref(false);
const activeDrawerArticle = ref<AdminArticleItem | null>(null);
const highlightIncomplete = ref(false);
const autoAdvanceNext = ref(true);

function openReviewDrawer(article: AdminArticleItem, incompleteFlag = false) {
  activeDrawerArticle.value = article;
  highlightIncomplete.value = incompleteFlag;
  drawerOpen.value = true;
}

async function handleDrawerSaved(payload: {
  article: AdminArticleItem;
  action: 'VERIFIED' | 'IGNORED' | 'DRAFT';
}) {
  const savedId = payload.article.id;
  toggleRowSelection(savedId, false);
  await refresh();

  if (
    autoAdvanceNext.value &&
    activeStatus.value === VerificationStatusEnum.PENDING &&
    payload.action !== 'DRAFT'
  ) {
    const nextItem = (reviewData.value?.items ?? []).find(
      (item: AdminArticleItem) => item.id !== savedId,
    );
    if (nextItem) {
      activeDrawerArticle.value = nextItem;
      highlightIncomplete.value = nextItem.llmStatus === LlmStatusEnum.FAILED;
      return;
    }
  }

  drawerOpen.value = false;
  highlightIncomplete.value = false;
}

// Row 1-click quick actions
const rowBusyId = ref<string | null>(null);

async function quickApprove(article: AdminArticleItem) {
  if (rowBusyId.value) return;
  rowBusyId.value = article.id;

  try {
    await $fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      body: {
        verificationStatus: VerificationStatusEnum.VERIFIED,
      },
      credentials: 'include',
    });

    toggleRowSelection(article.id, false);
    toast.add({
      title: 'Artikel Terverifikasi',
      description: article.title,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    if (fetchErr.statusCode === 422) {
      toast.add({
        title: 'Klasifikasi Belum Lengkap',
        description:
          fetchErr.data?.message || 'Silakan lengkapi bidang yang ditandai di panel edit.',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
      openReviewDrawer(article, true);
    } else {
      toast.add({
        title: 'Gagal Memverifikasi',
        description: fetchErr.data?.message || 'Terjadi kesalahan saat memperbarui status.',
        color: 'error',
        icon: 'i-lucide-alert-circle',
      });
    }
  } finally {
    rowBusyId.value = null;
  }
}

async function quickIgnore(article: AdminArticleItem) {
  if (rowBusyId.value) return;
  rowBusyId.value = article.id;

  try {
    await $fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      body: {
        verificationStatus: VerificationStatusEnum.IGNORED,
      },
      credentials: 'include',
    });

    toggleRowSelection(article.id, false);
    toast.add({
      title: 'Artikel Diabaikan',
      description: article.title,
      color: 'neutral',
      icon: 'i-lucide-archive-x',
    });
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Mengabaikan Artikel',
      description: fetchErr.data?.message || 'Terjadi kesalahan saat memperbarui status.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    rowBusyId.value = null;
  }
}

// Batch action handler
const batchLoading = ref(false);

async function runBatchAction(action: 'VERIFY' | 'IGNORE') {
  if (batchLoading.value || selectedIds.value.length === 0) return;
  batchLoading.value = true;

  try {
    const res = await $fetch<{
      action: 'VERIFY' | 'IGNORE';
      updatedCount: number;
      updatedIds: string[];
      incompleteItems: Array<{ id: string; title: string; missingFields: string[] }>;
    }>('/api/admin/articles/batch', {
      method: 'POST',
      body: {
        ids: selectedIds.value,
        action,
      },
      credentials: 'include',
    });

    clearSelection();
    await refresh();

    if (res.incompleteItems.length > 0) {
      toast.add({
        title: `${res.updatedCount} Terverifikasi, ${res.incompleteItems.length} Perlu Kurasi Manual`,
        description: `${res.incompleteItems[0]?.title} belum memiliki pemetaan AI lengkap. Klik ikon Edit (✎) untuk melengkapi.`,
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
    } else {
      toast.add({
        title:
          action === 'VERIFY'
            ? `${res.updatedCount} Artikel Terverifikasi`
            : `${res.updatedCount} Artikel Diabaikan`,
        color: action === 'VERIFY' ? 'success' : 'neutral',
        icon: action === 'VERIFY' ? 'i-lucide-check-circle-2' : 'i-lucide-archive-x',
      });
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Aksi Batch Gagal',
      description: fetchErr.data?.message || 'Gagal memproses artikel terpilih.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    batchLoading.value = false;
  }
}

const columns: TableColumn<AdminArticleItem>[] = [
  { id: 'select', header: '' },
  { id: 'meta', header: 'Tgl / Sumber / Periode' },
  { id: 'title', header: 'Judul & Pratinjau Ringkasan' },
  { id: 'kbli', header: 'KBLI & Dampak' },
  { id: 'expenditure', header: 'Pengeluaran & Dampak' },
  { id: 'actions', header: 'Aksi' },
];
</script>

<template>
  <div class="space-y-5">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          Review Harian Fenomena Ekonomi
        </h1>
        <p class="text-sm text-slate-600 mt-0.5">
          Kurasi antrean hasil crawling subuh (H-1) &amp; pemetaan dua sisi PDRB sebelum diterbitkan.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          placeholder="Cari judul / portal..."
          size="sm"
          class="w-full sm:w-56"
        />

        <div
          class="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-1.5"
        >
          <USwitch v-model="onlyLlmFailed" size="sm" />
          <span class="text-xs font-medium text-slate-700">Hanya LLM Gagal</span>
          <UBadge
            v-if="(reviewData?.summaryCounts.llmFailedCount ?? 0) > 0"
            color="error"
            variant="subtle"
            size="xs"
            class="tabular-nums"
          >
            {{ reviewData?.summaryCounts.llmFailedCount }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <UTabs v-model="tabValueModel" :items="tabItems" :content="false" />

    <!-- Batch Selection Action Bar -->
    <div
      v-if="selectedIds.length > 0"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-2.5 shadow-xs"
    >
      <div class="flex items-center gap-2 text-sm font-semibold text-teal-900 tabular-nums">
        <UIcon name="i-lucide-check-square" class="w-4 h-4 text-teal-700" />
        <span>{{ selectedIds.length }} artikel dipilih</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-if="activeStatus !== VerificationStatusEnum.VERIFIED"
          size="xs"
          color="primary"
          variant="solid"
          icon="i-lucide-check"
          :loading="batchLoading"
          @click="runBatchAction('VERIFY')"
        >
          Verifikasi Terpilih
        </UButton>
        <UButton
          v-if="activeStatus !== VerificationStatusEnum.IGNORED"
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-lucide-x"
          :loading="batchLoading"
          @click="runBatchAction('IGNORE')"
        >
          Abaikan Terpilih
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="batchLoading"
          @click="clearSelection"
        >
          Batal Pilih
        </UButton>
      </div>
    </div>

    <!-- Review Queue Table -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="currentRows"
        :columns="columns"
        :loading="pending"
        empty="Tidak ada artikel pada antrean tab ini."
      >
        <template #select-header>
          <UCheckbox
            :model-value="headerCheckboxState"
            aria-label="Pilih semua artikel di halaman ini"
            @update:model-value="toggleSelectAll"
          />
        </template>

        <template #select-cell="{ row }">
          <UCheckbox
            :model-value="Boolean(selectedMap[row.original.id])"
            :aria-label="`Pilih artikel ${row.original.title}`"
            @update:model-value="toggleRowSelection(row.original.id, $event)"
          />
        </template>

        <template #meta-cell="{ row }">
          <div class="space-y-1 min-w-[130px]">
            <div class="font-mono text-xs font-semibold tabular-nums text-slate-800">
              {{ formatDateId(row.original.publishedAt) }}
            </div>
            <div class="text-xs text-slate-600 truncate max-w-[150px]" :title="row.original.sourcePortal">
              {{ row.original.sourcePortal }}
            </div>
            <UBadge color="neutral" variant="outline" size="xs" class="font-mono tabular-nums">
              {{ formatPeriodLabel(row.original.quarter, row.original.year) }}
            </UBadge>
          </div>
        </template>

        <template #title-cell="{ row }">
          <div class="space-y-1.5 min-w-[240px] max-w-md">
            <div class="flex items-start gap-1.5">
              <button
                type="button"
                class="text-left font-semibold text-sm text-slate-900 hover:text-teal-700 leading-snug line-clamp-2 focus:outline-none focus-visible:underline"
                :title="row.original.title"
                @click="
                  openReviewDrawer(
                    row.original,
                    row.original.llmStatus === LlmStatusEnum.FAILED,
                  )
                "
              >
                {{ row.original.title }}
              </button>
              <a
                v-if="isSafeHttpUrl(row.original.url)"
                :href="row.original.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-slate-400 hover:text-teal-600 shrink-0 mt-0.5"
                title="Buka berita sumber di tab baru"
                aria-label="Buka berita sumber di tab baru"
              >
                <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
              </a>
            </div>

            <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {{
                row.original.summary ||
                row.original.snippetText ||
                'Ringkasan belum tersedia.'
              }}
            </p>

            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <UBadge
                v-if="row.original.llmStatus === LlmStatusEnum.FAILED"
                :color="getLlmStatusBadge(row.original.llmStatus).color"
                variant="subtle"
                size="xs"
                :icon="getLlmStatusBadge(row.original.llmStatus).icon"
              >
                AI Gagal — Klik ✎ untuk isi
              </UBadge>
              <UBadge
                v-else-if="row.original.aiConfidence !== null"
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-mono tabular-nums"
              >
                AI Conf: {{ Math.round(row.original.aiConfidence * 100) }}%
              </UBadge>

              <UBadge
                v-if="row.original.isEconomicPhenomenon === false"
                color="neutral"
                variant="outline"
                size="xs"
              >
                Non-Ekonomi
              </UBadge>
            </div>
          </div>
        </template>

        <template #kbli-cell="{ row }">
          <div v-if="row.original.kbliCategory" class="space-y-1.5 min-w-[160px]">
            <div class="text-xs font-medium text-slate-800 leading-snug">
              {{ getKbliShortCodeName(row.original.kbliCategory) }}
            </div>
            <UBadge
              v-if="row.original.kbliImpact"
              :color="getKbliImpactBadge(row.original.kbliImpact).color"
              variant="subtle"
              size="xs"
              :icon="getKbliImpactBadge(row.original.kbliImpact).icon"
            >
              {{ getKbliImpactBadge(row.original.kbliImpact).label }}
            </UBadge>
          </div>
          <UBadge v-else color="warning" variant="subtle" size="xs" icon="i-lucide-help-circle">
            Belum Dipetakan
          </UBadge>
        </template>

        <template #expenditure-cell="{ row }">
          <div v-if="row.original.expenditureComponent" class="space-y-1.5 min-w-[160px]">
            <div class="text-xs font-medium text-slate-800 leading-snug">
              {{ getExpenditureLabel(row.original.expenditureComponent, false) }}
            </div>
            <UBadge
              v-if="row.original.expenditureImpact"
              :color="getExpenditureImpactBadge(row.original.expenditureImpact).color"
              variant="subtle"
              size="xs"
              :icon="getExpenditureImpactBadge(row.original.expenditureImpact).icon"
            >
              {{ getExpenditureImpactBadge(row.original.expenditureImpact).shortLabel }}
            </UBadge>
          </div>
          <UBadge v-else color="warning" variant="subtle" size="xs" icon="i-lucide-help-circle">
            Belum Dipetakan
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip
              v-if="activeStatus !== VerificationStatusEnum.VERIFIED"
              text="Verifikasi 1-Klik"
            >
              <UButton
                size="xs"
                color="success"
                variant="subtle"
                icon="i-lucide-check"
                aria-label="Verifikasi artikel 1 klik"
                :loading="rowBusyId === row.original.id"
                @click="quickApprove(row.original)"
              />
            </UTooltip>

            <UTooltip text="Edit & Kurasi di Drawer">
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-pencil"
                aria-label="Edit dan kurasi artikel"
                @click="
                  openReviewDrawer(
                    row.original,
                    row.original.llmStatus === LlmStatusEnum.FAILED,
                  )
                "
              />
            </UTooltip>

            <UTooltip
              v-if="activeStatus !== VerificationStatusEnum.IGNORED"
              text="Abaikan Artikel"
            >
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                aria-label="Abaikan artikel"
                :loading="rowBusyId === row.original.id"
                @click="quickIgnore(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Pagination -->
    <div
      v-if="reviewData && reviewData.pagination.total > PAGE_LIMIT"
      class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1"
    >
      <span class="text-xs text-slate-500 font-mono tabular-nums">
        Halaman {{ reviewData.pagination.page }} dari {{ reviewData.pagination.totalPages }} (Total:
        {{ reviewData.pagination.total }} artikel)
      </span>
      <UPagination
        v-model:page="page"
        :total="reviewData.pagination.total"
        :items-per-page="PAGE_LIMIT"
      />
    </div>

    <!-- Slide-over Drawer Kurasi -->
    <AdminReviewSlideover
      v-model:open="drawerOpen"
      v-model:auto-advance-next="autoAdvanceNext"
      :article="activeDrawerArticle"
      :highlight-incomplete="highlightIncomplete"
      :show-auto-next-toggle="activeStatus === VerificationStatusEnum.PENDING"
      @saved="handleDrawerSaved"
    />
  </div>
</template>
