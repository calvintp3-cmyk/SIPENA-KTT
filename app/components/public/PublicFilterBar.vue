<!-- app/components/public/PublicFilterBar.vue -->
<script setup lang="ts">
import {
  ArticleSourceTypeEnum,
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
} from '#shared/enums/pdrb';
import type {
  Pdrb17DistributionItem,
  PublicOverviewResponse,
  SelectOptionItem,
} from '~/types/sipena';

const props = withDefaults(
  defineProps<{
    overview: PublicOverviewResponse | null;
    sourceType: string;
    pdrbGroup: string;
    expenditure: string;
    impactMacro: string;
    activeFilterCount: number;
    inDrawer?: boolean;
  }>(),
  {
    inDrawer: false,
  },
);

const emit = defineEmits<{
  'update:sourceType': [value: string];
  'update:pdrbGroup': [value: string];
  'update:expenditure': [value: string];
  'update:impactMacro': [value: string];
  reset: [];
}>();

const { searchInput } = usePublicPortalState();
const { getExpenditureColorTheme } = usePdrbLabels();

const kbliSelectId = computed(() =>
  props.inDrawer ? 'filter-kbli-select-mobile' : 'filter-kbli-select-desktop',
);
const kbliLabelId = computed(() =>
  props.inDrawer ? 'filter-kbli-label-mobile' : 'filter-kbli-label-desktop',
);

const totalInPeriod = computed(() => props.overview?.kpi.totalVerified ?? 0);

const sectorOptions = computed<Pdrb17DistributionItem[]>(() => {
  if (props.overview?.pdrb17Distribution?.length) {
    return props.overview.pdrb17Distribution;
  }
  return PDRB_17_SECTORS.map((s) => ({
    groupCode: s.groupCode,
    shortName: s.shortName,
    officialName: s.officialName,
    kbliCodes: [...s.kbliCodes],
    count: 0,
    percentage: 0,
  }));
});

const pdrbSelectItems = computed<SelectOptionItem<string>[]>(() => [
  { label: `Semua Sektor Lapangan Usaha (${totalInPeriod.value})`, value: 'ALL' },
  ...sectorOptions.value.map((sector: Pdrb17DistributionItem) => ({
    label: `${sector.groupCode} • ${sector.shortName} (${sector.count})`,
    value: sector.groupCode,
  })),
]);

const selectedPdrbModel = computed<string>({
  get: () => props.pdrbGroup,
  set: (val: string) => emit('update:pdrbGroup', val),
});

const expenditureCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const row of props.overview?.expenditureDistribution ?? []) {
    map.set(row.code, row.count);
  }
  return map;
});

const sourceButtons = [
  { value: 'ALL', label: 'Semua Sumber' },
  { value: ArticleSourceTypeEnum.REGIONAL, label: 'Lokal KTT' },
  { value: ArticleSourceTypeEnum.NATIONAL, label: 'Dampak Nasional' },
];

const bentoImpactItems = [
  {
    value: 'EXPANSION',
    label: 'Aktivitas Naik',
    subLabel: 'Produksi & volume',
    icon: 'i-lucide-trending-up',
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20',
    dotClass: 'bg-emerald-600',
  },
  {
    value: 'CONTRACTION',
    label: 'Aktivitas Turun',
    subLabel: 'Penurunan output',
    icon: 'i-lucide-trending-down',
    activeClass: 'border-rose-500 bg-rose-50 text-rose-950 ring-1 ring-rose-500/20',
    dotClass: 'bg-rose-600',
  },
  {
    value: 'PRICE_UP',
    label: 'Harga Naik',
    subLabel: 'Inflasi & tarif',
    icon: 'i-lucide-arrow-up-right',
    activeClass: 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500/20',
    dotClass: 'bg-amber-600',
  },
  {
    value: 'PRICE_DOWN',
    label: 'Harga Turun',
    subLabel: 'Deflasi & diskon',
    icon: 'i-lucide-arrow-down-right',
    activeClass: 'border-sky-500 bg-sky-50 text-sky-950 ring-1 ring-sky-500/20',
    dotClass: 'bg-sky-600',
  },
];
</script>

