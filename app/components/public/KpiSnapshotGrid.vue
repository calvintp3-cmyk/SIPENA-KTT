<!-- app/components/public/KpiSnapshotGrid.vue -->
<script setup lang="ts">
import type { PublicOverviewResponse } from '~/types/sipena';

const props = defineProps<{
  overview: PublicOverviewResponse | null;
  pending: boolean;
}>();

const { formatNumberId } = usePdrbLabels();

const deltaBadge = computed(() => {
  const kpi = props.overview?.kpi;
  const period = props.overview?.period;
  if (!kpi || !period) return null;

  if (kpi.deltaPercent === null) {
    return {
      text: `${period.previousLabel}: ${formatNumberId(kpi.previousTotalVerified)}`,
      isPositive: true,
    };
  }

  return {
    text: `${kpi.deltaPercent > 0 ? '+' : ''}${kpi.deltaPercent}% vs ${period.previousLabel}`,
    isPositive: kpi.deltaPercent >= 0,
  };
});
</script>

<template>
  <section aria-label="Ringkasan KPI Fenomena Ekonomi Triwulanan">
    <!-- Skeleton Loading -->
    <div
      v-if="pending && !overview"
      class="bg-white rounded-2xl border border-border-hairline grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#141917]/[0.07]"
    >
      <div v-for="idx in 4" :key="idx" class="p-5 space-y-2.5">
        <div class="h-3 w-24 rounded-full bg-surface-subtle animate-pulse" />
        <div class="h-7 w-20 rounded-lg bg-surface-subtle animate-pulse" />
        <div class="h-3 w-32 rounded-full bg-surface-subtle animate-pulse" />
      </div>
    </div>

    <!-- Architectural Hairline-Divided Ribbon -->
    <div
      v-else
      class="bg-white rounded-2xl border border-border-hairline shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#141917]/[0.07]"
    >
      <!-- KPI 1: Total Fenomena Valid -->
      <div class="p-5 flex flex-col justify-between">
        <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
          Total Terverifikasi
        </div>
        <div class="my-2 flex items-baseline gap-2">
          <span class="font-display font-extrabold text-3xl sm:text-4xl text-ink-primary tabular-nums">
            {{ formatNumberId(overview?.kpi.totalVerified) }}
          </span>
          <span class="text-xs text-ink-muted font-medium">bukti</span>
        </div>
        <div class="text-[11.5px] font-mono">
          <span
            v-if="deltaBadge"
            class="inline-flex items-center gap-1 font-semibold"
            :class="deltaBadge.isPositive ? 'text-brand-primary' : 'text-terracotta-ink'"
          >
            <span>{{ deltaBadge.isPositive ? '↑' : '↓' }}</span>
            <span>{{ deltaBadge.text }}</span>
          </span>
          <span v-else class="text-ink-muted">Menunggu data pembanding</span>
        </div>
      </div>

      <!-- KPI 2: Sektor Dominan -->
      <div class="p-5 flex flex-col justify-between">
        <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
          Sektor Dominan (KBLI)
        </div>
        <div class="my-2">
          <div v-if="overview?.kpi.dominantKbli" class="font-display font-bold text-base text-ink-primary leading-snug line-clamp-1">
            {{ overview.kpi.dominantKbli.code }} &bull; {{ overview.kpi.dominantKbli.name }}
          </div>
          <div v-else class="font-display font-bold text-base text-ink-muted">
            Belum terpetakan
          </div>
        </div>
        <div class="text-[11.5px] text-ink-secondary font-mono tabular-nums">
          <template v-if="overview?.kpi.dominantKbli">
            {{ formatNumberId(overview.kpi.dominantKbli.count) }} bukti ({{ overview.kpi.dominantKbli.percentage }}% share)
          </template>
          <template v-else>
            Menunggu kurasi data
          </template>
        </div>
      </div>

      <!-- KPI 3: Pengeluaran Dominan -->
      <div class="p-5 flex flex-col justify-between">
        <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
          Pengeluaran Dominan
        </div>
        <div class="my-2">
          <div v-if="overview?.kpi.dominantExpenditure" class="font-display font-bold text-base text-ink-primary leading-snug line-clamp-1">
            {{ overview.kpi.dominantExpenditure.label }}
          </div>
          <div v-else class="font-display font-bold text-base text-ink-muted">
            Belum terpetakan
          </div>
        </div>
        <div class="text-[11.5px] text-ink-secondary font-mono tabular-nums">
          <template v-if="overview?.kpi.dominantExpenditure">
            {{ formatNumberId(overview.kpi.dominantExpenditure.count) }} bukti ({{ overview.kpi.dominantExpenditure.percentage }}% share)
          </template>
          <template v-else>
            Menunggu kurasi data
          </template>
        </div>
      </div>

      <!-- KPI 4: Rasio Ekspansi Riil -->
      <div class="p-5 flex flex-col justify-between">
        <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
          Rasio Ekspansi Riil
        </div>
        <div class="my-2 flex items-baseline gap-2">
          <span class="font-display font-extrabold text-3xl sm:text-4xl text-brand-primary tabular-nums">
            {{ overview?.kpi.expansionStats.positiveRealPercent ?? 0 }}%
          </span>
          <span class="text-xs text-ink-muted font-medium">dorongan volume</span>
        </div>
        <div class="text-[11.5px] text-ink-secondary font-mono tabular-nums">
          {{ formatNumberId(overview?.kpi.expansionStats.expansionCount) }} ekspansi &bull; {{ formatNumberId(overview?.kpi.expansionStats.pressureOrContractionCount) }} tekanan
        </div>
      </div>
    </div>
  </section>
</template>
