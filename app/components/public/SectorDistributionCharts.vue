<!-- app/components/public/SectorDistributionCharts.vue -->
<script setup lang="ts">
import {
  PDRB_17_SECTORS,
  type ExpenditureComponentEnum,
  type KbliCategoryEnum,
} from '#shared/enums/pdrb';
import type {
  ExpenditureDistributionItem,
  KbliDistributionItem,
  PublicOverviewResponse,
} from '~/types/sipena';
import { SIPENA_CHART_TOKENS, SIPENA_CHART_TOOLTIP_STYLE } from '~/utils/chart-theme';

const props = withDefaults(
  defineProps<{
    overview: PublicOverviewResponse | null;
    selectedKbli: string;
    selectedPdrbGroup?: string;
    selectedExpenditure: string;
    pending: boolean;
  }>(),
  {
    selectedPdrbGroup: 'ALL',
  },
);

const emit = defineEmits<{
  'update:kbli': [value: string];
  'update:expenditure': [value: string];
}>();

const { getKbliClusterTheme, getExpenditureColorTheme } = usePdrbLabels();

const kbliItems = computed<KbliDistributionItem[]>(() => (props.overview?.kbliDistribution ?? []).slice(0, 10));
const expItems = computed<ExpenditureDistributionItem[]>(() => props.overview?.expenditureDistribution ?? []);

const activeGroupCodes = computed<Set<string> | null>(() => {
  const g = props.selectedPdrbGroup;
  if (!g || g === 'ALL') return null;
  const found = PDRB_17_SECTORS.find((s) => s.groupCode === g);
  return found ? new Set<string>(found.kbliCodes) : null;
});

function isKbliCodeActive(code: string): boolean {
  if (props.selectedKbli && props.selectedKbli !== 'ALL') {
    return props.selectedKbli === code;
  }
  return Boolean(activeGroupCodes.value?.has(code));
}

