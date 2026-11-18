<!-- app/pages/linimasa.vue -->
<script setup lang="ts">
import {
  ArticleSourceTypeEnum,
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
  type ExpenditureComponentMeta,
} from '#shared/enums/pdrb';
import {
  formatDateId,
  formatDateTimeWita,
  formatPeriodLabel,
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  getWitaDateParts,
  toRomanQuarter,
  type PdrbQuarter,
} from '#shared/utils/period';
import { applyKbliSelection } from '#shared/utils/public-helpers';
import type {
  PublicArticleItem,
  PublicArticlesResponse,
  PublicOverviewResponse,
  SelectOptionItem,
} from '~/types/sipena';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const router = useRouter();
const {
  searchInput,
  selectedYear: sharedSelectedYear,
  selectedQuarter: sharedSelectedQuarter,
  totalVerifiedInPeriod,
} = usePublicPortalState();

const {
  getKbliShortCodeName,
  getKbliImpactBadge,
  getKbliClusterTheme,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getExpenditureColorTheme,
  formatNumberId,
} = usePdrbLabels();

const MONTH_NAMES_ID = [
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

const IMPACT_MACRO_LABELS: Record<string, string> = {
  all: 'Semua Sinyal',
  output_up: '↗ Aktivitas Naik',
  output_down: '↘ Aktivitas Turun',
  price_up: '↑ Harga Naik',
  price_down: '↓ Harga Turun',
};

const currentWita = getCurrentQuarterYearWita();

function parseQuarter(raw: unknown): PdrbQuarter {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return currentWita.quarter;
}

function parseYear(raw: unknown): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 2000 && n <= 2100) return n;
  return currentWita.year;
}

function parsePage(raw: unknown): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1) return n;
  return 1;
}

function strParam(raw: unknown, fallback = 'ALL'): string {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return fallback;
}

function parseListParam(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.trim().length > 0 && raw.trim() !== 'ALL') {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return [];
}

const selectedYear = ref<number>(parseYear(route.query.year));
const selectedQuarter = ref<PdrbQuarter>(parseQuarter(route.query.quarter));

useSeoMeta({
  title: () =>
    `Eksplorasi Sinyal Fenomena TW ${toRomanQuarter(selectedQuarter.value)} ${selectedYear.value} — SIPENA KTT`,
  ogTitle: () =>
    `Eksplorasi Sinyal Fenomena TW ${toRomanQuarter(selectedQuarter.value)} ${selectedYear.value} — SIPENA KTT`,
  description:
    'Eksplorasi rekam jejak dinamika sektor usaha, pergerakan harga, dan transmisi PDRB Kabupaten Tana Tidung secara terkurasi dan transparan.',
});

const selectedPdrbGroups = ref<string[]>(parseListParam(route.query.pdrbGroup));
const selectedExpenditures = ref<string[]>(parseListParam(route.query.expenditure));
const selectedSourceType = ref<string>(strParam(route.query.sourceType, 'ALL'));
const selectedImpactMacro = ref<string>(strParam(route.query.impactMacro, 'all'));
const selectedDateFrom = ref<string>(strParam(route.query.from, ''));
const selectedDateTo = ref<string>(strParam(route.query.to, ''));
const viewMode = ref<'stream' | 'table'>(route.query.view === 'table' ? 'table' : 'stream');
const page = ref<number>(parsePage(route.query.page));

const showAnalyticsPanel = ref<boolean>(false);
const mobileFiltersOpen = ref<boolean>(false);
const detailModalOpen = ref<boolean>(false);
const selectedArticle = ref<PublicArticleItem | null>(null);

const initialSearchQ = typeof route.query.q === 'string' ? route.query.q : '';
searchInput.value = initialSearchQ;
const debouncedSearch = ref<string>(initialSearchQ.trim());

sharedSelectedYear.value = selectedYear.value;
sharedSelectedQuarter.value = selectedQuarter.value;

