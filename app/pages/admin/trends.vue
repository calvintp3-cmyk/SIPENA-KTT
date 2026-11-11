<!-- app/pages/admin/trends.vue -->
<script setup lang="ts">
import type { ExpenditureImpactEnum, KbliImpactEnum } from '#shared/enums/pdrb';
import type { AdminTrendsResponse, TrendPeriodPoint } from '~/types/sipena';

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
const { getKbliImpactBadge, getExpenditureImpactBadge, formatNumberId } = usePdrbLabels();
const { isExporting, downloadExport } = useExcelExport();

const mode = ref<'qoq' | 'yoy'>('qoq');
const dimension = ref<'kbli' | 'expenditure'>('kbli');
const tableFilter = ref<'all' | 'up' | 'down' | 'gap'>('all');
const sortKey = ref<'delta' | 'current' | 'code'>('delta');
const hoveredQuarter = ref<TrendPeriodPoint | null>(null);

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

const maxHistoryTotal = computed(() => {
  const list = trendData.value?.history8Quarters ?? [];
  return Math.max(1, ...list.map((q) => q.total));
});

function barHeightPercent(val: number): number {
  if (val <= 0) return 0;
  return Math.max(4, Math.round((val / maxHistoryTotal.value) * 100));
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
          <div class="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal-700">
            <UIcon name="i-lucide-trending-up" class="w-3.5 h-3.5" />
            <span>Komparasi Dinamika Sinyal Antar Periode</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1220] mt-0.5">
            Tren &amp; Komparasi Fenomena PDRB
          </h1>
          <p v-if="trendData" class="text-xs sm:text-sm text-[#5B677A] mt-0.5">
            Membandingkan
            <strong class="text-[#0B1220]">{{ trendData.period.label }}</strong>
            terhadap
            <strong class="text-[#0B1220]">{{ trendData.baseline.label }}</strong>
            ({{ mode === 'qoq' ? 'Quarter-to-Quarter' : 'Year-on-Year' }}).
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            :disabled="isExporting"
            class="h-9 px-3 rounded-lg border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1220] inline-flex items-center gap-1.5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] disabled:opacity-50"
            @click="handleExportXlsx"
          >
            <UIcon name="i-lucide-download" class="w-3.5 h-3.5 text-teal-700" />
            <span>Export {{ shortPeriodLabel }} (.XLSX)</span>
          </button>
        </div>
      </div>

      <!-- Deck 2: Comparison Mode & Dimension Segmented Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DCE3EC] rounded-xl p-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Mode:
            </span>
            <div
              role="group"
              aria-label="Mode komparasi periode"
              class="inline-flex p-0.5 bg-slate-200/75 rounded-lg border border-slate-200"
            >
              <button
                type="button"
                :aria-pressed="mode === 'qoq'"
                class="px-2.5 py-1 rounded-md font-mono text-xs transition-all"
                :class="
                  mode === 'qoq'
                    ? 'bg-white text-teal-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                "
                @click="mode = 'qoq'"
              >
                q-to-q (Triwulan Sebelumnya)
              </button>
              <button
                type="button"
                :aria-pressed="mode === 'yoy'"
                class="px-2.5 py-1 rounded-md font-mono text-xs transition-all"
                :class="
                  mode === 'yoy'
                    ? 'bg-white text-teal-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                "
                @click="mode = 'yoy'"
              >
                y-on-y (Tahun Sebelumnya)
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Dimensi:
            </span>
            <div
              role="group"
              aria-label="Dimensi klasifikasi PDRB"
              class="inline-flex p-0.5 bg-slate-200/75 rounded-lg border border-slate-200"
            >
              <button
                type="button"
                :aria-pressed="dimension === 'kbli'"
                class="px-2.5 py-1 rounded-md text-xs transition-all"
                :class="
                  dimension === 'kbli'
                    ? 'bg-white text-[#0B1220] font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                "
                @click="dimension = 'kbli'"
              >
                17 Lapangan Usaha KBLI
              </button>
              <button
                type="button"
                :aria-pressed="dimension === 'expenditure'"
                class="px-2.5 py-1 rounded-md text-xs transition-all"
                :class="
                  dimension === 'expenditure'
                    ? 'bg-white text-[#0B1220] font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                "
                @click="dimension = 'expenditure'"
              >
                6 Komponen Pengeluaran
              </button>
            </div>
          </div>
        </div>

        <span
          v-if="trendData"
          class="font-mono text-[11px] font-medium text-[#5B677A] tabular-nums px-2 py-1 rounded bg-[#F8FAFC] border border-[#DCE3EC]"
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
        <UButton size="xs" color="error" variant="solid" @click="refresh()">Muat Ulang</UButton>
      </template>
    </UAlert>

    <!-- 4 KPI Comparison Strip -->
    <div v-if="pending && !trendData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="saas-card rounded-xl p-5 space-y-2">
        <div class="h-3 w-28 rounded bg-slate-200" />
        <div class="h-8 w-20 rounded bg-slate-200" />
      </div>
    </div>

    <div v-else-if="trendData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="saas-card rounded-xl p-5 space-y-2">
        <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Volume Periode Aktif
        </span>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold font-mono tabular-nums text-[#0B1220]">
            {{ formatNumberId(trendData.kpi.currentTotal) }}
          </span>
          <span class="text-xs text-[#5B677A] font-mono">
            vs {{ trendData.kpi.baselineTotal }}
          </span>
        </div>
        <div class="text-xs font-mono">
          <span
            class="px-1.5 py-0.5 rounded border font-semibold tabular-nums"
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

      <div class="saas-card rounded-xl p-5 space-y-2">
        <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Kenaikan Sinyal Tertinggi
        </span>
        <template v-if="trendData.kpi.topRiser">
          <div class="text-sm font-bold text-[#0B1220] leading-snug line-clamp-2">
            [{{ trendData.kpi.topRiser.code }}] {{ trendData.kpi.topRiser.label }}
          </div>
          <div class="font-mono text-xs font-bold text-emerald-700 tabular-nums">
            +{{ trendData.kpi.topRiser.deltaCount }} bukti vs baseline
          </div>
        </template>
        <div v-else class="text-sm text-slate-400 font-medium pt-1">
          Belum ada sektor meningkat
        </div>
      </div>

      <div class="saas-card rounded-xl p-5 space-y-2">
        <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Penurunan Sinyal Terbesar
        </span>
        <template v-if="trendData.kpi.topDecliner">
          <div class="text-sm font-bold text-[#0B1220] leading-snug line-clamp-2">
            [{{ trendData.kpi.topDecliner.code }}] {{ trendData.kpi.topDecliner.label }}
          </div>
          <div class="font-mono text-xs font-bold text-rose-700 tabular-nums">
            {{ trendData.kpi.topDecliner.deltaCount }} bukti vs baseline
          </div>
        </template>
        <div v-else class="text-sm text-slate-400 font-medium pt-1">
          Tidak ada sektor menurun
        </div>
      </div>

      <div class="saas-card rounded-xl p-5 space-y-2">
        <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Gap {{ dimension === 'kbli' ? '17 Sektor' : '6 Pengeluaran' }}
        </span>
        <div class="text-3xl font-bold font-mono tabular-nums text-[#0B1220]">
          {{ trendData.kpi.gapCount }}
        </div>
        <div class="text-xs text-[#5B677A]">
          {{ trendData.kpi.gapCount === 0 ? 'Seluruh pos memiliki bukti' : 'Pos belum ada berita terverifikasi' }}
        </div>
      </div>
    </div>

    <!-- 8-Quarter Historical Chart -->
    <section v-if="trendData" aria-label="Grafik Tren 8 Triwulan Terakhir" class="saas-card rounded-xl p-5 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#0B1220]">
            Dinamika Sinyal 8 Triwulan Terakhir
          </h2>
          <p class="text-xs text-[#5B677A]">
            Arahkan kursor untuk rincian dampak atau klik batang triwulan untuk memindahkan periode aktif.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span class="inline-flex items-center gap-1.5 text-emerald-800">
            <span class="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            Naik NTB
          </span>
          <span class="inline-flex items-center gap-1.5 text-amber-800">
            <span class="w-2.5 h-2.5 rounded-xs bg-amber-500" />
            Tekanan Harga
          </span>
          <span class="inline-flex items-center gap-1.5 text-rose-800">
            <span class="w-2.5 h-2.5 rounded-xs bg-rose-500" />
            Turun NTB
          </span>
        </div>
      </div>

      <!-- Readout Banner -->
      <div
        v-if="hoveredQuarter"
        class="rounded-lg bg-[#F8FAFC] border border-[#DCE3EC] px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div class="font-mono font-bold text-[#0B1220]">
          {{ hoveredQuarter.label }}
          <span v-if="hoveredQuarter.isTarget" class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
            Periode Aktif
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-4 font-mono tabular-nums">
          <span class="text-[#0B1220] font-bold">Total: {{ hoveredQuarter.total }}</span>
          <span class="text-emerald-700">Ekspansi: {{ hoveredQuarter.increaseNtb }}</span>
          <span class="text-amber-700">Harga: {{ hoveredQuarter.pricePressure }}</span>
          <span class="text-rose-700">Kontraksi: {{ hoveredQuarter.decreaseNtb }}</span>
        </div>
      </div>

      <!-- Stacked Bar Grid -->
      <div class="grid grid-cols-8 gap-2 sm:gap-3 pt-2 items-end h-52 border-b border-slate-200 pb-2">
        <button
          v-for="pt in trendData.history8Quarters"
          :key="`${pt.year}-${pt.quarter}`"
          type="button"
          class="group h-full flex flex-col justify-end items-center gap-1.5 rounded-lg px-1 py-1 transition-colors"
          :class="
            pt.isTarget
              ? 'bg-teal-50/70 ring-1 ring-teal-300'
              : 'hover:bg-slate-50'
          "
          @mouseenter="hoveredQuarter = pt"
          @focus="hoveredQuarter = pt"
          @click="setPeriod(pt.year, pt.quarter)"
        >
          <span class="font-mono text-[11px] font-bold tabular-nums text-slate-700">
            {{ pt.total }}
          </span>

          <div class="w-full max-w-[44px] flex-1 flex flex-col justify-end gap-0.5">
            <div
              v-if="pt.decreaseNtb > 0"
              class="w-full rounded-t-xs bg-rose-500 transition-all"
              :style="{ height: `${barHeightPercent(pt.decreaseNtb)}%` }"
            />
            <div
              v-if="pt.pricePressure > 0"
              class="w-full bg-amber-500 transition-all"
              :style="{ height: `${barHeightPercent(pt.pricePressure)}%` }"
            />
            <div
              v-if="pt.increaseNtb > 0"
              class="w-full rounded-b-xs bg-emerald-500 transition-all"
              :style="{ height: `${barHeightPercent(pt.increaseNtb)}%` }"
            />
            <div
              v-if="pt.total === 0"
              class="w-full h-1 rounded bg-slate-200"
            />
          </div>

          <span
            class="font-mono text-[10px] tabular-nums whitespace-nowrap"
            :class="pt.isTarget ? 'font-bold text-teal-800' : 'text-slate-500'"
          >
            {{ pt.shortLabel }}
          </span>
        </button>
      </div>
    </section>

    <!-- Comparison Table -->
    <section v-if="trendData" aria-label="Tabel Perbandingan per Sektor atau Komponen" class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter perubahan tren"
          class="inline-flex flex-wrap p-0.5 bg-slate-200/75 rounded-lg border border-slate-200"
        >
          <button
            type="button"
            :aria-pressed="tableFilter === 'all'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="tableFilter === 'all' ? 'bg-white font-semibold shadow-xs text-[#0B1220]' : 'text-slate-600'"
            @click="tableFilter = 'all'"
          >
            Semua
          </button>
          <button
            type="button"
            :aria-pressed="tableFilter === 'up'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="tableFilter === 'up' ? 'bg-white font-semibold shadow-xs text-emerald-800' : 'text-slate-600'"
            @click="tableFilter = 'up'"
          >
            Meningkat (+)
          </button>
          <button
            type="button"
            :aria-pressed="tableFilter === 'down'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="tableFilter === 'down' ? 'bg-white font-semibold shadow-xs text-rose-700' : 'text-slate-600'"
            @click="tableFilter = 'down'"
          >
            Menurun (-)
          </button>
          <button
            type="button"
            :aria-pressed="tableFilter === 'gap'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="tableFilter === 'gap' ? 'bg-white font-semibold shadow-xs text-slate-900' : 'text-slate-600'"
            @click="tableFilter = 'gap'"
          >
            Data Gap (0)
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <label for="trends-sort-select" class="font-mono text-[11px] text-slate-500 uppercase">
            Urutkan:
          </label>
          <select
            id="trends-sort-select"
            v-model="sortKey"
            class="h-8 px-2.5 bg-white border border-[#DCE3EC] rounded-lg text-xs font-medium text-[#0B1220]"
          >
            <option value="delta">Perubahan Terbesar</option>
            <option value="current">Volume Periode Aktif</option>
            <option value="code">Kode Urut Resmi</option>
          </select>
        </div>
      </div>

      <div class="saas-card rounded-xl overflow-hidden">
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
              <tr class="border-b border-[#DCE3EC] bg-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" class="px-4 py-3 font-semibold">Pos {{ dimension === 'kbli' ? 'KBLI (17 Sektor)' : 'Pengeluaran' }}</th>
                <th scope="col" class="px-3 py-3 font-semibold text-right">{{ trendData.baseline.label }}</th>
                <th scope="col" class="px-3 py-3 font-semibold text-right">{{ trendData.period.label }}</th>
                <th scope="col" class="px-3 py-3 font-semibold text-right">Delta</th>
                <th scope="col" class="px-4 py-3 font-semibold">Dominan Dampak</th>
                <th scope="col" class="px-4 py-3 font-semibold">Headline Terbaru</th>
                <th scope="col" class="px-4 py-3 font-semibold text-right">Arsip</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 text-xs">
              <tr
                v-for="row in filteredSortedRows"
                :key="row.code"
                class="hover:bg-slate-50/70 transition-colors"
              >
                <th scope="row" class="px-4 py-3 text-left font-medium text-[#0B1220]">
                  <span class="font-mono text-[11px] font-bold text-teal-700 mr-1.5">
                    [{{ row.code }}]
                  </span>
                  <span>{{ row.label }}</span>
                </th>
                <td class="px-3 py-3 text-right font-mono tabular-nums text-slate-600">
                  {{ row.baselineCount }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold tabular-nums text-[#0B1220]">
                  {{ row.currentCount }}
                </td>
                <td class="px-3 py-3 text-right font-mono tabular-nums">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold"
                    :class="
                      row.deltaCount > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : row.deltaCount < 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
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
                  <span v-else class="text-slate-400 font-mono text-[11px]">DATA GAP</span>
                </td>
                <td class="px-4 py-3 max-w-xs">
                  <span v-if="row.latestHeadline" class="line-clamp-1 text-[#334155]" :title="row.latestHeadline">
                    {{ row.latestHeadline }}
                  </span>
                  <span v-else class="text-slate-400 italic">Belum ada catatan</span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <NuxtLink
                    :to="
                      dimension === 'kbli'
                        ? `/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&pdrbGroup=${encodeURIComponent(row.code)}&status=VERIFIED`
                        : `/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&expenditure=${encodeURIComponent(row.code)}&status=VERIFIED`
                    "
                    class="text-teal-700 hover:text-teal-900 font-semibold hover:underline"
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

