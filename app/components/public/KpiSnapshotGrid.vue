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
      text: `${period.previousLabel}: ${formatNumberId(kpi.previousTotalVerified)} fenomena`,
      color: 'neutral' as const,
      icon: 'i-lucide-minus',
    };
  }

  const sign = kpi.deltaPercent > 0 ? '+' : '';
  const color =
    kpi.deltaPercent > 0 ? ('success' as const) : kpi.deltaPercent < 0 ? ('error' as const) : ('neutral' as const);
  const icon =
    kpi.deltaPercent > 0
      ? 'i-lucide-trending-up'
      : kpi.deltaPercent < 0
        ? 'i-lucide-trending-down'
        : 'i-lucide-minus';

  return {
    text: `${sign}${kpi.deltaPercent}% vs ${period.previousLabel}`,
    color,
    icon,
  };
});
</script>

<template>
  <section aria-label="Ringkasan KPI Fenomena Ekonomi Triwulanan">
    <div v-if="pending && !overview" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="idx in 4" :key="idx">
        <div class="animate-pulse space-y-3 py-1">
          <div class="h-3 w-28 rounded bg-slate-200" />
          <div class="h-7 w-24 rounded bg-slate-200" />
          <div class="h-3 w-36 rounded bg-slate-100" />
        </div>
      </UCard>
    </div>

    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- KPI 1: Total Fenomena Valid -->
      <UCard>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Fenomena Valid
            </span>
            <UIcon name="i-lucide-newspaper" class="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {{ formatNumberId(overview?.kpi.totalVerified) }}
            <span class="text-sm font-medium text-slate-500">Berita</span>
          </div>
          <div v-if="deltaBadge" class="flex items-center gap-1.5">
            <UBadge :color="deltaBadge.color" variant="subtle" size="xs" :icon="deltaBadge.icon">
              {{ deltaBadge.text }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <!-- KPI 2: Sektor KBLI Dominan -->
      <UCard>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sektor KBLI Dominan
            </span>
            <UIcon name="i-lucide-factory" class="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <template v-if="overview?.kpi.dominantKbli">
            <div class="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-2">
              [{{ overview.kpi.dominantKbli.code }}] {{ overview.kpi.dominantKbli.name }}
            </div>
            <div class="text-xs text-slate-600 font-mono tabular-nums">
              {{ formatNumberId(overview.kpi.dominantKbli.count) }} fenomena ({{
                overview.kpi.dominantKbli.percentage
              }}%)
            </div>
          </template>
          <template v-else>
            <div class="text-base font-semibold text-slate-400">Belum ada data</div>
            <div class="text-xs text-slate-400">Menunggu kurasi terverifikasi</div>
          </template>
        </div>
      </UCard>

      <!-- KPI 3: Komponen Pengeluaran Teraktif -->
      <UCard>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pengeluaran Teraktif
            </span>
            <UIcon name="i-lucide-wallet" class="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <template v-if="overview?.kpi.dominantExpenditure">
            <div class="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-2">
              {{ overview.kpi.dominantExpenditure.label }}
            </div>
            <div class="text-xs text-slate-600 font-mono tabular-nums">
              {{ formatNumberId(overview.kpi.dominantExpenditure.count) }} fenomena ({{
                overview.kpi.dominantExpenditure.percentage
              }}%)
            </div>
          </template>
          <template v-else>
            <div class="text-base font-semibold text-slate-400">Belum ada data</div>
            <div class="text-xs text-slate-400">Menunggu kurasi terverifikasi</div>
          </template>
        </div>
      </UCard>

      <!-- KPI 4: Rasio Ekspansi -->
      <UCard>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rasio Ekspansi Riil
            </span>
            <UIcon name="i-lucide-activity" class="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div class="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 tabular-nums">
            {{ overview?.kpi.expansionStats.positiveRealPercent ?? 0 }}%
            <span class="text-xs sm:text-sm font-medium text-slate-600">Naik NTB</span>
          </div>
          <div class="text-xs text-slate-600 font-mono tabular-nums">
            {{ formatNumberId(overview?.kpi.expansionStats.expansionCount) }} ekspansi •
            {{ formatNumberId(overview?.kpi.expansionStats.pressureOrContractionCount) }} harga/lainnya
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
