<!-- app/pages/admin/taxonomy.vue -->
<script setup lang="ts">
import {
  EXPENDITURE_IMPACT_LABELS,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KBLI_CATEGORY_META,
  KBLI_IMPACT_LABELS,
  KbliCategoryEnum,
  KbliImpactEnum,
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
  VerificationStatusEnum,
  type ExpenditureComponentMeta,
  type Pdrb17SectorMeta,
} from '#shared/enums/pdrb';
import type { AdminDashboardResponse, DashboardGapTileItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { getKbliLabel, getKbliClusterTheme, getExpenditureColorTheme } = usePdrbLabels();
const { selectedYear, selectedQuarter, periodLabel, shortPeriodLabel, registerAvailableYears } =
  useAdminPeriod();

const telemetryQuery = computed(() => ({
  year: selectedYear.value,
  quarter: selectedQuarter.value,
}));

const {
  data: dashData,
  error: telemetryError,
  refresh: refreshTelemetry,
} = await useFetch<AdminDashboardResponse>('/api/admin/analytics/dashboard', {
  query: telemetryQuery,
  watch: [telemetryQuery],
  credentials: 'include',
});

watchEffect(() => {
  if (dashData.value?.availableYears?.length) {
    registerAvailableYears(dashData.value.availableYears);
  }
});

const sectorTileMap = computed<Map<string, DashboardGapTileItem>>(() => {
  const map = new Map<string, DashboardGapTileItem>();
  for (const tile of dashData.value?.gapTiles ?? []) {
    map.set(tile.groupCode, tile);
  }
  return map;
});

const expenditureCountMap = computed<Map<ExpenditureComponentEnum, number>>(() => {
  const map = new Map<ExpenditureComponentEnum, number>();
  for (const row of dashData.value?.heatmapMatrix ?? []) {
    for (const comp of PDRB_6_EXPENDITURE_LIST) {
      map.set(comp.code, (map.get(comp.code) ?? 0) + (row.cells[comp.code] ?? 0));
    }
  }
  return map;
});

const searchQuery = ref('');
const activeTab = ref<'all' | 'kbli' | 'expenditure' | 'impact'>('all');

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase());

const filteredSectors = computed<Pdrb17SectorMeta[]>(() => {
  const allSectors: Pdrb17SectorMeta[] = [...PDRB_17_SECTORS];
  const q = normalizedSearch.value;
  if (!q) return allSectors;

  return allSectors.filter((sector: Pdrb17SectorMeta) => {
    const codeMatch =
      sector.groupCode.toLowerCase().includes(q) ||
      sector.kbliCodes.some((code: KbliCategoryEnum) => code.toLowerCase().includes(q)) ||
      sector.kbliCodes.some((code: KbliCategoryEnum) =>
        KBLI_CATEGORY_META[code].name.toLowerCase().includes(q),
      );
    return (
      codeMatch ||
      sector.shortName.toLowerCase().includes(q) ||
      sector.officialName.toLowerCase().includes(q) ||
      sector.description.toLowerCase().includes(q) ||
      sector.typicalSignals.toLowerCase().includes(q)
    );
  });
});

const filteredExpenditures = computed<ExpenditureComponentMeta[]>(() => {
  const allExp: ExpenditureComponentMeta[] = [...PDRB_6_EXPENDITURE_LIST];
  const q = normalizedSearch.value;
  if (!q) return allExp;

  return allExp.filter(
    (comp: ExpenditureComponentMeta) =>
      comp.code.toLowerCase().includes(q) ||
      comp.short.toLowerCase().includes(q) ||
      comp.official.toLowerCase().includes(q) ||
      comp.description.toLowerCase().includes(q),
  );
});

