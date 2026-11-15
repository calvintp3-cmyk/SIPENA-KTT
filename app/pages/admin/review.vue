<!-- app/pages/admin/review.vue -->
<script setup lang="ts">
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import {
  formatDateId,
  formatDateTimeWita,
  getCurrentQuarterYearWita,
  toRomanQuarter,
  type PdrbQuarter,
} from '#shared/utils/period';
import type { AdminArticleItem, AdminArticlesResponse } from '~/types/sipena';
import { parseEconomicSnippetSegments } from '~/utils/snippetHighlight';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const route = useRoute();
const toast = useToast();
const { setQueueCounts } = useAdminSession();
const { selectedYear, selectedQuarter, shortPeriodLabel } = useAdminPeriod();
const isSidebarCollapsed = useState<boolean>('sipena:admin-sidebar-collapsed', () => false);
const {
  kbliOptions,
  kbliImpactOptions,
  expenditureOptions,
  expenditureImpactOptions,
  quarterOptions,
  getKbliShortCodeName,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getKbliClusterTheme,
  getExpenditureColorTheme,
  getLlmStatusBadge,
  formatLlmProviderBadge,
  getVerificationStatusBadge,
  getSourceTypeLabel,
  isSafeHttpUrl,
} = usePdrbLabels();

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
} = await useFetch<AdminArticlesResponse>('/api/admin/articles', {
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

// Selection state for batch actions
const selectedMap = ref<Record<string, boolean>>({});
const selectedIds = computed(() =>
  Object.entries(selectedMap.value)
    .filter(([, checked]) => checked)
    .map(([id]) => id),
);

function clearSelection() {
  selectedMap.value = {};
}

const allVisibleChecked = computed<boolean>(
  () =>
    currentRows.value.length > 0 &&
    currentRows.value.every((row: AdminArticleItem) => Boolean(selectedMap.value[row.id])),
);

function toggleSelectAllVisible() {
  if (allVisibleChecked.value) {
    const next = { ...selectedMap.value };
    for (const row of currentRows.value) {
      delete next[row.id];
    }
    selectedMap.value = next;
  } else {
    const next = { ...selectedMap.value };
    for (const row of currentRows.value) {
      next[row.id] = true;
    }
    selectedMap.value = next;
  }
}

function toggleRowSelection(id: string) {
  const next = { ...selectedMap.value };
  if (next[id]) {
    delete next[id];
  } else {
    next[id] = true;
  }
  selectedMap.value = next;
}

// Desktop Sticky Right Inspector State + Mobile Slideover Fallback
const inspectedArticle = ref<AdminArticleItem | null>(null);
const deepLinkedArticle = ref<AdminArticleItem | null>(null);
const pendingDeepLinkId = ref<string | null>(
  typeof route.query.articleId === 'string' && route.query.articleId.trim()
    ? route.query.articleId.trim()
    : null,
);
let deepLinkSeq = 0;
let isSyncingFromDeepLink = false;

const highlightIncomplete = ref(false);
const autoAdvanceNext = ref(true);
const drawerOpen = ref(false);

const defaultPeriod = getCurrentQuarterYearWita();
const inspectorForm = reactive({
  title: '',
  summary: '',
  kbliCategory: '' as KbliCategoryEnum | '',
  kbliImpact: '' as KbliImpactEnum | '',
  expenditureComponent: '' as ExpenditureComponentEnum | '',
  expenditureImpact: '' as ExpenditureImpactEnum | '',
  secondaryKbliCategory: '' as KbliCategoryEnum | '',
  secondaryKbliImpact: '' as KbliImpactEnum | '',
  secondaryExpenditureComponent: '' as ExpenditureComponentEnum | '',
  secondaryExpenditureImpact: '' as ExpenditureImpactEnum | '',
  quarter: defaultPeriod.quarter as PdrbQuarter,
  year: defaultPeriod.year,
  isEconomicPhenomenon: true,
});

const initialSummarySnapshot = ref('');
const inspectorSubmitting = ref<'VERIFIED' | 'IGNORED' | 'DRAFT' | null>(null);
const inspectorAlert = ref<string | null>(null);

watch(
  inspectedArticle,
  (nextArt: AdminArticleItem | null) => {
    inspectorAlert.value = null;
    if (!nextArt) {
      initialSummarySnapshot.value = '';
      return;
    }
    const rawSummary = nextArt.summary ?? '';
    initialSummarySnapshot.value = rawSummary;
    inspectorForm.title = nextArt.title;
    inspectorForm.summary = rawSummary;
    inspectorForm.kbliCategory = nextArt.kbliCategory ?? '';
    inspectorForm.kbliImpact = nextArt.kbliImpact ?? '';
    inspectorForm.expenditureComponent = nextArt.expenditureComponent ?? '';
    inspectorForm.expenditureImpact = nextArt.expenditureImpact ?? '';
    inspectorForm.secondaryKbliCategory = nextArt.secondaryKbliCategory ?? '';
    inspectorForm.secondaryKbliImpact = nextArt.secondaryKbliImpact ?? '';
    inspectorForm.secondaryExpenditureComponent = nextArt.secondaryExpenditureComponent ?? '';
    inspectorForm.secondaryExpenditureImpact = nextArt.secondaryExpenditureImpact ?? '';
    inspectorForm.quarter = nextArt.quarter as PdrbQuarter;
    inspectorForm.year = nextArt.year;
    inspectorForm.isEconomicPhenomenon = nextArt.isEconomicPhenomenon ?? true;
  },
  { immediate: true },
);

async function resolveDeepLinkedArticle(articleId: string) {
  const inRows = currentRows.value.find((r: AdminArticleItem) => r.id === articleId);
  if (inRows) {
    deepLinkedArticle.value = inRows;
    inspectedArticle.value = inRows;
    pendingDeepLinkId.value = null;
    return;
  }

  if (!import.meta.client) return;

  const seq = ++deepLinkSeq;
  try {
    const res = await $fetch<{ item: AdminArticleItem }>(
      `/api/admin/articles/${encodeURIComponent(articleId)}`,
      { credentials: 'include' },
    );
    if (seq !== deepLinkSeq) return;
    deepLinkedArticle.value = res.item;
    inspectedArticle.value = res.item;
    pendingDeepLinkId.value = null;
    if (!route.query.status && res.item.verificationStatus !== activeStatus.value) {
      isSyncingFromDeepLink = true;
      activeStatus.value = res.item.verificationStatus;
      await nextTick();
      isSyncingFromDeepLink = false;
    }
  } catch {
    if (seq !== deepLinkSeq) return;
    pendingDeepLinkId.value = null;
  }
}

watch(
  () => [route.query.status, route.query.articleId] as const,
  async ([rawStatus, rawArticleId]: readonly [unknown, unknown]) => {
    if (rawStatus !== undefined) {
      isSyncingFromDeepLink = true;
      activeStatus.value = parseInitialStatus(rawStatus);
      await nextTick();
      isSyncingFromDeepLink = false;
    }
    const nextId = typeof rawArticleId === 'string' && rawArticleId.trim() ? rawArticleId.trim() : null;
    if (nextId) {
      pendingDeepLinkId.value = nextId;
      void resolveDeepLinkedArticle(nextId);
    }
  },
);

onMounted(() => {
  if (pendingDeepLinkId.value) {
    void resolveDeepLinkedArticle(pendingDeepLinkId.value);
  }
});

watch(
  currentRows,
  (rows: AdminArticleItem[]) => {
    const targetId = pendingDeepLinkId.value;
    if (targetId) {
      const target = rows.find((r: AdminArticleItem) => r.id === targetId);
      if (target) {
        deepLinkedArticle.value = target;
        inspectedArticle.value = target;
        pendingDeepLinkId.value = null;
        return;
      }
      if (deepLinkedArticle.value?.id === targetId) {
        inspectedArticle.value = deepLinkedArticle.value;
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

const missingForVerify = computed(() => {
  const missing: string[] = [];
  if (inspectorForm.summary.trim().length < 10) missing.push('Ringkasan (min. 10 karakter)');
  if (!inspectorForm.kbliCategory) missing.push('Kategori KBLI');
  if (!inspectorForm.kbliImpact) missing.push('Dampak KBLI');
  if (!inspectorForm.expenditureComponent) missing.push('Komponen Pengeluaran');
  if (!inspectorForm.expenditureImpact) missing.push('Dampak Pengeluaran');
  return missing;
});

const kbliSelectModel = computed<string | undefined>({
  get: () => (inspectorForm.kbliCategory === '' ? undefined : inspectorForm.kbliCategory),
  set: (v: string | undefined) => {
    inspectorForm.kbliCategory = (v as KbliCategoryEnum | undefined) ?? '';
  },
});

const expSelectModel = computed<string | undefined>({
  get: () =>
    inspectorForm.expenditureComponent === '' ? undefined : inspectorForm.expenditureComponent,
  set: (v: string | undefined) => {
    inspectorForm.expenditureComponent = (v as ExpenditureComponentEnum | undefined) ?? '';
  },
});

const secondaryKbliSelectModel = computed<string | undefined>({
  get: () => (inspectorForm.secondaryKbliCategory === '' ? undefined : inspectorForm.secondaryKbliCategory),
  set: (v: string | undefined) => {
    inspectorForm.secondaryKbliCategory = (v as KbliCategoryEnum | undefined) ?? '';
    if (!v) inspectorForm.secondaryKbliImpact = '';
  },
});

const secondaryExpSelectModel = computed<string | undefined>({
  get: () =>
    inspectorForm.secondaryExpenditureComponent === '' ? undefined : inspectorForm.secondaryExpenditureComponent,
  set: (v: string | undefined) => {
    inspectorForm.secondaryExpenditureComponent = (v as ExpenditureComponentEnum | undefined) ?? '';
    if (!v) inspectorForm.secondaryExpenditureImpact = '';
  },
});

const secondaryKbliOptions = computed(() => [
  { label: '— Tidak ada KBLI sekunder —', value: '' },
  ...kbliOptions.filter((opt) => opt.value !== inspectorForm.kbliCategory),
]);

const secondaryExpOptions = computed(() => [
  { label: '— Tidak ada pengeluaran sekunder —', value: '' },
  ...expenditureOptions.filter((opt) => opt.value !== inspectorForm.expenditureComponent),
]);

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
  const savedId = inspectedArticle.value.id;

  try {
    const nextStatus =
      action === 'VERIFIED'
        ? VerificationStatusEnum.VERIFIED
        : action === 'IGNORED'
          ? VerificationStatusEnum.IGNORED
          : undefined;

    const res = await $fetch<{ item: AdminArticleItem }>(`/api/admin/articles/${savedId}`, {
      method: 'PATCH',
      body: {
        title: inspectorForm.title.trim(),
        summary: trimmedSummary.length >= 10 ? trimmedSummary : null,
        isEconomicPhenomenon:
          action === 'VERIFIED' ? true : inspectorForm.isEconomicPhenomenon,
        kbliCategory: inspectorForm.kbliCategory || null,
        kbliImpact: inspectorForm.kbliImpact || null,
        expenditureComponent: inspectorForm.expenditureComponent || null,
        expenditureImpact: inspectorForm.expenditureImpact || null,
        secondaryKbliCategory: inspectorForm.secondaryKbliCategory || null,
        secondaryKbliImpact: inspectorForm.secondaryKbliImpact || null,
        secondaryExpenditureComponent: inspectorForm.secondaryExpenditureComponent || null,
        secondaryExpenditureImpact: inspectorForm.secondaryExpenditureImpact || null,
        quarter: inspectorForm.quarter,
        year: Number(inspectorForm.year),
        ...(nextStatus ? { verificationStatus: nextStatus } : {}),
      },
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
    const nextItem = currentRows.value.find(
      (item: AdminArticleItem) => item.id !== payload.article.id,
    );
    if (nextItem) {
      inspectedArticle.value = nextItem;
      highlightIncomplete.value = nextItem.llmStatus === LlmStatusEnum.FAILED;
      return;
    }
  }
  drawerOpen.value = false;
  highlightIncomplete.value = false;
}

// 1-click actions on queue cards
const rowBusyId = ref<string | null>(null);

async function quickApprove(article: AdminArticleItem) {
  if (rowBusyId.value) return;
  rowBusyId.value = article.id;

  try {
    await $fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      body: { verificationStatus: VerificationStatusEnum.VERIFIED },
      credentials: 'include',
    });

    const nextMap = { ...selectedMap.value };
    delete nextMap[article.id];
    selectedMap.value = nextMap;

    toast.add({
      title: 'Artikel Terverifikasi',
      description: article.title,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    if (fetchErr.statusCode === 422) {
      toast.add({
        title: 'Klasifikasi Belum Lengkap',
        description: fetchErr.data?.message || 'Lengkapi bidang di Panel Inspeksi.',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
      selectArticleForInspection(article, true);
    } else {
      toast.add({
        title: 'Gagal Memverifikasi',
        description: fetchErr.data?.message || 'Terjadi kesalahan.',
        color: 'error',
        icon: 'i-lucide-alert-circle',
      });
    }
  } finally {
    rowBusyId.value = null;
  }
}

async function quickIgnore(article: AdminArticleItem) {
  if (rowBusyId.value) return;
  rowBusyId.value = article.id;

  try {
    await $fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      body: { verificationStatus: VerificationStatusEnum.IGNORED },
      credentials: 'include',
    });

    const nextMap = { ...selectedMap.value };
    delete nextMap[article.id];
    selectedMap.value = nextMap;

    toast.add({
      title: 'Artikel Diabaikan',
      description: article.title,
      color: 'neutral',
      icon: 'i-lucide-archive-x',
    });
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Mengabaikan Artikel',
      description: fetchErr.data?.message || 'Terjadi kesalahan.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    rowBusyId.value = null;
  }
}

const batchLoading = ref(false);

async function runBatchAction(action: 'VERIFY' | 'IGNORE') {
  if (batchLoading.value || selectedIds.value.length === 0) return;
  batchLoading.value = true;

  try {
    const res = await $fetch<{
      action: 'VERIFY' | 'IGNORE';
      updatedCount: number;
      incompleteItems: Array<{ id: string; title: string }>;
    }>('/api/admin/articles/batch', {
      method: 'POST',
      body: { ids: selectedIds.value, action },
      credentials: 'include',
    });

    clearSelection();
    await refresh();

    if (res.incompleteItems.length > 0) {
      toast.add({
        title: `${res.updatedCount} Terverifikasi, ${res.incompleteItems.length} Perlu Lengkapi Manual`,
        description: `${res.incompleteItems[0]?.title} belum memiliki pemetaan AI lengkap.`,
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      });
    } else {
      toast.add({
        title:
          action === 'VERIFY'
            ? `${res.updatedCount} Artikel Terverifikasi`
            : `${res.updatedCount} Artikel Diabaikan`,
        color: action === 'VERIFY' ? 'success' : 'neutral',
        icon: action === 'VERIFY' ? 'i-lucide-check-circle-2' : 'i-lucide-archive-x',
      });
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Aksi Batch Gagal',
      description: fetchErr.data?.message || 'Gagal memproses artikel terpilih.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    batchLoading.value = false;
  }
}

const statusTabs = computed(() => {
  const c = reviewData.value?.summaryCounts;
  return [
    {
      value: VerificationStatusEnum.PENDING,
      label: 'Menunggu Review',
      count: c?.pendingCount ?? 0,
      toneClass: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      value: VerificationStatusEnum.VERIFIED,
      label: 'Terverifikasi',
      count: c?.verifiedCount ?? 0,
      toneClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      value: VerificationStatusEnum.IGNORED,
      label: 'Diabaikan',
      count: c?.ignoredCount ?? 0,
      toneClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  ];
});

const fullSnippetModalOpen = ref(false);
const highlightedSnippetSegments = computed(() =>
  parseEconomicSnippetSegments(inspectedArticle.value?.snippetText || ''),
);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function moveInspectedRow(delta: number) {
  const rows = currentRows.value;
  if (!rows.length) return;
  const currentIdx = inspectedArticle.value
    ? rows.findIndex((r: AdminArticleItem) => r.id === inspectedArticle.value?.id)
    : -1;
  const nextIdx =
    currentIdx === -1
      ? delta > 0
        ? 0
        : rows.length - 1
      : Math.max(0, Math.min(rows.length - 1, currentIdx + delta));
  const nextRow = rows[nextIdx];
  if (nextRow) {
    selectArticleForInspection(nextRow);
  }
}

function handleReviewKeydown(e: KeyboardEvent) {
  if (fullSnippetModalOpen.value || drawerOpen.value) return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (inspectedArticle.value && inspectorSubmitting.value === null) {
      e.preventDefault();
      void submitInspectorAction('VERIFIED');
    }
    return;
  }

  if (e.altKey && e.key.toLowerCase() === 'i') {
    if (inspectedArticle.value && inspectorSubmitting.value === null) {
      e.preventDefault();
      void submitInspectorAction('IGNORED');
    }
    return;
  }

  if (isEditableTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
    e.preventDefault();
    moveInspectedRow(1);
  } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
    e.preventDefault();
    moveInspectedRow(-1);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleReviewKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleReviewKeydown);
});
</script>

<template>
  <div class="space-y-3 pb-4">
    <!-- Page Header & Filter Bar (Compacted for maximum workbench height) -->
    <div class="space-y-3">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 text-balance font-display">
            Review Harian Fenomena Ekonomi
          </h1>
          <p class="text-xs text-slate-600 mt-0.5 text-pretty flex flex-wrap items-center gap-1.5">
            <span>Audit klasifikasi AI dan pemetaan dua sisi PDRB sebelum ditayangkan.</span>
            <span aria-hidden="true" class="text-slate-300">•</span>
            <span class="font-medium text-slate-700">
              {{ periodScope === 'period' ? `Khusus ${shortPeriodLabel}` : 'Lintas semua periode' }}
            </span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Scope Switcher -->
          <div
            role="group"
            aria-label="Cakupan periode review"
            class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/90 font-mono"
          >
            <button
              type="button"
              :aria-pressed="periodScope === 'all'"
              class="min-h-8 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
              :class="
                periodScope === 'all'
                  ? 'bg-white font-bold text-blue-700 shadow-2xs border border-blue-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { periodScope = 'all'; }"
            >
              Semua Antrean
            </button>
            <button
              type="button"
              :aria-pressed="periodScope === 'period'"
              class="min-h-8 px-3 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
              :class="
                periodScope === 'period'
                  ? 'bg-white font-bold text-blue-700 shadow-2xs border border-blue-200/70'
                  : 'text-slate-600 hover:text-slate-950 font-medium'
              "
              @click="() => { periodScope = 'period'; }"
            >
              Hanya {{ shortPeriodLabel }}
            </button>
          </div>

          <div class="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 min-h-9 py-1 shadow-2xs">
            <USwitch
              id="review-only-llm-failed"
              v-model="onlyLlmFailed"
              size="sm"
              aria-label="Filter hanya artikel AI gagal"
            />
            <label for="review-only-llm-failed" class="text-xs font-semibold text-slate-900 cursor-pointer">
              AI Gagal
            </label>
            <span
              v-if="(reviewData?.summaryCounts.llmFailedCount ?? 0) > 0"
              class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold tabular-nums font-mono"
            >
              {{ reviewData?.summaryCounts.llmFailedCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Status Tabs & Search -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Status kurasi"
          class="inline-flex flex-nowrap overflow-x-auto saas-scroll p-1 bg-slate-100 rounded-xl border border-slate-200/90 max-w-full gap-1 font-mono"
        >
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :aria-pressed="activeStatus === tab.value"
            class="min-h-8 px-3 py-1 rounded-lg text-xs inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
            :class="
              activeStatus === tab.value
                ? 'bg-white font-bold text-slate-900 shadow-2xs border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-950 font-medium'
            "
            @click="() => { activeStatus = tab.value; }"
          >
            <span class="font-sans">{{ tab.label }}</span>
            <span
              class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border font-mono"
              :class="tab.toneClass"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <UInput
          id="review-queue-search"
          v-model="searchInput"
          type="search"
          size="sm"
          leading-icon="i-solar-magnifer-line-duotone"
          placeholder="Cari judul atau portal..."
          aria-label="Cari artikel pada antrean"
          class="w-full sm:w-64"
        />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat antrean review harian"
      description="Pastikan koneksi database aktif lalu muat ulang."
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- WORKBENCH HEADER ROW (Aligned above equal-height split columns) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
      <div class="lg:col-span-7 flex items-center justify-between px-1 text-xs text-slate-600">
        <UCheckbox
          :model-value="allVisibleChecked"
          :label="`Pilih semua di halaman (${currentRows.length})`"
          aria-label="Pilih semua artikel pada halaman ini"
          size="sm"
          @update:model-value="() => { toggleSelectAllVisible(); }"
        />

        <span v-if="reviewData" class="text-xs font-medium text-slate-600 font-mono tabular-nums">
          Hal {{ reviewData.pagination.page }}/{{ reviewData.pagination.totalPages }} •
          {{ reviewData.pagination.total }} artikel
        </span>
      </div>

      <div class="hidden lg:flex lg:col-span-5 items-center justify-between px-1 text-xs text-slate-500">
        <span class="font-semibold text-slate-700 font-display">Panel Inspeksi &amp; Hasil LLM</span>
        <span class="font-mono text-[11px] text-slate-500">
          {{ inspectedArticle ? `↑↓ Navigasi • Ctrl+Enter Verifikasi` : 'Siap mengurasi' }}
        </span>
      </div>
    </div>

    <!-- ASYMMETRIC 7/5 WORKBENCH WITH UNIFIED FIXED VIEWPORT HEIGHT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch lg:h-[calc(100vh-225px)] lg:min-h-[540px]">
      <!-- LEFT 7: QUEUE CARDS (Contained with internal scroll) -->
      <div class="lg:col-span-7 h-full flex flex-col min-h-0">
        <!-- Skeletons -->
        <div v-if="pending && !reviewData" class="flex-1 min-h-0 overflow-y-auto saas-scroll space-y-3 pr-1.5">
          <div v-for="i in 4" :key="i" class="saas-card rounded-xl p-4 space-y-2.5">
            <div class="h-3 w-40 rounded bg-slate-200" />
            <div class="h-5 w-4/5 rounded bg-slate-200" />
            <div class="h-10 w-full rounded bg-slate-100" />
          </div>
        </div>

        <!-- Empty Queue with Contextual Quick Actions -->
        <div v-else-if="!currentRows.length" class="saas-card rounded-xl py-12 px-6 text-center space-y-3.5 flex-1 flex flex-col items-center justify-center">
          <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <UIcon name="i-solar-inbox-in-bold-duotone" class="w-6 h-6" />
          </div>
          <div class="space-y-1">
            <div class="text-sm font-bold text-slate-900 font-display">
              Tidak ada artikel pada tab {{ activeStatus }}
            </div>
            <p class="text-xs text-slate-600 text-pretty max-w-sm mx-auto">
              Antrean saat ini bersih. Anda dapat meninjau tab lain atau mengubah cakupan filter.
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
            <UButton
              v-if="activeStatus === VerificationStatusEnum.PENDING && (reviewData?.summaryCounts.verifiedCount ?? 0) > 0"
              size="xs"
              color="primary"
              variant="soft"
              icon="i-solar-check-circle-bold-duotone"
              @click="() => { activeStatus = VerificationStatusEnum.VERIFIED; }"
            >
              Lihat {{ reviewData?.summaryCounts.verifiedCount }} Terverifikasi
            </UButton>
            <UButton
              v-if="periodScope === 'period'"
              size="xs"
              color="neutral"
              variant="outline"
              @click="() => { periodScope = 'all'; }"
            >
              Tampilkan Semua Periode
            </UButton>
            <UButton
              v-if="searchInput.trim()"
              size="xs"
              color="neutral"
              variant="outline"
              @click="() => { searchInput = ''; }"
            >
              Bersihkan Pencarian
            </UButton>
          </div>
        </div>

        <!-- Queue Card List (Scrollable) -->
        <div v-else class="flex-1 min-h-0 overflow-y-auto saas-scroll pr-1.5 space-y-3">
          <article
            v-for="art in currentRows"
            :key="art.id"
            class="saas-card rounded-xl p-4 transition-colors relative"
            :class="
              inspectedArticle?.id === art.id
                ? 'ring-2 ring-blue-600 border-blue-400 shadow-[0_8px_24px_-10px_rgba(29,78,216,0.28)]'
                : 'saas-card-interactive'
            "
          >
            <div class="flex items-start gap-3">
              <div class="pt-0.5 shrink-0 relative z-10">
                <UCheckbox
                  :model-value="Boolean(selectedMap[art.id])"
                  :aria-label="`Pilih ${art.title}`"
                  size="sm"
                  @update:model-value="() => { toggleRowSelection(art.id); }"
                />
              </div>

              <div class="min-w-0 flex-1 space-y-2">
                <!-- Metadata Row -->
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 tabular-nums">
                    <span class="font-bold text-slate-900">{{ formatDateId(art.publishedAt) }}</span>
                    <span aria-hidden="true">•</span>
                    <span class="truncate max-w-[150px] font-medium">{{ art.sourcePortal }}</span>
                    <span aria-hidden="true">•</span>
                    <span class="px-2 py-0.5 rounded-full bg-blue-50/70 border border-blue-200/70 text-blue-800 text-[11px] font-semibold font-mono">
                      TW {{ toRomanQuarter(art.quarter) }} {{ art.year }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <UBadge
                      v-if="art.llmStatus === LlmStatusEnum.FAILED"
                      :color="getLlmStatusBadge(art.llmStatus).color"
                      variant="subtle"
                      size="xs"
                      :icon="getLlmStatusBadge(art.llmStatus).icon"
                    >
                      AI Gagal
                    </UBadge>
                    <UBadge
                      v-else-if="art.llmConfidence !== null"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                      class="tabular-nums"
                    >
                      AI {{ Math.round(art.llmConfidence * 100) }}%
                    </UBadge>
                    <UBadge
                      v-if="art.isEconomicPhenomenon === false"
                      color="neutral"
                      variant="outline"
                      size="xs"
                    >
                      Non-Ekonomi
                    </UBadge>
                  </div>
                </div>

                <!-- Title (stretched card button for accessible selection) -->
                <h2 class="text-sm font-bold text-slate-900 leading-snug font-display">
                  <button
                    type="button"
                    class="w-full text-left line-clamp-2 hover:text-blue-700 transition-colors rounded cursor-pointer after:content-[''] after:absolute after:inset-0 after:z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    @click="() => { selectArticleForInspection(art); }"
                  >
                    {{ art.title }}
                  </button>
                </h2>
                <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed text-pretty">
                  {{ art.summary || art.snippetText }}
                </p>

                <!-- Dual-Axis Preview Chips + Quick Actions -->
                <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      class="px-2.5 py-0.5 rounded-full border font-semibold"
                      :class="
                        art.kbliCategory
                          ? getKbliClusterTheme(art.kbliCategory).pillClass
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      "
                    >
                      {{ art.kbliCategory ? getKbliShortCodeName(art.kbliCategory) : 'KBLI Belum Dipetakan' }}
                    </span>
                    <span
                      class="px-2.5 py-0.5 rounded-full border font-semibold"
                      :class="
                        art.expenditureComponent
                          ? getExpenditureColorTheme(art.expenditureComponent).pillClass
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      "
                    >
                      {{ art.expenditureComponent ? getExpenditureLabel(art.expenditureComponent, false) : 'Pengeluaran Kosong' }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 relative z-10">
                    <button
                      v-if="activeStatus !== VerificationStatusEnum.VERIFIED"
                      type="button"
                      :disabled="rowBusyId === art.id"
                      class="min-h-8 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      @click="() => { void quickApprove(art); }"
                    >
                      <UIcon name="i-lucide-check" class="w-3 h-3" />
                      <span>Verifikasi</span>
                    </button>

                    <button
                      type="button"
                      class="lg:hidden min-h-8 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-900 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      @click="() => { openMobileSlideover(art); }"
                    >
                      <UIcon name="i-lucide-pencil" class="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      v-if="activeStatus !== VerificationStatusEnum.IGNORED"
                      type="button"
                      :disabled="rowBusyId === art.id"
                      class="min-h-8 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 text-[11px] font-semibold cursor-pointer transition-colors"
                      @click="() => { void quickIgnore(art); }"
                    >
                      Abaikan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Pinned Pagination at bottom of Queue Column -->
        <div
          v-if="reviewData && reviewData.pagination.total > PAGE_LIMIT"
          class="pt-2 border-t border-slate-200/80 flex items-center justify-between shrink-0 mt-2 text-xs text-slate-600 font-mono"
        >
          <span>Halaman {{ page }} dari {{ reviewData.pagination.totalPages }}</span>
          <UPagination
            v-model:page="page"
            :total="reviewData.pagination.total"
            :items-per-page="PAGE_LIMIT"
            size="xs"
          />
        </div>
      </div>

      <!-- RIGHT 5: DESKTOP INSPECTOR (Same Fixed Viewport Height) -->
      <aside
        aria-label="Panel Inspeksi & Kurasi Artikel"
        class="hidden lg:flex lg:col-span-5 h-full min-h-0 flex-col"
      >
        <div
          v-if="!inspectedArticle"
          class="saas-card rounded-xl p-8 text-center text-xs text-slate-500 h-full flex flex-col items-center justify-center space-y-2.5"
        >
          <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <UIcon name="i-solar-checklist-minimalistic-bold-duotone" class="w-6 h-6" />
          </div>
          <span class="font-medium text-slate-600 font-display">Pilih salah satu artikel di daftar sebelah kiri untuk mulai mengurasi.</span>
        </div>

        <div
          v-else
          class="saas-card rounded-xl overflow-hidden flex flex-col h-full"
        >
          <!-- Inspector Header (Fixed) -->
          <div class="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <UBadge
                :color="getVerificationStatusBadge(inspectedArticle.verificationStatus).color"
                variant="subtle"
                size="xs"
                :icon="getVerificationStatusBadge(inspectedArticle.verificationStatus).icon"
              >
                {{ getVerificationStatusBadge(inspectedArticle.verificationStatus).label }}
              </UBadge>
              <UBadge
                :color="getLlmStatusBadge(inspectedArticle.llmStatus).color"
                variant="subtle"
                size="xs"
                :icon="getLlmStatusBadge(inspectedArticle.llmStatus).icon"
              >
                {{ getLlmStatusBadge(inspectedArticle.llmStatus).label }}
              </UBadge>
              <UBadge
                v-if="inspectedArticle.llmConfidence !== null"
                color="neutral"
                variant="outline"
                size="xs"
                class="tabular-nums"
              >
                AI {{ Math.round(inspectedArticle.llmConfidence * 100) }}%
              </UBadge>
              <span
                v-if="inspectedArticle.llmModel"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100/90 text-slate-700 text-[11px] font-medium font-mono"
                :title="inspectedArticle.llmModel"
              >
                {{ formatLlmProviderBadge(inspectedArticle.llmModel).shortLabel }}
              </span>
              <span class="text-[11px] font-medium text-slate-600">
                {{ getSourceTypeLabel(inspectedArticle.sourceType) }}
              </span>
            </div>

            <a
              v-if="isSafeHttpUrl(inspectedArticle.url)"
              :href="inspectedArticle.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 min-h-8 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-xs font-semibold text-blue-700 shrink-0 transition-colors"
            >
              <span>Sumber</span>
              <UIcon name="i-lucide-external-link" class="w-3 h-3" />
            </a>
          </div>

          <!-- Scrollable Inspector Body -->
          <div class="flex-1 overflow-y-auto saas-scroll p-4 space-y-4">
            <div class="text-xs font-medium text-slate-600 flex items-center justify-between font-mono tabular-nums">
              <span class="font-semibold text-slate-700">{{ inspectedArticle.sourcePortal }}</span>
              <span>{{ formatDateTimeWita(inspectedArticle.publishedAt) }}</span>
            </div>

            <UAlert
              v-if="inspectedArticle.llmStatus === LlmStatusEnum.FAILED"
              color="warning"
              variant="subtle"
              icon="i-lucide-alert-triangle"
              title="Klasifikasi AI tertunda/gagal"
              :description="
                inspectedArticle.llmError ||
                'Lengkapi ringkasan dan pemetaan PDRB secara manual.'
              "
            />

            <UAlert
              v-if="inspectorAlert"
              color="error"
              variant="subtle"
              icon="i-lucide-shield-alert"
              :title="inspectorAlert"
            />

            <!-- Auto-Advance & Economic Relevance Toggle -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div
                role="group"
                aria-label="Relevansi Fenomena Ekonomi"
                class="col-span-2 grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/90 gap-1 font-display"
              >
                <button
                  type="button"
                  :aria-pressed="inspectorForm.isEconomicPhenomenon === true"
                  class="min-h-8 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer"
                  :class="
                    inspectorForm.isEconomicPhenomenon === true
                      ? 'bg-white font-bold text-emerald-800 shadow-2xs border border-emerald-200'
                      : 'text-slate-600 font-medium'
                  "
                  @click="() => { inspectorForm.isEconomicPhenomenon = true; }"
                >
                  Fenomena Ekonomi Sah
                </button>
                <button
                  type="button"
                  :aria-pressed="inspectorForm.isEconomicPhenomenon === false"
                  class="min-h-8 py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer"
                  :class="
                    inspectorForm.isEconomicPhenomenon === false
                      ? 'bg-white font-bold text-rose-700 shadow-2xs border border-rose-200'
                      : 'text-slate-600 font-medium'
                  "
                  @click="() => { inspectorForm.isEconomicPhenomenon = false; }"
                >
                  Non-Ekonomi / Abaikan
                </button>
              </div>
            </div>

            <!-- Editable Title -->
            <div class="space-y-1">
              <label for="insp-title" class="text-xs font-semibold text-slate-700 font-display">
                Judul Berita
              </label>
              <UInput id="insp-title" v-model="inspectorForm.title" size="sm" class="w-full" />
            </div>

            <!-- Editable Summary + Kembalikan Teks AI -->
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <label for="insp-summary" class="text-xs font-semibold text-slate-700 font-display">
                  Ringkasan Publik (Min. 10 Karakter)
                </label>
                <button
                  v-if="canRestoreAiSummary"
                  type="button"
                  class="inline-flex items-center gap-1 min-h-8 px-2 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                  @click="() => { restoreAiSummary(); }"
                >
                  <UIcon name="i-lucide-rotate-ccw" class="w-3 h-3" />
                  <span>Kembalikan Teks AI</span>
                </button>
              </div>
              <UTextarea
                id="insp-summary"
                v-model="inspectorForm.summary"
                :rows="6"
                placeholder="Ringkasan faktual 2–3 kalimat..."
                class="w-full text-xs"
                :ui="{ base: 'leading-relaxed resize-y' }"
              />
              <p
                v-if="highlightIncomplete && inspectorForm.summary.trim().length < 10"
                class="text-xs text-rose-600 font-semibold"
              >
                Wajib diisi minimal 10 karakter sebelum verifikasi.
              </p>
            </div>

            <!-- Sisi Lapangan Usaha (KBLI + Concise 2x2 Grid) -->
            <div class="rounded-xl border border-blue-200/70 bg-blue-50/35 p-3.5 space-y-2.5">
              <label for="insp-kbli-select" class="block text-xs font-bold text-blue-900 font-display">
                1. Lapangan Usaha (KBLI A–V)
              </label>
              <USelectMenu
                id="insp-kbli-select"
                v-model="kbliSelectModel"
                :items="kbliOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih kategori KBLI..."
                aria-label="Kategori Lapangan Usaha KBLI"
                size="sm"
                class="w-full"
              />
              <div role="group" aria-label="Dampak Lapangan Usaha" class="grid grid-cols-2 gap-1.5 font-mono">
                <button
                  v-for="opt in kbliImpactOptions"
                  :key="opt.value"
                  type="button"
                  :aria-pressed="inspectorForm.kbliImpact === opt.value"
                  class="min-h-8 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer"
                  :class="
                    inspectorForm.kbliImpact === opt.value
                      ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                  "
                  @click="() => { inspectorForm.kbliImpact = opt.value; }"
                >
                  {{ opt.shortLabel }}
                </button>
              </div>
            </div>

            <!-- Sisi Pengeluaran (Component + Concise 2x2 Grid) -->
            <div class="rounded-xl border border-emerald-200/70 bg-emerald-50/35 p-3.5 space-y-2.5">
              <label for="insp-exp-select" class="block text-xs font-bold text-emerald-900 font-display">
                2. Komponen Pengeluaran PDRB
              </label>
              <USelect
                id="insp-exp-select"
                v-model="expSelectModel"
                :items="expenditureOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih komponen pengeluaran..."
                aria-label="Komponen Pengeluaran PDRB"
                size="sm"
                class="w-full"
              />
              <div role="group" aria-label="Dampak Pengeluaran" class="grid grid-cols-2 gap-1.5 font-mono">
                <button
                  v-for="opt in expenditureImpactOptions"
                  :key="opt.value"
                  type="button"
                  :aria-pressed="inspectorForm.expenditureImpact === opt.value"
                  class="min-h-8 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer"
                  :class="
                    inspectorForm.expenditureImpact === opt.value
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  "
                  @click="() => { inspectorForm.expenditureImpact = opt.value; }"
                >
                  {{ opt.shortLabel }}
                </button>
              </div>
            </div>

            <!-- Keterkaitan Sektoral Sekunder (Opsional / Inter-industry Linkage) -->
            <div class="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2.5">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-solar-link-round-bold-duotone" class="w-4 h-4 text-blue-700" />
                <span class="text-xs font-bold text-slate-800 font-display">Keterkaitan Sektoral Sekunder (Opsional)</span>
              </div>
              <div class="space-y-2">
                <label for="insp-sec-kbli-select" class="block text-xs font-semibold text-slate-600">
                  KBLI Sekunder
                </label>
                <USelectMenu
                  id="insp-sec-kbli-select"
                  v-model="secondaryKbliSelectModel"
                  :items="secondaryKbliOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Pilih KBLI sekunder (opsional)..."
                  aria-label="KBLI Sekunder"
                  size="sm"
                  class="w-full"
                />
                <div v-if="inspectorForm.secondaryKbliCategory" role="group" aria-label="Dampak KBLI Sekunder" class="grid grid-cols-2 gap-1.5 pt-1 font-mono">
                  <button
                    v-for="opt in kbliImpactOptions"
                    :key="opt.value"
                    type="button"
                    :aria-pressed="inspectorForm.secondaryKbliImpact === opt.value"
                    class="min-h-8 px-2 py-1 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer"
                    :class="
                      inspectorForm.secondaryKbliImpact === opt.value
                        ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                    "
                    @click="() => { inspectorForm.secondaryKbliImpact = opt.value; }"
                  >
                    {{ opt.shortLabel }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Periode -->
            <div class="grid grid-cols-2 gap-2.5">
              <div class="space-y-1">
                <label for="insp-quarter-select" class="block text-xs font-semibold text-slate-600">
                  Triwulan PDRB
                </label>
                <USelect
                  id="insp-quarter-select"
                  v-model="inspectorForm.quarter"
                  :items="quarterOptions"
                  value-key="value"
                  label-key="label"
                  aria-label="Triwulan PDRB"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div class="space-y-1">
                <label for="insp-year-input" class="block text-xs font-semibold text-slate-600">
                  Tahun
                </label>
                <UInput
                  id="insp-year-input"
                  v-model.number="inspectorForm.year"
                  type="number"
                  size="sm"
                  :min="2000"
                  :max="2100"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Cuplikan Sumber Asli -->
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <label for="insp-snippet-source" class="block text-xs font-semibold text-slate-600 font-display">
                  Cuplikan Teks Asli (Referensi Verifikasi)
                </label>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 min-h-7 px-2 rounded-lg text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                  @click="() => { fullSnippetModalOpen = true; }"
                >
                  <UIcon name="i-solar-maximize-square-2-linear" class="w-3.5 h-3.5" />
                  <span>Baca Penuh</span>
                </button>
              </div>
              <UTextarea
                id="insp-snippet-source"
                :model-value="inspectedArticle.snippetText"
                readonly
                :rows="8"
                class="w-full text-xs"
                :ui="{ base: 'bg-slate-50/90 text-slate-700 leading-relaxed resize-y' }"
              />
            </div>
          </div>

          <!-- Sticky Inspector Footer -->
          <div class="px-4 py-3 border-t border-slate-200/80 bg-slate-50/70 space-y-2.5">
            <div
              v-if="activeStatus === VerificationStatusEnum.PENDING"
              class="flex items-center justify-between text-xs text-slate-700"
            >
              <label for="insp-auto-advance" class="cursor-pointer font-medium">
                Otomatis buka antrean berikutnya
              </label>
              <USwitch
                id="insp-auto-advance"
                v-model="autoAdvanceNext"
                size="xs"
                aria-label="Otomatis buka antrean berikutnya"
              />
            </div>

            <div class="flex items-center justify-between gap-2">
              <button
                type="button"
                :disabled="inspectorSubmitting !== null"
                class="min-h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                @click="() => { void submitInspectorAction('IGNORED'); }"
              >
                Abaikan
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="inspectorSubmitting !== null"
                  class="min-h-9 px-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 text-xs font-semibold text-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
                  @click="() => { void submitInspectorAction('DRAFT'); }"
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  :disabled="inspectorSubmitting !== null"
                  class="btn-primary-gradient min-h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer font-display"
                  @click="() => { void submitInspectorAction('VERIFIED'); }"
                >
                  <UIcon name="i-solar-check-circle-bold-duotone" class="w-4 h-4 text-emerald-200" />
                  <span>Verifikasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Floating Batch Action Bar (Synced with Collapsible Sidebar Width) -->
    <div
      v-if="selectedIds.length > 0"
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.38)] border border-blue-400/25 px-4 py-2.5 flex flex-wrap items-center gap-3 transition-[left] duration-200 font-display"
      :class="isSidebarCollapsed ? 'lg:left-[calc(50%+2.5rem)]' : 'lg:left-[calc(50%+8rem)]'"
    >
      <span class="text-xs font-bold tabular-nums">
        {{ selectedIds.length }} Artikel Dipilih
      </span>

      <div class="flex items-center gap-2">
        <button
          v-if="activeStatus !== VerificationStatusEnum.VERIFIED"
          type="button"
          :disabled="batchLoading"
          class="btn-primary-gradient min-h-8 px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          @click="() => { void runBatchAction('VERIFY'); }"
        >
          <UIcon name="i-lucide-check" class="w-3.5 h-3.5" />
          <span>Verifikasi</span>
        </button>

        <button
          v-if="activeStatus !== VerificationStatusEnum.IGNORED"
          type="button"
          :disabled="batchLoading"
          class="min-h-8 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
          @click="() => { void runBatchAction('IGNORE'); }"
        >
          Abaikan
        </button>

        <button
          type="button"
          :disabled="batchLoading"
          class="min-h-8 px-2.5 py-1.5 rounded-xl text-slate-200 hover:text-white text-xs transition-colors cursor-pointer"
          @click="() => { clearSelection(); }"
        >
          Batal
        </button>
      </div>
    </div>

    <!-- Mobile / Tablet Slide-over Fallback (< lg) -->
    <AdminReviewSlideover
      v-model:open="drawerOpen"
      v-model:auto-advance-next="autoAdvanceNext"
      :article="inspectedArticle"
      :highlight-incomplete="highlightIncomplete"
      :show-auto-next-toggle="activeStatus === VerificationStatusEnum.PENDING"
      @saved="handleSlideoverSaved"
    />

    <!-- Full Snippet Reader Modal with Economic Fact Highlighting -->
    <UModal
      v-model:open="fullSnippetModalOpen"
      :title="inspectedArticle?.title || 'Teks Sumber Lengkap'"
      :description="inspectedArticle ? `${inspectedArticle.sourcePortal} • ${formatDateTimeWita(inspectedArticle.publishedAt)}` : ''"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300 inline-block" />
              Lokus Tana Tidung / Kaltara
            </span>
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 inline-block" />
              Angka, Persentase &amp; Nominal
            </span>
          </div>
          <div class="max-h-[60vh] overflow-y-auto saas-scroll rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
            <template v-for="(seg, idx) in highlightedSnippetSegments" :key="idx">
              <mark
                v-if="seg.kind === 'location'"
                class="bg-blue-100/90 text-blue-900 px-1 rounded font-semibold"
              >{{ seg.text }}</mark>
              <mark
                v-else-if="seg.kind === 'metric'"
                class="bg-amber-100/90 text-amber-900 px-1 rounded font-mono font-semibold"
              >{{ seg.text }}</mark>
              <template v-else>{{ seg.text }}</template>
            </template>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
