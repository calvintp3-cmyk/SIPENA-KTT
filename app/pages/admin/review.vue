<!-- app/pages/admin/review.vue -->
<script setup lang="ts">
import { VerificationStatusEnum } from '#shared/enums/pdrb';
import { formatDateTimeWita } from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';
import ReviewHeaderToolbar from '~/components/admin/review/ReviewHeaderToolbar.vue';
import ReviewQueueCard from '~/components/admin/review/ReviewQueueCard.vue';
import ReviewInspectorPanel from '~/components/admin/review/ReviewInspectorPanel.vue';
import ReviewBatchBar from '~/components/admin/review/ReviewBatchBar.vue';
import HighlightedSnippetBox from '~/components/admin/HighlightedSnippetBox.vue';
import AdminReviewSlideover from '~/components/admin/ReviewSlideover.vue';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { shortPeriodLabel } = useAdminPeriod();
const isSidebarCollapsed = useState<boolean>('sipena:admin-sidebar-collapsed', () => false);

const {
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
} = useReviewQueue();

// Dirty Guard (UX-011)
onBeforeRouteLeave((to: unknown, from: unknown, next: (vm?: unknown) => void) => {
  if (isInspectorDirty.value) {
    const ok = window.confirm(
      'Anda memiliki perubahan kurasi yang belum disimpan. Yakin ingin meninggalkan halaman?',
    );
    if (!ok) {
      next(false);
      return;
    }
  }
  next();
});

