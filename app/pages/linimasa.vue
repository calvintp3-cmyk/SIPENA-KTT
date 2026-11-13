<!-- app/pages/linimasa.vue -->
<script setup lang="ts">
import {
  ArticleSourceTypeEnum,
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
  type ExpenditureComponentEnum,
  type ExpenditureComponentMeta,
  type KbliCategoryEnum,
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
import { applyKbliSelection, applyPdrbGroupSelection } from '#shared/utils/public-helpers';
import type {
  PublicArticleItem,
  PublicArticlesResponse,
  PublicOverviewResponse,
  SelectOptionItem,
} from '~/types/sipena';

definePageMeta({
  layout: 'default',
});

useHead({
  title: 'Linimasa Fenomena Ekonomi — SIPENA KTT',
  meta: [
    {
      name: 'description',
      content:
        'Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan.',
    },
  ],
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
  EXPANSION: 'Meningkatkan NTB / Riil',
  CONTRACTION: 'Menurunkan NTB / Riil',
  PRICE_UP: 'Kenaikan Harga / Deflator',
  PRICE_DOWN: 'Penurunan Harga / Deflator',
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
const selectedPdrbGroups = ref<string[]>(parseListParam(route.query.pdrbGroup));
const selectedExpenditures = ref<string[]>(parseListParam(route.query.expenditure));
const selectedSourceType = ref<string>(strParam(route.query.sourceType, 'ALL'));
const selectedImpactMacro = ref<string>(strParam(route.query.impactMacro, 'ALL'));
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
    if (selectedImpactMacro.value !== 'ALL') nextQuery.impactMacro = selectedImpactMacro.value;
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
  if (selectedImpactMacro.value !== 'ALL') q.impactMacro = selectedImpactMacro.value;
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
    label: `Tahun ${y}`,
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
  return `Periode ${m.start} - ${m.end} ${selectedYear.value}`;
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

const selectedQuarterRange = computed(
  () => quarterButtons.find((q) => q.value === selectedQuarter.value)?.range ?? '',
);

const currentPeriodLabel = computed(() =>
  formatPeriodLabel(selectedQuarter.value, selectedYear.value),
);

const lastSyncText = computed(() => {
  if (!overview.value?.lastUpdatedAt) return 'Menunggu kurasi data';
  return formatDateTimeWita(overview.value.lastUpdatedAt);
});

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string; label: string; dotClass: string; clear: () => void }> = [];

  if (debouncedSearch.value) {
    chips.push({
      key: 'q',
      label: `Cari: "${debouncedSearch.value}"`,
      dotClass: 'bg-indigo-600',
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
          ? 'Sumber: Lokal'
          : 'Sumber: Nasional',
      dotClass: 'bg-emerald-600',
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
      label: `Sektor ${groupCode}: ${sector?.shortName ?? groupCode}`,
      dotClass: getKbliClusterTheme(groupCode).accentBarClass,
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
      dotClass: getExpenditureColorTheme(expCode).dotClass,
      clear: () => {
        selectedExpenditures.value = selectedExpenditures.value.filter((c: string) => c !== expCode);
        page.value = 1;
      },
    });
  }

  if (selectedImpactMacro.value !== 'ALL') {
    chips.push({
      key: 'impactMacro',
      label: `Dampak: ${IMPACT_MACRO_LABELS[selectedImpactMacro.value] ?? selectedImpactMacro.value}`,
      dotClass: 'bg-amber-500',
      clear: () => {
        selectedImpactMacro.value = 'ALL';
        page.value = 1;
      },
    });
  }

  if (selectedDateFrom.value || selectedDateTo.value) {
    chips.push({
      key: 'dateRange',
      label: `Rentang: ${customDateRangeLabel.value}`,
      dotClass: 'bg-indigo-600',
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
  selectedImpactMacro.value = 'ALL';
  selectedDateFrom.value = '';
  selectedDateTo.value = '';
  page.value = 1;
}

function handlePeriodChange(newYear: number, newQuarter: PdrbQuarter) {
  selectedYear.value = newYear;
  selectedQuarter.value = newQuarter;
  page.value = 1;
}

function handleDateFromUpdate(val: string) {
  selectedDateFrom.value = val;
  page.value = 1;
}

function handleDateToUpdate(val: string) {
  selectedDateTo.value = val;
  page.value = 1;
}

function handlePdrbGroupsUpdate(val: string[]) {
  selectedPdrbGroups.value = val;
  page.value = 1;
}

function handleExpendituresUpdate(val: string[]) {
  selectedExpenditures.value = val;
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

function handleSourceTypeUpdate(val: string) {
  selectedSourceType.value = val;
  page.value = 1;
}

function handleImpactMacroUpdate(val: string) {
  selectedImpactMacro.value = val;
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
  <div class="space-y-6">
    <!-- Top Editorial Command Header (Cobalt-Emerald Luminous Surface) -->
    <section
      aria-label="Kontrol Periode dan Ringkasan Linimasa"
      class="saas-card rounded-2xl p-5 sm:p-7 relative overflow-hidden"
    >
      <div class="flex flex-col gap-5">
        <!-- Title Row & View Switcher -->
        <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div class="space-y-2 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/80 text-xs font-semibold"
              >
                <UIcon name="i-solar-calendar-search-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
                <span>Linimasa Fenomena Ekonomi • {{ currentPeriodLabel }}</span>
              </span>

              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold tabular-nums"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>{{ formatNumberId(overview?.kpi.totalVerified ?? 0) }} Terverifikasi</span>
              </span>
            </div>

            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Portal Fenomena PDRB Kabupaten Tana Tidung
            </h1>

            <p class="text-sm text-slate-600 leading-relaxed">
              Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten
              Tana Tidung secara terkurasi dan transparan.
            </p>
          </div>

          <!-- View Switcher -->
          <div class="flex items-center gap-2 self-start shrink-0">
            <div
              role="group"
              aria-label="Mode Tampilan Linimasa"
              class="inline-flex p-1 rounded-xl bg-slate-100/95 border border-slate-200/90"
            >
              <button
                type="button"
                :aria-pressed="viewMode === 'stream'"
                class="min-h-9 px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                :class="
                  viewMode === 'stream'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-950 font-medium'
                "
                @click="() => { viewMode = 'stream'; }"
              >
                <UIcon name="i-solar-list-heart-bold-duotone" class="w-4 h-4" />
                <span>Linimasa Stream</span>
              </button>
              <button
                type="button"
                :aria-pressed="viewMode === 'table'"
                class="min-h-9 px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                :class="
                  viewMode === 'table'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-950 font-medium'
                "
                @click="() => { viewMode = 'table'; }"
              >
                <UIcon name="i-solar-widget-4-bold-duotone" class="w-4 h-4" />
                <span>Tabel Ringkas</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Period Control Bar: Unified Period Switcher Capsule -->
        <div
          class="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3"
        >
          <div class="flex flex-wrap items-center gap-3">
            <!-- Unified Period Switcher Capsule (Tahun & Triwulan Rapi Terpadu) -->
            <div
              class="inline-flex items-center p-1 rounded-xl bg-slate-100/95 border border-slate-200/90 shadow-2xs divide-x divide-slate-200/80"
            >
              <!-- Integrated Year Stepper & Dropdown using Nuxt UI USelect -->
              <div class="flex items-center gap-1 pr-2.5 pl-1">
                <button
                  type="button"
                  aria-label="Tahun Sebelumnya"
                  class="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                  @click="handlePeriodChange(selectedYear - 1, selectedQuarter)"
                >
                  <UIcon name="i-lucide-chevron-left" class="w-3.5 h-3.5" />
                </button>

                <div class="w-26">
                  <USelect
                    id="linimasa-year-select"
                    :model-value="selectedYear"
                    :items="yearSelectOptions"
                    value-key="value"
                    label-key="label"
                    leading-icon="i-solar-calendar-bold-duotone"
                    size="xs"
                    aria-label="Tahun PDRB"
                    class="w-full font-semibold"
                    @update:model-value="(val: unknown) => handlePeriodChange(Number(val), selectedQuarter)"
                  />
                </div>

                <button
                  type="button"
                  aria-label="Tahun Berikutnya"
                  class="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                  @click="handlePeriodChange(selectedYear + 1, selectedQuarter)"
                >
                  <UIcon name="i-lucide-chevron-right" class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Segmented Control Triwulan -->
              <div
                role="group"
                aria-label="Pilih Triwulan"
                class="inline-flex items-center gap-1 pl-2.5"
              >
                <button
                  v-for="qBtn in quarterButtons"
                  :key="qBtn.value"
                  type="button"
                  :aria-pressed="selectedQuarter === qBtn.value"
                  class="min-h-8 px-2.5 py-1 rounded-lg text-xs transition-colors tabular-nums cursor-pointer"
                  :class="
                    selectedQuarter === qBtn.value
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 font-medium'
                  "
                  :title="`${qBtn.label} (${qBtn.range})`"
                  @click="() => { handlePeriodChange(selectedYear, qBtn.value); }"
                >
                  {{ qBtn.label }}
                </button>
              </div>
            </div>

            <!-- Dynamic Period Disclosure Label (State Hierarchy: Date Range Override vs Standard Quarter) -->
            <div class="hidden sm:inline-flex items-center gap-2">
              <span
                v-if="!hasCustomDateRange"
                class="text-xs text-slate-700 font-semibold"
              >
                {{ periodDisplayLabel }}
              </span>

              <div
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/80 text-xs font-semibold text-indigo-900"
              >
                <UIcon name="i-solar-calendar-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
                <span>Rentang Khusus: {{ customDateRangeLabel }}</span>
                <button
                  type="button"
                  class="ml-1 text-indigo-500 hover:text-indigo-800 cursor-pointer"
                  title="Hapus rentang kustom & kembali ke Triwulan murni"
                  @click="() => { selectedDateFrom = ''; selectedDateTo = ''; page = 1; }"
                >
                  <UIcon name="i-lucide-x" class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Right Meta & Analytics Panel Toggle -->
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="text-xs text-slate-600 tabular-nums">
              Sinkronisasi Terakhir: <strong class="text-slate-800 font-semibold">{{ lastSyncText }}</strong>
            </span>

            <button
              type="button"
              :aria-expanded="showAnalyticsPanel"
              class="min-h-9 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer"
              :class="
                showAnalyticsPanel
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              "
              @click="() => { showAnalyticsPanel = !showAnalyticsPanel; }"
            >
              <UIcon name="i-solar-pie-chart-2-bold-duotone" class="w-4 h-4 text-indigo-600" />
              <span>{{ showAnalyticsPanel ? 'Tutup Statistik' : 'Lihat Statistik' }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile Search & Filter Trigger (< lg) — Prioritized above analytics -->
    <div class="lg:hidden flex items-center gap-2.5">
      <div class="relative flex-1">
        <UIcon
          name="i-solar-magnifer-line-duotone"
          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <label for="mobile-linimasa-search" class="sr-only">Cari fenomena ekonomi</label>
        <input
          id="mobile-linimasa-search"
          v-model="searchInput"
          type="search"
          placeholder="Cari komoditas, sektor, atau judul..."
          class="w-full h-11 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
        >
      </div>

      <button
        type="button"
        class="h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
        @click="() => { mobileFiltersOpen = true; }"
      >
        <UIcon name="i-solar-filter-bold-duotone" class="w-4 h-4 text-indigo-600" />
        <span>Filter</span>
        <span
          v-if="activeFilterCount > 0"
          class="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold tabular-nums"
        >
          {{ activeFilterCount }}
        </span>
      </button>
    </div>

    <!-- Collapsible Analytics Panel (KPI + Interactive ECharts) -->
    <div v-if="showAnalyticsPanel" class="space-y-4">
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

    <!-- Mobile Filter Slideover -->
    <USlideover
      v-model:open="mobileFiltersOpen"
      side="left"
      title="Filter Fenomena Ekonomi"
      description="Saring linimasa menurut sumber berita, 17 kategori KBLI, 6 komponen pengeluaran, dan dampak makro"
      :ui="{ content: 'max-w-sm' }"
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
          @update:source-type="handleSourceTypeUpdate"
          @update:pdrb-groups="handlePdrbGroupsUpdate"
          @update:expenditures="handleExpendituresUpdate"
          @update:impact-macro="handleImpactMacroUpdate"
          @update:date-from="handleDateFromUpdate"
          @update:date-to="handleDateToUpdate"
          @reset="resetAllFilters"
        />
      </template>
    </USlideover>

    <!-- Main Asymmetric Feed Layout (Bounded Split-Pane di Desktop lg:) -->
    <div class="flex flex-col lg:grid lg:grid-cols-[310px_minmax(0,1fr)] lg:items-stretch lg:h-[calc(100vh-108px)] lg:min-h-[640px] lg:max-h-[860px] gap-6">
      <!-- Desktop Bounded Filter Sidebar (Ketinggian sama persis dengan panel kanan) -->
      <div class="hidden lg:block h-full overflow-hidden">
        <PublicFilterBar
          :overview="overview ?? null"
          :source-type="selectedSourceType"
          :pdrb-groups="selectedPdrbGroups"
          :expenditures="selectedExpenditures"
          :impact-macro="selectedImpactMacro"
          :date-from="selectedDateFrom"
          :date-to="selectedDateTo"
          :active-filter-count="activeFilterCount"
          @update:source-type="handleSourceTypeUpdate"
          @update:pdrb-groups="handlePdrbGroupsUpdate"
          @update:expenditures="handleExpendituresUpdate"
          @update:impact-macro="handleImpactMacroUpdate"
          @update:date-from="handleDateFromUpdate"
          @update:date-to="handleDateToUpdate"
          @reset="resetAllFilters"
        />
      </div>

      <!-- Right Stream / Table Area (Frame terkunci rata dengan sidebar, body internal scrollable) -->
      <div class="flex-1 min-w-0 w-full h-full flex flex-col overflow-hidden saas-card rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <!-- Active Filter Chips Strip -->
        <div
          v-if="activeFilterChips.length > 0"
          class="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 flex flex-wrap items-center justify-between gap-2 shrink-0"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] font-bold text-slate-700">Filter Aktif:</span>
            <button
              v-for="chip in activeFilterChips"
              :key="chip.key"
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-900 transition-colors cursor-pointer"
              @click="() => { chip.clear(); }"
            >
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="chip.dotClass" />
              <span>{{ chip.label }}</span>
              <UIcon name="i-lucide-x" class="w-3 h-3 text-indigo-600" />
            </button>
          </div>

          <button
            type="button"
            class="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
            @click="resetAllFilters"
          >
            Reset Semua
          </button>
        </div>

        <!-- Scrollable Content Pane (Hanya isi berita/tabel yang bergulir di sini) -->
        <div class="flex-1 min-h-0 overflow-y-auto saas-scroll pr-1 sm:pr-2">
          <!-- Error State -->
          <UAlert
            v-if="articlesError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            title="Gagal memuat linimasa fenomena ekonomi"
            description="Terjadi kendala saat mengambil daftar fenomena dari server. Silakan muat ulang."
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

          <!-- Loading Skeleton -->
          <div v-else-if="articlesPending && !articlesResponse" class="space-y-4">
            <div v-for="idx in 4" :key="idx" class="rounded-xl border border-slate-100 p-5 space-y-3">
              <div class="h-3 w-36 rounded bg-slate-200" />
              <div class="h-5 w-4/5 rounded bg-slate-200" />
              <div class="h-14 w-full rounded bg-slate-100" />
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="!articlesResponse || articlesResponse.items.length === 0"
            class="p-8 sm:p-10 text-center space-y-4"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center mx-auto"
            >
              <UIcon name="i-solar-inbox-line-bold-duotone" class="w-6 h-6" />
            </div>

            <div class="space-y-1.5 max-w-md mx-auto">
              <h2 class="text-base font-extrabold text-slate-900">
                {{
                  activeFilterCount > 0
                    ? 'Tidak ada fenomena yang cocok dengan kombinasi filter'
                    : `Belum ada catatan terverifikasi pada ${currentPeriodLabel}`
                }}
              </h2>
              <p class="text-xs text-slate-600 leading-relaxed">
                {{
                  activeFilterCount > 0
                    ? 'Coba longgarkan sebagian kriteria sektor KBLI, kelompok permintaan, atau kata kunci pencarian.'
                    : 'Anda dapat berpindah ke triwulan sebelumnya atau periode terbaru yang sudah memiliki dokumentasi terverifikasi.'
                }}
              </p>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                v-if="activeFilterCount > 0"
                type="button"
                class="btn-primary-gradient h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                @click="resetAllFilters"
              >
                <UIcon name="i-lucide-rotate-ccw" class="w-3.5 h-3.5" />
                <span>Hapus Semua Filter</span>
              </button>

              <button
                type="button"
                class="h-9 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                @click="() => { handlePeriodChange(previousQuarterInfo.year, previousQuarterInfo.quarter); }"
              >
                <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5 text-slate-500" />
                <span>Ke {{ previousQuarterInfo.label }}</span>
              </button>

              <button
                v-if="latestPopulatedPeriod"
                type="button"
                class="btn-primary-gradient h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                @click="() => { if (latestPopulatedPeriod) handlePeriodChange(latestPopulatedPeriod.year, latestPopulatedPeriod.quarter); }"
              >
                <UIcon name="i-solar-calendar-mark-bold-duotone" class="w-4 h-4" />
                <span>Buka {{ latestPopulatedPeriod.label }} ({{ latestPopulatedPeriod.count }})</span>
              </button>
            </div>
          </div>

          <!-- Mode 1: Linimasa Stream -->
          <div v-else-if="viewMode === 'stream'" class="timeline-spine space-y-6 pt-1">
            <section
              v-for="group in timelineDateGroups"
              :key="group.dateKey"
              class="relative pl-12 space-y-3"
            >
              <!-- Date Marker Node on Spine -->
              <div
                class="absolute left-0 top-0.5 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm flex flex-col items-center justify-center leading-none z-10"
              >
                <span class="text-sm font-extrabold tabular-nums">{{ group.dayLabel }}</span>
              </div>

              <div class="flex items-center justify-between gap-2 pt-1">
                <h2 class="text-xs font-bold tracking-wide text-slate-600">
                  {{ group.dayLabel }} {{ group.monthYearLabel }}
                </h2>
                <span class="text-xs font-semibold text-indigo-700 tabular-nums">
                  {{ group.items.length }} Fenomena
                </span>
              </div>

              <div class="space-y-3.5">
                <PublicPhenomenonFeedCard
                  v-for="article in group.items"
                  :key="article.id"
                  :article="article"
                  @select="openDetailModal"
                />
              </div>
            </section>
          </div>

          <!-- Mode 2: Tabel Ringkas -->
          <div v-else class="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <div class="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-900">
                Daftar Ringkas Fenomena ({{ articlesResponse.pagination.total }})
              </span>
              <span class="text-[11px] text-slate-600">Klik baris untuk melihat rangkuman lengkap</span>
            </div>

            <div
              class="saas-table-scroller"
              tabindex="0"
              role="region"
              aria-label="Daftar Ringkas Fenomena Ekonomi Terverifikasi"
            >
              <table class="min-w-full divide-y divide-slate-200 text-left text-xs">
                <caption class="sr-only">
                  Daftar ringkas fenomena ekonomi terverifikasi Kabupaten Tana Tidung
                </caption>
                <thead class="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-10">
                  <tr>
                    <th scope="col" class="px-3.5 py-2.5 whitespace-nowrap">Tanggal</th>
                    <th scope="col" class="px-3.5 py-2.5 min-w-[260px]">Judul Fenomena &amp; Sumber</th>
                    <th scope="col" class="px-3.5 py-2.5 min-w-[170px]">Lapangan Usaha</th>
                    <th scope="col" class="px-3.5 py-2.5 min-w-[170px]">Kelompok Permintaan</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr
                    v-for="article in articlesResponse.items"
                    :key="article.id"
                    class="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    @click="openDetailModal(article)"
                  >
                    <td class="px-3.5 py-3 align-top whitespace-nowrap tabular-nums text-slate-700 font-medium">
                      {{ formatDateId(article.publishedAt) }}
                      <div class="text-[11px] text-slate-600">
                        TW {{ toRomanQuarter(article.quarter) }} {{ article.year }}
                      </div>
                    </td>
                    <td class="px-3.5 py-3 align-top space-y-1">
                      <button
                        type="button"
                        class="text-left font-bold text-slate-900 hover:text-indigo-700 leading-snug line-clamp-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                        @click.stop="openDetailModal(article)"
                      >
                        {{ article.title }}
                      </button>
                      <div class="text-[11px] text-slate-600 font-medium">
                        {{ article.sourcePortal }}
                      </div>
                    </td>
                    <td class="px-3.5 py-3 align-top space-y-1">
                      <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span
                          class="w-2 h-2 rounded-full shrink-0"
                          :class="getKbliClusterTheme(article.kbliCategory).accentBarClass"
                        />
                        <span>{{ getKbliShortCodeName(article.kbliCategory) }}</span>
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
                    <td class="px-3.5 py-3 align-top space-y-1">
                      <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span
                          class="w-2 h-2 rounded-full shrink-0"
                          :class="getExpenditureColorTheme(article.expenditureComponent).dotClass"
                        />
                        <span>{{ getExpenditureLabel(article.expenditureComponent, false) }}</span>
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
        </div>

        <!-- Locked Bottom Pagination Toolbar (Rata sejajar di bagian bawah panel) -->
        <div
          v-if="articlesResponse && articlesResponse.pagination.totalPages > 1"
          class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0 mt-2"
        >
          <span class="text-xs text-slate-600 tabular-nums font-medium">
            Halaman {{ articlesResponse.pagination.page }} dari {{ articlesResponse.pagination.totalPages }}
            ({{ formatNumberId(articlesResponse.pagination.total) }} fenomena)
          </span>
          <UPagination
            v-model:page="page"
            :total="articlesResponse.pagination.total"
            :items-per-page="articlesResponse.pagination.limit"
            size="sm"
          />
        </div>
      </div>
    </div>

    <!-- Metodologi & Kurasi Berita Fenomena Ekonomi -->
    <div
      class="rounded-2xl bg-gradient-to-br from-indigo-50/85 via-white to-emerald-50/75 border border-indigo-200/80 p-4 sm:p-5 flex items-start gap-3.5"
    >
      <div
        class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm"
      >
        <UIcon name="i-solar-verified-check-bold-duotone" class="w-5 h-5" />
      </div>
      <div class="text-xs text-slate-600 space-y-1 leading-relaxed">
        <div class="font-bold text-slate-900">
          Standar Kurasi Berita Fenomena Ekonomi Kabupaten Tana Tidung
        </div>
        <p>
          Seluruh catatan pada portal ini merupakan bukti fenomena ekonomi terkurasi yang
          diselaraskan terhadap 17 Sektor Usaha (KBLI) dan 6 Komponen Pengeluaran
          sebagai dokumentasi faktual pemantauan dinamika ekonomi daerah dan dampak kebijakan nasional ke Tana Tidung.
        </p>
      </div>
    </div>

    <!-- Detail Modal -->
    <PublicArticleDetailModal v-model:open="detailModalOpen" :article="selectedArticle" />
  </div>
</template>