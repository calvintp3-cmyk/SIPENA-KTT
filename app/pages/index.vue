<!-- app/pages/index.vue -->
<script setup lang="ts">
import {
  formatDateId,
  formatDateTimeWita,
  formatPeriodLabel,
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  getWitaDateParts,
  type PdrbQuarter,
} from '#shared/utils/period';
import type {
  PublicArticleItem,
  PublicArticlesResponse,
  PublicOverviewResponse,
} from '~/types/sipena';

const route = useRoute();
const router = useRouter();

const currentWitaPeriod = getCurrentQuarterYearWita();
const { searchInput, selectedYear, selectedQuarter, totalVerifiedInPeriod } =
  usePublicPortalState();

const {
  getKbliShortCodeName,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getSourceTypeLabel,
  formatNumberId,
} = usePdrbLabels();

const impactMacroLabelMap: Record<string, string> = {
  EXPANSION: 'Meningkatkan NTB / Riil',
  CONTRACTION: 'Menurunkan NTB / Riil',
  PRICE_UP: 'Kenaikan Harga / Deflator',
  PRICE_DOWN: 'Penurunan Harga / Deflator',
};

function parseQuarterParam(raw: unknown): PdrbQuarter {
  const num = Number(raw);
  if (num >= 1 && num <= 4) return num as PdrbQuarter;
  return currentWitaPeriod.quarter;
}

function parseYearParam(raw: unknown): number {
  const num = Number(raw);
  if (Number.isInteger(num) && num >= 2000 && num <= 2100) return num;
  return currentWitaPeriod.year;
}

function parsePageParam(raw: unknown): number {
  const num = Number(raw);
  return Number.isInteger(num) && num >= 1 ? num : 1;
}

// Initialize state from URL params
selectedYear.value = parseYearParam(route.query.year);
selectedQuarter.value = parseQuarterParam(route.query.quarter);
searchInput.value = typeof route.query.q === 'string' ? route.query.q : '';

const selectedPdrbGroup = ref<string>(
  typeof route.query.pdrbGroup === 'string' && route.query.pdrbGroup
    ? route.query.pdrbGroup
    : 'ALL',
);
const selectedKbli = ref<string>(
  typeof route.query.kbli === 'string' && route.query.kbli ? route.query.kbli : 'ALL',
);
const selectedExpenditure = ref<string>(
  typeof route.query.expenditure === 'string' && route.query.expenditure
    ? route.query.expenditure
    : 'ALL',
);
const selectedSourceType = ref<string>(
  typeof route.query.sourceType === 'string' && route.query.sourceType
    ? route.query.sourceType
    : 'ALL',
);
const selectedImpactMacro = ref<string>(
  typeof route.query.impactMacro === 'string' && route.query.impactMacro
    ? route.query.impactMacro
    : 'ALL',
);
const viewMode = ref<'stream' | 'table'>(
  route.query.view === 'table' ? 'table' : 'stream',
);

const debouncedSearch = ref<string>(searchInput.value.trim());
const currentPage = ref<number>(parsePageParam(route.query.page));

const showAnalyticsPanel = ref(false);
const mobileFiltersOpen = ref(false);
const activeModalArticle = ref<PublicArticleItem | null>(null);
const detailModalOpen = ref(false);

const PAGE_LIMIT = 20;

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (nextVal: string) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const trimmed = nextVal.trim();
    if (trimmed !== debouncedSearch.value) {
      debouncedSearch.value = trimmed;
      currentPage.value = 1;
      void syncUrlQuery();
    }
  }, 320);
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});

async function syncUrlQuery() {
  const nextQuery: Record<string, string> = {
    year: String(selectedYear.value),
    quarter: String(selectedQuarter.value),
  };
  if (selectedPdrbGroup.value !== 'ALL') nextQuery.pdrbGroup = selectedPdrbGroup.value;
  if (selectedKbli.value !== 'ALL') nextQuery.kbli = selectedKbli.value;
  if (selectedExpenditure.value !== 'ALL') nextQuery.expenditure = selectedExpenditure.value;
  if (selectedSourceType.value !== 'ALL') nextQuery.sourceType = selectedSourceType.value;
  if (selectedImpactMacro.value !== 'ALL') nextQuery.impactMacro = selectedImpactMacro.value;
  if (debouncedSearch.value) nextQuery.q = debouncedSearch.value;
  if (viewMode.value === 'table') nextQuery.view = 'table';
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value);

  await router.replace({ query: nextQuery });
}

