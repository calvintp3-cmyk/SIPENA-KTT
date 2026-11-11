<!-- app/components/public/SectorDistributionCharts.vue -->
<script setup lang="ts">
import type { ExpenditureComponentEnum, KbliCategoryEnum } from '#shared/enums/pdrb';
import type { PublicOverviewResponse } from '~/types/sipena';

const props = defineProps<{
  overview: PublicOverviewResponse | null;
  selectedKbli: string;
  selectedExpenditure: string;
  pending: boolean;
}>();

const emit = defineEmits<{
  'update:kbli': [value: string];
  'update:expenditure': [value: string];
}>();

const maxKbliCount = computed(() => {
  const list = props.overview?.kbliDistribution ?? [];
  return Math.max(1, ...list.map((i) => i.count));
});

const maxExpCount = computed(() => {
  const list = props.overview?.expenditureDistribution ?? [];
  return Math.max(1, ...list.map((i) => i.count));
});

function toggleKbliFilter(code: KbliCategoryEnum) {
  emit('update:kbli', props.selectedKbli === code ? 'ALL' : code);
}

function toggleExpenditureFilter(code: ExpenditureComponentEnum) {
  emit('update:expenditure', props.selectedExpenditure === code ? 'ALL' : code);
}
</script>

<template>
  <section
    aria-label="Sebaran Proporsi Sektor PDRB"
    class="grid grid-cols-1 lg:grid-cols-2 gap-4"
  >
    <!-- Grafik KBLI A-U -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-slate-900">
              Sebaran Lapangan Usaha (KBLI A–U)
            </h2>
            <p class="text-xs text-slate-500">
              Klik batang sektor untuk menyaring linimasa berita
            </p>
          </div>
          <UButton
            v-if="selectedKbli && selectedKbli !== 'ALL'"
            size="xs"
            color="primary"
            variant="subtle"
            icon="i-lucide-x"
            @click="emit('update:kbli', 'ALL')"
          >
            KBLI {{ selectedKbli }}
          </UButton>
        </div>
      </template>

      <div v-if="pending && !overview" class="space-y-3 py-2 animate-pulse">
        <div v-for="i in 4" :key="i" class="h-7 rounded bg-slate-100" />
      </div>

      <div
        v-else-if="!overview?.kbliDistribution.length"
        class="py-8 text-center text-xs text-slate-500"
      >
        Belum ada distribusi KBLI terverifikasi pada periode ini.
      </div>

      <div v-else class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <button
          v-for="item in overview.kbliDistribution"
          :key="item.code"
          type="button"
          :aria-pressed="selectedKbli === item.code"
          class="w-full text-left rounded-lg px-2.5 py-2 transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          :class="
            selectedKbli === item.code
              ? 'bg-teal-50/90 border-teal-300'
              : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
          "
          @click="toggleKbliFilter(item.code)"
        >
          <div class="flex items-center justify-between gap-3 text-xs mb-1">
            <span class="font-medium text-slate-800 truncate" :title="item.fullLabel">
              <span class="font-mono font-bold text-teal-700 mr-1">[{{ item.code }}]</span>
              {{ item.name }}
            </span>
            <span class="font-mono tabular-nums text-slate-600 shrink-0">
              {{ item.count }} ({{ item.percentage }}%)
            </span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="selectedKbli === item.code ? 'bg-teal-600' : 'bg-teal-500/80'"
              :style="{ width: `${Math.max(4, Math.round((item.count / maxKbliCount) * 100))}%` }"
            />
          </div>
        </button>
      </div>
    </UCard>

    <!-- Grafik Komponen PDRB Pengeluaran -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-slate-900">
              Sebaran Komponen PDRB Pengeluaran
            </h2>
            <p class="text-xs text-slate-500">
              Klik komponen untuk menyaring sisi penggunaan/pengeluaran
            </p>
          </div>
          <UButton
            v-if="selectedExpenditure && selectedExpenditure !== 'ALL'"
            size="xs"
            color="info"
            variant="subtle"
            icon="i-lucide-x"
            @click="emit('update:expenditure', 'ALL')"
          >
            Reset Komponen
          </UButton>
        </div>
      </template>

      <div v-if="pending && !overview" class="space-y-3 py-2 animate-pulse">
        <div v-for="i in 4" :key="i" class="h-7 rounded bg-slate-100" />
      </div>

      <div
        v-else-if="!overview?.expenditureDistribution.length"
        class="py-8 text-center text-xs text-slate-500"
      >
        Belum ada distribusi komponen pengeluaran terverifikasi pada periode ini.
      </div>

      <div v-else class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <button
          v-for="item in overview.expenditureDistribution"
          :key="item.code"
          type="button"
          :aria-pressed="selectedExpenditure === item.code"
          class="w-full text-left rounded-lg px-2.5 py-2 transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          :class="
            selectedExpenditure === item.code
              ? 'bg-sky-50/90 border-sky-300'
              : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
          "
          @click="toggleExpenditureFilter(item.code)"
        >
          <div class="flex items-center justify-between gap-3 text-xs mb-1">
            <span class="font-medium text-slate-800 truncate" :title="item.officialLabel">
              {{ item.label }}
            </span>
            <span class="font-mono tabular-nums text-slate-600 shrink-0">
              {{ item.count }} ({{ item.percentage }}%)
            </span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="selectedExpenditure === item.code ? 'bg-sky-600' : 'bg-sky-500/80'"
              :style="{ width: `${Math.max(4, Math.round((item.count / maxExpCount) * 100))}%` }"
            />
          </div>
        </button>
      </div>
    </UCard>
  </section>
</template>

