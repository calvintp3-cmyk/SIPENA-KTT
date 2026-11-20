<!-- app/components/admin/review/ReviewHeaderToolbar.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import AppSegmentedControl, { type SegmentItem } from '~/components/shared/AppSegmentedControl.vue';

const props = defineProps<{
  periodScope: 'all' | 'period';
  shortPeriodLabel: string;
  onlyLlmFailed: boolean;
  llmFailedCount: number;
  activeStatus: string;
  statusTabs: Array<{ label: string; value: string; count: number; toneClass: string }>;
  searchInput: string;
}>();

const emit = defineEmits<{
  'update:periodScope': [value: 'all' | 'period'];
  'update:onlyLlmFailed': [value: boolean];
  'update:activeStatus': [value: any];
  'update:searchInput': [value: string];
}>();

const scopeItems = computed<SegmentItem<'all' | 'period'>[]>(() => [
  { value: 'all', label: 'Semua Antrean' },
  { value: 'period', label: `Hanya ${props.shortPeriodLabel}` },
]);

const statusSegmentItems = computed<SegmentItem<string>[]>(() =>
  props.statusTabs.map((t) => ({
    value: t.value,
    label: t.label,
    badge: t.count,
    badgeToneClass: t.toneClass,
  }))
);
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-primary text-balance font-display">
          Review Harian Fenomena Ekonomi
        </h1>
        <p class="text-xs text-ink-secondary mt-0.5 text-pretty flex flex-wrap items-center gap-1.5">
          <span>Audit klasifikasi AI dan pemetaan dua sisi PDRB sebelum ditayangkan.</span>
          <span aria-hidden="true" class="text-ink-primary/20">•</span>
          <span class="font-medium text-ink-primary">
            {{ periodScope === 'period' ? `Khusus ${shortPeriodLabel}` : 'Lintas semua periode' }}
          </span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Scope Switcher -->
        <AppSegmentedControl
          :model-value="periodScope"
          :items="scopeItems"
          variant="brand"
          size="xs"
          aria-label="Cakupan periode review"
          @update:model-value="emit('update:periodScope', $event)"
        />

        <div class="inline-flex items-center gap-2 rounded-xl bg-white border border-border-control px-3 min-h-9 py-1 shadow-2xs">
          <USwitch
            id="review-only-llm-failed"
            :model-value="onlyLlmFailed"
            size="sm"
            aria-label="Filter hanya artikel AI gagal"
            @update:model-value="emit('update:onlyLlmFailed', $event)"
          />
          <label for="review-only-llm-failed" class="text-xs font-semibold text-ink-primary cursor-pointer">
            AI Gagal
          </label>
          <span
            v-if="llmFailedCount > 0"
            class="px-2 py-0.5 rounded-full bg-terracotta-surface text-terracotta-ink border border-terracotta/30 text-[11px] font-bold tabular-nums font-mono"
          >
            {{ llmFailedCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- Status Tabs & Search -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <AppSegmentedControl
        :model-value="activeStatus"
        :items="statusSegmentItems"
        variant="surface"
        size="xs"
        aria-label="Status kurasi"
        @update:model-value="emit('update:activeStatus', $event)"
      />

      <UInput
        id="review-queue-search"
        :model-value="searchInput"
        type="search"
        size="sm"
        leading-icon="i-solar-magnifer-line-duotone"
        placeholder="Cari judul atau portal..."
        aria-label="Cari artikel pada antrean"
        class="w-full sm:w-64"
        @update:model-value="emit('update:searchInput', String($event))"
      />
    </div>
  </div>
</template>
