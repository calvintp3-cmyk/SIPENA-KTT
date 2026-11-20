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
  if (val <= 0) return 'bg-canvas text-ink-muted/60';
  if (val <= 2) return 'bg-brand-tint text-brand-primary border border-brand-border hover:bg-[#D2E6DC] font-semibold';
  if (val <= 5) return 'bg-[#6EA892]/35 text-[#072B20] border border-[#6EA892]/60 hover:bg-[#6EA892]/50 font-bold';
  return 'bg-brand-primary text-white font-bold shadow-2xs hover:bg-[#072B20]';
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
        fontFamily: 'Manrope, sans-serif',
      },
      subtextStyle: {
        fontSize: 11,
        color: SIPENA_CHART_TOKENS.inkMuted,
        fontFamily: 'Manrope, sans-serif',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['54%', '82%'],
        center: ['50%', '50%'],
        itemStyle: {
          borderRadius: 4,
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
              color: '#0B3D2E',
              opacity: tileFilter.value === 'all' || tileFilter.value === 'covered' ? 1 : 0.35,
            },
          },
          {
            name: 'Tipis (1–2 bukti)',
            value: thin,
            filterKey: 'thin',
            itemStyle: {
              color: '#B45309',
              opacity: tileFilter.value === 'all' || tileFilter.value === 'thin' ? 1 : 0.35,
            },
          },
          {
            name: 'Data Gap (0 bukti)',
            value: gap,
            filterKey: 'gap',
            itemStyle: {
              color: '#C8553D',
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
  PERUBAHAN_INVENTORI: 'Inventori',
  EKSPOR_NETTO: 'Ekspor-Net',
};
</script>

<template>
  <div class="space-y-6">
    <!-- Top Action Ribbon -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
      <div>
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-tint text-brand-primary border border-brand-border text-xs font-semibold font-mono">
          <UIcon name="i-solar-radar-2-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
          <span>{{ periodLabel }} &bull; Gap Detector</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-primary mt-1 font-display">
          Dashboard Eksekutif &amp; Radar Gap Sektoral
        </h1>
        <p class="text-xs sm:text-sm text-ink-secondary mt-0.5">
          Pemantauan sebaran bukti empiris pada 17 Lapangan Usaha KBLI dan 6 Komponen Pengeluaran PDRB Tana Tidung.
        </p>
      </div>

      <div class="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          :disabled="isExporting"
          class="min-h-9 px-3.5 rounded-xl border border-border-hairline bg-white hover:border-brand-primary hover:bg-canvas text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          @click="handleExportXlsx"
        >
          <UIcon v-if="isExporting" name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
          <UIcon v-else name="i-solar-file-download-bold-duotone" class="w-4 h-4 text-brand-primary" />
          <span>{{ isExporting ? 'Mengekspor...' : 'Ekspor Excel (.xlsx)' }}</span>
        </button>

        <button
          type="button"
          class="obs-btn-primary min-h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          @click="openManualForSector(null)"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
          <span>Tambah Bukti Manual</span>
        </button>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal Memuat Dashboard Analitik"
      description="Terjadi kesalahan saat memproses data analitik periode ini."
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          label="Coba Lagi"
          icon="i-lucide-refresh-cw"
          @click="() => { refresh(); }"
        />
      </template>
    </UAlert>

    <!-- Skeleton Loading -->
    <div
      v-else-if="pending && !dashData"
      class="bg-white rounded-2xl border border-border-hairline grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#141917]/[0.08]"
    >
      <div v-for="i in 4" :key="i" class="p-5 space-y-2">
        <div class="h-3 w-28 rounded bg-surface-subtle animate-pulse" />
        <div class="h-8 w-20 rounded bg-surface-subtle animate-pulse" />
        <div class="h-3 w-36 rounded bg-canvas animate-pulse" />
      </div>
    </div>

    <!-- Main Dashboard Body -->
    <div v-else-if="dashData" class="space-y-6">
      <!-- 4 Top Executive KPI Ribbon (Hairline Divided) -->
      <div
        class="bg-white rounded-2xl border border-border-hairline shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#141917]/[0.08]"
      >
        <!-- KPI 1: Terverifikasi -->
        <div class="p-5 flex flex-col justify-between">
          <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
            Total Terverifikasi
          </div>
          <div class="my-2 flex items-baseline gap-2">
            <span class="font-display font-extrabold text-3xl sm:text-4xl text-ink-primary tabular-nums">
              {{ formatNumberId(dashData.kpi.totalVerifiedPeriod) }}
            </span>
            <span class="text-xs text-ink-muted">bukti</span>
          </div>
          <div class="text-[11.5px] font-mono">
            <span v-if="dashData.kpi.deltaPercent !== null" class="font-semibold" :class="dashData.kpi.deltaPercent >= 0 ? 'text-brand-primary' : 'text-terracotta-ink'">
              {{ dashData.kpi.deltaPercent >= 0 ? '↑ +' : '↓ ' }}{{ dashData.kpi.deltaPercent }}% vs TW sebelumnya
            </span>
            <span v-else class="text-ink-muted">Menunggu data pembanding</span>
          </div>
        </div>

        <!-- KPI 2: Cakupan Sektor -->
        <div class="p-5 flex flex-col justify-between">
          <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
            Cakupan Sektor KBLI
          </div>
          <div class="my-2 flex items-baseline gap-2">
            <span class="font-display font-extrabold text-3xl sm:text-4xl text-ink-primary tabular-nums">
              {{ dashData.kpi.coveredSectors }}/{{ dashData.kpi.totalSectors }}
            </span>
            <span class="text-xs text-ink-muted">aktif</span>
          </div>
          <div class="text-[11.5px] font-mono">
            <span v-if="dashData.kpi.gapSectorsCount > 0" class="text-terracotta-ink font-bold">
              {{ dashData.kpi.gapSectorsCount }} sektor senyap (gap 0)
            </span>
            <span v-else class="text-brand-primary font-bold">
              Seluruh 17 sektor terarsip!
            </span>
          </div>
        </div>

        <!-- KPI 3: Antrean Kurasi -->
        <div class="p-5 flex flex-col justify-between">
          <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
            Antrean Kurasi Pending
          </div>
          <div class="my-2 flex items-baseline gap-2">
            <span class="font-display font-extrabold text-3xl sm:text-4xl text-ink-primary tabular-nums" :class="dashData.kpi.pendingQueueCount > 0 ? 'text-ochre-ink' : 'text-ink-primary'">
              {{ formatNumberId(dashData.kpi.pendingQueueCount) }}
            </span>
            <span class="text-xs text-ink-muted">perlu telaah</span>
          </div>
          <div class="text-[11.5px] font-mono">
            <NuxtLink to="/admin/review" class="text-brand-primary hover:underline font-bold inline-flex items-center gap-1">
              <span>Buka antrean review</span>
              <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
            </NuxtLink>
          </div>
        </div>

        <!-- KPI 4: Rasio Ekspansi Riil -->
        <div class="p-5 flex flex-col justify-between">
          <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
            Rasio Ekspansi Riil
          </div>
          <div class="my-2 flex items-baseline gap-2">
            <span class="font-display font-extrabold text-3xl sm:text-4xl text-brand-primary tabular-nums">
              {{ dashData.kpi.expansionPercent }}%
            </span>
            <span class="text-xs text-ink-muted">output riil</span>
          </div>
          <div class="text-[11.5px] text-ink-secondary font-mono tabular-nums">
            Rasio sinyal pertumbuhan output (ADHK)
          </div>
        </div>
      </div>

      <!-- Radar 17 Sektor Usaha (Gap Detector Mosaic) -->
      <div class="bg-white rounded-2xl border border-border-hairline shadow-2xs p-5 sm:p-6 space-y-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
          <div>
            <h2 class="text-base font-bold text-ink-primary font-display">
              Radar Gap 17 Sektor Usaha (KBLI 2025)
            </h2>
            <p class="text-xs text-ink-secondary mt-0.5">
              Identifikasi sektor lapangan usaha yang minim atau nihil bukti empiris pada {{ shortPeriodLabel }}.
            </p>
          </div>

          <!-- Segmented Filter Pills -->
          <div class="inline-flex p-1 bg-surface-subtle rounded-xl font-mono text-xs font-semibold self-start md:self-auto shrink-0">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="tileFilter === 'all' ? 'bg-white text-ink-primary font-bold shadow-2xs' : 'text-ink-secondary hover:text-ink-primary'"
              @click="tileFilter = 'all'"
            >
              Semua ({{ tileCounts.all }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="tileFilter === 'gap' ? 'bg-white text-terracotta-ink font-bold shadow-2xs' : 'text-ink-secondary hover:text-terracotta-ink'"
              @click="tileFilter = 'gap'"
            >
              Gap 0 ({{ tileCounts.gap }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="tileFilter === 'thin' ? 'bg-white text-ochre-ink font-bold shadow-2xs' : 'text-ink-secondary hover:text-ochre-ink'"
              @click="tileFilter = 'thin'"
            >
              Tipis 1–2 ({{ tileCounts.thin }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              :class="tileFilter === 'covered' ? 'bg-white text-brand-primary font-bold shadow-2xs' : 'text-ink-secondary hover:text-brand-primary'"
              @click="tileFilter = 'covered'"
            >
              Cukup &gt;2 ({{ tileCounts.covered }})
            </button>
          </div>
        </div>

        <!-- 17-Sector Tiles Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <div
            v-for="tile in filteredGapTiles"
            :key="tile.groupCode"
            class="p-4 rounded-xl border flex flex-col justify-between transition-all"
            :class="[
              tile.isGap
                ? 'bg-canvas border-dashed border-terracotta/50 hover:border-terracotta'
                : tile.isThin
                  ? 'bg-ochre-surface border-ochre-border hover:border-ochre'
                  : 'bg-white border-border-hairline hover:border-brand-primary/40',
            ]"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <span
                  class="font-mono font-bold text-xs"
                  :class="tile.isGap ? 'text-terracotta-ink' : tile.isThin ? 'text-ochre-ink' : 'text-brand-primary'"
                >
                  KBLI {{ tile.groupCode }}
                </span>
                <span
                  class="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold tabular-nums"
                  :class="[
                    tile.isGap
                      ? 'bg-terracotta-surface text-terracotta-ink'
                      : tile.isThin
                        ? 'bg-[#F8E7C5] text-[#92400E]'
                        : 'bg-brand-tint text-brand-primary',
                  ]"
                >
                  {{ tile.count }} bukti
                </span>
              </div>

              <h3 class="text-xs font-bold text-ink-primary leading-snug mt-2 font-display">
                {{ tile.shortName }}
              </h3>

              <p v-if="tile.isGap" class="text-[11px] text-terracotta-ink mt-1">
                Belum ada bukti empiris tercatat pada periode ini.
              </p>
              <p v-else class="text-[11px] text-ink-secondary mt-1 line-clamp-1">
                Dominan: {{ tile.dominantImpact ? getKbliImpactBadge(tile.dominantImpact).shortLabel : 'Netral' }}
              </p>
            </div>

            <div class="pt-3 mt-3 border-t border-[#141917]/[0.06] flex items-center justify-between text-xs">
              <button
                v-if="tile.isGap"
                type="button"
                class="font-bold text-terracotta-ink hover:underline cursor-pointer inline-flex items-center gap-1"
                @click="openManualForSector(tile.kbliCodes[0] as KbliCategoryEnum)"
              >
                <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
                <span>Isi Bukti</span>
              </button>
              <NuxtLink
                v-else
                :to="`/admin/articles?pdrbGroup=${tile.groupCode}`"
                class="font-semibold text-brand-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Lihat Data</span>
                <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
              </NuxtLink>

              <span class="text-[10px] text-ink-muted font-mono">
                {{ tile.sharePercent }}% share
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Heatmap Matriks Lapangan Usaha x Pengeluaran PDRB -->
      <div class="bg-white rounded-2xl border border-border-hairline shadow-2xs p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between gap-3 pb-3 border-b border-border-hairline">
          <div>
            <h2 class="text-base font-bold text-ink-primary font-display">
              Matriks Transmisi PDRB: 17 Lapangan Usaha &times; 6 Pengeluaran
            </h2>
            <p class="text-xs text-ink-muted mt-0.5">
              Intensitas silang bukti empiris antara sisi produksi dan sisi pengeluaran (Deep Pine sequential scale).
            </p>
          </div>
          <div class="flex items-center gap-3 text-[11px] font-mono text-ink-muted">
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-canvas border border-border-hairline" /> 0
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-brand-tint border border-brand-border" /> 1–2
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-[#6EA892]/35 border border-[#6EA892]" /> 3–5
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded bg-brand-primary" /> &ge; 6
            </span>
          </div>
        </div>

        <div class="saas-table-scroller" tabindex="0" role="region" aria-label="Matriks Heatmap PDRB">
          <table class="min-w-full divide-y divide-[#141917]/[0.08] text-xs">
            <thead class="bg-surface-subtle text-ink-primary font-semibold sticky top-0">
              <tr>
                <th scope="col" class="px-3.5 py-2.5 text-left font-display min-w-[200px]">Lapangan Usaha (KBLI)</th>
                <th
                  v-for="exp in PDRB_6_EXPENDITURE_LIST"
                  :key="exp.code"
                  scope="col"
                  class="px-2 py-2.5 text-center font-mono whitespace-nowrap min-w-[70px]"
                  :title="exp.official"
                >
                  {{ shortExpHeaders[exp.code] || exp.short }}
                </th>
                <th scope="col" class="px-3 py-2.5 text-right font-mono whitespace-nowrap min-w-[60px]">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#141917]/[0.06] bg-white font-mono">
              <tr
                v-for="row in dashData.heatmapMatrix"
                :key="row.groupCode"
                class="hover:bg-canvas transition-colors"
              >
                <th scope="row" class="px-3.5 py-2 text-left font-sans text-xs text-ink-primary whitespace-nowrap">
                  <span class="font-mono font-bold mr-1 text-brand-primary">{{ row.groupCode }}</span>
                  <span class="text-ink-secondary">{{ row.shortName }}</span>
                </th>
                <td
                  v-for="exp in PDRB_6_EXPENDITURE_LIST"
                  :key="exp.code"
                  class="px-2 py-2 text-center"
                >
                  <span
                    class="inline-flex items-center justify-center w-8 h-6 rounded text-xs tabular-nums transition-colors"
                    :class="heatmapCellClass(row.cells[exp.code] ?? 0)"
                  >
                    {{ row.cells[exp.code] ?? 0 }}
                  </span>
                </td>
                <td class="px-3 py-2 text-right font-bold tabular-nums text-ink-primary">
                  {{ row.totalCount }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Manual Article Modal for Filling Sector Gaps -->
    <AdminManualArticleModal
      v-model:open="manualModalOpen"
      :default-kbli="modalDefaultKbli"
      :default-year="modalDefaultYear"
      :default-quarter="modalDefaultQuarter"
      @created="handleManualCreated"
    />
  </div>
</template>
