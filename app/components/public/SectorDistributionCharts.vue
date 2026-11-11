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
    <div class="saas-card rounded-xl overflow-hidden flex flex-col">
      <div class="px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2 bg-[#F8FAFC]">
        <div>
          <h2 class="text-sm font-bold text-[#0B1220]">
            Sebaran Lapangan Usaha (KBLI A–U)
          </h2>
          <p class="text-xs text-[#5B677A]">
            Klik batang sektor untuk menyaring linimasa berita
          </p>
        </div>
        <button
          v-if="selectedKbli && selectedKbli !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
          @click="emit('update:kbli', 'ALL')"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
          <span>KBLI {{ selectedKbli }}</span>
        </button>
      </div>

      <div class="p-4 flex-1">
        <div v-if="pending && !overview" class="space-y-3 py-2">
          <div v-for="i in 4" :key="i" class="h-7 rounded bg-slate-100" />
        </div>

        <div
          v-else-if="!overview?.kbliDistribution.length"
          class="py-8 text-center text-xs text-slate-500"
        >
          Belum ada distribusi KBLI terverifikasi pada periode ini.
        </div>

        <div v-else class="space-y-2 max-h-[260px] overflow-y-auto saas-scroll pr-1">
          <button
            v-for="item in overview.kbliDistribution"
            :key="item.code"
            type="button"
            :aria-pressed="selectedKbli === item.code"
            class="w-full text-left rounded-lg px-2.5 py-2 transition-colors border"
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
                :class="selectedKbli === item.code ? 'bg-teal-700' : 'bg-teal-600/80'"
                :style="{ width: `${Math.max(4, Math.round((item.count / maxKbliCount) * 100))}%` }"
              />
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Grafik Komponen PDRB Pengeluaran -->
    <div class="saas-card rounded-xl overflow-hidden flex flex-col">
      <div class="px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2 bg-[#F8FAFC]">
        <div>
          <h2 class="text-sm font-bold text-[#0B1220]">
            Sebaran Komponen PDRB Pengeluaran
          </h2>
          <p class="text-xs text-[#5B677A]">
            Klik komponen untuk menyaring sisi penggunaan/pengeluaran
          </p>
        </div>
        <button
          v-if="selectedExpenditure && selectedExpenditure !== 'ALL'"
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
          @click="emit('update:expenditure', 'ALL')"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div class="p-4 flex-1">
        <div v-if="pending && !overview" class="space-y-3 py-2">
          <div v-for="i in 4" :key="i" class="h-7 rounded bg-slate-100" />
        </div>

        <div
          v-else-if="!overview?.expenditureDistribution.length"
          class="py-8 text-center text-xs text-slate-500"
        >
          Belum ada distribusi komponen pengeluaran terverifikasi pada periode ini.
        </div>

        <div v-else class="space-y-2 max-h-[260px] overflow-y-auto saas-scroll pr-1">
          <button
            v-for="item in overview.expenditureDistribution"
            :key="item.code"
            type="button"
            :aria-pressed="selectedExpenditure === item.code"
            class="w-full text-left rounded-lg px-2.5 py-2 transition-colors border"
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
                :class="selectedExpenditure === item.code ? 'bg-sky-700' : 'bg-sky-600/80'"
                :style="{ width: `${Math.max(4, Math.round((item.count / maxExpCount) * 100))}%` }"
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
