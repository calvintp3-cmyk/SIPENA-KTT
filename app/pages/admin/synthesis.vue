<!-- app/pages/admin/synthesis.vue -->
<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router';
import {
  PDRB_17_SECTORS,
  PDRB_6_EXPENDITURE_LIST,
  VerificationStatusEnum,
  type ExpenditureComponentMeta,
  type Pdrb17SectorMeta,
} from '#shared/enums/pdrb';
import { buildSynthesisDocxBytes } from '#shared/utils/docx-export';
import { parseBrsMarkdown, type BrsMarkdownBlock } from '#shared/utils/markdown-brs';
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

const confirmDiscardOpen = ref(false);
const confirmDiscardTitle = ref('Buang Perubahan Draf yang Belum Disimpan?');
const confirmDiscardDescription = ref(
  'Anda memiliki suntingan narasi BRS yang belum disimpan ke database. Perubahan yang belum disimpan akan hilang jika Anda melanjutkan.',
);
let pendingDiscardAction: (() => Promise<void> | void) | null = null;
let bypassRouteGuardOnce = false;

function promptDiscardIfDirty(
  action: () => Promise<void> | void,
  options?: { title?: string; description?: string },
) {
  if (!hasUnsavedChanges.value) {
    void action();
    return;
  }
  confirmDiscardTitle.value = options?.title ?? 'Buang Perubahan Draf yang Belum Disimpan?';
  confirmDiscardDescription.value =
    options?.description ??
    'Anda memiliki suntingan narasi BRS yang belum disimpan ke database. Perubahan yang belum disimpan akan hilang jika Anda melanjutkan.';
  pendingDiscardAction = action;
  confirmDiscardOpen.value = true;
}

function cancelDiscardModal() {
  pendingDiscardAction = null;
  confirmDiscardOpen.value = false;
}

async function confirmDiscardAndProceed() {
  const action = pendingDiscardAction;
  pendingDiscardAction = null;
  confirmDiscardOpen.value = false;
  if (action) {
    await action();
  }
}

function resetDirtyWorkspaceToSavedOrEmpty() {
  if (activeDraftId.value && savedMarkdownSnapshot.value) {
    editableMarkdown.value = savedMarkdownSnapshot.value;
    if (result.value) {
      result.value = {
        ...result.value,
        narrativeMarkdown: savedMarkdownSnapshot.value,
      };
    }
  } else {
    activeDraftId.value = null;
    savedMarkdownSnapshot.value = '';
    editableMarkdown.value = '';
    result.value = null;
  }
  isEditingInline.value = false;
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
});

