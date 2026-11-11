<!-- app/components/public/PublicFilterBar.vue -->
<script setup lang="ts">
import {
  ArticleSourceTypeEnum,
  KbliImpactEnum,
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
} from '#shared/enums/pdrb';
import type { PublicOverviewResponse } from '~/types/sipena';

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

const totalInPeriod = computed(() => props.overview?.kpi.totalVerified ?? 0);

const sectorOptions = computed(() => {
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

const expenditureCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const row of props.overview?.expenditureDistribution ?? []) {
    map.set(row.code, row.count);
  }
  return map;
});

const impactItems = computed(() => {
  const counts = props.overview?.kpi.impactBreakdown.kbli;
  return [
    {
      value: 'EXPANSION',
      label: '↑ Meningkatkan NTB / Riil',
      dotClass: 'bg-emerald-600',
      count: counts?.[KbliImpactEnum.INCREASE_NTB] ?? 0,
    },
    {
      value: 'CONTRACTION',
      label: '↓ Menurunkan NTB / Riil',
      dotClass: 'bg-rose-600',
      count: counts?.[KbliImpactEnum.DECREASE_NTB] ?? 0,
    },
    {
      value: 'PRICE_UP',
      label: '↑ Kenaikan Harga / Deflator',
      dotClass: 'bg-amber-600',
      count: counts?.[KbliImpactEnum.INCREASE_PRICE] ?? 0,
    },
    {
      value: 'PRICE_DOWN',
      label: '↓ Penurunan Harga / Deflator',
      dotClass: 'bg-sky-600',
      count: counts?.[KbliImpactEnum.DECREASE_PRICE] ?? 0,
    },
  ];
});

const sourceButtons = [
  { value: 'ALL', label: 'Semua' },
  { value: ArticleSourceTypeEnum.REGIONAL, label: 'Lokal KTT' },
  { value: ArticleSourceTypeEnum.NATIONAL, label: 'Nasional' },
];
</script>

