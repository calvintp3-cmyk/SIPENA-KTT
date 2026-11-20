<!-- app/components/admin/review/ReviewHeaderToolbar.vue -->
<script setup lang="ts">
defineProps<{
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
        <div
          role="group"
          aria-label="Cakupan periode review"
          class="inline-flex p-1 bg-surface-subtle rounded-xl border border-border-hairline font-mono"
        >
          <button
            type="button"
            :aria-pressed="periodScope === 'all'"
            class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
            :class="
              periodScope === 'all'
                ? 'bg-white font-bold text-brand-primary shadow-2xs border border-brand-border'
                : 'text-ink-secondary hover:text-ink-primary font-medium'
            "
            @click="emit('update:periodScope', 'all')"
          >
            Semua Antrean
          </button>
          <button
            type="button"
            :aria-pressed="periodScope === 'period'"
            class="min-h-8 px-3 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
            :class="
              periodScope === 'period'
                ? 'bg-white font-bold text-brand-primary shadow-2xs border border-brand-border'
                : 'text-ink-secondary hover:text-ink-primary font-medium'
            "
            @click="emit('update:periodScope', 'period')"
          >
            Hanya {{ shortPeriodLabel }}
          </button>
        </div>

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
      <div
        role="group"
        aria-label="Status kurasi"
        class="inline-flex flex-nowrap overflow-x-auto saas-scroll p-1 bg-surface-subtle rounded-xl border border-border-hairline max-w-full gap-1 font-mono"
      >
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          :aria-pressed="activeStatus === tab.value"
          class="min-h-8 px-3 py-1 rounded-lg text-xs inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
          :class="
            activeStatus === tab.value
              ? 'bg-white font-bold text-ink-primary shadow-2xs border border-border-hairline'
              : 'text-ink-secondary hover:text-ink-primary font-medium'
          "
          @click="emit('update:activeStatus', tab.value)"
        >
          <span class="font-sans">{{ tab.label }}</span>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border font-mono"
            :class="tab.toneClass"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

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
