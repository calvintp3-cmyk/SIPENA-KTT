<!-- app/pages/admin/articles.vue -->
<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ExpenditureComponentEnum,
  KbliCategoryEnum,
  LlmStatusEnum,
  PDRB_17_SECTORS,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import { formatDateId, formatPeriodLabel, getCurrentQuarterYearWita } from '#shared/utils/period';
import type { AdminArticleItem, AdminArticlesResponse, SelectOptionItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { setQueueCounts } = useAdminSession();
const { selectedYear, selectedQuarter, shortPeriodLabel } = useAdminPeriod();
const { isExporting, downloadExport } = useExcelExport();
const {
  kbliOptions,
  kbliImpactOptions,
  expenditureOptions,
  expenditureImpactOptions,
  quarterOptions,
  verificationStatusOptions,
  getKbliShortCodeName,
  getKbliImpactBadge,
  getKbliClusterTheme,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getExpenditureColorTheme,
  getVerificationStatusBadge,
  isSafeHttpUrl,
} = usePdrbLabels();

const currentPeriod = getCurrentQuarterYearWita();

const filters = reactive({
  q: '',
  quarter: 'ALL' as 'ALL' | 1 | 2 | 3 | 4,
  year: 'ALL' as 'ALL' | number,
  pdrbGroup: 'ALL',
  kbli: 'ALL',
  expenditure: 'ALL',
  portal: 'ALL',
  status: 'ALL',
  llmStatus: 'ALL',
  isEconomic: 'ALL',
  from: '',
  to: '',
});

const debouncedQ = ref('');
const page = ref(1);
const PAGE_LIMIT = 25;

function readSingleQuery(val: unknown): string {
  if (Array.isArray(val)) return typeof val[0] === 'string' ? val[0].trim() : '';
  return typeof val === 'string' ? val.trim() : '';
}

function applyRouteQuery(queryObj: Record<string, unknown>) {
  const qStr = readSingleQuery(queryObj.q);
  filters.q = qStr;
  debouncedQ.value = qStr;

  const qQuarter = Number(readSingleQuery(queryObj.quarter));
  filters.quarter =
    Number.isInteger(qQuarter) && qQuarter >= 1 && qQuarter <= 4
      ? (qQuarter as 1 | 2 | 3 | 4)
      : 'ALL';

  const qYear = Number(readSingleQuery(queryObj.year));
  filters.year =
    Number.isInteger(qYear) && qYear >= 2000 && qYear <= 2100 ? qYear : 'ALL';

  const qKbli = readSingleQuery(queryObj.kbli).toUpperCase();
  const qGroup = readSingleQuery(queryObj.pdrbGroup).toUpperCase();

  if (qKbli && qKbli in KbliCategoryEnum) {
    filters.kbli = qKbli;
    filters.pdrbGroup = 'ALL';
  } else {
    filters.kbli = 'ALL';
    const matchedGroup = PDRB_17_SECTORS.find((s) => s.groupCode === qGroup);
    filters.pdrbGroup = matchedGroup ? matchedGroup.groupCode : 'ALL';
  }

  const qExp = readSingleQuery(queryObj.expenditure);
  filters.expenditure =
    qExp && qExp in ExpenditureComponentEnum ? qExp : 'ALL';

  const qPortal = readSingleQuery(queryObj.portal);
  filters.portal = qPortal || 'ALL';

  const qStatus = readSingleQuery(queryObj.status);
  filters.status = qStatus && qStatus in VerificationStatusEnum ? qStatus : 'ALL';

  const qLlmStatus = readSingleQuery(queryObj.llmStatus);
  filters.llmStatus = qLlmStatus && qLlmStatus in LlmStatusEnum ? qLlmStatus : 'ALL';

  const qIsEconomic = readSingleQuery(queryObj.isEconomic);
  filters.isEconomic =
    qIsEconomic === 'true' || qIsEconomic === 'false' ? qIsEconomic : 'ALL';

  const qFrom = readSingleQuery(queryObj.from);
  filters.from = /^\d{4}-\d{2}-\d{2}$/.test(qFrom) ? qFrom : '';

  const qTo = readSingleQuery(queryObj.to);
  filters.to = /^\d{4}-\d{2}-\d{2}$/.test(qTo) ? qTo : '';

  page.value = 1;
}

watch(
  () => route.query,
  (newQuery: Record<string, unknown>) => {
    applyRouteQuery(newQuery);
  },
  { immediate: true },
);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => filters.q,
  (val: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const trimmed = val.trim();
      if (debouncedQ.value !== trimmed) {
        debouncedQ.value = trimmed;
        page.value = 1;
      }
    }, 280);
  },
);

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

