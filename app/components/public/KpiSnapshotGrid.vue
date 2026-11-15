<!-- app/components/public/KpiSnapshotGrid.vue -->
<script setup lang="ts">
import type { PublicOverviewResponse } from '~/types/sipena';

const props = defineProps<{
  overview: PublicOverviewResponse | null;
  pending: boolean;
}>();

const { formatNumberId, getKbliClusterTheme } = usePdrbLabels();

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
    <div v-if="pending && !overview" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="idx in 4" :key="idx" class="saas-card rounded-2xl p-4 sm:p-5">
        <div class="space-y-3 py-1">
          <div class="h-3 w-28 rounded-full bg-slate-200" />
          <div class="h-7 w-24 rounded-lg bg-slate-200" />
          <div class="h-3 w-36 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- KPI 1: Total Fenomena Valid -->
      <div class="saas-card rounded-2xl p-4 sm:p-5 space-y-2.5 border-t-2 border-t-blue-600">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Total Fenomena Valid
          </span>
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-document-text-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {{ formatNumberId(overview?.kpi.totalVerified) }}
          <span class="text-xs font-semibold text-slate-600">Catatan</span>
        </div>
        <div v-if="deltaBadge" class="flex items-center gap-1.5">
          <UBadge :color="deltaBadge.color" variant="subtle" size="xs" :icon="deltaBadge.icon">
            {{ deltaBadge.text }}
          </UBadge>
        </div>
      </div>

      <!-- KPI 2: Sektor KBLI Dominan -->
      <div class="saas-card rounded-2xl p-4 sm:p-5 space-y-2.5 border-t-2 border-t-indigo-600">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Sektor KBLI Dominan
          </span>
          <div
            class="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
            :class="
              overview?.kpi.dominantKbli
                ? getKbliClusterTheme(overview.kpi.dominantKbli.code).iconBgClass + ' border-transparent'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
            "
          >
            <UIcon name="i-solar-buildings-2-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="overview?.kpi.dominantKbli">
          <div class="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug line-clamp-2">
            {{ overview.kpi.dominantKbli.code }} - {{ overview.kpi.dominantKbli.name }}
          </div>
          <div class="text-xs text-slate-600 font-medium tabular-nums">
            {{ formatNumberId(overview.kpi.dominantKbli.count) }} fenomena ({{
              overview.kpi.dominantKbli.percentage
            }}%)
          </div>
        </template>
        <template v-else>
          <div class="text-base font-bold text-slate-600">Belum ada data</div>
          <div class="text-xs text-slate-600">Menunggu kurasi terverifikasi</div>
        </template>
      </div>

      <!-- KPI 3: Komponen Pengeluaran Teraktif -->
      <div class="saas-card rounded-2xl p-4 sm:p-5 space-y-2.5 border-t-2 border-t-amber-600">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Pengeluaran Teraktif
          </span>
          <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-wallet-money-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="overview?.kpi.dominantExpenditure">
          <div class="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug line-clamp-2">
            {{ overview.kpi.dominantExpenditure.label }}
          </div>
          <div class="text-xs text-slate-600 font-medium tabular-nums">
            {{ formatNumberId(overview.kpi.dominantExpenditure.count) }} fenomena ({{
              overview.kpi.dominantExpenditure.percentage
            }}%)
          </div>
        </template>
        <template v-else>
          <div class="text-base font-bold text-slate-600">Belum ada data</div>
          <div class="text-xs text-slate-600">Menunggu kurasi terverifikasi</div>
        </template>
      </div>

      <!-- KPI 4: Rasio Ekspansi -->
      <div class="saas-card rounded-2xl p-4 sm:p-5 space-y-2.5 border-t-2 border-t-emerald-700">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Rasio Ekspansi Riil
          </span>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-graph-up-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700 tabular-nums">
          {{ overview?.kpi.expansionStats.positiveRealPercent ?? 0 }}%
          <span class="text-xs font-semibold text-slate-600">Naik NTB</span>
        </div>
        <div class="text-xs text-slate-600 font-medium tabular-nums">
          {{ formatNumberId(overview?.kpi.expansionStats.expansionCount) }} ekspansi •
          {{ formatNumberId(overview?.kpi.expansionStats.pressureOrContractionCount) }} harga/lainnya
        </div>
      </div>
    </div>
  </section>
</template>
