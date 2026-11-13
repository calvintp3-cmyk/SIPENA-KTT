<!-- app/pages/admin/trends.vue -->
<script setup lang="ts">
import type { ExpenditureImpactEnum, KbliImpactEnum } from '#shared/enums/pdrb';
import type { AdminTrendsResponse, TrendPeriodPoint } from '~/types/sipena';
import { SIPENA_CHART_TOKENS, SIPENA_CHART_TOOLTIP_STYLE } from '~/utils/chart-theme';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const {
  selectedYear,
  selectedQuarter,
  shortPeriodLabel,
  registerAvailableYears,
  setPeriod,
} = useAdminPeriod();
const {
  getKbliImpactBadge,
  getExpenditureImpactBadge,
  getKbliClusterTheme,
  getExpenditureColorTheme,
  formatNumberId,
} = usePdrbLabels();
const { isExporting, downloadExport } = useExcelExport();

const mode = ref<'qoq' | 'yoy'>('qoq');
const dimension = ref<'kbli' | 'expenditure'>('kbli');
const tableFilter = ref<'all' | 'up' | 'down' | 'gap'>('all');
const sortKey = ref<'delta' | 'current' | 'code'>('delta');
const hoveredQuarter = ref<TrendPeriodPoint | null>(null);

const sortOptions = [
  { label: 'Perubahan Terbesar', value: 'delta' },
  { label: 'Volume Periode Aktif', value: 'current' },
  { label: 'Kode Urut Resmi', value: 'code' },
];

const trendsQuery = computed(() => ({
  year: selectedYear.value,
  quarter: selectedQuarter.value,
  mode: mode.value,
  dimension: dimension.value,
}));

const {
  data: trendData,
  pending,
  error,
  refresh,
} = await useFetch<AdminTrendsResponse>('/api/admin/analytics/trends', {
  query: trendsQuery,
  watch: [trendsQuery],
  credentials: 'include',
});

watchEffect(() => {
  if (trendData.value) {
    registerAvailableYears(trendData.value.availableYears);
    hoveredQuarter.value =
      trendData.value.history8Quarters.find((q) => q.isTarget) ??
      trendData.value.history8Quarters.at(-1) ??
      null;
  }
});

const historyChartOption = computed<ECOption | null>(() => {
  const list = trendData.value?.history8Quarters ?? [];
  if (list.length === 0) return null;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...SIPENA_CHART_TOOLTIP_STYLE,
      formatter: (raw: unknown) => {
        const items = Array.isArray(raw) ? raw : [raw];
        const first = items[0] as { dataIndex?: number } | undefined;
        const pt = typeof first?.dataIndex === 'number' ? list[first.dataIndex] : undefined;
        if (!pt) return '';
        return [
          `<strong>${pt.label}${pt.isTarget ? ' (Aktif)' : ''}</strong>`,
          `Total Terverifikasi: <strong>${pt.total}</strong>`,
          `Naik NTB: ${pt.increaseNtb} • Tekanan Harga: ${pt.pricePressure} • Turun NTB: ${pt.decreaseNtb}`,
        ].join('<br/>');
      },
    },
    grid: {
      left: 12,
      right: 16,
      top: 22,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: list.map((q) => q.shortLabel),
      axisLine: { lineStyle: { color: SIPENA_CHART_TOKENS.borderHairline } },
      axisTick: { show: false },
      axisLabel: {
        color: SIPENA_CHART_TOKENS.inkSecondary,
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: 600,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: SIPENA_CHART_TOKENS.surfaceMuted } },
      axisLabel: {
        color: SIPENA_CHART_TOKENS.inkMuted,
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Aktivitas Naik',
        type: 'bar',
        stack: 'sinyal',
        barMaxWidth: 32,
        itemStyle: { color: SIPENA_CHART_TOKENS.emerald },
        data: list.map((q) => ({
          value: q.increaseNtb,
          itemStyle: { opacity: q.isTarget ? 1 : 0.78 },
        })),
      },
      {
        name: 'Tekanan Harga',
        type: 'bar',
        stack: 'sinyal',
        barMaxWidth: 32,
        itemStyle: { color: SIPENA_CHART_TOKENS.amber },
        data: list.map((q) => ({
          value: q.pricePressure,
          itemStyle: { opacity: q.isTarget ? 1 : 0.78 },
        })),
      },
      {
        name: 'Aktivitas Turun',
        type: 'bar',
        stack: 'sinyal',
        barMaxWidth: 32,
        itemStyle: { color: SIPENA_CHART_TOKENS.rose, borderRadius: [6, 6, 0, 0] },
        data: list.map((q) => ({
          value: q.decreaseNtb,
          itemStyle: { opacity: q.isTarget ? 1 : 0.78 },
        })),
      },
      {
        name: 'Total Artikel',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: SIPENA_CHART_TOKENS.indigo, width: 2.5 },
        itemStyle: {
          color: SIPENA_CHART_TOKENS.indigo,
          borderColor: SIPENA_CHART_TOKENS.surfaceWhite,
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79, 70, 229, 0.16)' },
              { offset: 1, color: 'rgba(79, 70, 229, 0.0)' },
            ],
          },
        },
        data: list.map((q) => q.total),
      },
    ],
  };
});

