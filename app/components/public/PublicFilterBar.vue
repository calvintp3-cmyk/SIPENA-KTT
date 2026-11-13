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
} from '~/types/sipena';

const props = withDefaults(
  defineProps<{
    overview: PublicOverviewResponse | null;
    sourceType: string;
    pdrbGroups?: string[];
    expenditures?: string[];
    impactMacro: string;
    activeFilterCount: number;
    inDrawer?: boolean;
  }>(),
  {
    pdrbGroups: () => [],
    expenditures: () => [],
    inDrawer: false,
  },
);

const emit = defineEmits<{
  'update:sourceType': [value: string];
  'update:pdrbGroups': [value: string[]];
  'update:expenditures': [value: string[]];
  'update:impactMacro': [value: string];
  reset: [];
}>();

const { searchInput } = usePublicPortalState();
const { getExpenditureColorTheme } = usePdrbLabels();

const sectorSearchQuery = ref('');

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

const filteredSectors = computed(() => {
  const q = sectorSearchQuery.value.trim().toLowerCase();
  if (!q) return sectorOptions.value;
  return sectorOptions.value.filter(
    (s: Pdrb17DistributionItem) =>
      s.groupCode.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      s.officialName.toLowerCase().includes(q),
  );
});

const expenditureCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const row of props.overview?.expenditureDistribution ?? []) {
    map.set(row.code, row.count);
  }
  return map;
});

function togglePdrbGroup(code: string) {
  const current = new Set(props.pdrbGroups);
  if (current.has(code)) {
    current.delete(code);
  } else {
    current.add(code);
  }
  emit('update:pdrbGroups', Array.from(current));
}

function selectAllPdrbGroups() {
  emit(
    'update:pdrbGroups',
    sectorOptions.value.map((s: Pdrb17DistributionItem) => s.groupCode),
  );
}

function clearPdrbGroups() {
  emit('update:pdrbGroups', []);
}

function toggleExpenditure(code: string) {
  const current = new Set(props.expenditures);
  if (current.has(code)) {
    current.delete(code);
  } else {
    current.add(code);
  }
  emit('update:expenditures', Array.from(current));
}

function clearExpenditures() {
  emit('update:expenditures', []);
}

const sourceButtons = [
  { value: 'ALL', label: 'Semua' },
  { value: ArticleSourceTypeEnum.REGIONAL, label: 'Lokal' },
  { value: ArticleSourceTypeEnum.NATIONAL, label: 'Nasional' },
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

      <!-- Sumber Berita & Liputan: Semua | Lokal | Nasional -->
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

      <!-- Sektor Lapangan Usaha (Multi-Select Checklist Terbuka) -->
      <div class="space-y-2 pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="block text-[11px] font-bold text-slate-700">
              Lapangan Usaha
            </span>
            <span
              v-if="pdrbGroups.length > 0"
              class="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold tabular-nums"
            >
              {{ pdrbGroups.length }}
            </span>
          </div>
          <button
            v-if="pdrbGroups.length > 0"
            type="button"
            class="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            @click="clearPdrbGroups"
          >
            Reset
          </button>
        </div>

        <!-- Mini Search Sektor -->
        <div class="relative">
          <UIcon
            name="i-solar-magnifer-line-duotone"
            class="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            v-model="sectorSearchQuery"
            type="search"
            placeholder="Saring sektor A-U..."
            class="w-full h-6.5 pl-6 pr-5 bg-slate-50 text-[11px] text-slate-800 placeholder:text-slate-400 rounded-md border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none"
          >
          <button
            v-if="sectorSearchQuery"
            type="button"
            class="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            @click="sectorSearchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-2.5 h-2.5" />
          </button>
        </div>

        <!-- Checklist List Container (Max Height with scroll) -->
        <div
          role="group"
          aria-label="Daftar Checklist Lapangan Usaha"
          class="max-h-52 overflow-y-auto saas-scroll space-y-1 pr-1 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
        >
          <button
            v-for="sector in filteredSectors"
            :key="sector.groupCode"
            type="button"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group"
            :class="
              pdrbGroups.includes(sector.groupCode)
                ? 'bg-white font-semibold text-indigo-900 shadow-2xs border border-indigo-200/80'
                : 'hover:bg-white text-slate-700 font-normal'
            "
            @click="togglePdrbGroup(sector.groupCode)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-1.5">
              <input
                type="checkbox"
                tabindex="-1"
                :checked="pdrbGroups.includes(sector.groupCode)"
                class="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none shrink-0"
              >
              <span
                class="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
                :class="
                  pdrbGroups.includes(sector.groupCode)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                "
              >
                {{ sector.groupCode }}
              </span>
              <span class="text-[11px] truncate leading-tight block">
                {{ sector.shortName }}
              </span>
            </div>

            <span
              class="text-[10px] tabular-nums font-semibold shrink-0"
              :class="
                sector.count > 0
                  ? pdrbGroups.includes(sector.groupCode)
                    ? 'text-indigo-700'
                    : 'text-slate-700 font-bold'
                  : 'text-slate-400'
              "
            >
              {{ sector.count }}
            </span>
          </button>
        </div>
      </div>

      <!-- Kelompok Permintaan & Pengeluaran (Multi-Select Checklist Terbuka) -->
      <div class="space-y-2 pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="block text-[11px] font-bold text-slate-700">
              Kelompok Pengeluaran
            </span>
            <span
              v-if="expenditures.length > 0"
              class="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold tabular-nums"
            >
              {{ expenditures.length }}
            </span>
          </div>
          <button
            v-if="expenditures.length > 0"
            type="button"
            class="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            @click="clearExpenditures"
          >
            Reset
          </button>
        </div>

        <div
          role="group"
          aria-label="Filter Kelompok Pengeluaran"
          class="space-y-1 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
        >
          <button
            v-for="item in PDRB_6_EXPENDITURE_LIST"
            :key="item.code"
            type="button"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group"
            :class="
              expenditures.includes(item.code)
                ? 'bg-white font-semibold text-indigo-900 shadow-2xs border border-indigo-200/80'
                : 'hover:bg-white text-slate-700 font-normal'
            "
            :title="item.official"
            @click="toggleExpenditure(item.code)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-1.5">
              <input
                type="checkbox"
                tabindex="-1"
                :checked="expenditures.includes(item.code)"
                class="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none shrink-0"
              >
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="getExpenditureColorTheme(item.code).dotClass"
              />
              <span class="text-[11px] truncate leading-tight block">
                {{ item.short }}
              </span>
            </div>

            <span
              class="text-[10px] tabular-nums font-semibold shrink-0"
              :class="
                (expenditureCountMap.get(item.code) ?? 0) > 0
                  ? expenditures.includes(item.code)
                    ? 'text-indigo-700'
                    : 'text-slate-700 font-bold'
                  : 'text-slate-400'
              "
            >
              {{ expenditureCountMap.get(item.code) ?? 0 }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