watch([selectedYear, selectedQuarter], ([y, q]: [number, PdrbQuarter]) => {
  sharedSelectedYear.value = y;
  sharedSelectedQuarter.value = q;
});

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (val: string) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const trimmed = val.trim();
    if (debouncedSearch.value !== trimmed) {
      debouncedSearch.value = trimmed;
      page.value = 1;
    }
  }, 320);
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});

// Sync URL query whenever reactive filters change
watch(
  [
    selectedYear,
    selectedQuarter,
    debouncedSearch,
    selectedPdrbGroups,
    selectedExpenditures,
    selectedSourceType,
    selectedImpactMacro,
    selectedDateFrom,
    selectedDateTo,
    viewMode,
    page,
  ],
  () => {
    const nextQuery: Record<string, string> = {
      year: String(selectedYear.value),
      quarter: String(selectedQuarter.value),
    };
    if (debouncedSearch.value) nextQuery.q = debouncedSearch.value;
    if (selectedPdrbGroups.value.length > 0) nextQuery.pdrbGroup = selectedPdrbGroups.value.join(',');
    if (selectedExpenditures.value.length > 0) nextQuery.expenditure = selectedExpenditures.value.join(',');
    if (selectedSourceType.value !== 'ALL') nextQuery.sourceType = selectedSourceType.value;
    if (selectedImpactMacro.value !== 'all' && selectedImpactMacro.value !== 'ALL') {
      nextQuery.impactMacro = selectedImpactMacro.value;
    }
    if (selectedDateFrom.value) nextQuery.from = selectedDateFrom.value;
    if (selectedDateTo.value) nextQuery.to = selectedDateTo.value;
    if (viewMode.value === 'table') nextQuery.view = 'table';
    if (page.value > 1) nextQuery.page = String(page.value);

    router.replace({ query: nextQuery });
  },
);

const overviewQuery = computed(() => ({
  year: selectedYear.value,
  quarter: selectedQuarter.value,
}));

const {
  data: overview,
  pending: overviewPending,
} = await useFetch<PublicOverviewResponse>('/api/public/overview', {
  query: overviewQuery,
  watch: [overviewQuery],
});

watch(
  () => overview.value?.kpi.totalVerified,
  (total: number | undefined) => {
    totalVerifiedInPeriod.value = total ?? 0;
  },
  { immediate: true },
);

const articlesQuery = computed(() => {
  const q: Record<string, string | number> = {
    year: selectedYear.value,
    quarter: selectedQuarter.value,
    page: page.value,
    limit: 20,
  };
  if (debouncedSearch.value) q.q = debouncedSearch.value;
  if (selectedPdrbGroups.value.length > 0) q.pdrbGroup = selectedPdrbGroups.value.join(',');
  if (selectedExpenditures.value.length > 0) q.expenditure = selectedExpenditures.value.join(',');
  if (selectedSourceType.value !== 'ALL') q.sourceType = selectedSourceType.value;
  if (selectedImpactMacro.value !== 'all' && selectedImpactMacro.value !== 'ALL') {
    q.impactMacro = selectedImpactMacro.value;
  }
  if (selectedDateFrom.value) q.from = selectedDateFrom.value;
  if (selectedDateTo.value) q.to = selectedDateTo.value;
  return q;
});

const {
  data: articlesResponse,
  pending: articlesPending,
  error: articlesError,
  refresh: refreshArticles,
} = await useFetch<PublicArticlesResponse>('/api/public/articles', {
  query: articlesQuery,
  watch: [articlesQuery],
});

const availableYears = computed<number[]>(() => {
  const set = new Set<number>([currentWita.year, currentWita.year - 1, selectedYear.value]);
  for (const p of overview.value?.availablePeriods ?? []) {
    set.add(p.year);
  }
  return Array.from(set).sort((a, b) => b - a);
});

const yearSelectOptions = computed<SelectOptionItem<number>[]>(() =>
  availableYears.value.map((y: number) => ({
    label: `${y}`,
    value: y,
  })),
);

const quarterButtons: Array<{ value: PdrbQuarter; label: string; range: string }> = [
  { value: 1, label: 'TW I', range: 'Jan–Mar' },
  { value: 2, label: 'TW II', range: 'Apr–Jun' },
  { value: 3, label: 'TW III', range: 'Jul–Sep' },
  { value: 4, label: 'TW IV', range: 'Okt–Des' },
];

