<!-- app/pages/index.vue -->
<script setup lang="ts">
import {
  formatPeriodLabel,
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  type PdrbQuarter,
} from '#shared/utils/period';
import type { PublicArticlesResponse, PublicOverviewResponse } from '~/types/sipena';

const route = useRoute();
const router = useRouter();

const currentWitaPeriod = getCurrentQuarterYearWita();

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

const selectedYear = ref<number>(parseYearParam(route.query.year));
const selectedQuarter = ref<PdrbQuarter>(parseQuarterParam(route.query.quarter));
const selectedKbli = ref<string>(
  typeof route.query.kbli === 'string' && route.query.kbli ? route.query.kbli : 'ALL',
);
const selectedExpenditure = ref<string>(
  typeof route.query.expenditure === 'string' && route.query.expenditure
    ? route.query.expenditure
    : 'ALL',
);
const searchInput = ref<string>(typeof route.query.q === 'string' ? route.query.q : '');
const debouncedSearch = ref<string>(searchInput.value.trim());
const currentPage = ref<number>(parsePageParam(route.query.page));

const PAGE_LIMIT = 20;

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (nextVal: string) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = nextVal.trim();
    currentPage.value = 1;
    void syncUrlQuery();
  }, 350);
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});

async function syncUrlQuery() {
  const nextQuery: Record<string, string> = {
    year: String(selectedYear.value),
    quarter: String(selectedQuarter.value),
  };
  if (selectedKbli.value !== 'ALL') nextQuery.kbli = selectedKbli.value;
  if (selectedExpenditure.value !== 'ALL') nextQuery.expenditure = selectedExpenditure.value;
  if (debouncedSearch.value) nextQuery.q = debouncedSearch.value;
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
  if (selectedKbli.value !== 'ALL') qObj.kbli = selectedKbli.value;
  if (selectedExpenditure.value !== 'ALL') qObj.expenditure = selectedExpenditure.value;
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

const availableYears = computed(() => {
  const years = new Set<number>([currentWitaPeriod.year, selectedYear.value]);
  for (const period of overviewData.value?.availablePeriods ?? []) {
    years.add(period.year);
  }
  return Array.from(years).sort((a, b) => b - a);
});

const previousQuarterInfo = computed(() => {
  const prev = getPreviousQuarterYear(selectedQuarter.value, selectedYear.value);
  return {
    ...prev,
    label: formatPeriodLabel(prev.quarter, prev.year),
  };
});

const latestPopulatedPeriod = computed(() =>
  overviewData.value?.availablePeriods.find((p) => p.count > 0) ?? null,
);

const hasSecondaryFilter = computed(
  () =>
    selectedKbli.value !== 'ALL' ||
    selectedExpenditure.value !== 'ALL' ||
    debouncedSearch.value !== '',
);

function handleYearChange(nextYear: number) {
  selectedYear.value = nextYear;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleQuarterChange(nextQuarter: number) {
  selectedQuarter.value = nextQuarter as PdrbQuarter;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleKbliChange(nextKbli: string) {
  selectedKbli.value = nextKbli;
  currentPage.value = 1;
  void syncUrlQuery();
}

function handleExpenditureChange(nextExp: string) {
  selectedExpenditure.value = nextExp;
  currentPage.value = 1;
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
  selectedKbli.value = 'ALL';
  selectedExpenditure.value = 'ALL';
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

const rangeSummaryText = computed(() => {
  const pag = articlesData.value?.pagination;
  if (!pag || pag.total === 0) return '0 fenomena ditemukan';
  const start = (pag.page - 1) * pag.limit + 1;
  const end = Math.min(pag.page * pag.limit, pag.total);
  return `Menampilkan ${start}–${end} dari ${pag.total} fenomena terverifikasi`;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Kontekstual Periode -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
          <UIcon name="i-lucide-radar" class="w-4 h-4" />
          <span>Dashboard Fenomena Ekonomi Daerah</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
          Snapshot {{ formatPeriodLabel(selectedQuarter, selectedYear) }}
        </h1>
        <p class="text-sm text-slate-600">
          Arsip berita ekonomi Kabupaten Tana Tidung terverifikasi yang dipetakan ke Lapangan Usaha
          (KBLI A–U) dan Komponen PDRB Pengeluaran.
        </p>
      </div>
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

    <!-- 4 Kartu KPI -->
    <PublicKpiSnapshotGrid :overview="overviewData ?? null" :pending="overviewPending" />

    <!-- Grafik Sebaran Proporsi (KBLI & Pengeluaran) -->
    <PublicSectorDistributionCharts
      :overview="overviewData ?? null"
      :selected-kbli="selectedKbli"
      :selected-expenditure="selectedExpenditure"
      :pending="overviewPending"
      @update:kbli="handleKbliChange"
      @update:expenditure="handleExpenditureChange"
    />

    <!-- Sticky Filter Bar -->
    <PublicFilterBar
      :year="selectedYear"
      :quarter="selectedQuarter"
      :kbli="selectedKbli"
      :expenditure="selectedExpenditure"
      :search-query="searchInput"
      :available-years="availableYears"
      @update:year="handleYearChange"
      @update:quarter="handleQuarterChange"
      @update:kbli="handleKbliChange"
      @update:expenditure="handleExpenditureChange"
      @update:search-query="searchInput = $event"
      @reset="resetSecondaryFilters"
    />

    <!-- Feed Linimasa Berita Terverifikasi -->
    <section aria-label="Linimasa Fenomena Ekonomi Terverifikasi" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-bold text-slate-900">
          Linimasa Fenomena Ekonomi Terverifikasi
        </h2>
        <span class="text-xs font-medium text-slate-500 font-mono tabular-nums">
          {{ rangeSummaryText }}
        </span>
      </div>

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

      <div v-else-if="articlesPending && !articlesData" class="space-y-3">
        <UCard v-for="i in 3" :key="i">
          <div class="animate-pulse space-y-3 py-1">
            <div class="h-3 w-48 rounded bg-slate-200" />
            <div class="h-5 w-3/4 rounded bg-slate-200" />
            <div class="h-12 w-full rounded bg-slate-100" />
          </div>
        </UCard>
      </div>

      <UCard v-else-if="!articlesData?.items.length" class="text-center py-10">
        <div class="max-w-md mx-auto space-y-3">
          <UIcon name="i-lucide-search-x" class="w-10 h-10 text-slate-300 mx-auto" />
          <h3 class="text-sm font-semibold text-slate-800">
            Tidak ada berita yang cocok dengan filter aktif
          </h3>
          <p class="text-xs text-slate-500">
            Coba ubah triwulan/tahun atau bersihkan filter kategori KBLI, pengeluaran, dan kata kunci
            pencarian.
          </p>
          <div v-if="hasSecondaryFilter">
            <UButton size="sm" color="primary" variant="subtle" @click="resetSecondaryFilters">
              Reset Filter Sektor &amp; Pencarian
            </UButton>
          </div>
        </div>
      </UCard>

      <div v-else class="space-y-4">
        <PublicPhenomenonFeedCard
          v-for="item in articlesData.items"
          :key="item.id"
          :article="item"
        />

        <div
          v-if="articlesData.pagination.totalPages > 1"
          class="flex justify-center pt-4"
        >
          <UPagination
            :page="currentPage"
            :total="articlesData.pagination.total"
            :items-per-page="articlesData.pagination.limit"
            @update:page="handlePageChange"
          />
        </div>
      </div>
    </section>
  </div>
</template>
