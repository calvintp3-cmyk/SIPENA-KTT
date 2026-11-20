<!-- app/components/admin/articles/ArticleFilterPanel.vue -->
<script setup lang="ts">
import { VerificationStatusEnum } from '#shared/enums/pdrb';
import type { ArticleFiltersState } from '~/composables/useArticleQuery';
import type { AdminSummaryCounts, SelectOptionItem } from '~/types/sipena';

const props = defineProps<{
  filters: ArticleFiltersState;
  summaryCounts?: AdminSummaryCounts;
  allArticlesCount: number;
  isSyncedToGlobalPeriod: boolean;
  shortPeriodLabel: string;
  pdrbGroupFilterItems: SelectOptionItem<string>[];
  kbliFilterItems: SelectOptionItem<string>[];
  expenditureFilterItems: SelectOptionItem<string>[];
  portalFilterItems: SelectOptionItem<string>[];
  yearFilterItems: Array<{ label: string; value: 'ALL' | number }>;
  quarterFilterItems: Array<{ label: string; value: 'ALL' | 1 | 2 | 3 | 4 }>;
  subdistrictFilterItems: SelectOptionItem<string>[];
  activeFilterChips: Array<{ key: string; label: string; clear: () => void }>;
}>();

const showAdvancedFilters = defineModel<boolean>('showAdvancedFilters', { default: false });
const activeTabStatus = defineModel<string>('activeTabStatus', { required: true });

const emit = defineEmits<{
  syncPeriod: [];
  resetAll: [];
  applyDatePreset: [preset: 'all' | 'today' | 'last7d' | 'last30d' | 'thisQuarter'];
}>();

const advancedFilterActiveCount = computed(() => {
  let count = 0;
  if (props.filters.pdrbGroup !== 'ALL' || props.filters.kbli !== 'ALL') count++;
  if (props.filters.expenditure !== 'ALL') count++;
  if (props.filters.portal !== 'ALL') count++;
  if (props.filters.subdistrict !== 'ALL') count++;
  if (props.filters.isEconomic !== 'ALL') count++;
  if (props.filters.from || props.filters.to) count++;
  return count;
});

const isEconomicItems: SelectOptionItem<string>[] = [
  { label: 'Semua Status', value: 'ALL' },
  { label: 'Fenomena Ekonomi', value: 'true' },
  { label: 'Non-Ekonomi', value: 'false' },
];
</script>

