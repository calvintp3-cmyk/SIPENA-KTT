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
  subdistrict: 'ALL' as 'ALL' | string,
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

  const qSubdistrict = readSingleQuery(queryObj.subdistrict);
  filters.subdistrict = qSubdistrict || 'ALL';

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
    filters.subdistrict,
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

const subdistrictFilterItems: SelectOptionItem<string>[] = [
  { label: 'Semua Lokus / Kecamatan', value: 'ALL' },
  { label: 'Kec. Sesayap', value: 'Sesayap' },
  { label: 'Kec. Sesayap Hilir', value: 'Sesayap Hilir' },
  { label: 'Kec. Tana Lia', value: 'Tana Lia' },
  { label: 'Kec. Betayau', value: 'Betayau' },
  { label: 'Kec. Muruk Rian', value: 'Muruk Rian' },
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

function setQuickDatePreset(days: number) {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  filters.from = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
  filters.to = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  page.value = 1;
}

function setQuickQuarterPreset() {
  const targetYear = typeof filters.year === 'number' ? filters.year : currentPeriod.year;
  const targetQuarter =
    typeof filters.quarter === 'number' ? (filters.quarter as PdrbQuarter) : currentPeriod.quarter;
  const pad = (n: number) => String(n).padStart(2, '0');

  let startMonth = 1;
  let endMonth = 3;
  let endDay = 31;
  if (targetQuarter === 1) {
    startMonth = 1;
    endMonth = 3;
    endDay = 31;
  } else if (targetQuarter === 2) {
    startMonth = 4;
    endMonth = 6;
    endDay = 30;
  } else if (targetQuarter === 3) {
    startMonth = 7;
    endMonth = 9;
    endDay = 30;
  } else if (targetQuarter === 4) {
    startMonth = 10;
    endMonth = 12;
    endDay = 31;
  }

  filters.from = `${targetYear}-${pad(startMonth)}-01`;
  filters.to = `${targetYear}-${pad(endMonth)}-${pad(endDay)}`;
  page.value = 1;
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
    filters.subdistrict !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.llmStatus !== 'ALL' ||
    filters.isEconomic !== 'ALL' ||
    Boolean(filters.from) ||
    Boolean(filters.to),
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
    subdistrict: filters.subdistrict === 'ALL' ? undefined : filters.subdistrict,
    status: filters.status === 'ALL' ? undefined : filters.status,
    llmStatus: filters.llmStatus === 'ALL' ? undefined : filters.llmStatus,
    isEconomic: 'true',
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

const exportMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Excel (.xlsx)',
      icon: 'i-lucide-file-spreadsheet',
      onSelect: () => {
        void downloadExport(buildExportParams('xlsx'));
      },
    },
    {
      label: 'CSV (.csv)',
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
  if (filters.subdistrict !== 'ALL') count++;
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
          @click="() => { manualModalOpen = true; }"
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
    <div class="obs-panel rounded-xl p-4 sm:p-5 space-y-4">
      <!-- Quick Status Segment Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-hairline">
        <div class="flex flex-wrap items-center gap-1.5 p-1 bg-surface-subtle rounded-xl border border-border-hairline">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === 'ALL'
                ? 'bg-white text-brand-primary shadow-xs border border-border-hairline'
                : 'text-ink-muted hover:text-ink-primary'
            "
            @click="() => { activeTabStatus = 'ALL'; }"
          >
            <span>Semua Berita</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle text-ink-secondary tabular-nums font-bold font-mono">
              {{ allArticlesCount }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === VerificationStatusEnum.VERIFIED
                ? 'bg-white text-brand-primary shadow-xs border border-border-hairline'
                : 'text-ink-muted hover:text-ink-primary'
            "
            @click="() => { activeTabStatus = VerificationStatusEnum.VERIFIED; }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span>Terverifikasi</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-tint text-brand-primary tabular-nums font-bold font-mono">
              {{ archiveData?.summaryCounts.verifiedCount ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === VerificationStatusEnum.PENDING
                ? 'bg-white text-ochre-ink shadow-xs border border-border-hairline'
                : 'text-ink-muted hover:text-ink-primary'
            "
            @click="() => { activeTabStatus = VerificationStatusEnum.PENDING; }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-ochre" />
            <span>Menunggu Review</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FEF6EE] text-ochre-ink tabular-nums font-bold font-mono">
              {{ archiveData?.summaryCounts.pendingCount ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === VerificationStatusEnum.IGNORED
                ? 'bg-white text-ink-secondary shadow-xs border border-border-hairline'
                : 'text-ink-muted hover:text-ink-primary'
            "
            @click="() => { activeTabStatus = VerificationStatusEnum.IGNORED; }"
          >
            <span>Diabaikan</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle text-ink-secondary tabular-nums font-bold font-mono">
              {{ archiveData?.summaryCounts.ignoredCount ?? 0 }}
            </span>
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
            :class="
              activeTabStatus === 'LLM_FAILED'
                ? 'bg-white text-terracotta-ink shadow-xs border border-border-hairline'
                : 'text-ink-muted hover:text-ink-primary'
            "
            @click="() => { activeTabStatus = 'LLM_FAILED'; }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-terracotta" />
            <span>Gagal AI</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-terracotta-surface text-terracotta-ink tabular-nums font-bold font-mono">
              {{ archiveData?.summaryCounts.llmFailedCount ?? 0 }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="!isSyncedToGlobalPeriod"
            type="button"
            class="h-8 px-2.5 rounded-lg border border-brand-border bg-brand-tint hover:bg-[#D5E8DF] text-xs font-semibold text-brand-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
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
                ? 'border-brand-border bg-brand-tint text-brand-primary'
                : 'border-border-hairline bg-white hover:bg-canvas text-ink-secondary'
            "
            @click="() => { showAdvancedFilters = !showAdvancedFilters; }"
          >
            <UIcon name="i-solar-filter-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
            <span>Filter Lanjutan</span>
            <span
              v-if="advancedFilterActiveCount > 0"
              class="w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center font-bold font-mono"
            >
              {{ advancedFilterActiveCount }}
            </span>
            <UIcon :name="showAdvancedFilters ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-3 h-3 text-ink-muted/70" />
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

      <!-- Collapsible Advanced Filter Section (Bento Grouping) -->
      <div
        v-if="showAdvancedFilters"
        class="pt-3 border-t border-border-hairline space-y-3"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- BENTO 1: Dimensi Klasifikasi PDRB -->
          <div class="rounded-xl border border-brand-border bg-brand-tint/30 p-3.5 space-y-3">
            <div class="flex items-center gap-1.5 text-xs font-bold text-brand-primary font-display">
              <UIcon name="i-solar-buildings-2-bold-duotone" class="w-4 h-4 text-brand-primary" />
              <span>Dimensi PDRB Terinci</span>
            </div>

            <div class="space-y-2">
              <div>
                <label for="articles-filter-kbli" class="block text-[11px] font-semibold text-ink-secondary mb-1">
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
                <label for="articles-filter-expenditure" class="block text-[11px] font-semibold text-ink-secondary mb-1">
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
            </div>
          </div>

          <!-- BENTO 2: Sumber & Validitas Informasi -->
          <div class="rounded-xl border border-border-hairline bg-canvas p-3.5 space-y-3">
            <div class="flex items-center gap-1.5 text-xs font-bold text-ink-primary font-display">
              <UIcon name="i-solar-global-bold-duotone" class="w-4 h-4 text-ink-secondary" />
              <span>Sumber &amp; Validitas</span>
            </div>

            <div class="space-y-2">
              <div>
                <label for="articles-filter-portal" class="block text-[11px] font-semibold text-ink-secondary mb-1">
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
                <label for="articles-filter-economic" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                  Relevansi Fenomena Ekonomi
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

              <div>
                <label for="articles-filter-subdistrict" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                  Lokus Kecamatan (KTT)
                </label>
                <USelect
                  id="articles-filter-subdistrict"
                  v-model="filters.subdistrict"
                  :items="subdistrictFilterItems"
                  value-key="value"
                  label-key="label"
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- BENTO 3: Rentang Waktu Rilis (WITA) + Quick Presets -->
          <div class="rounded-xl border border-border-hairline bg-canvas p-3.5 space-y-3 flex flex-col justify-between">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-xs font-bold text-ink-primary font-display">
                <div class="flex items-center gap-1.5">
                  <UIcon name="i-solar-calendar-linear" class="w-4 h-4 text-brand-primary" />
                  <span>Rentang Tanggal Terbit</span>
                </div>
                <button
                  v-if="filters.from || filters.to"
                  type="button"
                  class="text-[11px] font-semibold text-brand-primary hover:text-[#072B20] cursor-pointer"
                  @click="() => { filters.from = ''; filters.to = ''; }"
                >
                  Reset Tanggal
                </button>
              </div>

              <!-- Quick Presets -->
              <div class="grid grid-cols-3 gap-1 font-mono text-[10px]">
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white border border-[#141917]/15 hover:border-brand-primary hover:text-brand-primary font-medium text-ink-secondary transition-colors cursor-pointer text-center"
                  @click="setQuickDatePreset(7)"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white border border-[#141917]/15 hover:border-brand-primary hover:text-brand-primary font-medium text-ink-secondary transition-colors cursor-pointer text-center"
                  @click="setQuickDatePreset(30)"
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white border border-[#141917]/15 hover:border-brand-primary hover:text-brand-primary font-medium text-ink-secondary transition-colors cursor-pointer text-center"
                  @click="setQuickQuarterPreset"
                >
                  Triwulan
                </button>
              </div>

              <!-- Inputs -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label for="articles-filter-from" class="block text-[10px] font-medium text-ink-muted">
                    Dari Tanggal
                  </label>
                  <UInput
                    id="articles-filter-from"
                    v-model="filters.from"
                    type="date"
                    size="xs"
                    leading-icon="i-solar-calendar-linear"
                    class="w-full font-mono text-[11px]"
                  />
                </div>
                <div class="space-y-1">
                  <label for="articles-filter-to" class="block text-[10px] font-medium text-ink-muted">
                    Sampai Tanggal
                  </label>
                  <UInput
                    id="articles-filter-to"
                    v-model="filters.to"
                    type="date"
                    size="xs"
                    leading-icon="i-solar-calendar-linear"
                    class="w-full font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div class="pt-2 flex justify-end border-t border-border-hairline">
              <button
                type="button"
                class="min-h-7 px-2.5 py-1 rounded-lg border border-border-hairline bg-white hover:bg-canvas text-[11px] font-semibold text-ink-secondary inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                @click="resetFilters"
              >
                <UIcon name="i-solar-restart-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
                <span>Reset Seluruh Filter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Filter Chips Strip -->
      <div
        v-if="hasActiveFilters"
        class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-hairline text-xs"
      >
        <span class="text-[11px] font-semibold text-ink-muted mr-1">
          Filter Aktif:
        </span>

        <button
          v-if="selectedGroupMeta"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getKbliClusterTheme(selectedGroupMeta.groupCode).pillClass"
          @click="() => { filters.pdrbGroup = 'ALL'; }"
        >
          <span>Sektor {{ selectedGroupMeta.groupCode }} - {{ selectedGroupMeta.shortName }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.kbli !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getKbliClusterTheme(filters.kbli).pillClass"
          @click="() => { filters.kbli = 'ALL'; }"
        >
          <span>KBLI: {{ getKbliShortCodeName(filters.kbli as KbliCategoryEnum) }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.expenditure !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getExpenditureColorTheme(filters.expenditure).pillClass"
          @click="() => { filters.expenditure = 'ALL'; }"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="getExpenditureColorTheme(filters.expenditure).dotClass"
          />
          <span>{{ getExpenditureLabel(filters.expenditure as ExpenditureComponentEnum, false) }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.portal !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-tint text-brand-primary border border-brand-border font-medium hover:bg-[#D5E8DF] cursor-pointer"
          @click="() => { filters.portal = 'ALL'; }"
        >
          <span>Portal: {{ filters.portal }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.subdistrict !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-tint text-brand-primary border border-brand-border font-medium hover:bg-[#D5E8DF] cursor-pointer"
          @click="() => { filters.subdistrict = 'ALL'; }"
        >
          <span>Kecamatan: {{ filters.subdistrict }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.status !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle text-ink-secondary border border-border-hairline font-medium hover:bg-[#E2DFD7] cursor-pointer"
          @click="() => { filters.status = 'ALL'; }"
        >
          <span>Status: {{ getVerificationStatusBadge(filters.status as VerificationStatusEnum).label }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.llmStatus !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle text-ink-secondary border border-border-hairline font-medium hover:bg-[#E2DFD7] cursor-pointer"
          @click="() => { filters.llmStatus = 'ALL'; }"
        >
          <span>AI: {{ llmStatusFilterItems.find((i) => i.value === filters.llmStatus)?.label }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.isEconomic !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle text-ink-secondary border border-border-hairline font-medium hover:bg-[#E2DFD7] cursor-pointer"
          @click="() => { filters.isEconomic = 'ALL'; }"
        >
          <span>{{ filters.isEconomic === 'true' ? 'Hanya Ekonomi' : 'Non-Ekonomi' }}</span>
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="filters.year !== 'ALL' || filters.quarter !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle text-ink-secondary border border-border-hairline font-medium tabular-nums hover:bg-[#E2DFD7] cursor-pointer font-mono"
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
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
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

    <!-- Bank Data Table (Desktop >= lg) & Responsive Cards (< lg) -->
    <div class="obs-panel rounded-2xl overflow-hidden">
      <div
        role="region"
        aria-label="Tabel Bank Data Fenomena Ekonomi"
        class="hidden lg:block w-full"
      >
        <UTable
          :data="archiveData?.items ?? []"
          :columns="columns"
          :loading="pending"
          :ui="{
            th: 'py-2.5 px-2.5 text-[11px] font-bold text-ink-secondary whitespace-nowrap bg-canvas',
            td: 'py-2.5 px-2.5 text-xs align-top whitespace-normal',
          }"
          empty="Tidak ada arsip berita yang sesuai dengan kriteria filter."
        >
          <template #select-header>
            <UCheckbox
              :model-value="isAllSelected"
              aria-label="Pilih semua baris di halaman"
              size="sm"
              @update:model-value="toggleSelectAll"
            />
          </template>

          <template #select-cell="{ row }">
            <UCheckbox
              v-model="selectedMap[row.original.id]"
              :aria-label="`Pilih ${row.original.title}`"
              size="sm"
            />
          </template>

          <template #publishedAt-cell="{ row }">
            <div class="space-y-0.5 min-w-[95px]">
              <div class="text-[11px] font-bold tabular-nums text-ink-primary whitespace-nowrap leading-tight font-mono">
                {{ formatDateId(row.original.publishedAt) }}
              </div>
              <div
                class="text-[10px] font-medium text-ink-muted truncate max-w-[110px]"
                :title="row.original.sourcePortal"
              >
                {{ row.original.sourcePortal }}
              </div>
            </div>
          </template>

          <template #title-cell="{ row }">
            <div class="space-y-1 min-w-[160px] max-w-[260px] lg:max-w-[320px]">
              <div
                class="font-semibold text-xs text-ink-primary line-clamp-2 leading-snug"
                :title="row.original.title"
              >
                {{ row.original.title }}
              </div>
              <div class="flex items-center gap-1 text-[10px] text-ink-muted">
                <a
                  v-if="isSafeHttpUrl(row.original.url)"
                  :href="row.original.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-brand-primary hover:text-[#072B20] hover:underline truncate max-w-[200px] inline-flex items-center gap-0.5 font-medium"
                >
                  <span class="truncate">{{ row.original.url }}</span>
                  <UIcon name="i-lucide-external-link" class="w-2.5 h-2.5 shrink-0" />
                </a>
                <span v-else class="truncate max-w-[200px]">{{ row.original.url }}</span>
              </div>

              <!-- Lokus Kecamatan KTT & Catatan Kurator -->
              <div v-if="row.original.subdistrict || row.original.curatorNotes" class="flex flex-wrap items-center gap-1 pt-0.5">
                <span
                  v-if="row.original.subdistrict"
                  class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand-tint text-brand-primary border border-brand-border"
                >
                  <UIcon name="i-lucide-map-pin" class="w-2.5 h-2.5" />
                  <span>Kec. {{ row.original.subdistrict }}</span>
                </span>
                <span
                  v-if="row.original.curatorNotes"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#FEF6EE] text-ochre-ink border border-[#F7D3A6] truncate max-w-[200px]"
                  :title="`Catatan Kurator: ${row.original.curatorNotes}`"
                >
                  <UIcon name="i-lucide-message-square" class="w-2.5 h-2.5 text-ochre-ink shrink-0" />
                  <span class="truncate">{{ row.original.curatorNotes }}</span>
                </span>
              </div>
            </div>
          </template>

          <template #kbli-cell="{ row }">
            <div v-if="row.original.kbliCategory" class="space-y-1 max-w-[135px]">
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border leading-tight truncate max-w-full"
                :class="getKbliClusterTheme(row.original.kbliCategory).pillClass"
                :title="getKbliShortCodeName(row.original.kbliCategory)"
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
                  class="text-[10px] py-0 px-1.5"
                >
                  {{ getKbliImpactBadge(row.original.kbliImpact).shortLabel }}
                </UBadge>
              </div>

              <!-- Sektor KBLI Sekunder jika ada -->
              <div
                v-if="row.original.secondaryKbliCategory"
                class="pt-0.5 border-t border-border-hairline flex items-center gap-1 flex-wrap"
              >
                <span
                  class="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-medium border"
                  :class="getKbliClusterTheme(row.original.secondaryKbliCategory).pillClass"
                >
                  {{ getKbliShortCodeName(row.original.secondaryKbliCategory) }}
                </span>
                <UBadge
                  v-if="row.original.secondaryKbliImpact"
                  :color="getKbliImpactBadge(row.original.secondaryKbliImpact).color"
                  variant="subtle"
                  size="xs"
                  class="text-[9px] py-0 px-1"
                >
                  {{ getKbliImpactBadge(row.original.secondaryKbliImpact).shortLabel }}
                </UBadge>
              </div>
            </div>
            <span v-else class="text-xs text-ink-muted/70">—</span>
          </template>

          <template #expenditure-cell="{ row }">
            <div v-if="row.original.expenditureComponent" class="space-y-1 max-w-[135px]">
              <div class="inline-flex items-center gap-1 text-[11px] font-bold text-ink-primary leading-tight truncate max-w-full">
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="getExpenditureColorTheme(row.original.expenditureComponent).dotClass"
                  :style="{ backgroundColor: getExpenditureColorTheme(row.original.expenditureComponent).hex }"
                />
                <span class="truncate">{{ getExpenditureLabel(row.original.expenditureComponent, false) }}</span>
              </div>
              <div>
                <UBadge
                  v-if="row.original.expenditureImpact"
                  :color="getExpenditureImpactBadge(row.original.expenditureImpact).color"
                  variant="subtle"
                  size="xs"
                  :icon="getExpenditureImpactBadge(row.original.expenditureImpact).icon"
                  class="text-[10px] py-0 px-1.5"
                >
                  {{ getExpenditureImpactBadge(row.original.expenditureImpact).shortLabel }}
                </UBadge>
              </div>

              <!-- Komponen Pengeluaran Sekunder jika ada -->
              <div
                v-if="row.original.secondaryExpenditureComponent"
                class="pt-0.5 border-t border-border-hairline flex items-center gap-1 flex-wrap"
              >
                <span class="text-[9px] font-medium text-ink-secondary truncate max-w-[80px]">
                  {{ getExpenditureLabel(row.original.secondaryExpenditureComponent, false) }}
                </span>
                <UBadge
                  v-if="row.original.secondaryExpenditureImpact"
                  :color="getExpenditureImpactBadge(row.original.secondaryExpenditureImpact).color"
                  variant="subtle"
                  size="xs"
                  class="text-[9px] py-0 px-1"
                >
                  {{ getExpenditureImpactBadge(row.original.secondaryExpenditureImpact).shortLabel }}
                </UBadge>
              </div>
            </div>
            <span v-else class="text-xs text-ink-muted/70">—</span>
          </template>

          <template #period-cell="{ row }">
            <span class="inline-flex px-1.5 py-0.5 rounded bg-surface-subtle text-[10px] font-bold tabular-nums text-ink-primary whitespace-nowrap font-mono">
              {{ formatPeriodLabel(row.original.quarter, row.original.year) }}
            </span>
          </template>

          <template #status-cell="{ row }">
            <UBadge
              :color="getVerificationStatusBadge(row.original.verificationStatus).color"
              variant="subtle"
              size="xs"
              :icon="getVerificationStatusBadge(row.original.verificationStatus).icon"
              class="text-[10px] py-0.5 px-1.5 font-semibold whitespace-nowrap"
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
                  class="w-7 h-7 p-0 flex items-center justify-center cursor-pointer"
                  @click="() => { openEditDrawer(row.original); }"
                />
              </UTooltip>

              <UTooltip text="Hapus Permanen">
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  aria-label="Hapus artikel arsip"
                  class="w-7 h-7 p-0 flex items-center justify-center cursor-pointer"
                  @click="() => { askDelete(row.original); }"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Mobile & Tablet (< lg): Daftar Kartu Arsip Berita Responsif -->
      <div class="lg:hidden divide-y divide-[#141917]/10">
        <div
          v-if="!pending && (archiveData?.items ?? []).length === 0"
          class="p-6 text-center text-xs text-ink-muted"
        >
          Tidak ada arsip berita yang sesuai dengan kriteria filter.
        </div>

        <div
          v-for="item in archiveData?.items ?? []"
          :key="`mob-art-${item.id}`"
          class="p-4 space-y-2.5 bg-white hover:bg-canvas transition-colors"
        >
          <div class="flex items-start justify-between gap-2.5">
            <div class="flex items-start gap-2.5 min-w-0">
              <UCheckbox
                v-model="selectedMap[item.id]"
                :aria-label="`Pilih ${item.title}`"
                size="sm"
                class="mt-0.5 shrink-0"
              />
              <div class="min-w-0 space-y-1">
                <div class="font-bold text-xs sm:text-sm text-ink-primary leading-snug break-words">
                  {{ item.title }}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted tabular-nums font-mono">
                  <span class="font-semibold text-ink-secondary">{{ formatDateId(item.publishedAt) }}</span>
                  <span>•</span>
                  <span class="truncate max-w-[160px]">{{ item.sourcePortal }}</span>
                  <span>•</span>
                  <span class="px-1.5 py-0.2 rounded bg-surface-subtle font-bold text-ink-secondary">
                    {{ formatPeriodLabel(item.quarter, item.year) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-pencil"
                aria-label="Edit artikel arsip"
                class="w-8 h-8 p-0 flex items-center justify-center cursor-pointer"
                @click="() => { openEditDrawer(item); }"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="Hapus artikel arsip"
                class="w-8 h-8 p-0 flex items-center justify-center cursor-pointer"
                @click="() => { askDelete(item); }"
              />
            </div>
          </div>

          <div class="pl-6 flex flex-wrap items-center justify-between gap-2 pt-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <UBadge
                :color="getVerificationStatusBadge(item.verificationStatus).color"
                variant="subtle"
                size="xs"
                :icon="getVerificationStatusBadge(item.verificationStatus).icon"
                class="text-[10px]"
              >
                {{ getVerificationStatusBadge(item.verificationStatus).label }}
              </UBadge>

              <span
                v-if="item.kbliCategory"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border"
                :class="getKbliClusterTheme(item.kbliCategory).pillClass"
              >
                {{ getKbliShortCodeName(item.kbliCategory) }}
              </span>

              <span
                v-if="item.expenditureComponent"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-subtle border border-border-hairline text-[10px] font-semibold text-ink-primary"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :style="{ backgroundColor: getExpenditureColorTheme(item.expenditureComponent).hex }"
                />
                <span>{{ getExpenditureLabel(item.expenditureComponent, false) }}</span>
              </span>
            </div>

            <a
              v-if="isSafeHttpUrl(item.url)"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[11px] font-semibold text-brand-primary hover:underline inline-flex items-center gap-0.5 shrink-0"
            >
              <span>Buka Sumber</span>
              <UIcon name="i-lucide-external-link" class="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Selection Batch Bar (Deep Borneo Pine Command Bar) -->
    <div
      v-if="selectedIds.length > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-brand-primary text-white rounded-2xl shadow-xl border border-[#072B20] px-4 py-2.5 flex flex-wrap items-center gap-3 transition-all"
    >
      <span class="text-xs font-bold tabular-nums font-mono">
        {{ selectedIds.length }} Berita Dipilih
      </span>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-white text-brand-primary hover:bg-brand-tint text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="() => { reclassifyModalOpen = true; }"
        >
          <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-3.5 h-3.5" />
          <span>Ubah Klasifikasi</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="() => { void handleBulkAction('VERIFY'); }"
        >
          <UIcon name="i-lucide-check" class="w-3.5 h-3.5" />
          <span>Verifikasi</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-[#072B20] hover:bg-[#041a13] text-xs font-medium text-[#E3F0EA] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          @click="() => { void handleBulkAction('IGNORE'); }"
        >
          <span>Abaikan</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-2.5 rounded-xl text-xs font-medium text-[#E3F0EA]/70 hover:text-white cursor-pointer"
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
            <label class="font-bold text-ink-secondary">Kategori Lapangan Usaha (KBLI)</label>
            <select
              v-model="bulkKbli"
              class="w-full h-9 px-3 rounded-xl border border-[#141917]/15 bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah KBLI)</option>
              <option v-for="item in kbliOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-ink-secondary">Arah Dampak Aktivitas</label>
            <select
              v-model="bulkKbliImpact"
              class="w-full h-9 px-3 rounded-xl border border-[#141917]/15 bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Dampak)</option>
              <option v-for="item in kbliImpactOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-ink-secondary">Komponen Pengeluaran</label>
            <select
              v-model="bulkExpenditure"
              class="w-full h-9 px-3 rounded-xl border border-[#141917]/15 bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Pengeluaran)</option>
              <option v-for="item in expenditureOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-ink-secondary">Arah Dampak Pengeluaran</label>
            <select
              v-model="bulkExpenditureImpact"
              class="w-full h-9 px-3 rounded-xl border border-[#141917]/15 bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
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
          <UButton color="neutral" variant="ghost" @click="() => { reclassifyModalOpen = false; }">
            Batal
          </UButton>
          <UButton color="primary" :loading="isReclassifying" @click="() => { void handleBulkReclassify(); }">
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
      <span class="text-xs text-ink-muted tabular-nums font-mono">
        Total arsip cocok: <strong class="text-ink-primary">{{ archiveData.pagination.total }}</strong> berita • Halaman
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
        <p class="text-sm text-ink-secondary leading-relaxed text-pretty">
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
