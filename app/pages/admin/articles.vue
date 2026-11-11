<!-- app/pages/admin/articles.vue -->
<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { VerificationStatusEnum } from '#shared/enums/pdrb';
import { formatDateId, formatPeriodLabel, getCurrentQuarterYearWita } from '#shared/utils/period';
import type { AdminArticleItem, AdminArticlesResponse, SelectOptionItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { setQueueCounts } = useAdminSession();
const { isExporting, downloadExport } = useExcelExport();
const {
  kbliOptions,
  expenditureOptions,
  quarterOptions,
  verificationStatusOptions,
  getKbliShortCodeName,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getVerificationStatusBadge,
  isSafeHttpUrl,
} = usePdrbLabels();

const currentPeriod = getCurrentQuarterYearWita();

const filters = reactive({
  q: '',
  quarter: 'ALL' as 'ALL' | 1 | 2 | 3 | 4,
  year: 'ALL' as 'ALL' | number,
  kbli: 'ALL',
  expenditure: 'ALL',
  portal: 'ALL',
  status: 'ALL',
  from: '',
  to: '',
});

const debouncedQ = ref('');
const page = ref(1);
const PAGE_LIMIT = 25;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => filters.q,
  (val: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQ.value = val.trim();
      page.value = 1;
    }, 300);
  },
);

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

watch(
  () => [
    filters.quarter,
    filters.year,
    filters.kbli,
    filters.expenditure,
    filters.portal,
    filters.status,
    filters.from,
    filters.to,
  ],
  () => {
    page.value = 1;
  },
);

const queryParams = computed(() => {
  const qObj: Record<string, string | number> = {
    page: page.value,
    limit: PAGE_LIMIT,
  };
  if (debouncedQ.value) qObj.q = debouncedQ.value;
  if (filters.quarter !== 'ALL') qObj.quarter = filters.quarter;
  if (filters.year !== 'ALL') qObj.year = filters.year;
  if (filters.kbli !== 'ALL') qObj.kbli = filters.kbli;
  if (filters.expenditure !== 'ALL') qObj.expenditure = filters.expenditure;
  if (filters.portal !== 'ALL') qObj.portal = filters.portal;
  if (filters.status !== 'ALL') qObj.status = filters.status;
  if (filters.from) qObj.from = filters.from;
  if (filters.to) qObj.to = filters.to;
  return qObj;
});

const {
  data: archiveData,
  pending,
  refresh,
} = await useFetch<AdminArticlesResponse>('/api/admin/articles', {
  query: queryParams,
  watch: [queryParams],
  credentials: 'include',
});

watchEffect(() => {
  const counts = archiveData.value?.summaryCounts;
  if (counts) {
    setQueueCounts(counts.pendingCount, counts.llmFailedCount);
  }
});

const quarterFilterItems = computed(() => [
  { label: 'Semua Triwulan', value: 'ALL' as const },
  ...quarterOptions,
]);

const yearFilterItems = computed(() => {
  const list: Array<{ label: string; value: 'ALL' | number }> = [
    { label: 'Semua Tahun', value: 'ALL' },
  ];
  for (let y = currentPeriod.year + 1; y >= currentPeriod.year - 4; y--) {
    list.push({ label: String(y), value: y });
  }
  return list;
});

const kbliFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua KBLI (A–U)', value: 'ALL' },
  ...kbliOptions,
]);

const expenditureFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua Komponen Pengeluaran', value: 'ALL' },
  ...expenditureOptions,
]);

const statusFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua Status', value: 'ALL' },
  ...verificationStatusOptions,
]);

const portalFilterItems = computed<SelectOptionItem<string>[]>(() => {
  const base: SelectOptionItem<string>[] = [{ label: 'Semua Portal', value: 'ALL' }];
  for (const portal of archiveData.value?.availablePortals ?? []) {
    base.push({ label: portal, value: portal });
  }
  return base;
});

function resetFilters() {
  filters.q = '';
  debouncedQ.value = '';
  filters.quarter = 'ALL';
  filters.year = 'ALL';
  filters.kbli = 'ALL';
  filters.expenditure = 'ALL';
  filters.portal = 'ALL';
  filters.status = 'ALL';
  filters.from = '';
  filters.to = '';
  page.value = 1;
}

