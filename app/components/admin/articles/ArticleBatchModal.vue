<!-- app/components/admin/articles/ArticleBatchModal.vue -->
<script setup lang="ts">
const props = defineProps<{
  selectedIds: string[];
  open: boolean;
  isReclassifying: boolean;
  kbliOptions: Array<{ label: string; value: string }>;
  kbliImpactOptions: Array<{ label: string; value: string }>;
  expenditureOptions: Array<{ label: string; value: string }>;
  expenditureImpactOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  'update:open': [val: boolean];
  bulkVerify: [];
  bulkIgnore: [];
  clearSelection: [];
  bulkReclassify: [
    payload: {
      kbli: string;
      kbliImpact: string;
      expenditure: string;
      expenditureImpact: string;
    },
  ];
}>();

const bulkKbli = ref('KEEP');
const bulkKbliImpact = ref('KEEP');
const bulkExpenditure = ref('KEEP');
const bulkExpenditureImpact = ref('KEEP');

function handleApply() {
  emit('bulkReclassify', {
    kbli: bulkKbli.value,
    kbliImpact: bulkKbliImpact.value,
    expenditure: bulkExpenditure.value,
    expenditureImpact: bulkExpenditureImpact.value,
  });
}
</script>

<template>
  <div>
    <!-- Floating Selection Batch Bar (Deep Borneo Pine Command Bar) -->
    <div
      v-if="selectedIds.length > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-brand-primary text-white rounded-2xl shadow-xl border border-[#072B20] px-4 py-2.5 flex flex-wrap items-center gap-3 transition-all"
    >
      <span class="text-xs font-bold tabular-nums font-mono">
        {{ selectedIds.length }} Berita Dipilih
      </span>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-white text-brand-primary hover:bg-brand-tint text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="emit('update:open', true)"
        >
          <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-3.5 h-3.5" />
          <span>Ubah Klasifikasi</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          @click="emit('bulkVerify')"
        >
          <UIcon name="i-lucide-check" class="w-3.5 h-3.5" />
          <span>Verifikasi</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-3 rounded-xl bg-[#072B20] hover:bg-[#041a13] text-xs font-medium text-[#E3F0EA] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          @click="emit('bulkIgnore')"
        >
          <span>Abaikan</span>
        </button>

        <button
          type="button"
          class="min-h-8 px-2.5 rounded-xl text-xs font-medium text-[#E3F0EA]/70 hover:text-white cursor-pointer"
          @click="emit('clearSelection')"
        >
          Batal
        </button>
      </div>
    </div>

    <!-- Modal Bulk Re-classify -->
    <UModal
      :open="open"
      title="Ubah Klasifikasi Massal"
      :description="`Tetapkan kategori baru untuk ${selectedIds.length} berita terpilih sekaligus.`"
      @update:open="emit('update:open', $event)"
    >
      <template #body>
        <div class="space-y-4 text-xs">
          <div class="space-y-1.5">
            <label for="bulk-kbli" class="font-bold text-ink-secondary">Kategori Lapangan Usaha (KBLI)</label>
            <select
              id="bulk-kbli"
              v-model="bulkKbli"
              class="w-full h-9 px-3 rounded-xl border border-border-control bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah KBLI)</option>
              <option v-for="item in kbliOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="bulk-kbli-impact" class="font-bold text-ink-secondary">Arah Dampak Aktivitas</label>
            <select
              id="bulk-kbli-impact"
              v-model="bulkKbliImpact"
              class="w-full h-9 px-3 rounded-xl border border-border-control bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Dampak)</option>
              <option v-for="item in kbliImpactOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="bulk-expenditure" class="font-bold text-ink-secondary">Komponen Pengeluaran</label>
            <select
              id="bulk-expenditure"
              v-model="bulkExpenditure"
              class="w-full h-9 px-3 rounded-xl border border-border-control bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Pengeluaran)</option>
              <option v-for="item in expenditureOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="bulk-expenditure-impact" class="font-bold text-ink-secondary">Arah Dampak Pengeluaran</label>
            <select
              id="bulk-expenditure-impact"
              v-model="bulkExpenditureImpact"
              class="w-full h-9 px-3 rounded-xl border border-border-control bg-white text-xs font-medium text-ink-primary focus:outline-none focus:border-brand-primary"
            >
              <option value="KEEP">(Tetap / Jangan Ubah Dampak)</option>
              <option v-for="item in expenditureImpactOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="emit('update:open', false)">
            Batal
          </UButton>
          <UButton color="primary" :loading="isReclassifying" @click="handleApply">
            Terapkan ke {{ selectedIds.length }} Berita
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
