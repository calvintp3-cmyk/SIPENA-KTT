<!-- app/pages/admin/index.vue -->
<script setup lang="ts">
import type { KbliCategoryEnum } from '#shared/enums/pdrb';
import { PDRB_6_EXPENDITURE_LIST } from '#shared/enums/pdrb';
import type { PdrbQuarter } from '#shared/utils/period';
import type { AdminDashboardResponse, DashboardGapTileItem } from '~/types/sipena';
import { SIPENA_CHART_TOKENS, SIPENA_CHART_TOOLTIP_STYLE } from '~/utils/chart-theme';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const {
  selectedYear,
  selectedQuarter,
  periodLabel,
  shortPeriodLabel,
  registerAvailableYears,
} = useAdminPeriod();
const { setQueueCounts } = useAdminSession();
const {
  getKbliImpactBadge,
  getKbliClusterTheme,
  getExpenditureColorTheme,
  formatNumberId,
} = usePdrbLabels();
const { isExporting, downloadExport } = useExcelExport();

const dashboardQuery = computed(() => ({
  year: selectedYear.value,
  quarter: selectedQuarter.value,
}));

const {
  data: dashData,
  pending,
  error,
  refresh,
} = await useFetch<AdminDashboardResponse>('/api/admin/analytics/dashboard', {
  query: dashboardQuery,
  watch: [dashboardQuery],
  credentials: 'include',
});

watchEffect(() => {
  if (dashData.value) {
    registerAvailableYears(dashData.value.availableYears);
    setQueueCounts(dashData.value.kpi.pendingQueueCount, dashData.value.kpi.llmFailedCount);
  }
});

// Filter tabs for the 17-sector Gap Detector grid
const tileFilter = ref<'all' | 'gap' | 'thin' | 'covered'>('all');

const tileCounts = computed(() => {
  const tiles = dashData.value?.gapTiles ?? [];
  return {
    all: tiles.length,
    gap: tiles.filter((t) => t.isGap).length,
    thin: tiles.filter((t) => t.isThin).length,
    covered: tiles.filter((t) => !t.isGap && !t.isThin).length,
  };
});

const filteredGapTiles = computed<DashboardGapTileItem[]>(() => {
  const tiles = dashData.value?.gapTiles ?? [];
  switch (tileFilter.value) {
    case 'gap':
      return tiles.filter((t) => t.isGap);
    case 'thin':
      return tiles.filter((t) => t.isThin);
    case 'covered':
      return tiles.filter((t) => !t.isGap && !t.isThin);
    default:
      return tiles;
  }
});

// Pre-filled Manual Modal for Gap Fill
const manualModalOpen = ref(false);
const modalDefaultKbli = ref<KbliCategoryEnum | null>(null);
const modalDefaultYear = ref<number | null>(null);
const modalDefaultQuarter = ref<PdrbQuarter | null>(null);

function openManualForSector(kbliCode: KbliCategoryEnum | null = null) {
  modalDefaultKbli.value = kbliCode;
  modalDefaultYear.value = selectedYear.value;
  modalDefaultQuarter.value = selectedQuarter.value;
  manualModalOpen.value = true;
}

function handleManualCreated() {
  void refresh();
}

function handleExportXlsx() {
  void downloadExport({
    format: 'xlsx',
    status: 'VERIFIED',
    isEconomic: 'true',
    year: selectedYear.value,
    quarter: selectedQuarter.value,
  });
}

function heatmapCellClass(val: number): string {
  if (val <= 0) return 'bg-slate-50/80 text-slate-300';
  if (val <= 2) return 'bg-blue-50 text-blue-800 border border-blue-200/70 hover:bg-blue-100 font-semibold';
  if (val <= 5) return 'bg-indigo-100 text-indigo-900 border border-indigo-200 hover:bg-indigo-200 font-bold';
  return 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-2xs hover:brightness-110';
}

