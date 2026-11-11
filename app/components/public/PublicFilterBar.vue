<!-- app/components/public/PublicFilterBar.vue -->
<script setup lang="ts">
import type { SelectOptionItem } from '~/types/sipena';

const props = defineProps<{
  year: number;
  quarter: number;
  kbli: string;
  expenditure: string;
  searchQuery: string;
  availableYears: number[];
}>();

const emit = defineEmits<{
  'update:year': [value: number];
  'update:quarter': [value: number];
  'update:kbli': [value: string];
  'update:expenditure': [value: string];
  'update:searchQuery': [value: string];
  reset: [];
}>();

const { kbliOptions, expenditureOptions, quarterOptions } = usePdrbLabels();

const mobileAdvancedOpen = ref(false);

const yearItems = computed(() =>
  props.availableYears.map((y) => ({
    label: String(y),
    value: y,
  })),
);

const kbliFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua Kategori KBLI (A–U)', value: 'ALL' },
  ...kbliOptions,
]);

const expenditureFilterItems = computed<SelectOptionItem<string>[]>(() => [
  { label: 'Semua Komponen Pengeluaran', value: 'ALL' },
  ...expenditureOptions,
]);

const activeAdvancedCount = computed(() => {
  let count = 0;
  if (props.kbli !== 'ALL') count++;
  if (props.expenditure !== 'ALL') count++;
  if (props.searchQuery.trim() !== '') count++;
  return count;
});

const yearModel = computed({
  get: () => props.year,
  set: (val: number) => emit('update:year', val),
});

const quarterModel = computed({
  get: () => props.quarter,
  set: (val: number) => emit('update:quarter', val),
});

const kbliModel = computed({
  get: () => props.kbli,
  set: (val: string) => emit('update:kbli', val),
});

const expenditureModel = computed({
  get: () => props.expenditure,
  set: (val: string) => emit('update:expenditure', val),
});

const searchModel = computed({
  get: () => props.searchQuery,
  set: (val: string) => emit('update:searchQuery', val),
});
</script>

<template>
  <section
    aria-label="Filter Fenomena Ekonomi"
    class="sticky top-0 z-20 bg-white/95 backdrop-blur border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-xs"
  >
    <div class="flex flex-col gap-3">
      <!-- Baris Utama: Periode + Pencarian + Toggle Mobile -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        <div class="grid grid-cols-2 gap-2 md:col-span-4">
          <USelect
            v-model="quarterModel"
            :items="quarterOptions"
            value-key="value"
            label-key="label"
            aria-label="Pilih Triwulan PDRB"
            size="sm"
          />
          <USelect
            v-model="yearModel"
            :items="yearItems"
            value-key="value"
            label-key="label"
            aria-label="Pilih Tahun"
            size="sm"
          />
        </div>

        <div class="md:col-span-5">
          <UInput
            v-model="searchModel"
            icon="i-lucide-search"
            placeholder="Cari judul, komoditas, atau kata kunci (mis. sawit, batubara)..."
            aria-label="Cari berita fenomena ekonomi"
            size="sm"
            class="w-full"
          >
            <template v-if="searchModel" #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                aria-label="Bersihkan kata pencarian"
                @click="searchModel = ''"
              />
            </template>
          </UInput>
        </div>

        <div class="flex items-center justify-between md:justify-end gap-2 md:col-span-3">
          <UButton
            class="md:hidden"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-sliders-horizontal"
            @click="mobileAdvancedOpen = !mobileAdvancedOpen"
          >
            Filter Lanjutan{{ activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : '' }}
          </UButton>

          <UButton
            v-if="activeAdvancedCount > 0"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-rotate-ccw"
            @click="emit('reset')"
          >
            Reset Filter
          </UButton>
        </div>
      </div>

      <!-- Baris Sektor KBLI & Pengeluaran (Selalu tampil di >= md, toggle di < md) -->
      <div
        class="grid-cols-1 md:grid-cols-2 gap-2.5"
        :class="mobileAdvancedOpen ? 'grid' : 'hidden md:grid'"
      >
        <USelectMenu
          v-model="kbliModel"
          :items="kbliFilterItems"
          value-key="value"
          label-key="label"
          placeholder="Semua Kategori KBLI (A–U)"
          aria-label="Filter Kategori KBLI"
          size="sm"
          class="w-full"
        />

        <USelect
          v-model="expenditureModel"
          :items="expenditureFilterItems"
          value-key="value"
          label-key="label"
          aria-label="Filter Komponen Pengeluaran PDRB"
          size="sm"
          class="w-full"
        />
      </div>
    </div>
  </section>
</template>

