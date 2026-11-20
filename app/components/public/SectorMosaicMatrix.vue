<!-- app/components/public/SectorMosaicMatrix.vue -->
<script setup lang="ts">
import type { Pdrb17DistributionItem, PublicOverviewResponse } from '~/types/sipena';

const props = defineProps<{
  overview: PublicOverviewResponse | null;
  snapshotYear: number;
  snapshotQuarter: number;
  periodLabel: string;
}>();

const { getExpenditureLabel, formatNumberId } = usePdrbLabels();

type MosaicFilter = 'all' | 'covered' | 'gap';
const activeFilter = ref<MosaicFilter>('all');

interface MosaicSectorTile {
  groupCode: string;
  shortCode: string;
  name: string;
  count: number;
  status: 'strong' | 'moderate' | 'thin' | 'gap';
}

const sectors = computed<MosaicSectorTile[]>(() => {
  const items: Pdrb17DistributionItem[] = props.overview?.pdrb17Distribution ?? [];
  return items.map((item) => {
    let status: 'strong' | 'moderate' | 'thin' | 'gap' = 'gap';
    if (item.count >= 5) status = 'strong';
    else if (item.count >= 3) status = 'moderate';
    else if (item.count >= 1) status = 'thin';

    const shortCode = item.groupCode === 'R,S,T,U' ? 'R–U' : item.groupCode === 'S,T,U,V' ? 'S–V' : item.groupCode;

    return {
      groupCode: item.groupCode,
      shortCode,
      name: item.shortName,
      count: item.count,
      status,
    };
  });
});

const filteredSectors = computed(() => {
  if (activeFilter.value === 'covered') {
    return sectors.value.filter((s: MosaicSectorTile) => s.count > 0);
  }
  if (activeFilter.value === 'gap') {
    return sectors.value.filter((s: MosaicSectorTile) => s.count === 0);
  }
  return sectors.value;
});

const coveredCount = computed(() => sectors.value.filter((s: MosaicSectorTile) => s.count > 0).length);
const gapCount = computed(() => sectors.value.filter((s: MosaicSectorTile) => s.count === 0).length);

// 6 Components of Expenditure
const expenditures = computed(() => {
  const dist = props.overview?.expenditureDistribution ?? [];
  const total = Math.max(1, props.overview?.kpi.totalVerified ?? 1);
  return [...dist]
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      code: e.code,
      name: getExpenditureLabel(e.code, false),
      count: e.count,
      percent: Math.round((e.count / total) * 100),
    }));
});

// Source Transmissions
const localCount = computed(() => props.overview?.sourceBreakdown?.regional ?? 0);
const nationalCount = computed(() => props.overview?.sourceBreakdown?.national ?? 0);
const sourceTotal = computed(() => Math.max(1, localCount.value + nationalCount.value));
const localPct = computed(() => Math.round((localCount.value / sourceTotal.value) * 100));
const nationalPct = computed(() => 100 - localPct.value);
</script>

