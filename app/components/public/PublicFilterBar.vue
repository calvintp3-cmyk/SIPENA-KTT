<!-- app/components/public/PublicFilterBar.vue -->
<script setup lang="ts">
import {
  ArticleSourceTypeEnum,
  KbliImpactEnum,
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

const { getExpenditureColorTheme } = usePdrbLabels();

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
  { label: `Semua Lapangan Usaha (${totalInPeriod.value})`, value: 'ALL' },
  ...sectorOptions.value.map((sector: Pdrb17DistributionItem) => ({
    label: `${sector.groupCode} - ${sector.shortName} (${sector.count})`,
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

const impactItems = computed(() => {
  const counts = props.overview?.kpi.impactBreakdown.kbli;
  return [
    {
      value: 'EXPANSION',
      label: 'Meningkatkan NTB / Riil',
      icon: 'i-lucide-trending-up',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
      count: counts?.[KbliImpactEnum.INCREASE_NTB] ?? 0,
    },
    {
      value: 'CONTRACTION',
      label: 'Menurunkan NTB / Riil',
      icon: 'i-lucide-trending-down',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-700',
      count: counts?.[KbliImpactEnum.DECREASE_NTB] ?? 0,
    },
    {
      value: 'PRICE_UP',
      label: 'Kenaikan Harga / Deflator',
      icon: 'i-lucide-arrow-up-circle',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700',
      count: counts?.[KbliImpactEnum.INCREASE_PRICE] ?? 0,
    },
    {
      value: 'PRICE_DOWN',
      label: 'Penurunan Harga / Deflator',
      icon: 'i-lucide-arrow-down-circle',
      dotClass: 'bg-sky-500',
      textClass: 'text-sky-700',
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
        : 'w-full lg:w-[290px] lg:sticky lg:top-[84px] shrink-0 self-start lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto saas-scroll bg-white/95 backdrop-blur-md border border-slate-200/85 shadow-[0_10px_28px_-14px_rgba(15,23,42,0.10)] rounded-2xl p-4 sm:p-5'
    "
  >
    <!-- Header Rail -->
    <div class="flex items-center justify-between pb-3 border-b border-slate-200/80">
      <div class="inline-flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <UIcon name="i-solar-filter-bold-duotone" class="w-3.5 h-3.5" />
        </div>
        <span class="text-xs font-bold text-[#0F172A]">
          Filter Fenomena
        </span>
        <span
          class="bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
        >
          {{ activeFilterCount > 0 ? `${activeFilterCount}` : 'Semua' }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors rounded-lg px-2 py-1 min-h-6"
        :class="
          activeFilterCount > 0
            ? 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 cursor-pointer'
            : 'text-slate-400 cursor-not-allowed'
        "
        :disabled="activeFilterCount === 0"
        @click="() => { emit('reset'); }"
      >
        <UIcon name="i-lucide-rotate-ccw" class="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>

    <!-- 1. Sumber Berita -->
    <div>
      <span class="block text-xs font-semibold text-slate-600 mb-2">
        1. Sumber Berita
      </span>
      <div
        role="group"
        aria-label="Filter Sumber Berita"
        class="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-center"
      >
        <button
          v-for="src in sourceButtons"
          :key="src.value"
          type="button"
          :aria-pressed="sourceType === src.value"
          class="py-1.5 px-1.5 rounded-lg text-[11px] transition-all whitespace-nowrap"
          :class="
            sourceType === src.value
              ? 'font-semibold bg-white text-indigo-700 shadow-xs border border-indigo-200/70'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          "
          @click="() => { emit('update:sourceType', src.value); }"
        >
          {{ src.label }}
        </button>
      </div>
    </div>

    <!-- 2. Sektor KBLI (17 Kategori BPS) -->
    <div class="pt-3.5 border-t border-slate-200/75">
      <label class="block text-xs font-semibold text-slate-600 mb-2">
        2. Sektor KBLI (17 Kategori BPS)
      </label>
      <USelectMenu
        v-model="selectedPdrbModel"
        :items="pdrbSelectItems"
        value-key="value"
        label-key="label"
        placeholder="Cari sektor KBLI..."
        :search-input="{ placeholder: 'Ketik kode atau nama sektor...' }"
        leading-icon="i-solar-buildings-2-bold-duotone"
        size="sm"
        class="w-full"
      />
    </div>

    <!-- 3. Komponen Pengeluaran PDRB (6 Komponen) -->
    <div class="pt-3.5 border-t border-slate-200/75">
      <span class="block text-xs font-semibold text-slate-600 mb-2">
        3. Komponen Pengeluaran PDRB
      </span>
      <div role="group" aria-label="Filter Komponen Pengeluaran PDRB" class="flex flex-col gap-1">
        <button
          type="button"
          :aria-pressed="expenditure === 'ALL'"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all"
          :class="
            expenditure === 'ALL'
              ? 'bg-indigo-50/90 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium border border-transparent'
          "
          @click="() => { emit('update:expenditure', 'ALL'); }"
        >
          <span class="inline-flex items-center gap-2 min-w-0">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="expenditure === 'ALL' ? 'bg-indigo-600' : 'bg-slate-300'"
            />
            <span class="truncate">Semua Pengeluaran</span>
          </span>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0"
            :class="
              expenditure === 'ALL'
                ? 'bg-white text-indigo-700 border border-indigo-200'
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
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all"
          :class="
            expenditure === item.code
              ? 'bg-indigo-50/90 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium border border-transparent'
          "
          :title="item.official"
          @click="() => { emit('update:expenditure', expenditure === item.code ? 'ALL' : item.code); }"
        >
          <span class="inline-flex items-center gap-2 min-w-0 pr-2">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="getExpenditureColorTheme(item.code).dotClass"
            />
            <span class="truncate">{{ item.short }}</span>
          </span>
          <span
            class="text-[11px] tabular-nums shrink-0"
            :class="
              expenditure === item.code
                ? 'px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 font-bold'
                : 'text-slate-500 font-medium'
            "
          >
            {{ expenditureCountMap.get(item.code) ?? 0 }}
          </span>
        </button>
      </div>
    </div>

    <!-- 4. Arah Dampak Makro -->
    <div class="pt-3.5 border-t border-slate-200/75">
      <span class="block text-xs font-semibold text-slate-600 mb-2">
        4. Arah Dampak Makro
      </span>
      <div role="group" aria-label="Filter Arah Dampak Makro" class="flex flex-col gap-1">
        <button
          type="button"
          :aria-pressed="impactMacro === 'ALL'"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all"
          :class="
            impactMacro === 'ALL'
              ? 'bg-indigo-50/90 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium border border-transparent'
          "
          @click="() => { emit('update:impactMacro', 'ALL'); }"
        >
          <span class="inline-flex items-center gap-2 min-w-0">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="impactMacro === 'ALL' ? 'bg-indigo-600' : 'bg-slate-300'"
            />
            <span class="truncate">Semua Dampak</span>
          </span>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0"
            :class="
              impactMacro === 'ALL'
                ? 'bg-white text-indigo-700 border border-indigo-200'
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
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all"
          :class="
            impactMacro === item.value
              ? 'bg-indigo-50/90 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium border border-transparent'
          "
          @click="() => { emit('update:impactMacro', impactMacro === item.value ? 'ALL' : item.value); }"
        >
          <span class="inline-flex items-center gap-2 min-w-0">
            <UIcon :name="item.icon" class="w-3.5 h-3.5 shrink-0" :class="item.textClass" />
            <span class="truncate">{{ item.label }}</span>
          </span>
          <span
            class="text-[11px] tabular-nums shrink-0"
            :class="
              impactMacro === item.value
                ? 'px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 font-bold'
                : 'text-slate-500 font-medium'
            "
          >
            {{ item.count }}
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>