const coverageChartOption = computed<ECOption | null>(() => {
  if (!dashData.value) return null;
  const { covered, thin, gap } = tileCounts.value;
  if (covered + thin + gap === 0) return null;

  return {
    tooltip: {
      trigger: 'item',
      ...SIPENA_CHART_TOOLTIP_STYLE,
      formatter: (raw: unknown) => {
        const p = raw as { name?: string; value?: number; percent?: number };
        return `<strong>${p.name ?? ''}</strong><br/>${p.value ?? 0} sektor (${p.percent ?? 0}%)`;
      },
    },
    title: {
      text: `${dashData.value.kpi.coveredSectors}/${dashData.value.kpi.totalSectors}`,
      subtext: 'Sektor Aktif',
      left: 'center',
      top: '36%',
      textStyle: {
        fontSize: 20,
        fontWeight: 800,
        color: SIPENA_CHART_TOKENS.inkObsidian,
        fontFamily: 'Inter, sans-serif',
      },
      subtextStyle: {
        fontSize: 11,
        color: SIPENA_CHART_TOKENS.inkMuted,
        fontFamily: 'Inter, sans-serif',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['54%', '82%'],
        center: ['50%', '50%'],
        itemStyle: {
          borderRadius: 6,
          borderColor: SIPENA_CHART_TOKENS.surfaceWhite,
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        data: [
          {
            name: 'Tercukupi (>2 bukti)',
            value: covered,
            filterKey: 'covered',
            itemStyle: {
              color: SIPENA_CHART_TOKENS.emerald,
              opacity: tileFilter.value === 'all' || tileFilter.value === 'covered' ? 1 : 0.35,
            },
          },
          {
            name: 'Tipis (1–2 bukti)',
            value: thin,
            filterKey: 'thin',
            itemStyle: {
              color: SIPENA_CHART_TOKENS.amber,
              opacity: tileFilter.value === 'all' || tileFilter.value === 'thin' ? 1 : 0.35,
            },
          },
          {
            name: 'Data Gap (0 bukti)',
            value: gap,
            filterKey: 'gap',
            itemStyle: {
              color: SIPENA_CHART_TOKENS.rose,
              opacity: tileFilter.value === 'all' || tileFilter.value === 'gap' ? 1 : 0.35,
            },
          },
        ],
      },
    ],
  };
});

function handleCoverageChartClick(params: unknown) {
  const key = (params as { data?: { filterKey?: 'gap' | 'thin' | 'covered' } })?.data?.filterKey;
  if (!key) return;
  tileFilter.value = tileFilter.value === key ? 'all' : key;
}

const shortExpHeaders: Record<string, string> = {
  PK_RT: 'PK-RT',
  PK_LNPRT: 'LNPRT',
  PK_P: 'PK-P',
  PMTB: 'PMTB',
  INVENTORY_CHANGE: 'Inventori',
  NET_EXPORT: 'Ekspor Neto',
};
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
        >
          <UIcon name="i-solar-radar-2-bold-duotone" class="w-3.5 h-3.5" />
          <span>Analitik &amp; Kelengkapan Bukti Sektoral</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 text-balance mt-2">
          Dashboard &amp; Gap Sektoral — {{ periodLabel }}
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5 text-pretty">
          Deteksi 17 kategori Lapangan Usaha yang belum memiliki bukti berita terverifikasi dan
          peta silang PDRB dua sisi.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          :disabled="isExporting"
          class="min-h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          @click="() => { handleExportXlsx(); }"
        >
          <UIcon name="i-solar-download-bold-duotone" class="w-4 h-4 text-emerald-700" />
          <span>Export Excel ({{ shortPeriodLabel }})</span>
        </button>

        <button
          type="button"
          class="btn-primary-gradient min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          @click="() => { openManualForSector(null); }"
        >
          <UIcon name="i-solar-add-circle-bold-duotone" class="w-4 h-4 text-emerald-200" />
          <span>Input Manual Fenomena</span>
        </button>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat analitik dashboard"
      description="Pastikan koneksi database aktif lalu muat ulang."
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- 4-Card KPI Bento Grid -->
    <div v-if="pending && !dashData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="h-3 w-28 rounded bg-slate-200" />
        <div class="h-8 w-20 rounded bg-slate-200" />
        <div class="h-3 w-36 rounded bg-slate-100" />
      </div>
    </div>

    <div v-else-if="dashData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <!-- KPI 1 -->
      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Bukti Terverifikasi
          </span>
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-check-circle-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {{ formatNumberId(dashData.kpi.totalVerifiedPeriod) }}
        </div>
        <div class="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
          <span
            v-if="dashData.kpi.deltaPercent !== null"
            class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border"
            :class="
              dashData.kpi.deltaPercent > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : dashData.kpi.deltaPercent < 0
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
            "
          >
            {{ dashData.kpi.deltaPercent > 0 ? '+' : '' }}{{ dashData.kpi.deltaPercent }}%
          </span>
          <span class="tabular-nums">vs {{ dashData.period.previousLabel }} ({{ dashData.kpi.previousTotalVerified }})</span>
        </div>
      </div>

      <!-- KPI 2 -->
      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Cakupan 17 Sektor PDRB
          </span>
          <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-layers-minimalistic-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {{ dashData.kpi.coveredSectors }}
          <span class="text-base font-semibold text-slate-500">/ {{ dashData.kpi.totalSectors }}</span>
        </div>
        <div class="text-xs flex items-center gap-1.5">
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums"
            :class="
              dashData.kpi.gapSectorsCount > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            "
          >
            {{
              dashData.kpi.gapSectorsCount > 0
                ? `${dashData.kpi.gapSectorsCount} Sektor Data Gap`
                : 'Semua Sektor Tercakup'
            }}
          </span>
        </div>
      </div>

      <!-- KPI 3 -->
      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Antrean Kurasi Pending
          </span>
          <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-inbox-in-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {{ formatNumberId(dashData.kpi.pendingQueueCount) }}
        </div>
        <div class="flex items-center justify-between gap-2 text-xs">
          <span
            v-if="dashData.kpi.llmFailedCount > 0"
            class="text-xs text-rose-700 font-semibold tabular-nums"
          >
            {{ dashData.kpi.llmFailedCount }} AI Gagal
          </span>
          <span v-else class="text-slate-600">Pipeline AI Normal</span>
          <NuxtLink to="/admin/review" class="text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
            Kurasi →
          </NuxtLink>
        </div>
      </div>

      <!-- KPI 4 -->
      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Sinyal Ekspansi Riil
          </span>
          <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-graph-new-up-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-emerald-700 tabular-nums">
          {{ dashData.kpi.expansionPercent }}%
        </div>
        <div class="text-xs text-slate-600 flex items-center justify-between gap-2">
          <span>Proporsi Naik NTB</span>
          <NuxtLink to="/admin/synthesis" class="text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
            Buka Sintesis →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- SECTION A: 17-SECTOR GAP DETECTOR + ECHARTS OVERVIEW -->
    <section v-if="dashData" aria-label="Detector Data Gap 17 Sektor KBLI" class="space-y-4">
      <div class="saas-card rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div class="lg:col-span-4">
          <SharedAppChart
            :option="coverageChartOption"
            height-class="h-44"
            :loading="pending && !dashData"
            :empty="tileCounts.all === 0"
            empty-title="Belum ada ringkasan cakupan"
            @chart-click="handleCoverageChartClick"
          />
        </div>

        <div class="lg:col-span-8 space-y-3.5">
          <div>
            <h2 class="text-base font-extrabold text-slate-900 text-balance">
              Radar Kelengkapan 17 Lapangan Usaha PDRB
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed text-pretty">
              Klik segmen donat atau pilih status di bawah untuk menyaring sektor yang berstatus
              <strong class="text-rose-700">Data Gap</strong> atau <strong class="text-amber-700">Tipis</strong> pada
              {{ shortPeriodLabel }}.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter status kelengkapan 17 sektor"
            class="inline-flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200/90 gap-1"
          >
            <button
              type="button"
              :aria-pressed="tileFilter === 'all'"
              class="min-h-8 px-3 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
              :class="
                tileFilter === 'all'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { tileFilter = 'all'; }"
            >
              Semua ({{ tileCounts.all }})
            </button>
            <button
              type="button"
              :aria-pressed="tileFilter === 'gap'"
              class="min-h-8 px-3 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
              :class="
                tileFilter === 'gap'
                  ? 'bg-white text-rose-700 font-bold shadow-2xs border border-rose-200'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { tileFilter = 'gap'; }"
            >
              Data Gap ({{ tileCounts.gap }})
            </button>
            <button
              type="button"
              :aria-pressed="tileFilter === 'thin'"
              class="min-h-8 px-3 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
              :class="
                tileFilter === 'thin'
                  ? 'bg-white text-amber-800 font-bold shadow-2xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { tileFilter = 'thin'; }"
            >
              Tipis ≤2 ({{ tileCounts.thin }})
            </button>
            <button
              type="button"
              :aria-pressed="tileFilter === 'covered'"
              class="min-h-8 px-3 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
              :class="
                tileFilter === 'covered'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { tileFilter = 'covered'; }"
            >
              Tercukupi ({{ tileCounts.covered }})
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        <div
          v-for="tile in filteredGapTiles"
          :key="tile.groupCode"
          class="rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors relative overflow-hidden"
          :class="
            tile.isGap
              ? 'bg-rose-50/35 border border-dashed border-rose-300/90 shadow-2xs'
              : 'saas-card saas-card-interactive'
          "
        >
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                :class="
                  tile.isGap
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : getKbliClusterTheme(tile.groupCode).pillClass
                "
              >
                KBLI {{ tile.groupCode }}
              </span>

              <span
                v-if="tile.isGap"
                class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold"
              >
                Data Gap
              </span>
              <span
                v-else-if="tile.isThin"
                class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold tabular-nums"
              >
                Tipis • {{ tile.count }}
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold tabular-nums"
              >
                {{ tile.count }} Bukti ({{ tile.sharePercent }}%)
              </span>
            </div>

            <h3 class="text-sm font-bold text-slate-900 leading-snug">
              {{ tile.shortName }}
            </h3>

            <p v-if="tile.isGap" class="text-xs text-slate-600 leading-relaxed text-pretty">
              Belum ada berita atau catatan lapangan pada sektor ini di {{ shortPeriodLabel }}.
            </p>
            <div v-else class="space-y-1.5">
              <p
                v-if="tile.latestHeadline"
                class="text-xs text-slate-600 leading-relaxed line-clamp-2"
                :title="tile.latestHeadline"
              >
                {{ tile.latestHeadline }}
              </p>
              <div v-if="tile.dominantImpact" class="pt-0.5">
                <UBadge
                  :color="getKbliImpactBadge(tile.dominantImpact).color"
                  variant="subtle"
                  size="xs"
                  :icon="getKbliImpactBadge(tile.dominantImpact).icon"
                >
                  {{ getKbliImpactBadge(tile.dominantImpact).shortLabel }}
                </UBadge>
              </div>
            </div>
          </div>

          <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              class="min-h-8 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
              @click="() => { openManualForSector(tile.primaryKbliCode); }"
            >
              <UIcon name="i-solar-add-circle-bold-duotone" class="w-4 h-4" />
              <span>Input Manual</span>
            </button>

            <NuxtLink
              :to="`/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&pdrbGroup=${encodeURIComponent(tile.groupCode)}&status=VERIFIED`"
              class="min-h-8 text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>{{ tile.isGap ? 'Cek Arsip' : 'Lihat Arsip' }}</span>
              <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION B: 17 x 6 CROSS-AXIS HEATMAP MATRIX -->
    <section v-if="dashData" aria-label="Heatmap Matriks Silang KBLI dan Pengeluaran" class="space-y-3">
      <div>
        <h2 class="text-base font-extrabold text-slate-900 text-balance">
          Matriks Silang 17 Sektor KBLI × 6 Komponen Pengeluaran
        </h2>
        <p class="text-xs text-slate-600">
          Klik sel matriks bernilai positif untuk membuka daftar bukti fenomena di Bank Data.
        </p>
      </div>

      <div class="saas-card rounded-2xl overflow-hidden">
        <div
          tabindex="0"
          role="region"
          aria-label="Matriks Heatmap 17 Sektor KBLI kali 6 Komponen Pengeluaran PDRB"
          class="saas-table-scroller"
        >
          <table class="w-full text-left border-collapse min-w-[780px]">
            <caption class="sr-only">
              Distribusi silang artikel terverifikasi menurut 17 sektor KBLI dan 6 komponen
              pengeluaran PDRB pada {{ periodLabel }}
            </caption>
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th scope="col" class="px-4 py-3.5 min-w-[230px]">
                  Lapangan Usaha (17 Sektor KBLI)
                </th>
                <th
                  v-for="comp in PDRB_6_EXPENDITURE_LIST"
                  :key="comp.code"
                  scope="col"
                  class="px-3 py-3.5 text-center whitespace-nowrap"
                  :title="comp.official"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full shrink-0" :class="getExpenditureColorTheme(comp.code).dotClass" />
                    <span>{{ shortExpHeaders[comp.code] || comp.short }}</span>
                  </span>
                </th>
                <th scope="col" class="px-4 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 text-xs">
              <tr
                v-for="row in dashData.heatmapMatrix"
                :key="row.groupCode"
                class="hover:bg-indigo-50/30 transition-colors"
              >
                <th scope="row" class="px-4 py-2.5 font-medium text-slate-900 text-left bg-white sm:sticky sm:left-0">
                  <span
                    class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mr-2"
                    :class="getKbliClusterTheme(row.groupCode).pillClass"
                  >
                    {{ row.groupCode }}
                  </span>
                  <span>{{ row.shortName }}</span>
                </th>

                <td
                  v-for="comp in PDRB_6_EXPENDITURE_LIST"
                  :key="comp.code"
                  class="px-2 py-1.5 text-center"
                >
                  <NuxtLink
                    v-if="(row.cells[comp.code] ?? 0) > 0"
                    :to="`/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&pdrbGroup=${encodeURIComponent(row.groupCode)}&expenditure=${comp.code}&status=VERIFIED`"
                    class="inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs tabular-nums transition-colors"
                    :class="heatmapCellClass(row.cells[comp.code] ?? 0)"
                  >
                    {{ row.cells[comp.code] }}
                  </NuxtLink>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs text-slate-500"
                  >
                    –
                  </span>
                </td>

                <td class="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                  {{ row.totalCount }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Pre-filled Manual Article Modal -->
    <AdminManualArticleModal
      v-model:open="manualModalOpen"
      :default-kbli="modalDefaultKbli"
      :default-year="modalDefaultYear"
      :default-quarter="modalDefaultQuarter"
      @created="handleManualCreated"
    />
  </div>
</template>
