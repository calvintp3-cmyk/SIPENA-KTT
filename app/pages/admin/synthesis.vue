<!-- app/pages/admin/synthesis.vue -->
<script setup lang="ts">
import {
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
  VerificationStatusEnum,
  type ExpenditureComponentMeta,
  type Pdrb17SectorMeta,
} from '#shared/enums/pdrb';
import { formatDateId, formatDateTimeWita, toRomanQuarter } from '#shared/utils/period';
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
const {
  getKbliImpactBadge,
  getKbliClusterTheme,
  getExpenditureImpactBadge,
  getExpenditureColorTheme,
  formatLlmProviderBadge,
} = usePdrbLabels();

const dimension = ref<'kbli' | 'expenditure'>('kbli');
const targetCode = ref<string>(PDRB_17_SECTORS[0]!.groupCode);
const style = ref<SynthesisStyle>('BRS_FORMAL');
let isRestoringDraft = false;

const styleOptions: Array<{ value: SynthesisStyle; label: string }> = [
  { value: 'BRS_FORMAL', label: 'BRS Formal BPS (Analitis Terstruktur)' },
  { value: 'EXECUTIVE_BRIEF', label: 'Kajian Eksekutif Pimpinan' },
  { value: 'BULLET_POINTS', label: 'Butir-Butir Fenomena Lampiran' },
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
const pendingRestoreArticleIds = ref<string[] | null>(null);

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
    const list = items ?? [];
    const next: Record<string, boolean> = {};
    if (pendingRestoreArticleIds.value !== null && !isRestoringDraft) {
      const targetIds = new Set(pendingRestoreArticleIds.value);
      for (const art of list) {
        if (targetIds.has(art.id)) {
          next[art.id] = true;
        }
      }
      pendingRestoreArticleIds.value = null;
      checkedMap.value = next;
      return;
    }
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

function selectAllPool() {
  const next: Record<string, boolean> = {};
  for (const art of (poolData.value?.items ?? []).slice(0, 30)) {
    next[art.id] = true;
  }
  checkedMap.value = next;
}

function clearPoolSelection() {
  checkedMap.value = {};
}

function togglePoolItem(id: string, event?: Event) {
  const isChecked = Boolean(checkedMap.value[id]);
  if (!isChecked && checkedIds.value.length >= 30) {
    if (event?.target instanceof HTMLInputElement) {
      event.target.checked = false;
    }
    toast.add({
      title: 'Batas maksimal 30 bukti per draf sintesis',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
    return;
  }
  checkedMap.value = {
    ...checkedMap.value,
    [id]: !isChecked,
  };
}

// Synthesis Output State & Shared PostgreSQL Drafts
const isGenerating = ref(false);
const isSavingDraft = ref(false);
const deletingDraftId = ref<string | null>(null);
const result = ref<SynthesisGenerateResponse | null>(null);
const activeDraftId = ref<string | null>(null);
const editableMarkdown = ref('');
const savedMarkdownSnapshot = ref('');
const isEditingInline = ref(false);
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

onBeforeUnmount(() => {
  if (highlightTimer) clearTimeout(highlightTimer);
});

async function persistNewDraftToDatabase(res: SynthesisGenerateResponse): Promise<boolean> {
  try {
    const created = await $fetch<{ item: SynthesisDraftItem }>('/api/admin/synthesis/drafts', {
      method: 'POST',
      body: {
        year: selectedYear.value,
        quarter: selectedQuarter.value,
        dimension: dimension.value,
        targetCode: targetCode.value,
        targetLabel: currentTargetLabel.value,
        style: style.value,
        title: `${currentTargetLabel.value} — ${periodLabel.value}`,
        narrativeMarkdown: res.narrativeMarkdown,
        generationMode: res.mode,
        modelUsed: res.modelUsed,
        notice: res.notice,
        citations: res.citations,
        articleIds: res.citations.map((c: SynthesisCitationItem) => c.id),
      },
      credentials: 'include',
    });
    activeDraftId.value = created.item.id;
    savedMarkdownSnapshot.value = created.item.narrativeMarkdown;
    await refreshDrafts();
    return true;
  } catch (err: unknown) {
    activeDraftId.value = null;
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Narasi Siap, Namun Belum Tersimpan di DB',
      description: fetchErr.data?.message || 'Klik "Simpan Perubahan" pada toolbar untuk mencoba menyimpan ulang.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
    return false;
  }
}

async function saveCurrentDraftChanges() {
  const markdown = editableMarkdown.value.trim();
  if (!markdown || isSavingDraft.value) return;
  if (markdown.length < 20) {
    toast.add({
      title: 'Teks Terlalu Pendek',
      description: 'Narasi draf minimal 20 karakter sebelum disimpan ke database.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
    return;
  }

  isSavingDraft.value = true;
  try {
    if (activeDraftId.value) {
      const updated = await $fetch<{ item: SynthesisDraftItem }>(
        `/api/admin/synthesis/drafts/${activeDraftId.value}`,
        {
          method: 'PATCH',
          body: {
            title: `${currentTargetLabel.value} — ${periodLabel.value}`,
            style: style.value,
            narrativeMarkdown: markdown,
          },
          credentials: 'include',
        },
      );
      savedMarkdownSnapshot.value = updated.item.narrativeMarkdown;
      editableMarkdown.value = updated.item.narrativeMarkdown;
      if (result.value) {
        result.value = {
          ...result.value,
          narrativeMarkdown: updated.item.narrativeMarkdown,
        };
      }
      await refreshDrafts();
      toast.add({
        title: 'Perubahan Draf Tersimpan',
        description: `${updated.item.targetLabel} (TW ${toRomanQuarter(updated.item.quarter)} ${updated.item.year})`,
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      });
    } else {
      const created = await $fetch<{ item: SynthesisDraftItem }>('/api/admin/synthesis/drafts', {
        method: 'POST',
        body: {
          year: selectedYear.value,
          quarter: selectedQuarter.value,
          dimension: dimension.value,
          targetCode: targetCode.value,
          targetLabel: currentTargetLabel.value,
          style: style.value,
          title: `${currentTargetLabel.value} — ${periodLabel.value}`,
          narrativeMarkdown: markdown,
          generationMode: result.value?.mode ?? 'template',
          modelUsed: result.value?.modelUsed ?? null,
          notice: result.value?.notice ?? null,
          citations: result.value?.citations ?? [],
          articleIds: (result.value?.citations ?? []).map((c: SynthesisCitationItem) => c.id),
        },
        credentials: 'include',
      });
      activeDraftId.value = created.item.id;
      savedMarkdownSnapshot.value = created.item.narrativeMarkdown;
      editableMarkdown.value = created.item.narrativeMarkdown;
      await refreshDrafts();
      toast.add({
        title: 'Draf Disimpan ke Database',
        description: created.item.title,
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      });
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menyimpan Draf',
      description: fetchErr.data?.message || 'Terjadi kesalahan saat menyimpan ke PostgreSQL.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    isSavingDraft.value = false;
  }
}

async function loadDraftFromHistory(draft: SynthesisDraftItem) {
  isRestoringDraft = true;
  pendingRestoreArticleIds.value = [...(draft.articleIds ?? [])];

  setPeriod(draft.year, draft.quarter as 1 | 2 | 3 | 4);
  dimension.value = draft.dimension;
  style.value = draft.style;
  await nextTick();
  targetCode.value = draft.targetCode;
  await nextTick();
  isRestoringDraft = false;

  activeDraftId.value = draft.id;
  editableMarkdown.value = draft.narrativeMarkdown;
  savedMarkdownSnapshot.value = draft.narrativeMarkdown;
  result.value = {
    narrativeMarkdown: draft.narrativeMarkdown,
    mode: draft.generationMode,
    modelUsed: draft.modelUsed,
    notice:
      draft.notice ||
      `Memuat draf tersimpan (${formatDateTimeWita(draft.updatedAt)} — ${draft.targetLabel}).`,
    citations: draft.citations ?? [],
    generatedAt: draft.updatedAt,
    articleCount: draft.articleCount || draft.citations.length,
  };

  if (draft.articleIds?.length && poolData.value?.items?.length) {
    const targetIds = new Set(draft.articleIds);
    const next: Record<string, boolean> = {};
    for (const art of poolData.value.items) {
      if (targetIds.has(art.id)) next[art.id] = true;
    }
    if (Object.keys(next).length > 0) {
      checkedMap.value = next;
      pendingRestoreArticleIds.value = null;
    }
  }

  isEditingInline.value = false;
  draftsDrawerOpen.value = false;
}

async function deleteDraftFromHistory(draft: SynthesisDraftItem) {
  if (deletingDraftId.value) return;
  deletingDraftId.value = draft.id;
  try {
    await $fetch(`/api/admin/synthesis/drafts/${draft.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (activeDraftId.value === draft.id) {
      activeDraftId.value = null;
      savedMarkdownSnapshot.value = '';
    }
    await refreshDrafts();
    toast.add({
      title: 'Draf Dihapus',
      description: draft.title,
      color: 'neutral',
      icon: 'i-lucide-trash-2',
    });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menghapus Draf',
      description: fetchErr.data?.message || 'Draf gagal dihapus dari database.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    deletingDraftId.value = null;
  }
}

async function generateNarrative() {
  if (isGenerating.value || checkedIds.value.length === 0) return;
  isGenerating.value = true;

  try {
    const res = await $fetch<SynthesisGenerateResponse>('/api/admin/synthesis/generate', {
      method: 'POST',
      body: {
        year: selectedYear.value,
        quarter: selectedQuarter.value,
        dimension: dimension.value,
        targetCode: targetCode.value,
        style: style.value,
        articleIds: checkedIds.value,
      },
      credentials: 'include',
    });

    result.value = res;
    editableMarkdown.value = res.narrativeMarkdown;
    savedMarkdownSnapshot.value = res.narrativeMarkdown;
    isEditingInline.value = false;
    const persisted = await persistNewDraftToDatabase(res);

    if (persisted) {
      toast.add({
        title: 'Draf Narasi BRS Siap & Tersimpan',
        description: `${res.articleCount} bukti terverifikasi berhasil disintesis.`,
        color: 'success',
        icon: 'i-lucide-sparkles',
      });
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menyusun Narasi',
      description: fetchErr.data?.message || 'Periksa kembali daftar artikel terpilih.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    isGenerating.value = false;
  }
}

// Citation Cross-Link Mapping & Scrolling
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

// Safe Inline Markdown + Citation Tokenizer (Zero v-html XSS)
interface InlineSpan {
  type: 'text' | 'bold' | 'cite';
  text: string;
  citeNum?: number;
}

interface MarkdownBlock {
  type: 'heading' | 'bullet' | 'paragraph';
  spans: InlineSpan[];
}

function tokenizeInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const regex = /(\*\*[^*]+\*\*|\[\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ type: 'text', text: line.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      spans.push({ type: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const num = Number(token.slice(1, -1));
      spans.push({ type: 'cite', text: token, citeNum: num });
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    spans.push({ type: 'text', text: line.slice(lastIndex) });
  }
  return spans;
}

const parsedNarrativeBlocks = computed<MarkdownBlock[]>(() => {
  const raw = editableMarkdown.value.trim();
  if (!raw) return [];
  const blocks: MarkdownBlock[] = [];
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const clean = line.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', spans: tokenizeInline(clean) });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ type: 'bullet', spans: tokenizeInline(line.slice(2).trim()) });
    } else {
      blocks.push({ type: 'paragraph', spans: tokenizeInline(line) });
    }
  }
  return blocks;
});

async function copyNarrativeText() {
  if (!editableMarkdown.value.trim()) return;
  try {
    await navigator.clipboard.writeText(editableMarkdown.value);
    toast.add({
      title: 'Narasi BRS disalin ke clipboard',
      color: 'success',
      icon: 'i-lucide-clipboard-check',
    });
  } catch {
    toast.add({
      title: 'Gagal menyalin narasi',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadDocFile() {
  if (!editableMarkdown.value.trim()) return;
  const paragraphsHtml = parsedNarrativeBlocks.value
    .map((b: MarkdownBlock) => {
      const inner = b.spans
        .map((s: InlineSpan) =>
          s.type === 'bold'
            ? `<strong>${escapeHtml(s.text)}</strong>`
            : escapeHtml(s.text),
        )
        .join('');
      if (b.type === 'heading') return `<h2 style="font-size:13pt;margin-top:14pt;">${inner}</h2>`;
      if (b.type === 'bullet') return `<li style="margin-bottom:4pt;">${inner}</li>`;
      return `<p style="line-height:1.6;margin-bottom:8pt;">${inner}</p>`;
    })
    .join('\n');

  const citationsHtml = (result.value?.citations ?? [])
    .map(
      (c: SynthesisCitationItem) =>
        `<li>[${c.index}] ${escapeHtml(c.title)} — <em>${escapeHtml(c.sourcePortal)}</em> (${escapeHtml(formatDateId(c.publishedAt))})</li>`,
    )
    .join('\n');

  const docHtml = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Sintesis Narasi PDRB ${escapeHtml(periodLabel.value)}</title></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#0B1220;"><h1>Sintesis Narasi PDRB — ${escapeHtml(currentTargetLabel.value)}</h1><p><strong>Periode:</strong> ${escapeHtml(periodLabel.value)} • <strong>BPS Kabupaten Tana Tidung (Fungsi Nerwilis)</strong></p><hr>${paragraphsHtml}<hr><h3>Daftar Sumber Berita Terverifikasi</h3><ol>${citationsHtml}</ol></body></html>`;

  const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SIPENA-Narasi-BRS-${selectedYear.value}-TW${selectedQuarter.value}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printNarrativeSheet() {
  if (!import.meta.client) return;
  window.print();
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
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
          >
            <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-3.5 h-3.5" />
            <span>Studio Penulisan Berita Resmi Statistik (BRS)</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] mt-2">
            Sintesis Narasi PDRB — {{ periodLabel }}
          </h1>
          <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
            Susun draf narasi faktual berakar 100% pada bukti berita terverifikasi lengkap dengan sitasi silang.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            class="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            @click="() => { draftsDrawerOpen = true; }"
          >
            <UIcon name="i-solar-history-2-bold-duotone" class="w-4 h-4 text-indigo-600" />
            <span class="tabular-nums">Riwayat Draf ({{ savedDrafts.length }})</span>
          </button>

          <button
            type="button"
            :disabled="isGenerating || checkedIds.length === 0"
            class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            @click="() => { void generateNarrative(); }"
          >
            <UIcon
              :name="isGenerating ? 'i-lucide-loader-circle' : 'i-solar-magic-stick-3-bold-duotone'"
              class="w-4 h-4 text-emerald-200"
              :class="isGenerating ? 'animate-spin' : ''"
            />
            <span>{{ isGenerating ? 'Menyusun Narasi...' : 'Generate Narasi BRS' }}</span>
          </button>
        </div>
      </div>

      <!-- Studio Parameter Controls (No button wrapping/clipping) -->
      <div class="saas-card rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
        <div class="md:col-span-3 space-y-1.5">
          <span class="block text-xs font-semibold text-slate-600">
            Dimensi PDRB
          </span>
          <div
            role="group"
            aria-label="Pilih dimensi sintesis"
            class="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/90 gap-1"
          >
            <button
              type="button"
              :aria-pressed="dimension === 'kbli'"
              class="py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer"
              :class="
                dimension === 'kbli'
                  ? 'bg-white font-bold text-indigo-700 shadow-2xs border border-indigo-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { dimension = 'kbli'; }"
            >
              17 KBLI
            </button>
            <button
              type="button"
              :aria-pressed="dimension === 'expenditure'"
              class="py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer"
              :class="
                dimension === 'expenditure'
                  ? 'bg-white font-bold text-emerald-700 shadow-2xs border border-emerald-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { dimension = 'expenditure'; }"
            >
              6 Pengeluaran
            </button>
          </div>
        </div>

        <div class="md:col-span-5 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <label
              for="synth-target-select"
              class="block text-xs font-semibold text-slate-600"
            >
              Target Sektor / Komponen ({{ shortPeriodLabel }})
            </label>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
              :class="
                dimension === 'kbli'
                  ? getKbliClusterTheme(targetCode).pillClass
                  : getExpenditureColorTheme(targetCode).pillClass
              "
            >
              {{ dimension === 'kbli' ? `Klaster ${getKbliClusterTheme(targetCode).label}` : targetCode }}
            </span>
          </div>
          <USelectMenu
            id="synth-target-select"
            v-model="targetCode"
            :items="targetOptions"
            value-key="value"
            label-key="label"
            aria-label="Pilih target sektor atau komponen PDRB"
            class="w-full"
          />
        </div>

        <div class="md:col-span-4 space-y-1.5">
          <label
            for="synth-style-select"
            class="block text-xs font-semibold text-slate-600"
          >
            Format Gaya Penulisan
          </label>
          <USelect
            id="synth-style-select"
            v-model="style"
            :items="styleOptions"
            value-key="value"
            label-key="label"
            aria-label="Pilih format gaya penulisan BRS"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- ASYMMETRIC TWO-PANE WORKSPACE (40% Evidence Pool / 60% Narrative Sheet) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT 40%: EVIDENCE POOL -->
      <section
        aria-label="Daftar Sumber Bukti Terverifikasi"
        class="no-print lg:col-span-5 saas-card rounded-2xl overflow-hidden flex flex-col max-h-[760px]"
      >
        <div class="p-4 border-b border-slate-200/80 bg-[#FAFBFD] space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-[#0F172A]">Bukti Terverifikasi</h2>
              <p class="text-[11px] text-slate-600 tabular-nums">
                {{ checkedIds.length }} dipilih dari {{ poolData?.items.length ?? 0 }} artikel (maks. 30)
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <button
                type="button"
                class="text-indigo-700 hover:text-indigo-900 hover:underline font-semibold cursor-pointer"
                @click="() => { selectAllPool(); }"
              >
                Pilih Semua
              </button>
              <span class="text-slate-300">|</span>
              <button
                type="button"
                class="text-slate-500 hover:text-slate-800 cursor-pointer"
                @click="() => { clearPoolSelection(); }"
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
              <UButton size="xs" color="error" variant="solid" @click="() => { void refreshPool(); }">
                Muat Ulang
              </UButton>
            </template>
          </UAlert>

          <div v-else-if="poolPending" class="space-y-2.5 p-2">
            <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-slate-100" />
          </div>

          <div v-else-if="!filteredPool.length" class="py-10 px-4 text-center space-y-3">
            <UIcon name="i-solar-document-text-bold-duotone" class="w-9 h-9 text-slate-300 mx-auto" />
            <div class="text-xs font-bold text-slate-700">
              Belum ada fenomena terverifikasi untuk target ini di {{ shortPeriodLabel }}.
            </div>
            <p class="text-[11px] text-slate-500">
              Anda dapat melengkapi bukti secara manual atau mengurasi antrean pending terlebih dahulu.
            </p>
            <div class="flex justify-center gap-2">
              <UButton size="xs" color="primary" variant="outline" @click="() => { manualModalOpen = true; }">
                + Input Manual
              </UButton>
              <UButton size="xs" color="neutral" variant="ghost" to="/admin/review">
                Buka Review
              </UButton>
            </div>
          </div>

          <template v-else>
            <div
              v-for="(art, idx) in filteredPool"
              :id="`synth-cite-card-${art.id}`"
              :key="art.id"
              class="rounded-xl border p-3 transition-all"
              :class="
                citationIndexByArticleId.get(art.id) !== undefined &&
                highlightedCitationIndex === citationIndexByArticleId.get(art.id)
                  ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/25 shadow-sm'
                  : checkedMap[art.id]
                    ? 'bg-white border-indigo-300/80 shadow-2xs'
                    : 'bg-slate-50/80 border-slate-200/80 opacity-75 hover:opacity-100'
              "
            >
              <div class="flex items-start gap-2.5">
                <input
                  :id="`synth-pool-chk-${art.id}`"
                  type="checkbox"
                  :checked="Boolean(checkedMap[art.id])"
                  class="mt-0.5 rounded border-slate-300 accent-indigo-600 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  @change="(e: Event) => { togglePoolItem(art.id, e); }"
                >
                <label
                  :for="`synth-pool-chk-${art.id}`"
                  class="min-w-0 flex-1 space-y-1.5 cursor-pointer block"
                >
                  <span class="flex items-center justify-between gap-2">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums"
                      :class="
                        citationIndexByArticleId.get(art.id)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200/80 text-slate-700'
                      "
                    >
                      [{{ citationIndexByArticleId.get(art.id) ?? idx + 1 }}]
                    </span>
                    <span class="text-[11px] font-medium text-slate-500 tabular-nums truncate">
                      {{ art.sourcePortal }} • {{ formatDateId(art.publishedAt) }}
                    </span>
                  </span>

                  <span class="block text-xs font-bold text-[#0F172A] leading-snug line-clamp-2">
                    {{ art.title }}
                  </span>
                  <span class="block text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
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

      <!-- RIGHT 60%: NARRATIVE DOCUMENT & EDITOR -->
      <section aria-label="Editor dan Pratinjau Narasi BRS" class="lg:col-span-7 space-y-4">
        <div class="saas-card synthesis-print-sheet rounded-2xl overflow-hidden flex flex-col">
          <!-- Toolbar (Hidden in Print) -->
          <div class="no-print px-5 py-3.5 border-b border-slate-200/80 bg-[#FAFBFD] flex flex-wrap items-center justify-between gap-2.5">
            <div class="flex items-center gap-2">
              <span
                v-if="result"
                class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5"
                :class="
                  result.mode === 'template'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : formatLlmProviderBadge(result.modelUsed).pillClass
                "
              >
                {{
                  result.mode === 'template'
                    ? 'Template Analitis Terverifikasi'
                    : formatLlmProviderBadge(result.modelUsed).label
                }}
              </span>
              <span v-else class="text-xs font-bold text-slate-700">
                Lembar Kerja Narasi BRS
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <button
                v-if="editableMarkdown"
                type="button"
                :disabled="!hasUnsavedChanges || isSavingDraft"
                class="h-8 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-45 cursor-pointer"
                :class="
                  hasUnsavedChanges
                    ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500'
                "
                @click="() => { void saveCurrentDraftChanges(); }"
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
                :disabled="!editableMarkdown"
                class="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#0F172A] inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                @click="() => { isEditingInline = !isEditingInline; }"
              >
                <UIcon :name="isEditingInline ? 'i-lucide-eye' : 'i-lucide-pencil'" class="w-3.5 h-3.5" />
                <span>{{ isEditingInline ? 'Pratinjau' : 'Edit Inline' }}</span>
              </button>

              <button
                type="button"
                :disabled="!editableMarkdown"
                class="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#0F172A] inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                @click="() => { void copyNarrativeText(); }"
              >
                <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
                <span>Salin</span>
              </button>

              <button
                type="button"
                :disabled="!editableMarkdown"
                class="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#0F172A] inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                @click="() => { downloadDocFile(); }"
              >
                <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-indigo-600" />
                <span>.DOC</span>
              </button>

              <button
                type="button"
                :disabled="!editableMarkdown"
                class="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#0F172A] inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                @click="() => { printNarrativeSheet(); }"
              >
                <UIcon name="i-lucide-printer" class="w-3.5 h-3.5 text-emerald-600" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>

          <div class="p-6 sm:p-8 space-y-5 min-h-[460px]">
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
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <UIcon name="i-solar-magic-stick-3-bold-duotone" class="w-6 h-6" />
              </div>
              <h2 class="text-base font-extrabold text-[#0F172A]">
                Siap Menyusun Narasi {{ currentTargetLabel }}
              </h2>
              <p class="text-xs text-slate-600 leading-relaxed">
                Centang bukti berita relevan di panel kiri, pilih gaya penulisan BRS atau kajian,
                lalu klik <strong>Generate Narasi BRS</strong> di kanan atas.
              </p>
            </div>

            <!-- Generating Skeleton -->
            <div v-else-if="isGenerating" class="space-y-4 py-6">
              <div class="h-5 w-1/2 rounded-lg bg-slate-200" />
              <div class="h-24 w-full rounded-xl bg-slate-100" />
              <div class="h-5 w-2/5 rounded-lg bg-slate-200" />
              <div class="h-24 w-full rounded-xl bg-slate-100" />
            </div>

            <!-- Inline Raw Markdown Editor -->
            <div v-else-if="isEditingInline" class="space-y-2">
              <label
                for="synth-inline-editor"
                class="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Editor Teks Narasi (Markdown Sederhana)
              </label>
              <textarea
                id="synth-inline-editor"
                v-model="editableMarkdown"
                rows="16"
                class="w-full rounded-xl border border-slate-200 p-4 text-sm text-[#0F172A] leading-relaxed focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <!-- Interactive Document View with Cross-Link Citation Chips -->
            <article v-else class="space-y-5">
              <header class="pb-4 border-b border-slate-200/80 space-y-1">
                <div class="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  SIPENA KTT • Draf Sintesis Narasi PDRB
                </div>
                <h2 class="text-lg sm:text-xl font-extrabold text-[#0F172A]">
                  {{ currentTargetLabel }} — {{ periodLabel }}
                </h2>
                <p class="text-xs text-slate-600">
                  Disusun untuk rekonsiliasi PDRB Fungsi Nerwilis BPS Kabupaten Tana Tidung
                </p>
              </header>

              <div class="space-y-3.5 text-sm leading-relaxed text-[#1E293B]">
                <template v-for="(block, bIdx) in parsedNarrativeBlocks" :key="bIdx">
                  <h3
                    v-if="block.type === 'heading'"
                    class="text-base font-bold text-[#0F172A] pt-2 tracking-tight"
                  >
                    <template v-for="(span, sIdx) in block.spans" :key="sIdx">
                      <strong v-if="span.type === 'bold'">{{ span.text }}</strong>
                      <template v-else>{{ span.text }}</template>
                    </template>
                  </h3>

                  <div v-else-if="block.type === 'bullet'" class="flex items-start gap-2.5 pl-2">
                    <span class="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                    <p class="flex-1">
                      <template v-for="(span, sIdx) in block.spans" :key="sIdx">
                        <strong v-if="span.type === 'bold'" class="font-semibold text-[#0F172A]">
                          {{ span.text }}
                        </strong>
                        <button
                          v-else-if="span.type === 'cite' && span.citeNum"
                          type="button"
                          title="Sorot kartu sumber bukti"
                          class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold tabular-nums align-baseline transition-colors cursor-pointer"
                          @click="() => { jumpToCitation(span.citeNum!); }"
                        >
                          {{ span.text }}
                        </button>
                        <template v-else>{{ span.text }}</template>
                      </template>
                    </p>
                  </div>

                  <p v-else>
                    <template v-for="(span, sIdx) in block.spans" :key="sIdx">
                      <strong v-if="span.type === 'bold'" class="font-semibold text-[#0F172A]">
                        {{ span.text }}
                      </strong>
                      <button
                        v-else-if="span.type === 'cite' && span.citeNum"
                        type="button"
                        title="Sorot kartu sumber bukti"
                        class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold tabular-nums align-baseline transition-colors cursor-pointer"
                        @click="() => { jumpToCitation(span.citeNum!); }"
                      >
                        {{ span.text }}
                      </button>
                      <template v-else>{{ span.text }}</template>
                    </template>
                  </p>
                </template>
              </div>

              <!-- Footnote Reference List -->
              <footer v-if="result?.citations.length" class="pt-4 border-t border-slate-200/80 space-y-2">
                <div class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Referensi Sumber Berita Terverifikasi
                </div>
                <ol class="space-y-1 text-xs text-slate-700">
                  <li v-for="c in result.citations" :key="c.id" class="flex items-start gap-2">
                    <span class="font-bold text-indigo-700 tabular-nums">[{{ c.index }}]</span>
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
    </div>

    <!-- Saved Drafts History Drawer (PostgreSQL Shared Team History) -->
    <USlideover
      v-model:open="draftsDrawerOpen"
      side="right"
      title="Riwayat Draf Sintesis (Database Tim)"
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
              <UButton size="xs" color="error" variant="solid" @click="() => { void refreshDrafts(); }">
                Muat Ulang
              </UButton>
            </template>
          </UAlert>

          <div v-else-if="draftsPending && !savedDrafts.length" class="space-y-2.5">
            <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-slate-100" />
          </div>

          <div v-else-if="!savedDrafts.length" class="py-12 text-center text-xs text-slate-500">
            Belum ada riwayat draf sintesis yang tersimpan di database.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="d in savedDrafts"
              :key="d.id"
              class="rounded-xl border p-3.5 bg-white transition-colors space-y-2"
              :class="
                activeDraftId === d.id
                  ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-50/25'
                  : 'border-slate-200 hover:border-indigo-400/60'
              "
            >
              <div class="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                <span class="font-bold text-indigo-700">
                  TW {{ toRomanQuarter(d.quarter) }} {{ d.year }}
                  <span class="text-slate-400 font-normal">• {{ d.articleCount }} bukti</span>
                </span>
                <span class="text-slate-400">{{ formatDateTimeWita(d.updatedAt) }}</span>
              </div>

              <button
                type="button"
                class="w-full text-left space-y-1 group cursor-pointer"
                @click="() => { void loadDraftFromHistory(d); }"
              >
                <span class="block text-xs font-bold text-[#0F172A] group-hover:text-indigo-700 transition-colors">
                  {{ d.targetLabel }}
                </span>
                <span class="block text-[11px] text-slate-600 line-clamp-2">
                  {{ d.narrativeMarkdown }}
                </span>
              </button>

              <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                <span class="text-slate-500 truncate">
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
                    class="px-2.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold cursor-pointer"
                    @click="() => { void loadDraftFromHistory(d); }"
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    :disabled="deletingDraftId === d.id"
                    aria-label="Hapus draf"
                    class="px-1.5 py-0.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                    @click="() => { void deleteDraftFromHistory(d); }"
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

    <AdminManualArticleModal
      v-model:open="manualModalOpen"
      :default-year="selectedYear"
      :default-quarter="selectedQuarter"
      @created="() => { void refreshPool(); }"
    />
  </div>
</template>
