<!-- app/components/public/SectorDistributionCharts.vue -->
<script setup lang="ts">
import type { ExpenditureComponentEnum, KbliCategoryEnum } from '#shared/enums/pdrb';
import type {
  ExpenditureDistributionItem,
  KbliDistributionItem,
  PublicOverviewResponse,
} from '~/types/sipena';

const props = defineProps<{
  overview: PublicOverviewResponse | null;
  selectedKbli: string;
  selectedExpenditure: string;
  pending: boolean;
}>();

const emit = defineEmits<{
  'update:kbli': [value: string];
  'update:expenditure': [value: string];
}>();

const { getKbliClusterTheme, getExpenditureColorTheme } = usePdrbLabels();

const kbliItems = computed<KbliDistributionItem[]>(() => (props.overview?.kbliDistribution ?? []).slice(0, 10));
const expItems = computed<ExpenditureDistributionItem[]>(() => props.overview?.expenditureDistribution ?? []);

const kbliChartOption = computed<ECOption | null>(() => {
  const list = [...kbliItems.value].reverse();
  if (list.length === 0) return null;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#0F172A',
      borderWidth: 0,
      textStyle: { color: '#F8FAFC', fontFamily: 'Inter, sans-serif', fontSize: 12 },
      formatter: (raw: unknown) => {
        const first = Array.isArray(raw) ? raw[0] : raw;
        const idx = typeof (first as { dataIndex?: number })?.dataIndex === 'number'
          ? (first as { dataIndex: number }).dataIndex
          : -1;
        const item = list[idx];
        if (!item) return '';
        return `<strong>[${item.code}] ${item.name}</strong><br/>Jumlah: ${item.count} berita (${item.percentage}%)`;
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
      splitLine: { lineStyle: { color: '#F1F5F9' } },
      axisLabel: { color: '#64748B', fontFamily: 'Inter, sans-serif', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: list.map((i) => `[${i.code}] ${i.name.length > 22 ? `${i.name.slice(0, 21)}…` : i.name}`),
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#334155',
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: 500,
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 18,
        data: list.map((item) => {
          const isSelected = props.selectedKbli === item.code;
          const dimmed = props.selectedKbli !== 'ALL' && !isSelected;
          return {
            value: item.count,
            code: item.code,
            itemStyle: {
              color: getKbliClusterTheme(item.code).hex,
              opacity: dimmed ? 0.35 : 1,
              borderRadius: [0, 6, 6, 0],
            },
          };
        }),
        label: {
          show: true,
          position: 'right',
          color: '#334155',
          fontFamily: 'Inter, sans-serif',
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
      trigger: 'item',
      backgroundColor: '#0F172A',
      borderWidth: 0,
      textStyle: { color: '#F8FAFC', fontFamily: 'Inter, sans-serif', fontSize: 12 },
      formatter: (raw: unknown) => {
        const p = raw as { name?: string; value?: number; percent?: number };
        return `<strong>${p.name ?? ''}</strong><br/>Jumlah: ${p.value ?? 0} berita (${p.percent ?? 0}%)`;
      },
    },
    title: {
      text: String(total),
      subtext: 'Catatan',
      left: 'center',
      top: '39%',
      textStyle: {
        fontSize: 22,
        fontWeight: 800,
        color: '#0F172A',
        fontFamily: 'Inter, sans-serif',
      },
      subtextStyle: {
        fontSize: 11,
        color: '#64748B',
        fontFamily: 'Inter, sans-serif',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#FFFFFF',
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
    class="grid grid-cols-1 lg:grid-cols-2 gap-4"
  >
    <!-- Grafik KBLI A-U -->
    <div class="saas-card rounded-2xl overflow-hidden flex flex-col">
      <div class="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2 bg-slate-50/75">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-chart-square-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#0F172A]">
              Sebaran Lapangan Usaha (KBLI A–U)
            </h2>
            <p class="text-[11px] text-slate-500">
              Klik batang grafik atau badge sektor untuk menyaring linimasa
            </p>
          </div>
        </div>
        <button
          v-if="selectedKbli && selectedKbli !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
          @click="() => { emit('update:kbli', 'ALL'); }"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
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
        <div v-if="kbliItems.length > 0" class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          <button
            v-for="item in kbliItems"
            :key="item.code"
            type="button"
            :aria-pressed="selectedKbli === item.code"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all tabular-nums"
            :class="
              selectedKbli === item.code
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
            "
            @click="() => { toggleKbliFilter(item.code); }"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :style="{
                backgroundColor: selectedKbli === item.code ? '#FFFFFF' : getKbliClusterTheme(item.code).hex,
              }"
            />
            <span>[{{ item.code }}] {{ item.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Grafik Komponen PDRB Pengeluaran -->
    <div class="saas-card rounded-2xl overflow-hidden flex flex-col">
      <div class="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2 bg-slate-50/75">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-pie-chart-2-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#0F172A]">
              Sebaran Komponen PDRB Pengeluaran
            </h2>
            <p class="text-[11px] text-slate-500">
              Klik segmen donat atau komponen untuk menyaring sisi pengeluaran
            </p>
          </div>
        </div>
        <button
          v-if="selectedExpenditure && selectedExpenditure !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
          @click="() => { emit('update:expenditure', 'ALL'); }"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
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
              class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs border transition-all text-left"
              :class="
                selectedExpenditure === item.code
                  ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-semibold'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 font-medium'
              "
              @click="() => { toggleExpenditureFilter(item.code); }"
            >
              <span class="inline-flex items-center gap-2 min-w-0">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ backgroundColor: getExpenditureColorTheme(item.code).hex }"
                />
                <span class="truncate">{{ item.label }}</span>
              </span>
              <span class="font-bold text-slate-900 tabular-nums shrink-0">
                {{ item.count }} ({{ item.percentage }}%)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