<template>
  <div class="obs-panel rounded-xl p-4 sm:p-5 space-y-4">
    <!-- Quick Status Segment Tabs -->
    <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-hairline">
      <div class="flex flex-wrap items-center gap-1.5 p-1 bg-surface-subtle rounded-xl border border-border-hairline font-mono">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-8"
          :class="
            activeTabStatus === 'ALL'
              ? 'bg-white text-brand-primary shadow-xs border border-border-hairline'
              : 'text-ink-muted hover:text-ink-primary'
          "
          @click="activeTabStatus = 'ALL'"
        >
          <span class="font-sans">Semua Berita</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle text-ink-secondary tabular-nums font-bold">
            {{ allArticlesCount }}
          </span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-8"
          :class="
            activeTabStatus === VerificationStatusEnum.VERIFIED
              ? 'bg-white text-brand-primary shadow-xs border border-border-hairline'
              : 'text-ink-muted hover:text-ink-primary'
          "
          @click="activeTabStatus = VerificationStatusEnum.VERIFIED"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-brand-primary" />
          <span class="font-sans">Terverifikasi</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-tint text-brand-primary tabular-nums font-bold">
            {{ summaryCounts?.verifiedCount ?? 0 }}
          </span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-8"
          :class="
            activeTabStatus === VerificationStatusEnum.PENDING
              ? 'bg-white text-ochre-ink shadow-xs border border-border-hairline'
              : 'text-ink-muted hover:text-ink-primary'
          "
          @click="activeTabStatus = VerificationStatusEnum.PENDING"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-ochre" />
          <span class="font-sans">Menunggu Review</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FEF6EE] text-ochre-ink tabular-nums font-bold">
            {{ summaryCounts?.pendingCount ?? 0 }}
          </span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-8"
          :class="
            activeTabStatus === VerificationStatusEnum.IGNORED
              ? 'bg-white text-ink-secondary shadow-xs border border-border-hairline'
              : 'text-ink-muted hover:text-ink-primary'
          "
          @click="activeTabStatus = VerificationStatusEnum.IGNORED"
        >
          <span class="font-sans">Diabaikan</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle text-ink-secondary tabular-nums font-bold">
            {{ summaryCounts?.ignoredCount ?? 0 }}
          </span>
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-8"
          :class="
            activeTabStatus === 'LLM_FAILED'
              ? 'bg-white text-terracotta-ink shadow-xs border border-border-hairline'
              : 'text-ink-muted hover:text-ink-primary'
          "
          @click="activeTabStatus = 'LLM_FAILED'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-terracotta" />
          <span class="font-sans">Gagal AI</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-terracotta-surface text-terracotta-ink tabular-nums font-bold">
            {{ summaryCounts?.llmFailedCount ?? 0 }}
          </span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="!isSyncedToGlobalPeriod"
          type="button"
          class="h-8 px-2.5 rounded-lg border border-brand-border bg-brand-tint hover:bg-[#D5E8DF] text-xs font-semibold text-brand-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
          @click="emit('syncPeriod')"
        >
          <UIcon name="i-solar-calendar-mark-bold-duotone" class="w-3.5 h-3.5" />
          <span>Sinkron {{ shortPeriodLabel }}</span>
        </button>

        <button
          type="button"
          class="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
          :class="
            showAdvancedFilters || advancedFilterActiveCount > 0
              ? 'border-brand-border bg-brand-tint text-brand-primary'
              : 'border-border-hairline bg-white hover:bg-canvas text-ink-secondary'
          "
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <UIcon name="i-solar-filter-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
          <span>Filter Lanjutan</span>
          <span
            v-if="advancedFilterActiveCount > 0"
            class="w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center font-bold font-mono"
          >
            {{ advancedFilterActiveCount }}
          </span>
          <UIcon :name="showAdvancedFilters ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-3 h-3 text-ink-muted/70" />
        </button>
      </div>
    </div>

    <!-- Primary Compact Filter Row -->
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
      <div class="sm:col-span-5">
        <label for="articles-filter-q" class="sr-only">Cari judul, ringkasan, atau URL</label>
        <UInput
          id="articles-filter-q"
          v-model="filters.q"
          icon="i-solar-magnifer-line-duotone"
          placeholder="Cari judul berita, ringkasan, atau URL..."
          size="sm"
          class="w-full"
        />
      </div>

      <div class="sm:col-span-2">
        <label for="articles-filter-year" class="sr-only">Filter Tahun</label>
        <USelect
          id="articles-filter-year"
          v-model="filters.year"
          :items="yearFilterItems"
          value-key="value"
          label-key="label"
          aria-label="Filter Tahun"
          size="sm"
          class="w-full"
        />
      </div>

      <div class="sm:col-span-2">
        <label for="articles-filter-quarter" class="sr-only">Filter Triwulan</label>
        <USelect
          id="articles-filter-quarter"
          v-model="filters.quarter"
          :items="quarterFilterItems"
          value-key="value"
          label-key="label"
          aria-label="Filter Triwulan"
          size="sm"
          class="w-full"
        />
      </div>

      <div class="sm:col-span-3">
        <label for="articles-filter-pdrb-group" class="sr-only">Filter Sektor Usaha</label>
        <USelectMenu
          id="articles-filter-pdrb-group"
          v-model="filters.pdrbGroup"
          :items="pdrbGroupFilterItems"
          value-key="value"
          label-key="label"
          aria-label="Filter Sektor Lapangan Usaha"
          placeholder="Semua Sektor Lapangan Usaha"
          size="sm"
          class="w-full"
        />
      </div>
    </div>

    <!-- Collapsible Advanced Filter Section (Bento Grouping) -->
    <div
      v-if="showAdvancedFilters"
      class="pt-3 border-t border-border-hairline space-y-3"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- BENTO 1: Dimensi Klasifikasi PDRB -->
        <div class="rounded-xl border border-brand-border bg-brand-tint/30 p-3.5 space-y-3">
          <div class="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
            <UIcon name="i-solar-layers-minimalistic-bold-duotone" class="w-4 h-4 text-brand-primary" />
            <span>Dimensi Klasifikasi PDRB</span>
          </div>

          <div class="space-y-2">
            <div>
              <label for="articles-filter-kbli" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                Kategori KBLI (Huruf A–V)
              </label>
              <USelect
                id="articles-filter-kbli"
                v-model="filters.kbli"
                :items="kbliFilterItems"
                value-key="value"
                label-key="label"
                aria-label="Filter Kategori KBLI"
                size="sm"
                class="w-full"
              />
            </div>

            <div>
              <label for="articles-filter-expenditure" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                Komponen Pengeluaran
              </label>
              <USelect
                id="articles-filter-expenditure"
                v-model="filters.expenditure"
                :items="expenditureFilterItems"
                value-key="value"
                label-key="label"
                aria-label="Filter Komponen Pengeluaran"
                size="sm"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- BENTO 2: Wilayah & Sumber Berita -->
        <div class="rounded-xl border border-brand-border bg-brand-tint/30 p-3.5 space-y-3">
          <div class="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
            <UIcon name="i-solar-map-point-wave-bold-duotone" class="w-4 h-4 text-brand-primary" />
            <span>Lokus &amp; Sumber Portal</span>
          </div>

          <div class="space-y-2">
            <div>
              <label for="articles-filter-subdistrict" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                Lokus Kecamatan
              </label>
              <USelect
                id="articles-filter-subdistrict"
                v-model="filters.subdistrict"
                :items="subdistrictFilterItems"
                value-key="value"
                label-key="label"
                aria-label="Filter Lokus Kecamatan"
                size="sm"
                class="w-full"
              />
            </div>

            <div>
              <label for="articles-filter-portal" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                Portal Sumber
              </label>
              <USelect
                id="articles-filter-portal"
                v-model="filters.portal"
                :items="portalFilterItems"
                value-key="value"
                label-key="label"
                aria-label="Filter Portal Sumber"
                size="sm"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- BENTO 3: Relevansi & Rentang Waktu -->
        <div class="rounded-xl border border-brand-border bg-brand-tint/30 p-3.5 space-y-3">
          <div class="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
            <UIcon name="i-solar-calendar-bold-duotone" class="w-4 h-4 text-brand-primary" />
            <span>Relevansi &amp; Waktu Terbit</span>
          </div>

          <div class="space-y-2">
            <div>
              <label for="articles-filter-relevance" class="block text-[11px] font-semibold text-ink-secondary mb-1">
                Kesesuaian Fenomena
              </label>
              <USelect
                id="articles-filter-relevance"
                v-model="filters.isEconomic"
                :items="isEconomicItems"
                value-key="value"
                label-key="label"
                aria-label="Filter Kesesuaian Fenomena"
                size="sm"
                class="w-full"
              />
            </div>

            <div>
              <span class="block text-[11px] font-semibold text-ink-secondary mb-1">
                Rentang Tanggal Terbit
              </span>
              <div class="grid grid-cols-2 gap-1.5">
                <input
                  v-model="filters.from"
                  type="date"
                  aria-label="Tanggal mulai"
                  class="w-full h-8 px-2 text-xs rounded-lg border border-border-control bg-white text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <input
                  v-model="filters.to"
                  type="date"
                  aria-label="Tanggal akhir"
                  class="w-full h-8 px-2 text-xs rounded-lg border border-border-control bg-white text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Date Presets & Reset Actions -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-hairline text-xs">
        <div class="flex flex-wrap items-center gap-1 font-mono">
          <span class="text-ink-secondary text-[11px] mr-1">Preset:</span>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md hover:bg-canvas border border-border-hairline text-ink-secondary hover:text-ink-primary cursor-pointer text-[11px]"
            @click="emit('applyDatePreset', 'today')"
          >
            Hari Ini
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md hover:bg-canvas border border-border-hairline text-ink-secondary hover:text-ink-primary cursor-pointer text-[11px]"
            @click="emit('applyDatePreset', 'last7d')"
          >
            7 Hari
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md hover:bg-canvas border border-border-hairline text-ink-secondary hover:text-ink-primary cursor-pointer text-[11px]"
            @click="emit('applyDatePreset', 'last30d')"
          >
            30 Hari
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md hover:bg-canvas border border-border-hairline text-ink-secondary hover:text-ink-primary cursor-pointer text-[11px]"
            @click="emit('applyDatePreset', 'thisQuarter')"
          >
            Triwulan Ini
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md hover:bg-canvas border border-border-hairline text-ink-secondary hover:text-ink-primary cursor-pointer text-[11px]"
            @click="emit('applyDatePreset', 'all')"
          >
            Reset Tanggal
          </button>
        </div>

        <button
          type="button"
          class="text-xs text-brand-primary hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
          @click="emit('resetAll')"
        >
          <UIcon name="i-lucide-rotate-ccw" class="w-3.5 h-3.5" />
          <span>Reset Seluruh Filter</span>
        </button>
      </div>
    </div>

    <!-- Active Filter Chips -->
    <div
      v-if="activeFilterChips.length > 0"
      class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-hairline font-mono"
    >
      <span class="text-[11px] text-ink-secondary">Filter Aktif:</span>
      <span
        v-for="chip in activeFilterChips"
        :key="chip.key"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-tint text-brand-primary border border-brand-border"
      >
        <span>{{ chip.label }}</span>
        <button
          type="button"
          class="hover:text-terracotta-ink cursor-pointer focus:outline-none"
          :aria-label="`Hapus filter ${chip.label}`"
          @click="chip.clear"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>
      </span>
      <button
        type="button"
        class="text-[11px] text-ink-secondary hover:text-ink-primary underline ml-1 cursor-pointer"
        @click="emit('resetAll')"
      >
        Hapus Semua
      </button>
    </div>
  </div>
</template>
