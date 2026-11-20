<!-- app/components/admin/ReviewSlideover.vue -->
<script setup lang="ts">
import {
  type ExpenditureComponentEnum,
  type ExpenditureImpactEnum,
  type KbliCategoryEnum,
  type KbliImpactEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import { formatDateTimeWita, getCurrentQuarterYearWita, type PdrbQuarter } from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';
import { parseEconomicSnippetSegments } from '~/utils/snippetHighlight';
import type { CurationFormData } from '~/components/admin/ArticleCurationForm.vue';

const fullSnippetModalOpen = ref(false);
const highlightedSnippetSegments = computed(() =>
  parseEconomicSnippetSegments(props.article?.snippetText || ''),
);

const props = withDefaults(
  defineProps<{
    open: boolean;
    article: AdminArticleItem | null;
    highlightIncomplete?: boolean;
    showAutoNextToggle?: boolean;
    autoAdvanceNext?: boolean;
  }>(),
  {
    highlightIncomplete: false,
    showAutoNextToggle: false,
    autoAdvanceNext: false,
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:autoAdvanceNext': [value: boolean];
  saved: [payload: { article: AdminArticleItem; action: 'VERIFIED' | 'IGNORED' | 'DRAFT' }];
}>();

const toast = useToast();

const drawerOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const defaultPeriod = getCurrentQuarterYearWita();

const form = reactive<CurationFormData>({
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
  subdistrict: '',
  curatorNotes: '',
  quarter: defaultPeriod.quarter as PdrbQuarter,
  year: defaultPeriod.year,
  isEconomicPhenomenon: true,
});

const submittingAction = ref<'VERIFIED' | 'IGNORED' | 'DRAFT' | null>(null);
const validationAlert = ref<string | null>(null);
const initialSummarySnapshot = ref<string>('');

watch(
  () => props.article,
  (nextArticle: AdminArticleItem | null) => {
    validationAlert.value = null;
    if (!nextArticle) {
      initialSummarySnapshot.value = '';
      return;
    }
    const rawSummary = nextArticle.summary ?? '';
    initialSummarySnapshot.value = rawSummary;
    form.title = nextArticle.title;
    form.summary = rawSummary;
    form.kbliCategory = nextArticle.kbliCategory ?? '';
    form.kbliImpact = nextArticle.kbliImpact ?? '';
    form.expenditureComponent = nextArticle.expenditureComponent ?? '';
    form.expenditureImpact = nextArticle.expenditureImpact ?? '';
    form.secondaryKbliCategory = nextArticle.secondaryKbliCategory ?? '';
    form.secondaryKbliImpact = nextArticle.secondaryKbliImpact ?? '';
    form.secondaryExpenditureComponent = nextArticle.secondaryExpenditureComponent ?? '';
    form.secondaryExpenditureImpact = nextArticle.secondaryExpenditureImpact ?? '';
    form.subdistrict = nextArticle.subdistrict ?? '';
    form.curatorNotes = nextArticle.curatorNotes ?? '';
    form.quarter = nextArticle.quarter as PdrbQuarter;
    form.year = nextArticle.year;
    form.isEconomicPhenomenon = nextArticle.isEconomicPhenomenon ?? true;
  },
  { immediate: true },
);

const canRestoreInitialSummary = computed(
  () =>
    initialSummarySnapshot.value.trim().length > 0 &&
    form.summary !== initialSummarySnapshot.value,
);

function restoreInitialSummary() {
  if (!initialSummarySnapshot.value) return;
  form.summary = initialSummarySnapshot.value;
}

const missingForVerify = computed(() => {
  const missing: string[] = [];
  if (form.summary.trim().length < 10) missing.push('Ringkasan (min. 10 karakter)');
  if (!form.kbliCategory) missing.push('Kategori KBLI');
  if (!form.kbliImpact) missing.push('Dampak KBLI');
  if (!form.expenditureComponent) missing.push('Komponen Pengeluaran');
  if (!form.expenditureImpact) missing.push('Dampak Pengeluaran');
  return missing;
});

async function submitUpdate(action: 'VERIFIED' | 'IGNORED' | 'DRAFT') {
  if (!props.article || submittingAction.value) return;
  validationAlert.value = null;

  if (form.title.trim().length < 5) {
    validationAlert.value = 'Judul berita minimal 5 karakter.';
    return;
  }

  if (action === 'VERIFIED' && missingForVerify.value.length > 0) {
    validationAlert.value = `Field wajib belum lengkap untuk Verifikasi: ${missingForVerify.value.join(', ')}.`;
    return;
  }

  const trimmedSummary = form.summary.trim();
  if (trimmedSummary.length > 0 && trimmedSummary.length < 10) {
    validationAlert.value = 'Jika diisi, ringkasan minimal 10 karakter (atau kosongkan).';
    return;
  }

  submittingAction.value = action;
  try {
    const nextStatus =
      action === 'VERIFIED'
        ? VerificationStatusEnum.VERIFIED
        : action === 'IGNORED'
          ? VerificationStatusEnum.IGNORED
          : undefined;

    const payload = {
      title: form.title.trim(),
      summary: trimmedSummary.length >= 10 ? trimmedSummary : null,
      isEconomicPhenomenon: action === 'VERIFIED' ? true : form.isEconomicPhenomenon,
      kbliCategory: form.kbliCategory || null,
      kbliImpact: form.kbliImpact || null,
      expenditureComponent: form.expenditureComponent || null,
      expenditureImpact: form.expenditureImpact || null,
      secondaryKbliCategory: form.secondaryKbliCategory || null,
      secondaryKbliImpact: form.secondaryKbliImpact || null,
      secondaryExpenditureComponent: form.secondaryExpenditureComponent || null,
      secondaryExpenditureImpact: form.secondaryExpenditureImpact || null,
      subdistrict: form.subdistrict || null,
      curatorNotes: form.curatorNotes.trim() || null,
      quarter: form.quarter,
      year: Number(form.year),
      ...(nextStatus ? { verificationStatus: nextStatus } : {}),
    };

    const res = await $fetch<{ item: AdminArticleItem }>(`/api/admin/articles/${props.article.id}`, {
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
    });

    emit('saved', { article: res.item, action });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    validationAlert.value = fetchErr.data?.message || 'Gagal menyimpan perubahan artikel.';
  } finally {
    submittingAction.value = null;
  }
}
</script>

<template>
  <USlideover
    v-model:open="drawerOpen"
    side="right"
    title="Edit & Verifikasi Fenomena Ekonomi"
    :description="
      article
        ? `${article.sourcePortal} • Rilis: ${formatDateTimeWita(article.publishedAt)}`
        : 'Detail artikel fenomena ekonomi'
    "
    :ui="{ content: 'w-full max-w-2xl' }"
  >
    <template #body>
      <div v-if="article" class="p-6 space-y-6">
        <ArticleCurationForm
          :article="article"
          v-model="form"
          mode="slideover"
          :submitting-action="submittingAction"
          :validation-alert="validationAlert"
          :highlight-incomplete="highlightIncomplete"
          :show-auto-next-toggle="showAutoNextToggle"
          :auto-advance-next="autoAdvanceNext"
          :can-restore-ai-summary="canRestoreInitialSummary"
          @update:auto-advance-next="emit('update:autoAdvanceNext', $event)"
          @restore-ai-summary="restoreInitialSummary"
          @submit="submitUpdate"
          @open-full-snippet="fullSnippetModalOpen = true"
        />
      </div>
    </template>
  </USlideover>

  <UModal
    v-model:open="fullSnippetModalOpen"
    :title="article?.title || 'Teks Sumber Lengkap'"
    :description="article ? `${article.sourcePortal} • ${formatDateTimeWita(article.publishedAt)}` : ''"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="max-h-[60vh] overflow-y-auto saas-scroll rounded-xl bg-canvas border border-border-hairline p-4 text-sm text-ink-primary leading-relaxed whitespace-pre-line">
        <template v-for="(seg, idx) in highlightedSnippetSegments" :key="idx">
          <mark
            v-if="seg.kind === 'location'"
            class="bg-brand-tint text-brand-primary px-1 rounded font-semibold"
          >{{ seg.text }}</mark>
          <mark
            v-else-if="seg.kind === 'metric'"
            class="bg-[#FEF3C7] text-ochre-ink px-1 rounded font-mono font-semibold"
          >{{ seg.text }}</mark>
          <template v-else>{{ seg.text }}</template>
        </template>
      </div>
    </template>
  </UModal>
</template>
