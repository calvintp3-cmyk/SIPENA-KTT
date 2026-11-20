<!-- app/components/admin/synthesis/SynthesisParameterBar.vue -->
<script setup lang="ts">
import type { SynthesisStyle } from '~/types/sipena';

const props = defineProps<{
  dimension: 'kbli' | 'expenditure';
  targetCode: string;
  style: SynthesisStyle;
  targetOptions: Array<{ value: string; label: string }>;
  styleOptions: Array<{ value: SynthesisStyle; label: string }>;
  shortPeriodLabel: string;
  targetClusterTheme: { pillClass: string; label?: string };
}>();

const emit = defineEmits<{
  requestDimensionChange: [dim: 'kbli' | 'expenditure'];
  requestTargetCodeChange: [code: string | undefined];
  'update:style': [style: SynthesisStyle];
}>();
</script>

<template>
  <div class="obs-panel rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
    <!-- Dimensi PDRB -->
    <div class="md:col-span-3 space-y-1.5">
      <span class="block text-xs font-semibold text-ink-secondary">
        Dimensi PDRB
      </span>
      <div
        role="group"
        aria-label="Pilih dimensi sintesis"
        class="grid grid-cols-2 p-1 bg-surface-subtle rounded-xl border border-border-hairline gap-1 font-mono"
      >
        <button
          type="button"
          :aria-pressed="dimension === 'kbli'"
          class="min-h-8 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer"
          :class="
            dimension === 'kbli'
              ? 'bg-white font-bold text-brand-primary shadow-2xs border border-brand-border'
              : 'text-ink-secondary hover:text-ink-primary font-medium'
          "
          @click="emit('requestDimensionChange', 'kbli')"
        >
          17 KBLI
        </button>
        <button
          type="button"
          :aria-pressed="dimension === 'expenditure'"
          class="min-h-8 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer"
          :class="
            dimension === 'expenditure'
              ? 'bg-white font-bold text-brand-primary shadow-2xs border border-brand-border'
              : 'text-ink-secondary hover:text-ink-primary font-medium'
          "
          @click="emit('requestDimensionChange', 'expenditure')"
        >
          6 Pengeluaran
        </button>
      </div>
    </div>

    <!-- Target Sektor / Komponen -->
    <div class="md:col-span-5 space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <label
          for="synth-target-select"
          class="block text-xs font-semibold text-ink-secondary"
        >
          Target Sektor / Komponen ({{ shortPeriodLabel }})
        </label>
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono"
          :class="targetClusterTheme.pillClass"
        >
          {{ dimension === 'kbli' ? `Klaster ${targetClusterTheme.label}` : targetCode }}
        </span>
      </div>
      <USelectMenu
        id="synth-target-select"
        :model-value="targetCode"
        :items="targetOptions"
        value-key="value"
        label-key="label"
        aria-label="Pilih target sektor atau komponen PDRB"
        class="w-full"
        @update:model-value="(val) => emit('requestTargetCodeChange', typeof val === 'string' ? val : undefined)"
      />
    </div>

    <!-- Format Gaya Penulisan -->
    <div class="md:col-span-4 space-y-1.5">
      <label
        for="synth-style-select"
        class="block text-xs font-semibold text-ink-secondary"
      >
        Format Gaya Penulisan
      </label>
      <USelect
        id="synth-style-select"
        :model-value="style"
        :items="styleOptions"
        value-key="value"
        label-key="label"
        aria-label="Pilih format gaya penulisan BRS"
        class="w-full"
        @update:model-value="(val) => emit('update:style', val as SynthesisStyle)"
      />
    </div>
  </div>
</template>
