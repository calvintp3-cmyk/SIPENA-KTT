<!-- app/components/shared/AppChart.vue -->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    option: ECOption | null;
    heightClass?: string;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
  }>(),
  {
    heightClass: 'h-64',
    loading: false,
    empty: false,
    emptyTitle: 'Belum ada data grafik',
    emptyDescription: 'Data visualisasi akan tampil otomatis setelah tersedia pada periode ini.',
  },
);

const emit = defineEmits<{
  chartClick: [params: unknown];
}>();

function handleChartClick(params: unknown) {
  emit('chartClick', params);
}
</script>

<template>
  <div class="relative w-full" :class="heightClass">
    <div
      v-if="loading"
      class="w-full h-full rounded-xl bg-slate-100/80 border border-slate-200/70 flex flex-col justify-end gap-2.5 p-4"
    >
      <div class="h-3 w-32 rounded-full bg-slate-200/80 mb-auto" />
      <div class="grid grid-cols-6 gap-2 items-end h-36">
        <div class="h-16 rounded-t-lg bg-slate-200/80" />
        <div class="h-24 rounded-t-lg bg-slate-200/80" />
        <div class="h-32 rounded-t-lg bg-slate-200/90" />
        <div class="h-20 rounded-t-lg bg-slate-200/80" />
        <div class="h-28 rounded-t-lg bg-slate-200/80" />
        <div class="h-12 rounded-t-lg bg-slate-200/80" />
      </div>
    </div>

    <div
      v-else-if="empty || !option"
      class="w-full h-full rounded-xl bg-slate-50/80 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6"
    >
      <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
        <UIcon name="i-solar-chart-2-bold-duotone" class="w-5 h-5" />
      </div>
      <div class="text-xs font-semibold text-slate-700">{{ emptyTitle }}</div>
      <div class="text-[11px] text-slate-500 mt-0.5 max-w-xs">{{ emptyDescription }}</div>
    </div>

    <ClientOnly v-else>
      <VChart
        :option="option"
        autoresize
        class="w-full h-full"
        @click="handleChartClick"
      />
      <template #fallback>
        <div
          class="w-full h-full rounded-xl bg-slate-100/70 border border-slate-200/60 flex items-center justify-center text-xs text-slate-400"
        >
          Memuat visualisasi interaktif...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
