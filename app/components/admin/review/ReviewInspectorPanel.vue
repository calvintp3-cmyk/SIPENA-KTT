<!-- app/components/admin/review/ReviewInspectorPanel.vue -->
<script setup lang="ts">
import { VerificationStatusEnum } from '#shared/enums/pdrb';
import type { AdminArticleItem } from '~/types/sipena';
import ArticleCurationForm, { type CurationFormData } from '~/components/admin/ArticleCurationForm.vue';

const props = defineProps<{
  article: AdminArticleItem | null;
  inspectorSubmitting: 'VERIFIED' | 'IGNORED' | 'DRAFT' | null;
  inspectorAlert: string | null;
  highlightIncomplete: boolean;
  activeStatus: string;
  autoAdvanceNext: boolean;
  canRestoreAiSummary: boolean;
  modelValue: CurationFormData;
}>();

const emit = defineEmits<{
  'update:modelValue': [val: CurationFormData];
  'update:autoAdvanceNext': [val: boolean];
  restoreAiSummary: [];
  submit: [action: 'VERIFIED' | 'IGNORED' | 'DRAFT'];
  openFullSnippet: [];
}>();

const {
  getVerificationStatusBadge,
  getLlmStatusBadge,
  formatLlmProviderBadge,
  getSourceTypeLabel,
  isSafeHttpUrl,
} = usePdrbLabels();

const formData = computed({
  get: () => props.modelValue,
  set: (val: CurationFormData) => emit('update:modelValue', val),
});
</script>

<template>
  <aside
    aria-label="Panel Inspeksi & Kurasi Artikel"
    class="hidden lg:flex lg:col-span-5 h-full min-h-0 flex-col"
  >
    <div
      v-if="!article"
      class="obs-panel rounded-xl p-8 text-center text-xs text-ink-muted h-full flex flex-col items-center justify-center space-y-2.5"
    >
      <div class="w-12 h-12 rounded-xl bg-surface-subtle text-ink-muted flex items-center justify-center">
        <UIcon name="i-solar-checklist-minimalistic-bold-duotone" class="w-6 h-6" />
      </div>
      <span class="font-medium text-ink-secondary font-display">Pilih salah satu artikel di daftar sebelah kiri untuk mulai mengurasi.</span>
    </div>

    <div
      v-else
      class="obs-panel rounded-xl overflow-hidden flex flex-col h-full"
    >
      <!-- Inspector Header (Fixed) -->
      <div class="px-4 py-3 border-b border-border-hairline bg-canvas flex items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <UBadge
            :color="getVerificationStatusBadge(article.verificationStatus).color"
            variant="subtle"
            size="xs"
            :icon="getVerificationStatusBadge(article.verificationStatus).icon"
          >
            {{ getVerificationStatusBadge(article.verificationStatus).label }}
          </UBadge>
          <UBadge
            :color="getLlmStatusBadge(article.llmStatus).color"
            variant="subtle"
            size="xs"
            :icon="getLlmStatusBadge(article.llmStatus).icon"
          >
            {{ getLlmStatusBadge(article.llmStatus).label }}
          </UBadge>
          <UBadge
            v-if="article.llmConfidence !== null"
            color="neutral"
            variant="outline"
            size="xs"
            class="tabular-nums font-mono"
          >
            AI {{ Math.round(article.llmConfidence * 100) }}%
          </UBadge>
          <span
            v-if="article.llmModel"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border-hairline bg-surface-subtle text-ink-secondary text-[11px] font-medium font-mono"
            :title="article.llmModel"
          >
            {{ formatLlmProviderBadge(article.llmModel).shortLabel }}
          </span>
          <span class="text-[11px] font-medium text-ink-secondary">
            {{ getSourceTypeLabel(article.sourceType) }}
          </span>
        </div>

        <a
          v-if="isSafeHttpUrl(article.url)"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 min-h-8 px-2.5 py-1 rounded-lg border border-border-control bg-white hover:bg-brand-tint text-xs font-semibold text-brand-primary shrink-0 transition-colors"
        >
          <span>Sumber</span>
          <UIcon name="i-lucide-external-link" class="w-3 h-3" />
        </a>
      </div>

      <!-- Scrollable Inspector Body -->
      <div class="flex-1 overflow-y-auto saas-scroll p-4 space-y-4">
        <ArticleCurationForm
          :article="article"
          v-model="formData"
          mode="inspector"
          :submitting-action="inspectorSubmitting"
          :validation-alert="inspectorAlert"
          :highlight-incomplete="highlightIncomplete"
          :show-auto-next-toggle="activeStatus === VerificationStatusEnum.PENDING"
          :auto-advance-next="autoAdvanceNext"
          :can-restore-ai-summary="canRestoreAiSummary"
          @update:auto-advance-next="emit('update:autoAdvanceNext', $event)"
          @restore-ai-summary="emit('restoreAiSummary')"
          @submit="emit('submit', $event)"
          @open-full-snippet="emit('openFullSnippet')"
        />
      </div>
    </div>
  </aside>
</template>