const kbliImpactRows: Array<{
  enumKey: KbliImpactEnum;
  label: string;
  axis: string;
  guidance: string;
  badgeClass: string;
}> = [
  {
    enumKey: KbliImpactEnum.INCREASE_NTB,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.INCREASE_NTB],
    axis: 'Volume Riil / NTB (ADHK)',
    guidance:
      'Kenaikan volume produksi fisik, kapasitas pabrik/kebun, omzet riil, ekspansi unit usaha, atau serapan output lapangan.',
    badgeClass: 'bg-[#E3F0EA] text-[#0B3D2E] border-[#BBD8CB]',
  },
  {
    enumKey: KbliImpactEnum.DECREASE_NTB,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.DECREASE_NTB],
    axis: 'Volume Riil / NTB (ADHK)',
    guidance:
      'Penurunan volume produksi, gangguan logistik/cuaca/banjir yang menekan output fisik, penutupan usaha, atau perlambatan aktivitas.',
    badgeClass: 'bg-[#FBECE8] text-[#C8553D] border-[#F2C9BE]',
  },
  {
    enumKey: KbliImpactEnum.INCREASE_PRICE,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.INCREASE_PRICE],
    axis: 'Harga / Implisit Deflator (ADHB)',
    guidance:
      'Kenaikan harga komoditas (TBS sawit, batubara, pangan), tarif angkutan, upah, atau tekanan inflasi sektoral tanpa perubahan volume.',
    badgeClass: 'bg-[#FEF6EE] text-[#B45309] border-[#F7D3A6]',
  },
  {
    enumKey: KbliImpactEnum.DECREASE_PRICE,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.DECREASE_PRICE],
    axis: 'Harga / Implisit Deflator (ADHB)',
    guidance:
      'Penurunan harga jual komoditas acuan, deflasi barang pokok, normalisasi harga pasca-puncak musiman, atau subsidi tarif.',
    badgeClass: 'bg-[#E8F4F1] text-[#0F766E] border-[#A7D7CF]',
  },
];

