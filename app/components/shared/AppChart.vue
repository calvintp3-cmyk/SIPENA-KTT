<!-- app/components/shared/AppChart.vue -->
<script setup lang="ts">
import { SIPENA_CHART_ARIA_CONFIG } from '~/utils/chart-theme';

const props = withDefaults(
  defineProps<{
    option: ECOption | null;
    heightClass?: string;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    enableAriaDecal?: boolean;
  }>(),
  {
    heightClass: 'h-64',
    loading: false,
    empty: false,
    emptyTitle: 'Belum ada data grafik',
    emptyDescription: 'Data visualisasi akan tampil otomatis setelah tersedia pada periode ini.',
    enableAriaDecal: true,
  },
);

const emit = defineEmits<{
  chartClick: [params: unknown];
}>();

const accessibleOption = computed<ECOption | null>(() => {
  if (!props.option) return null;
  if (!props.enableAriaDecal) return props.option;
  const rawAria =
    typeof props.option === 'object' && props.option && 'aria' in props.option
      ? (props.option as Record<string, unknown>).aria
      : {};
  return {
    ...props.option,
    aria: {
      ...SIPENA_CHART_ARIA_CONFIG,
      ...(typeof rawAria === 'object' && rawAria ? rawAria : {}),
    },
  } as ECOption;
});

function handleChartClick(params: unknown) {
  emit('chartClick', params);
}
</script>

<template>
  <div class="relative w-full" :class="heightClass">
    <div
      v-if="loading"
      class="w-full h-full rounded-xl bg-surface-subtle border border-border-hairline flex flex-col justify-end gap-2.5 p-4"
    >
      <div class="h-3 w-32 rounded-full bg-[#141917]/[0.08] mb-auto" />
      <div class="grid grid-cols-6 gap-2 items-end h-36">
        <div class="h-16 rounded-t-lg bg-[#141917]/[0.08]" />
        <div class="h-24 rounded-t-lg bg-[#141917]/[0.08]" />
        <div class="h-32 rounded-t-lg bg-[#141917]/[0.10]" />
        <div class="h-20 rounded-t-lg bg-[#141917]/[0.08]" />
        <div class="h-28 rounded-t-lg bg-[#141917]/[0.08]" />
        <div class="h-12 rounded-t-lg bg-[#141917]/[0.08]" />
      </div>
    </div>

    <div
      v-else-if="empty || !accessibleOption"
      class="w-full h-full rounded-xl bg-canvas border border-dashed border-border-control flex flex-col items-center justify-center text-center px-6"
    >
      <div class="w-10 h-10 rounded-xl bg-surface-subtle text-ink-muted flex items-center justify-center mb-2.5">
        <UIcon name="i-solar-chart-2-bold-duotone" class="w-5 h-5" aria-hidden="true" />
      </div>
      <div class="text-xs font-semibold text-ink-primary">{{ emptyTitle }}</div>
      <div class="text-[11px] text-ink-secondary mt-0.5 max-w-xs">{{ emptyDescription }}</div>
    </div>

    <ClientOnly v-else>
      <VChart
        :option="accessibleOption"
        autoresize
        class="w-full h-full"
        @click="handleChartClick"
      />
      <template #fallback>
        <div
          class="w-full h-full rounded-xl bg-surface-subtle border border-border-hairline flex items-center justify-center text-xs text-ink-secondary"
        >
          Memuat visualisasi interaktif...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