const QUARTER_MONTH_NAMES: Record<PdrbQuarter, { start: string; end: string }> = {
  1: { start: 'Januari', end: 'Maret' },
  2: { start: 'April', end: 'Juni' },
  3: { start: 'Juli', end: 'September' },
  4: { start: 'Oktober', end: 'Desember' },
};

const hasCustomDateRange = computed(() => Boolean(selectedDateFrom.value || selectedDateTo.value));

const periodDisplayLabel = computed(() => {
  const q = (selectedQuarter.value in QUARTER_MONTH_NAMES ? selectedQuarter.value : 1) as PdrbQuarter;
  const m = QUARTER_MONTH_NAMES[q] ?? { start: 'Januari', end: 'Maret' };
  return `${m.start} - ${m.end} ${selectedYear.value}`;
});

const customDateRangeLabel = computed(() => {
  if (selectedDateFrom.value && selectedDateTo.value) {
    return `${formatDateId(selectedDateFrom.value)} – ${formatDateId(selectedDateTo.value)}`;
  }
  if (selectedDateFrom.value) {
    return `Sejak ${formatDateId(selectedDateFrom.value)}`;
  }
  if (selectedDateTo.value) {
    return `Hingga ${formatDateId(selectedDateTo.value)}`;
  }
  return '';
});

const currentPeriodLabel = computed(() =>
  formatPeriodLabel(selectedQuarter.value, selectedYear.value),
);

const lastSyncText = computed(() => {
  if (!overview.value?.lastUpdatedAt) return 'Menunggu kurasi data';
  return formatDateTimeWita(overview.value.lastUpdatedAt);
});

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string; label: string; clear: () => void }> = [];

  if (debouncedSearch.value) {
    chips.push({
      key: 'q',
      label: `Cari: "${debouncedSearch.value}"`,
      clear: () => {
        searchInput.value = '';
        debouncedSearch.value = '';
        page.value = 1;
      },
    });
  }
  if (selectedSourceType.value !== 'ALL') {
    chips.push({
      key: 'sourceType',
      label:
        selectedSourceType.value === ArticleSourceTypeEnum.REGIONAL
          ? 'Sumber: Lokal Kaltara'
          : 'Sumber: Nasional',
      clear: () => {
        selectedSourceType.value = 'ALL';
        page.value = 1;
      },
    });
  }

  for (const groupCode of selectedPdrbGroups.value) {
    const sector = PDRB_17_SECTORS.find((s) => s.groupCode === groupCode);
    chips.push({
      key: `pdrb-${groupCode}`,
      label: `KBLI ${groupCode}: ${sector?.shortName ?? groupCode}`,
      clear: () => {
        selectedPdrbGroups.value = selectedPdrbGroups.value.filter((c: string) => c !== groupCode);
        page.value = 1;
      },
    });
  }

  for (const expCode of selectedExpenditures.value) {
    const item = PDRB_6_EXPENDITURE_LIST.find((e: ExpenditureComponentMeta) => e.code === expCode);
    chips.push({
      key: `exp-${expCode}`,
      label: `Pengeluaran: ${item?.short ?? expCode}`,
      clear: () => {
        selectedExpenditures.value = selectedExpenditures.value.filter((c: string) => c !== expCode);
        page.value = 1;
      },
    });
  }

  if (selectedImpactMacro.value !== 'all' && selectedImpactMacro.value !== 'ALL') {
    chips.push({
      key: 'impactMacro',
      label: `Sinyal: ${IMPACT_MACRO_LABELS[selectedImpactMacro.value] ?? selectedImpactMacro.value}`,
      clear: () => {
        selectedImpactMacro.value = 'all';
        page.value = 1;
      },
    });
  }

  if (selectedDateFrom.value || selectedDateTo.value) {
    chips.push({
      key: 'dateRange',
      label: `Rentang: ${customDateRangeLabel.value}`,
      clear: () => {
        selectedDateFrom.value = '';
        selectedDateTo.value = '';
        page.value = 1;
      },
    });
  }

  return chips;
});

