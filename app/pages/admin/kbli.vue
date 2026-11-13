<!-- app/pages/admin/kbli.vue -->
<script setup lang="ts">
import {
  KBLI_CONCORDANCE_ENTRIES,
  convertKbliVersion,
  getEntryCodeByVersion,
  getEntryTitleByVersion,
  type KbliConcordanceEntry,
  type KbliVersion,
} from '#shared/utils/kbli-concordance';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const searchQuery = ref('');
const filterType = ref<'ALL' | 'SHIFT' | 'STABLE'>('ALL');

// Interactive Converter State
const converterFromVersion = ref<KbliVersion>('2025');
const converterCode = ref<string>('A');

const convertedResults = computed(() => {
  const versions: KbliVersion[] = ['2025', '2020', '2015', '2009'];
  const baseEntry = KBLI_CONCORDANCE_ENTRIES.find((item) => {
    const val = getEntryCodeByVersion(item, converterFromVersion.value);
    return val.toUpperCase() === converterCode.value.toUpperCase();
  });

  return {
    entry: baseEntry,
    mappings: versions.map((v) => ({
      version: v,
      code: baseEntry ? getEntryCodeByVersion(baseEntry, v) : '-',
      title: baseEntry ? getEntryTitleByVersion(baseEntry, v) : '-',
      isCurrent: v === converterFromVersion.value,
    })),
  };
});

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase());

const filteredEntries = computed<KbliConcordanceEntry[]>(() => {
  return KBLI_CONCORDANCE_ENTRIES.filter((entry) => {
    // Filter Type
    const isShifted =
      entry.code_2025 !== entry.code_2020 ||
      entry.code_2020 !== entry.code_2015 ||
      entry.code_2015 !== entry.code_2009 ||
      entry.change_notes.includes('PERUBAHAN') ||
      entry.change_notes.includes('KATEGORI BARU') ||
      entry.change_notes.includes('PERGESERAN');

    if (filterType.value === 'SHIFT' && !isShifted) return false;
    if (filterType.value === 'STABLE' && isShifted) return false;

    // Search Query
    const q = normalizedSearch.value;
    if (!q) return true;

    return (
      entry.code_2025.toLowerCase().includes(q) ||
      entry.title_2025.toLowerCase().includes(q) ||
      entry.code_2020.toLowerCase().includes(q) ||
      entry.title_2020.toLowerCase().includes(q) ||
      entry.code_2015.toLowerCase().includes(q) ||
      entry.title_2015.toLowerCase().includes(q) ||
      entry.code_2009.toLowerCase().includes(q) ||
      entry.title_2009.toLowerCase().includes(q) ||
      entry.pdrb_sector_mapping.toLowerCase().includes(q) ||
      entry.change_notes.toLowerCase().includes(q)
    );
  });
});

