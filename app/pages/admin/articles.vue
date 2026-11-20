<!-- app/pages/admin/articles.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import {
  useArticleQuery,
  type ArticleFiltersState,
} from '~/composables/useArticleQuery';
import type {
  AdminArticleItem,
  AdminArticlesResponse,
  SelectOptionItem,
} from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const PAGE_LIMIT = 20;

const toast = useToast();
const route = useRoute();
const router = useRouter();

const { selectedYear, selectedQuarter, shortPeriodLabel } = useAdminPeriod();
const { setQueueCounts } = useAdminSession();
const { isExporting, downloadExport } = useExcelExport();
const {
  kbliOptions,
  kbliImpactOptions,
  expenditureOptions,
  expenditureImpactOptions,
} = usePdrbLabels();

const page = ref(1);

const filters = reactive<ArticleFiltersState>({
  q: '',
  quarter: 'ALL',
  year: 'ALL',
  pdrbGroup: 'ALL',
  kbli: 'ALL',
  expenditure: 'ALL',
  portal: 'ALL',
  subdistrict: 'ALL',
  status: 'ALL',
  llmStatus: 'ALL',
  isEconomic: 'ALL',
  from: '',
  to: '',
});

const debouncedQ = ref('');

const {
  quarterFilterItems,
  yearFilterItems,
  pdrbGroupFilterItems,
  kbliFilterItems,
  expenditureFilterItems,
  subdistrictFilterItems,
  columns,
  parseRouteQuery,
  applyDatePreset,
  getActiveFilterChips,
  buildExportParams,
} = useArticleQuery();

parseRouteQuery(route.query, filters, page);

watch(
  () => route.query,
  (newQuery: Record<string, unknown>) => {
    parseRouteQuery(newQuery, filters, page);
  },
);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => filters.q,
  (val: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQ.value = val.trim();
      page.value = 1;
    }, 350);
  },
);

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

watch(
  [
    () => filters.quarter,
    () => filters.year,
    () => filters.pdrbGroup,
    () => filters.kbli,
    () => filters.expenditure,
    () => filters.portal,
    () => filters.subdistrict,
    () => filters.status,
    () => filters.llmStatus,
    () => filters.isEconomic,
    () => filters.from,
    () => filters.to,
  ],
  () => {
    page.value = 1;
  },
);

const showAdvancedFilters = ref(false);

const queryParams = computed(() => {
  const qObj: Record<string, string | number> = {
    page: page.value,
    limit: PAGE_LIMIT,
  };
  if (debouncedQ.value) qObj.q = debouncedQ.value;
  if (filters.quarter !== 'ALL') qObj.quarter = filters.quarter;
  if (filters.year !== 'ALL') qObj.year = filters.year;
  if (filters.kbli !== 'ALL') {
    qObj.kbli = filters.kbli;
  } else if (filters.pdrbGroup !== 'ALL') {
    qObj.pdrbGroup = filters.pdrbGroup;
  }
  if (filters.expenditure !== 'ALL') qObj.expenditure = filters.expenditure;
  if (filters.portal !== 'ALL') qObj.portal = filters.portal;
  if (filters.subdistrict !== 'ALL') qObj.subdistrict = filters.subdistrict;
  if (filters.status !== 'ALL') qObj.status = filters.status;
  if (filters.llmStatus !== 'ALL') qObj.llmStatus = filters.llmStatus;
  if (filters.isEconomic !== 'ALL') qObj.isEconomic = filters.isEconomic;
  if (filters.from) qObj.from = filters.from;
  if (filters.to) qObj.to = filters.to;
  return qObj;
});

const {
  data: archiveData,
  pending,
  error,
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

const portalFilterItems = computed<SelectOptionItem<string>[]>(() => {
  const portalSet = new Set<string>(archiveData.value?.availablePortals ?? []);
  if (filters.portal !== 'ALL') {
    portalSet.add(filters.portal);
  }
  return [
    { label: 'Semua Portal', value: 'ALL' },
    ...Array.from(portalSet)
      .sort((a, b) => a.localeCompare(b))
      .map((portal) => ({ label: portal, value: portal })),
  ];
});

const isSyncedToGlobalPeriod = computed(
  () => filters.year === selectedYear.value && filters.quarter === selectedQuarter.value,
);

const allArticlesCount = computed(() => {
  const c = archiveData.value?.summaryCounts;
  if (!c) return archiveData.value?.pagination.total ?? 0;
  return c.pendingCount + c.verifiedCount + c.ignoredCount;
});

function resetFilters() {
  filters.q = '';
  debouncedQ.value = '';
  filters.quarter = 'ALL';
  filters.year = 'ALL';
  filters.pdrbGroup = 'ALL';
  filters.kbli = 'ALL';
  filters.expenditure = 'ALL';
  filters.portal = 'ALL';
  filters.subdistrict = 'ALL';
  filters.status = 'ALL';
  filters.llmStatus = 'ALL';
  filters.isEconomic = 'ALL';
  filters.from = '';
  filters.to = '';
  page.value = 1;
  if (Object.keys(route.query).length > 0) {
    void router.replace({ path: '/admin/articles', query: {} });
  }
}

const exportMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Excel (.xlsx)',
      icon: 'i-lucide-file-spreadsheet',
      onSelect: () => {
        void downloadExport(buildExportParams(filters, debouncedQ.value, 'xlsx'));
      },
    },
    {
      label: 'CSV (.csv)',
      icon: 'i-lucide-file-text',
      onSelect: () => {
        void downloadExport(buildExportParams(filters, debouncedQ.value, 'csv'));
      },
    },
  ],
]);