watch(
  () => filters.pdrbGroup,
  (nextGroup: string) => {
    if (nextGroup !== 'ALL' && filters.kbli !== 'ALL') {
      filters.kbli = 'ALL';
    }
  },
);

watch(
  () => filters.kbli,
  (nextKbli: string) => {
    if (nextKbli !== 'ALL' && filters.pdrbGroup !== 'ALL') {
      filters.pdrbGroup = 'ALL';
    }
  },
);

watch(
  () => [
    filters.quarter,
    filters.year,
    filters.pdrbGroup,
    filters.kbli,
    filters.expenditure,
    filters.portal,
    filters.status,
    filters.llmStatus,
    filters.isEconomic,
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
  if (filters.kbli !== 'ALL') {
    qObj.kbli = filters.kbli;
  } else if (filters.pdrbGroup !== 'ALL') {
    qObj.pdrbGroup = filters.pdrbGroup;
  }
  if (filters.expenditure !== 'ALL') qObj.expenditure = filters.expenditure;
  if (filters.portal !== 'ALL') qObj.portal = filters.portal;
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

const quarterFilterItems = computed(() => [
  { label: 'Semua Triwulan', value: 'ALL' as const },
  ...quarterOptions,
]);

const yearFilterItems = computed(() => {
  const years = new Set<number>();
  for (let y = currentPeriod.year + 1; y >= currentPeriod.year - 4; y--) {
    years.add(y);
  }
  if (typeof filters.year === 'number') {
    years.add(filters.year);
  }
  const sorted = Array.from(years).sort((a, b) => b - a);
  return [
    { label: 'Semua Tahun', value: 'ALL' as const },
    ...sorted.map((y) => ({ label: String(y), value: y })),
  ];
});

const pdrbGroupFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua 17 Sektor PDRB', value: 'ALL' },
  ...PDRB_17_SECTORS.map((sector) => ({
    label: `${sector.groupCode} - ${sector.shortName}`,
    value: sector.groupCode,
  })),
]);

const kbliFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua Huruf KBLI (A–V)', value: 'ALL' },
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

const llmStatusFilterItems: SelectOptionItem<string>[] = [
  { label: 'Semua Status AI', value: 'ALL' },
  { label: 'AI Sukses', value: LlmStatusEnum.SUCCESS },
  { label: 'LLM Gagal', value: LlmStatusEnum.FAILED },
  { label: 'Input Manual', value: LlmStatusEnum.SKIPPED_MANUAL },
];

const economicFilterItems: SelectOptionItem<string>[] = [
  { label: 'Semua Relevansi', value: 'ALL' },
  { label: 'Fenomena Ekonomi', value: 'true' },
  { label: 'Non-Ekonomi', value: 'false' },
];

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

const selectedGroupMeta = computed(() =>
  filters.pdrbGroup !== 'ALL'
    ? PDRB_17_SECTORS.find((s) => s.groupCode === filters.pdrbGroup) ?? null
    : null,
);

const isSyncedToGlobalPeriod = computed(
  () => filters.year === selectedYear.value && filters.quarter === selectedQuarter.value,
);

function syncToGlobalPeriod() {
  filters.year = selectedYear.value;
  filters.quarter = selectedQuarter.value;
}

const hasActiveFilters = computed(
  () =>
    Boolean(debouncedQ.value) ||
    filters.quarter !== 'ALL' ||
    filters.year !== 'ALL' ||
    filters.pdrbGroup !== 'ALL' ||
    filters.kbli !== 'ALL' ||
    filters.expenditure !== 'ALL' ||
    filters.portal !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.llmStatus !== 'ALL' ||
    filters.isEconomic !== 'ALL' ||
    Boolean(filters.from) ||
    Boolean(filters.to),
);

