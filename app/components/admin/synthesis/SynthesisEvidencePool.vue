<!-- app/components/admin/synthesis/SynthesisEvidencePool.vue -->
<script setup lang="ts">
import { formatDateId } from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';

const props = defineProps<{
  filteredPool: AdminArticleItem[];
  checkedIds: string[];
  checkedMap: Record<string, boolean>;
  totalItems: number;
  poolPending: boolean;
  poolError: boolean;
  shortPeriodLabel: string;
  dimension: 'kbli' | 'expenditure';
  citationIndexByArticleId: Map<string, number>;
  highlightedCitationIndex: number | null;
}>();

const poolSearch = defineModel<string>('poolSearch', { default: '' });

const emit = defineEmits<{
  selectAll: [];
  clearSelection: [];
  toggleItem: [id: string, event?: Event];
  refresh: [];
  openManualModal: [];
}>();

const { getKbliImpactBadge, getExpenditureImpactBadge } = usePdrbLabels();
</script>

<template>
  <section
    aria-label="Daftar Sumber Bukti Terverifikasi"
    class="no-print lg:col-span-5 obs-panel rounded-2xl overflow-hidden flex flex-col max-h-[760px]"
  >
    <div class="p-4 border-b border-border-hairline bg-canvas space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-ink-primary">Bukti Terverifikasi</h2>
          <p class="text-[11px] text-ink-secondary tabular-nums font-mono">
            {{ checkedIds.length }} dipilih dari {{ totalItems }} artikel (maks. 30)
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <button
            type="button"
            class="min-h-8 px-1.5 inline-flex items-center text-brand-primary hover:text-[#072B20] hover:underline font-semibold cursor-pointer"
            @click="emit('selectAll')"
          >
            Pilih Semua
          </button>
          <span class="text-ink-primary/20" aria-hidden="true">|</span>
          <button
            type="button"
            class="min-h-8 px-1.5 inline-flex items-center text-ink-secondary hover:text-ink-primary cursor-pointer"
            @click="emit('clearSelection')"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <div>
        <label for="synth-pool-search" class="sr-only">Filter bukti artikel</label>
        <UInput
          id="synth-pool-search"
          v-model="poolSearch"
          type="search"
          icon="i-solar-magnifer-line-duotone"
          placeholder="Saring artikel sumber..."
          size="sm"
          class="w-full"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto saas-scroll p-3 space-y-2.5">
      <UAlert
        v-if="poolError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Gagal memuat bukti terverifikasi"
        description="Pastikan koneksi database aktif lalu segarkan daftar bukti."
      >
        <template #actions>
          <UButton size="xs" color="error" variant="solid" @click="emit('refresh')">
            Muat Ulang
          </UButton>
        </template>
      </UAlert>

      <div v-else-if="poolPending" class="space-y-2.5 p-2">
        <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-surface-subtle" />
      </div>

      <div v-else-if="!filteredPool.length" class="py-10 px-4 text-center space-y-3">
        <UIcon name="i-solar-document-text-bold-duotone" class="w-9 h-9 text-ink-muted mx-auto" aria-hidden="true" />
        <div class="text-xs font-bold text-ink-primary">
          Belum ada fenomena terverifikasi untuk target ini di {{ shortPeriodLabel }}.
        </div>
        <p class="text-[11px] text-ink-secondary">
          Anda dapat melengkapi bukti secara manual atau mengurasi antrean pending terlebih dahulu.
        </p>
        <div class="flex justify-center gap-2">
          <UButton size="sm" color="primary" variant="outline" @click="emit('openManualModal')">
            + Input Manual
          </UButton>
          <UButton size="sm" color="neutral" variant="ghost" to="/admin/review">
            Buka Review
          </UButton>
        </div>
      </div>

      <template v-else>
        <div
          v-for="(art, idx) in filteredPool"
          :id="`synth-cite-card-${art.id}`"
          :key="art.id"
          class="rounded-xl border p-3 transition-colors"
          :class="
            citationIndexByArticleId.get(art.id) !== undefined &&
            highlightedCitationIndex === citationIndexByArticleId.get(art.id)
              ? 'bg-brand-tint border-brand-primary ring-2 ring-brand-primary/25 shadow-sm'
              : checkedMap[art.id]
                ? 'bg-white border-brand-border shadow-2xs'
                : 'bg-canvas border-border-hairline opacity-80 hover:opacity-100'
          "
        >
          <div class="flex items-start gap-2.5">
            <input
              :id="`synth-pool-chk-${art.id}`"
              type="checkbox"
              :checked="Boolean(checkedMap[art.id])"
              class="mt-0.5 w-4 h-4 rounded border-border-control accent-brand-primary text-brand-primary focus:ring-brand-primary cursor-pointer"
              @change="(e: Event) => emit('toggleItem', art.id, e)"
            >
            <label
              :for="`synth-pool-chk-${art.id}`"
              class="min-w-0 flex-1 space-y-1.5 cursor-pointer block"
            >
              <span class="flex items-center justify-between gap-2">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums font-mono"
                  :class="
                    citationIndexByArticleId.get(art.id)
                      ? 'bg-brand-primary text-white'
                      : 'bg-surface-subtle text-ink-secondary'
                  "
                >
                  [{{ citationIndexByArticleId.get(art.id) ?? idx + 1 }}]
                </span>
                <span class="text-[11px] font-medium text-ink-secondary tabular-nums truncate font-mono">
                  {{ art.sourcePortal }} • {{ formatDateId(art.publishedAt) }}
                </span>
              </span>

              <span class="block text-xs font-bold text-ink-primary leading-snug line-clamp-2">
                {{ art.title }}
              </span>
              <span class="block text-[11px] text-ink-secondary line-clamp-2 leading-relaxed">
                {{ art.summary }}
              </span>

              <span
                v-if="
                  (dimension === 'kbli' && art.kbliImpact) ||
                  (dimension === 'expenditure' && art.expenditureImpact)
                "
                class="flex flex-wrap items-center gap-1.5 pt-0.5"
              >
                <UBadge
                  v-if="dimension === 'kbli' && art.kbliImpact"
                  :color="getKbliImpactBadge(art.kbliImpact).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ getKbliImpactBadge(art.kbliImpact).shortLabel }}
                </UBadge>
                <UBadge
                  v-else-if="dimension === 'expenditure' && art.expenditureImpact"
                  :color="getExpenditureImpactBadge(art.expenditureImpact).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ getExpenditureImpactBadge(art.expenditureImpact).shortLabel }}
                </UBadge>
              </span>
            </label>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
