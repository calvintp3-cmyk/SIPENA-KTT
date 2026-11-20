// app/composables/useSynthesisStudio.ts
import {
  buildFullQuarterBrsDocxBytes,
  buildSynthesisDocxBytes,
  type FullQuarterSectionDraft,
} from '#shared/utils/docx-export';
import { formatDateId, formatDateTimeWita, toRomanQuarter } from '#shared/utils/period';
import type {
  AdminArticleItem,
  SynthesisCitationItem,
  SynthesisDraftItem,
  SynthesisDraftsResponse,
  SynthesisGenerateResponse,
  SynthesisStyle,
} from '~/types/sipena';

export function useSynthesisStudio() {
  const toast = useToast();
  const isExportingBook = ref(false);
  const isSavingDraft = ref(false);
  const deletingDraftId = ref<string | null>(null);

  function copyNarrative(markdown: string) {
    if (!markdown.trim() || !import.meta.client) return;
    navigator.clipboard.writeText(markdown).then(() => {
      toast.add({
        title: 'Narasi BRS disalin ke clipboard',
        color: 'success',
        icon: 'i-lucide-clipboard-check',
      });
    }).catch(() => {
      toast.add({
        title: 'Gagal menyalin narasi',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
    });
  }

  function downloadSingleDocx(
    targetLabel: string,
    periodLabel: string,
    year: number,
    quarter: number,
    markdown: string,
    citations: SynthesisCitationItem[],
  ) {
    if (!markdown.trim() || !import.meta.client) return;

    const bytes = buildSynthesisDocxBytes({
      title: `Sintesis Narasi PDRB — ${targetLabel}`,
      periodLabel,
      subtitle: 'BPS Kabupaten Tana Tidung • Fungsi Nerwilis',
      markdown,
      citations: citations.map((c) => ({
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
    a.download = `SIPENA-Rangkuman-Ekonomi-${year}-TW${quarter}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportFullQuarterBook(
    year: number,
    quarter: number,
    periodLabel: string,
    activeDraftMap: {
      dimension: string;
      targetCode: string;
      targetLabel: string;
      markdown: string;
      citations: SynthesisCitationItem[];
    } | null,
    savedDrafts: SynthesisDraftItem[],
  ) {
    if (!import.meta.client || isExportingBook.value) return;
    isExportingBook.value = true;

    try {
      let fetchedDrafts: SynthesisDraftItem[] = [];
      try {
        const res = await $fetch<SynthesisDraftsResponse>('/api/admin/synthesis/drafts', {
          query: { year, quarter, limit: 50 },
          credentials: 'include',
        });
        fetchedDrafts = res?.items ?? [];
      } catch {
        fetchedDrafts = savedDrafts;
      }

      const periodDrafts = fetchedDrafts.filter(
        (d) => Number(d.year) === Number(year) && Number(d.quarter) === Number(quarter),
      );

      const latestPerKey = new Map<string, SynthesisDraftItem>();
      for (const d of periodDrafts) {
        const key = `${d.dimension}-${d.targetCode}`;
        const existing = latestPerKey.get(key);
        const curTime = new Date(d.updatedAt || d.createdAt || 0).getTime();
        const exTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : 0;
        if (!existing || curTime >= exTime) {
          latestPerKey.set(key, d);
        }
      }

      const draftsMap = new Map<string, FullQuarterSectionDraft>();
      for (const [key, d] of latestPerKey.entries()) {
        draftsMap.set(key, {
          dimension: d.dimension,
          code: d.targetCode,
          title: d.targetLabel || d.title,
          markdown: d.narrativeMarkdown,
          citations: (d.citations ?? []).map((c: SynthesisCitationItem) => ({
            index: c.index,
            title: c.title,
            sourcePortal: c.sourcePortal,
            publishedAtText: formatDateId(c.publishedAt),
            url: c.url,
          })),
          updatedAtText: d.updatedAt ? formatDateTimeWita(d.updatedAt) : undefined,
        });
      }

      if (activeDraftMap?.markdown.trim()) {
        const activeKey = `${activeDraftMap.dimension}-${activeDraftMap.targetCode}`;
        draftsMap.set(activeKey, {
          dimension: activeDraftMap.dimension as 'kbli' | 'expenditure',
          code: activeDraftMap.targetCode,
          title: activeDraftMap.targetLabel,
          markdown: activeDraftMap.markdown,
          citations: activeDraftMap.citations.map((c) => ({
            index: c.index,
            title: c.title,
            sourcePortal: c.sourcePortal,
            publishedAtText: formatDateId(c.publishedAt),
            url: c.url,
          })),
          updatedAtText: 'Draf Aktif Studio',
        });
      }

      const sections = Array.from(draftsMap.values());
      if (sections.length === 0) {
        toast.add({
          title: 'Belum Ada Draf Fenomena',
          description: `Tidak ditemukan draf narasi untuk ${periodLabel}. Silakan susun minimal 1 draf terlebih dahulu.`,
          color: 'warning',
          icon: 'i-lucide-alert-circle',
        });
        return;
      }

      const TOTAL_PDRB_SECTIONS = 23;
      if (sections.length < TOTAL_PDRB_SECTIONS) {
        toast.add({
          title: 'Perhatian: Buku Belum Lengkap',
          description: `Hanya ${sections.length} dari ${TOTAL_PDRB_SECTIONS} bagian yang memiliki draf untuk ${periodLabel}. Bagian yang belum tersusun akan dilewati.`,
          color: 'warning',
          icon: 'i-lucide-alert-triangle',
        });
      }

      sections.sort((a, b) => {
        if (a.dimension !== b.dimension) {
          return a.dimension === 'kbli' ? -1 : 1;
        }
        return a.code.localeCompare(b.code);
      });

      const bytes = buildFullQuarterBrsDocxBytes({
        year,
        quarter,
        periodLabel,
        compiledAtText: formatDateTimeWita(new Date().toISOString()),
        sections,
      });

      const blob = new Blob([new Uint8Array(bytes)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIPENA-Buku-Fenomena-PDRB-${year}-TW${quarter}-KTT.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.add({
        title: 'Buku Fenomena Berhasil Diunduh',
        description: `Buku kompilasi ${sections.length} dari ${TOTAL_PDRB_SECTIONS} bagian berhasil diekspor ke Word (.docx)`,
        color: 'success',
        icon: 'i-lucide-check-circle',
      });
    } finally {
      isExportingBook.value = false;
    }
  }

  async function persistNewDraft(
    res: SynthesisGenerateResponse,
    context: {
      year: number;
      quarter: number;
      dimension: 'kbli' | 'expenditure';
      targetCode: string;
      targetLabel: string;
      style: SynthesisStyle;
      periodLabel: string;
    },
    onSuccess: (item: SynthesisDraftItem) => void,
  ): Promise<boolean> {
    try {
      const created = await $fetch<{ item: SynthesisDraftItem }>('/api/admin/synthesis/drafts', {
        method: 'POST',
        body: {
          year: context.year,
          quarter: context.quarter,
          dimension: context.dimension,
          targetCode: context.targetCode,
          targetLabel: context.targetLabel,
          style: context.style,
          title: `${context.targetLabel} — ${context.periodLabel}`,
          narrativeMarkdown: res.narrativeMarkdown,
          generationMode: res.mode,
          modelUsed: res.modelUsed,
          notice: res.notice,
          citations: res.citations,
          articleIds: res.citations.map((c) => c.id),
        },
        credentials: 'include',
      });
      onSuccess(created.item);
      return true;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      toast.add({
        title: 'Narasi Siap, Namun Belum Tersimpan di DB',
        description: fetchErr.data?.message || 'Klik "Simpan Perubahan" pada toolbar.',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
      return false;
    }
  }

  async function saveDraftChanges(
    activeDraftId: string | null,
    markdown: string,
    context: {
      year: number;
      quarter: number;
      dimension: 'kbli' | 'expenditure';
      targetCode: string;
      targetLabel: string;
      style: SynthesisStyle;
      periodLabel: string;
      result: SynthesisGenerateResponse | null;
    },
    onSaved: (item: SynthesisDraftItem) => void,
  ) {
    const trimmed = markdown.trim();
    if (!trimmed || isSavingDraft.value) return;
    if (trimmed.length < 20) {
      toast.add({
        title: 'Teks Terlalu Pendek',
        description: 'Narasi draf minimal 20 karakter sebelum disimpan.',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
      return;
    }

    isSavingDraft.value = true;
    try {
      if (activeDraftId) {
        const updated = await $fetch<{ item: SynthesisDraftItem }>(
          `/api/admin/synthesis/drafts/${activeDraftId}`,
          {
            method: 'PATCH',
            body: {
              title: `${context.targetLabel} — ${context.periodLabel}`,
              style: context.style,
              narrativeMarkdown: trimmed,
            },
            credentials: 'include',
          },
        );
        onSaved(updated.item);
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
            year: context.year,
            quarter: context.quarter,
            dimension: context.dimension,
            targetCode: context.targetCode,
            targetLabel: context.targetLabel,
            style: context.style,
            title: `${context.targetLabel} — ${context.periodLabel}`,
            narrativeMarkdown: trimmed,
            generationMode: context.result?.mode ?? 'template',
            modelUsed: context.result?.modelUsed ?? null,
            notice: context.result?.notice ?? null,
            citations: context.result?.citations ?? [],
            articleIds: (context.result?.citations ?? []).map((c) => c.id),
          },
          credentials: 'include',
        });
        onSaved(created.item);
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
        description: fetchErr.data?.message || 'Terjadi kesalahan saat menyimpan.',
        color: 'error',
        icon: 'i-lucide-alert-circle',
      });
    } finally {
      isSavingDraft.value = false;
    }
  }

  async function deleteDraft(draft: SynthesisDraftItem, onDeleted: () => void) {
    if (deletingDraftId.value) return;
    deletingDraftId.value = draft.id;
    try {
      await $fetch(`/api/admin/synthesis/drafts/${draft.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      onDeleted();
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

  async function streamSynthesis(
    payload: {
      year: number;
      quarter: number;
      dimension: 'kbli' | 'expenditure';
      targetCode: string;
      style: SynthesisStyle;
      articleIds: string[];
    },
    onChunk: (text: string) => void,
    onMeta: (meta: { citations: SynthesisCitationItem[]; articleCount: number }) => void,
  ): Promise<SynthesisGenerateResponse> {
    const response = await fetch('/api/admin/synthesis/generate', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        ...payload,
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
          onMeta({ citations, articleCount });
        } else if (eventName === 'chunk') {
          const chunkText = typeof parsed.text === 'string' ? parsed.text : '';
          if (chunkText) {
            onChunk(chunkText);
          }
        } else if (eventName === 'done') {
          finalRes = parsed as unknown as SynthesisGenerateResponse;
        } else if (eventName === 'error') {
          const msg =
            typeof parsed.message === 'string'
              ? parsed.message
              : 'Gagal menyusun sintesis fenomena.';
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

    return finalRes;
  }

  async function executeDraftRestore(
    draft: SynthesisDraftItem,
    poolItems: AdminArticleItem[],
    applyPeriod: (year: number, quarter: 1 | 2 | 3 | 4) => void,
    onRestored: (payload: {
      dimension: 'kbli' | 'expenditure';
      targetCode: string;
      style: SynthesisStyle;
      activeDraftId: string;
      editableMarkdown: string;
      savedMarkdownSnapshot: string;
      result: SynthesisGenerateResponse;
      checkedMap: Record<string, boolean>;
    }) => void,
  ) {
    applyPeriod(draft.year, draft.quarter as 1 | 2 | 3 | 4);
    await nextTick();

    const checked: Record<string, boolean> = {};
    if (draft.articleIds?.length && poolItems.length) {
      const targetIds = new Set(draft.articleIds);
      for (const art of poolItems) {
        if (targetIds.has(art.id)) checked[art.id] = true;
      }
    }

    onRestored({
      dimension: draft.dimension,
      targetCode: draft.targetCode,
      style: draft.style,
      activeDraftId: draft.id,
      editableMarkdown: draft.narrativeMarkdown,
      savedMarkdownSnapshot: draft.narrativeMarkdown,
      result: {
        narrativeMarkdown: draft.narrativeMarkdown,
        mode: draft.generationMode,
        modelUsed: draft.modelUsed,
        notice: draft.notice || `Memuat draf tersimpan (${draft.targetLabel}).`,
        citations: draft.citations ?? [],
        generatedAt: draft.updatedAt,
        articleCount: draft.articleCount || draft.citations.length,
      },
      checkedMap: checked,
    });
  }

  async function runNarrativeGeneration(
    context: {
      year: number;
      quarter: number;
      dimension: 'kbli' | 'expenditure';
      targetCode: string;
      targetLabel: string;
      style: SynthesisStyle;
      periodLabel: string;
      articleIds: string[];
    },
    state: {
      isGenerating: Ref<boolean>;
      activeDraftId: Ref<string | null>;
      savedMarkdownSnapshot: Ref<string>;
      editableMarkdown: Ref<string>;
      result: Ref<SynthesisGenerateResponse | null>;
    },
    onSuccessPersist: () => void,
  ) {
    if (state.isGenerating.value || context.articleIds.length === 0) return;
    state.isGenerating.value = true;
    state.activeDraftId.value = null;
    state.savedMarkdownSnapshot.value = '';
    state.editableMarkdown.value = '';
    state.result.value = {
      narrativeMarkdown: '',
      mode: 'llm',
      modelUsed: null,
      notice: 'Menghubungkan ke mesin sintesis Multi-LLM secara real-time...',
      citations: [],
      generatedAt: new Date().toISOString(),
      articleCount: context.articleIds.length,
    };

    try {
      const finalRes = await streamSynthesis(
        {
          year: context.year,
          quarter: context.quarter,
          dimension: context.dimension,
          targetCode: context.targetCode,
          style: context.style,
          articleIds: context.articleIds,
        },
        (chunk) => {
          state.editableMarkdown.value += chunk;
          if (state.result.value) {
            state.result.value = { ...state.result.value, narrativeMarkdown: state.editableMarkdown.value };
          }
        },
        (meta) => {
          if (state.result.value) {
            state.result.value = {
              ...state.result.value,
              citations: meta.citations,
              articleCount: meta.articleCount,
              notice: 'Menulis draf narasi BRS terhubung ke sumber bukti...',
            };
          }
        },
      );

      state.result.value = finalRes;
      state.editableMarkdown.value = finalRes.narrativeMarkdown;
      state.savedMarkdownSnapshot.value = finalRes.narrativeMarkdown;

      const persisted = await persistNewDraft(
        finalRes,
        context,
        (created) => {
          state.activeDraftId.value = created.id;
          state.savedMarkdownSnapshot.value = created.narrativeMarkdown;
          onSuccessPersist();
        },
      );

      if (persisted) {
        toast.add({
          title: 'Draf Narasi Siap & Tersimpan',
          description: `${finalRes.articleCount} bukti terverifikasi berhasil disintesis.`,
          color: 'success',
          icon: 'i-lucide-sparkles',
        });
      }
    } catch (err: unknown) {
      state.result.value = null;
      const message =
        err instanceof Error ? err.message : 'Periksa kembali daftar artikel terpilih.';
      toast.add({
        title: 'Gagal Menyusun Narasi',
        description: message,
        color: 'error',
        icon: 'i-lucide-alert-circle',
      });
    } finally {
      state.isGenerating.value = false;
    }
  }

  return {
    isExportingBook,
    isSavingDraft,
    deletingDraftId,
    copyNarrative,
    downloadSingleDocx,
    exportFullQuarterBook,
    persistNewDraft,
    saveDraftChanges,
    deleteDraft,
    streamSynthesis,
    executeDraftRestore,
    runNarrativeGeneration,
  };
}
