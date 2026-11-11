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

const { getKbliLabel } = usePdrbLabels();
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
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    enumKey: KbliImpactEnum.DECREASE_NTB,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.DECREASE_NTB],
    axis: 'Volume Riil / NTB (ADHK)',
    guidance:
      'Penurunan volume produksi, gangguan logistik/cuaca/banjir yang menekan output fisik, penutupan usaha, atau perlambatan aktivitas.',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    enumKey: KbliImpactEnum.INCREASE_PRICE,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.INCREASE_PRICE],
    axis: 'Harga / Implisit Deflator (ADHB)',
    guidance:
      'Kenaikan harga komoditas (TBS sawit, batubara, pangan), tarif angkutan, upah, atau tekanan inflasi sektoral tanpa perubahan volume.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    enumKey: KbliImpactEnum.DECREASE_PRICE,
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.DECREASE_PRICE],
    axis: 'Harga / Implisit Deflator (ADHB)',
    guidance:
      'Penurunan harga jual komoditas acuan, deflasi barang pokok, normalisasi harga pasca-puncak musiman, atau subsidi tarif.',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
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
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    enumKey: ExpenditureImpactEnum.DECREASE_REAL,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.DECREASE_REAL],
    axis: 'Volume Pengeluaran Riil (ADHK)',
    guidance:
      'Penurunan volume belanja masyarakat/OPD, tertundanya investasi/belanja modal, atau menyusutnya volume pengapalan ekspor.',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    enumKey: ExpenditureImpactEnum.INCREASE_DEFLATOR,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.INCREASE_DEFLATOR],
    axis: 'Indeks Harga / Deflator (IHK / IHPB)',
    guidance:
      'Kenaikan biaya beli barang konsumsi, lonjakan harga material proyek PMTB, atau penguatan harga ekspor internasional.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    enumKey: ExpenditureImpactEnum.DECREASE_DEFLATOR,
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.DECREASE_DEFLATOR],
    axis: 'Indeks Harga / Deflator (IHK / IHPB)',
    guidance:
      'Penurunan indeks biaya konsumsi pangan/energi, pelemahan harga barang modal/impor, atau turunnya harga jual ekspor.',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal-700"
        >
          <UIcon name="i-lucide-book-open" class="w-3.5 h-3.5" />
          <span>Standar Klasifikasi Neraca Wilayah BPS RI</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1220] mt-0.5">
          Kamus &amp; Taksonomi PDRB Dua Sisi
        </h1>
        <p class="text-xs sm:text-sm text-[#5B677A] mt-0.5">
          Panduan baku pemetaan 21 huruf KBLI (A–U) ke dalam 17 Kategori Lapangan Usaha, 6 Komponen
          Pengeluaran, dan matriks arah dampak ADHK/ADHB Kabupaten Tana Tidung.
        </p>
      </div>

      <NuxtLink
        :to="`/admin/articles?year=${selectedYear}&quarter=${selectedQuarter}&status=${VerificationStatusEnum.VERIFIED}`"
        class="obsidian-button h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 self-start lg:self-auto shrink-0"
      >
        <UIcon name="i-lucide-database" class="w-3.5 h-3.5 text-teal-300" />
        <span>Buka Bank Data ({{ shortPeriodLabel }})</span>
      </NuxtLink>
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
        <UButton size="xs" color="warning" variant="solid" @click="refreshTelemetry()">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- 3 Summary Architecture Pills -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="saas-card rounded-xl p-4 flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-[#0B1220] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0"
        >
          17
        </div>
        <div>
          <div class="text-xs font-bold text-[#0B1220]">17 Kategori PDRB Lapangan Usaha</div>
          <p class="text-xs text-[#5B677A] mt-0.5 leading-relaxed">
            Menggabungkan 21 huruf KBLI (A–U): huruf <strong>M &amp; N</strong> masuk Jasa
            Perusahaan; huruf <strong>R, S, T &amp; U</strong> masuk Jasa Lainnya.
          </p>
        </div>
      </div>

      <div class="saas-card rounded-xl p-4 flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-teal-700 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0"
        >
          06
        </div>
        <div>
          <div class="text-xs font-bold text-[#0B1220]">6 Komponen PDRB Pengeluaran</div>
          <p class="text-xs text-[#5B677A] mt-0.5 leading-relaxed">
            PK-RT, PK-LNPRT, PK-P, PMTB, Perubahan Inventori, dan Ekspor Bersih Antar Daerah/Luar
            Negeri.
          </p>
        </div>
      </div>

      <div class="saas-card rounded-xl p-4 flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-slate-100 border border-[#DCE3EC] text-[#0B1220] font-mono text-xs font-bold flex items-center justify-center shrink-0"
        >
          2×2
        </div>
        <div>
          <div class="text-xs font-bold text-[#0B1220]">Matriks Arah Dampak Dual-Axis</div>
          <p class="text-xs text-[#5B677A] mt-0.5 leading-relaxed">
            Membedakan pengaruh terhadap <strong>output riil (ADHK)</strong> dan tekanan
            <strong>harga/deflator (ADHB)</strong> di kedua sisi.
          </p>
        </div>
      </div>
    </div>

    <!-- Search & Section Filter Bar -->
    <div class="saas-card rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <label for="taxonomy-search" class="sr-only">
          Cari kode KBLI, sektor PDRB, sinyal, atau komponen pengeluaran
        </label>
        <UIcon
          name="i-lucide-search"
          class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          id="taxonomy-search"
          v-model="searchQuery"
          type="search"
          placeholder="Cari kode KBLI (mis. M, A, PMTB), sektor, atau sinyal..."
          class="w-full h-9 pl-9 pr-8 rounded-lg border border-[#DCE3EC] bg-[#F8FAFC] focus:bg-white text-xs text-[#0B1220] placeholder:text-slate-400 focus:border-teal-700 transition-colors"
        />
        <button
          v-if="searchQuery"
          type="button"
          aria-label="Hapus pencarian taksonomi"
          class="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-6 min-h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700"
          @click="searchQuery = ''"
        >
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        role="group"
        aria-label="Filter bagian kamus taksonomi"
        class="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-[#DCE3EC]"
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
          class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
          :class="
            activeTab === tab.id
              ? 'bg-white text-[#0B1220] shadow-xs border border-[#DCE3EC]'
              : 'text-[#5B677A] hover:text-[#0B1220]'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Section 1: 17 Kategori Lapangan Usaha (21 KBLI) -->
    <section v-if="activeTab === 'all' || activeTab === 'kbli'" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-[#0B1220]">
          A. 17 Kategori PDRB Lapangan Usaha (KBLI 21 Huruf A–U)
        </h2>
        <div class="flex items-center gap-2 font-mono text-xs tabular-nums text-[#5B677A]">
          <span
            v-if="dashData"
            class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-semibold"
          >
            {{ dashData.kpi.coveredSectors }}/{{ dashData.kpi.totalSectors }} tercakup • {{ shortPeriodLabel }}
          </span>
          <span>{{ filteredSectors.length }} / {{ PDRB_17_SECTORS.length }} kategori</span>
        </div>
      </div>

      <div
        v-if="filteredSectors.length === 0"
        class="saas-card rounded-xl p-8 text-center text-sm text-[#5B677A]"
      >
        Tidak ada kategori Lapangan Usaha yang cocok dengan "{{ searchQuery }}".
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article
          v-for="sector in filteredSectors"
          :key="sector.groupCode"
          class="saas-card rounded-xl p-5 flex flex-col justify-between gap-3.5"
        >
          <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5 min-w-0">
                <span
                  class="px-2 py-1 rounded-md bg-[#0B1220] text-white font-mono text-xs font-bold shrink-0"
                >
                  {{ sector.groupCode }}
                </span>
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-[#0B1220] leading-snug">
                    {{ sector.officialName }}
                  </h3>
                  <div v-if="sector.shortName !== sector.officialName" class="text-[11px] text-[#5B677A]">
                    Label ringkas: {{ sector.shortName }}
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                <span
                  v-if="sectorTileMap.get(sector.groupCode)"
                  class="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums"
                  :class="
                    sectorTileMap.get(sector.groupCode)!.isGap
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : sectorTileMap.get(sector.groupCode)!.isThin
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  "
                  :title="`Cakupan ${periodLabel}`"
                >
                  {{
                    sectorTileMap.get(sector.groupCode)!.isGap
                      ? 'DATA GAP'
                      : sectorTileMap.get(sector.groupCode)!.isThin
                        ? `Tipis • ${sectorTileMap.get(sector.groupCode)!.count}`
                        : `${sectorTileMap.get(sector.groupCode)!.count} Bukti`
                  }}
                </span>
                <span
                  class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                >
                  {{ sector.kbliCodes.length }} huruf KBLI
                </span>
              </div>
            </div>

            <p class="text-xs text-[#334155] leading-relaxed">
              {{ sector.description }}
            </p>

            <!-- Detailed KBLI letter breakdown for multi-letter categories -->
            <div v-if="sector.kbliCodes.length > 1" class="space-y-1 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC] p-2.5">
              <div class="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rincian Huruf KBLI yang Digabung:
              </div>
              <div
                v-for="kCode in sector.kbliCodes"
                :key="kCode"
                class="flex items-baseline gap-1.5 text-[11px] text-slate-700"
              >
                <span class="font-mono font-bold text-teal-700 shrink-0">[{{ kCode }}]</span>
                <span>{{ getKbliLabel(kCode, false) }}</span>
              </div>
            </div>

            <div class="rounded-lg bg-teal-50/50 border border-teal-200/70 px-3 py-2 text-[11px] text-teal-950 leading-relaxed">
              <span class="font-bold text-teal-800">Sinyal Khas KTT: </span>
              {{ sector.typicalSignals }}
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
            <span class="font-mono text-[11px] text-[#5B677A]">
              Kode KBLI: {{ sector.kbliCodes.join(', ') }}
            </span>

            <NuxtLink
              :to="`/admin/articles?pdrbGroup=${encodeURIComponent(sector.groupCode)}&year=${selectedYear}&quarter=${selectedQuarter}&status=${VerificationStatusEnum.VERIFIED}`"
              class="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
            >
              <span>Arsip Sektor [{{ sector.groupCode }}]</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <!-- Section 2: 6 Komponen Pengeluaran -->
    <section v-if="activeTab === 'all' || activeTab === 'expenditure'" class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-[#0B1220]">
          B. 6 Komponen PDRB Menurut Pengeluaran
        </h2>
        <span class="font-mono text-xs tabular-nums text-[#5B677A]">
          {{ filteredExpenditures.length }} / {{ PDRB_6_EXPENDITURE_LIST.length }} komponen
        </span>
      </div>

      <div
        v-if="filteredExpenditures.length === 0"
        class="saas-card rounded-xl p-8 text-center text-sm text-[#5B677A]"
      >
        Tidak ada komponen pengeluaran yang cocok dengan "{{ searchQuery }}".
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <article
          v-for="comp in filteredExpenditures"
          :key="comp.code"
          class="saas-card rounded-xl p-5 flex flex-col justify-between gap-3"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span
                class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[11px] font-bold"
              >
                {{ comp.code }}
              </span>
              <div class="flex items-center gap-1.5">
                <span
                  v-if="dashData"
                  class="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums"
                  :class="
                    (expenditureCountMap.get(comp.code) ?? 0) === 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  "
                >
                  {{
                    (expenditureCountMap.get(comp.code) ?? 0) === 0
                      ? 'DATA GAP'
                      : `${expenditureCountMap.get(comp.code)} Bukti`
                  }}
                </span>
                <span class="text-[11px] font-semibold text-[#5B677A]">{{ comp.short }}</span>
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#0B1220] leading-snug">
              {{ comp.official }}
            </h3>
            <p class="text-xs text-[#334155] leading-relaxed">
              {{ comp.description }}
            </p>
          </div>

          <div class="pt-2.5 border-t border-slate-100 flex justify-end">
            <NuxtLink
              :to="`/admin/articles?expenditure=${encodeURIComponent(comp.code)}&year=${selectedYear}&quarter=${selectedQuarter}&status=${VerificationStatusEnum.VERIFIED}`"
              class="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
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
        <h2 class="text-sm font-bold text-[#0B1220]">
          C. Matriks Klasifikasi Arah Dampak Ekonomi (ADHK vs ADHB)
        </h2>
        <p class="text-xs text-[#5B677A] mt-0.5">
          Acuan pengisian kolom Dampak KBLI dan Dampak Pengeluaran pada Review Harian serta verifikasi AI Gemini Flash.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Dampak KBLI -->
        <div class="saas-card rounded-xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[#DCE3EC] bg-[#F8FAFC]">
            <h3 class="text-xs font-bold uppercase tracking-wider font-mono text-[#0B1220]">
              1. Dampak Sisi Lapangan Usaha (KBLI)
            </h3>
          </div>
          <div class="divide-y divide-slate-100">
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
                <span class="font-mono text-[10px] font-semibold text-slate-500">
                  {{ item.axis }}
                </span>
              </div>
              <p class="text-xs text-[#334155] leading-relaxed">{{ item.guidance }}</p>
            </div>
          </div>
        </div>

        <!-- Dampak Pengeluaran -->
        <div class="saas-card rounded-xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-[#DCE3EC] bg-[#F8FAFC]">
            <h3 class="text-xs font-bold uppercase tracking-wider font-mono text-[#0B1220]">
              2. Dampak Sisi Pengeluaran &amp; Deflator
            </h3>
          </div>
          <div class="divide-y divide-slate-100">
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
                <span class="font-mono text-[10px] font-semibold text-slate-500">
                  {{ item.axis }}
                </span>
              </div>
              <p class="text-xs text-[#334155] leading-relaxed">{{ item.guidance }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