<template>
  <aside
    aria-label="Filter Fenomena Ekonomi"
    class="flex flex-col gap-5 text-slate-800"
    :class="
      inDrawer
        ? 'w-full'
        : 'w-full lg:w-[280px] lg:sticky lg:top-[76px] shrink-0 self-start lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto saas-scroll bg-[#F8FAFC] border border-[#DCE3EC] shadow-[0_1px_3px_rgba(11,18,32,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] rounded-xl p-4'
    "
  >
    <!-- Header Rail -->
    <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
      <div class="inline-flex items-center gap-1.5">
        <span class="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase">
          Filter Fenomena
        </span>
        <span
          class="bg-teal-950/5 text-teal-800 border border-teal-700/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tabular-nums"
        >
          {{ activeFilterCount > 0 ? `Aktif (${activeFilterCount})` : 'Semua' }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-sans font-medium transition-colors rounded px-1.5 py-1 min-h-6"
        :class="
          activeFilterCount > 0
            ? 'text-teal-700 hover:text-teal-900 hover:bg-white cursor-pointer'
            : 'text-slate-400 cursor-not-allowed'
        "
        :disabled="activeFilterCount === 0"
        @click="emit('reset')"
      >
        <UIcon name="i-lucide-rotate-ccw" class="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>

    <!-- 1. Sumber Berita -->
    <div>
      <span class="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        1. Sumber Berita
      </span>
      <div
        role="group"
        aria-label="Filter Sumber Berita"
        class="grid grid-cols-3 gap-1 p-0.5 bg-slate-200/60 rounded-lg border border-slate-200 text-center"
      >
        <button
          v-for="src in sourceButtons"
          :key="src.value"
          type="button"
          :aria-pressed="sourceType === src.value"
          class="py-1.5 px-1.5 rounded-md font-mono text-[11px] transition-colors whitespace-nowrap"
          :class="
            sourceType === src.value
              ? 'font-bold bg-white text-[#0B1220] shadow-[0_1px_2px_rgba(11,18,32,0.08),0_0_0_1px_rgba(11,18,32,0.06)]'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          "
          @click="emit('update:sourceType', src.value)"
        >
          {{ src.label }}
        </button>
      </div>
    </div>

    <!-- 2. Sektor KBLI (17 Kategori BPS) -->
    <div class="pt-3 border-t border-[#E2E8F0]">
      <label
        :for="inDrawer ? 'drawer-pdrb-group-select' : 'desktop-pdrb-group-select'"
        class="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2"
      >
        2. Sektor KBLI (17 Kategori BPS)
      </label>
      <div class="relative">
        <select
          :id="inDrawer ? 'drawer-pdrb-group-select' : 'desktop-pdrb-group-select'"
          :value="pdrbGroup"
          class="w-full h-9 pl-2.5 pr-8 bg-white text-xs font-sans font-medium text-[#0B1220] border border-[#DCE3EC] rounded-lg hover:border-slate-300 transition-colors cursor-pointer appearance-none shadow-[0_1px_2px_rgba(11,18,32,0.04)]"
          @change="emit('update:pdrbGroup', ($event.target as HTMLSelectElement).value)"
        >
          <option value="ALL">
            Semua Lapangan Usaha ({{ totalInPeriod }})
          </option>
          <option
            v-for="sector in sectorOptions"
            :key="sector.groupCode"
            :value="sector.groupCode"
          >
            {{ sector.groupCode }} • {{ sector.shortName }} ({{ sector.count }})
          </option>
        </select>
        <UIcon
          name="i-lucide-chevron-down"
          class="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>
    </div>

    <!-- 3. Komponen Pengeluaran PDRB (6 Komponen) -->
    <div class="pt-3 border-t border-[#E2E8F0]">
      <span class="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        3. Komponen Pengeluaran PDRB
      </span>
      <div role="group" aria-label="Filter Komponen Pengeluaran PDRB" class="flex flex-col gap-1">
        <button
          type="button"
          :aria-pressed="expenditure === 'ALL'"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors"
          :class="
            expenditure === 'ALL'
              ? 'bg-white text-[#0B1220] font-semibold shadow-[0_1px_2px_rgba(11,18,32,0.06),0_0_0_1px_rgba(15,118,110,0.22)]'
              : 'text-[#334155] hover:text-[#0B1220] hover:bg-white/80 font-medium'
          "
          @click="emit('update:expenditure', 'ALL')"
        >
          <span class="inline-flex items-center gap-2 min-w-0">
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="expenditure === 'ALL' ? 'bg-[#0F766E]' : 'bg-slate-300'"
            />
            <span class="truncate">Semua Pengeluaran</span>
          </span>
          <span
            class="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold tabular-nums shrink-0"
            :class="
              expenditure === 'ALL'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/70'
                : 'text-slate-500'
            "
          >
            {{ totalInPeriod }}
          </span>
        </button>

        <button
          v-for="item in PDRB_6_EXPENDITURE_LIST"
          :key="item.code"
          type="button"
          :aria-pressed="expenditure === item.code"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors"
          :class="
            expenditure === item.code
              ? 'bg-white text-[#0B1220] font-semibold shadow-[0_1px_2px_rgba(11,18,32,0.06),0_0_0_1px_rgba(15,118,110,0.22)]'
              : 'text-[#334155] hover:text-[#0B1220] hover:bg-white/80 font-medium'
          "
          :title="item.official"
          @click="emit('update:expenditure', expenditure === item.code ? 'ALL' : item.code)"
        >
          <span class="truncate pr-2">{{ item.short }}</span>
          <span
            class="font-mono text-[11px] tabular-nums shrink-0"
            :class="
              expenditure === item.code
                ? 'px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/70 font-bold'
                : 'text-slate-500'
            "
          >
            {{ expenditureCountMap.get(item.code) ?? 0 }}
          </span>
        </button>
      </div>
    </div>

    <!-- 4. Arah Dampak Makro -->
    <div class="pt-3 border-t border-[#E2E8F0]">
      <span class="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        4. Arah Dampak Makro
      </span>
      <div role="group" aria-label="Filter Arah Dampak Makro" class="flex flex-col gap-1">
        <button
          type="button"
          :aria-pressed="impactMacro === 'ALL'"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors"
          :class="
            impactMacro === 'ALL'
              ? 'bg-white text-[#0B1220] font-semibold shadow-[0_1px_2px_rgba(11,18,32,0.06),0_0_0_1px_rgba(15,118,110,0.22)]'
              : 'text-[#334155] hover:text-[#0B1220] hover:bg-white/80 font-medium'
          "
          @click="emit('update:impactMacro', 'ALL')"
        >
          <span class="inline-flex items-center gap-2 min-w-0">
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="impactMacro === 'ALL' ? 'bg-[#0F766E]' : 'bg-slate-300'"
            />
            <span class="truncate">Semua Dampak</span>
          </span>
          <span
            class="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold tabular-nums shrink-0"
            :class="
              impactMacro === 'ALL'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/70'
                : 'text-slate-500'
            "
          >
            {{ totalInPeriod }}
          </span>
        </button>

        <button
          v-for="item in impactItems"
          :key="item.value"
          type="button"
          :aria-pressed="impactMacro === item.value"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors"
          :class="
            impactMacro === item.value
              ? 'bg-white text-[#0B1220] font-semibold shadow-[0_1px_2px_rgba(11,18,32,0.06),0_0_0_1px_rgba(15,118,110,0.22)]'
              : 'text-[#334155] hover:text-[#0B1220] hover:bg-white/80 font-medium'
          "
          @click="emit('update:impactMacro', impactMacro === item.value ? 'ALL' : item.value)"
        >
          <span class="inline-flex items-center gap-1.5 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="item.dotClass" />
            <span class="truncate">{{ item.label }}</span>
          </span>
          <span
            class="font-mono text-[11px] tabular-nums shrink-0"
            :class="
              impactMacro === item.value
                ? 'px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/70 font-bold'
                : 'text-slate-500'
            "
          >
            {{ item.count }}
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>