const expenditureImpactRows: Array<{
  enumKey: ExpenditureImpactEnum;
  label: string;
  axis: string;
  guidance: string;
  badgeClass: string;
}> = [
  {
    enumKey: ExpenditureImpactEnum.INCREASE_REAL,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.INCREASE_REAL],
    axis: 'Volume Pengeluaran Riil (ADHK)',
    guidance:
      'Peningkatan volume konsumsi rumah tangga/pemerintah, realisasi proyek fisik PMTB, atau kenaikan tonase ekspor komoditas.',
    badgeClass: 'bg-[#E3F0EA] text-[#0B3D2E] border-[#BBD8CB]',
  },
  {
    enumKey: ExpenditureImpactEnum.DECREASE_REAL,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.DECREASE_REAL],
    axis: 'Volume Pengeluaran Riil (ADHK)',
    guidance:
      'Penurunan volume belanja masyarakat/OPD, tertundanya investasi/belanja modal, atau menyusutnya volume pengapalan ekspor.',
    badgeClass: 'bg-[#FBECE8] text-[#C8553D] border-[#F2C9BE]',
  },
  {
    enumKey: ExpenditureImpactEnum.INCREASE_DEFLATOR,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.INCREASE_DEFLATOR],
    axis: 'Indeks Harga / Deflator (IHK / IHPB)',
    guidance:
      'Kenaikan biaya beli barang konsumsi, lonjakan harga material proyek PMTB, atau penguatan harga ekspor internasional.',
    badgeClass: 'bg-[#FEF6EE] text-[#B45309] border-[#F7D3A6]',
  },
  {
    enumKey: ExpenditureImpactEnum.DECREASE_DEFLATOR,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.DECREASE_DEFLATOR],
    axis: 'Indeks Harga / Deflator (IHK / IHPB)',
    guidance:
      'Penurunan indeks biaya konsumsi pangan/energi, pelemahan harga barang modal/impor, atau turunnya harga jual ekspor.',
    badgeClass: 'bg-[#E8F4F1] text-[#0F766E] border-[#A7D7CF]',
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] text-xs font-semibold"
        >
          <UIcon name="i-solar-book-bookmark-bold-duotone" class="w-3.5 h-3.5 text-[#0B3D2E]" />
          <span>Standar Klasifikasi Neraca Wilayah BPS RI</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141917] mt-2 font-display">
          Kamus &amp; Taksonomi PDRB Dua Sisi
        </h1>
        <p class="text-xs sm:text-sm text-[#4A524E] mt-0.5">
          Panduan baku pemetaan 22 huruf KBLI 2025 (A–V) ke dalam 17 Kategori Lapangan Usaha, 6
          Komponen Pengeluaran, dan matriks arah dampak ADHK/ADHB Kabupaten Tana Tidung.
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap self-start lg:self-auto shrink-0">
        <NuxtLink
          to="/admin/kbli"
          class="min-h-9 px-3.5 rounded-xl border border-[#BBD8CB] bg-[#E3F0EA] hover:bg-[#D5E8DF] text-xs font-bold text-[#0B3D2E] inline-flex items-center gap-1.5 transition-colors shadow-2xs font-mono"
        >
          <UIcon name="i-solar-route-bold-duotone" class="w-4 h-4 text-[#0B3D2E]" />
          <span>Matriks Konkordansi 4-Generasi</span>
        </NuxtLink>

        <NuxtLink
          :to="`/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&status=${VerificationStatusEnum.VERIFIED}`"
          class="obs-btn-primary min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
        >
          <UIcon name="i-solar-database-bold-duotone" class="w-4 h-4 text-[#E3F0EA]" />
          <span>Buka Bank Data ({{ shortPeriodLabel }})</span>
        </NuxtLink>
      </div>
    </div>

    <UAlert
      v-if="telemetryError"
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Telemetri cakupan triwulan sementara tidak tersedia"
      description="Referensi taksonomi tetap dapat digunakan; muat ulang untuk menyinkronkan jumlah bukti per sektor."
    >
      <template #actions>
        <UButton size="sm" color="warning" variant="solid" @click="() => { void refreshTelemetry(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- 3 Summary Architecture Pills -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="obs-panel rounded-xl p-4 sm:p-5 flex items-start gap-3.5">
        <div
          class="w-10 h-10 rounded-xl bg-[#0B3D2E] text-white text-xs font-extrabold tabular-nums flex items-center justify-center shrink-0 shadow-2xs font-mono"
        >
          17
        </div>
        <div>
          <div class="text-xs sm:text-sm font-bold text-[#141917]">17 Kategori PDRB Lapangan Usaha</div>
          <p class="text-xs text-[#4A524E] mt-0.5 leading-relaxed">
            Memetakan 22 huruf KBLI 2025 (A–V, PerBPS No. 7/2025): <strong>J &amp; K</strong> masuk
            Informasi &amp; Komunikasi; <strong>N &amp; O</strong> masuk Jasa Perusahaan;
            <strong>S, T, U &amp; V</strong> masuk Jasa Lainnya (termasuk reparasi kendaraan 95).
          </p>
        </div>
      </div>

      <div class="obs-panel rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div
          class="w-10 h-10 rounded-xl bg-[#0B3D2E] text-white text-xs font-extrabold tabular-nums flex items-center justify-center shrink-0 shadow-xs font-mono"
        >
          06
        </div>
        <div>
          <div class="text-xs sm:text-sm font-bold text-[#141917]">6 Komponen PDRB Pengeluaran</div>
          <p class="text-xs text-[#4A524E] mt-0.5 leading-relaxed">
            PK-RT, PK-LNPRT, PK-P, PMTB, Perubahan Inventori, dan Ekspor Bersih Antar Daerah/Luar
            Negeri.
          </p>
        </div>
      </div>

      <div class="obs-panel rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div
          class="w-10 h-10 rounded-xl bg-[#E3F0EA] border border-[#BBD8CB] text-[#0B3D2E] text-xs font-extrabold tabular-nums flex items-center justify-center shrink-0 font-mono"
        >
          2×2
        </div>
        <div>
          <div class="text-xs sm:text-sm font-bold text-[#141917]">Matriks Arah Dampak Dual-Axis</div>
          <p class="text-xs text-[#4A524E] mt-0.5 leading-relaxed">
            Membedakan pengaruh terhadap <strong>output riil (ADHK)</strong> dan tekanan
            <strong>harga/deflator (ADHB)</strong> di kedua sisi.
          </p>
        </div>
      </div>
    </div>

    <!-- Search & Section Filter Bar -->
    <div class="obs-panel rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex-1 max-w-md">
        <label for="taxonomy-search" class="sr-only">
          Cari kode KBLI, sektor PDRB, sinyal, atau komponen pengeluaran
        </label>
        <UInput
          id="taxonomy-search"
          v-model="searchQuery"
          type="search"
          size="sm"
          leading-icon="i-solar-magnifer-line-duotone"
          placeholder="Cari kode KBLI (mis. J, N, T, PMTB), sektor, atau sinyal..."
          class="w-full"
        />
      </div>

      <div
        role="group"
        aria-label="Filter bagian kamus taksonomi"
        class="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#ECEAE2] border border-[#141917]/10"
      >
        <button
          v-for="tab in [
            { id: 'all', label: 'Semua' },
            { id: 'kbli', label: '17 Sektor KBLI' },
            { id: 'expenditure', label: '6 Pengeluaran' },
            { id: 'impact', label: 'Matriks Dampak' },
          ] as const"
          :key="tab.id"
          type="button"
          :aria-pressed="activeTab === tab.id"
          class="min-h-8 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="
            activeTab === tab.id
              ? 'bg-white text-[#0B3D2E] shadow-2xs border border-[#141917]/10'
              : 'text-[#737B76] hover:text-[#141917]'
          "
          @click="() => { activeTab = tab.id; }"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Section 1: 17 Kategori Lapangan Usaha (22 KBLI 2025) -->
    <section v-if="activeTab === 'all' || activeTab === 'kbli'" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-extrabold text-[#141917]">
          A. 17 Kategori PDRB Lapangan Usaha (KBLI 2025 • 22 Huruf A–V)
        </h2>
        <div class="flex items-center gap-2 text-xs tabular-nums text-[#737B76]">
          <span
            v-if="dashData"
            class="px-2.5 py-0.5 rounded-full bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] text-[11px] font-semibold"
          >
            {{ dashData.kpi.coveredSectors }}/{{ dashData.kpi.totalSectors }} tercakup • {{ shortPeriodLabel }}
          </span>
          <span class="font-medium">{{ filteredSectors.length }} / {{ PDRB_17_SECTORS.length }} kategori</span>
        </div>
      </div>

      <div
        v-if="filteredSectors.length === 0"
        class="obs-panel rounded-2xl p-8 text-center text-sm text-[#737B76]"
      >
        Tidak ada kategori Lapangan Usaha yang cocok dengan "{{ searchQuery }}".
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article
          v-for="sector in filteredSectors"
          :key="sector.groupCode"
          class="obs-panel rounded-2xl p-5 flex flex-col justify-between gap-3.5 hover:border-[#141917]/25 transition-all"
        >
          <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5 min-w-0">
                <span
                  class="px-2.5 py-1 rounded-lg border text-xs font-extrabold tabular-nums shrink-0"
                  :class="getKbliClusterTheme(sector.groupCode).pillClass"
                >
                  {{ sector.groupCode }}
                </span>
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-[#141917] leading-snug">
                    {{ sector.officialName }}
                  </h3>
                  <div v-if="sector.shortName !== sector.officialName" class="text-[11px] text-[#737B76]">
                    Label ringkas: {{ sector.shortName }}
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                <span
                  v-if="sectorTileMap.get(sector.groupCode)"
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full border tabular-nums"
                  :class="
                    sectorTileMap.get(sector.groupCode)!.isGap
                      ? 'bg-[#FBECE8] text-[#C8553D] border-[#F2C9BE]'
                      : sectorTileMap.get(sector.groupCode)!.isThin
                        ? 'bg-[#FEF6EE] text-[#B45309] border-[#F7D3A6]'
                        : 'bg-[#E3F0EA] text-[#0B3D2E] border-[#BBD8CB]'
                  "
                  :title="`Cakupan ${periodLabel}`"
                >
                  {{
                    sectorTileMap.get(sector.groupCode)!.isGap
                      ? 'Data Gap'
                      : sectorTileMap.get(sector.groupCode)!.isThin
                        ? `Tipis • ${sectorTileMap.get(sector.groupCode)!.count}`
                        : `${sectorTileMap.get(sector.groupCode)!.count} Bukti`
                  }}
                </span>
                <span
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#ECEAE2] text-[#737B76] border border-[#141917]/10 tabular-nums"
                >
                  {{ sector.kbliCodes.length }} huruf KBLI
                </span>
              </div>
            </div>

            <p class="text-xs text-[#4A524E] leading-relaxed">
              {{ sector.description }}
            </p>

            <!-- Detailed KBLI letter breakdown for multi-letter categories -->
            <div v-if="sector.kbliCodes.length > 1" class="space-y-1 rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-3">
              <div class="text-[11px] font-bold text-[#737B76]">
                Rincian Huruf KBLI yang Digabung:
              </div>
              <div
                v-for="kCode in sector.kbliCodes"
                :key="kCode"
                class="flex items-baseline gap-1.5 text-xs text-[#4A524E]"
              >
                <span class="font-bold text-[#0B3D2E] shrink-0">{{ kCode }} -</span>
                <span>{{ getKbliLabel(kCode, false) }}</span>
              </div>
            </div>

            <div
              class="rounded-xl border px-3 py-2 text-xs text-[#141917] leading-relaxed"
              :class="getKbliClusterTheme(sector.groupCode).softStripClass"
            >
              <span class="font-bold text-[#141917]">Sinyal Khas KTT: </span>
              {{ sector.typicalSignals }}
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-2.5 border-t border-[#141917]/10">
            <span class="text-[11px] font-medium text-[#737B76]">
              Kode KBLI: {{ sector.kbliCodes.join(', ') }}
            </span>

            <NuxtLink
              :to="`/admin/articles?pdrbGroup=${encodeURIComponent(sector.groupCode)}&year=${selectedYear}&quarter=${selectedQuarter}&status=${VerificationStatusEnum.VERIFIED}`"
              class="inline-flex items-center gap-1 min-h-8 px-1 text-xs font-semibold text-[#0B3D2E] hover:text-[#072B20] hover:underline"
            >
              <span>Arsip Sektor {{ sector.groupCode }}</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <!-- Section 2: 6 Komponen Pengeluaran -->
    <section v-if="activeTab === 'all' || activeTab === 'expenditure'" class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-extrabold text-[#141917]">
          B. 6 Komponen PDRB Menurut Pengeluaran
        </h2>
        <span class="text-xs font-medium tabular-nums text-[#737B76]">
          {{ filteredExpenditures.length }} / {{ PDRB_6_EXPENDITURE_LIST.length }} komponen
        </span>
      </div>

      <div
        v-if="filteredExpenditures.length === 0"
        class="obs-panel rounded-2xl p-8 text-center text-sm text-[#737B76]"
      >
        Tidak ada komponen pengeluaran yang cocok dengan "{{ searchQuery }}".
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <article
          v-for="comp in filteredExpenditures"
          :key="comp.code"
          class="obs-panel rounded-2xl p-5 flex flex-col justify-between gap-3 hover:border-[#141917]/25 transition-all"
        >
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold"
                :class="getExpenditureColorTheme(comp.code).pillClass"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="getExpenditureColorTheme(comp.code).dotClass"
                />
                <span>{{ comp.code }}</span>
              </span>
              <div class="flex items-center gap-1.5">
                <span
                  v-if="dashData"
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full border tabular-nums"
                  :class="
                    (expenditureCountMap.get(comp.code) ?? 0) === 0
                      ? 'bg-[#FBECE8] text-[#C8553D] border-[#F2C9BE]'
                      : 'bg-[#E3F0EA] text-[#0B3D2E] border-[#BBD8CB]'
                  "
                >
                  {{
                    (expenditureCountMap.get(comp.code) ?? 0) === 0
                      ? 'Data Gap'
                      : `${expenditureCountMap.get(comp.code)} Bukti`
                  }}
                </span>
                <span class="text-[11px] font-semibold text-[#737B76]">{{ comp.short }}</span>
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#141917] leading-snug">
              {{ comp.official }}
            </h3>
            <p class="text-xs text-[#4A524E] leading-relaxed">
              {{ comp.description }}
            </p>
          </div>

          <div class="pt-2.5 border-t border-[#141917]/10 flex justify-end">
            <NuxtLink
              :to="`/admin/articles?expenditure=${encodeURIComponent(comp.code)}&year=${selectedYear}&quarter=${selectedQuarter}&status=${VerificationStatusEnum.VERIFIED}`"
              class="inline-flex items-center gap-1 min-h-8 px-1 text-xs font-semibold text-[#0B3D2E] hover:text-[#072B20] hover:underline"
            >
              <span>Arsip {{ comp.short }}</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <!-- Section 3: Matriks Arah Dampak Dual-Axis -->
    <section v-if="activeTab === 'all' || activeTab === 'impact'" class="space-y-3">
      <div>
        <h2 class="text-base font-extrabold text-[#141917]">
          C. Matriks Klasifikasi Arah Dampak Ekonomi (ADHK vs ADHB)
        </h2>
        <p class="text-xs text-[#4A524E] mt-0.5">
          Acuan pengisian kolom Dampak KBLI dan Dampak Pengeluaran pada Review Harian serta verifikasi pipeline 6 penyedia Multi-LLM (Gemini, Cerebras, Mistral, Groq, NVIDIA NIM &amp; OpenRouter).
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Dampak KBLI -->
        <div class="obs-panel rounded-2xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[#141917]/10 bg-[#F6F5F1] flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#0B3D2E] shrink-0" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#141917]">
              1. Dampak Sisi Lapangan Usaha (KBLI)
            </h3>
          </div>
          <div class="divide-y divide-[#141917]/10">
            <div
              v-for="item in kbliImpactRows"
              :key="item.enumKey"
              class="p-4 space-y-1.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  :class="item.badgeClass"
                >
                  {{ item.label }}
                </span>
                <span class="text-[11px] font-semibold text-[#737B76]">
                  {{ item.axis }}
                </span>
              </div>
              <p class="text-xs text-[#4A524E] leading-relaxed">{{ item.guidance }}</p>
            </div>
          </div>
        </div>

        <!-- Dampak Pengeluaran -->
        <div class="obs-panel rounded-2xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[#141917]/10 bg-[#F6F5F1] flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#0F766E] shrink-0" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#141917]">
              2. Dampak Sisi Pengeluaran &amp; Deflator
            </h3>
          </div>
          <div class="divide-y divide-[#141917]/10">
            <div
              v-for="item in expenditureImpactRows"
              :key="item.enumKey"
              class="p-4 space-y-1.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  :class="item.badgeClass"
                >
                  {{ item.label }}
                </span>
                <span class="text-[11px] font-semibold text-[#737B76]">
                  {{ item.axis }}
                </span>
              </div>
              <p class="text-xs text-[#4A524E] leading-relaxed">{{ item.guidance }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
