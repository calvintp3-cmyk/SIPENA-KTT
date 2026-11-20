<!-- app/pages/admin/synthesis.vue -->
<script setup lang="ts">
import {
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
  VerificationStatusEnum,
  type ExpenditureComponentMeta,
  type Pdrb17SectorMeta,
} from '#shared/enums/pdrb';
import { parseBrsMarkdown, type BrsMarkdownBlock } from '#shared/utils/markdown-brs';
import SynthesisParameterBar from '~/components/admin/synthesis/SynthesisParameterBar.vue';
import SynthesisEvidencePool from '~/components/admin/synthesis/SynthesisEvidencePool.vue';
import SynthesisNarrativeEditor from '~/components/admin/synthesis/SynthesisNarrativeEditor.vue';
import SynthesisDraftHistoryDrawer from '~/components/admin/synthesis/SynthesisDraftHistoryDrawer.vue';
import SynthesisDiscardModal from '~/components/admin/synthesis/SynthesisDiscardModal.vue';
import { useSynthesisStudio } from '~/composables/useSynthesisStudio';
import { useSynthesisDraftGuard } from '~/composables/useSynthesisDraftGuard';
import type {
  AdminArticleItem,
  AdminArticlesResponse,
  SynthesisCitationItem,
  SynthesisDraftItem,
  SynthesisDraftsResponse,
  SynthesisGenerateResponse,
  SynthesisStyle,
} from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { selectedYear, selectedQuarter, periodLabel, shortPeriodLabel, setPeriod } =
  useAdminPeriod();
const { getKbliClusterTheme, getExpenditureColorTheme } = usePdrbLabels();
const {
  copyNarrative,
  downloadSingleDocx,
  exportFullQuarterBook,
  saveDraftChanges,
  deleteDraft,
  executeDraftRestore,
  runNarrativeGeneration,
  isExportingBook,
  isSavingDraft,
  deletingDraftId,
} = useSynthesisStudio();

const dimension = ref<'kbli' | 'expenditure'>('kbli');
const targetCode = ref<string>(PDRB_17_SECTORS[0]!.groupCode);
const style = ref<SynthesisStyle>('BRS_FORMAL');
let isRestoringDraft = false;

const styleOptions: Array<{ value: SynthesisStyle; label: string }> = [
  { value: 'BRS_FORMAL', label: 'Laporan Analitis Terstruktur' },
  { value: 'EXECUTIVE_BRIEF', label: 'Kajian Eksekutif Pimpinan' },
  { value: 'BULLET_POINTS', label: 'Butir-Butir Fenomena Pokok' },
];

watch(dimension, (nextDim: 'kbli' | 'expenditure') => {
  if (isRestoringDraft) return;
  targetCode.value =
    nextDim === 'kbli'
      ? PDRB_17_SECTORS[0]!.groupCode
      : PDRB_6_EXPENDITURE_LIST[0]!.code;
});

const targetOptions = computed<Array<{ value: string; label: string }>>(() => {
  if (dimension.value === 'kbli') {
    return PDRB_17_SECTORS.map((s: Pdrb17SectorMeta) => ({
      value: s.groupCode,
      label: `${s.groupCode} - ${s.shortName}`,
    }));
  }
  return PDRB_6_EXPENDITURE_LIST.map((e: ExpenditureComponentMeta) => ({
    value: e.code,
    label: e.official,
  }));
});

const currentTargetLabel = computed<string>(
  () =>
    targetOptions.value.find((o: { value: string; label: string }) => o.value === targetCode.value)
      ?.label ?? targetCode.value,
);

const targetClusterTheme = computed(() => {
  if (dimension.value === 'kbli') {
    return getKbliClusterTheme(targetCode.value);
  }
  return getExpenditureColorTheme(targetCode.value);
});

const poolQuery = computed(() => {
  const q: Record<string, string | number> = {
    status: VerificationStatusEnum.VERIFIED,
    isEconomic: 'true',
    year: selectedYear.value,
    quarter: selectedQuarter.value,
    limit: 100,
    page: 1,
  };
  if (dimension.value === 'kbli') {
    q.pdrbGroup = targetCode.value;
  } else {
    q.expenditure = targetCode.value;
  }
  return q;
});

const {
  data: poolData,
  pending: poolPending,
  error: poolError,
  refresh: refreshPool,
} = await useFetch<AdminArticlesResponse>('/api/admin/articles', {
  query: poolQuery,
  watch: [poolQuery],
  credentials: 'include',
});

const poolSearch = ref('');
const checkedMap = ref<Record<string, boolean>>({});

const filteredPool = computed<AdminArticleItem[]>(() => {
  const items = poolData.value?.items ?? [];
  const q = poolSearch.value.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (a: AdminArticleItem) =>
      a.title.toLowerCase().includes(q) ||
      (a.summary ?? '').toLowerCase().includes(q) ||
      a.sourcePortal.toLowerCase().includes(q),
  );
});

