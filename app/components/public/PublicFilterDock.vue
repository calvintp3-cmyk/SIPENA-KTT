<!-- app/components/public/PublicFilterDock.vue -->
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
  }>(),
  {
    pdrbGroups: () => [],
    expenditures: () => [],
    dateFrom: '',
    dateTo: '',
  },
);

const emit = defineEmits<{
  'update:sourceType': [value: string];
  'update:pdrbGroups': [value: string[]];
  'update:expenditures': [value: string[]];
  'update:impactMacro': [value: string];
  'update:dateFrom': [value: string];
  'update:dateTo': [value: string];
  openDrawer: [];
  reset: [];
}>();

const { searchInput } = usePublicPortalState();
const { shortcutKey, shortcutTitle } = usePlatformShortcut();

const kbliPopoverOpen = ref(false);
const expenditurePopoverOpen = ref(false);
const sectorSearch = ref('');

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
  const q = sectorSearch.value.trim().toLowerCase();
  if (!q) return sectorOptions.value;
  return sectorOptions.value.filter(
    (s: Pdrb17DistributionItem) =>
      s.groupCode.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      s.officialName.toLowerCase().includes(q),
  );
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

function toggleExpenditure(code: string) {
  const current = new Set(props.expenditures);
  if (current.has(code)) {
    current.delete(code);
  } else {
    current.add(code);
  }
  emit('update:expenditures', Array.from(current));
}

const macroSignals = [
  { value: 'all', label: 'Semua Sinyal' },
  { value: 'output_up', label: '↗ Aktivitas Naik' },
  { value: 'output_down', label: '↘ Aktivitas Turun' },
  { value: 'price_up', label: '↑ Harga Naik' },
  { value: 'price_down', label: '↓ Harga Turun' },
];
</script>