<template>
  <aside
    aria-label="Filter Portal Fenomena Ekonomi"
    class="flex flex-col text-slate-800"
    :class="
      inDrawer
        ? 'w-full gap-4'
        : 'w-full lg:w-[310px] h-full overflow-hidden bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-2xl flex flex-col'
    "
  >
    <!-- Filter Card Header Bar -->
    <div class="px-4 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between shrink-0">
      <div class="inline-flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/70 flex items-center justify-center">
          <UIcon name="i-solar-filter-bold-duotone" class="w-4 h-4" />
        </div>
        <div>
          <span class="text-xs font-bold text-slate-900 block leading-tight">
            Filter Terpadu
          </span>
          <span class="text-[10px] text-slate-600 font-medium leading-tight">
            {{ activeFilterCount > 0 ? `${activeFilterCount} kriteria aktif` : 'Semua fenomena' }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors rounded-lg px-2 py-1"
        :class="
          activeFilterCount > 0
            ? 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100/60 cursor-pointer'
            : 'text-slate-500 cursor-not-allowed opacity-60'
        "
        :disabled="activeFilterCount === 0"
        @click="() => { emit('reset'); }"
      >
        <UIcon name="i-lucide-rotate-ccw" class="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>

    <!-- Scrollable Filter Body -->
    <div
      class="flex-1 min-h-0 overflow-y-auto saas-scroll px-4 py-4 space-y-4 text-xs"
      :class="{ 'p-0': inDrawer }"
    >
      <!-- Quick Keyword Search Field inside Filter Bar -->
      <div class="space-y-1.5">
        <label for="filter-sidebar-search" class="block text-[11px] font-bold text-slate-700">
          Cari Kata Kunci
        </label>
        <div class="relative">
          <UIcon
            name="i-solar-magnifer-line-duotone"
            class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
          <input
            id="filter-sidebar-search"
            v-model="searchInput"
            type="search"
            placeholder="Cari komoditas, proyek, lokasi..."
            class="w-full h-8 pl-8 pr-7 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-900 placeholder:text-slate-600 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
          >
          <button
            v-if="searchInput"
            type="button"
            aria-label="Bersihkan pencarian"
            class="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
            @click="() => { searchInput = ''; }"
          >
            <UIcon name="i-lucide-x" class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Sumber Berita & Liputan -->
      <div class="space-y-1.5 pt-3 border-t border-slate-100">
        <span class="block text-[11px] font-bold text-slate-700">
          Cakupan Sumber
        </span>
        <div
          role="group"
          aria-label="Filter Sumber Berita"
          class="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-center"
        >
          <button
            v-for="src in sourceButtons"
            :key="src.value"
            type="button"
            :aria-pressed="sourceType === src.value"
            class="py-1 px-1 rounded-lg text-[10px] transition-all whitespace-nowrap cursor-pointer"
            :class="
              sourceType === src.value
                ? 'font-bold bg-white text-indigo-700 shadow-2xs border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            "
            @click="() => { emit('update:sourceType', src.value); }"
          >
            {{ src.label }}
          </button>
        </div>
      </div>

      <!-- Arah Dinamika Ekonomi (2x2 Bento Chips) -->
      <div class="space-y-1.5 pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between">
          <span class="block text-[11px] font-bold text-slate-700">
            Arah Dinamika
          </span>
          <button
            v-if="impactMacro !== 'ALL'"
            type="button"
            class="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            @click="() => { emit('update:impactMacro', 'ALL'); }"
          >
            Hapus
          </button>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="chip in bentoImpactItems"
            :key="chip.value"
            type="button"
            :aria-pressed="impactMacro === chip.value"
            class="p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[58px]"
            :class="
              impactMacro === chip.value
                ? chip.activeClass
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
            "
            @click="() => { emit('update:impactMacro', impactMacro === chip.value ? 'ALL' : chip.value); }"
          >
            <div class="flex items-center justify-between gap-1">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="chip.dotClass" />
              <UIcon :name="chip.icon" class="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <div class="font-bold text-[11px] leading-tight">
                {{ chip.label }}
              </div>
              <div class="text-[9px] text-slate-500 leading-tight">
                {{ chip.subLabel }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Sektor Lapangan Usaha -->
      <div class="space-y-1.5 pt-3 border-t border-slate-100">
        <label
          :id="kbliLabelId"
          :for="kbliSelectId"
          class="block text-[11px] font-bold text-slate-700"
        >
          Sektor Lapangan Usaha (KBLI)
        </label>
        <USelectMenu
          :id="kbliSelectId"
          v-model="selectedPdrbModel"
          :items="pdrbSelectItems"
          value-key="value"
          label-key="label"
          :aria-labelledby="kbliLabelId"
          placeholder="Pilih sektor usaha..."
          :search-input="{ placeholder: 'Cari nama sektor...' }"
          leading-icon="i-solar-buildings-2-bold-duotone"
          size="sm"
          class="w-full"
        />
      </div>

      <!-- Kelompok Permintaan & Pengeluaran -->
      <div class="space-y-1.5 pt-3 border-t border-slate-100">
        <span class="block text-[11px] font-bold text-slate-700">
          Kelompok Permintaan
        </span>
        <div role="group" aria-label="Filter Kelompok Permintaan" class="flex flex-col gap-1">
          <button
            type="button"
            :aria-pressed="expenditure === 'ALL'"
            class="w-full h-8 flex items-center justify-between px-2.5 rounded-lg text-[11px] transition-colors cursor-pointer"
            :class="
              expenditure === 'ALL'
                ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            "
            @click="() => { emit('update:expenditure', 'ALL'); }"
          >
            <span class="truncate">Semua Kelompok</span>
            <span class="text-[10px] tabular-nums font-semibold">{{ totalInPeriod }}</span>
          </button>

          <button
            v-for="item in PDRB_6_EXPENDITURE_LIST"
            :key="item.code"
            type="button"
            :aria-pressed="expenditure === item.code"
            class="w-full h-8 flex items-center justify-between px-2.5 rounded-lg text-[11px] transition-colors cursor-pointer"
            :class="
              expenditure === item.code
                ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            "
            :title="item.official"
            @click="() => { emit('update:expenditure', expenditure === item.code ? 'ALL' : item.code); }"
          >
            <span class="inline-flex items-center gap-1.5 truncate pr-2">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getExpenditureColorTheme(item.code).dotClass" />
              <span class="truncate">{{ item.short }}</span>
            </span>
            <span class="text-[10px] tabular-nums font-semibold text-slate-500">
              {{ expenditureCountMap.get(item.code) ?? 0 }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