const overviewQuery = computed(() => ({
  year: selectedYear.value,
  quarter: selectedQuarter.value,
}));

const articlesQuery = computed(() => {
  const qObj: Record<string, string | number> = {
    year: selectedYear.value,
    quarter: selectedQuarter.value,
    page: currentPage.value,
    limit: PAGE_LIMIT,
  };
  if (selectedKbli.value !== 'ALL') {
    qObj.kbli = selectedKbli.value;
  } else if (selectedPdrbGroup.value !== 'ALL') {
    qObj.pdrbGroup = selectedPdrbGroup.value;
  }
  if (selectedExpenditure.value !== 'ALL') qObj.expenditure = selectedExpenditure.value;
  if (selectedSourceType.value !== 'ALL') qObj.sourceType = selectedSourceType.value;
  if (selectedImpactMacro.value !== 'ALL') qObj.impactMacro = selectedImpactMacro.value;
  if (debouncedSearch.value) qObj.q = debouncedSearch.value;
  return qObj;
});

const {
  data: overviewData,
  pending: overviewPending,
} = await useFetch<PublicOverviewResponse>('/api/public/overview', {
  query: overviewQuery,
  watch: [overviewQuery],
});

const {
  data: articlesData,
  pending: articlesPending,
  error: articlesError,
  refresh: refreshArticles,
} = await useFetch<PublicArticlesResponse>('/api/public/articles', {
  query: articlesQuery,
  watch: [articlesQuery],
});

watchEffect(() => {
  totalVerifiedInPeriod.value = overviewData.value?.kpi.totalVerified ?? 0;
});

const availableYears = computed(() => {
  const years = new Set<number>([currentWitaPeriod.year, selectedYear.value]);
  for (const period of overviewData.value?.availablePeriods ?? []) {
    years.add(period.year);
  }
  return Array.from(years).sort((a, b) => b - a);
});

const quarterChips: Array<{ value: PdrbQuarter; shortLabel: string }> = [
  { value: 1, shortLabel: 'TW I' },
  { value: 2, shortLabel: 'TW II' },
  { value: 3, shortLabel: 'TW III' },
  { value: 4, shortLabel: 'TW IV' },
];

const quarterDateRangeLabel = computed(() => {
  const y = selectedYear.value;
  switch (selectedQuarter.value) {
    case 1:
      return `1 Jan – 31 Mar ${y}`;
    case 2:
      return `1 Apr – 30 Jun ${y}`;
    case 3:
      return `1 Jul – 30 Sep ${y}`;
    case 4:
      return `1 Okt – 31 Des ${y}`;
  }
});

const previousQuarterInfo = computed(() => {
  const prev = getPreviousQuarterYear(selectedQuarter.value, selectedYear.value);
  return {
    ...prev,
    label: formatPeriodLabel(prev.quarter, prev.year),
  };
});

const latestPopulatedPeriod = computed(
  () => overviewData.value?.availablePeriods.find((p) => p.count > 0) ?? null,
);

const activeFilterCount = computed(() => {
  let count = 0;
  if (selectedSourceType.value !== 'ALL') count++;
  if (selectedPdrbGroup.value !== 'ALL') count++;
  if (selectedKbli.value !== 'ALL') count++;
  if (selectedExpenditure.value !== 'ALL') count++;
  if (selectedImpactMacro.value !== 'ALL') count++;
  if (debouncedSearch.value !== '') count++;
  return count;
});

const hasSecondaryFilter = computed(() => activeFilterCount.value > 0);

const MONTH_NAMES_UPPER = [
  '',
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
];