<template>
  <div
    class="sticky top-16 z-30 w-full bg-[#F6F5F1]/92 backdrop-blur-xl border-y border-[#141917]/[0.08] py-3 transition-[background-color,border-color]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
      <!-- Row 1: Search + Scope + Quick Popovers + Drawer Trigger -->
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px] sm:min-w-[260px]">
          <UIcon
            name="i-solar-magnifer-line-duotone"
            class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737B76] pointer-events-none"
          />
          <input
            v-model="searchInput"
            type="search"
            placeholder="Cari sektor, komoditas, atau kata kunci..."
            class="w-full h-9.5 pl-9 pr-14 bg-white text-xs text-[#141917] placeholder:text-[#737B76] rounded-xl border border-[#141917]/10 focus:border-[#0B3D2E] focus:ring-2 focus:ring-[#0B3D2E]/15 transition-[color,background-color,border-color,box-shadow]"
          >
          <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              v-if="searchInput"
              type="button"
              class="w-6 h-6 inline-flex items-center justify-center text-[#737B76] hover:text-[#141917] rounded cursor-pointer"
              @click="searchInput = ''"
            >
              <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
            </button>
            <kbd
              v-else
              :title="shortcutTitle"
              class="text-[10px] text-[#737B76] bg-[#F6F5F1] border border-[#141917]/10 rounded px-1.5 py-0.5 font-mono leading-none pointer-events-none"
            >
              {{ shortcutKey }}
            </kbd>
          </div>
        </div>

        <!-- Scope Segmented Control -->
        <div class="hidden sm:inline-flex items-center p-0.5 rounded-xl bg-[#ECEAE2] text-xs font-semibold shrink-0">
          <button
            type="button"
            class="px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            :class="sourceType === 'ALL' ? 'bg-white text-[#141917] shadow-2xs font-bold' : 'text-[#4A524E] hover:text-[#141917]'"
            @click="emit('update:sourceType', 'ALL')"
          >
            Semua
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            :class="sourceType === ArticleSourceTypeEnum.REGIONAL ? 'bg-white text-[#0B3D2E] shadow-2xs font-bold' : 'text-[#4A524E] hover:text-[#0B3D2E]'"
            @click="emit('update:sourceType', ArticleSourceTypeEnum.REGIONAL)"
          >
            Lokal Kaltara
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            :class="sourceType === ArticleSourceTypeEnum.NATIONAL ? 'bg-white text-[#0B3D2E] shadow-2xs font-bold' : 'text-[#4A524E] hover:text-[#0B3D2E]'"
            @click="emit('update:sourceType', ArticleSourceTypeEnum.NATIONAL)"
          >
            Nasional
          </button>
        </div>

        <!-- Popover Trigger: 17 Sektor KBLI -->
        <UPopover v-model:open="kbliPopoverOpen">
          <button
            type="button"
            class="h-9.5 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            :class="pdrbGroups.length > 0 ? 'bg-[#E3F0EA] border-[#BBD8CB] text-[#0B3D2E] font-bold' : 'bg-white border-[#141917]/10 text-[#4A524E] hover:bg-[#ECEAE2]'"
          >
            <span>KBLI</span>
            <span
              v-if="pdrbGroups.length > 0"
              class="w-4.5 h-4.5 rounded-full bg-[#0B3D2E] text-white text-[10px] inline-flex items-center justify-center font-mono font-bold"
            >
              {{ pdrbGroups.length }}
            </span>
            <span v-else class="text-[11px] text-[#737B76]">17 Sektor</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-[#737B76]" />
          </button>

          <template #content>
            <div class="p-3 w-80 space-y-2.5 bg-white rounded-2xl shadow-xl border border-[#141917]/10">
              <div class="flex items-center justify-between pb-2 border-b border-[#141917]/[0.06]">
                <span class="text-xs font-bold text-[#141917]">Filter 17 Sektor KBLI</span>
                <button
                  v-if="pdrbGroups.length > 0"
                  type="button"
                  class="text-[11px] text-[#C8553D] hover:underline font-semibold cursor-pointer"
                  @click="emit('update:pdrbGroups', [])"
                >
                  Reset ({{ pdrbGroups.length }})
                </button>
              </div>

              <input
                v-model="sectorSearch"
                type="search"
                placeholder="Cari kode atau nama sektor..."
                class="w-full h-8 px-2.5 bg-[#F6F5F1] text-xs rounded-lg border border-[#141917]/10 focus:border-[#0B3D2E]"
              >

              <div class="max-h-60 overflow-y-auto space-y-1">
                <button
                  v-for="s in filteredSectors"
                  :key="s.groupCode"
                  type="button"
                  class="w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  :class="pdrbGroups.includes(s.groupCode) ? 'bg-[#E3F0EA] text-[#0B3D2E] font-bold' : 'hover:bg-[#F6F5F1] text-[#141917]'"
                  @click="togglePdrbGroup(s.groupCode)"
                >
                  <span class="truncate">
                    <strong class="font-mono mr-1.5">{{ s.groupCode }}</strong>
                    {{ s.shortName }}
                  </span>
                  <span class="font-mono text-[10.5px] text-[#737B76] tabular-nums shrink-0">
                    {{ s.count }}
                  </span>
                </button>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- Popover Trigger: 6 Pengeluaran PDRB -->
        <UPopover v-model:open="expenditurePopoverOpen">
          <button
            type="button"
            class="h-9.5 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            :class="expenditures.length > 0 ? 'bg-[#E3F0EA] border-[#BBD8CB] text-[#0B3D2E] font-bold' : 'bg-white border-[#141917]/10 text-[#4A524E] hover:bg-[#ECEAE2]'"
          >
            <span>Pengeluaran</span>
            <span
              v-if="expenditures.length > 0"
              class="w-4.5 h-4.5 rounded-full bg-[#0B3D2E] text-white text-[10px] inline-flex items-center justify-center font-mono font-bold"
            >
              {{ expenditures.length }}
            </span>
            <span v-else class="text-[11px] text-[#737B76]">6 Komponen</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-[#737B76]" />
          </button>

          <template #content>
            <div class="p-3 w-72 space-y-2 bg-white rounded-2xl shadow-xl border border-[#141917]/10">
              <div class="flex items-center justify-between pb-2 border-b border-[#141917]/[0.06]">
                <span class="text-xs font-bold text-[#141917]">Komponen Pengeluaran</span>
                <button
                  v-if="expenditures.length > 0"
                  type="button"
                  class="text-[11px] text-[#C8553D] hover:underline font-semibold cursor-pointer"
                  @click="emit('update:expenditures', [])"
                >
                  Reset ({{ expenditures.length }})
                </button>
              </div>

              <div class="space-y-1">
                <button
                  v-for="item in PDRB_6_EXPENDITURE_LIST"
                  :key="item.code"
                  type="button"
                  class="w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  :class="expenditures.includes(item.code) ? 'bg-[#E3F0EA] text-[#0B3D2E] font-bold' : 'hover:bg-[#F6F5F1] text-[#141917]'"
                  @click="toggleExpenditure(item.code)"
                >
                  <span class="truncate">
                    <strong class="font-mono mr-1.5">{{ item.code }}</strong>
                    {{ item.short }}
                  </span>
                  <UIcon
                    v-if="expenditures.includes(item.code)"
                    name="i-lucide-check"
                    class="w-3.5 h-3.5 text-[#0B3D2E] shrink-0"
                  />
                </button>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- Deep Filter Slideover Trigger -->
        <button
          type="button"
          class="h-9.5 px-3 rounded-xl border border-[#141917]/10 bg-white text-xs font-semibold text-[#141917] hover:bg-[#ECEAE2] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          @click="emit('openDrawer')"
        >
          <UIcon name="i-solar-tuning-2-line-duotone" class="w-4 h-4 text-[#737B76]" />
          <span>Filter Lengkap</span>
          <span
            v-if="activeFilterCount > 0"
            class="px-1.5 py-0.2 rounded-full bg-[#0B3D2E] text-white text-[10px] font-mono font-bold"
          >
            {{ activeFilterCount }}
          </span>
        </button>

        <!-- Clear All Filters Button (Visible only when filters active) -->
        <button
          v-if="activeFilterCount > 0"
          type="button"
          class="h-9.5 px-2.5 rounded-xl text-xs font-semibold text-[#C8553D] hover:bg-[#FBECE8] transition-colors cursor-pointer inline-flex items-center gap-1"
          @click="emit('reset')"
        >
          <UIcon name="i-lucide-rotate-ccw" class="w-3.5 h-3.5" />
          <span>Reset Filter</span>
        </button>
      </div>

      <!-- Row 2: Signal Direction Quick Pills (Macroeconomic Pressure / Expansion) -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
        <span class="text-[11px] font-mono font-semibold text-[#737B76] uppercase tracking-wider mr-1 shrink-0">
          Arah Sinyal:
        </span>
        <button
          v-for="sig in macroSignals"
          :key="sig.value"
          type="button"
          class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
          :class="[
            impactMacro === sig.value
              ? sig.value === 'output_up'
                ? 'bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] font-bold'
                : sig.value === 'price_up'
                  ? 'bg-[#FEF7E6] text-[#B45309] border border-[#F3D89C] font-bold'
                  : sig.value === 'output_down'
                    ? 'bg-[#FBECE8] text-[#C8553D] border border-[#F8D2C9] font-bold'
                    : 'bg-[#0B3D2E] text-white font-bold'
              : 'bg-white border border-[#141917]/10 text-[#4A524E] hover:bg-[#ECEAE2]',
          ]"
          @click="emit('update:impactMacro', sig.value)"
        >
          {{ sig.label }}
        </button>
      </div>
    </div>
  </div>
</template>