onBeforeUnmount(() => {
  if (highlightTimer) clearTimeout(highlightTimer);
  if (import.meta.client) {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
});

onBeforeRouteLeave((to) => {
  if (bypassRouteGuardOnce || !hasUnsavedChanges.value) {
    bypassRouteGuardOnce = false;
    return true;
  }
  const nextPath = to.fullPath;
  promptDiscardIfDirty(
    async () => {
      bypassRouteGuardOnce = true;
      await navigateTo(nextPath);
    },
    {
      title: 'Tinggalkan Studio Penulisan BRS?',
      description:
        'Masih ada perubahan draf yang belum disimpan. Jika Anda berpindah halaman sekarang, suntingan terakhir tidak akan tersimpan.',
    },
  );
  return false;
});

function requestDimensionChange(nextDim: 'kbli' | 'expenditure') {
  if (dimension.value === nextDim) return;
  promptDiscardIfDirty(
    () => {
      if (hasUnsavedChanges.value) {
        resetDirtyWorkspaceToSavedOrEmpty();
      }
      dimension.value = nextDim;
    },
    {
      title: 'Ganti Dimensi Target PDRB?',
      description:
        'Perubahan pada draf saat ini belum disimpan. Mengganti dimensi akan membersihkan editor dari perubahan yang belum disimpan.',
    },
  );
}

function requestTargetCodeChange(nextCode: string | undefined) {
  if (!nextCode || targetCode.value === nextCode) return;
  promptDiscardIfDirty(
    () => {
      if (hasUnsavedChanges.value) {
        resetDirtyWorkspaceToSavedOrEmpty();
      }
      targetCode.value = nextCode;
    },
    {
      title: 'Ganti Sektor/Komponen Target?',
      description:
        'Perubahan pada draf saat ini belum disimpan. Mengganti target analisis akan membersihkan suntingan yang belum disimpan.',
    },
  );
}

function restoreSavedMarkdown() {
  if (!savedMarkdownSnapshot.value) return;
  editableMarkdown.value = savedMarkdownSnapshot.value;
  if (result.value) {
    result.value = {
      ...result.value,
      narrativeMarkdown: savedMarkdownSnapshot.value,
    };
  }
  toast.add({
    title: 'Teks Dipulihkan ke Versi Tersimpan',
    color: 'neutral',
    icon: 'i-lucide-rotate-ccw',
  });
}

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

function requestLoadDraftFromHistory(draft: SynthesisDraftItem) {
  promptDiscardIfDirty(
    () => loadDraftFromHistory(draft),
    {
      title: 'Buka Draf Lain dari Riwayat?',
      description: `Membuka "${draft.targetLabel}" akan menggantikan perubahan draf di editor yang belum disimpan.`,
    },
  );
}

function requestGenerateNarrative() {
  if (isGenerating.value || checkedIds.value.length === 0) return;
  promptDiscardIfDirty(
    () => generateNarrative(),
    {
      title: 'Susun Ulang Narasi BRS?',
      description:
        'Editor masih memiliki perubahan yang belum disimpan. Menyusun narasi baru akan menggantikan teks di editor saat ini.',
    },
  );
}

async function generateNarrative() {
  if (isGenerating.value || checkedIds.value.length === 0) return;
  isGenerating.value = true;
  isEditingInline.value = false;
  activeDraftId.value = null;
  savedMarkdownSnapshot.value = '';
  editableMarkdown.value = '';
  result.value = {
    narrativeMarkdown: '',
    mode: 'llm',
    modelUsed: null,
    notice: 'Menghubungkan ke mesin sintesis Multi-LLM secara real-time...',
    citations: [],
    generatedAt: new Date().toISOString(),
    articleCount: checkedIds.value.length,
  };

  try {
    const response = await fetch('/api/admin/synthesis/generate', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        year: selectedYear.value,
        quarter: selectedQuarter.value,
        dimension: dimension.value,
        targetCode: targetCode.value,
        style: style.value,
        articleIds: checkedIds.value,
        stream: true,
      }),
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      let errMsg = 'Periksa kembali daftar artikel terpilih.';
      if (contentType.includes('application/json')) {
        const errBody = (await response.json().catch(() => null)) as { message?: string } | null;
        if (errBody?.message) errMsg = errBody.message;
      } else {
        const text = await response.text().catch(() => '');
        if (text.trim()) errMsg = text.slice(0, 240);
      }
      throw new Error(errMsg);
    }

    let finalRes: SynthesisGenerateResponse | null = null;

    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processEventBlock = (rawBlock: string) => {
        const lines = rawBlock.split('\n');
        let eventName = 'message';
        const dataParts: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataParts.push(line.slice(5).trim());
          }
        }

        if (dataParts.length === 0) return;
        const payloadRaw = dataParts.join('\n');
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = JSON.parse(payloadRaw) as Record<string, unknown>;
        } catch {
          return;
        }

        if (eventName === 'meta') {
          const citations = Array.isArray(parsed.citations)
            ? (parsed.citations as SynthesisCitationItem[])
            : [];
          const articleCount =
            typeof parsed.articleCount === 'number' ? parsed.articleCount : citations.length;
          if (result.value) {
            result.value = {
              ...result.value,
              citations,
              articleCount,
              notice: 'Menulis draf narasi BRS terhubung ke sumber bukti...',
            };
          }
        } else if (eventName === 'chunk') {
          const chunkText = typeof parsed.text === 'string' ? parsed.text : '';
          if (chunkText) {
            editableMarkdown.value += chunkText;
            if (result.value) {
              result.value = {
                ...result.value,
                narrativeMarkdown: editableMarkdown.value,
              };
            }
          }
        } else if (eventName === 'done') {
          finalRes = parsed as unknown as SynthesisGenerateResponse;
        } else if (eventName === 'error') {
          const msg =
            typeof parsed.message === 'string'
              ? parsed.message
              : 'Gagal menyusun sintesis BRS.';
          throw new Error(msg);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        let sepIndex = buffer.indexOf('\n\n');
        while (sepIndex !== -1) {
          const block = buffer.slice(0, sepIndex).trim();
          buffer = buffer.slice(sepIndex + 2);
          if (block) processEventBlock(block);
          sepIndex = buffer.indexOf('\n\n');
        }
      }

      buffer += decoder.decode().replace(/\r\n/g, '\n');
      if (buffer.trim()) {
        for (const rem of buffer.split('\n\n')) {
          if (rem.trim()) processEventBlock(rem.trim());
        }
      }
    } else {
      finalRes = (await response.json()) as SynthesisGenerateResponse;
    }

    if (!finalRes) {
      throw new Error('Aliran respons sintesis berhenti sebelum draf selesai disusun.');
    }

    result.value = finalRes;
    editableMarkdown.value = finalRes.narrativeMarkdown;
    savedMarkdownSnapshot.value = finalRes.narrativeMarkdown;
    isEditingInline.value = false;
    const persisted = await persistNewDraftToDatabase(finalRes);

    if (persisted) {
      toast.add({
        title: 'Draf Narasi BRS Siap & Tersimpan',
        description: `${finalRes.articleCount} bukti terverifikasi berhasil disintesis.`,
        color: 'success',
        icon: 'i-lucide-sparkles',
      });
    }
  } catch (err: unknown) {
    result.value = null;
    const message =
      err instanceof Error ? err.message : 'Periksa kembali daftar artikel terpilih.';
    toast.add({
      title: 'Gagal Menyusun Narasi',
      description: message,
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

const parsedNarrativeBlocks = computed<BrsMarkdownBlock[]>(() =>
  parseBrsMarkdown(editableMarkdown.value),
);

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

function downloadDocxFile() {
  if (!editableMarkdown.value.trim() || !import.meta.client) return;

  const bytes = buildSynthesisDocxBytes({
    title: `Sintesis Narasi PDRB — ${currentTargetLabel.value}`,
    periodLabel: periodLabel.value,
    subtitle: 'BPS Kabupaten Tana Tidung • Fungsi Nerwilis',
    markdown: editableMarkdown.value,
    citations: (result.value?.citations ?? []).map((c: SynthesisCitationItem) => ({
      index: c.index,
      title: c.title,
      sourcePortal: c.sourcePortal,
      publishedAtText: formatDateId(c.publishedAt),
      url: c.url,
    })),
  });

  const blob = new Blob([new Uint8Array(bytes)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SIPENA-Narasi-BRS-${selectedYear.value}-TW${selectedQuarter.value}.docx`;
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
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 text-balance mt-2">
            Sintesis Narasi PDRB — {{ periodLabel }}
          </h1>
          <p class="text-xs sm:text-sm text-slate-600 mt-0.5 text-pretty">
            Susun draf narasi faktual berakar 100% pada bukti berita terverifikasi lengkap dengan sitasi silang.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            class="min-h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            @click="() => { draftsDrawerOpen = true; }"
          >
            <UIcon name="i-solar-history-2-bold-duotone" class="w-4 h-4 text-indigo-600" />
            <span class="tabular-nums">Riwayat Draf ({{ savedDrafts.length }})</span>
          </button>

          <button
            type="button"
            :disabled="isGenerating || checkedIds.length === 0"
            class="btn-primary-gradient min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            @click="() => { requestGenerateNarrative(); }"
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
              class="min-h-8 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer"
              :class="
                dimension === 'kbli'
                  ? 'bg-white font-bold text-indigo-700 shadow-2xs border border-indigo-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { requestDimensionChange('kbli'); }"
            >
              17 KBLI
            </button>
            <button
              type="button"
              :aria-pressed="dimension === 'expenditure'"
              class="min-h-8 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer"
              :class="
                dimension === 'expenditure'
                  ? 'bg-white font-bold text-emerald-700 shadow-2xs border border-emerald-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { requestDimensionChange('expenditure'); }"
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
            :model-value="targetCode"
            :items="targetOptions"
            value-key="value"
            label-key="label"
            aria-label="Pilih target sektor atau komponen PDRB"
            class="w-full"
            @update:model-value="requestTargetCodeChange"
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
        <div class="p-4 border-b border-slate-200/80 bg-slate-50/70 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Bukti Terverifikasi</h2>
              <p class="text-[11px] text-slate-600 tabular-nums">
                {{ checkedIds.length }} dipilih dari {{ poolData?.items.length ?? 0 }} artikel (maks. 30)
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <button
                type="button"
                class="min-h-8 px-1.5 inline-flex items-center text-indigo-700 hover:text-indigo-900 hover:underline font-semibold cursor-pointer"
                @click="() => { selectAllPool(); }"
              >
                Pilih Semua
              </button>
              <span class="text-slate-300" aria-hidden="true">|</span>
              <button
                type="button"
                class="min-h-8 px-1.5 inline-flex items-center text-slate-600 hover:text-slate-900 cursor-pointer"
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
            <UIcon name="i-solar-document-text-bold-duotone" class="w-9 h-9 text-slate-400 mx-auto" aria-hidden="true" />
            <div class="text-xs font-bold text-slate-700">
              Belum ada fenomena terverifikasi untuk target ini di {{ shortPeriodLabel }}.
            </div>
            <p class="text-[11px] text-slate-600">
              Anda dapat melengkapi bukti secara manual atau mengurasi antrean pending terlebih dahulu.
            </p>
            <div class="flex justify-center gap-2">
              <UButton size="sm" color="primary" variant="outline" @click="() => { manualModalOpen = true; }">
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
                  ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/25 shadow-sm'
                  : checkedMap[art.id]
                    ? 'bg-white border-indigo-300/80 shadow-2xs'
                    : 'bg-slate-50/80 border-slate-200/80 opacity-80 hover:opacity-100'
              "
            >
              <div class="flex items-start gap-2.5">
                <input
                  :id="`synth-pool-chk-${art.id}`"
                  type="checkbox"
                  :checked="Boolean(checkedMap[art.id])"
                  class="mt-0.5 w-4 h-4 rounded border-slate-300 accent-indigo-600 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
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
                    <span class="text-[11px] font-medium text-slate-600 tabular-nums truncate">
                      {{ art.sourcePortal }} • {{ formatDateId(art.publishedAt) }}
                    </span>
                  </span>

                  <span class="block text-xs font-bold text-slate-900 leading-snug line-clamp-2">
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
          <div class="no-print px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
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
                v-if="hasUnsavedChanges && savedMarkdownSnapshot && !isGenerating"
                type="button"
                class="min-h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                @click="() => { restoreSavedMarkdown(); }"
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
                    ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600'
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
                :disabled="!editableMarkdown || isGenerating"
                class="min-h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-900 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                @click="() => { isEditingInline = !isEditingInline; }"
              >
                <UIcon :name="isEditingInline ? 'i-lucide-eye' : 'i-lucide-pencil'" class="w-3.5 h-3.5" />
                <span>{{ isEditingInline ? 'Pratinjau' : 'Edit Inline' }}</span>
              </button>

              <button
                type="button"
                :disabled="!editableMarkdown || isGenerating"
                class="min-h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-900 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                @click="() => { void copyNarrativeText(); }"
              >
                <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
                <span>Salin</span>
              </button>

              <button
                type="button"
                :disabled="!editableMarkdown || isGenerating"
                class="min-h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-900 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                @click="() => { downloadDocxFile(); }"
              >
                <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-indigo-600" />
                <span>.DOCX</span>
              </button>

              <button
                type="button"
                :disabled="!editableMarkdown || isGenerating"
                class="min-h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-900 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                @click="() => { printNarrativeSheet(); }"
              >
                <UIcon name="i-lucide-printer" class="w-3.5 h-3.5 text-emerald-700" />
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
              <h2 class="text-base font-extrabold text-slate-900 text-balance">
                Siap Menyusun Narasi {{ currentTargetLabel }}
              </h2>
              <p class="text-xs text-slate-600 leading-relaxed text-pretty">
                Centang bukti berita relevan di panel kiri, pilih gaya penulisan BRS atau kajian,
                lalu klik <strong>Generate Narasi BRS</strong> di kanan atas.
              </p>
            </div>

            <!-- Generating Skeleton before first streamed token arrives -->
            <div v-else-if="isGenerating && !editableMarkdown.trim()" class="space-y-4 py-6">
              <div class="h-5 w-1/2 rounded-lg bg-slate-200" />
              <div class="h-24 w-full rounded-xl bg-slate-100" />
              <div class="h-5 w-2/5 rounded-lg bg-slate-200" />
              <div class="h-24 w-full rounded-xl bg-slate-100" />
            </div>

            <!-- Inline Raw Markdown Editor -->
            <div v-else-if="isEditingInline" class="space-y-2">
              <label
                for="synth-inline-editor"
                class="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Editor Teks Narasi (Markdown BRS)
              </label>
              <textarea
                id="synth-inline-editor"
                v-model="editableMarkdown"
                rows="16"
                class="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 leading-relaxed focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <!-- Interactive Document View with Cross-Link Citation Chips -->
            <article v-else class="space-y-5">
              <header class="pb-4 border-b border-slate-200/80 space-y-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="text-xs font-bold uppercase tracking-wider text-indigo-700">
                    SIPENA KTT • Draf Sintesis Narasi PDRB
                  </div>
                  <span
                    v-if="isGenerating"
                    role="status"
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold"
                  >
                    <UIcon name="i-lucide-loader-circle" class="w-3 h-3 animate-spin" />
                    <span>Menulis live...</span>
                  </span>
                </div>
                <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 text-balance">
                  {{ currentTargetLabel }} — {{ periodLabel }}
                </h2>
                <p class="text-xs text-slate-600">
                  Disusun untuk rekonsiliasi PDRB Fungsi Nerwilis BPS Kabupaten Tana Tidung
                </p>
              </header>

              <div class="space-y-3.5 text-sm leading-relaxed text-slate-800">
                <template v-for="(block, bIdx) in parsedNarrativeBlocks" :key="bIdx">
                  <h3
                    v-if="block.type === 'heading' && block.level <= 2"
                    class="text-base font-bold text-slate-900 pt-2 tracking-tight text-balance"
                  >
                    <AdminSynthesisSpans :spans="block.spans" @cite="jumpToCitation" />
                  </h3>

                  <h4
                    v-else-if="block.type === 'heading'"
                    class="text-sm font-bold text-slate-900 pt-1.5 tracking-tight text-balance"
                  >
                    <AdminSynthesisSpans :spans="block.spans" @cite="jumpToCitation" />
                  </h4>

                  <ul
                    v-else-if="block.type === 'bullet_list'"
                    class="list-disc pl-5 space-y-1.5 text-pretty"
                  >
                    <li v-for="(itemSpans, itemIdx) in block.items" :key="itemIdx">
                      <AdminSynthesisSpans :spans="itemSpans" @cite="jumpToCitation" />
                    </li>
                  </ul>

                  <ol
                    v-else-if="block.type === 'ordered_list'"
                    :start="block.items[0]?.order ?? 1"
                    class="list-decimal pl-5 space-y-1.5 text-pretty"
                  >
                    <li v-for="(item, itemIdx) in block.items" :key="itemIdx">
                      <AdminSynthesisSpans :spans="item.spans" @cite="jumpToCitation" />
                    </li>
                  </ol>

                  <blockquote
                    v-else-if="block.type === 'blockquote'"
                    class="border-l-2 border-indigo-400 bg-indigo-50/40 pl-3.5 pr-3 py-2 rounded-r-lg space-y-1.5 italic text-slate-700"
                  >
                    <p v-for="(qPara, qIdx) in block.paragraphs" :key="qIdx" class="text-pretty">
                      <AdminSynthesisSpans :spans="qPara" @cite="jumpToCitation" />
                    </p>
                  </blockquote>

                  <div
                    v-else-if="block.type === 'table'"
                    tabindex="0"
                    role="region"
                    aria-label="Tabel Ringkasan Narasi BRS"
                    class="saas-table-scroller my-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <table class="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr class="bg-slate-50 border-b border-slate-200">
                          <th
                            v-for="(hSpans, hIdx) in block.headers"
                            :key="hIdx"
                            scope="col"
                            class="px-3 py-2 font-bold text-slate-900 whitespace-nowrap"
                          >
                            <AdminSynthesisSpans :spans="hSpans" @cite="jumpToCitation" />
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-for="(rowCells, rIdx) in block.rows" :key="rIdx">
                          <td
                            v-for="(cSpans, cIdx) in rowCells"
                            :key="cIdx"
                            class="px-3 py-2 text-slate-700 align-top"
                          >
                            <AdminSynthesisSpans :spans="cSpans" @cite="jumpToCitation" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p v-else class="text-pretty">
                    <AdminSynthesisSpans :spans="block.spans" @cite="jumpToCitation" />
                  </p>
                </template>
              </div>

              <!-- Footnote Reference List -->
              <footer v-if="result?.citations.length" class="pt-4 border-t border-slate-200/80 space-y-2">
                <div class="text-xs font-bold uppercase tracking-wider text-slate-600">
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

          <div v-else-if="!savedDrafts.length" class="py-12 text-center text-xs text-slate-600">
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
                  <span class="text-slate-600 font-normal">• {{ d.articleCount }} bukti</span>
                </span>
                <span class="text-slate-600">{{ formatDateTimeWita(d.updatedAt) }}</span>
              </div>

              <button
                type="button"
                class="w-full text-left space-y-1 group cursor-pointer"
                @click="() => { requestLoadDraftFromHistory(d); }"
              >
                <span class="block text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {{ d.targetLabel }}
                </span>
                <span class="block text-[11px] text-slate-600 line-clamp-2">
                  {{ d.narrativeMarkdown }}
                </span>
              </button>

              <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                <span class="text-slate-600 truncate">
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
                    class="min-h-8 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-colors cursor-pointer"
                    @click="() => { requestLoadDraftFromHistory(d); }"
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    :disabled="deletingDraftId === d.id"
                    aria-label="Hapus draf"
                    class="min-w-8 min-h-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
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

    <!-- Dirty-Draft Discard Confirmation Modal -->
    <UModal
      v-model:open="confirmDiscardOpen"
      :title="confirmDiscardTitle"
      :description="confirmDiscardDescription"
    >
      <template #body>
        <p class="text-sm text-slate-700 leading-relaxed text-pretty">
          {{ confirmDiscardDescription }}
        </p>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton
            autofocus
            color="neutral"
            variant="subtle"
            @click="() => { cancelDiscardModal(); }"
          >
            Tetap di Editor
          </UButton>
          <UButton
            color="warning"
            @click="() => { void confirmDiscardAndProceed(); }"
          >
            Buang Perubahan &amp; Lanjutkan
          </UButton>
        </div>
      </template>
    </UModal>

    <AdminManualArticleModal
      v-model:open="manualModalOpen"
      :default-year="selectedYear"
      :default-quarter="selectedQuarter"
      @created="() => { void refreshPool(); }"
    />
  </div>
</template>