const timelineDateGroups = computed(() => {
  const items = articlesData.value?.items ?? [];
  const groups: Array<{
    dateKey: string;
    dateLabel: string;
    items: PublicArticleItem[];
  }> = [];
  const map = new Map<string, (typeof groups)[number]>();

  for (const item of items) {
    let dateKey = 'unknown';
    let dateLabel = 'TANGGAL TIDAK DIKETAHUI';
    try {
      const p = getWitaDateParts(item.publishedAt);
      dateKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      const monthName = MONTH_NAMES_UPPER[p.month] ?? '';
      dateLabel = `${p.day} ${monthName} ${p.year}`;
    } catch {
      // fallback
    }

    let bucket = map.get(dateKey);
    if (!bucket) {
      bucket = { dateKey, dateLabel, items: [] };
      map.set(dateKey, bucket);
      groups.push(bucket);
    }
    bucket.items.push(item);
  }

  return groups;
});

const lastSyncText = computed(() => {
  const raw = overviewData.value?.lastUpdatedAt;
  if (!raw) return 'Belum ada sinkronisasi pada triwulan ini';
  try {
    return `Sinkronisasi Terakhir: ${formatDateTimeWita(raw)}`;
  } catch {
    return '';
  }
});

const rangeSummaryHtml = computed(() => {
  const pag = articlesData.value?.pagination;
  if (!pag || pag.total === 0) return { start: 0, end: 0, total: 0 };
  const start = (pag.page - 1) * pag.limit + 1;
  const end = Math.min(pag.page * pag.limit, pag.total);
  return { start, end, total: pag.total };
});

