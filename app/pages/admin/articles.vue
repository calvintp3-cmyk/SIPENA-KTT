<!-- app/pages/admin/articles.vue -->
<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ExpenditureComponentEnum,
  KbliCategoryEnum,
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
const { isExporting, downloadExport } = useExcelExport();
const {
  kbliOptions,
  expenditureOptions,
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
    label: `[${sector.groupCode}] ${sector.shortName}`,
    value: sector.groupCode,
  })),
]);

const kbliFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua Huruf KBLI (A–U)', value: 'ALL' },
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
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] mt-2">
          Bank Data Fenomena Ekonomi
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
          Arsip terpusat seluruh fenomena ekonomi Kabupaten Tana Tidung &amp; ekspor kertas kerja
          resmi 10 kolom.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          class="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="() => { manualModalOpen = true; }"
        >
          <UIcon name="i-solar-add-circle-bold-duotone" class="w-4 h-4 text-indigo-600" />
          <span>Tambah Berita Manual</span>
        </button>

        <UDropdownMenu :items="exportMenuItems">
          <button
            type="button"
            :disabled="isExporting"
            class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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

    <!-- Filter Toolbar Multi-Parameter -->
    <div class="saas-card rounded-2xl p-4 sm:p-5 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div>
          <label for="articles-filter-q" class="sr-only">Cari judul, ringkasan, atau URL</label>
          <UInput
            id="articles-filter-q"
            v-model="filters.q"
            icon="i-solar-magnifer-line-duotone"
            placeholder="Cari judul, ringkasan, atau URL..."
            size="sm"
            class="w-full"
          />
        </div>

        <div>
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

        <div>
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

        <div>
          <label for="articles-filter-status" class="sr-only">Filter Status Verifikasi</label>
          <USelect
            id="articles-filter-status"
            v-model="filters.status"
            :items="statusFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Status Verifikasi"
            size="sm"
            class="w-full"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div>
          <label for="articles-filter-pdrb-group" class="sr-only">Filter 17 Sektor PDRB</label>
          <USelectMenu
            id="articles-filter-pdrb-group"
            v-model="filters.pdrbGroup"
            :items="pdrbGroupFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter 17 Sektor PDRB"
            size="sm"
            class="w-full"
          />
        </div>

        <div>
          <label for="articles-filter-kbli" class="sr-only">Filter Huruf KBLI A–U</label>
          <USelectMenu
            id="articles-filter-kbli"
            v-model="filters.kbli"
            :items="kbliFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Huruf KBLI A sampai U"
            size="sm"
            class="w-full"
          />
        </div>

        <div>
          <label for="articles-filter-expenditure" class="sr-only">Filter Komponen Pengeluaran</label>
          <USelect
            id="articles-filter-expenditure"
            v-model="filters.expenditure"
            :items="expenditureFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Komponen Pengeluaran"
            size="sm"
            class="w-full"
          />
        </div>

        <div>
          <label for="articles-filter-portal" class="sr-only">Filter Portal Sumber</label>
          <USelect
            id="articles-filter-portal"
            v-model="filters.portal"
            :items="portalFilterItems"
            value-key="value"
            label-key="label"
            aria-label="Filter Portal Sumber"
            size="sm"
            class="w-full"
          />
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Rentang Rilis (WITA):
          </span>
          <div class="flex items-center gap-1.5">
            <UInput
              v-model="filters.from"
              type="date"
              size="sm"
              aria-label="Dari tanggal rilis"
              title="Dari tanggal rilis (WITA)"
              class="w-36"
            />
            <span class="text-xs text-slate-400">—</span>
            <UInput
              v-model="filters.to"
              type="date"
              size="sm"
              aria-label="Sampai tanggal rilis"
              title="Sampai tanggal rilis (WITA)"
              class="w-36"
            />
          </div>
        </div>

        <button
          v-if="hasActiveFilters"
          type="button"
          class="h-8 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
          @click="() => { resetFilters(); }"
        >
          <UIcon name="i-solar-restart-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
          <span>Reset Semua Filter</span>
        </button>
      </div>

      <!-- Active Filter Chips Strip -->
      <div
        v-if="hasActiveFilters"
        class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs"
      >
        <span class="text-[11px] font-semibold text-slate-500 mr-1">
          Filter Aktif:
        </span>

        <button
          v-if="selectedGroupMeta"
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getKbliClusterTheme(selectedGroupMeta.groupCode).pillClass"
          @click="() => { filters.pdrbGroup = 'ALL'; }"
        >
          <span>Sektor [{{ selectedGroupMeta.groupCode }}] {{ selectedGroupMeta.shortName }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.kbli !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
          :class="getKbliClusterTheme(filters.kbli).pillClass"
          @click="() => { filters.kbli = 'ALL'; }"
        >
          <span>KBLI: {{ getKbliShortCodeName(filters.kbli as KbliCategoryEnum) }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.expenditure !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-opacity hover:opacity-85 cursor-pointer"
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
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium hover:bg-indigo-100 cursor-pointer"
          @click="() => { filters.portal = 'ALL'; }"
        >
          <span>Portal: {{ filters.portal }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.status !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium hover:bg-slate-200 cursor-pointer"
          @click="() => { filters.status = 'ALL'; }"
        >
          <span>Status: {{ getVerificationStatusBadge(filters.status as VerificationStatusEnum).label }}</span>
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>

        <button
          v-if="filters.year !== 'ALL' || filters.quarter !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium tabular-nums hover:bg-slate-200 cursor-pointer"
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
                class="font-semibold text-sm text-[#0F172A] line-clamp-2 leading-snug"
                :title="row.original.title"
              >
                {{ row.original.title }}
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
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
            <span v-else class="text-xs text-slate-400">—</span>
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
            <span v-else class="text-xs text-slate-400">—</span>
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
            <div class="flex items-center gap-1">
              <UTooltip text="Edit Arsip">
                <UButton
                  size="xs"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-pencil"
                  aria-label="Edit artikel arsip"
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
                  @click="() => { askDelete(row.original); }"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="archiveData"
      class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1"
    >
      <span class="text-xs text-slate-600 tabular-nums">
        Total arsip cocok: <strong class="text-[#0F172A]">{{ archiveData.pagination.total }}</strong> berita • Halaman
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
        <p class="text-sm text-slate-700 leading-relaxed">
          Anda yakin ingin menghapus <strong>{{ deleteTarget?.title }}</strong>?
        </p>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="() => { deleteModalOpen = false; }">
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