const fullSnippetModalOpen = ref(false);

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
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (inspectedArticle.value) {
      void submitInspectorAction('VERIFIED');
    }
    return;
  }

  if (isEditableTarget(e.target)) return;

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
    <!-- Page Header & Filter Bar -->
    <ReviewHeaderToolbar
      v-model:period-scope="periodScope"
      v-model:only-llm-failed="onlyLlmFailed"
      v-model:active-status="activeStatus"
      v-model:search-input="searchInput"
      :short-period-label="shortPeriodLabel"
      :llm-failed-count="reviewData?.summaryCounts.llmFailedCount ?? 0"
      :status-tabs="statusTabs"
    />

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

    <!-- WORKBENCH HEADER ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
      <div class="lg:col-span-7 flex items-center justify-between px-1 text-xs text-ink-secondary">
        <UCheckbox
          :model-value="allVisibleChecked"
          :label="`Pilih semua di halaman (${currentRows.length})`"
          aria-label="Pilih semua artikel pada halaman ini"
          size="sm"
          @update:model-value="toggleSelectAllVisible"
        />

        <span v-if="reviewData" class="text-xs font-medium text-ink-secondary font-mono tabular-nums">
          Hal {{ reviewData.pagination.page }}/{{ reviewData.pagination.totalPages }} •
          {{ reviewData.pagination.total }} artikel
        </span>
      </div>

      <div class="hidden lg:flex lg:col-span-5 items-center justify-between px-1 text-xs text-ink-muted">
        <span class="font-semibold text-ink-primary font-display">Panel Inspeksi &amp; Hasil LLM</span>
        <span class="font-mono text-[11px] text-ink-muted">
          {{ inspectedArticle ? `↑↓ Navigasi • Ctrl+Enter Verifikasi` : 'Siap mengurasi' }}
        </span>
      </div>
    </div>

    <!-- ASYMMETRIC 7/5 WORKBENCH WITH UNIFIED FIXED VIEWPORT HEIGHT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch lg:h-[calc(100vh-225px)] lg:min-h-[540px]">
      <!-- LEFT 7: QUEUE CARDS -->
      <div class="lg:col-span-7 h-full flex flex-col min-h-0">
        <!-- Skeletons -->
        <div v-if="pending && !reviewData" class="flex-1 min-h-0 overflow-y-auto saas-scroll space-y-3 pr-1.5">
          <div v-for="i in 4" :key="i" class="obs-panel rounded-xl p-4 space-y-2.5">
            <div class="h-3 w-40 rounded bg-surface-subtle" />
            <div class="h-5 w-4/5 rounded bg-surface-subtle" />
            <div class="h-10 w-full rounded bg-surface-subtle" />
          </div>
        </div>

        <!-- Empty Queue State -->
        <div v-else-if="!currentRows.length" class="obs-panel rounded-xl py-12 px-6 text-center space-y-3.5 flex-1 flex flex-col items-center justify-center">
          <div class="w-12 h-12 rounded-xl bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto">
            <UIcon name="i-solar-inbox-in-bold-duotone" class="w-6 h-6" />
          </div>
          <div class="space-y-1">
            <div class="text-sm font-bold text-ink-primary font-display">
              Tidak ada artikel pada tab {{ activeStatus }}
            </div>
            <p class="text-xs text-ink-secondary text-pretty max-w-sm mx-auto">
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
              @click="activeStatus = VerificationStatusEnum.VERIFIED"
            >
              Lihat {{ reviewData?.summaryCounts.verifiedCount }} Terverifikasi
            </UButton>
            <UButton
              v-if="periodScope === 'period'"
              size="xs"
              color="neutral"
              variant="outline"
              @click="periodScope = 'all'"
            >
              Tampilkan Semua Periode
            </UButton>
            <UButton
              v-if="searchInput.trim()"
              size="xs"
              color="neutral"
              variant="outline"
              @click="searchInput = ''"
            >
              Bersihkan Pencarian
            </UButton>
          </div>
        </div>

        <!-- Queue Card List (Scrollable) -->
        <div v-else class="flex-1 min-h-0 overflow-y-auto saas-scroll pr-1.5 space-y-3">
          <ReviewQueueCard
            v-for="art in currentRows"
            :key="art.id"
            :article="art"
            :is-selected="Boolean(selectedMap[art.id])"
            :is-inspected="inspectedArticle?.id === art.id"
            :is-busy="rowBusyId === art.id"
            :active-status="activeStatus"
            @select="selectArticleForInspection(art)"
            @toggle-select="toggleRowSelection(art.id)"
            @verify="quickApprove(art)"
            @ignore="quickIgnore(art)"
            @open-mobile="openMobileSlideover(art)"
          />
        </div>

        <!-- Pinned Pagination at bottom of Queue Column -->
        <div
          v-if="reviewData && reviewData.pagination.total > PAGE_LIMIT"
          class="pt-2 border-t border-border-hairline flex items-center justify-between shrink-0 mt-2 text-xs text-ink-secondary font-mono"
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

      <!-- RIGHT 5: DESKTOP INSPECTOR -->
      <ReviewInspectorPanel
        :model-value="inspectorForm"
        :article="inspectedArticle"
        :inspector-submitting="inspectorSubmitting"
        :reclassifying-llm="reclassifyingLlm"
        :inspector-alert="inspectorAlert"
        :highlight-incomplete="highlightIncomplete"
        :active-status="activeStatus"
        :auto-advance-next="autoAdvanceNext"
        :can-restore-ai-summary="canRestoreAiSummary"
        @update:model-value="Object.assign(inspectorForm, $event)"
        @update:auto-advance-next="autoAdvanceNext = $event"
        @restore-ai-summary="restoreAiSummary"
        @reclassify-llm="reclassifyInspectedArticle"
        @submit="submitInspectorAction"
        @open-full-snippet="fullSnippetModalOpen = true"
      />
    </div>

    <!-- Floating Batch Action Bar -->
    <ReviewBatchBar
      v-if="selectedIds.length > 0"
      :selected-count="selectedIds.length"
      :active-status="activeStatus"
      :is-sidebar-collapsed="isSidebarCollapsed"
      :loading="batchLoading"
      @verify="runBatchAction('VERIFY')"
      @ignore="runBatchAction('IGNORE')"
      @clear="clearSelection"
    />

    <!-- Mobile / Tablet Slide-over Fallback (< lg) -->
    <AdminReviewSlideover
      v-model:open="drawerOpen"
      v-model:auto-advance-next="autoAdvanceNext"
      :article="inspectedArticle"
      :highlight-incomplete="highlightIncomplete"
      :show-auto-next-toggle="activeStatus === VerificationStatusEnum.PENDING"
      @saved="handleSlideoverSaved"
    />

    <!-- Full Snippet Reader Modal -->
    <UModal
      v-model:open="fullSnippetModalOpen"
      :title="inspectedArticle?.title || 'Teks Sumber Lengkap'"
      :description="inspectedArticle ? `${inspectedArticle.sourcePortal} • ${formatDateTimeWita(inspectedArticle.publishedAt)}` : ''"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded bg-brand-tint border border-brand-border inline-block" />
              Lokus Tana Tidung / Kaltara
            </span>
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded bg-[#FEF3C7] border border-ochre/30 inline-block" />
              Angka, Persentase &amp; Nominal
            </span>
          </div>
          <HighlightedSnippetBox
            :text="inspectedArticle?.snippetText || ''"
            max-height-class="max-h-[60vh] overflow-y-auto"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
