// app/composables/useReviewQueue.ts
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import { getCurrentQuarterYearWita, type PdrbQuarter } from '#shared/utils/period';
import type { AdminArticleItem, AdminArticlesResponse } from '~/types/sipena';
import type { CurationFormData } from '~/components/admin/ArticleCurationForm.vue';

export function useReviewQueue() {
  const route = useRoute();
  const toast = useToast();
  const { setQueueCounts } = useAdminSession();
  const { selectedYear, selectedQuarter } = useAdminPeriod();

  function parseInitialStatus(raw: unknown): VerificationStatusEnum {
    if (
      raw === VerificationStatusEnum.PENDING ||
      raw === VerificationStatusEnum.VERIFIED ||
      raw === VerificationStatusEnum.IGNORED
    ) {
      return raw;
    }
    return VerificationStatusEnum.PENDING;
  }

  const activeStatus = ref<VerificationStatusEnum>(parseInitialStatus(route.query.status));
  const periodScope = ref<'all' | 'period'>('all');
  const onlyLlmFailed = ref(false);
  const searchInput = ref('');
  const debouncedSearch = ref('');
  const page = ref(1);
  const PAGE_LIMIT = 20;

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  watch(searchInput, (val: string) => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      debouncedSearch.value = val.trim();
      page.value = 1;
    }, 300);
  });

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });

  const queryParams = computed(() => {
    const q: Record<string, string | number> = {
      status: activeStatus.value,
      page: page.value,
      limit: PAGE_LIMIT,
    };
    if (periodScope.value === 'period') {
      q.year = selectedYear.value;
      q.quarter = selectedQuarter.value;
    }
    if (onlyLlmFailed.value) q.llmStatus = LlmStatusEnum.FAILED;
    if (debouncedSearch.value) q.q = debouncedSearch.value;
    return q;
  });

  const {
    data: reviewData,
    pending,
    error,
    refresh,
  } = useFetch<AdminArticlesResponse>('/api/admin/articles', {
    query: queryParams,
    watch: [queryParams],
    credentials: 'include',
  });

  watchEffect(() => {
    const counts = reviewData.value?.summaryCounts;
    if (counts) {
      setQueueCounts(counts.pendingCount, counts.llmFailedCount);
    }
  });

  const currentRows = computed<AdminArticleItem[]>(() => reviewData.value?.items ?? []);

  // Selection
  const selectedMap = ref<Record<string, boolean>>({});
  const selectedIds = computed(() =>
    Object.keys(selectedMap.value).filter((id) => selectedMap.value[id]),
  );

  function toggleRowSelection(id: string) {
    selectedMap.value = {
      ...selectedMap.value,
      [id]: !selectedMap.value[id],
    };
  }

  function clearSelection() {
    selectedMap.value = {};
  }

  const allVisibleChecked = computed(() => {
    const rows = currentRows.value;
    if (!rows.length) return false;
    return rows.every((r: AdminArticleItem) => selectedMap.value[r.id]);
  });

  function toggleSelectAllVisible() {
    const rows = currentRows.value;
    if (!rows.length) return;
    const shouldSelect = !allVisibleChecked.value;
    const next = { ...selectedMap.value };
    for (const r of rows) {
      if (shouldSelect) {
        next[r.id] = true;
      } else {
        delete next[r.id];
      }
    }
    selectedMap.value = next;
  }

  // Inspection
  const inspectedArticle = ref<AdminArticleItem | null>(null);
  const pendingDeepLinkId = ref<string | null>(
    typeof route.query.articleId === 'string' && route.query.articleId.length > 0
      ? route.query.articleId
      : null,
  );
  const deepLinkedArticle = ref<AdminArticleItem | null>(null);
  let isSyncingFromDeepLink = false;

  const drawerOpen = ref(false);
  const autoAdvanceNext = ref(true);
  const highlightIncomplete = ref(false);
  const inspectorSubmitting = ref<'VERIFIED' | 'IGNORED' | 'DRAFT' | null>(null);
  const reclassifyingLlm = ref(false);
  const inspectorAlert = ref<string | null>(null);

  const defaultWita = getCurrentQuarterYearWita();
  const initialSummarySnapshot = ref<string>('');

  const inspectorForm = reactive<CurationFormData>({
    title: '',
    summary: '',
    isEconomicPhenomenon: true,
    kbliCategory: '' as KbliCategoryEnum | '',
    kbliImpact: '' as KbliImpactEnum | '',
    expenditureComponent: '' as ExpenditureComponentEnum | '',
    expenditureImpact: '' as ExpenditureImpactEnum | '',
    secondaryKbliCategory: '' as KbliCategoryEnum | '',
    secondaryKbliImpact: '' as KbliImpactEnum | '',
    secondaryExpenditureComponent: '' as ExpenditureComponentEnum | '',
    secondaryExpenditureImpact: '' as ExpenditureImpactEnum | '',
    quarter: defaultWita.quarter as PdrbQuarter,
    year: defaultWita.year,
    subdistrict: '',
    curatorNotes: '',
  });

  function syncInspectorForm(article: AdminArticleItem | null) {
    inspectorAlert.value = null;
    if (!article) {
      initialSummarySnapshot.value = '';
      inspectorForm.title = '';
      inspectorForm.summary = '';
      inspectorForm.isEconomicPhenomenon = true;
      inspectorForm.kbliCategory = '';
      inspectorForm.kbliImpact = '';
      inspectorForm.expenditureComponent = '';
      inspectorForm.expenditureImpact = '';
      inspectorForm.secondaryKbliCategory = '';
      inspectorForm.secondaryKbliImpact = '';
      inspectorForm.secondaryExpenditureComponent = '';
      inspectorForm.secondaryExpenditureImpact = '';
      inspectorForm.quarter = defaultWita.quarter as PdrbQuarter;
      inspectorForm.year = defaultWita.year;
      inspectorForm.subdistrict = '';
      inspectorForm.curatorNotes = '';
      return;
    }

    initialSummarySnapshot.value = article.summary || '';
    inspectorForm.title = article.title;
    inspectorForm.summary = article.summary || '';
    inspectorForm.isEconomicPhenomenon = article.isEconomicPhenomenon ?? true;
    inspectorForm.kbliCategory = article.kbliCategory || '';
    inspectorForm.kbliImpact = article.kbliImpact || '';
    inspectorForm.expenditureComponent = article.expenditureComponent || '';
    inspectorForm.expenditureImpact = article.expenditureImpact || '';
    inspectorForm.secondaryKbliCategory = article.secondaryKbliCategory || '';
    inspectorForm.secondaryKbliImpact = article.secondaryKbliImpact || '';
    inspectorForm.secondaryExpenditureComponent = article.secondaryExpenditureComponent || '';
    inspectorForm.secondaryExpenditureImpact = article.secondaryExpenditureImpact || '';
    inspectorForm.quarter = article.quarter;
    inspectorForm.year = article.year;
    inspectorForm.subdistrict = article.subdistrict || '';
    inspectorForm.curatorNotes = article.curatorNotes || '';
  }

  watch(inspectedArticle, (art: AdminArticleItem | null) => {
    syncInspectorForm(art);
  });

  // Dirty Guard check
  const isInspectorDirty = computed(() => {
    if (!inspectedArticle.value) return false;
    const a = inspectedArticle.value;
    return (
      inspectorForm.title !== a.title ||
      inspectorForm.summary !== (a.summary || '') ||
      inspectorForm.isEconomicPhenomenon !== (a.isEconomicPhenomenon ?? true) ||
      inspectorForm.kbliCategory !== (a.kbliCategory || '') ||
      inspectorForm.kbliImpact !== (a.kbliImpact || '') ||
      inspectorForm.expenditureComponent !== (a.expenditureComponent || '') ||
      inspectorForm.expenditureImpact !== (a.expenditureImpact || '') ||
      inspectorForm.subdistrict !== (a.subdistrict || '') ||
      inspectorForm.curatorNotes !== (a.curatorNotes || '')
    );
  });

  async function resolveDeepLinkedArticle(targetId: string) {
    try {
      const res = await $fetch<{ item: AdminArticleItem }>(`/api/admin/articles/${targetId}`, {
        credentials: 'include',
      });
      deepLinkedArticle.value = res.item;
      inspectedArticle.value = res.item;
      if (res.item.verificationStatus !== activeStatus.value) {
        isSyncingFromDeepLink = true;
        activeStatus.value = res.item.verificationStatus;
        await nextTick();
        isSyncingFromDeepLink = false;
      }
    } catch {
      toast.add({
        title: 'Artikel tidak ditemukan',
        description: `Artikel ${targetId.slice(0, 8)} tidak tersedia atau telah dihapus.`,
        color: 'warning',
      });
    } finally {
      pendingDeepLinkId.value = null;
    }
  }

  watch(
    () => currentRows.value,
    (rows: AdminArticleItem[]) => {
      if (pendingDeepLinkId.value) {
        const targetId = pendingDeepLinkId.value;
        const foundInRows = rows.find((r: AdminArticleItem) => r.id === targetId);
        if (foundInRows) {
          deepLinkedArticle.value = foundInRows;
          inspectedArticle.value = foundInRows;
          pendingDeepLinkId.value = null;
          return;
        }
        if (import.meta.client) {
          void resolveDeepLinkedArticle(targetId);
          return;
        }
      }

      if (deepLinkedArticle.value && inspectedArticle.value?.id === deepLinkedArticle.value.id) {
        const updatedInRows = rows.find((r: AdminArticleItem) => r.id === deepLinkedArticle.value!.id);
        if (updatedInRows) {
          deepLinkedArticle.value = updatedInRows;
          inspectedArticle.value = updatedInRows;
        }
        return;
      }

      if (rows.length === 0) {
        inspectedArticle.value = null;
        return;
      }

      if (inspectedArticle.value) {
        const stillPresent = rows.find((r: AdminArticleItem) => r.id === inspectedArticle.value!.id);
        if (stillPresent) {
          inspectedArticle.value = stillPresent;
          return;
        }
      }
      inspectedArticle.value = rows[0] ?? null;
    },
    { immediate: true },
  );

  watch([activeStatus, periodScope, onlyLlmFailed], () => {
    page.value = 1;
    clearSelection();
    highlightIncomplete.value = false;
    if (!isSyncingFromDeepLink && !pendingDeepLinkId.value) {
      deepLinkedArticle.value = null;
    }
  });

  const canRestoreAiSummary = computed(
    () =>
      initialSummarySnapshot.value.trim().length > 0 &&
      inspectorForm.summary !== initialSummarySnapshot.value,
  );

  function restoreAiSummary() {
    if (initialSummarySnapshot.value) {
      inspectorForm.summary = initialSummarySnapshot.value;
    }
  }

  async function reclassifyInspectedArticle() {
    if (!inspectedArticle.value || reclassifyingLlm.value || inspectorSubmitting.value) return;
    reclassifyingLlm.value = true;
    inspectorAlert.value = null;
    const targetId = inspectedArticle.value.id;

    try {
      const res = await $fetch<{
        item: AdminArticleItem;
        modelUsed: string;
        providerUsed: string;
      }>(`/api/admin/articles/${targetId}/reclassify`, {
        method: 'POST',
        credentials: 'include',
      });

      inspectedArticle.value = res.item;
      syncInspectorForm(res.item);
      highlightIncomplete.value = false;

      toast.add({
        title: res.item.isEconomicPhenomenon
          ? 'Klasifikasi AI Berhasil (Fenomena Ekonomi)'
          : 'Evaluasi AI Selesai (Non-Ekonomi / Wilayah Lain)',
        description: res.item.isEconomicPhenomenon
          ? `Dipetakan ke KBLI ${res.item.kbliCategory} & ${res.item.expenditureComponent} via ${res.modelUsed}.`
          : res.item.llmError || 'Artikel dinilai bukan fenomena ekonomi KTT.',
        color: res.item.isEconomicPhenomenon ? 'success' : 'warning',
        icon: 'i-lucide-sparkles',
      });

      await refresh();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      const msg =
        fetchErr.data?.message || 'Gagal menjalankan klasifikasi ulang AI pada artikel ini.';
      inspectorAlert.value = msg;
      toast.add({
        title: 'Klasifikasi AI Gagal',
        description: msg,
        color: 'error',
      });
    } finally {
      reclassifyingLlm.value = false;
    }
  }

  const missingForVerify = computed(() => {
    const missing: string[] = [];
    if (inspectorForm.summary.trim().length < 10) missing.push('Ringkasan (min. 10 karakter)');
    if (!inspectorForm.kbliCategory) missing.push('Kategori KBLI');
    if (!inspectorForm.kbliImpact) missing.push('Dampak KBLI');
    if (!inspectorForm.expenditureComponent) missing.push('Komponen Pengeluaran');
    if (!inspectorForm.expenditureImpact) missing.push('Dampak Pengeluaran');
    return missing;
  });

  function selectArticleForInspection(article: AdminArticleItem, incomplete = false) {
    pendingDeepLinkId.value = null;
    deepLinkedArticle.value = null;
    inspectedArticle.value = article;
    highlightIncomplete.value = incomplete || article.llmStatus === LlmStatusEnum.FAILED;
  }

  function openMobileSlideover(article: AdminArticleItem, incomplete = false) {
    pendingDeepLinkId.value = null;
    deepLinkedArticle.value = null;
    inspectedArticle.value = article;
    highlightIncomplete.value = incomplete || article.llmStatus === LlmStatusEnum.FAILED;
    drawerOpen.value = true;
  }

  async function submitInspectorAction(action: 'VERIFIED' | 'IGNORED' | 'DRAFT') {
    if (!inspectedArticle.value || inspectorSubmitting.value) return;
    inspectorAlert.value = null;

    if (inspectorForm.title.trim().length < 5) {
      inspectorAlert.value = 'Judul berita minimal 5 karakter.';
      return;
    }

    if (action === 'VERIFIED' && missingForVerify.value.length > 0) {
      highlightIncomplete.value = true;
      inspectorAlert.value = `Field wajib belum lengkap untuk Verifikasi: ${missingForVerify.value.join(', ')}.`;
      return;
    }

    const trimmedSummary = inspectorForm.summary.trim();
    if (trimmedSummary.length > 0 && trimmedSummary.length < 10) {
      inspectorAlert.value = 'Jika diisi, ringkasan minimal 10 karakter (atau kosongkan).';
      return;
    }

    inspectorSubmitting.value = action;
    const targetArticle = inspectedArticle.value;
    const savedId = targetArticle.id;
    const preSnapshot = {
      id: targetArticle.id,
      title: targetArticle.title,
      verificationStatus: targetArticle.verificationStatus,
      isEconomicPhenomenon: targetArticle.isEconomicPhenomenon ?? true,
    };

    try {
      const nextStatus =
        action === 'VERIFIED'
          ? VerificationStatusEnum.VERIFIED
          : action === 'IGNORED'
            ? VerificationStatusEnum.IGNORED
            : targetArticle.verificationStatus;

      const payload: Record<string, unknown> = {
        title: inspectorForm.title.trim(),
        summary: trimmedSummary.length >= 10 ? trimmedSummary : null,
        isEconomicPhenomenon: inspectorForm.isEconomicPhenomenon,
        verificationStatus: nextStatus,
        quarter: inspectorForm.quarter,
        year: inspectorForm.year,
        subdistrict: inspectorForm.subdistrict ? inspectorForm.subdistrict : null,
        curatorNotes: inspectorForm.curatorNotes ? inspectorForm.curatorNotes : null,
        kbliCategory: inspectorForm.kbliCategory ? inspectorForm.kbliCategory : null,
        kbliImpact: inspectorForm.kbliImpact ? inspectorForm.kbliImpact : null,
        expenditureComponent: inspectorForm.expenditureComponent
          ? inspectorForm.expenditureComponent
          : null,
        expenditureImpact: inspectorForm.expenditureImpact ? inspectorForm.expenditureImpact : null,
        secondaryKbliCategory: inspectorForm.secondaryKbliCategory
          ? inspectorForm.secondaryKbliCategory
          : null,
        secondaryKbliImpact: inspectorForm.secondaryKbliImpact
          ? inspectorForm.secondaryKbliImpact
          : null,
        secondaryExpenditureComponent: inspectorForm.secondaryExpenditureComponent
          ? inspectorForm.secondaryExpenditureComponent
          : null,
        secondaryExpenditureImpact: inspectorForm.secondaryExpenditureImpact
          ? inspectorForm.secondaryExpenditureImpact
          : null,
      };

      const res = await $fetch<{ item: AdminArticleItem }>(`/api/admin/articles/${savedId}`, {
        method: 'PATCH',
        body: payload,
        credentials: 'include',
      });

      toast.add({
        title:
          action === 'VERIFIED'
            ? 'Artikel Terverifikasi'
            : action === 'IGNORED'
              ? 'Artikel Diabaikan'
              : 'Perubahan Disimpan',
        description: res.item.title,
        color: action === 'VERIFIED' ? 'success' : action === 'IGNORED' ? 'neutral' : 'info',
        icon: action === 'VERIFIED' ? 'i-lucide-check-circle-2' : 'i-lucide-save',
        actions:
          action !== 'DRAFT'
            ? [
                {
                  label: 'Batalkan (Undo)',
                  onClick: async () => {
                    try {
                      await $fetch(`/api/admin/articles/${preSnapshot.id}`, {
                        method: 'PATCH',
                        body: {
                          verificationStatus: preSnapshot.verificationStatus,
                          isEconomicPhenomenon: preSnapshot.isEconomicPhenomenon,
                        },
                        credentials: 'include',
                      });
                      await refresh();
                      toast.add({
                        title: 'Aksi dibatalkan',
                        description: `Status ${preSnapshot.title.slice(0, 30)}... dikembalikan.`,
                        color: 'neutral',
                      });
                    } catch {
                      toast.add({ title: 'Gagal membatalkan aksi', color: 'error' });
                    }
                  },
                },
              ]
            : undefined,
      });

      const nextMap = { ...selectedMap.value };
      delete nextMap[savedId];
      selectedMap.value = nextMap;
      highlightIncomplete.value = false;

      await refresh();

      if (
        autoAdvanceNext.value &&
        activeStatus.value === VerificationStatusEnum.PENDING &&
        action !== 'DRAFT'
      ) {
        deepLinkedArticle.value = null;
        const nextCandidate =
          currentRows.value.find((r: AdminArticleItem) => r.id !== savedId) ?? currentRows.value[0];
        inspectedArticle.value = nextCandidate ?? null;
      } else if (deepLinkedArticle.value?.id === savedId) {
        deepLinkedArticle.value = res.item;
        inspectedArticle.value = res.item;
      }
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      inspectorAlert.value = fetchErr.data?.message || 'Gagal menyimpan perubahan artikel.';
    } finally {
      inspectorSubmitting.value = null;
    }
  }

  async function handleSlideoverSaved(payload: {
    article: AdminArticleItem;
    action: 'VERIFIED' | 'IGNORED' | 'DRAFT';
  }) {
    const nextMap = { ...selectedMap.value };
    delete nextMap[payload.article.id];
    selectedMap.value = nextMap;
    await refresh();

    if (
      autoAdvanceNext.value &&
      activeStatus.value === VerificationStatusEnum.PENDING &&
      payload.action !== 'DRAFT'
    ) {
      const nextItem = currentRows.value.find((item: AdminArticleItem) => item.id !== payload.article.id);
      if (nextItem) {
        inspectedArticle.value = nextItem;
        highlightIncomplete.value = nextItem.llmStatus === LlmStatusEnum.FAILED;
        return;
      }
    }
    drawerOpen.value = false;
    highlightIncomplete.value = false;
  }

  // 1-click actions
  const rowBusyId = ref<string | null>(null);

  async function quickApprove(article: AdminArticleItem) {
    if (rowBusyId.value) return;
    rowBusyId.value = article.id;
    const preSnapshot = {
      id: article.id,
      title: article.title,
      verificationStatus: article.verificationStatus,
      isEconomicPhenomenon: article.isEconomicPhenomenon ?? true,
    };

    try {
      await $fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        body: { verificationStatus: VerificationStatusEnum.VERIFIED },
        credentials: 'include',
      });

      const nextMap = { ...selectedMap.value };
      delete nextMap[article.id];
      selectedMap.value = nextMap;

      await refresh();

      toast.add({
        title: 'Artikel Terverifikasi',
        description: article.title,
        color: 'success',
        icon: 'i-lucide-check-circle-2',
        actions: [
          {
            label: 'Batalkan (Undo)',
            onClick: async () => {
              try {
                await $fetch(`/api/admin/articles/${preSnapshot.id}`, {
                  method: 'PATCH',
                  body: {
                    verificationStatus: preSnapshot.verificationStatus,
                    isEconomicPhenomenon: preSnapshot.isEconomicPhenomenon,
                  },
                  credentials: 'include',
                });
                await refresh();
              } catch {
                // ignore
              }
            },
          },
        ],
      });
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      toast.add({
        title: 'Gagal memverifikasi',
        description: fetchErr.data?.message || 'Lengkapi field wajib terlebih dahulu.',
        color: 'error',
      });
      selectArticleForInspection(article, true);
    } finally {
      rowBusyId.value = null;
    }
  }

  async function quickIgnore(article: AdminArticleItem) {
    if (rowBusyId.value) return;
    rowBusyId.value = article.id;
    const preSnapshot = {
      id: article.id,
      title: article.title,
      verificationStatus: article.verificationStatus,
      isEconomicPhenomenon: article.isEconomicPhenomenon ?? true,
    };

    try {
      await $fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        body: { verificationStatus: VerificationStatusEnum.IGNORED },
        credentials: 'include',
      });

      const nextMap = { ...selectedMap.value };
      delete nextMap[article.id];
      selectedMap.value = nextMap;

      await refresh();

      toast.add({
        title: 'Artikel Diabaikan',
        description: article.title,
        color: 'neutral',
        icon: 'i-lucide-eye-off',
        actions: [
          {
            label: 'Batalkan (Undo)',
            onClick: async () => {
              try {
                await $fetch(`/api/admin/articles/${preSnapshot.id}`, {
                  method: 'PATCH',
                  body: {
                    verificationStatus: preSnapshot.verificationStatus,
                    isEconomicPhenomenon: preSnapshot.isEconomicPhenomenon,
                  },
                  credentials: 'include',
                });
                await refresh();
              } catch {
                // ignore
              }
            },
          },
        ],
      });
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      toast.add({
        title: 'Gagal mengabaikan artikel',
        description: fetchErr.data?.message,
        color: 'error',
      });
    } finally {
      rowBusyId.value = null;
    }
  }

  // Batch actions
  const batchLoading = ref(false);

  async function runBatchAction(action: 'VERIFY' | 'IGNORE') {
    const ids = selectedIds.value;
    if (!ids.length || batchLoading.value) return;

    batchLoading.value = true;
    try {
      const endpoint =
        action === 'VERIFY' ? '/api/admin/articles/batch/verify' : '/api/admin/articles/batch/ignore';
      await $fetch(endpoint, {
        method: 'POST',
        body: { ids },
        credentials: 'include',
      });

      toast.add({
        title: action === 'VERIFY' ? 'Batch Verifikasi Berhasil' : 'Batch Pengabaian Berhasil',
        description: `${ids.length} artikel telah diperbarui.`,
        color: action === 'VERIFY' ? 'success' : 'neutral',
      });

      clearSelection();
      await refresh();
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      toast.add({
        title: 'Batch Action Gagal',
        description: fetchErr.data?.message || 'Beberapa artikel mungkin memiliki field yang belum lengkap.',
        color: 'error',
      });
    } finally {
      batchLoading.value = false;
    }
  }

  const statusTabs = computed(() => {
    const c = reviewData.value?.summaryCounts;
    return [
      {
        label: 'Perlu Review',
        value: VerificationStatusEnum.PENDING,
        count: c?.pendingCount ?? 0,
        toneClass: 'bg-ochre-surface text-ochre-ink border-ochre/30',
      },
      {
        label: 'Terverifikasi',
        value: VerificationStatusEnum.VERIFIED,
        count: c?.verifiedCount ?? 0,
        toneClass: 'bg-brand-tint text-brand-primary border-brand-border',
      },
      {
        label: 'Diabaikan',
        value: VerificationStatusEnum.IGNORED,
        count: c?.ignoredCount ?? 0,
        toneClass: 'bg-surface-subtle text-ink-secondary border-border-hairline',
      },
    ];
  });

  return {
    PAGE_LIMIT,
    page,
    activeStatus,
    periodScope,
    onlyLlmFailed,
    searchInput,
    reviewData,
    pending,
    error,
    refresh,
    currentRows,
    statusTabs,
    selectedMap,
    selectedIds,
    allVisibleChecked,
    toggleRowSelection,
    toggleSelectAllVisible,
    clearSelection,
    inspectedArticle,
    drawerOpen,
    autoAdvanceNext,
    highlightIncomplete,
    inspectorSubmitting,
    reclassifyingLlm,
    inspectorAlert,
    inspectorForm,
    canRestoreAiSummary,
    isInspectorDirty,
    restoreAiSummary,
    reclassifyInspectedArticle,
    selectArticleForInspection,
    openMobileSlideover,
    submitInspectorAction,
    handleSlideoverSaved,
    rowBusyId,
    quickApprove,
    quickIgnore,
    batchLoading,
    runBatchAction,
  };
}
