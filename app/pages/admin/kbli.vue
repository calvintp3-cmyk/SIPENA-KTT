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
            class="text-xs font-semibold text-[#737B76] hover:text-[#0B3D2E] transition-colors"
          >
            Kamus Taksonomi
          </NuxtLink>
          <span class="text-xs text-[#737B76]/60">/</span>
          <span class="text-xs font-bold text-[#0B3D2E]">Matriks Konkordansi 4-Generasi</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-[#141917] tracking-tight mt-1 flex items-center gap-2 font-display">
          <UIcon name="i-solar-route-bold-duotone" class="w-6 h-6 text-[#0B3D2E]" />
          <span>Matriks Konkordansi KBLI (2009 ↔ 2015 ↔ 2020 ↔ 2025)</span>
        </h1>
        <p class="text-xs sm:text-sm text-[#4A524E] mt-1 max-w-3xl leading-relaxed">
          Jembatan metodologi resmi Badan Pusat Statistik (BPS) RI untuk menelusuri evolusi klasifikasi lapangan usaha
          dari KBLI 2009 hingga KBLI 2025 (Peraturan BPS No. 7 Tahun 2025). Digunakan oleh engine SIPENA KTT untuk
          konversi lintas-generasi data PDRB Kabupaten Tana Tidung.
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink
          to="/admin/taxonomy"
          class="min-h-9 px-3.5 rounded-xl border border-[#141917]/10 bg-white hover:bg-[#F6F5F1] text-xs font-semibold text-[#141917] inline-flex items-center gap-1.5 transition-colors shadow-2xs font-mono"
        >
          <UIcon name="i-solar-book-bookmark-bold-duotone" class="w-4 h-4 text-[#737B76]" />
          <span>Taksonomi Sektor</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Interactive Quick Converter Card -->
    <div class="obs-panel p-5 sm:p-6 rounded-xl space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-[#0B3D2E] text-white flex items-center justify-center shrink-0">
            <UIcon name="i-solar-transfer-horizontal-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#141917] font-display">Kalkulator Konversi Cepat KBLI Antar-Generasi</h2>
            <p class="text-[11px] text-[#4A524E]">Pilih versi dan kategori untuk melihat padanan kode &amp; judul di ketiga edisi lainnya.</p>
          </div>
        </div>
        <span class="text-[10px] bg-[#E3F0EA] text-[#0B3D2E] font-extrabold px-2 py-0.5 rounded-full border border-[#BBD8CB] font-mono">
          Engine Konversi Aktif
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-[11px] font-bold text-[#4A524E] mb-1">Edisi KBLI Acuan</label>
          <select
            v-model="converterFromVersion"
            class="w-full h-9 px-3 rounded-xl border border-[#141917]/15 bg-white text-xs font-medium text-[#141917] focus:outline-none focus:border-[#0B3D2E] font-mono"
          >
            <option value="2025">KBLI 2025 (Terkini - 22 Kategori)</option>
            <option value="2020">KBLI 2020 (Transisi - 21 Kategori)</option>
            <option value="2015">KBLI 2015 (PDRB Baseline - 21 Kategori)</option>
            <option value="2009">KBLI 2009 (Awal - 21 Kategori)</option>
          </select>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-[#4A524E] mb-1">Kategori Lapangan Usaha</label>
          <select
            v-model="converterCode"
            class="w-full h-9 px-3 rounded-xl border border-[#141917]/15 bg-white text-xs font-medium text-[#141917] focus:outline-none focus:border-[#0B3D2E] truncate font-mono"
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
      <div v-if="convertedResults.entry" class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 font-mono">
        <div
          v-for="m in convertedResults.mappings"
          :key="m.version"
          class="p-3 rounded-xl border transition-all"
          :class="m.isCurrent ? 'bg-[#0B3D2E] text-white border-[#072B20] shadow-xs' : 'bg-white text-[#141917] border-[#141917]/10'"
        >
          <div class="text-[10px] font-bold uppercase tracking-wider mb-1" :class="m.isCurrent ? 'text-[#E3F0EA]' : 'text-[#737B76]'">
            KBLI {{ m.version }} {{ m.isCurrent ? '(Sumber)' : '' }}
          </div>
          <div class="text-base font-extrabold mb-0.5">
            Kategori {{ m.code }}
          </div>
          <div class="text-[11px] line-clamp-2 leading-snug font-sans" :class="m.isCurrent ? 'text-[#E3F0EA]/90' : 'text-[#4A524E]'" :title="m.title">
            {{ m.title }}
          </div>
        </div>
      </div>

      <div v-if="convertedResults.entry" class="p-3 bg-white rounded-xl border border-[#141917]/10 text-xs text-[#4A524E] space-y-1">
        <div class="flex items-center gap-1.5 font-bold text-[#0B3D2E] font-display">
          <UIcon name="i-solar-info-circle-bold-duotone" class="w-4 h-4 text-[#0B3D2E] shrink-0" />
          <span>{{ convertedResults.entry.pdrb_sector_mapping }}</span>
        </div>
        <p class="text-[11px] text-[#4A524E] leading-relaxed">
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
          :class="filterType === 'ALL' ? 'bg-[#0B3D2E] text-white shadow-2xs' : 'bg-[#ECEAE2] text-[#4A524E] hover:bg-[#E2DFD7]'"
          @click="filterType = 'ALL'"
        >
          Semua (22 Kategori)
        </button>
        <button
          type="button"
          class="min-h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="filterType === 'SHIFT' ? 'bg-[#C8553D] text-white shadow-2xs' : 'bg-[#ECEAE2] text-[#4A524E] hover:bg-[#E2DFD7]'"
          @click="filterType = 'SHIFT'"
        >
          Ada Pergeseran / Pemindahan
        </button>
        <button
          type="button"
          class="min-h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="filterType === 'STABLE' ? 'bg-[#0B3D2E] text-white shadow-2xs' : 'bg-[#ECEAE2] text-[#4A524E] hover:bg-[#E2DFD7]'"
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

    <!-- Concordance Master Table (Desktop >= lg) & Responsive Cards (< lg) -->
    <div class="obs-panel rounded-2xl overflow-hidden border border-[#141917]/10">
      <div
        role="region"
        aria-label="Tabel Matriks Konkordansi KBLI 4-Generasi"
        class="hidden lg:block w-full"
      >
        <table class="w-full table-fixed text-left text-xs border-collapse">
          <caption class="sr-only">
            Matriks Konkordansi Lapangan Usaha KBLI 2009, 2015, 2020, dan 2025 BPS RI
          </caption>
          <thead>
            <tr class="bg-[#F6F5F1] border-b border-[#141917]/10 text-[#4A524E] font-bold uppercase tracking-wider text-[10px]">
              <th scope="col" class="py-3 px-3.5 w-[18%]">KBLI 2025 (Terkini)</th>
              <th scope="col" class="py-3 px-2.5 w-[15%]">KBLI 2020</th>
              <th scope="col" class="py-3 px-2.5 w-[14%]">KBLI 2015</th>
              <th scope="col" class="py-3 px-2.5 w-[14%]">KBLI 2009</th>
              <th scope="col" class="py-3 px-3 w-[15%]">Akun PDRB KTT</th>
              <th scope="col" class="py-3 px-3 w-[18%]">Catatan Konkordansi BPS</th>
              <th scope="col" class="py-3 px-2.5 w-[6%] text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#141917]/10">
            <tr
              v-for="entry in filteredEntries"
              :key="entry.code_2025"
              class="hover:bg-[#E3F0EA]/30 transition-colors"
            >
              <!-- 2025 -->
              <th scope="row" class="py-3.5 px-4 align-top font-normal text-left">
                <div class="flex items-start gap-1.5">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#0B3D2E] text-white font-extrabold text-xs shrink-0 shadow-2xs">
                    {{ entry.code_2025 }}
                  </span>
                  <div class="font-bold text-[#141917] leading-snug">
                    {{ entry.title_2025 }}
                  </div>
                </div>
              </th>

              <!-- 2020 -->
              <td class="py-3.5 px-3 align-top">
                <div class="flex items-start gap-1.5">
                  <span
                    class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border"
                    :class="entry.code_2025 !== entry.code_2020 ? 'bg-[#FEF6EE] text-[#B45309] border-[#F7D3A6]' : 'bg-[#ECEAE2] text-[#4A524E] border-[#141917]/10'"
                  >
                    {{ entry.code_2020 }}
                  </span>
                  <span class="text-[#4A524E] leading-snug">
                    {{ entry.title_2020 }}
                  </span>
                </div>
              </td>

              <!-- 2015 -->
              <td class="py-3.5 px-3 align-top">
                <div class="flex items-start gap-1.5">
                  <span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-[#ECEAE2] text-[#4A524E] border border-[#141917]/10">
                    {{ entry.code_2015 }}
                  </span>
                  <span class="text-[#4A524E] leading-snug">
                    {{ entry.title_2015 }}
                  </span>
                </div>
              </td>

              <!-- 2009 -->
              <td class="py-3.5 px-3 align-top">
                <div class="flex items-start gap-1.5">
                  <span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-[#ECEAE2] text-[#4A524E] border border-[#141917]/10">
                    {{ entry.code_2009 }}
                  </span>
                  <span class="text-[#4A524E] leading-snug">
                    {{ entry.title_2009 }}
                  </span>
                </div>
              </td>

              <!-- PDRB Mapping -->
              <td class="py-3.5 px-4 align-top">
                <span class="inline-flex items-center gap-1 font-semibold text-[#141917] bg-[#F6F5F1] px-2.5 py-1 rounded-lg border border-[#141917]/10">
                  {{ entry.pdrb_sector_mapping }}
                </span>
              </td>

              <!-- Change Notes -->
              <td class="py-3.5 px-4 align-top">
                <p class="text-[#4A524E] leading-relaxed">
                  {{ entry.change_notes }}
                </p>
              </td>

              <!-- Action -->
              <td class="py-3.5 px-3 align-top text-center">
                <button
                  type="button"
                  title="Salin rincian konkordansi"
                  :aria-label="`Salin rincian konkordansi Kategori ${entry.code_2025}`"
                  class="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-[#737B76] hover:text-[#0B3D2E] hover:bg-[#E3F0EA] transition-colors cursor-pointer"
                  @click="copyEntryCitation(entry)"
                >
                  <UIcon name="i-solar-copy-bold-duotone" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile & Tablet (< lg): Kartu Konkordansi 4-Generasi -->
      <div class="lg:hidden divide-y divide-[#141917]/10">
        <div
          v-for="entry in filteredEntries"
          :key="`mob-kbli-${entry.code_2025}`"
          class="p-4 space-y-3 bg-white"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2 min-w-0">
              <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B3D2E] text-white font-extrabold text-xs shrink-0 shadow-2xs">
                {{ entry.code_2025 }}
              </span>
              <div class="min-w-0">
                <div class="font-bold text-xs sm:text-sm text-[#141917] leading-snug">
                  {{ entry.title_2025 }}
                </div>
                <span class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A524E] bg-[#ECEAE2] px-2 py-0.5 rounded-md border border-[#141917]/10">
                  Akun PDRB: {{ entry.pdrb_sector_mapping }}
                </span>
              </div>
            </div>

            <button
              type="button"
              title="Salin rincian konkordansi"
              class="w-8 h-8 rounded-lg border border-[#141917]/10 bg-white hover:bg-[#F6F5F1] text-[#4A524E] inline-flex items-center justify-center shrink-0 cursor-pointer"
              @click="() => { void copyEntryCitation(entry); }"
            >
              <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-2.5 text-xs">
            <div>
              <div class="text-[10px] font-bold uppercase text-[#737B76]">KBLI 2020</div>
              <div class="mt-0.5 font-medium text-[#141917]">
                <strong class="text-[#0B3D2E]">{{ entry.code_2020 }}</strong> — {{ entry.title_2020 }}
              </div>
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase text-[#737B76]">KBLI 2015</div>
              <div class="mt-0.5 text-[#4A524E]">
                <strong>{{ entry.code_2015 }}</strong> — {{ entry.title_2015 }}
              </div>
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase text-[#737B76]">KBLI 2009</div>
              <div class="mt-0.5 text-[#4A524E]">
                <strong>{{ entry.code_2009 }}</strong> — {{ entry.title_2009 }}
              </div>
            </div>
          </div>

          <p class="text-xs text-[#4A524E] leading-relaxed">
            {{ entry.change_notes }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