function handleYearChange(nextYear: number) {
  selectedYear.value = nextYear;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleQuarterChange(nextQuarter: PdrbQuarter) {
  selectedQuarter.value = nextQuarter;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleSourceTypeChange(nextSrc: string) {
  selectedSourceType.value = nextSrc;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handlePdrbGroupChange(nextGroup: string) {
  selectedPdrbGroup.value = nextGroup;
  selectedKbli.value = 'ALL';
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleKbliChange(nextKbli: string) {
  selectedKbli.value = nextKbli;
  if (nextKbli !== 'ALL') {
    selectedPdrbGroup.value = 'ALL';
  }
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleExpenditureChange(nextExp: string) {
  selectedExpenditure.value = nextExp;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleImpactMacroChange(nextImpact: string) {
  selectedImpactMacro.value = nextImpact;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleViewModeChange(nextMode: 'stream' | 'table') {
  viewMode.value = nextMode;
  void syncUrlQuery();
}

function handlePageChange(nextPage: number) {
  currentPage.value = nextPage;
  void syncUrlQuery();
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function resetSecondaryFilters() {
  selectedSourceType.value = 'ALL';
  selectedPdrbGroup.value = 'ALL';
  selectedKbli.value = 'ALL';
  selectedExpenditure.value = 'ALL';
  selectedImpactMacro.value = 'ALL';
  searchInput.value = '';
  debouncedSearch.value = '';
  currentPage.value = 1;
  void syncUrlQuery();
}

function jumpToPeriod(year: number, quarter: number) {
  selectedYear.value = year;
  selectedQuarter.value = quarter as PdrbQuarter;
  currentPage.value = 1;
  void syncUrlQuery();
}

function openArticleModal(article: PublicArticleItem) {
  activeModalArticle.value = article;
  detailModalOpen.value = true;
}
</script>

<template>
  <div class="space-y-6">
    <!-- SLIM EDITORIAL TITLE STRIP & CONTROLS -->
    <section class="border-b border-[#DCE3EC] pb-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div class="flex flex-col gap-1.5 max-w-2xl">
          <h1 class="text-2xl sm:text-[26px] font-bold tracking-tight text-[#0B1220] font-sans">
            Linimasa Fenomena Ekonomi
          </h1>
          <p class="text-xs sm:text-sm text-[#5B677A] leading-normal">
            Kurasi intelijen ekonomi riil &amp; verifikasi fenomena PDRB Kabupaten Tana Tidung untuk
            konsolidasi angka PDRB resmi.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- View Switcher -->
          <div
            role="group"
            aria-label="Pilih mode tampilan linimasa"
            class="inline-flex p-0.5 bg-slate-200/75 rounded-lg border border-slate-200/90"
          >
            <button
              type="button"
              :aria-pressed="viewMode === 'stream'"
              class="px-2.5 py-1.5 rounded-md font-sans text-xs transition-all flex items-center gap-1.5"
              :class="
                viewMode === 'stream'
                  ? 'font-semibold bg-white text-teal-800 shadow-[0_1px_2px_rgba(11,18,32,0.08),0_0_0_1px_rgba(11,18,32,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              "
              @click="handleViewModeChange('stream')"
            >
              <UIcon
                name="i-lucide-bar-chart-2"
                class="w-3.5 h-3.5"
                :class="viewMode === 'stream' ? 'text-teal-700' : 'text-slate-400'"
              />
              <span>Linimasa Stream</span>
            </button>

            <button
              type="button"
              :aria-pressed="viewMode === 'table'"
              class="px-2.5 py-1.5 rounded-md font-sans text-xs transition-all flex items-center gap-1.5"
              :class="
                viewMode === 'table'
                  ? 'font-semibold bg-white text-teal-800 shadow-[0_1px_2px_rgba(11,18,32,0.08),0_0_0_1px_rgba(11,18,32,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              "
              title="Beralih ke format tabular ringkas PDRB"
              @click="handleViewModeChange('table')"
            >
              <UIcon
                name="i-lucide-table"
                class="w-3.5 h-3.5"
                :class="viewMode === 'table' ? 'text-teal-700' : 'text-slate-400'"
              />
              <span class="hidden sm:inline">Tabel Ringkas PDRB</span>
              <span class="sm:hidden">Tabel</span>
            </button>
          </div>

          <!-- Year Selector -->
          <div class="relative">
            <label for="public-year-select" class="sr-only">Pilih Tahun PDRB</label>
            <select
              id="public-year-select"
              :value="selectedYear"
              class="h-9 pl-2.5 pr-7 bg-white text-xs font-mono font-semibold text-[#0B1220] border border-[#DCE3EC] rounded-lg hover:border-slate-300 shadow-[0_1px_2px_rgba(11,18,32,0.04)] transition-colors cursor-pointer appearance-none tabular-nums"
              @change="handleYearChange(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="yr in availableYears" :key="yr" :value="yr">
                {{ yr }}
              </option>
            </select>
            <UIcon
              name="i-lucide-chevron-down"
              class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>

          <!-- Quarter Segmented Control -->
          <div
            role="group"
            aria-label="Pilih Triwulan PDRB"
            class="inline-flex p-0.5 bg-slate-200/75 rounded-lg border border-slate-200/90"
          >
            <button
              v-for="chip in quarterChips"
              :key="chip.value"
              type="button"
              :aria-pressed="selectedQuarter === chip.value"
              class="px-2.5 py-1.5 rounded-md font-mono text-[11px] tabular-nums transition-all"
              :class="
                selectedQuarter === chip.value
                  ? 'bg-white text-teal-800 font-bold shadow-[0_1px_2px_rgba(11,18,32,0.08),0_0_0_1px_rgba(11,18,32,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              "
              @click="handleQuarterChange(chip.value)"
            >
              {{ chip.shortLabel }}
            </button>
          </div>

          <!-- Period Range & KPI Analytics Drawer Button -->
          <button
            type="button"
            :aria-expanded="showAnalyticsPanel"
            class="h-9 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-[0_1px_2px_rgba(11,18,32,0.04)]"
            :class="
              showAnalyticsPanel
                ? 'border-teal-600/40 bg-teal-50/70 text-teal-900'
                : 'border-[#DCE3EC] bg-white hover:border-slate-300 text-[#0B1220]'
            "
            @click="showAnalyticsPanel = !showAnalyticsPanel"
          >
            <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-slate-400" />
            <span class="font-mono text-[11px] tabular-nums">{{ quarterDateRangeLabel }}</span>
            <span class="hidden xl:inline text-slate-400">•</span>
            <span class="hidden xl:inline text-teal-700 font-semibold">Statistik</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
              :class="showAnalyticsPanel ? 'rotate-180 text-teal-700' : ''"
            />
          </button>
        </div>
      </div>

      <!-- Status Bar -->
      <div
        class="mt-4 pt-3.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600"
      >
        <div class="inline-flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-teal-600 ring-2 ring-teal-600/20" />
          <span class="font-bold text-[#0B1220] tabular-nums">
            {{ formatNumberId(overviewData?.kpi.totalVerified ?? 0) }}
          </span>
          <span>Fenomena Ekonomi Terverifikasi BPS Nerwilis</span>
        </div>
        <span class="text-[11px] text-[#5B677A] font-sans">
          {{ lastSyncText }}
        </span>
      </div>
    </section>

    <!-- Collapsible Statistik Periode Drawer (KPI & Distribusi Sektor) -->
    <section
      v-if="showAnalyticsPanel"
      aria-label="Statistik & Sebaran Sektor Periode Terpilih"
      class="space-y-4 bg-white/60 border border-[#DCE3EC] rounded-2xl p-4 sm:p-5"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-[#0B1220]">
            Ringkasan Statistik {{ formatPeriodLabel(selectedQuarter, selectedYear) }}
          </h2>
          <p class="text-xs text-[#5B677A]">
            Klik batang KBLI atau Komponen Pengeluaran untuk menyaring linimasa berita di bawah.
          </p>
        </div>
        <button
          type="button"
          class="text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white"
          @click="showAnalyticsPanel = false"
        >
          <span>Tutup Statistik</span>
          <UIcon name="i-lucide-chevron-up" class="w-3.5 h-3.5" />
        </button>
      </div>

      <PublicKpiSnapshotGrid :overview="overviewData ?? null" :pending="overviewPending" />

      <PublicSectorDistributionCharts
        :overview="overviewData ?? null"
        :selected-kbli="selectedKbli"
        :selected-expenditure="selectedExpenditure"
        :pending="overviewPending"
        @update:kbli="handleKbliChange"
        @update:expenditure="handleExpenditureChange"
      />
    </section>

    <!-- Mobile Filter Toolbar (< lg) -->
    <div class="lg:hidden flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      <div class="relative flex-1">
        <UIcon
          name="i-lucide-search"
          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <label for="mobile-public-search" class="sr-only">Cari fenomena ekonomi</label>
        <input
          id="mobile-public-search"
          v-model="searchInput"
          type="search"
          placeholder="Cari komoditas atau kata kunci..."
          class="w-full h-9 pl-9 pr-4 bg-white text-xs text-slate-800 placeholder:text-slate-500 rounded-lg border border-[#DCE3EC] focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 shadow-[0_1px_2px_rgba(11,18,32,0.04)]"
        >
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#DCE3EC] text-xs font-semibold text-slate-700 shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:bg-slate-50"
        @click="mobileFiltersOpen = true"
      >
        <UIcon name="i-lucide-filter" class="w-3.5 h-3.5 text-teal-700" />
        <span>Filter</span>
        <span
          class="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-950/5 text-teal-800 border border-teal-700/20 tabular-nums"
        >
          {{ activeFilterCount > 0 ? `Aktif (${activeFilterCount})` : 'Semua' }}
        </span>
      </button>
    </div>

    <!-- Mobile Filter Drawer -->
    <USlideover
      v-model:open="mobileFiltersOpen"
      side="left"
      title="Filter Fenomena Ekonomi"
      description="Saring linimasa berita berdasarkan sumber, 17 sektor KBLI, pengeluaran, dan arah dampak."
      :ui="{ content: 'max-w-xs' }"
    >
      <template #body>
        <PublicFilterBar
          in-drawer
          :overview="overviewData ?? null"
          :source-type="selectedSourceType"
          :pdrb-group="selectedPdrbGroup"
          :expenditure="selectedExpenditure"
          :impact-macro="selectedImpactMacro"
          :active-filter-count="activeFilterCount"
          @update:source-type="handleSourceTypeChange"
          @update:pdrb-group="handlePdrbGroupChange"
          @update:expenditure="handleExpenditureChange"
          @update:impact-macro="handleImpactMacroChange"
          @reset="resetSecondaryFilters"
        />
      </template>
    </USlideover>

    <!-- ASYMMETRIC TWO-COLUMN WORKBENCH -->
    <div class="flex flex-col lg:flex-row gap-8 items-start w-full">
      <!-- Desktop Left Filter Rail -->
      <div class="hidden lg:block shrink-0">
        <PublicFilterBar
          :overview="overviewData ?? null"
          :source-type="selectedSourceType"
          :pdrb-group="selectedPdrbGroup"
          :expenditure="selectedExpenditure"
          :impact-macro="selectedImpactMacro"
          :active-filter-count="activeFilterCount"
          @update:source-type="handleSourceTypeChange"
          @update:pdrb-group="handlePdrbGroupChange"
          @update:expenditure="handleExpenditureChange"
          @update:impact-macro="handleImpactMacroChange"
          @reset="resetSecondaryFilters"
        />
      </div>

      <!-- Right Main Stream -->
      <section
        aria-label="Linimasa Fenomena Ekonomi Terverifikasi"
        class="flex-1 min-w-0 w-full flex flex-col gap-6"
      >
        <!-- Active Filter Chips Strip -->
        <div
          v-if="hasSecondaryFilter"
          class="flex flex-wrap items-center gap-2 bg-white border border-[#DCE3EC] rounded-xl px-3.5 py-2.5 text-xs"
        >
          <span class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
            Filter Aktif:
          </span>

          <button
            v-if="selectedSourceType !== 'ALL'"
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-medium hover:bg-teal-100"
            @click="handleSourceTypeChange('ALL')"
          >
            <span>Sumber: {{ selectedSourceType === 'REGIONAL' ? 'Lokal KTT' : 'Nasional' }}</span>
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>

          <button
            v-if="selectedKbli !== 'ALL'"
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-medium hover:bg-teal-100"
            @click="handleKbliChange('ALL')"
          >
            <span>KBLI [{{ selectedKbli }}]</span>
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>

          <button
            v-if="selectedPdrbGroup !== 'ALL'"
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-medium hover:bg-teal-100"
            @click="handlePdrbGroupChange('ALL')"
          >
            <span>Sektor [{{ selectedPdrbGroup }}]</span>
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>

          <button
            v-if="selectedExpenditure !== 'ALL'"
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-medium hover:bg-sky-100"
            @click="handleExpenditureChange('ALL')"
          >
            <span>{{ getExpenditureLabel(selectedExpenditure as any, false) }}</span>
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>

          <button
            v-if="selectedImpactMacro !== 'ALL'"
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium hover:bg-slate-200"
            @click="handleImpactMacroChange('ALL')"
          >
            <span>Dampak: {{ impactMacroLabelMap[selectedImpactMacro] ?? selectedImpactMacro }}</span>
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>

          <button
            v-if="debouncedSearch"
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] hover:bg-slate-200"
            @click="searchInput = ''"
          >
            <span>"{{ debouncedSearch }}"</span>
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>

          <button
            type="button"
            class="ml-auto text-teal-700 hover:text-teal-900 font-semibold hover:underline"
            @click="resetSecondaryFilters"
          >
            Reset Semua
          </button>
        </div>

        <!-- Banner periode kosong jika triwulan terpilih belum memiliki berita -->
        <UAlert
          v-if="
            !overviewPending &&
            overviewData &&
            overviewData.kpi.totalVerified === 0 &&
            !hasSecondaryFilter
          "
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :title="`Belum ada fenomena ekonomi terverifikasi pada ${overviewData.period.label}`"
          description="Anda dapat menelusuri arsip triwulan sebelumnya atau periode terakhir yang sudah memiliki data terkurasi."
        >
          <template #actions>
            <div class="flex flex-wrap gap-2">
              <UButton
                size="xs"
                color="primary"
                variant="solid"
                @click="jumpToPeriod(previousQuarterInfo.year, previousQuarterInfo.quarter)"
              >
                Lihat {{ previousQuarterInfo.label }}
              </UButton>
              <UButton
                v-if="
                  latestPopulatedPeriod &&
                  (latestPopulatedPeriod.year !== previousQuarterInfo.year ||
                    latestPopulatedPeriod.quarter !== previousQuarterInfo.quarter)
                "
                size="xs"
                color="neutral"
                variant="outline"
                @click="jumpToPeriod(latestPopulatedPeriod.year, latestPopulatedPeriod.quarter)"
              >
                Buka {{ latestPopulatedPeriod.label }} ({{ latestPopulatedPeriod.count }})
              </UButton>
            </div>
          </template>
        </UAlert>

        <!-- Error State -->
        <UAlert
          v-if="articlesError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          title="Gagal memuat daftar berita fenomena ekonomi"
          description="Silakan muat ulang untuk mencoba kembali."
        >
          <template #actions>
            <UButton size="xs" color="error" variant="solid" @click="refreshArticles()">
              Muat Ulang
            </UButton>
          </template>
        </UAlert>

        <!-- Loading Skeletons -->
        <div v-else-if="articlesPending && !articlesData" class="space-y-4">
          <div v-for="i in 3" :key="i" class="saas-card rounded-xl p-6 space-y-3">
            <div class="h-3 w-48 rounded bg-slate-200" />
            <div class="h-5 w-3/4 rounded bg-slate-200" />
            <div class="h-14 w-full rounded bg-slate-100" />
          </div>
        </div>

        <!-- Empty Filtered Result -->
        <div
          v-else-if="!articlesData?.items.length"
          class="saas-card rounded-xl text-center py-12 px-6"
        >
          <div class="max-w-md mx-auto space-y-3">
            <UIcon name="i-lucide-search-x" class="w-10 h-10 text-slate-300 mx-auto" />
            <h2 class="text-sm font-bold text-[#0B1220]">
              Tidak ada fenomena yang cocok dengan filter aktif
            </h2>
            <p class="text-xs text-[#5B677A] leading-relaxed">
              Coba ubah triwulan/tahun pada bagian atas atau bersihkan filter sumber berita, sektor KBLI,
              pengeluaran, dan kata kunci pencarian.
            </p>
            <div v-if="hasSecondaryFilter" class="pt-1">
              <button
                type="button"
                class="obsidian-button text-xs font-semibold px-4 py-2 rounded-lg"
                @click="resetSecondaryFilters"
              >
                Reset Filter &amp; Pencarian
              </button>
            </div>
          </div>
        </div>

        <!-- VIEW 1: CONTINUOUS TIMELINE SPINE STREAM -->
        <div
          v-else-if="viewMode === 'stream'"
          class="relative border-l border-slate-300/80 ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-10"
        >
          <div
            v-for="(group, gIdx) in timelineDateGroups"
            :key="group.dateKey"
            class="relative flex flex-col gap-4"
          >
            <!-- Spine Precision Node Dot -->
            <div
              class="absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-[#EFF2F7] shadow-xs"
              :class="gIdx === 0 ? 'bg-teal-600' : 'bg-slate-400'"
            />

            <div class="flex items-center justify-between gap-3 pt-0.5">
              <span class="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
                {{ group.dateLabel }}
              </span>
              <span class="font-mono text-[11px] text-[#5B677A] tabular-nums">
                {{ group.items.length }} Catatan Terverifikasi
              </span>
            </div>

            <PublicPhenomenonFeedCard
              v-for="item in group.items"
              :key="item.id"
              :article="item"
              @select="openArticleModal"
            />
          </div>
        </div>

        <!-- VIEW 2: TABEL RINGKAS PDRB (Accessible Scrollable Region) -->
        <div v-else class="saas-card rounded-xl overflow-hidden">
          <div
            tabindex="0"
            role="region"
            aria-label="Tabel Ringkas Fenomena Ekonomi PDRB"
            class="saas-table-scroller"
          >
            <table class="w-full text-left border-collapse min-w-[780px]">
              <caption class="sr-only">
                Daftar ringkas fenomena ekonomi terverifikasi BPS Kabupaten Tana Tidung beserta pemetaan
                KBLI dan Komponen Pengeluaran PDRB
              </caption>
              <thead>
                <tr class="border-b border-[#DCE3EC] bg-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  <th scope="col" class="px-4 py-3 font-semibold">Tanggal (WITA)</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Sumber</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Fenomena Ekonomi</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Lapangan Usaha (KBLI)</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Pengeluaran PDRB</th>
                  <th scope="col" class="px-4 py-3 font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/70 text-xs">
                <tr
                  v-for="row in articlesData.items"
                  :key="row.id"
                  class="hover:bg-slate-50/90 transition-colors cursor-pointer"
                  @click="openArticleModal(row)"
                >
                  <td class="px-4 py-3.5 align-top font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {{ formatDateId(row.publishedAt) }}
                  </td>
                  <td class="px-4 py-3.5 align-top">
                    <div class="font-mono font-medium text-[#0B1220] truncate max-w-[140px]">
                      {{ row.sourcePortal }}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">
                      {{ getSourceTypeLabel(row.sourceType) }}
                    </div>
                  </td>
                  <td class="px-4 py-3.5 align-top max-w-md">
                    <div class="font-semibold text-[#0B1220] leading-snug line-clamp-2">
                      {{ row.title }}
                    </div>
                    <p class="text-[11px] text-[#5B677A] mt-1 line-clamp-2">
                      {{ row.summary }}
                    </p>
                  </td>
                  <td class="px-4 py-3.5 align-top">
                    <div class="font-medium text-slate-800 max-w-[190px] leading-snug">
                      {{ getKbliShortCodeName(row.kbliCategory) }}
                    </div>
                    <UBadge
                      v-if="row.kbliImpact"
                      :color="getKbliImpactBadge(row.kbliImpact).color"
                      variant="subtle"
                      size="xs"
                      class="mt-1"
                    >
                      {{ getKbliImpactBadge(row.kbliImpact).shortLabel }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3.5 align-top">
                    <div class="font-medium text-slate-800 max-w-[160px] leading-snug">
                      {{ getExpenditureLabel(row.expenditureComponent, false) }}
                    </div>
                    <UBadge
                      v-if="row.expenditureImpact"
                      :color="getExpenditureImpactBadge(row.expenditureImpact).color"
                      variant="subtle"
                      size="xs"
                      class="mt-1"
                    >
                      {{ getExpenditureImpactBadge(row.expenditureImpact).shortLabel }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3.5 align-top text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-md border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-teal-700"
                      @click.stop="openArticleModal(row)"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination & Metrics Status -->
        <div
          v-if="articlesData && articlesData.pagination.total > 0"
          class="pt-4 border-t border-[#DCE3EC] flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <span class="font-mono text-xs text-slate-600 tabular-nums">
            Menampilkan
            <span class="font-bold text-[#0B1220]">
              {{ rangeSummaryHtml.start }}–{{ rangeSummaryHtml.end }}
            </span>
            dari
            <span class="font-bold text-[#0B1220]">
              {{ formatNumberId(rangeSummaryHtml.total) }}
            </span>
            ringkasan terverifikasi
          </span>

          <UPagination
            v-if="articlesData.pagination.totalPages > 1"
            :page="currentPage"
            :total="articlesData.pagination.total"
            :items-per-page="articlesData.pagination.limit"
            @update:page="handlePageChange"
          />
        </div>

        <!-- BPS Official Validation Notice Card -->
        <div
          class="p-4 rounded-xl bg-teal-50/70 border border-teal-200/90 shadow-[0_1px_3px_rgba(11,18,32,0.03)] flex items-start sm:items-center gap-3.5 text-slate-700"
        >
          <div
            class="w-8 h-8 rounded-lg bg-teal-100/90 text-teal-800 flex items-center justify-center shrink-0 shadow-xs"
          >
            <UIcon name="i-lucide-shield-check" class="w-4 h-4" />
          </div>
          <p class="text-xs leading-relaxed text-[#334155]">
            Setiap catatan fenomena diekstraksi melalui sistem crawling media kredibel regional/nasional
            dan divalidasi berkala oleh Tim Neraca Wilayah dan Analisis Statistik (Nerwilis) BPS
            Kabupaten Tana Tidung untuk konsolidasi PDRB resmi.
          </p>
        </div>
      </section>
    </div>

    <!-- Modal Detail Fenomena & Sitasi -->
    <PublicArticleDetailModal v-model:open="detailModalOpen" :article="activeModalArticle" />
  </div>
</template>
