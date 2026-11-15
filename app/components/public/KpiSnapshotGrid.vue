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
      <div class="raycast-panel p-4 sm:p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-[var(--ink-secondary)]">
            Total Fenomena Valid
          </span>
          <div class="w-8 h-8 rounded-lg bg-[var(--accent-teal-subtle)] text-[var(--accent-teal-solid)] border border-[var(--accent-teal-border)] flex items-center justify-center shrink-0">
            <UIcon name="i-solar-document-text-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[var(--ink-primary)] tabular-nums">
          {{ formatNumberId(overview?.kpi.totalVerified) }}
          <span class="text-xs font-semibold text-[var(--ink-muted)] font-sans">Catatan</span>
        </div>
        <div v-if="deltaBadge" class="flex items-center gap-1.5">
          <UBadge :color="deltaBadge.color" variant="subtle" size="xs" :icon="deltaBadge.icon">
            {{ deltaBadge.text }}
          </UBadge>
        </div>
      </div>

      <!-- KPI 2: Sektor KBLI Dominan -->
      <div class="raycast-panel p-4 sm:p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-[var(--ink-secondary)]">
            Sektor KBLI Dominan
          </span>
          <div
            class="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
            :class="
              overview?.kpi.dominantKbli
                ? getKbliClusterTheme(overview.kpi.dominantKbli.code).iconBgClass + ' border-transparent'
                : 'bg-[var(--bg-recessed)] text-[var(--ink-primary)] border-[var(--border-strong)]'
            "
          >
            <UIcon name="i-solar-buildings-2-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="overview?.kpi.dominantKbli">
          <div class="text-sm sm:text-[15px] font-bold text-[var(--ink-primary)] leading-snug line-clamp-2">
            <span class="kbli-chip teal mr-1.5">{{ overview.kpi.dominantKbli.code }}</span>
            <span>{{ overview.kpi.dominantKbli.name }}</span>
          </div>
          <div class="text-xs text-[var(--ink-secondary)] font-medium tabular-nums">
            {{ formatNumberId(overview.kpi.dominantKbli.count) }} fenomena ({{
              overview.kpi.dominantKbli.percentage
            }}%)
          </div>
        </template>
        <template v-else>
          <div class="text-base font-bold text-[var(--ink-muted)]">Belum ada data</div>
          <div class="text-xs text-[var(--ink-muted)]">Menunggu kurasi terverifikasi</div>
        </template>
      </div>

      <!-- KPI 3: Komponen Pengeluaran Teraktif -->
      <div class="raycast-panel p-4 sm:p-5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-[var(--ink-secondary)]">
            Pengeluaran Teraktif
          </span>
          <div class="w-8 h-8 rounded-lg bg-[var(--bg-recessed)] text-[var(--ink-secondary)] border border-[var(--border-default)] flex items-center justify-center shrink-0">
            <UIcon name="i-solar-wallet-money-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="overview?.kpi.dominantExpenditure">
          <div class="text-sm sm:text-[15px] font-bold text-[var(--ink-primary)] leading-snug line-clamp-2">
            {{ overview.kpi.dominantExpenditure.label }}
          </div>
          <div class="text-xs text-[var(--ink-secondary)] font-medium tabular-nums">
            {{ formatNumberId(overview.kpi.dominantExpenditure.count) }} fenomena ({{
              overview.kpi.dominantExpenditure.percentage
            }}%)
          </div>
        </template>
        <template v-else>
          <div class="text-base font-bold text-[var(--ink-muted)]">Belum ada data</div>
          <div class="text-xs text-[var(--ink-muted)]">Menunggu kurasi terverifikasi</div>
        </template>
      </div>

      <!-- KPI 4: Rasio Ekspansi -->
      <div class="raycast-panel p-4 sm:p-5 space-y-2.5 border border-[var(--accent-teal-border)]">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-[var(--ink-secondary)]">
            Berita Bernada Ekspansi Volume
          </span>
          <span class="signal-badge vol-up">↑ Riil</span>
        </div>
        <template v-if="overview && overview.kpi.totalVerified > 0">
          <div class="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[var(--accent-teal-solid)] tabular-nums">
            {{ overview.kpi.expansionStats.positiveRealPercent }}%
            <span class="text-xs font-semibold text-[var(--ink-muted)] font-sans">dari berita</span>
          </div>
          <div class="text-xs text-[var(--ink-secondary)] font-medium tabular-nums">
            {{ formatNumberId(overview.kpi.expansionStats.expansionCount) }} dari
            {{ formatNumberId(overview.kpi.totalVerified) }} berita menandai kenaikan volume
            (Nilai Tambah Bruto riil); sisanya harga atau lainnya.
          </div>
        </template>
        <template v-else>
          <div class="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[var(--ink-muted)]">—</div>
          <div class="text-xs text-[var(--ink-muted)] font-medium">Belum ada berita terverifikasi</div>
        </template>
        <p class="text-[11px] text-[var(--ink-secondary)] leading-snug border-t border-[var(--border-subtle)] pt-2">
          Proporsi berita terverifikasi, <strong class="text-[var(--ink-primary)]">bukan angka pertumbuhan ekonomi</strong> atau PDRB resmi.
        </p>
      </div>
    </div>
  </section>
</template>