const activeFilterCount = computed(() => activeFilterChips.value.length);

function resetAllFilters() {
  searchInput.value = '';
  debouncedSearch.value = '';
  selectedSourceType.value = 'ALL';
  selectedPdrbGroups.value = [];
  selectedExpenditures.value = [];
  selectedImpactMacro.value = 'all';
  selectedDateFrom.value = '';
  selectedDateTo.value = '';
  page.value = 1;
}

function handlePeriodChange(newYear: number, newQuarter: PdrbQuarter) {
  selectedYear.value = newYear;
  selectedQuarter.value = newQuarter;
  page.value = 1;
}

function handleKbliChartUpdate(val: string) {
  const next = applyKbliSelection(val);
  selectedPdrbGroups.value = [next.pdrbGroup];
  page.value = 1;
}

function handleExpenditureChartUpdate(val: string) {
  selectedExpenditures.value = [val];
  page.value = 1;
}

const timelineDateGroups = computed(() => {
  const items = articlesResponse.value?.items ?? [];
  const groups: Array<{
    dateKey: string;
    dayLabel: string;
    monthYearLabel: string;
    items: PublicArticleItem[];
  }> = [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  for (const article of items) {
    let dateKey = 'unknown';
    let dayLabel = '--';
    let monthYearLabel = 'ARSIP';
    try {
      const p = getWitaDateParts(article.publishedAt);
      dateKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      dayLabel = String(p.day).padStart(2, '0');
      monthYearLabel = `${MONTH_NAMES_ID[p.month - 1] ?? ''} ${p.year}`;
    } catch {
      // keep defaults
    }

    let bucket = groupMap.get(dateKey);
    if (!bucket) {
      bucket = {
        dateKey,
        dayLabel,
        monthYearLabel,
        items: [],
      };
      groupMap.set(dateKey, bucket);
      groups.push(bucket);
    }
    bucket.items.push(article);
  }

  return groups;
});

const previousQuarterInfo = computed(() => {
  const prev = getPreviousQuarterYear(selectedQuarter.value, selectedYear.value);
  return {
    year: prev.year,
    quarter: prev.quarter,
    label: formatPeriodLabel(prev.quarter, prev.year),
  };
});

const latestPopulatedPeriod = computed(() => {
  const populated = (overview.value?.availablePeriods ?? []).find(
    (p) =>
      p.count > 0 && (p.year !== selectedYear.value || p.quarter !== selectedQuarter.value),
  );
  if (!populated) return null;
  return {
    year: populated.year,
    quarter: populated.quarter as PdrbQuarter,
    label: populated.label,
    count: populated.count,
  };
});

function openDetailModal(article: PublicArticleItem) {
  selectedArticle.value = article;
  detailModalOpen.value = true;
}
</script>

<template>
  <div class="space-y-8 pb-16">
    <!-- Top Editorial Header & Command Ribbon -->
    <section aria-label="Kontrol Periode dan Ringkasan Linimasa" class="space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#141917]/[0.08]">
        <!-- Left: Editorial Title & Status Indicator -->
        <div class="space-y-2 max-w-3xl">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C8553D]">
              KABUPATEN TANA TIDUNG &bull; CATATAN FENOMENA PDRB
            </span>
            <span class="text-[#141917]/20">&bull;</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E3F0EA] border border-[#BBD8CB] text-xs font-mono font-bold text-[#0B3D2E] tabular-nums">
              <span class="w-1.5 h-1.5 rounded-full bg-[#0B3D2E]" />
              <span>{{ formatNumberId(overview?.kpi.totalVerified ?? 0) }} Bukti Terverifikasi</span>
            </span>
          </div>

          <h1 class="font-display font-bold text-3xl sm:text-4xl text-[#141917] tracking-tight">
            Eksplorasi Sinyal Fenomena Ekonomi
          </h1>

          <p class="text-xs sm:text-sm text-[#4A524E] leading-relaxed max-w-2xl">
            Arsip empiris dinamika 17 sektor usaha KBLI, 6 komponen pengeluaran PDRB, dan transmisi pergerakan harga di Kabupaten Tana Tidung.
          </p>
        </div>

        <!-- Right: View Switcher & Analytics Toggle -->
        <div class="flex flex-wrap items-center gap-2.5 self-start lg:self-end shrink-0">
          <!-- View Switcher -->
          <div class="inline-flex p-1 rounded-xl bg-[#ECEAE2] text-xs font-semibold">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
              :class="viewMode === 'stream' ? 'bg-white text-[#141917] shadow-2xs font-bold' : 'text-[#4A524E] hover:text-[#141917]'"
              @click="viewMode = 'stream'"
            >
              <UIcon name="i-solar-list-bold-duotone" class="w-3.5 h-3.5" />
              <span>Linimasa</span>
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
              :class="viewMode === 'table' ? 'bg-white text-[#141917] shadow-2xs font-bold' : 'text-[#4A524E] hover:text-[#141917]'"
              @click="viewMode = 'table'"
            >
              <UIcon name="i-solar-widget-4-bold-duotone" class="w-3.5 h-3.5" />
              <span>Tabel Ringkas</span>
            </button>
          </div>

          <!-- Analytics Panel Toggle Button -->
          <button
            type="button"
            class="h-9 px-3.5 rounded-xl border border-[#141917]/10 bg-white text-xs font-semibold text-[#141917] hover:bg-[#ECEAE2] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            :class="showAnalyticsPanel ? 'bg-[#E3F0EA] border-[#BBD8CB] text-[#0B3D2E] font-bold' : ''"
            @click="showAnalyticsPanel = !showAnalyticsPanel"
          >
            <UIcon name="i-solar-pie-chart-2-bold-duotone" class="w-4 h-4 text-[#0B3D2E]" />
            <span>{{ showAnalyticsPanel ? 'Sembunyikan Statistik' : 'Statistik Periode' }}</span>
          </button>
        </div>
      </div>

      <!-- Integrated Period Switcher Capsule -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="inline-flex items-center p-1 rounded-2xl bg-[#ECEAE2] border border-[#141917]/[0.08] divide-x divide-[#141917]/10">
          <!-- Year Selector -->
          <div class="pr-2 pl-1 py-0.5">
            <USelect
              id="linimasa-year-select"
              :model-value="selectedYear"
              :items="yearSelectOptions"
              value-key="value"
              label-key="label"
              leading-icon="i-solar-calendar-bold-duotone"
              size="xs"
              aria-label="Tahun PDRB"
              class="w-24 font-bold font-mono text-[#141917]"
              @update:model-value="(val: unknown) => handlePeriodChange(Number(val), selectedQuarter)"
            />
          </div>

          <!-- Quarter Switcher -->
          <div class="inline-flex items-center gap-1 pl-2 font-mono">
            <button
              v-for="qBtn in quarterButtons"
              :key="qBtn.value"
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              :class="
                selectedQuarter === qBtn.value
                  ? 'bg-[#0B3D2E] text-white shadow-2xs font-bold'
                  : 'text-[#4A524E] hover:text-[#141917]'
              "
              @click="handlePeriodChange(selectedYear, qBtn.value)"
            >
              {{ qBtn.label }}
            </button>
          </div>
        </div>

        <div class="text-xs text-[#737B76] font-mono">
          Sinkronisasi Terakhir: <strong class="text-[#141917]">{{ lastSyncText }}</strong>
        </div>
      </div>
    </section>

    <!-- Collapsible Analytics Panel -->
    <div v-if="showAnalyticsPanel" class="space-y-6 pt-2 pb-4">
      <PublicKpiSnapshotGrid :overview="overview ?? null" :pending="overviewPending" />
      <PublicSectorDistributionCharts
        :overview="overview ?? null"
        :selected-kbli="selectedPdrbGroups[0] ?? 'ALL'"
        :selected-pdrb-group="selectedPdrbGroups[0] ?? 'ALL'"
        :selected-expenditure="selectedExpenditures[0] ?? 'ALL'"
        :pending="overviewPending"
        @update:kbli="handleKbliChartUpdate"
        @update:expenditure="handleExpenditureChartUpdate"
      />
    </div>

    <!-- Sticky Horizontal Command & Filter Dock -->
    <PublicFilterDock
      :overview="overview ?? null"
      :source-type="selectedSourceType"
      :pdrb-groups="selectedPdrbGroups"
      :expenditures="selectedExpenditures"
      :impact-macro="selectedImpactMacro"
      :date-from="selectedDateFrom"
      :date-to="selectedDateTo"
      :active-filter-count="activeFilterCount"
      @update:source-type="(v) => { selectedSourceType = v; page = 1; }"
      @update:pdrb-groups="(v) => { selectedPdrbGroups = v; page = 1; }"
      @update:expenditures="(v) => { selectedExpenditures = v; page = 1; }"
      @update:impact-macro="(v) => { selectedImpactMacro = v; page = 1; }"
      @update:date-from="(v) => { selectedDateFrom = v; page = 1; }"
      @update:date-to="(v) => { selectedDateTo = v; page = 1; }"
      @open-drawer="mobileFiltersOpen = true"
      @reset="resetAllFilters"
    />

    <!-- Active Filter Chips Ribbon -->
    <div
      v-if="activeFilterChips.length > 0"
      class="flex flex-wrap items-center gap-2 text-xs"
    >
      <span class="text-[11px] font-mono font-semibold text-[#737B76] uppercase">Filter Aktif:</span>
      <button
        v-for="chip in activeFilterChips"
        :key="chip.key"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F0EA] border border-[#BBD8CB] text-xs font-semibold text-[#0B3D2E] hover:bg-[#D2E6DC] transition-colors cursor-pointer"
        @click="chip.clear"
      >
        <span>{{ chip.label }}</span>
        <UIcon name="i-lucide-x" class="w-3 h-3 text-[#0B3D2E]" />
      </button>
      <button
        type="button"
        class="text-xs text-[#C8553D] font-bold hover:underline ml-1 cursor-pointer"
        @click="resetAllFilters"
      >
        Reset Semua
      </button>
    </div>

    <!-- Main Signal Stream / Table Area (Natural Full-Page Flow) -->
    <div>
      <!-- Error Alert -->
      <UAlert
        v-if="articlesError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Gagal memuat arsip fenomena ekonomi"
        description="Terjadi kendala saat mengambil data fenomena dari server. Silakan muat ulang."
        class="mb-6"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            size="xs"
            label="Muat Ulang"
            icon="i-lucide-refresh-cw"
            @click="() => { refreshArticles(); }"
          />
        </template>
      </UAlert>

      <!-- Skeleton Loading -->
      <div v-else-if="articlesPending && !articlesResponse" class="space-y-6">
        <div v-for="idx in 3" :key="idx" class="md:grid md:grid-cols-[120px_1fr] gap-6 items-start">
          <div class="h-14 w-20 rounded-xl bg-[#ECEAE2] animate-pulse" />
          <div class="h-44 rounded-2xl bg-[#ECEAE2] animate-pulse" />
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!articlesResponse || articlesResponse.items.length === 0"
        class="p-12 text-center rounded-3xl bg-white border border-[#141917]/[0.08] shadow-2xs space-y-4 max-w-xl mx-auto"
      >
        <div class="w-12 h-12 rounded-2xl bg-[#E3F0EA] border border-[#BBD8CB] text-[#0B3D2E] flex items-center justify-center mx-auto">
          <UIcon name="i-solar-inbox-line-bold-duotone" class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <h2 class="font-display font-bold text-lg text-[#141917]">
            {{
              activeFilterCount > 0
                ? 'Tidak ada fenomena yang cocok'
                : `Belum ada fenomena terverifikasi di ${currentPeriodLabel}`
            }}
          </h2>
          <p class="text-xs text-[#4A524E] leading-relaxed">
            {{
              activeFilterCount > 0
                ? 'Coba longgarkan kata kunci pencarian, sektor KBLI, atau rentang tanggal.'
                : 'Beralih ke triwulan lain untuk melihat catatan fenomena yang telah selesai diverifikasi.'
            }}
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            v-if="activeFilterCount > 0"
            type="button"
            class="obs-btn-primary h-9 px-4 rounded-xl text-xs font-semibold"
            @click="resetAllFilters"
          >
            Reset Semua Filter
          </button>
          <button
            type="button"
            class="obs-btn-ghost h-9 px-4 rounded-xl text-xs font-semibold"
            @click="handlePeriodChange(previousQuarterInfo.year, previousQuarterInfo.quarter)"
          >
            Ke {{ previousQuarterInfo.label }}
          </button>
          <button
            v-if="latestPopulatedPeriod"
            type="button"
            class="obs-btn-primary h-9 px-4 rounded-xl text-xs font-semibold"
            @click="handlePeriodChange(latestPopulatedPeriod.year, latestPopulatedPeriod.quarter)"
          >
            Buka {{ latestPopulatedPeriod.label }} ({{ latestPopulatedPeriod.count }})
          </button>
        </div>
      </div>

      <!-- Mode 1: Natural Full-Page Stream (Asymmetric Magazine Day Numeral Gutter) -->
      <div v-else-if="viewMode === 'stream'" class="space-y-10">
        <section
          v-for="group in timelineDateGroups"
          :key="group.dateKey"
          class="md:grid md:grid-cols-[120px_1fr] gap-6 items-start"
        >
          <!-- Left Column (Desktop Sticky Day Numeral Gutter) -->
          <div class="md:sticky md:top-40 mb-3 md:mb-0">
            <div class="flex md:flex-col items-baseline md:items-start justify-between gap-1">
              <div class="font-display font-extrabold text-3xl sm:text-4xl text-[#141917] tabular-nums tracking-tight">
                {{ group.dayLabel }}
              </div>
              <div class="text-[11px] font-mono font-bold text-[#737B76] uppercase tracking-wider">
                {{ group.monthYearLabel }}
              </div>
              <div class="text-[11px] font-mono text-[#0B3D2E] font-semibold mt-0.5">
                {{ group.items.length }} sinyal
              </div>
            </div>
          </div>

          <!-- Right Column: Clean Feed Cards -->
          <div class="space-y-4">
            <PublicPhenomenonFeedCard
              v-for="article in group.items"
              :key="article.id"
              :article="article"
              @select="openDetailModal"
            />
          </div>
        </section>
      </div>

      <!-- Mode 2: Clean Architectural Table -->
      <div v-else class="rounded-2xl border border-[#141917]/[0.08] overflow-hidden bg-white shadow-2xs">
        <div class="px-5 py-3.5 border-b border-[#141917]/[0.08] bg-[#F6F5F1] flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-[#141917] font-display">
            Tabel Ringkas Fenomena ({{ articlesResponse.pagination.total }})
          </span>
          <span class="text-[11px] text-[#737B76]">Klik baris untuk membaca ringkasan lengkap</span>
        </div>

        <div class="saas-table-scroller" tabindex="0" role="region" aria-label="Tabel Fenomena Terverifikasi">
          <table class="min-w-full divide-y divide-[#141917]/[0.08] text-left text-xs">
            <thead class="bg-[#ECEAE2] text-[#141917] font-semibold sticky top-0 z-10 font-display">
              <tr>
                <th scope="col" class="px-4 py-3 whitespace-nowrap">Tanggal</th>
                <th scope="col" class="px-4 py-3 min-w-[280px]">Judul &amp; Sumber</th>
                <th scope="col" class="px-4 py-3 min-w-[180px]">Lapangan Usaha</th>
                <th scope="col" class="px-4 py-3 min-w-[180px]">Pengeluaran PDRB</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#141917]/[0.06] bg-white">
              <tr
                v-for="article in articlesResponse.items"
                :key="article.id"
                class="hover:bg-[#E3F0EA]/40 cursor-pointer transition-colors"
                @click="openDetailModal(article)"
              >
                <td class="px-4 py-3.5 align-top whitespace-nowrap font-mono tabular-nums text-[#4A524E]">
                  {{ formatDateId(article.publishedAt) }}
                  <div class="text-[10.5px] text-[#737B76]">
                    TW {{ toRomanQuarter(article.quarter) }} {{ article.year }}
                  </div>
                </td>
                <td class="px-4 py-3.5 align-top space-y-1">
                  <button
                    type="button"
                    class="text-left font-bold text-[#141917] hover:text-[#0B3D2E] leading-snug line-clamp-2 cursor-pointer font-display"
                    @click.stop="openDetailModal(article)"
                  >
                    {{ article.title }}
                  </button>
                  <div class="flex items-center gap-2 text-[11px] text-[#737B76]">
                    <span>{{ article.sourcePortal }}</span>
                    <span v-if="article.subdistrict" class="px-1.5 py-0.2 rounded bg-[#E3F0EA] text-[#0B3D2E] text-[10px] font-bold">
                      Kec. {{ article.subdistrict }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3.5 align-top space-y-1">
                  <div class="font-semibold text-[#141917]">
                    {{ getKbliShortCodeName(article.kbliCategory) }}
                  </div>
                  <div>
                    <UBadge
                      :color="getKbliImpactBadge(article.kbliImpact).color"
                      variant="subtle"
                      size="xs"
                    >
                      {{ getKbliImpactBadge(article.kbliImpact).shortLabel }}
                    </UBadge>
                  </div>
                </td>
                <td class="px-4 py-3.5 align-top space-y-1">
                  <div class="font-semibold text-[#141917]">
                    {{ getExpenditureLabel(article.expenditureComponent, false) }}
                  </div>
                  <div>
                    <UBadge
                      :color="getExpenditureImpactBadge(article.expenditureImpact).color"
                      variant="subtle"
                      size="xs"
                    >
                      {{ getExpenditureImpactBadge(article.expenditureImpact).shortLabel }}
                    </UBadge>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination Toolbar -->
      <div
        v-if="articlesResponse && articlesResponse.pagination.totalPages > 1"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[#141917]/[0.08]"
      >
        <span class="text-xs text-[#737B76] font-mono tabular-nums">
          Halaman {{ articlesResponse.pagination.page }} dari {{ articlesResponse.pagination.totalPages }} ({{ formatNumberId(articlesResponse.pagination.total) }} fenomena)
        </span>
        <UPagination
          v-model:page="page"
          :total="articlesResponse.pagination.total"
          :items-per-page="articlesResponse.pagination.limit"
          size="sm"
        />
      </div>
    </div>

    <!-- Mobile Drawer for Deep Filters -->
    <USlideover
      v-model:open="mobileFiltersOpen"
      side="left"
      title="Filter Lanjutan"
      description="Saring rentang tanggal, sektor KBLI, dan pengeluaran PDRB"
      :ui="{ content: 'max-w-sm bg-[#F6F5F1]' }"
    >
      <template #body>
        <PublicFilterBar
          in-drawer
          :overview="overview ?? null"
          :source-type="selectedSourceType"
          :pdrb-groups="selectedPdrbGroups"
          :expenditures="selectedExpenditures"
          :impact-macro="selectedImpactMacro"
          :date-from="selectedDateFrom"
          :date-to="selectedDateTo"
          :active-filter-count="activeFilterCount"
          @update:source-type="(v) => { selectedSourceType = v; page = 1; }"
          @update:pdrb-groups="(v) => { selectedPdrbGroups = v; page = 1; }"
          @update:expenditures="(v) => { selectedExpenditures = v; page = 1; }"
          @update:impact-macro="(v) => { selectedImpactMacro = v; page = 1; }"
          @update:date-from="(v) => { selectedDateFrom = v; page = 1; }"
          @update:date-to="(v) => { selectedDateTo = v; page = 1; }"
          @reset="resetAllFilters"
        />
      </template>
    </USlideover>

    <!-- Reading Sheet Modal Mount -->
    <PublicArticleDetailModal
      v-model:open="detailModalOpen"
      :article="selectedArticle"
    />
  </div>
</template>
