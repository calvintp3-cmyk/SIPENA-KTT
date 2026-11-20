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

function focusSearch() {
  const el = document.getElementById('filter-dock-search') as HTMLInputElement | null;
  if (el) {
    el.focus();
    el.select();
  }
}

function handleDockKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
    e.preventDefault();
    focusSearch();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleDockKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleDockKeydown);
});

function getExpenditureBadge(code: string): string {
  switch (code) {
    case 'PK_RT': return 'PK-RT';
    case 'PK_LNPRT': return 'PK-LNPRT';
    case 'PK_P': return 'PK-P';
    case 'PMTB': return 'PMTB';
    case 'INVENTORY_CHANGE': return 'Inventori';
    case 'NET_EXPORT': return 'Net Ekspor';
    default: return code;
  }
}

function getExpenditureLabelText(code: string): string {
  switch (code) {
    case 'PK_RT': return 'Konsumsi Rumah Tangga';
    case 'PK_LNPRT': return 'Konsumsi LNPRT';
    case 'PK_P': return 'Konsumsi Pemerintah';
    case 'PMTB': return 'Investasi Fisik (PMTB)';
    case 'INVENTORY_CHANGE': return 'Perubahan Inventori';
    case 'NET_EXPORT': return 'Ekspor Neto Antar Daerah';
    default: return code;
  }
}

const kbliPopoverOpen = ref(false);
const expenditurePopoverOpen = ref(false);
const signalPopoverOpen = ref(false);
const sectorSearch = ref('');

const currentSignal = computed(() => macroSignals.find((s) => s.value === props.impactMacro) || macroSignals[0]);

const scopeItems = [
  { value: 'ALL', label: 'Semua' },
  { value: ArticleSourceTypeEnum.REGIONAL, label: 'Lokal Kaltara' },
  { value: ArticleSourceTypeEnum.NATIONAL, label: 'Nasional' },
];

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
  {
    value: 'all',
    label: 'Semua Sinyal',
    icon: 'i-solar-layers-minimalistic-bold-duotone',
  },
  {
    value: 'EXPANSION',
    label: 'Aktivitas Naik',
    icon: 'i-solar-graph-new-up-bold-duotone',
  },
  {
    value: 'CONTRACTION',
    label: 'Aktivitas Turun',
    icon: 'i-solar-graph-down-bold-duotone',
  },
  {
    value: 'PRICE_UP',
    label: 'Harga Naik',
    icon: 'i-solar-course-up-bold-duotone',
  },
  {
    value: 'PRICE_DOWN',
    label: 'Harga Turun',
    icon: 'i-solar-course-down-bold-duotone',
  },
];
</script>

