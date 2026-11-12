<!-- app/components/admin/ReviewSlideover.vue -->
<script setup lang="ts">
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import { formatDateTimeWita, getCurrentQuarterYearWita, type PdrbQuarter } from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';

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
const {
  kbliOptions,
  kbliImpactOptions,
  expenditureOptions,
  expenditureImpactOptions,
  quarterOptions,
  getLlmStatusBadge,
  getVerificationStatusBadge,
  getSourceTypeLabel,
  isSafeHttpUrl,
} = usePdrbLabels();

const drawerOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const autoNextModel = computed({
  get: () => props.autoAdvanceNext,
  set: (v: boolean) => emit('update:autoAdvanceNext', v),
});

const defaultPeriod = getCurrentQuarterYearWita();

const form = reactive({
  title: '',
  summary: '',
  kbliCategory: '' as KbliCategoryEnum | '',
  kbliImpact: '' as KbliImpactEnum | '',
  expenditureComponent: '' as ExpenditureComponentEnum | '',
  expenditureImpact: '' as ExpenditureImpactEnum | '',
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

const kbliModel = computed<string | undefined>({
  get: () => (form.kbliCategory === '' ? undefined : form.kbliCategory),
  set: (v: string | undefined) => {
    form.kbliCategory = (v as KbliCategoryEnum | undefined) ?? '';
  },
});

const kbliImpactModel = computed<string | undefined>({
  get: () => (form.kbliImpact === '' ? undefined : form.kbliImpact),
  set: (v: string | undefined) => {
    form.kbliImpact = (v as KbliImpactEnum | undefined) ?? '';
  },
});

const expenditureModel = computed<string | undefined>({
  get: () => (form.expenditureComponent === '' ? undefined : form.expenditureComponent),
  set: (v: string | undefined) => {
    form.expenditureComponent = (v as ExpenditureComponentEnum | undefined) ?? '';
  },
});

const expenditureImpactModel = computed<string | undefined>({
  get: () => (form.expenditureImpact === '' ? undefined : form.expenditureImpact),
  set: (v: string | undefined) => {
    form.expenditureImpact = (v as ExpenditureImpactEnum | undefined) ?? '';
  },
});

const snippetWordCount = computed(() => {
  const txt = props.article?.snippetText?.trim();
  if (!txt) return 0;
  return txt.split(/\s+/).filter(Boolean).length;
});

const llmBadge = computed(() => getLlmStatusBadge(props.article?.llmStatus));
const statusBadge = computed(() => getVerificationStatusBadge(props.article?.verificationStatus));
const hasHttpUrl = computed(() => isSafeHttpUrl(props.article?.url));

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
      <div v-if="article" class="space-y-4">
        <!-- Metadata Bar & Aksi Tautan -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div class="flex flex-wrap items-center gap-1.5">
            <UBadge :color="statusBadge.color" variant="subtle" size="xs" :icon="statusBadge.icon">
              {{ statusBadge.label }}
            </UBadge>
            <UBadge :color="llmBadge.color" variant="subtle" size="xs" :icon="llmBadge.icon">
              {{ llmBadge.label }}
            </UBadge>
            <UBadge
              v-if="article.llmConfidence !== null"
              color="neutral"
              variant="outline"
              size="xs"
              class="tabular-nums"
            >
              AI Conf: {{ Math.round(article.llmConfidence * 100) }}%
            </UBadge>
            <UBadge color="neutral" variant="outline" size="xs">
              {{ getSourceTypeLabel(article.sourceType) }}
            </UBadge>
          </div>

          <UButton
            v-if="hasHttpUrl"
            :to="article.url"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="outline"
            size="xs"
            trailing-icon="i-lucide-external-link"
          >
            Buka URL
          </UButton>
        </div>

        <!-- Toggle Otomatis Lanjut Pending Berikutnya -->
        <div
          v-if="showAutoNextToggle"
          class="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2"
        >
          <span class="text-xs text-slate-700">
            Otomatis buka antrean <strong>Pending</strong> berikutnya setelah simpan
          </span>
          <USwitch v-model="autoNextModel" size="sm" />
        </div>

        <!-- Peringatan Error LLM atau Validasi -->
        <UAlert
          v-if="article.llmStatus === LlmStatusEnum.FAILED"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Klasifikasi AI tertunda/gagal"
          :description="
            article.llmError ||
            'Silakan lengkapi ringkasan dan pemetaan PDRB secara manual dari cuplikan berita di bawah.'
          "
        />

        <UAlert
          v-if="validationAlert"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-alert"
          :title="validationAlert"
        />

        <!-- Judul Berita -->
        <UFormField label="Judul Berita" required>
          <UInput v-model="form.title" class="w-full" />
        </UFormField>

        <!-- Cuplikan Teks Asli (Word Threshold Buffer) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-600">
              Cuplikan Teks Asli (Verifikasi Konten)
            </label>
            <span class="text-xs font-semibold tabular-nums text-slate-500">
              {{ snippetWordCount }} kata
            </span>
          </div>
          <div
            class="max-h-48 overflow-y-auto saas-scroll rounded-xl bg-slate-50 border border-slate-200/90 p-3 text-sm leading-relaxed text-slate-800 whitespace-pre-line"
          >
            {{ article.snippetText }}
          </div>
        </div>

        <!-- Ringkasan Berita -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <label class="text-xs font-semibold text-slate-700">
              Ringkasan Berita (2–3 Kalimat untuk Publik &amp; Excel) <span class="text-rose-600">*</span>
            </label>
            <button
              v-if="canRestoreInitialSummary"
              type="button"
              class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
              @click="() => { restoreInitialSummary(); }"
            >
              <UIcon name="i-lucide-rotate-ccw" class="w-3 h-3" />
              <span>Kembalikan Teks AI</span>
            </button>
          </div>
          <UFormField
            :error="
              highlightIncomplete && form.summary.trim().length < 10
                ? 'Wajib diisi minimal 10 karakter sebelum verifikasi'
                : undefined
            "
          >
            <UTextarea
              v-model="form.summary"
              :rows="3"
              placeholder="Tuliskan ringkasan 2–3 kalimat padat mengenai fenomena ekonomi daerah..."
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Grid Klasifikasi Dua Sisi PDRB -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <!-- Sisi Lapangan Usaha -->
          <div class="rounded-xl border border-indigo-200/70 bg-indigo-50/35 p-3.5 space-y-3">
            <div class="text-xs font-bold text-indigo-900">
              1. Sisi Lapangan Usaha (KBLI)
            </div>

            <UFormField
              label="Kategori KBLI (A–V)"
              required
              :error="highlightIncomplete && !form.kbliCategory ? 'Wajib dipilih' : undefined"
            >
              <USelectMenu
                v-model="kbliModel"
                :items="kbliOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih kategori KBLI..."
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Dampak Lapangan Usaha"
              required
              :error="highlightIncomplete && !form.kbliImpact ? 'Wajib dipilih' : undefined"
            >
              <USelect
                v-model="kbliImpactModel"
                :items="kbliImpactOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih arah dampak KBLI..."
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Sisi Pengeluaran -->
          <div class="rounded-xl border border-emerald-200/70 bg-emerald-50/35 p-3.5 space-y-3">
            <div class="text-xs font-bold text-emerald-900">
              2. Sisi Pengeluaran PDRB
            </div>

            <UFormField
              label="Komponen Pengeluaran"
              required
              :error="highlightIncomplete && !form.expenditureComponent ? 'Wajib dipilih' : undefined"
            >
              <USelect
                v-model="expenditureModel"
                :items="expenditureOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih komponen pengeluaran..."
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Dampak Pengeluaran"
              required
              :error="highlightIncomplete && !form.expenditureImpact ? 'Wajib dipilih' : undefined"
            >
              <USelect
                v-model="expenditureImpactModel"
                :items="expenditureImpactOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih arah dampak pengeluaran..."
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Periode & Status Fenomena Ekonomi -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
          <UFormField label="Triwulan PDRB">
            <USelect
              v-model="form.quarter"
              :items="quarterOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Tahun">
            <UInput v-model.number="form.year" type="number" :min="2000" :max="2100" class="w-full" />
          </UFormField>

          <div
            class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-white"
          >
            <span class="text-xs font-semibold text-slate-700">Fenomena Ekonomi Sah</span>
            <USwitch v-model="form.isEconomicPhenomenon" size="sm" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="w-full flex flex-wrap items-center justify-between gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-archive-x"
          :loading="submittingAction === 'IGNORED'"
          :disabled="submittingAction !== null"
          @click="() => { void submitUpdate('IGNORED'); }"
        >
          Abaikan
        </UButton>

        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-save"
            :loading="submittingAction === 'DRAFT'"
            :disabled="submittingAction !== null"
            @click="() => { void submitUpdate('DRAFT'); }"
          >
            Simpan Draft
          </UButton>

          <UButton
            color="primary"
            variant="solid"
            icon="i-solar-check-circle-bold-duotone"
            :loading="submittingAction === 'VERIFIED'"
            :disabled="submittingAction !== null"
            @click="() => { void submitUpdate('VERIFIED'); }"
          >
            Simpan &amp; Verifikasi
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
