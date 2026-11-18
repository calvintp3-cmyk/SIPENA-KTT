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
    dateFrom?: string;
    dateTo?: string;
    activeFilterCount: number;
    inDrawer?: boolean;
  }>(),
  {
    pdrbGroups: () => [],
    expenditures: () => [],
    dateFrom: '',
    dateTo: '',
    inDrawer: false,
  },
);

const emit = defineEmits<{
  'update:sourceType': [value: string];
  'update:pdrbGroups': [value: string[]];
  'update:expenditures': [value: string[]];
  'update:impactMacro': [value: string];
  'update:dateFrom': [value: string];
  'update:dateTo': [value: string];
  reset: [];
}>();

const { searchInput } = usePublicPortalState();
const { getExpenditureColorTheme } = usePdrbLabels();

const sectorSearchQuery = ref('');

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
    activeClass: 'border-[#0B3D2E] bg-[#E3F0EA] text-[#0B3D2E] ring-1 ring-[#0B3D2E]/20',
    dotClass: 'bg-[#0B3D2E]',
  },
  {
    value: 'CONTRACTION',
    label: 'Aktivitas Turun',
    subLabel: 'Penurunan output',
    icon: 'i-lucide-trending-down',
    activeClass: 'border-[#C8553D] bg-[#FBECE8] text-[#C8553D] ring-1 ring-[#C8553D]/20',
    dotClass: 'bg-[#C8553D]',
  },
  {
    value: 'PRICE_UP',
    label: 'Harga Naik',
    subLabel: 'Inflasi & tarif',
    icon: 'i-lucide-arrow-up-right',
    activeClass: 'border-[#B45309] bg-[#FEF7E6] text-[#B45309] ring-1 ring-[#B45309]/20',
    dotClass: 'bg-[#B45309]',
  },
  {
    value: 'PRICE_DOWN',
    label: 'Harga Turun',
    subLabel: 'Deflasi & diskon',
    icon: 'i-lucide-arrow-down-right',
    activeClass: 'border-[#0F766E] bg-[#E6F4F2] text-[#0F766E] ring-1 ring-[#0F766E]/20',
    dotClass: 'bg-[#0F766E]',
  },
];

function setQuickDateRange(days: number) {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const fromStr = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
  emit('update:dateFrom', fromStr);
  emit('update:dateTo', toStr);
}

function setThisMonthRange() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const toStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  emit('update:dateFrom', fromStr);
  emit('update:dateTo', toStr);
}
</script>

