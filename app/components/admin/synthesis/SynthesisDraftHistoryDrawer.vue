<!-- app/components/admin/synthesis/SynthesisDraftHistoryDrawer.vue -->
<script setup lang="ts">
import { formatDateTimeWita, toRomanQuarter } from '#shared/utils/period';
import type { SynthesisDraftItem } from '~/types/sipena';

const props = defineProps<{
  drafts: SynthesisDraftItem[];
  activeDraftId: string | null;
  draftsPending: boolean;
  draftsError: boolean;
  deletingDraftId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  loadDraft: [draft: SynthesisDraftItem];
  deleteDraft: [draft: SynthesisDraftItem];
  refresh: [];
}>();

const { formatLlmProviderBadge } = usePdrbLabels();

// UX-011: Modal Konfirmasi Hapus Draf
const deleteConfirmOpen = ref(false);
const draftToDelete = ref<SynthesisDraftItem | null>(null);

function askDelete(draft: SynthesisDraftItem) {
  draftToDelete.value = draft;
  deleteConfirmOpen.value = true;
}

function confirmDelete() {
  if (!draftToDelete.value) return;
  const target = draftToDelete.value;
  draftToDelete.value = null;
  deleteConfirmOpen.value = false;
  emit('deleteDraft', target);
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    title="Riwayat Draf Sintesis (Lintas Periode)"
    description="Draf narasi BRS tersimpan bersama di PostgreSQL dan dapat dibuka atau diperbarui oleh seluruh operator Nerwilis."
  >
    <template #body>
      <div class="space-y-3">
        <UAlert
          v-if="draftsError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          title="Gagal memuat riwayat draf"
          description="Periksa koneksi database lalu coba segarkan ulang."
        >
          <template #actions>
            <UButton size="xs" color="error" variant="solid" @click="emit('refresh')">
              Muat Ulang
            </UButton>
          </template>
        </UAlert>

        <div v-else-if="draftsPending && !drafts.length" class="space-y-2.5">
          <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-surface-subtle" />
        </div>

        <div v-else-if="!drafts.length" class="py-12 text-center text-xs text-ink-muted">
          Belum ada riwayat draf sintesis yang tersimpan di database.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="d in drafts"
            :key="d.id"
            class="rounded-xl border p-3.5 bg-white transition-colors space-y-2"
            :class="
              activeDraftId === d.id
                ? 'border-brand-primary ring-1 ring-brand-primary/30 bg-brand-tint/40'
                : 'border-border-hairline hover:border-brand-primary/40'
            "
          >
            <div class="flex items-center justify-between gap-2 text-[11px] tabular-nums font-mono">
              <span class="font-bold text-brand-primary">
                TW {{ toRomanQuarter(d.quarter) }} {{ d.year }}
                <span class="text-ink-secondary font-normal">• {{ d.articleCount }} bukti</span>
              </span>
              <span class="text-ink-muted">{{ formatDateTimeWita(d.updatedAt) }}</span>
            </div>

            <button
              type="button"
              class="w-full text-left space-y-1 group cursor-pointer"
              @click="emit('loadDraft', d)"
            >
              <span class="block text-xs font-bold text-ink-primary group-hover:text-brand-primary transition-colors">
                {{ d.targetLabel }}
              </span>
              <span class="block text-[11px] text-ink-secondary line-clamp-2">
                {{ d.narrativeMarkdown }}
              </span>
            </button>

            <div class="pt-1.5 border-t border-border-hairline flex items-center justify-between gap-2 text-[11px]">
              <span class="text-ink-secondary truncate">
                {{ d.updatedByName || d.createdByName || 'Staf Nerwilis' }}
                •
                {{
                  d.generationMode === 'template'
                    ? 'Template'
                    : d.modelUsed
                      ? formatLlmProviderBadge(d.modelUsed).shortLabel
                      : 'AI Multi-LLM'
                }}
              </span>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  class="min-h-8 px-2.5 py-1 rounded-lg bg-brand-tint hover:bg-[#d0e7dc] text-brand-primary border border-brand-border font-semibold transition-colors cursor-pointer"
                  @click="emit('loadDraft', d)"
                >
                  Buka
                </button>
                <button
                  type="button"
                  :disabled="deletingDraftId === d.id"
                  aria-label="Hapus draf"
                  class="min-w-8 min-h-8 inline-flex items-center justify-center rounded-lg text-ink-muted hover:text-terracotta-ink hover:bg-terracotta-surface disabled:opacity-50 transition-colors cursor-pointer"
                  @click="askDelete(d)"
                >
                  <UIcon
                    :name="deletingDraftId === d.id ? 'i-lucide-loader-circle' : 'i-lucide-trash-2'"
                    class="w-3.5 h-3.5"
                    :class="deletingDraftId === d.id ? 'animate-spin' : ''"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- UX-011: Modal Konfirmasi Hapus Draf Sintesis -->
  <UModal
    v-model:open="deleteConfirmOpen"
    title="Hapus Draf Sintesis?"
    description="Tindakan ini akan menghapus draf narasi BRS tersimpan dari database."
  >
    <template #body>
      <p v-if="draftToDelete" class="text-xs text-ink-secondary leading-relaxed">
        Anda akan menghapus draf narasi: <br>
        <strong class="text-ink-primary font-bold">"{{ draftToDelete.title || draftToDelete.targetLabel }}"</strong>
        <br>
        <span class="text-terracotta-ink mt-2 block font-medium">
          Draf yang dihapus tidak dapat dipulihkan kembali.
        </span>
      </p>
    </template>

    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="deleteConfirmOpen = false"
        >
          Batal
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          @click="confirmDelete"
        >
          Ya, Hapus Draf
        </UButton>
      </div>
    </template>
  </UModal>
</template>
