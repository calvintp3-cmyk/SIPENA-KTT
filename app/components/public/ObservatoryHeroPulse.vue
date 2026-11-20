<!-- app/components/public/ObservatoryHeroPulse.vue -->
<script setup lang="ts">
import type { PublicOverviewResponse } from '~/types/sipena';
import { toRomanQuarter } from '#shared/utils/period';

const props = defineProps<{
  overview: PublicOverviewResponse | null;
  periodLabel: string;
  coveredSectorsCount: number;
  snapshotYear: number;
  snapshotQuarter: number;
}>();

const { formatNumberId, getExpenditureLabel } = usePdrbLabels();

const totalVerified = computed(() => props.overview?.kpi.totalVerified ?? 0);

const dominantKbli = computed(() => props.overview?.kpi.dominantKbli ?? null);

const dominantExpenditure = computed(() => {
  const dist = props.overview?.expenditureDistribution ?? [];
  if (dist.length === 0) return null;
  const sorted = [...dist].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  if (!top || top.count === 0) return null;
  const total = Math.max(1, totalVerified.value);
  return {
    code: top.code,
    component: top.code,
    label: getExpenditureLabel(top.code, false),
    count: top.count,
    percent: Math.round((top.count / total) * 100),
  };
});

// Momentum Real Balance: Expansion vs Pressure/Contraction
const expansionCount = computed(() => props.overview?.kpi.expansionStats?.expansionCount ?? 0);
const pressureCount = computed(() => props.overview?.kpi.expansionStats?.pressureOrContractionCount ?? 0);

const momentumTotal = computed(() => expansionCount.value + pressureCount.value);

const expansionPct = computed(() => {
  if (momentumTotal.value === 0) return 50;
  return Math.round((expansionCount.value / momentumTotal.value) * 100);
});

const pressurePct = computed(() => 100 - expansionPct.value);

const deltaBadge = computed(() => {
  const d = props.overview?.kpi.deltaPercent;
  if (d === null || d === undefined) return null;
  return {
    text: `${d >= 0 ? '+' : ''}${d}%`,
    isPositive: d >= 0,
  };
});
</script>

<template>
  <div
    class="relative rounded-3xl bg-brand-primary text-white p-6 sm:p-7 shadow-[0_20px_50px_-15px_rgba(11,61,46,0.35)] border border-white/10 overflow-hidden flex flex-col justify-between"
  >
    <!-- Background Architectural Grid Texture -->
    <div
      class="absolute inset-0 opacity-[0.04] pointer-events-none"
      style="background-image: radial-gradient(#FFFFFF 1px, transparent 1px); background-size: 16px 16px;"
    />

    <!-- Header Telemetry Strip -->
    <div class="relative z-10 flex items-center justify-between gap-3 pb-5 border-b border-white/10">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
        <span class="text-[11px] font-mono font-semibold tracking-wider uppercase text-emerald-200">
          Denyut Triwulanan
        </span>
      </div>
      <div class="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-mono font-bold tabular-nums">
        {{ periodLabel }}
      </div>
    </div>

    <!-- Core Telemetry Metric -->
    <div class="relative z-10 py-5 space-y-2">
      <div class="text-[12px] text-emerald-100/80 font-medium tracking-tight">
        Total Fenomena Ekonomi Tervalidasi
      </div>
      <div class="flex items-baseline gap-3">
        <span class="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-white tabular-nums">
          {{ formatNumberId(totalVerified) }}
        </span>
        <span
          v-if="deltaBadge"
          class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold"
          :class="deltaBadge.isPositive ? 'bg-emerald-400/20 text-emerald-200' : 'bg-terracotta/30 text-[#F9A89B]'"
        >
          <span>{{ deltaBadge.isPositive ? '↑' : '↓' }}</span>
          <span>{{ deltaBadge.text }}</span>
        </span>
      </div>
      <div class="text-[11.5px] text-emerald-100/70">
        Mencakup <strong class="text-white font-semibold">{{ coveredSectorsCount }}</strong> dari 17 Lapangan Usaha KBLI
      </div>
    </div>

    <!-- Real Momentum Balance Bar -->
    <div class="relative z-10 py-4 border-y border-white/10 space-y-2.5">
      <div class="flex items-center justify-between text-[11px] font-mono">
        <span class="text-emerald-200 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
          Ekspansi Riil ({{ expansionPct }}%)
        </span>
        <span class="text-[#F9A89B] flex items-center gap-1.5">
          Tekanan / Kontraksi ({{ pressurePct }}%)
          <span class="w-1.5 h-1.5 rounded-full bg-terracotta" />
        </span>
      </div>

      <!-- Split Bar -->
      <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
        <div
          class="h-full bg-[#34D399] transition-all duration-500"
          :style="{ width: `${expansionPct}%` }"
        />
        <div
          class="h-full bg-terracotta transition-all duration-500"
          :style="{ width: `${pressurePct}%` }"
        />
      </div>

      <div class="flex items-center justify-between text-[10.5px] text-emerald-100/60 font-mono">
        <span>{{ expansionCount }} bukti kenaikan</span>
        <span>{{ pressureCount }} bukti kontraksi/inflasi</span>
      </div>
    </div>

    <!-- Dual Transmission Anchors -->
    <div class="relative z-10 pt-4 space-y-3">
      <div class="flex items-start justify-between gap-4 text-xs">
        <span class="text-emerald-200/80 font-medium">Sektor Utama:</span>
        <span class="text-right font-medium text-white truncate max-w-[200px]" :title="dominantKbli?.name || '-'">
          {{ dominantKbli ? `${dominantKbli.code} • ${dominantKbli.name}` : 'Menunggu kurasi' }}
        </span>
      </div>

      <div class="flex items-start justify-between gap-4 text-xs">
        <span class="text-emerald-200/80 font-medium">Pengeluaran Utama:</span>
        <span class="text-right font-medium text-white truncate max-w-[200px]">
          {{ dominantExpenditure ? `${dominantExpenditure.code} • ${dominantExpenditure.label}` : 'Menunggu kurasi' }}
        </span>
      </div>
    </div>

    <!-- Bottom Quick Action -->
    <div class="relative z-10 pt-5 mt-2 border-t border-white/10">
      <NuxtLink
        :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
        class="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors group"
      >
        <span>Buka Seluruh Bukti Triwulan Ini</span>
        <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
      </NuxtLink>
    </div>
  </div>
</template>