<template>
  <aside
    aria-label="Filter Portal Fenomena Ekonomi"
    class="flex flex-col text-[#141917]"
    :class="
      inDrawer
        ? 'w-full gap-4'
        : 'w-full lg:w-[310px] h-full overflow-hidden bg-white border border-[#141917]/[0.08] shadow-[0_1px_3px_rgba(20,25,23,0.03),0_6px_16px_-4px_rgba(20,25,23,0.04)] rounded-2xl flex flex-col'
    "
  >
    <!-- Filter Card Header Bar -->
    <div class="px-4 py-3.5 border-b border-[#141917]/[0.08] bg-[#F6F5F1] flex items-center justify-between shrink-0">
      <div class="inline-flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] flex items-center justify-center">
          <UIcon name="i-solar-filter-bold-duotone" class="w-4 h-4" />
        </div>
        <div>
          <span class="text-xs font-bold text-[#141917] block leading-tight font-display">
            Filter Terpadu
          </span>
          <span class="text-[10px] text-[#737B76] font-medium leading-tight font-mono">
            {{ activeFilterCount > 0 ? `${activeFilterCount} kriteria aktif` : 'Semua fenomena' }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors rounded-lg px-2 py-1"
        :class="
          activeFilterCount > 0
            ? 'text-[#0B3D2E] hover:underline cursor-pointer'
            : 'text-[#737B76] cursor-not-allowed opacity-50'
        "
        :disabled="activeFilterCount === 0"
        @click="emit('reset')"
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
        <label for="filter-sidebar-search" class="block text-[11px] font-bold text-[#141917] font-display">
          Cari Kata Kunci
        </label>
        <UInput
          id="filter-sidebar-search"
          v-model="searchInput"
          type="search"
          size="xs"
          leading-icon="i-solar-magnifer-line-duotone"
          placeholder="Cari komoditas, proyek, lokasi..."
          class="w-full"
        />
      </div>

      <!-- Filter Rentang Tanggal Rilis Kustom -->
      <div class="space-y-2 pt-3 border-t border-[#141917]/[0.08]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="block text-[11px] font-bold text-[#141917] font-display">
              Rentang Tanggal
            </span>
            <span
              v-if="dateFrom || dateTo"
              class="px-1.5 py-0.2 rounded-full bg-[#0B3D2E] text-white text-[9px] font-bold font-mono"
            >
              Aktif
            </span>
          </div>
          <button
            v-if="dateFrom || dateTo"
            type="button"
            class="text-[10px] font-semibold text-[#0B3D2E] hover:underline cursor-pointer font-display"
            @click="emit('update:dateFrom', ''); emit('update:dateTo', '');"
          >
            Reset
          </button>
        </div>

        <!-- Quick Preset Chips -->
        <div class="grid grid-cols-3 gap-1 text-[10px] font-mono">
          <button
            type="button"
            class="px-1.5 py-1 rounded-md bg-[#ECEAE2] hover:bg-[#E3F0EA] hover:text-[#0B3D2E] text-[#4A524E] border border-[#141917]/10 transition-colors cursor-pointer text-center font-medium"
            @click="setQuickDateRange(7)"
          >
            7 Hari
          </button>
          <button
            type="button"
            class="px-1.5 py-1 rounded-md bg-[#ECEAE2] hover:bg-[#E3F0EA] hover:text-[#0B3D2E] text-[#4A524E] border border-[#141917]/10 transition-colors cursor-pointer text-center font-medium"
            @click="setQuickDateRange(30)"
          >
            30 Hari
          </button>
          <button
            type="button"
            class="px-1.5 py-1 rounded-md bg-[#ECEAE2] hover:bg-[#E3F0EA] hover:text-[#0B3D2E] text-[#4A524E] border border-[#141917]/10 transition-colors cursor-pointer text-center font-medium"
            @click="setThisMonthRange"
          >
            Bulan Ini
          </button>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <div class="space-y-1">
            <label for="filter-date-from" class="text-[10px] font-medium text-[#737B76] block">Dari Tanggal</label>
            <UInput
              id="filter-date-from"
              :model-value="dateFrom"
              type="date"
              size="xs"
              leading-icon="i-solar-calendar-linear"
              class="w-full font-mono text-[11px]"
              @update:model-value="(val: string) => emit('update:dateFrom', val)"
            />
          </div>
          <div class="space-y-1">
            <label for="filter-date-to" class="text-[10px] font-medium text-[#737B76] block">Sampai Tanggal</label>
            <UInput
              id="filter-date-to"
              :model-value="dateTo"
              type="date"
              size="xs"
              leading-icon="i-solar-calendar-linear"
              class="w-full font-mono text-[11px]"
              @update:model-value="(val: string) => emit('update:dateTo', val)"
            />
          </div>
        </div>
      </div>

      <!-- Sumber Berita & Liputan: Semua | Lokal | Nasional -->
      <div class="space-y-1.5 pt-3 border-t border-[#141917]/[0.08]">
        <span class="block text-[11px] font-bold text-[#141917]">
          Cakupan Sumber
        </span>
        <div
          role="group"
          aria-label="Filter Sumber Berita"
          class="grid grid-cols-3 gap-1 p-1 bg-[#ECEAE2] rounded-xl border border-[#141917]/10 text-center"
        >
          <button
            v-for="src in sourceButtons"
            :key="src.value"
            type="button"
            :aria-pressed="sourceType === src.value"
            class="py-1 px-1 rounded-lg text-[10px] transition-all whitespace-nowrap cursor-pointer"
            :class="
              sourceType === src.value
                ? 'font-bold bg-[#0B3D2E] text-white shadow-2xs'
                : 'text-[#4A524E] hover:text-[#141917] font-medium'
            "
            @click="emit('update:sourceType', src.value)"
          >
            {{ src.label }}
          </button>
        </div>
      </div>

      <!-- Arah Dinamika Ekonomi (2x2 Bento Chips) -->
      <div class="space-y-1.5 pt-3 border-t border-[#141917]/[0.08]">
        <div class="flex items-center justify-between">
          <span class="block text-[11px] font-bold text-[#141917]">
            Arah Dinamika
          </span>
          <button
            v-if="impactMacro !== 'ALL'"
            type="button"
            class="text-[10px] font-semibold text-[#0B3D2E] hover:underline cursor-pointer"
            @click="emit('update:impactMacro', 'ALL')"
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
                : 'bg-white border-[#141917]/10 hover:border-[#0B3D2E]/40 hover:bg-[#F6F5F1] text-[#141917]'
            "
            @click="emit('update:impactMacro', impactMacro === chip.value ? 'ALL' : chip.value)"
          >
            <div class="flex items-center justify-between gap-1">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="chip.dotClass" />
              <UIcon :name="chip.icon" class="w-3.5 h-3.5 text-[#737B76]" />
            </div>
            <div>
              <div class="font-bold text-[11px] leading-tight">
                {{ chip.label }}
              </div>
              <div class="text-[9px] text-[#737B76] leading-tight">
                {{ chip.subLabel }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Sektor Lapangan Usaha (Multi-Select Checklist Terbuka) -->
      <div class="space-y-2 pt-3 border-t border-[#141917]/[0.08]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="block text-[11px] font-bold text-[#141917]">
              Lapangan Usaha
            </span>
            <span
              v-if="pdrbGroups.length > 0"
              class="px-1.5 py-0.2 rounded-full bg-[#0B3D2E] text-white text-[9px] font-bold tabular-nums font-mono"
            >
              {{ pdrbGroups.length }}
            </span>
          </div>
          <button
            v-if="pdrbGroups.length > 0"
            type="button"
            class="text-[10px] font-semibold text-[#0B3D2E] hover:underline cursor-pointer"
            @click="clearPdrbGroups"
          >
            Reset
          </button>
        </div>

        <!-- Mini Search Sektor -->
        <div class="relative">
          <UIcon
            name="i-solar-magnifer-line-duotone"
            class="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#737B76] pointer-events-none"
          />
          <input
            v-model="sectorSearchQuery"
            type="search"
            placeholder="Saring sektor A-U..."
            class="w-full h-6.5 pl-6 pr-5 bg-[#F6F5F1] text-[11px] text-[#141917] placeholder:text-[#737B76] rounded-md border border-[#141917]/10 focus:bg-white focus:border-[#0B3D2E] focus:outline-none"
          >
          <button
            v-if="sectorSearchQuery"
            type="button"
            class="absolute right-1 top-1/2 -translate-y-1/2 text-[#737B76] hover:text-[#141917]"
            @click="sectorSearchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-2.5 h-2.5" />
          </button>
        </div>

        <!-- Checklist List Container -->
        <div
          role="group"
          aria-label="Daftar Checklist Lapangan Usaha"
          class="max-h-52 overflow-y-auto saas-scroll space-y-1 pr-1 border border-[#141917]/[0.08] rounded-xl p-1 bg-[#F6F5F1]"
        >
          <button
            v-for="sector in filteredSectors"
            :key="sector.groupCode"
            type="button"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group"
            :class="
              pdrbGroups.includes(sector.groupCode)
                ? 'bg-white font-semibold text-[#0B3D2E] shadow-2xs border border-[#BBD8CB]'
                : 'hover:bg-white text-[#4A524E] font-normal'
            "
            @click="togglePdrbGroup(sector.groupCode)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-1.5">
              <input
                type="checkbox"
                tabindex="-1"
                :checked="pdrbGroups.includes(sector.groupCode)"
                class="w-3.5 h-3.5 rounded border-[#141917]/20 text-[#0B3D2E] focus:ring-[#0B3D2E] cursor-pointer pointer-events-none shrink-0"
              >
              <span
                class="min-w-6 px-1 h-4.5 rounded text-[9px] font-bold flex items-center justify-center shrink-0 font-mono"
                :class="
                  pdrbGroups.includes(sector.groupCode)
                    ? 'bg-[#0B3D2E] text-white'
                    : 'bg-[#ECEAE2] text-[#141917]'
                "
              >
                {{ sector.groupCode }}
              </span>
              <span class="text-[11px] truncate leading-tight block">
                {{ sector.shortName }}
              </span>
            </div>

            <span
              class="text-[10px] tabular-nums font-semibold shrink-0 font-mono"
              :class="
                sector.count > 0
                  ? pdrbGroups.includes(sector.groupCode)
                    ? 'text-[#0B3D2E]'
                    : 'text-[#141917] font-bold'
                  : 'text-[#737B76]/50'
              "
            >
              {{ sector.count }}
            </span>
          </button>
        </div>
      </div>

      <!-- Kelompok Permintaan & Pengeluaran (Multi-Select Checklist Terbuka) -->
      <div class="space-y-2 pt-3 border-t border-[#141917]/[0.08]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="block text-[11px] font-bold text-[#141917] font-display">
              Kelompok Pengeluaran
            </span>
            <span
              v-if="expenditures.length > 0"
              class="px-1.5 py-0.2 rounded-full bg-[#0B3D2E] text-white text-[9px] font-bold font-mono tabular-nums"
            >
              {{ expenditures.length }}
            </span>
          </div>
          <button
            v-if="expenditures.length > 0"
            type="button"
            class="text-[10px] font-semibold text-[#0B3D2E] hover:underline cursor-pointer font-display"
            @click="clearExpenditures"
          >
            Reset
          </button>
        </div>

        <div
          role="group"
          aria-label="Filter Kelompok Pengeluaran"
          class="space-y-1 border border-[#141917]/[0.08] rounded-xl p-1 bg-[#F6F5F1]"
        >
          <button
            v-for="item in PDRB_6_EXPENDITURE_LIST"
            :key="item.code"
            type="button"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group"
            :class="
              expenditures.includes(item.code)
                ? 'bg-white font-semibold text-[#0B3D2E] shadow-2xs border border-[#BBD8CB]'
                : 'hover:bg-white text-[#4A524E] font-normal'
            "
            :title="item.official"
            @click="toggleExpenditure(item.code)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-1.5">
              <input
                type="checkbox"
                tabindex="-1"
                :checked="expenditures.includes(item.code)"
                class="w-3.5 h-3.5 rounded border-[#141917]/20 text-[#0B3D2E] focus:ring-[#0B3D2E] cursor-pointer pointer-events-none shrink-0"
              >
              <span
                class="w-2 h-2 rounded-full shrink-0 shadow-xs"
                :class="getExpenditureColorTheme(item.code).dotClass"
                :style="{ backgroundColor: getExpenditureColorTheme(item.code).hex }"
              />
              <span class="text-[11px] truncate leading-tight block">
                {{ item.short }}
              </span>
            </div>

            <span
              class="text-[10px] tabular-nums font-semibold shrink-0 font-mono"
              :class="
                (expenditureCountMap.get(item.code) ?? 0) > 0
                  ? expenditures.includes(item.code)
                    ? 'text-[#0B3D2E] font-bold'
                    : 'text-[#141917] font-bold'
                  : 'text-[#737B76]/50'
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
