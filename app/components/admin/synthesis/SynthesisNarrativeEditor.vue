<!-- app/components/admin/synthesis/SynthesisNarrativeEditor.vue -->
<script setup lang="ts">
import { formatDateId } from '#shared/utils/period';
import type { BrsMarkdownBlock } from '#shared/utils/markdown-brs';
import type { SynthesisGenerateResponse } from '~/types/sipena';

const props = defineProps<{
  result: SynthesisGenerateResponse | null;
  savedMarkdownSnapshot: string;
  hasUnsavedChanges: boolean;
  isGenerating: boolean;
  isSavingDraft: boolean;
  currentTargetLabel: string;
  periodLabel: string;
  parsedNarrativeBlocks: BrsMarkdownBlock[];
}>();

const editableMarkdown = defineModel<string>('editableMarkdown', { default: '' });

const emit = defineEmits<{
  restoreSaved: [];
  saveChanges: [];
  copyText: [];
  downloadDocx: [];
  printSheet: [];
  jumpCitation: [index: number];
}>();

const { formatLlmProviderBadge } = usePdrbLabels();
const isEditingInline = ref(false);
</script>

<template>
  <section aria-label="Editor dan Pratinjau Narasi Fenomena" class="lg:col-span-7 space-y-4">
    <div class="obs-panel synthesis-print-sheet rounded-2xl overflow-hidden flex flex-col">
      <!-- Toolbar (Hidden in Print) -->
      <div class="no-print px-5 py-3.5 border-b border-border-hairline bg-canvas flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex items-center gap-2">
          <span
            v-if="result"
            class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 font-mono"
            :class="
              result.mode === 'template'
                ? 'bg-brand-tint text-brand-primary border-brand-border'
                : formatLlmProviderBadge(result.modelUsed).pillClass
            "
          >
            {{
              result.mode === 'template'
                ? 'Template Analitis Terverifikasi'
                : formatLlmProviderBadge(result.modelUsed).label
            }}
          </span>
          <span v-else class="text-xs font-bold text-ink-primary">
            Lembar Kerja Narasi Fenomena
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-if="hasUnsavedChanges && savedMarkdownSnapshot && !isGenerating"
            type="button"
            class="min-h-9 px-2.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-medium text-ink-secondary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            @click="emit('restoreSaved')"
          >
            <UIcon name="i-lucide-rotate-ccw" class="w-3.5 h-3.5" />
            <span>Pulihkan</span>
          </button>

          <button
            v-if="editableMarkdown"
            type="button"
            :disabled="!hasUnsavedChanges || isSavingDraft || isGenerating"
            class="min-h-9 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-45 cursor-pointer"
            :class="
              hasUnsavedChanges
                ? 'border-brand-primary bg-brand-tint hover:bg-[#d0e7dc] text-brand-primary'
                : 'border-border-control bg-white text-ink-secondary'
            "
            @click="emit('saveChanges')"
          >
            <UIcon
              :name="isSavingDraft ? 'i-lucide-loader-circle' : 'i-lucide-save'"
              class="w-3.5 h-3.5"
              :class="isSavingDraft ? 'animate-spin' : ''"
            />
            <span>
              {{
                isSavingDraft
                  ? 'Menyimpan...'
                  : hasUnsavedChanges
                    ? 'Simpan Perubahan'
                    : 'Tersimpan'
              }}
            </span>
          </button>

          <button
            type="button"
            :disabled="!editableMarkdown || isGenerating"
            class="min-h-9 px-2.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-medium text-ink-primary inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            @click="isEditingInline = !isEditingInline"
          >
            <UIcon :name="isEditingInline ? 'i-lucide-eye' : 'i-lucide-pencil'" class="w-3.5 h-3.5" />
            <span>{{ isEditingInline ? 'Pratinjau' : 'Edit Inline' }}</span>
          </button>

          <button
            type="button"
            :disabled="!editableMarkdown || isGenerating"
            class="min-h-9 px-2.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-medium text-ink-primary inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            @click="emit('copyText')"
          >
            <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
            <span>Salin</span>
          </button>

          <button
            type="button"
            :disabled="!editableMarkdown || isGenerating"
            class="min-h-9 px-2.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-medium text-ink-primary inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            @click="emit('downloadDocx')"
          >
            <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-brand-primary" />
            <span>.DOCX</span>
          </button>

          <button
            type="button"
            :disabled="!editableMarkdown || isGenerating"
            class="min-h-9 px-2.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-medium text-ink-primary inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            @click="emit('printSheet')"
          >
            <UIcon name="i-lucide-printer" class="w-3.5 h-3.5 text-brand-primary" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      <!-- Printable Document Container -->
      <div class="p-6 sm:p-8 space-y-5 min-h-[460px]">
        <!-- Print Letterhead (Print-Only) -->
        <div class="hidden print:block pb-4 mb-4 border-b-2 border-brand-primary">
          <div class="text-xs font-bold uppercase tracking-wider text-ink-secondary">
            Badan Pusat Statistik Kabupaten Tana Tidung • Fungsi Nerwilis
          </div>
          <h1 class="text-xl font-extrabold text-ink-primary mt-1">
            Berita Resmi Statistik — Fenomena PDRB: {{ currentTargetLabel }}
          </h1>
          <p class="text-xs text-ink-secondary mt-0.5">
            Periode: {{ periodLabel }}
          </p>
        </div>

        <UAlert
          v-if="result?.notice"
          class="no-print"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :title="result.notice"
        />

        <!-- Empty Ready State -->
        <div
          v-if="!editableMarkdown && !isGenerating"
          class="py-16 text-center max-w-md mx-auto space-y-3"
        >
          <div class="w-12 h-12 rounded-2xl bg-brand-tint border border-brand-border text-brand-primary flex items-center justify-center mx-auto shadow-2xs">
            <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-6 h-6" />
          </div>
          <h2 class="text-base font-extrabold text-ink-primary text-balance">
            Siap Menyusun Narasi {{ currentTargetLabel }}
          </h2>
          <p class="text-xs text-ink-secondary leading-relaxed text-pretty">
            Centang bukti berita relevan di panel kiri, pilih gaya penulisan BRS atau kajian,
            lalu klik <strong>Sintesis Fenomena</strong> di kanan atas.
          </p>
        </div>

        <!-- Generating Skeleton before first streamed token arrives -->
        <div v-else-if="isGenerating && !editableMarkdown.trim()" class="space-y-4 py-6">
          <div class="h-5 w-1/2 rounded-lg bg-surface-subtle" />
          <div class="h-24 w-full rounded-xl bg-canvas" />
          <div class="h-5 w-2/5 rounded-lg bg-surface-subtle" />
          <div class="h-24 w-full rounded-xl bg-canvas" />
        </div>

        <!-- Inline Raw Markdown Editor -->
        <div v-else-if="isEditingInline" class="space-y-2 no-print">
          <label
            for="synth-inline-editor"
            class="block text-xs font-bold uppercase tracking-wider text-ink-secondary"
          >
            Editor Teks Narasi (Markdown BRS)
          </label>
          <textarea
            id="synth-inline-editor"
            v-model="editableMarkdown"
            rows="16"
            class="w-full rounded-xl border border-border-control p-4 text-sm text-ink-primary leading-relaxed focus:border-brand-primary focus:outline-none"
          />
        </div>

        <!-- Interactive Document View with Cross-Link Citation Chips -->
        <article v-else class="space-y-5">
          <header class="pb-4 border-b border-border-hairline space-y-1 print:hidden">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-bold uppercase tracking-wider text-brand-primary font-mono">
                SIPENA KTT • Draf Sintesis Narasi PDRB
              </div>
              <span
                v-if="isGenerating"
                role="status"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-tint text-brand-primary border border-brand-border text-[11px] font-semibold font-mono"
              >
                <UIcon name="i-lucide-loader-circle" class="w-3 h-3 animate-spin" />
                <span>Menulis live...</span>
              </span>
            </div>
            <h2 class="text-lg sm:text-xl font-extrabold text-ink-primary text-balance font-display">
              {{ currentTargetLabel }} — {{ periodLabel }}
            </h2>
            <p class="text-xs text-ink-secondary">
              Disusun untuk rekonsiliasi PDRB Fungsi Nerwilis BPS Kabupaten Tana Tidung
            </p>
          </header>

          <div class="space-y-3.5 text-sm leading-relaxed text-ink-primary">
            <template v-for="(block, bIdx) in parsedNarrativeBlocks" :key="bIdx">
              <h3
                v-if="block.type === 'heading' && block.level <= 2"
                class="text-base font-bold text-ink-primary pt-2 tracking-tight text-balance font-display"
              >
                <AdminSynthesisSpans :spans="block.spans" @cite="(idx) => emit('jumpCitation', idx)" />
              </h3>

              <h4
                v-else-if="block.type === 'heading'"
                class="text-sm font-bold text-ink-primary pt-1.5 tracking-tight text-balance font-display"
              >
                <AdminSynthesisSpans :spans="block.spans" @cite="(idx) => emit('jumpCitation', idx)" />
              </h4>

              <ul
                v-else-if="block.type === 'bullet_list'"
                class="list-disc pl-5 space-y-1.5 text-pretty"
              >
                <li v-for="(itemSpans, itemIdx) in block.items" :key="itemIdx">
                  <AdminSynthesisSpans :spans="itemSpans" @cite="(idx) => emit('jumpCitation', idx)" />
                </li>
              </ul>

              <ol
                v-else-if="block.type === 'ordered_list'"
                :start="block.items[0]?.order ?? 1"
                class="list-decimal pl-5 space-y-1.5 text-pretty"
              >
                <li v-for="(item, itemIdx) in block.items" :key="itemIdx">
                  <AdminSynthesisSpans :spans="item.spans" @cite="(idx) => emit('jumpCitation', idx)" />
                </li>
              </ol>

              <blockquote
                v-else-if="block.type === 'blockquote'"
                class="border-l-2 border-brand-primary bg-brand-tint/40 pl-3.5 pr-3 py-2 rounded-r-lg space-y-1.5 italic text-ink-primary"
              >
                <p v-for="(qPara, qIdx) in block.paragraphs" :key="qIdx" class="text-pretty">
                  <AdminSynthesisSpans :spans="qPara" @cite="(idx) => emit('jumpCitation', idx)" />
                </p>
              </blockquote>

              <div
                v-else-if="block.type === 'table'"
                tabindex="0"
                role="region"
                aria-label="Tabel Ringkasan Narasi BRS"
                class="saas-table-scroller my-2 rounded-xl border border-border-hairline bg-white"
              >
                <table class="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr class="bg-canvas border-b border-border-hairline">
                      <th
                        v-for="(hSpans, hIdx) in block.headers"
                        :key="hIdx"
                        scope="col"
                        class="px-3 py-2 font-bold text-ink-primary whitespace-nowrap"
                      >
                        <AdminSynthesisSpans :spans="hSpans" @cite="(idx) => emit('jumpCitation', idx)" />
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#141917]/[0.06]">
                    <tr v-for="(rowCells, rIdx) in block.rows" :key="rIdx">
                      <td
                        v-for="(cSpans, cIdx) in rowCells"
                        :key="cIdx"
                        class="px-3 py-2 text-ink-secondary align-top"
                      >
                        <AdminSynthesisSpans :spans="cSpans" @cite="(idx) => emit('jumpCitation', idx)" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p v-else class="text-pretty">
                <AdminSynthesisSpans :spans="block.spans" @cite="(idx) => emit('jumpCitation', idx)" />
              </p>
            </template>
          </div>

          <!-- Footnote Reference List -->
          <footer v-if="result?.citations.length" class="pt-4 border-t border-border-hairline space-y-2">
            <div class="text-xs font-bold uppercase tracking-wider text-ink-secondary font-mono">
              Referensi Sumber Berita Terverifikasi
            </div>
            <ol class="space-y-1 text-xs text-ink-secondary">
              <li v-for="c in result.citations" :key="c.id" class="flex items-start gap-2">
                <span class="font-bold text-brand-primary tabular-nums font-mono">[{{ c.index }}]</span>
                <span>
                  {{ c.title }} — <em>{{ c.sourcePortal }}</em> ({{ formatDateId(c.publishedAt) }})
                </span>
              </li>
            </ol>
          </footer>
        </article>
      </div>
    </div>
  </section>
</template>