const kbliChartOption = computed<ECOption | null>(() => {
  const list = [...kbliItems.value].reverse();
  if (list.length === 0) return null;
  const hasSelection = props.selectedKbli !== 'ALL' || activeGroupCodes.value !== null;

  return {
    tooltip: {
      ...SIPENA_CHART_TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (raw: unknown) => {
        const first = Array.isArray(raw) ? raw[0] : raw;
        const idx = typeof (first as { dataIndex?: number })?.dataIndex === 'number'
          ? (first as { dataIndex: number }).dataIndex
          : -1;
        const item = list[idx];
        if (!item) return '';
        return `<strong>${item.code} - ${item.name}</strong><br/>Jumlah: ${item.count} fenomena (${item.percentage}%)`;
      },
    },
    grid: {
      left: 8,
      right: 26,
      top: 8,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: SIPENA_CHART_TOKENS.surfaceMuted } },
      axisLabel: { color: SIPENA_CHART_TOKENS.inkAxis, fontFamily: 'Manrope, system-ui, sans-serif', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: list.map((i) => `${i.code} - ${i.name.length > 22 ? `${i.name.slice(0, 21)}…` : i.name}`),
      axisLine: { lineStyle: { color: SIPENA_CHART_TOKENS.borderHairline } },
      axisTick: { show: false },
      axisLabel: {
        color: SIPENA_CHART_TOKENS.inkSecondary,
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: 500,
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: list.map((item) => {
          const isSelected = isKbliCodeActive(item.code);
          const dimmed = hasSelection && !isSelected;
          return {
            value: item.count,
            code: item.code,
            itemStyle: {
              color: getKbliClusterTheme(item.code).hex,
              opacity: dimmed ? 0.35 : 1,
              borderRadius: [0, 4, 4, 0],
            },
          };
        }),
        label: {
          show: true,
          position: 'right',
          color: SIPENA_CHART_TOKENS.inkSecondary,
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };
});

const expenditureChartOption = computed<ECOption | null>(() => {
  const list = expItems.value;
  if (list.length === 0) return null;
  const total = list.reduce((sum: number, i: ExpenditureDistributionItem) => sum + i.count, 0);

  return {
    tooltip: {
      ...SIPENA_CHART_TOOLTIP_STYLE,
      trigger: 'item',
      formatter: (raw: unknown) => {
        const p = raw as { name?: string; value?: number; percent?: number };
        return `<strong>${p.name ?? ''}</strong><br/>Jumlah: ${p.value ?? 0} fenomena (${p.percent ?? 0}%)`;
      },
    },
    title: {
      text: String(total),
      subtext: 'Bukti',
      left: 'center',
      top: '39%',
      textStyle: {
        fontSize: 22,
        fontWeight: 800,
        color: SIPENA_CHART_TOKENS.inkObsidian,
        fontFamily: 'Manrope, system-ui, sans-serif',
      },
      subtextStyle: {
        fontSize: 11,
        color: SIPENA_CHART_TOKENS.inkMuted,
        fontFamily: 'Manrope, system-ui, sans-serif',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: SIPENA_CHART_TOKENS.surfaceWhite,
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 5,
        },
        data: list.map((item: ExpenditureDistributionItem) => {
          const isSelected = props.selectedExpenditure === item.code;
          const dimmed = props.selectedExpenditure !== 'ALL' && !isSelected;
          return {
            name: item.label,
            value: item.count,
            code: item.code,
            itemStyle: {
              color: getExpenditureColorTheme(item.code).hex,
              opacity: dimmed ? 0.35 : 1,
            },
          };
        }),
      },
    ],
  };
});

function toggleKbliFilter(code: KbliCategoryEnum | string) {
  emit('update:kbli', props.selectedKbli === code ? 'ALL' : code);
}

function toggleExpenditureFilter(code: ExpenditureComponentEnum | string) {
  emit('update:expenditure', props.selectedExpenditure === code ? 'ALL' : code);
}

function handleKbliChartClick(params: unknown) {
  const code = (params as { data?: { code?: string } })?.data?.code;
  if (code) {
    toggleKbliFilter(code);
  }
}

function handleExpenditureChartClick(params: unknown) {
  const code = (params as { data?: { code?: string } })?.data?.code;
  if (code) {
    toggleExpenditureFilter(code);
  }
}
</script>

<template>
  <section
    aria-label="Sebaran Proporsi Sektor PDRB"
    class="grid grid-cols-1 lg:grid-cols-2 gap-5"
  >
    <!-- Grafik KBLI A-V -->
    <div class="rounded-2xl overflow-hidden flex flex-col bg-white border border-[#141917]/[0.08] shadow-2xs">
      <div class="px-5 py-3.5 border-b border-[#141917]/[0.08] flex items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-[#141917] font-display">
            Sebaran Lapangan Usaha (KBLI)
          </h3>
          <p class="text-[11px] text-[#737B76]">
            Klik batang grafik untuk memfilter linimasa
          </p>
        </div>
        <button
          v-if="selectedKbli && selectedKbli !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] hover:bg-[#D2E6DC] cursor-pointer font-mono"
          @click="emit('update:kbli', 'ALL')"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3 text-[#0B3D2E]" />
          <span>KBLI {{ selectedKbli }}</span>
        </button>
      </div>

      <div class="p-4 space-y-3 flex-1 flex flex-col">
        <SharedAppChart
          :option="kbliChartOption"
          height-class="h-64"
          :loading="pending && !overview"
          :empty="!overview?.kbliDistribution.length"
          empty-title="Belum ada distribusi KBLI"
          empty-description="Belum ada catatan KBLI terverifikasi pada periode ini."
          @chart-click="handleKbliChartClick"
        />

        <!-- Keyboard-accessible quick sector filter pills -->
        <div v-if="kbliItems.length > 0" class="flex flex-wrap gap-1.5 pt-2 border-t border-[#141917]/[0.06]">
          <button
            v-for="item in kbliItems"
            :key="item.code"
            type="button"
            :aria-pressed="isKbliCodeActive(item.code)"
            class="min-h-7 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors font-mono tabular-nums cursor-pointer"
            :class="
              isKbliCodeActive(item.code)
                ? 'bg-[#0B3D2E] text-white border-[#0B3D2E]'
                : 'bg-white text-[#4A524E] border-[#141917]/10 hover:border-[#0B3D2E]/40'
            "
            @click="toggleKbliFilter(item.code)"
          >
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :style="{
                backgroundColor: isKbliCodeActive(item.code) ? '#FFFFFF' : getKbliClusterTheme(item.code).hex,
              }"
            />
            <span>{{ item.code }} ({{ item.count }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Grafik Komponen PDRB Pengeluaran -->
    <div class="rounded-2xl overflow-hidden flex flex-col bg-white border border-[#141917]/[0.08] shadow-2xs">
      <div class="px-5 py-3.5 border-b border-[#141917]/[0.08] flex items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-[#141917] font-display">
            Sebaran Komponen Pengeluaran
          </h3>
          <p class="text-[11px] text-[#737B76]">
            Klik segmen donat untuk memfilter sisi permintaan
          </p>
        </div>
        <button
          v-if="selectedExpenditure && selectedExpenditure !== 'ALL'"
          type="button"
          class="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] hover:bg-[#D2E6DC] cursor-pointer font-mono"
          @click="emit('update:expenditure', 'ALL')"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3 text-[#0B3D2E]" />
          <span>Reset</span>
        </button>
      </div>

      <div class="p-4 flex-1 flex flex-col justify-between gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center flex-1">
          <div :class="expItems.length > 0 ? 'sm:col-span-6' : 'sm:col-span-12'">
            <SharedAppChart
              :option="expenditureChartOption"
              height-class="h-64"
              :loading="pending && !overview"
              :empty="!overview?.expenditureDistribution.length"
              empty-title="Belum ada data pengeluaran"
              empty-description="Menunggu verifikasi data pengeluaran pada periode ini."
              @chart-click="handleExpenditureChartClick"
            />
          </div>

          <div v-if="expItems.length > 0" class="sm:col-span-6 space-y-1.5">
            <button
              v-for="item in expItems"
              :key="item.code"
              type="button"
              :aria-pressed="selectedExpenditure === item.code"
              class="w-full min-h-8 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs border transition-colors text-left cursor-pointer"
              :class="
                selectedExpenditure === item.code
                  ? 'bg-[#E3F0EA] border-[#BBD8CB] text-[#0B3D2E] font-semibold'
                  : 'bg-white border-[#141917]/10 hover:border-[#0B3D2E]/40 text-[#4A524E]'
              "
              @click="toggleExpenditureFilter(item.code)"
            >
              <span class="inline-flex items-center gap-2 min-w-0">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: getExpenditureColorTheme(item.code).hex }"
                />
                <span class="truncate">{{ item.label }}</span>
              </span>
              <span class="font-bold text-[#141917] tabular-nums shrink-0 font-mono">
                {{ item.count }} ({{ item.percentage }}%)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