async function copyEntryCitation(entry: KbliConcordanceEntry) {
  const text = `[Konkordansi KBLI BPS] 2025: ${entry.code_2025} (${entry.title_2025}) <=> 2020: ${entry.code_2020} <=> 2015: ${entry.code_2015} <=> 2009: ${entry.code_2009}. PDRB: ${entry.pdrb_sector_mapping}. Catatan: ${entry.change_notes}`;
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: 'Konkordansi Disalin',
      description: `Format padanan Kategori ${entry.code_2025} berhasil disalin ke clipboard.`,
      color: 'success',
      icon: 'i-lucide-clipboard-check',
    });
  } catch {
    toast.add({
      title: 'Gagal Menyalin',
      color: 'warning',
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/admin/taxonomy"
            class="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            Kamus Taksonomi
          </NuxtLink>
          <span class="text-xs text-slate-400">/</span>
          <span class="text-xs font-bold text-indigo-700">Matriks Konkordansi 4-Generasi</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
          <UIcon name="i-solar-route-bold-duotone" class="w-6 h-6 text-indigo-600" />
          <span>Matriks Konkordansi KBLI (2009 ↔ 2015 ↔ 2020 ↔ 2025)</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          Jembatan metodologi resmi Badan Pusat Statistik (BPS) RI untuk menelusuri evolusi klasifikasi lapangan usaha
          dari KBLI 2009 hingga KBLI 2025 (Peraturan BPS No. 7 Tahun 2025). Digunakan oleh engine SIPENA KTT untuk
          konversi lintas-generasi data PDRB Kabupaten Tana Tidung.
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink
          to="/admin/taxonomy"
          class="min-h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <UIcon name="i-solar-book-bookmark-bold-duotone" class="w-4 h-4 text-slate-500" />
          <span>Taksonomi Sektor</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Interactive Quick Converter Card -->
    <div class="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/70 border border-indigo-200/90 shadow-2xs space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <UIcon name="i-solar-transfer-horizontal-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900">Kalkulator Konversi Cepat KBLI Antar-Generasi</h2>
            <p class="text-[11px] text-slate-600">Pilih versi dan kategori untuk melihat padanan kode & judul di ketiga edisi lainnya.</p>
          </div>
        </div>
        <span class="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
          Engine Konversi Aktif
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-1">Edisi KBLI Acuan</label>
          <select
            v-model="converterFromVersion"
            class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="2025">KBLI 2025 (Terkini - 22 Kategori)</option>
            <option value="2020">KBLI 2020 (Transisi - 21 Kategori)</option>
            <option value="2015">KBLI 2015 (PDRB Baseline - 21 Kategori)</option>
            <option value="2009">KBLI 2009 (Awal - 21 Kategori)</option>
          </select>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 mb-1">Kategori Lapangan Usaha</label>
          <select
            v-model="converterCode"
            class="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 truncate"
          >
            <option
              v-for="item in KBLI_CONCORDANCE_ENTRIES"
              :key="item.code_2025"
              :value="getEntryCodeByVersion(item, converterFromVersion)"
            >
              {{ getEntryCodeByVersion(item, converterFromVersion) }} - {{ getEntryTitleByVersion(item, converterFromVersion) }}
            </option>
          </select>
        </div>
      </div>

      <!-- Result Grid -->
      <div v-if="convertedResults.entry" class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
        <div
          v-for="m in convertedResults.mappings"
          :key="m.version"
          class="p-3 rounded-xl border transition-all"
          :class="m.isCurrent ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-800 border-slate-200/90'"
        >
          <div class="text-[10px] font-bold uppercase tracking-wider mb-1" :class="m.isCurrent ? 'text-indigo-200' : 'text-slate-500'">
            KBLI {{ m.version }} {{ m.isCurrent ? '(Sumber)' : '' }}
          </div>
          <div class="text-base font-extrabold mb-0.5">
            Kategori {{ m.code }}
          </div>
          <div class="text-[11px] line-clamp-2 leading-snug" :class="m.isCurrent ? 'text-indigo-100' : 'text-slate-600'" :title="m.title">
            {{ m.title }}
          </div>
        </div>
      </div>

      <div v-if="convertedResults.entry" class="p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-1">
        <div class="flex items-center gap-1.5 font-bold text-indigo-900">
          <UIcon name="i-solar-info-circle-bold-duotone" class="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{{ convertedResults.entry.pdrb_sector_mapping }}</span>
        </div>
        <p class="text-[11px] text-slate-600 leading-relaxed">
          {{ convertedResults.entry.change_notes }}
        </p>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="filterType === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          @click="filterType = 'ALL'"
        >
          Semua (22 Kategori)
        </button>
        <button
          type="button"
          class="min-h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="filterType === 'SHIFT' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          @click="filterType = 'SHIFT'"
        >
          Ada Pergeseran / Pemindahan
        </button>
        <button
          type="button"
          class="min-h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="filterType === 'STABLE' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          @click="filterType = 'STABLE'"
        >
          Struktur Stabil
        </button>
      </div>

      <div class="w-full sm:w-72">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Cari kode, judul, atau catatan..."
          class="w-full"
        />
      </div>
    </div>

    <!-- Concordance Master Table -->
    <div class="saas-card rounded-2xl overflow-hidden border border-slate-200">
      <div class="overflow-x-auto saas-scroll">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <th class="py-3 px-4 w-48">KBLI 2025 (Terkini)</th>
              <th class="py-3 px-3 w-40">KBLI 2020</th>
              <th class="py-3 px-3 w-36">KBLI 2015</th>
              <th class="py-3 px-3 w-36">KBLI 2009</th>
              <th class="py-3 px-4 w-48">Akun PDRB KTT</th>
              <th class="py-3 px-4 min-w-[280px]">Catatan Konkordansi BPS</th>
              <th class="py-3 px-3 w-16 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="entry in filteredEntries"
              :key="entry.code_2025"
              class="hover:bg-indigo-50/30 transition-colors"
            >
              <!-- 2025 -->
              <td class="py-3.5 px-4 align-top">
                <div class="flex items-start gap-1.5">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs shrink-0 shadow-2xs">
                    {{ entry.code_2025 }}
                  </span>
                  <div class="font-bold text-slate-900 leading-snug">
                    {{ entry.title_2025 }}
                  </div>
                </div>
              </td>

              <!-- 2020 -->
              <td class="py-3.5 px-3 align-top">
                <div class="flex items-start gap-1.5">
                  <span
                    class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border"
                    :class="entry.code_2025 !== entry.code_2020 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'"
                  >
                    {{ entry.code_2020 }}
                  </span>
                  <span class="text-slate-700 leading-snug">
                    {{ entry.title_2020 }}
                  </span>
                </div>
              </td>

              <!-- 2015 -->
              <td class="py-3.5 px-3 align-top">
                <div class="flex items-start gap-1.5">
                  <span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                    {{ entry.code_2015 }}
                  </span>
                  <span class="text-slate-600 leading-snug">
                    {{ entry.title_2015 }}
                  </span>
                </div>
              </td>

              <!-- 2009 -->
              <td class="py-3.5 px-3 align-top">
                <div class="flex items-start gap-1.5">
                  <span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                    {{ entry.code_2009 }}
                  </span>
                  <span class="text-slate-600 leading-snug">
                    {{ entry.title_2009 }}
                  </span>
                </div>
              </td>

              <!-- PDRB Mapping -->
              <td class="py-3.5 px-4 align-top">
                <span class="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                  {{ entry.pdrb_sector_mapping }}
                </span>
              </td>

              <!-- Change Notes -->
              <td class="py-3.5 px-4 align-top">
                <p class="text-slate-600 leading-relaxed">
                  {{ entry.change_notes }}
                </p>
              </td>

              <!-- Action -->
              <td class="py-3.5 px-3 align-top text-center">
                <button
                  type="button"
                  title="Salin rincian konkordansi"
                  class="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                  @click="copyEntryCitation(entry)"
                >
                  <UIcon name="i-solar-copy-bold-duotone" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