const manualModalOpen = ref(false);
const drawerOpen = ref(false);
const selectedArticle = ref<AdminArticleItem | null>(null);

const deleteModalOpen = ref(false);
const deleteTarget = ref<AdminArticleItem | null>(null);
const isDeleting = ref(false);

const activeTabStatus = computed<string>({
  get: () => {
    if (filters.llmStatus === 'FAILED') return 'LLM_FAILED';
    return filters.status;
  },
  set: (val: string) => {
    if (val === 'LLM_FAILED') {
      filters.status = 'ALL';
      filters.llmStatus = 'FAILED';
    } else if (val === 'ALL') {
      filters.status = 'ALL';
      filters.llmStatus = 'ALL';
    } else {
      filters.status = val;
      filters.llmStatus = 'ALL';
    }
  },
});

function openEditDrawer(article: AdminArticleItem) {
  selectedArticle.value = article;
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

const selectedMap = ref<Record<string, boolean>>({});
const selectedIds = computed(() =>
  Object.entries(selectedMap.value)
    .filter(([, checked]) => checked)
    .map(([id]) => id),
);

const isAllSelected = computed(() => {
  const items = archiveData.value?.items ?? [];
  if (items.length === 0) return false;
  return items.every((item) => selectedMap.value[item.id]);
});

function toggleSelectAll() {
  const items = archiveData.value?.items ?? [];
  if (isAllSelected.value) {
    selectedMap.value = {};
  } else {
    const next: Record<string, boolean> = {};
    for (const item of items) {
      next[item.id] = true;
    }
    selectedMap.value = next;
  }
}

function clearSelection() {
  selectedMap.value = {};
}

const reclassifyModalOpen = ref(false);
const isReclassifying = ref(false);

async function onBulkReclassify(payload: {
  kbli: string;
  kbliImpact: string;
  expenditure: string;
  expenditureImpact: string;
}) {
  if (isReclassifying.value || selectedIds.value.length === 0) return;
  isReclassifying.value = true;

  try {
    const body: Record<string, unknown> = {
      ids: selectedIds.value,
      action: 'RECLASSIFY',
    };
    if (payload.kbli !== 'KEEP') body.kbliCategory = payload.kbli;
    if (payload.kbliImpact !== 'KEEP') body.kbliImpact = payload.kbliImpact;
    if (payload.expenditure !== 'KEEP') body.expenditureComponent = payload.expenditure;
    if (payload.expenditureImpact !== 'KEEP') body.expenditureImpact = payload.expenditureImpact;

    await $fetch('/api/admin/articles/batch', {
      method: 'POST',
      body,
      credentials: 'include',
    });

    toast.add({
      title: 'Klasifikasi Massal Berhasil',
      description: `${selectedIds.value.length} artikel berhasil diperbarui klasifikasinya.`,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });

    reclassifyModalOpen.value = false;
    clearSelection();
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Mengubah Klasifikasi',
      description: fetchErr.data?.message || 'Terjadi kesalahan sistem.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    isReclassifying.value = false;
  }
}

async function handleBulkAction(action: 'VERIFY' | 'IGNORE') {
  if (selectedIds.value.length === 0) return;
  try {
    const res = await $fetch<{ updatedCount: number }>('/api/admin/articles/batch', {
      method: 'POST',
      body: { ids: selectedIds.value, action },
      credentials: 'include',
    });
    toast.add({
      title: action === 'VERIFY' ? 'Verifikasi Massal Berhasil' : 'Abaikan Massal Berhasil',
      description: `${res.updatedCount} artikel berhasil diperbarui statusnya.`,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });
    clearSelection();
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menjalankan Aksi',
      description: fetchErr.data?.message || 'Terjadi kesalahan sistem.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  }
}

const activeFilterChips = computed(() => getActiveFilterChips(filters));
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Primary Actions -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-tint text-brand-primary border border-brand-border text-xs font-semibold"
        >
          <UIcon name="i-solar-database-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
          <span>Repositori Arsip &amp; Kertas Kerja BPS</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-primary text-balance mt-2 font-display">
          Bank Data Fenomena Ekonomi
        </h1>
        <p class="text-xs sm:text-sm text-ink-secondary mt-0.5 text-pretty">
          Arsip terpusat seluruh fenomena ekonomi Kabupaten Tana Tidung &amp; ekspor kertas kerja
          resmi 10 kolom.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          class="min-h-9 px-3.5 rounded-xl border border-border-hairline bg-white hover:border-brand-primary/30 hover:bg-canvas text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="manualModalOpen = true"
        >
          <UIcon name="i-solar-add-circle-bold-duotone" class="w-4 h-4 text-brand-primary" />
          <span>Tambah Berita / Tarik URL</span>
        </button>

        <UDropdownMenu :items="exportMenuItems">
          <button
            type="button"
            :disabled="isExporting"
            class="obs-btn-primary min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UIcon
              :name="isExporting ? 'i-lucide-loader-circle' : 'i-solar-download-bold-duotone'"
              class="w-4 h-4 text-[#E3F0EA]"
              :class="{ 'animate-spin': isExporting }"
            />
            <span>{{ isExporting ? 'Menyiapkan Berkas...' : 'Ekspor Data' }}</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-white/80" />
          </button>
        </UDropdownMenu>
      </div>
    </div>

    <!-- Filter Toolbar & Status Segment Workbench -->
    <ArticleFilterPanel
      v-model:show-advanced-filters="showAdvancedFilters"
      v-model:active-tab-status="activeTabStatus"
      :filters="filters"
      :summary-counts="archiveData?.summaryCounts"
      :all-articles-count="allArticlesCount"
      :is-synced-to-global-period="isSyncedToGlobalPeriod"
      :short-period-label="shortPeriodLabel"
      :pdrb-group-filter-items="pdrbGroupFilterItems"
      :kbli-filter-items="kbliFilterItems"
      :expenditure-filter-items="expenditureFilterItems"
      :portal-filter-items="portalFilterItems"
      :year-filter-items="yearFilterItems"
      :quarter-filter-items="quarterFilterItems"
      :subdistrict-filter-items="subdistrictFilterItems"
      :active-filter-chips="activeFilterChips"
      @sync-period="() => { filters.year = selectedYear; filters.quarter = selectedQuarter; }"
      @reset-all="resetFilters"
      @apply-date-preset="(p: 'all' | 'today' | 'last7d' | 'last30d' | 'thisQuarter') => applyDatePreset(p, filters, page)"
    />

    <!-- Bank Data Table (Desktop >= lg) & Responsive Cards (< lg) -->
    <ArticleTableList
      :items="archiveData?.items ?? []"
      :columns="columns"
      :pending="pending"
      :selected-map="selectedMap"
      :is-all-selected="isAllSelected"
      @toggle-select-all="toggleSelectAll"
      @edit="openEditDrawer"
      @delete="askDelete"
    />

    <!-- Floating Selection Batch Bar & Modal Re-classify -->
    <ArticleBatchModal
      v-model:open="reclassifyModalOpen"
      :selected-ids="selectedIds"
      :is-reclassifying="isReclassifying"
      :kbli-options="kbliOptions"
      :kbli-impact-options="kbliImpactOptions"
      :expenditure-options="expenditureOptions"
      :expenditure-impact-options="expenditureImpactOptions"
      @bulk-verify="handleBulkAction('VERIFY')"
      @bulk-ignore="handleBulkAction('IGNORE')"
      @clear-selection="clearSelection"
      @bulk-reclassify="onBulkReclassify"
    />

    <!-- Pagination -->
    <div
      v-if="archiveData && archiveData.pagination.totalPages > 1"
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 text-xs text-ink-secondary"
    >
      <div class="font-medium font-mono tabular-nums">
        Menampilkan
        <span class="font-bold text-ink-primary">
          {{ (page - 1) * PAGE_LIMIT + 1 }}–{{
            Math.min(page * PAGE_LIMIT, archiveData.pagination.total)
          }}
        </span>
        dari
        <span class="font-bold text-ink-primary">{{ archiveData.pagination.total }}</span>
        artikel terarsip
      </div>

      <UPagination
        v-model:page="page"
        :total="archiveData.pagination.total"
        :items-per-page="PAGE_LIMIT"
        size="sm"
      />
    </div>

    <!-- Modal Tambah Manual -->
    <AdminManualArticleModal
      v-model:open="manualModalOpen"
      @created="() => { manualModalOpen = false; void refresh(); }"
    />

    <!-- Slideover Edit Artikel -->
    <AdminReviewSlideover
      v-model:open="drawerOpen"
      :article="selectedArticle"
      @saved="() => { drawerOpen = false; selectedArticle = null; void refresh(); }"
    />

    <!-- Modal Konfirmasi Hapus -->
    <ArticleDeleteModal
      v-model:open="deleteModalOpen"
      :article="deleteTarget"
      :is-deleting="isDeleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