function buildExportParams(format: 'xlsx' | 'csv') {
  return {
    format,
    q: debouncedQ.value || undefined,
    quarter: filters.quarter === 'ALL' ? undefined : filters.quarter,
    year: filters.year === 'ALL' ? undefined : filters.year,
    kbli: filters.kbli === 'ALL' ? undefined : filters.kbli,
    expenditure: filters.expenditure === 'ALL' ? undefined : filters.expenditure,
    portal: filters.portal === 'ALL' ? undefined : filters.portal,
    status: filters.status === 'ALL' ? undefined : filters.status,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

const exportMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Unduh Excel (.xlsx — 10 Kolom Baku)',
      icon: 'i-lucide-file-spreadsheet',
      onSelect: () => {
        void downloadExport(buildExportParams('xlsx'));
      },
    },
    {
      label: 'Unduh CSV (.csv — UTF-8 BOM)',
      icon: 'i-lucide-file-text',
      onSelect: () => {
        void downloadExport(buildExportParams('csv'));
      },
    },
  ],
]);

// Manual modal + edit drawer + delete modal
const manualModalOpen = ref(false);
const drawerOpen = ref(false);
const editingArticle = ref<AdminArticleItem | null>(null);
const deleteModalOpen = ref(false);
const deleteTarget = ref<AdminArticleItem | null>(null);
const isDeleting = ref(false);

function openEditDrawer(article: AdminArticleItem) {
  editingArticle.value = article;
  drawerOpen.value = true;
}