function handleQuarterChartClick(params: unknown) {
  const idx = (params as { dataIndex?: number })?.dataIndex;
  if (typeof idx !== 'number') return;
  const pt = trendData.value?.history8Quarters[idx];
  if (pt) {
    hoveredQuarter.value = pt;
    setPeriod(pt.year, pt.quarter);
  }
}

const filteredSortedRows = computed(() => {
  const baseRows = trendData.value?.rows ?? [];
  const filtered = baseRows.filter((r) => {
    if (tableFilter.value === 'up') return r.deltaCount > 0;
    if (tableFilter.value === 'down') return r.deltaCount < 0;
    if (tableFilter.value === 'gap') return r.isGap;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortKey.value === 'current') {
      return b.currentCount - a.currentCount || a.code.localeCompare(b.code);
    }
    if (sortKey.value === 'code') {
      return a.code.localeCompare(b.code);
    }
    return Math.abs(b.deltaCount) - Math.abs(a.deltaCount) || b.currentCount - a.currentCount;
  });
});

function renderImpactBadge(impact: string | null) {
  if (!impact) return null;
  if (dimension.value === 'kbli') {
    return getKbliImpactBadge(impact as KbliImpactEnum);
  }
  return getExpenditureImpactBadge(impact as ExpenditureImpactEnum);
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
</script>

<template>
  <div class="space-y-6">
    <!-- Clean Two-Deck Header -->
    <div class="space-y-4">
      <!-- Deck 1: Title & Primary Export -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
          >
            <UIcon name="i-solar-graph-new-up-bold-duotone" class="w-3.5 h-3.5" />
            <span>Komparasi Dinamika Sinyal Antar Periode</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 text-balance mt-2">
            Tren &amp; Komparasi Fenomena PDRB
          </h1>
          <p v-if="trendData" class="text-xs sm:text-sm text-slate-600 mt-0.5 text-pretty">
            Membandingkan
            <strong class="text-slate-900">{{ trendData.period.label }}</strong>
            terhadap
            <strong class="text-slate-900">{{ trendData.baseline.label }}</strong>
            ({{ mode === 'qoq' ? 'Quarter-to-Quarter' : 'Year-on-Year' }}).
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            :disabled="isExporting"
            class="min-h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            @click="() => { handleExportXlsx(); }"
          >
            <UIcon name="i-solar-download-bold-duotone" class="w-4 h-4 text-emerald-700" />
            <span>Export {{ shortPeriodLabel }} (.XLSX)</span>
          </button>
        </div>
      </div>

      <!-- Deck 2: Comparison Mode & Dimension Segmented Controls -->
      <div class="saas-card rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-600">
              Mode:
            </span>
            <div
              role="group"
              aria-label="Mode komparasi periode"
              class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/90"
            >
              <button
                type="button"
                :aria-pressed="mode === 'qoq'"
                class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                :class="
                  mode === 'qoq'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-950 font-medium'
                "
                @click="() => { mode = 'qoq'; }"
              >
                Antar-Triwulan (vs Triwulan Lalu)
              </button>
              <button
                type="button"
                :aria-pressed="mode === 'yoy'"
                class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                :class="
                  mode === 'yoy'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-950 font-medium'
                "
                @click="() => { mode = 'yoy'; }"
              >
                Antar-Tahun (vs Tahun Lalu)
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-600">
              Dimensi:
            </span>
            <div
              role="group"
              aria-label="Dimensi klasifikasi PDRB"
              class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/90"
            >
              <button
                type="button"
                :aria-pressed="dimension === 'kbli'"
                class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                :class="
                  dimension === 'kbli'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-950 font-medium'
                "
                @click="() => { dimension = 'kbli'; }"
              >
                17 Lapangan Usaha KBLI
              </button>
              <button
                type="button"
                :aria-pressed="dimension === 'expenditure'"
                class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                :class="
                  dimension === 'expenditure'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                    : 'text-slate-600 hover:text-slate-950 font-medium'
                "
                @click="() => { dimension = 'expenditure'; }"
              >
                6 Komponen Pengeluaran
              </button>
            </div>
          </div>
        </div>

        <span
          v-if="trendData"
          class="text-xs font-semibold text-indigo-700 tabular-nums px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80"
        >
          {{ trendData.period.label }} vs {{ trendData.baseline.label }}
        </span>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat analisis tren"
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- 4 KPI Comparison Strip -->
    <div v-if="pending && !trendData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="saas-card rounded-2xl p-5 space-y-2">
        <div class="h-3 w-28 rounded bg-slate-200" />
        <div class="h-8 w-20 rounded bg-slate-200" />
      </div>
    </div>

    <div v-else-if="trendData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Volume Periode Aktif
          </span>
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-chart-square-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold tabular-nums text-slate-900">
            {{ formatNumberId(trendData.kpi.currentTotal) }}
          </span>
          <span class="text-xs text-slate-600 tabular-nums">
            vs {{ trendData.kpi.baselineTotal }}
          </span>
        </div>
        <div class="text-xs">
          <span
            class="px-2 py-0.5 rounded-full border font-semibold tabular-nums"
            :class="
              trendData.kpi.deltaCount > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : trendData.kpi.deltaCount < 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
            "
          >
            {{ trendData.kpi.deltaCount > 0 ? '+' : '' }}{{ trendData.kpi.deltaCount }} artikel
            <template v-if="trendData.kpi.deltaPercent !== null">
              ({{ trendData.kpi.deltaPercent > 0 ? '+' : '' }}{{ trendData.kpi.deltaPercent }}%)
            </template>
          </span>
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Kenaikan Sinyal Tertinggi
          </span>
          <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-diagram-up-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="trendData.kpi.topRiser">
          <div class="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
            {{ trendData.kpi.topRiser.code }} - {{ trendData.kpi.topRiser.label }}
          </div>
          <div class="text-xs font-bold text-emerald-700 tabular-nums">
            +{{ trendData.kpi.topRiser.deltaCount }} bukti vs baseline
          </div>
        </template>
        <div v-else class="text-sm text-slate-600 font-medium pt-1">
          Belum ada sektor meningkat
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Penurunan Sinyal Terbesar
          </span>
          <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-heart-pulse-2-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="trendData.kpi.topDecliner">
          <div class="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
            {{ trendData.kpi.topDecliner.code }} - {{ trendData.kpi.topDecliner.label }}
          </div>
          <div class="text-xs font-bold text-rose-700 tabular-nums">
            {{ trendData.kpi.topDecliner.deltaCount }} bukti vs baseline
          </div>
        </template>
        <div v-else class="text-sm text-slate-600 font-medium pt-1">
          Tidak ada sektor menurun
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Gap {{ dimension === 'kbli' ? '17 Sektor' : '6 Pengeluaran' }}
          </span>
          <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-radar-2-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tabular-nums text-slate-900">
          {{ trendData.kpi.gapCount }}
        </div>
        <div class="text-xs text-slate-600">
          {{ trendData.kpi.gapCount === 0 ? 'Seluruh pos memiliki bukti' : 'Pos belum ada berita terverifikasi' }}
        </div>
      </div>
    </div>

    <!-- 8-Quarter Historical Chart (ECharts Combined Stacked Bar + Smooth Area Trendline) -->
    <section
      v-if="trendData"
      aria-label="Grafik Tren 8 Triwulan Terakhir"
      class="saas-card rounded-2xl p-5 sm:p-6 space-y-4"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 text-balance">
            Dinamika Sinyal 8 Triwulan Terakhir
          </h2>
          <p class="text-xs text-slate-600 text-pretty">
            Arahkan kursor untuk rincian dampak atau klik grafik / kartu periode untuk memindahkan periode aktif.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span class="inline-flex items-center gap-1.5 text-indigo-700">
            <span class="w-3 h-0.5 rounded-full bg-indigo-600" />
            Total Artikel
          </span>
          <span class="inline-flex items-center gap-1.5 text-emerald-800">
            <span class="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            Naik NTB
          </span>
          <span class="inline-flex items-center gap-1.5 text-amber-800">
            <span class="w-2.5 h-2.5 rounded-sm bg-amber-600" />
            Tekanan Harga
          </span>
          <span class="inline-flex items-center gap-1.5 text-rose-800">
            <span class="w-2.5 h-2.5 rounded-sm bg-rose-600" />
            Turun NTB
          </span>
        </div>
      </div>

      <!-- Readout Banner -->
      <div
        v-if="hoveredQuarter"
        class="rounded-xl bg-slate-50/70 border border-slate-200/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div class="font-bold text-slate-900 flex items-center gap-2">
          <span>{{ hoveredQuarter.label }}</span>
          <span
            v-if="hoveredQuarter.isTarget"
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            Periode Aktif
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-4 font-semibold tabular-nums">
          <span class="text-slate-900">Total: {{ hoveredQuarter.total }}</span>
          <span class="text-emerald-700">Ekspansi: {{ hoveredQuarter.increaseNtb }}</span>
          <span class="text-amber-700">Harga: {{ hoveredQuarter.pricePressure }}</span>
          <span class="text-rose-700">Kontraksi: {{ hoveredQuarter.decreaseNtb }}</span>
        </div>
      </div>

      <SharedAppChart
        :option="historyChartOption"
        height-class="h-72"
        :loading="pending && !trendData"
        :empty="!trendData.history8Quarters.length"
        empty-title="Belum ada riwayat 8 triwulan"
        @chart-click="handleQuarterChartClick"
      />

      <!-- Accessible Interactive Quarter Selector Strip -->
      <div class="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2 border-t border-slate-100">
        <button
          v-for="pt in trendData.history8Quarters"
          :key="`${pt.year}-${pt.quarter}`"
          type="button"
          class="min-h-11 flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl border text-xs tabular-nums transition-colors cursor-pointer"
          :class="
            pt.isTarget
              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
              : 'bg-white border-slate-200/80 text-slate-600 hover:border-indigo-200 hover:bg-slate-50 font-medium'
          "
          @mouseenter="hoveredQuarter = pt"
          @focus="hoveredQuarter = pt"
          @click="() => { setPeriod(pt.year, pt.quarter); }"
        >
          <span class="text-[11px]">{{ pt.shortLabel }}</span>
          <span class="text-sm font-extrabold text-slate-900">{{ pt.total }}</span>
        </button>
      </div>
    </section>

    <!-- Comparison Table -->
    <section v-if="trendData" aria-label="Tabel Perbandingan per Sektor atau Komponen" class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter perubahan tren"
          class="inline-flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200/90 gap-1"
        >
          <button
            type="button"
            :aria-pressed="tableFilter === 'all'"
            class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
            :class="tableFilter === 'all' ? 'bg-white font-bold shadow-2xs text-indigo-700 border border-indigo-200/70' : 'text-slate-600 font-medium'"
            @click="() => { tableFilter = 'all'; }"
          >
            Semua
          </button>
          <button
            type="button"
            :aria-pressed="tableFilter === 'up'"
            class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
            :class="tableFilter === 'up' ? 'bg-white font-bold shadow-2xs text-emerald-800 border border-emerald-200' : 'text-slate-600 font-medium'"
            @click="() => { tableFilter = 'up'; }"
          >
            Meningkat (+)
          </button>
          <button
            type="button"
            :aria-pressed="tableFilter === 'down'"
            class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
            :class="tableFilter === 'down' ? 'bg-white font-bold shadow-2xs text-rose-700 border border-rose-200' : 'text-slate-600 font-medium'"
            @click="() => { tableFilter = 'down'; }"
          >
            Menurun (-)
          </button>
          <button
            type="button"
            :aria-pressed="tableFilter === 'gap'"
            class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
            :class="tableFilter === 'gap' ? 'bg-white font-bold shadow-2xs text-slate-900 border border-slate-200' : 'text-slate-600 font-medium'"
            @click="() => { tableFilter = 'gap'; }"
          >
            Data Gap (0)
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <label for="trends-sort-select" class="font-semibold text-slate-600 cursor-pointer">
            Urutkan:
          </label>
          <div class="w-48">
            <USelect
              id="trends-sort-select"
              :model-value="sortKey"
              :items="sortOptions"
              value-key="value"
              label-key="label"
              size="sm"
              aria-label="Urutkan tabel perbandingan"
              class="w-full"
              @update:model-value="(val: unknown) => { if (val === 'delta' || val === 'current' || val === 'code') sortKey = val; }"
            />
          </div>
        </div>
      </div>

      <div class="saas-card rounded-2xl overflow-hidden">
        <div
          tabindex="0"
          role="region"
          aria-label="Tabel Perbandingan Tren PDRB"
          class="saas-table-scroller"
        >
          <table class="w-full text-left border-collapse min-w-[780px]">
            <caption class="sr-only">
              Perbandingan jumlah bukti berita terverifikasi {{ trendData.period.label }} terhadap
              {{ trendData.baseline.label }}
            </caption>
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th scope="col" class="px-4 py-3.5">Pos {{ dimension === 'kbli' ? 'KBLI (17 Sektor)' : 'Pengeluaran' }}</th>
                <th scope="col" class="px-3 py-3.5 text-right whitespace-nowrap">{{ trendData.baseline.label }}</th>
                <th scope="col" class="px-3 py-3.5 text-right whitespace-nowrap">{{ trendData.period.label }}</th>
                <th scope="col" class="px-3 py-3.5 text-right">Delta</th>
                <th scope="col" class="px-4 py-3.5">Dominan Dampak</th>
                <th scope="col" class="px-4 py-3.5">Headline Terbaru</th>
                <th scope="col" class="px-4 py-3.5 text-right">Arsip</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 text-xs">
              <tr
                v-for="row in filteredSortedRows"
                :key="row.code"
                class="hover:bg-indigo-50/30 transition-colors"
              >
                <th scope="row" class="px-4 py-3 text-left font-medium text-slate-900">
                  <span
                    class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mr-2"
                    :class="
                      dimension === 'kbli'
                        ? getKbliClusterTheme(row.code).pillClass
                        : getExpenditureColorTheme(row.code).pillClass
                    "
                  >
                    {{ row.code }}
                  </span>
                  <span>{{ row.label }}</span>
                </th>
                <td class="px-3 py-3 text-right tabular-nums text-slate-600 font-medium">
                  {{ row.baselineCount }}
                </td>
                <td class="px-3 py-3 text-right font-extrabold tabular-nums text-slate-900">
                  {{ row.currentCount }}
                </td>
                <td class="px-3 py-3 text-right tabular-nums">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold"
                    :class="
                      row.deltaCount > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : row.deltaCount < 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                    "
                  >
                    {{ row.deltaCount > 0 ? `+${row.deltaCount}` : row.deltaCount }}
                    <template v-if="row.deltaPercent !== null">
                      &nbsp;({{ row.deltaPercent > 0 ? '+' : '' }}{{ row.deltaPercent }}%)
                    </template>
                  </span>
                </td>
                <td class="px-4 py-3">
                  <UBadge
                    v-if="renderImpactBadge(row.dominantImpact)"
                    :color="renderImpactBadge(row.dominantImpact)!.color"
                    variant="subtle"
                    size="xs"
                    :icon="renderImpactBadge(row.dominantImpact)!.icon"
                  >
                    {{ renderImpactBadge(row.dominantImpact)!.shortLabel }}
                  </UBadge>
                  <span v-else class="text-rose-700 font-semibold text-xs">Data Gap</span>
                </td>
                <td class="px-4 py-3 max-w-xs">
                  <span v-if="row.latestHeadline" class="line-clamp-1 text-slate-700" :title="row.latestHeadline">
                    {{ row.latestHeadline }}
                  </span>
                  <span v-else class="text-slate-600 italic">Belum ada catatan</span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <NuxtLink
                    :to="
                      dimension === 'kbli'
                        ? `/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&pdrbGroup=${encodeURIComponent(row.code)}&status=VERIFIED`
                        : `/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&expenditure=${encodeURIComponent(row.code)}&status=VERIFIED`
                    "
                    class="min-h-8 inline-flex items-center text-indigo-700 hover:text-indigo-900 font-semibold hover:underline"
                  >
                    Arsip →
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