watch(
  () => poolData.value?.items,
  (items: AdminArticleItem[] | undefined) => {
    if (isRestoringDraft) return;
    const list = items ?? [];
    const next: Record<string, boolean> = {};
    for (const art of list.slice(0, 30)) {
      next[art.id] = true;
    }
    checkedMap.value = next;
  },
  { immediate: true },
);

const checkedIds = computed<string[]>(() =>
  (poolData.value?.items ?? [])
    .filter((art: AdminArticleItem) => Boolean(checkedMap.value[art.id]))
    .map((art: AdminArticleItem) => art.id)
    .slice(0, 30),
);

function togglePoolItem(id: string, event?: Event) {
  const isChecked = Boolean(checkedMap.value[id]);
  if (!isChecked && checkedIds.value.length >= 30) {
    if (event?.target instanceof HTMLInputElement) event.target.checked = false;
    toast.add({
      title: 'Batas maksimal 30 bukti per draf sintesis',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
    return;
  }
  checkedMap.value = { ...checkedMap.value, [id]: !isChecked };
}

const isGenerating = ref(false);
const result = ref<SynthesisGenerateResponse | null>(null);
const activeDraftId = ref<string | null>(null);
const editableMarkdown = ref('');
const savedMarkdownSnapshot = ref('');
const highlightedCitationIndex = ref<number | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

const draftsDrawerOpen = ref(false);

const {
  data: draftsData,
  pending: draftsPending,
  error: draftsError,
  refresh: refreshDrafts,
} = await useFetch<SynthesisDraftsResponse>('/api/admin/synthesis/drafts', {
  query: { limit: 30 },
  credentials: 'include',
});

const savedDrafts = computed<SynthesisDraftItem[]>(() => draftsData.value?.items ?? []);

const hasUnsavedChanges = computed<boolean>(() => {
  const trimmed = editableMarkdown.value.trim();
  if (!trimmed) return false;
  if (!activeDraftId.value) return true;
  return editableMarkdown.value !== savedMarkdownSnapshot.value;
});

function resetDirtyWorkspaceToSavedOrEmpty() {
  if (activeDraftId.value && savedMarkdownSnapshot.value) {
    editableMarkdown.value = savedMarkdownSnapshot.value;
    if (result.value) {
      result.value = { ...result.value, narrativeMarkdown: savedMarkdownSnapshot.value };
    }
  } else {
    activeDraftId.value = null;
    savedMarkdownSnapshot.value = '';
    editableMarkdown.value = '';
    result.value = null;
  }
}

const {
  confirmDiscardOpen,
  confirmDiscardTitle,
  confirmDiscardDescription,
  promptDiscardIfDirty,
  cancelDiscardModal,
  confirmDiscardAndProceed,
} = useSynthesisDraftGuard(hasUnsavedChanges, resetDirtyWorkspaceToSavedOrEmpty);

onBeforeUnmount(() => {
  if (highlightTimer) clearTimeout(highlightTimer);
});

function requestDimensionChange(nextDim: 'kbli' | 'expenditure') {
  if (dimension.value === nextDim) return;
  promptDiscardIfDirty(
    () => {
      if (hasUnsavedChanges.value) resetDirtyWorkspaceToSavedOrEmpty();
      dimension.value = nextDim;
    },
    { title: 'Ganti Dimensi Target PDRB?' },
  );
}

function requestTargetCodeChange(nextCode: string | undefined) {
  if (!nextCode || targetCode.value === nextCode) return;
  promptDiscardIfDirty(
    () => {
      if (hasUnsavedChanges.value) resetDirtyWorkspaceToSavedOrEmpty();
      targetCode.value = nextCode;
    },
    { title: 'Ganti Sektor/Komponen Target?' },
  );
}

function restoreSavedMarkdown() {
  if (!savedMarkdownSnapshot.value) return;
  editableMarkdown.value = savedMarkdownSnapshot.value;
  if (result.value) {
    result.value = { ...result.value, narrativeMarkdown: savedMarkdownSnapshot.value };
  }
  toast.add({
    title: 'Teks Dipulihkan ke Versi Tersimpan',
    color: 'neutral',
    icon: 'i-lucide-rotate-ccw',
  });
}

async function onSaveCurrentDraft() {
  await saveDraftChanges(
    activeDraftId.value,
    editableMarkdown.value,
    {
      year: selectedYear.value,
      quarter: selectedQuarter.value,
      dimension: dimension.value,
      targetCode: targetCode.value,
      targetLabel: currentTargetLabel.value,
      style: style.value,
      periodLabel: periodLabel.value,
      result: result.value,
    },
    (item) => {
      activeDraftId.value = item.id;
      savedMarkdownSnapshot.value = item.narrativeMarkdown;
      editableMarkdown.value = item.narrativeMarkdown;
      if (result.value) {
        result.value = { ...result.value, narrativeMarkdown: item.narrativeMarkdown };
      }
      void refreshDrafts();
    },
  );
}

async function loadDraftFromHistory(draft: SynthesisDraftItem) {
  isRestoringDraft = true;
  await executeDraftRestore(
    draft,
    poolData.value?.items ?? [],
    setPeriod,
    (state) => {
      dimension.value = state.dimension;
      targetCode.value = state.targetCode;
      style.value = state.style;
      activeDraftId.value = state.activeDraftId;
      editableMarkdown.value = state.editableMarkdown;
      savedMarkdownSnapshot.value = state.savedMarkdownSnapshot;
      result.value = state.result;
      if (Object.keys(state.checkedMap).length) {
        checkedMap.value = state.checkedMap;
      }
    },
  );
  isRestoringDraft = false;
  draftsDrawerOpen.value = false;
}

async function onDeleteDraft(draft: SynthesisDraftItem) {
  await deleteDraft(draft, () => {
    if (activeDraftId.value === draft.id) {
      activeDraftId.value = null;
      savedMarkdownSnapshot.value = '';
    }
    void refreshDrafts();
  });
}

function requestGenerateNarrative() {
  if (isGenerating.value || checkedIds.value.length === 0) return;
  promptDiscardIfDirty(
    () => generateNarrative(),
    {
      title: 'Susun Ulang Narasi Fenomena?',
      description: 'Menyusun narasi baru akan menggantikan teks saat ini.',
    },
  );
}

async function generateNarrative() {
  await runNarrativeGeneration(
    {
      year: selectedYear.value,
      quarter: selectedQuarter.value,
      dimension: dimension.value,
      targetCode: targetCode.value,
      targetLabel: currentTargetLabel.value,
      style: style.value,
      periodLabel: periodLabel.value,
      articleIds: checkedIds.value,
    },
    {
      isGenerating,
      activeDraftId,
      savedMarkdownSnapshot,
      editableMarkdown,
      result,
    },
    () => {
      void refreshDrafts();
    },
  );
}

const citationIndexByArticleId = computed(() => {
  const map = new Map<string, number>();
  for (const c of result.value?.citations ?? []) {
    map.set(c.id, c.index);
  }
  return map;
});

function jumpToCitation(citationIndex: number) {
  const targetCitation = result.value?.citations.find(
    (c: SynthesisCitationItem) => c.index === citationIndex,
  );
  if (!targetCitation) return;
  highlightedCitationIndex.value = citationIndex;

  if (import.meta.client) {
    const el = document.getElementById(`synth-cite-card-${targetCitation.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlightedCitationIndex.value = null;
  }, 2400);
}

const parsedNarrativeBlocks = computed<BrsMarkdownBlock[]>(() =>
  parseBrsMarkdown(editableMarkdown.value),
);

function printSheet() {
  if (import.meta.client) window.print();
}

const manualModalOpen = ref(false);
</script>

<template>
  <div class="space-y-6">
    <!-- Top Header & Control Strip -->
    <div class="no-print space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-tint text-brand-primary border border-brand-border text-xs font-semibold"
          >
            <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
            <span>Studio Rangkuman Fenomena Ekonomi</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-primary text-balance mt-2 font-display">
            Sintesis Fenomena Ekonomi — {{ periodLabel }}
          </h1>
          <p class="text-xs sm:text-sm text-ink-secondary mt-0.5 text-pretty">
            Susun draf rangkuman faktual berakar 100% pada bukti berita terverifikasi lengkap dengan sitasi silang.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            class="min-h-9 px-3.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            @click="() => { draftsDrawerOpen = true; }"
          >
            <UIcon name="i-solar-history-2-bold-duotone" class="w-4 h-4 text-brand-primary" />
            <span class="tabular-nums font-mono">Riwayat Draf (Lintas Periode: {{ savedDrafts.length }})</span>
          </button>

          <button
            type="button"
            :disabled="isExportingBook"
            class="min-h-9 px-3.5 rounded-xl border border-brand-border bg-brand-tint hover:bg-[#d0e7dc] text-xs font-semibold text-brand-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Kompilasi seluruh sektor KBLI & Pengeluaran triwulan ini ke satu dokumen Word (.docx) utuh"
            @click="() => { void exportFullQuarterBook(selectedYear, selectedQuarter, periodLabel, { dimension, targetCode, targetLabel: currentTargetLabel, markdown: editableMarkdown, citations: result?.citations ?? [] }, savedDrafts); }"
          >
            <UIcon
              :name="isExportingBook ? 'i-lucide-loader-circle' : 'i-lucide-book-open'"
              class="w-4 h-4 text-brand-primary"
              :class="isExportingBook ? 'animate-spin' : ''"
            />
            <span>{{ isExportingBook ? 'Mengekspor Buku...' : 'Buku Triwulan (.docx)' }}</span>
          </button>

          <button
            type="button"
            :disabled="isGenerating || checkedIds.length === 0"
            class="obs-btn-primary min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            @click="requestGenerateNarrative"
          >
            <UIcon
              :name="isGenerating ? 'i-lucide-loader-circle' : 'i-solar-magic-stick-3-bold-duotone'"
              class="w-4 h-4 text-[#BBD8CB]"
              :class="isGenerating ? 'animate-spin' : ''"
            />
            <span>{{ isGenerating ? 'Menyusun Narasi...' : 'Sintesis Fenomena' }}</span>
          </button>
        </div>
      </div>

      <!-- Studio Parameter Controls -->
      <SynthesisParameterBar
        :dimension="dimension"
        :target-code="targetCode"
        :style="style"
        :target-options="targetOptions"
        :style-options="styleOptions"
        :short-period-label="shortPeriodLabel"
        :target-cluster-theme="targetClusterTheme"
        @request-dimension-change="requestDimensionChange"
        @request-target-code-change="requestTargetCodeChange"
        @update:style="(s) => { style = s; }"
      />
    </div>

    <!-- ASYMMETRIC TWO-PANE WORKSPACE (40% Evidence Pool / 60% Narrative Sheet) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT 40%: EVIDENCE POOL -->
      <SynthesisEvidencePool
        v-model:pool-search="poolSearch"
        :filtered-pool="filteredPool"
        :checked-ids="checkedIds"
        :checked-map="checkedMap"
        :total-items="poolData?.items.length ?? 0"
        :pool-pending="poolPending"
        :pool-error="Boolean(poolError)"
        :short-period-label="shortPeriodLabel"
        :dimension="dimension"
        :citation-index-by-article-id="citationIndexByArticleId"
        :highlighted-citation-index="highlightedCitationIndex"
        @select-all="() => { const n: Record<string, boolean> = {}; for (const a of (poolData?.items ?? []).slice(0, 30)) n[a.id] = true; checkedMap = n; }"
        @clear-selection="() => { checkedMap = {}; }"
        @toggle-item="togglePoolItem"
        @refresh="() => { void refreshPool(); }"
        @open-manual-modal="() => { manualModalOpen = true; }"
      />

      <!-- RIGHT 60%: NARRATIVE DOCUMENT & EDITOR -->
      <SynthesisNarrativeEditor
        v-model:editable-markdown="editableMarkdown"
        :result="result"
        :saved-markdown-snapshot="savedMarkdownSnapshot"
        :has-unsaved-changes="hasUnsavedChanges"
        :is-generating="isGenerating"
        :is-saving-draft="isSavingDraft"
        :current-target-label="currentTargetLabel"
        :period-label="periodLabel"
        :parsed-narrative-blocks="parsedNarrativeBlocks"
        @restore-saved="restoreSavedMarkdown"
        @save-changes="() => { void onSaveCurrentDraft(); }"
        @copy-text="() => { copyNarrative(editableMarkdown); }"
        @download-docx="() => { downloadSingleDocx(currentTargetLabel, periodLabel, selectedYear, selectedQuarter, editableMarkdown, result?.citations ?? []); }"
        @print-sheet="printSheet"
        @jump-citation="jumpToCitation"
      />
    </div>

    <!-- Saved Drafts History Drawer (PostgreSQL Shared Team History) -->
    <SynthesisDraftHistoryDrawer
      v-model:open="draftsDrawerOpen"
      :drafts="savedDrafts"
      :active-draft-id="activeDraftId"
      :drafts-pending="draftsPending"
      :drafts-error="Boolean(draftsError)"
      :deleting-draft-id="deletingDraftId"
      @load-draft="(d) => promptDiscardIfDirty(() => loadDraftFromHistory(d), { title: 'Buka Draf Lain dari Riwayat?', description: `Membuka '${d.targetLabel}' akan menggantikan perubahan draf di editor yang belum disimpan.` })"
      @delete-draft="(d) => { void onDeleteDraft(d); }"
      @refresh="() => { void refreshDrafts(); }"
    />

    <!-- Dirty-Draft Discard Confirmation Modal -->
    <SynthesisDiscardModal
      v-model:open="confirmDiscardOpen"
      :title="confirmDiscardTitle"
      :description="confirmDiscardDescription"
      @cancel="cancelDiscardModal"
      @confirm="() => { void confirmDiscardAndProceed(); }"
    />

    <AdminManualArticleModal
      v-model:open="manualModalOpen"
      :default-year="selectedYear"
      :default-quarter="selectedQuarter"
      @created="() => { void refreshPool(); }"
    />
  </div>
</template>