function resetFilters() {
  filters.q = '';
  debouncedQ.value = '';
  filters.quarter = 'ALL';
  filters.year = 'ALL';
  filters.pdrbGroup = 'ALL';
  filters.kbli = 'ALL';
  filters.expenditure = 'ALL';
  filters.portal = 'ALL';
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

function buildExportParams(format: 'xlsx' | 'csv') {
  return {
    format,
    q: debouncedQ.value || undefined,
    quarter: filters.quarter === 'ALL' ? undefined : filters.quarter,
    year: filters.year === 'ALL' ? undefined : filters.year,
    kbli: filters.kbli === 'ALL' ? undefined : filters.kbli,
    pdrbGroup:
      filters.kbli === 'ALL' && filters.pdrbGroup !== 'ALL' ? filters.pdrbGroup : undefined,
    expenditure: filters.expenditure === 'ALL' ? undefined : filters.expenditure,
    portal: filters.portal === 'ALL' ? undefined : filters.portal,
    status: filters.status === 'ALL' ? undefined : filters.status,
    llmStatus: filters.llmStatus === 'ALL' ? undefined : filters.llmStatus,
    isEconomic: filters.isEconomic === 'ALL' ? undefined : filters.isEconomic,
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

const manualModalOpen = ref(false);
const drawerOpen = ref(false);
const editingArticle = ref<AdminArticleItem | null>(null);
const deleteModalOpen = ref(false);
const deleteTarget = ref<AdminArticleItem | null>(null);
const isDeleting = ref(false);
const showAdvancedFilters = ref(false);

const activeTabStatus = computed<'ALL' | VerificationStatusEnum | 'LLM_FAILED'>({
  get: () => {
    if (filters.llmStatus === LlmStatusEnum.FAILED) return 'LLM_FAILED';
    if (filters.status === VerificationStatusEnum.VERIFIED) return VerificationStatusEnum.VERIFIED;
    if (filters.status === VerificationStatusEnum.PENDING) return VerificationStatusEnum.PENDING;
    if (filters.status === VerificationStatusEnum.IGNORED) return VerificationStatusEnum.IGNORED;
    return 'ALL';
  },
  set: (val: 'ALL' | VerificationStatusEnum | 'LLM_FAILED') => {
    if (val === 'LLM_FAILED') {
      filters.status = 'ALL';
      filters.llmStatus = LlmStatusEnum.FAILED;
    } else if (val === 'ALL') {
      filters.status = 'ALL';
      filters.llmStatus = 'ALL';
    } else {
      filters.status = val;
      filters.llmStatus = 'ALL';
    }
  },
});

const advancedFilterActiveCount = computed(() => {
  let count = 0;
  if (filters.pdrbGroup !== 'ALL' || filters.kbli !== 'ALL') count++;
  if (filters.expenditure !== 'ALL') count++;
  if (filters.portal !== 'ALL') count++;
  if (filters.isEconomic !== 'ALL') count++;
  if (filters.from || filters.to) count++;
  return count;
});

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

// Bulk Re-classify state
const reclassifyModalOpen = ref(false);
const isReclassifying = ref(false);
const bulkKbli = ref<string>('KEEP');
const bulkKbliImpact = ref<string>('KEEP');
const bulkExpenditure = ref<string>('KEEP');
const bulkExpenditureImpact = ref<string>('KEEP');

async function handleBulkReclassify() {
  if (isReclassifying.value || selectedIds.value.length === 0) return;
  isReclassifying.value = true;

  try {
    const payload: Record<string, unknown> = {
      ids: selectedIds.value,
      action: 'RECLASSIFY',
    };
    if (bulkKbli.value !== 'KEEP') payload.kbliCategory = bulkKbli.value;
    if (bulkKbliImpact.value !== 'KEEP') payload.kbliImpact = bulkKbliImpact.value;
    if (bulkExpenditure.value !== 'KEEP') payload.expenditureComponent = bulkExpenditure.value;
    if (bulkExpenditureImpact.value !== 'KEEP') payload.expenditureImpact = bulkExpenditureImpact.value;

    await $fetch('/api/admin/articles/batch', {
      method: 'POST',
      body: payload,
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

const columns: TableColumn<AdminArticleItem>[] = [
  { id: 'select', header: '' },
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
  <div class="space-y-6">
    <!-- Header & Primary Actions -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
        >
          <UIcon name="i-solar-database-bold-duotone" class="w-3.5 h-3.5" />
          <span>Repositori Arsip &amp; Kertas Kerja BPS</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 text-balance mt-2">
          Bank Data Fenomena Ekonomi
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5 text-pretty">
          Arsip terpusat seluruh fenomena ekonomi Kabupaten Tana Tidung &amp; ekspor kertas kerja
          resmi 10 kolom.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          class="min-h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="() => { manualModalOpen = true; }"
        >
          <UIcon name="i-solar-add-circle-bold-duotone" class="w-4 h-4 text-indigo-600" />
          <span>Tambah Berita / Tarik URL</span>
        </button>

        <UDropdownMenu :items="exportMenuItems">
          <button
            type="button"
            :disabled="isExporting"
            class="btn-primary-gradient min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UIcon
              :name="isExporting ? 'i-lucide-loader-circle' : 'i-solar-download-bold-duotone'"
              class="w-4 h-4 text-emerald-200"
              :class="{ 'animate-spin': isExporting }"
            />
            <span>{{ isExporting ? 'Menyiapkan Berkas...' : 'Ekspor Data' }}</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-white/80" />
          </button>
        </UDropdownMenu>
      </div>
    </div>

    <!-- Filter Toolbar & Status Segment Workbench -->
    <div class="saas-card rounded-2xl p-4 sm:p-5 space-y-4">
      <!-- Quick Status Segment Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === 'ALL'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="() => { activeTabStatus = 'ALL'; }"
          >
            <span>Semua Berita</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 tabular-nums font-bold">
              {{ archiveData?.pagination.total ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === VerificationStatusEnum.VERIFIED
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="() => { activeTabStatus = VerificationStatusEnum.VERIFIED; }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Terverifikasi</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 tabular-nums font-bold">
              {{ archiveData?.summaryCounts.verifiedCount ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === VerificationStatusEnum.PENDING
                ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="() => { activeTabStatus = VerificationStatusEnum.PENDING; }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Menunggu Review</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 tabular-nums font-bold">
              {{ archiveData?.summaryCounts.pendingCount ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === VerificationStatusEnum.IGNORED
                ? 'bg-white text-slate-800 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="() => { activeTabStatus = VerificationStatusEnum.IGNORED; }"
          >
            <span>Diabaikan</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 tabular-nums font-bold">
              {{ archiveData?.summaryCounts.ignoredCount ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === 'LLM_FAILED'
                ? 'bg-white text-rose-700 shadow-xs border border-rose-200'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="() => { activeTabStatus = 'LLM_FAILED'; }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Gagal AI</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 tabular-nums font-bold">
              {{ archiveData?.summaryCounts.llmFailedCount ?? 0 }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="!isSyncedToGlobalPeriod"
            type="button"
            class="h-8 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-xs font-semibold text-indigo-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            @click="syncToGlobalPeriod"
          >
            <UIcon name="i-solar-calendar-mark-bold-duotone" class="w-3.5 h-3.5" />
            <span>Sinkron {{ shortPeriodLabel }}</span>
          </button>

          <button
            type="button"
            class="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            :class="
              showAdvancedFilters || advancedFilterActiveCount > 0
                ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            "
            @click="() => { showAdvancedFilters = !showAdvancedFilters; }"
          >
            <UIcon name="i-solar-filter-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter Lanjutan</span>
            <span
              v-if="advancedFilterActiveCount > 0"
              class="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold"
            >
              {{ advancedFilterActiveCount }}
            </span>
            <UIcon :name="showAdvancedFilters ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Primary Compact Filter Row -->
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div class="sm:col-span-5">
          <label for="articles-filter-q" class="sr-only">Cari judul, ringkasan, atau URL</label>
          <UInput
            id="articles-filter-q"
            v-model="filters.q"
            icon="i-solar-magnifer-line-duotone"
            placeholder="Cari judul berita, ringkasan, atau URL..."
            size="sm"
            class="w-full"
          />
        </div>

        <div class="sm:col-span-2">
          <label for="articles-filter-year" class="sr-only">Filter Tahun</label>
          <USelect
            id="articles-filter-year"
            v-model="filters.year"
            :items="yearFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Tahun"
            size="sm"
            class="w-full"
          />
        </div>

        <div class="sm:col-span-2">
          <label for="articles-filter-quarter" class="sr-only">Filter Triwulan</label>
          <USelect
            id="articles-filter-quarter"
            v-model="filters.quarter"
            :items="quarterFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Triwulan"
            size="sm"
            class="w-full"
          />
        </div>

        <div class="sm:col-span-3">
          <label for="articles-filter-pdrb-group" class="sr-only">Filter Sektor Usaha</label>
          <USelectMenu
            id="articles-filter-pdrb-group"
            v-model="filters.pdrbGroup"
            :items="pdrbGroupFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Sektor Lapangan Usaha"
            placeholder="Semua Sektor Lapangan Usaha"
            size="sm"
            class="w-full"
          />
        </div>
      </div>

      <!-- Collapsible Advanced Filter Section -->
      <div
        v-if="showAdvancedFilters"
        class="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border"
      >
        <div>
          <label for="articles-filter-kbli" class="block text-[11px] font-bold text-slate-700 mb-1">
            KBLI Spesifik (A–V)
          </label>
          <USelectMenu
            id="articles-filter-kbli"
            v-model="filters.kbli"
            :items="kbliFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />
        </div>

        <div>
          <label for="articles-filter-expenditure" class="block text-[11px] font-bold text-slate-700 mb-1">
            Kelompok Permintaan
          </label>
          <USelect
            id="articles-filter-expenditure"
            v-model="filters.expenditure"
            :items="expenditureFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />
        </div>

        <div>
          <label for="articles-filter-portal" class="block text-[11px] font-bold text-slate-700 mb-1">
            Portal Sumber
          </label>
          <USelect
            id="articles-filter-portal"
            v-model="filters.portal"
            :items="portalFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />
        </div>

        <div>
          <label for="articles-filter-economic" class="block text-[11px] font-bold text-slate-700 mb-1">
            Relevansi Ekonomi
          </label>
          <USelect
            id="articles-filter-economic"
            v-model="filters.isEconomic"
            :items="economicFilterItems"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
          />
        </div>

        <div class="sm:col-span-2">
          <span class="block text-[11px] font-bold text-slate-700 mb-1">
            Rentang Waktu Rilis (WITA)
          </span>
          <div class="flex items-center gap-2">
            <UInput
              id="articles-filter-from"
              v-model="filters.from"
              type="date"
              size="sm"
              class="w-full"
            />
            <span class="text-xs text-slate-400">—</span>
            <UInput
              id="articles-filter-to"
              v-model="filters.to"
              type="date"
              size="sm"
              class="w-full"
            />
          </div>
        </div>

        <div class="sm:col-span-2 flex items-end justify-end">
          <button
            type="button"
            class="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            @click="resetFilters"
          >
            <UIcon name="i-solar-restart-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
            <span>Reset Seluruh Filter</span>
          </button>
        </div>
      </div>

      <!-- Active Filter Chips Strip -->
      <div
        v-if="hasActiveFilters"
        class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs"
      >
        <span class="text-[11px] font-semibold text-slate-600 mr-1">
          Filter Aktif:
        </span>

        <button
          v-if="selectedGroupMeta"
          type="button"
          class="min-h-7 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getKbliClusterTheme(selectedGroupMeta.groupCode).pillClass"
          @click="() => { filters.pdrbGroup = 'ALL'; }"
        >
          <span>Sektor {{ selectedGroupMeta.groupCode }} - {{ selectedGroupMeta.shortName }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.kbli !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getKbliClusterTheme(filters.kbli).pillClass"
          @click="() => { filters.kbli = 'ALL'; }"
        >
          <span>KBLI: {{ getKbliShortCodeName(filters.kbli as KbliCategoryEnum) }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.expenditure !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getExpenditureColorTheme(filters.expenditure).pillClass"
          @click="() => { filters.expenditure = 'ALL'; }"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="getExpenditureColorTheme(filters.expenditure).dotClass"
          />
          <span>{{ getExpenditureLabel(filters.expenditure as ExpenditureComponentEnum, false) }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.portal !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium hover:bg-indigo-100 cursor-pointer"
          @click="() => { filters.portal = 'ALL'; }"
        >
          <span>Portal: {{ filters.portal }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.status !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium hover:bg-slate-200 cursor-pointer"
          @click="() => { filters.status = 'ALL'; }"
        >
          <span>Status: {{ getVerificationStatusBadge(filters.status as VerificationStatusEnum).label }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.llmStatus !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium hover:bg-slate-200 cursor-pointer"
          @click="() => { filters.llmStatus = 'ALL'; }"
        >
          <span>AI: {{ llmStatusFilterItems.find((i) => i.value === filters.llmStatus)?.label }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.isEconomic !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium hover:bg-slate-200 cursor-pointer"
          @click="() => { filters.isEconomic = 'ALL'; }"
        >
          <span>{{ filters.isEconomic === 'true' ? 'Hanya Ekonomi' : 'Non-Ekonomi' }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.year !== 'ALL' || filters.quarter !== 'ALL'"
          type="button"
          class="min-h-7 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium tabular-nums hover:bg-slate-200 cursor-pointer"
          @click="
            () => {
              filters.year = 'ALL';
              filters.quarter = 'ALL';
            }
          "
        >
          <span>
            Periode: {{ filters.quarter === 'ALL' ? 'Semua TW' : `TW ${filters.quarter}` }}
            {{ filters.year === 'ALL' ? '' : filters.year }}
          </span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat arsip Bank Data"
      description="Pastikan koneksi database aktif lalu muat ulang."
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- Bank Data Table -->
    <div class="saas-card rounded-2xl overflow-hidden">
      <div
        tabindex="0"
        role="region"
        aria-label="Tabel Bank Data Fenomena Ekonomi"
        class="saas-table-scroller"
      >
        <UTable
          :data="archiveData?.items ?? []"
          :columns="columns"
          :loading="pending"
          empty="Tidak ada arsip berita yang sesuai dengan kriteria filter."
        >
          <template #select-header>
            <input
              type="checkbox"
              :checked="isAllSelected"
              class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              @change="toggleSelectAll"
            >
          </template>

          <template #select-cell="{ row }">
            <input
              v-model="selectedMap[row.original.id]"
              type="checkbox"
              class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            >
          </template>

          <template #publishedAt-cell="{ row }">
            <div class="text-xs font-medium tabular-nums text-slate-800 whitespace-nowrap">
              {{ formatDateId(row.original.publishedAt) }}
            </div>
            <div
              class="text-[11px] text-slate-500 truncate max-w-[140px]"
              :title="row.original.sourcePortal"
            >
              {{ row.original.sourcePortal }}
            </div>
          </template>

          <template #title-cell="{ row }">
            <div class="space-y-1 min-w-[220px] max-w-sm">
              <div
                class="font-semibold text-sm text-slate-900 line-clamp-2 leading-snug"
                :title="row.original.title"
              >
                {{ row.original.title }}
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate-600">
                <a
                  v-if="isSafeHttpUrl(row.original.url)"
                  :href="row.original.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-700 hover:text-indigo-900 hover:underline truncate max-w-[250px] inline-flex items-center gap-1 font-medium"
                >
                  <span class="truncate">{{ row.original.url }}</span>
                  <UIcon name="i-lucide-external-link" class="w-3 h-3 shrink-0" />
                </a>
                <span v-else class="truncate max-w-[250px]">{{ row.original.url }}</span>
              </div>
            </div>
          </template>

          <template #kbli-cell="{ row }">
            <div v-if="row.original.kbliCategory" class="space-y-1.5 min-w-[155px]">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border leading-snug"
                :class="getKbliClusterTheme(row.original.kbliCategory).pillClass"
              >
                {{ getKbliShortCodeName(row.original.kbliCategory) }}
              </span>
              <div>
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
            </div>
            <span v-else class="text-xs text-slate-600">—</span>
          </template>

          <template #expenditure-cell="{ row }">
            <div v-if="row.original.expenditureComponent" class="space-y-1.5 min-w-[155px]">
              <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 leading-snug">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :class="getExpenditureColorTheme(row.original.expenditureComponent).dotClass"
                />
                <span>{{ getExpenditureLabel(row.original.expenditureComponent, false) }}</span>
              </div>
              <div>
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
            </div>
            <span v-else class="text-xs text-slate-600">—</span>
          </template>

          <template #period-cell="{ row }">
            <span class="text-xs font-medium tabular-nums text-slate-700 whitespace-nowrap">
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
            <div class="flex items-center gap-1.5">
              <UTooltip text="Edit Arsip">
                <UButton
                  size="sm"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-pencil"
                  aria-label="Edit artikel arsip"
                  class="min-w-8 min-h-8"
                  @click="() => { openEditDrawer(row.original); }"
                />
              </UTooltip>

              <UTooltip text="Hapus Permanen">
                <UButton
                  size="sm"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  aria-label="Hapus artikel arsip"
                  class="min-w-8 min-h-8"
                  @click="() => { askDelete(row.original); }"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>
      </div>
    </div>

    <!-- Floating Selection Batch Bar -->
    <div
      v-if="selectedIds.length > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 px-4 py-2.5 flex flex-wrap items-center gap-3 transition-all"
    >
      <span class="text-xs font-bold tabular-nums">
        {{ selectedIds.length }} Berita Dipilih
      </span>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="() => { reclassifyModalOpen = true; }"
        >
          <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-3.5 h-3.5" />
          <span>Ubah Klasifikasi</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="() => { void handleBulkAction('VERIFY'); }"
        >
          <UIcon name="i-lucide-check" class="w-3.5 h-3.5" />
          <span>Verifikasi</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          @click="() => { void handleBulkAction('IGNORE'); }"
        >
          <span>Abaikan</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          @click="clearSelection"
        >
          Batal
        </button>
      </div>
    </div>

    <!-- Modal Bulk Re-classify -->
    <UModal
      v-model:open="reclassifyModalOpen"
      title="Ubah Klasifikasi Massal"
      :description="`Tetapkan kategori baru untuk ${selectedIds.length} berita terpilih sekaligus.`"
    >
      <template #body>
        <div class="space-y-4 text-xs">
          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">Kategori Lapangan Usaha (KBLI)</label>
            <select
              v-model="bulkKbli"
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="KEEP">(Tetap / Jangan Ubah KBLI)</option>
              <option v-for="item in kbliOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">Arah Dampak Aktivitas</label>
            <select
              v-model="bulkKbliImpact"
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Dampak)</option>
              <option v-for="item in kbliImpactOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">Komponen Pengeluaran</label>
            <select
              v-model="bulkExpenditure"
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Pengeluaran)</option>
              <option v-for="item in expenditureOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">Arah Dampak Pengeluaran</label>
            <select
              v-model="bulkExpenditureImpact"
              class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Dampak)</option>
              <option v-for="item in expenditureImpactOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="reclassifyModalOpen = false">
            Batal
          </UButton>
          <UButton color="primary" :loading="isReclassifying" @click="handleBulkReclassify">
            Terapkan ke {{ selectedIds.length }} Berita
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Pagination -->
    <div
      v-if="archiveData"
      class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1"
    >
      <span class="text-xs text-slate-600 tabular-nums">
        Total arsip cocok: <strong class="text-slate-900">{{ archiveData.pagination.total }}</strong> berita • Halaman
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
    <AdminManualArticleModal v-model:open="manualModalOpen" @created="() => { void refresh(); }" />

    <!-- Slideover Edit Artikel -->
    <AdminReviewSlideover
      v-model:open="drawerOpen"
      :article="editingArticle"
      @saved="
        () => {
          drawerOpen = false;
          void refresh();
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
        <p class="text-sm text-slate-700 leading-relaxed text-pretty">
          Anda yakin ingin menghapus <strong>{{ deleteTarget?.title }}</strong>?
        </p>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton
            autofocus
            color="neutral"
            variant="ghost"
            @click="() => { deleteModalOpen = false; }"
          >
            Batal
          </UButton>
          <UButton color="error" :loading="isDeleting" @click="() => { void confirmDelete(); }">
            Ya, Hapus Permanen
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
