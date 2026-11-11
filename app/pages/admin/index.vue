<!-- app/pages/admin/index.vue -->
<script setup lang="ts">
import type { KbliCategoryEnum } from '#shared/enums/pdrb';
import { PDRB_6_EXPENDITURE_LIST } from '#shared/enums/pdrb';
import type { PdrbQuarter } from '#shared/utils/period';
import type { AdminDashboardResponse, DashboardGapTileItem } from '~/types/sipena';

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
const { getKbliImpactBadge, formatNumberId } = usePdrbLabels();
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
  if (val <= 0) return 'bg-slate-50/70 text-slate-300';
  if (val <= 2) return 'bg-teal-50 text-teal-800 hover:bg-teal-100';
  if (val <= 5) return 'bg-teal-100 text-teal-900 font-semibold hover:bg-teal-200';
  return 'bg-teal-700 text-white font-bold hover:bg-teal-800';
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
        <div class="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal-700">
          <UIcon name="i-lucide-radar" class="w-3.5 h-3.5" />
          <span>Analitik &amp; Kelengkapan Bukti Sektoral</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1220] mt-0.5">
          Dashboard &amp; Gap Sektoral — {{ periodLabel }}
        </h1>
        <p class="text-xs sm:text-sm text-[#5B677A] mt-0.5">
          Deteksi 17 kategori Lapangan Usaha yang belum memiliki bukti berita terverifikasi dan
          peta silang PDRB dua sisi.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          :disabled="isExporting"
          class="h-9 px-3 rounded-lg border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1220] inline-flex items-center gap-1.5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] transition-colors disabled:opacity-50"
          @click="handleExportXlsx"
        >
          <UIcon name="i-lucide-file-spreadsheet" class="w-3.5 h-3.5 text-teal-700" />
          <span>Export Excel ({{ shortPeriodLabel }})</span>
        </button>

        <button
          type="button"
          class="obsidian-button h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          @click="openManualForSector(null)"
        >
          <UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-teal-300" />
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
        <UButton size="xs" color="error" variant="solid" @click="refresh()">Muat Ulang</UButton>
      </template>
    </UAlert>

    <!-- 4-Card KPI Bento Grid -->
    <div v-if="pending && !dashData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="saas-card rounded-xl p-5 space-y-2.5">
        <div class="h-3 w-28 rounded bg-slate-200" />
        <div class="h-8 w-20 rounded bg-slate-200" />
        <div class="h-3 w-36 rounded bg-slate-100" />
      </div>
    </div>

    <div v-else-if="dashData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <!-- KPI 1 -->
      <div class="saas-card rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Bukti Terverifikasi
          </span>
          <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-teal-700" />
        </div>
        <div class="text-3xl font-bold tracking-tight text-[#0B1220] font-mono tabular-nums">
          {{ formatNumberId(dashData.kpi.totalVerifiedPeriod) }}
        </div>
        <div class="text-xs text-[#5B677A] flex items-center gap-1.5 flex-wrap">
          <span
            v-if="dashData.kpi.deltaPercent !== null"
            class="px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold tabular-nums border"
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
          <span>vs {{ dashData.period.previousLabel }} ({{ dashData.kpi.previousTotalVerified }})</span>
        </div>
      </div>

      <!-- KPI 2 -->
      <div class="saas-card rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Cakupan 17 Sektor PDRB
          </span>
          <UIcon name="i-lucide-layers" class="w-4 h-4 text-teal-700" />
        </div>
        <div class="text-3xl font-bold tracking-tight text-[#0B1220] font-mono tabular-nums">
          {{ dashData.kpi.coveredSectors }}
          <span class="text-base font-medium text-slate-400">/ {{ dashData.kpi.totalSectors }}</span>
        </div>
        <div class="text-xs flex items-center gap-1.5">
          <span
            class="px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold border tabular-nums"
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
      <div class="saas-card rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Antrean Kurasi Pending
          </span>
          <UIcon name="i-lucide-inbox" class="w-4 h-4 text-amber-600" />
        </div>
        <div class="text-3xl font-bold tracking-tight text-[#0B1220] font-mono tabular-nums">
          {{ formatNumberId(dashData.kpi.pendingQueueCount) }}
        </div>
        <div class="flex items-center justify-between gap-2 text-xs">
          <span
            v-if="dashData.kpi.llmFailedCount > 0"
            class="font-mono text-[11px] text-rose-700 font-semibold"
          >
            {{ dashData.kpi.llmFailedCount }} AI Gagal
          </span>
          <span v-else class="text-[#5B677A]">Pipeline AI Normal</span>
          <NuxtLink to="/admin/review" class="text-teal-700 hover:underline font-semibold">
            Kurasi →
          </NuxtLink>
        </div>
      </div>

      <!-- KPI 4 -->
      <div class="saas-card rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Sinyal Ekspansi Riil
          </span>
          <UIcon name="i-lucide-trending-up" class="w-4 h-4 text-emerald-700" />
        </div>
        <div class="text-3xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
          {{ dashData.kpi.expansionPercent }}%
        </div>
        <div class="text-xs text-[#5B677A] flex items-center justify-between gap-2">
          <span>Proporsi Naik NTB</span>
          <NuxtLink to="/admin/synthesis" class="text-teal-700 hover:underline font-semibold">
            Buka Sintesis →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- SECTION A: 17-SECTOR GAP DETECTOR -->
    <section v-if="dashData" aria-label="Detector Data Gap 17 Sektor KBLI" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-[#0B1220]">
            Radar Kelengkapan 17 Lapangan Usaha PDRB
          </h2>
          <p class="text-xs text-[#5B677A]">
            Sektor berstatus <strong class="text-rose-700">DATA GAP</strong> belum memiliki berita
            terverifikasi di {{ shortPeriodLabel }} — klik <strong>+ Input Manual</strong> untuk melengkapi.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter status kelengkapan 17 sektor"
          class="inline-flex flex-wrap p-0.5 bg-slate-200/75 rounded-lg border border-slate-200"
        >
          <button
            type="button"
            :aria-pressed="tileFilter === 'all'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="
              tileFilter === 'all'
                ? 'bg-white text-[#0B1220] font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="tileFilter = 'all'"
          >
            Semua ({{ tileCounts.all }})
          </button>
          <button
            type="button"
            :aria-pressed="tileFilter === 'gap'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="
              tileFilter === 'gap'
                ? 'bg-white text-rose-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="tileFilter = 'gap'"
          >
            Data Gap ({{ tileCounts.gap }})
          </button>
          <button
            type="button"
            :aria-pressed="tileFilter === 'thin'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="
              tileFilter === 'thin'
                ? 'bg-white text-amber-800 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="tileFilter = 'thin'"
          >
            Tipis ≤2 ({{ tileCounts.thin }})
          </button>
          <button
            type="button"
            :aria-pressed="tileFilter === 'covered'"
            class="px-2.5 py-1 rounded-md text-xs transition-all"
            :class="
              tileFilter === 'covered'
                ? 'bg-white text-teal-800 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="tileFilter = 'covered'"
          >
            Tercukupi ({{ tileCounts.covered }})
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        <div
          v-for="tile in filteredGapTiles"
          :key="tile.groupCode"
          class="rounded-xl p-4 flex flex-col justify-between gap-3 transition-all"
          :class="
            tile.isGap
              ? 'bg-[#FFFDFD] border border-dashed border-rose-300/90 shadow-xs'
              : 'saas-card saas-card-interactive'
          "
        >
          <div class="space-y-2.5">
            <!-- Two-Tier Header (Fixes clipping on long sector titles) -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="font-mono text-[11px] font-bold px-2 py-0.5 rounded border"
                :class="
                  tile.isGap
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-teal-50 text-teal-800 border-teal-200'
                "
              >
                KBLI {{ tile.groupCode }}
              </span>

              <span
                v-if="tile.isGap"
                class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-bold uppercase tracking-wider"
              >
                DATA GAP
              </span>
              <span
                v-else-if="tile.isThin"
                class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold tabular-nums"
              >
                Tipis • {{ tile.count }}
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold tabular-nums"
              >
                {{ tile.count }} Bukti ({{ tile.sharePercent }}%)
              </span>
            </div>

            <h3 class="text-sm font-bold text-[#0B1220] leading-snug">
              {{ tile.shortName }}
            </h3>

            <p v-if="tile.isGap" class="text-xs text-[#5B677A] leading-relaxed">
              Belum ada berita atau catatan lapangan pada sektor ini di {{ shortPeriodLabel }}.
            </p>
            <div v-else class="space-y-1.5">
              <p
                v-if="tile.latestHeadline"
                class="text-xs text-[#334155] leading-relaxed line-clamp-2"
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

          <div class="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline"
              @click="openManualForSector(tile.primaryKbliCode)"
            >
              <UIcon name="i-lucide-plus-circle" class="w-3.5 h-3.5" />
              <span>Input Manual</span>
            </button>

            <NuxtLink
              :to="`/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&pdrbGroup=${encodeURIComponent(tile.groupCode)}&status=VERIFIED`"
              class="text-xs font-medium text-slate-600 hover:text-[#0B1220] inline-flex items-center gap-1"
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
        <h2 class="text-base font-bold text-[#0B1220]">
          Matriks Silang 17 Sektor KBLI × 6 Komponen Pengeluaran
        </h2>
        <p class="text-xs text-[#5B677A]">
          Klik sel matriks bernilai positif untuk membuka daftar bukti fenomena di Bank Data.
        </p>
      </div>

      <div class="saas-card rounded-xl overflow-hidden">
        <div
          tabindex="0"
          role="region"
          aria-label="Matriks Heatmap 17 Sektor KBLI kali 6 Komponen Pengeluaran PDRB"
          class="saas-table-scroller"
        >
          <table class="w-full text-left border-collapse min-w-[760px]">
            <caption class="sr-only">
              Distribusi silang artikel terverifikasi menurut 17 sektor KBLI dan 6 komponen
              pengeluaran PDRB pada {{ periodLabel }}
            </caption>
            <thead>
              <tr class="border-b border-[#DCE3EC] bg-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" class="px-4 py-3 font-semibold min-w-[240px]">
                  Lapangan Usaha (17 Sektor KBLI)
                </th>
                <th
                  v-for="comp in PDRB_6_EXPENDITURE_LIST"
                  :key="comp.code"
                  scope="col"
                  class="px-3 py-3 font-semibold text-center"
                  :title="comp.official"
                >
                  {{ shortExpHeaders[comp.code] || comp.short }}
                </th>
                <th scope="col" class="px-4 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 text-xs">
              <tr
                v-for="row in dashData.heatmapMatrix"
                :key="row.groupCode"
                class="hover:bg-slate-50/70 transition-colors"
              >
                <th scope="row" class="px-4 py-2.5 font-medium text-[#0B1220] text-left">
                  <span class="font-mono text-[11px] font-bold text-teal-700 mr-1.5">
                    [{{ row.groupCode }}]
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
                    class="inline-flex items-center justify-center w-10 h-7 rounded-md font-mono text-xs tabular-nums transition-colors"
                    :class="heatmapCellClass(row.cells[comp.code] ?? 0)"
                  >
                    {{ row.cells[comp.code] }}
                  </NuxtLink>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-10 h-7 rounded-md font-mono text-xs text-slate-300"
                  >
                    –
                  </span>
                </td>

                <td class="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-[#0B1220]">
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