<template>
  <div
    class="sticky top-16 z-30 w-full frosted-header border-y border-border-hairline py-2.5 transition-[background-color,border-color]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 1-Row Slim Dock: Search + Scope + KBLI + Pengeluaran + Sinyal + Filter Lengkap + Reset -->
      <div class="flex flex-wrap lg:flex-nowrap items-center gap-2">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px] sm:min-w-[240px]">
          <label for="filter-dock-search" class="sr-only">Cari sektor, komoditas, atau kata kunci</label>
          <UIcon
            name="i-solar-magnifer-line-duotone"
            class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            id="filter-dock-search"
            v-model="searchInput"
            type="search"
            placeholder="Cari sektor, komoditas, atau kata kunci..."
            class="w-full h-9.5 pl-9 pr-14 bg-white text-xs text-ink-primary placeholder:text-ink-muted rounded-xl border border-border-hairline focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-[color,background-color,border-color,box-shadow]"
          >
          <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              v-if="searchInput"
              type="button"
              aria-label="Hapus kata kunci pencarian"
              class="min-w-8 min-h-8 inline-flex items-center justify-center text-ink-muted hover:text-ink-primary rounded-lg cursor-pointer tactile-press"
              @click="searchInput = ''"
            >
              <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
            </button>
            <button
              v-else
              type="button"
              :title="shortcutTitle"
              aria-label="Fokus pencarian (Ctrl+K)"
              class="text-[10px] text-ink-muted hover:text-brand-primary bg-canvas hover:bg-surface-subtle border border-border-hairline hover:border-brand-border rounded px-1.5 py-0.5 font-mono leading-none transition-colors cursor-pointer"
              @click="focusSearch"
            >
              {{ shortcutKey }}
            </button>
          </div>
        </div>

        <!-- Scope Segmented Control (Sliding Pill) -->
        <div class="hidden sm:inline-flex shrink-0">
          <AppSegmentedControl
            :model-value="sourceType"
            :items="scopeItems"
            aria-label="Filter cakupan berita"
            variant="surface"
            size="sm"
            @update:model-value="(val: any) => emit('update:sourceType', val as string)"
          />
        </div>

        <!-- Popover Trigger: 17 Sektor KBLI -->
        <UPopover v-model:open="kbliPopoverOpen">
          <button
            type="button"
            aria-label="Filter sektor KBLI"
            class="h-9.5 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 tactile-press shadow-2xs"
            :class="pdrbGroups.length > 0 ? 'bg-brand-tint border-brand-border text-brand-primary font-bold' : 'bg-white border-border-hairline text-ink-secondary hover:bg-surface-subtle'"
          >
            <span>KBLI</span>
            <span
              v-if="pdrbGroups.length > 0"
              class="w-4.5 h-4.5 rounded-full bg-brand-primary text-white text-[10px] inline-flex items-center justify-center font-mono font-bold"
            >
              {{ pdrbGroups.length }}
            </span>
            <span v-else class="text-[11px] text-ink-muted">17 Sektor</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-ink-muted" />
          </button>

          <template #content>
            <div class="p-3 w-80 space-y-2.5 bg-white rounded-2xl shadow-xl border border-border-hairline">
              <div class="flex items-center justify-between pb-2 border-b border-[#141917]/[0.06]">
                <span class="text-xs font-bold text-ink-primary">Filter 17 Sektor KBLI</span>
                <button
                  v-if="pdrbGroups.length > 0"
                  type="button"
                  class="text-[11px] text-terracotta-ink hover:underline font-semibold cursor-pointer"
                  @click="emit('update:pdrbGroups', [])"
                >
                  Reset ({{ pdrbGroups.length }})
                </button>
              </div>

              <input
                v-model="sectorSearch"
                type="search"
                aria-label="Cari sektor KBLI"
                placeholder="Cari kode atau nama sektor..."
                class="w-full h-8 px-2.5 bg-canvas text-xs rounded-lg border border-border-hairline focus:border-brand-primary"
              >

              <div class="max-h-60 overflow-y-auto space-y-1">
                <button
                  v-for="s in filteredSectors"
                  :key="s.groupCode"
                  type="button"
                  class="w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  :class="pdrbGroups.includes(s.groupCode) ? 'bg-brand-tint text-brand-primary font-bold' : 'hover:bg-canvas text-ink-primary'"
                  @click="togglePdrbGroup(s.groupCode)"
                >
                  <span class="truncate">
                    <strong class="font-mono mr-1.5">{{ s.groupCode }}</strong>
                    {{ s.shortName }}
                  </span>
                  <span class="font-mono text-[10.5px] text-ink-muted tabular-nums shrink-0">
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
            aria-label="Filter komponen pengeluaran"
            class="h-9.5 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            :class="expenditures.length > 0 ? 'bg-brand-tint border-brand-border text-brand-primary font-bold' : 'bg-white border-border-hairline text-ink-secondary hover:bg-surface-subtle'"
          >
            <span>Pengeluaran</span>
            <span
              v-if="expenditures.length > 0"
              class="w-4.5 h-4.5 rounded-full bg-brand-primary text-white text-[10px] inline-flex items-center justify-center font-mono font-bold"
            >
              {{ expenditures.length }}
            </span>
            <span v-else class="text-[11px] text-ink-muted">6 Komponen</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-ink-muted" />
          </button>

          <template #content>
            <div class="p-3 w-80 space-y-2 bg-white rounded-2xl shadow-xl border border-border-hairline">
              <div class="flex items-center justify-between pb-2 border-b border-[#141917]/[0.06]">
                <span class="text-xs font-bold text-ink-primary">Komponen Pengeluaran PDRB</span>
                <button
                  v-if="expenditures.length > 0"
                  type="button"
                  class="text-[11px] text-terracotta-ink hover:underline font-semibold cursor-pointer"
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
                  class="w-full px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
                  :class="expenditures.includes(item.code) ? 'bg-brand-tint text-brand-primary font-bold' : 'hover:bg-canvas text-ink-primary'"
                  @click="toggleExpenditure(item.code)"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shrink-0"
                      :class="expenditures.includes(item.code) ? 'bg-brand-primary text-white' : 'bg-surface-subtle text-ink-secondary border border-border-hairline'"
                    >
                      {{ getExpenditureBadge(item.code) }}
                    </span>
                    <span class="truncate text-xs" :class="expenditures.includes(item.code) ? 'text-brand-primary font-bold' : 'text-ink-primary font-medium'">
                      {{ getExpenditureLabelText(item.code) }}
                    </span>
                  </div>
                  <UIcon
                    v-if="expenditures.includes(item.code)"
                    name="i-lucide-check"
                    class="w-3.5 h-3.5 text-brand-primary shrink-0"
                  />
                </button>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- Popover Trigger: Arah Sinyal Makro -->
        <UPopover v-model:open="signalPopoverOpen">
          <button
            type="button"
            aria-label="Filter arah sinyal ekonomi makro"
            class="h-9.5 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            :class="impactMacro !== 'all' ? 'bg-brand-tint border-brand-border text-brand-primary font-bold' : 'bg-white border-border-hairline text-ink-secondary hover:bg-surface-subtle'"
          >
            <UIcon :name="currentSignal.icon" class="w-3.5 h-3.5" />
            <span>{{ currentSignal.label }}</span>
            <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-ink-muted" />
          </button>

          <template #content>
            <div class="p-2 w-56 space-y-1 bg-white rounded-2xl shadow-xl border border-border-hairline">
              <button
                v-for="sig in macroSignals"
                :key="sig.value"
                type="button"
                class="w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                :class="impactMacro === sig.value ? 'bg-brand-tint text-brand-primary font-bold' : 'hover:bg-canvas text-ink-primary'"
                @click="() => { emit('update:impactMacro', sig.value); signalPopoverOpen = false; }"
              >
                <div class="flex items-center gap-2">
                  <UIcon :name="sig.icon" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ sig.label }}</span>
                </div>
                <UIcon
                  v-if="impactMacro === sig.value"
                  name="i-lucide-check"
                  class="w-3.5 h-3.5 text-brand-primary shrink-0"
                />
              </button>
            </div>
          </template>
        </UPopover>

        <!-- Deep Filter Slideover Trigger -->
        <button
          type="button"
          aria-label="Buka filter lanjutan"
          class="h-9.5 px-3 rounded-xl border border-border-hairline bg-white text-xs font-semibold text-ink-primary hover:bg-surface-subtle inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          @click="emit('openDrawer')"
        >
          <UIcon name="i-solar-tuning-2-line-duotone" class="w-4 h-4 text-ink-muted" />
          <span class="hidden sm:inline">Filter Lengkap</span>
          <span
            v-if="activeFilterCount > 0"
            class="px-1.5 py-0.2 rounded-full bg-brand-primary text-white text-[10px] font-mono font-bold"
          >
            {{ activeFilterCount }}
          </span>
        </button>

        <!-- Clear All Filters Button (Visible only when filters active) -->
        <button
          v-if="activeFilterCount > 0"
          type="button"
          aria-label="Reset semua filter"
          class="h-9.5 px-2.5 rounded-xl text-xs font-semibold text-terracotta-ink hover:bg-terracotta-surface transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
          @click="emit('reset')"
        >
          <UIcon name="i-lucide-rotate-ccw" class="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  </div>
</template>