<template>
  <div class="py-12 border-t border-border-hairline">
    <!-- Section Title & Filter Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-terracotta-ink mb-1">
          KALTARA OBSERVATORY MATRIX
        </div>
        <h2 class="font-display font-bold text-2xl sm:text-3xl text-ink-primary tracking-tight">
          Peta Denyut 17 Lapangan Usaha KBLI
        </h2>
        <p class="text-xs sm:text-sm text-ink-secondary mt-1 max-w-xl">
          Visualisasi daya tangkap bukti empiris pada 17 kategori PDRB Lapangan Usaha dan 6 Komponen Pengeluaran di Kabupaten Tana Tidung.
        </p>
      </div>

      <!-- Segmented Mosaic Filter -->
      <div class="inline-flex items-center p-1 rounded-xl bg-surface-subtle text-xs font-semibold self-start sm:self-auto shrink-0">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          :class="activeFilter === 'all' ? 'bg-white text-ink-primary shadow-2xs font-bold' : 'text-ink-secondary hover:text-ink-primary'"
          @click="activeFilter = 'all'"
        >
          Semua (17)
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          :class="activeFilter === 'covered' ? 'bg-white text-brand-primary shadow-2xs font-bold' : 'text-ink-secondary hover:text-brand-primary'"
          @click="activeFilter = 'covered'"
        >
          Terpantau ({{ coveredCount }})
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          :class="activeFilter === 'gap' ? 'bg-white text-terracotta-ink shadow-2xs font-bold' : 'text-ink-secondary hover:text-terracotta-ink'"
          @click="activeFilter = 'gap'"
        >
          Senyap / Gap 0 ({{ gapCount }})
        </button>
      </div>
    </div>

    <!-- Matrix Dual-Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left (8 Cols): 17-Sector Mosaic Grid -->
      <div class="lg:col-span-8">
        <div
          v-if="coveredCount === 0"
          class="mb-4 p-3.5 rounded-xl bg-surface-subtle border border-border-hairline flex items-center gap-3 text-xs text-ink-secondary"
        >
          <UIcon name="i-solar-info-circle-line-duotone" class="w-4 h-4 text-ink-muted shrink-0" />
          <span>Belum ada bukti empiris tercatat untuk periode {{ periodLabel }}. Seluruh 17 sektor berstatus senyap menunggu kurasi.</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <NuxtLink
            v-for="s in filteredSectors"
            :key="s.groupCode"
            :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}&pdrbGroup=${encodeURIComponent(s.groupCode)}`"
            class="group p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-h-[110px]"
            :class="[
              s.status === 'strong'
                ? 'bg-brand-tint border-brand-border hover:border-brand-primary/50 hover:shadow-sm'
                : s.status === 'moderate'
                  ? 'bg-white border-border-hairline hover:border-brand-primary/40 hover:shadow-sm'
                  : s.status === 'thin'
                    ? 'bg-ochre-surface border-ochre-border hover:border-ochre/50'
                    : 'bg-canvas border-dashed border-terracotta/40 hover:border-terracotta',
            ]"
          >
            <!-- Sector Code & Count -->
            <div class="flex items-start justify-between gap-2">
              <span
                class="font-mono font-bold text-sm"
                :class="[
                  s.status === 'strong'
                    ? 'text-brand-primary'
                    : s.status === 'thin'
                      ? 'text-ochre-ink'
                      : s.status === 'gap'
                        ? 'text-terracotta-ink'
                        : 'text-ink-primary',
                ]"
              >
                KBLI {{ s.shortCode }}
              </span>
              <span
                class="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold tabular-nums"
                :class="[
                  s.status === 'strong'
                    ? 'bg-brand-primary text-white'
                    : s.status === 'moderate'
                      ? 'bg-surface-subtle text-ink-primary'
                      : s.status === 'thin'
                        ? 'bg-[#F8E7C5] text-[#92400E]'
                        : 'bg-terracotta-surface text-terracotta-ink',
                ]"
              >
                {{ s.count }}
              </span>
            </div>

            <!-- Sector Name -->
            <div class="mt-3">
              <div
                class="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors"
                :class="s.status === 'gap' ? 'text-ink-muted' : 'text-ink-primary'"
              >
                {{ s.name }}
              </div>
              <div class="text-[10px] text-ink-muted font-mono mt-1">
                {{ s.status === 'gap' ? 'Belum ada bukti' : `${s.count} sinyal terarsip` }}
              </div>
            </div>
          </NuxtLink>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-4 text-[11.5px] text-ink-muted font-mono">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-brand-tint border border-brand-border" />
            <span>Kuat (&ge; 5 bukti)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-white border border-border-hairline" />
            <span>Moderat (3–4)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-ochre-surface border border-ochre-border" />
            <span>Tipis (1–2)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-canvas border border-dashed border-terracotta/50" />
            <span>Senyap / Gap 0</span>
          </div>
        </div>
      </div>

      <!-- Right (4 Cols): Expenditure Components & Source Transmission Strip -->
      <div class="lg:col-span-4 space-y-6 lg:pl-6 lg:border-l lg:border-border-hairline">
        <!-- 6 Expenditure Components -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-display font-bold text-sm text-ink-primary">
              Sisi Pengeluaran PDRB
            </h3>
            <span class="text-[11px] font-mono text-ink-muted">6 Komponen</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="exp in expenditures"
              :key="exp.code"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-ink-primary truncate max-w-[200px]" :title="exp.name">
                  <strong class="font-mono text-brand-primary mr-1">{{ exp.code }}</strong>
                  {{ exp.name }}
                </span>
                <span class="font-mono text-[11px] font-bold text-ink-secondary tabular-nums">
                  {{ exp.count }} ({{ exp.percent }}%)
                </span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                <div
                  class="h-full bg-brand-primary rounded-full transition-all duration-300"
                  :style="{ width: `${Math.max(4, exp.percent)}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Transmission Sources -->
        <div class="pt-6 border-t border-border-hairline">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-display font-bold text-sm text-ink-primary">
              Transmisi Sumber Data
            </h3>
            <span class="text-[11px] font-mono text-ink-muted">{{ formatNumberId(sourceTotal) }} total</span>
          </div>

          <div class="space-y-2">
            <div class="w-full h-2 rounded-full bg-surface-subtle overflow-hidden flex">
              <div
                class="h-full bg-brand-primary transition-all duration-500"
                :style="{ width: `${localPct}%` }"
              />
              <div
                class="h-full bg-terracotta transition-all duration-500"
                :style="{ width: `${nationalPct}%` }"
              />
            </div>
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-brand-primary font-semibold">
                ● Portal Lokal Kaltara ({{ localPct }}%)
              </span>
              <span class="text-terracotta-ink font-semibold">
                Kebijakan Nasional ({{ nationalPct }}%) ●
              </span>
            </div>
          </div>
        </div>

        <!-- CTA Callout -->
        <div class="p-4 rounded-2xl bg-white border border-border-hairline">
          <div class="text-xs font-semibold text-ink-primary">
            Analisis Berbasis Bukti
          </div>
          <p class="text-[11.5px] text-ink-secondary mt-1 leading-relaxed">
            Data dikumpulkan secara berkala untuk mendukung rekonsiliasi angka PDRB triwulanan dengan metodologi SNA 2008.
          </p>
          <NuxtLink
            to="/linimasa"
            class="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
          >
            <span>Buka Eksplorasi Interaktif</span>
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