function askDelete(article: AdminArticleItem) {
  deleteTarget.value = article;
  deleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value || isDeleting.value) return;
  isDeleting.value = true;

  try {
    await $fetch(`/api/admin/articles/${deleteTarget.value.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    toast.add({
      title: 'Artikel Dihapus',
      description: deleteTarget.value.title,
      color: 'neutral',
      icon: 'i-lucide-trash-2',
    });
    deleteModalOpen.value = false;
    deleteTarget.value = null;
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menghapus Artikel',
      description: fetchErr.data?.message || 'Terjadi kesalahan saat menghapus arsip.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    isDeleting.value = false;
  }
}

const columns: TableColumn<AdminArticleItem>[] = [
  { id: 'publishedAt', header: 'Waktu Rilis' },
  { id: 'title', header: 'Judul Berita & Sumber' },
  { id: 'kbli', header: 'KBLI & Dampak' },
  { id: 'expenditure', header: 'Pengeluaran & Dampak' },
  { id: 'period', header: 'Periode' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: 'Aksi' },
];
</script>

<template>
  <div class="space-y-5">
    <!-- Header & Primary Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          Bank Data Fenomena Ekonomi
        </h1>
        <p class="text-sm text-slate-600 mt-0.5">
          Arsip terpusat seluruh fenomena ekonomi Kabupaten Tana Tidung &amp; ekspor kertas kerja
          resmi 10 kolom.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <UButton
          color="primary"
          variant="outline"
          size="sm"
          icon="i-lucide-plus"
          @click="manualModalOpen = true"
        >
          Tambah Berita Manual
        </UButton>

        <UDropdownMenu :items="exportMenuItems">
          <UButton
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-download"
            trailing-icon="i-lucide-chevron-down"
            :loading="isExporting"
          >
            Ekspor Data
          </UButton>
        </UDropdownMenu>
      </div>
    </div>

    <!-- Filter Toolbar Multi-Parameter -->
    <UCard>
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <UInput
            v-model="filters.q"
            icon="i-lucide-search"
            placeholder="Cari judul, ringkasan, atau URL..."
            size="sm"
            class="w-full"
          />

          <USelect
            v-model="filters.quarter"
            :items="quarterFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />

          <USelect
            v-model="filters.year"
            :items="yearFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />

          <USelect
            v-model="filters.status"
            :items="statusFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
          <USelectMenu
            v-model="filters.kbli"
            :items="kbliFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />

          <USelect
            v-model="filters.expenditure"
            :items="expenditureFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />

          <USelect
            v-model="filters.portal"
            :items="portalFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />

          <div class="grid grid-cols-2 gap-1.5">
            <UInput
              v-model="filters.from"
              type="date"
              size="sm"
              aria-label="Dari tanggal rilis"
              title="Dari tanggal rilis (WITA)"
            />
            <UInput
              v-model="filters.to"
              type="date"
              size="sm"
              aria-label="Sampai tanggal rilis"
              title="Sampai tanggal rilis (WITA)"
            />
          </div>

          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-rotate-ccw"
              @click="resetFilters"
            >
              Reset Filter
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Bank Data Table -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="archiveData?.items ?? []"
        :columns="columns"
        :loading="pending"
        empty="Tidak ada arsip berita yang sesuai dengan kriteria filter."
      >
        <template #publishedAt-cell="{ row }">
          <div class="font-mono text-xs tabular-nums text-slate-800 whitespace-nowrap">
            {{ formatDateId(row.original.publishedAt) }}
          </div>
          <div class="text-[11px] text-slate-500 truncate max-w-[130px]" :title="row.original.sourcePortal">
            {{ row.original.sourcePortal }}
          </div>
        </template>

        <template #title-cell="{ row }">
          <div class="space-y-1 min-w-[220px] max-w-sm">
            <div class="font-semibold text-sm text-slate-900 line-clamp-2 leading-snug" :title="row.original.title">
              {{ row.original.title }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
              <a
                v-if="isSafeHttpUrl(row.original.url)"
                :href="row.original.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-teal-700 hover:underline truncate max-w-[250px] inline-flex items-center gap-1"
              >
                <span class="truncate">{{ row.original.url }}</span>
                <UIcon name="i-lucide-external-link" class="w-3 h-3 shrink-0" />
              </a>
              <span v-else class="font-mono truncate max-w-[250px]">{{ row.original.url }}</span>
            </div>
          </div>
        </template>

        <template #kbli-cell="{ row }">
          <div v-if="row.original.kbliCategory" class="space-y-1 min-w-[140px]">
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
              {{ getKbliImpactBadge(row.original.kbliImpact).shortLabel }}
            </UBadge>
          </div>
          <span v-else class="text-xs text-slate-400">—</span>
        </template>

        <template #expenditure-cell="{ row }">
          <div v-if="row.original.expenditureComponent" class="space-y-1 min-w-[140px]">
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
          <span v-else class="text-xs text-slate-400">—</span>
        </template>

        <template #period-cell="{ row }">
          <span class="font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
            {{ formatPeriodLabel(row.original.quarter, row.original.year) }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="getVerificationStatusBadge(row.original.verificationStatus).color"
            variant="subtle"
            size="xs"
            :icon="getVerificationStatusBadge(row.original.verificationStatus).icon"
          >
            {{ getVerificationStatusBadge(row.original.verificationStatus).label }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip text="Edit Arsip">
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-pencil"
                aria-label="Edit artikel arsip"
                @click="openEditDrawer(row.original)"
              />
            </UTooltip>

            <UTooltip text="Hapus Permanen">
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="Hapus artikel arsip"
                @click="askDelete(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Pagination -->
    <div
      v-if="archiveData"
      class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1"
    >
      <span class="text-xs text-slate-500 font-mono tabular-nums">
        Total arsip cocok: {{ archiveData.pagination.total }} berita • Halaman
        {{ archiveData.pagination.page }}/{{ archiveData.pagination.totalPages }}
      </span>
      <UPagination
        v-if="archiveData.pagination.totalPages > 1"
        v-model:page="page"
        :total="archiveData.pagination.total"
        :items-per-page="PAGE_LIMIT"
      />
    </div>

    <!-- Modal Tambah Manual -->
    <AdminManualArticleModal v-model:open="manualModalOpen" @created="refresh()" />

    <!-- Slideover Edit Artikel -->
    <AdminReviewSlideover
      v-model:open="drawerOpen"
      :article="editingArticle"
      @saved="
        () => {
          drawerOpen = false;
          refresh();
        }
      "
    />

    <!-- Modal Konfirmasi Hapus -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Hapus Artikel dari Bank Data?"
      description="Tindakan ini menghapus arsip berita secara permanen dari database."
    >
      <template #body>
        <p class="text-sm text-slate-700 leading-relaxed">
          Anda yakin ingin menghapus <strong>{{ deleteTarget?.title }}</strong>?
        </p>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
            Batal
          </UButton>
          <UButton color="error" :loading="isDeleting" @click="confirmDelete">
            Ya, Hapus Permanen
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
