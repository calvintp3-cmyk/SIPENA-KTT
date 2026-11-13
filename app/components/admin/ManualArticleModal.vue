<!-- app/components/admin/ManualArticleModal.vue -->
<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '#shared/enums/pdrb';
import {
  CreateManualArticleSchema,
  type CreateManualArticleInput,
} from '#shared/schemas/article.schema';
import {
  getCurrentQuarterYearWita,
  getQuarterFromDateWita,
  getWitaDateParts,
  type PdrbQuarter,
} from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';

const props = withDefaults(
  defineProps<{
    open: boolean;
    defaultKbli?: KbliCategoryEnum | null;
    defaultYear?: number | null;
    defaultQuarter?: PdrbQuarter | null;
  }>(),
  {
    defaultKbli: null,
    defaultYear: null,
    defaultQuarter: null,
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  created: [article: AdminArticleItem];
}>();

const toast = useToast();
const {
  kbliOptions,
  kbliImpactOptions,
  expenditureOptions,
  expenditureImpactOptions,
  quarterOptions,
} = usePdrbLabels();

const secondaryKbliOptions = computed(() => [
  { value: null, label: '— Tidak Ada (Hanya Sektor Utama) —' },
  ...kbliOptions,
]);
const secondaryExpenditureOptions = computed(() => [
  { value: null, label: '— Tidak Ada (Hanya Komponen Utama) —' },
  ...expenditureOptions,
]);
const secondaryKbliImpactOptions = computed(() => [
  { value: null, label: '— Tanpa Dampak Sekunder —' },
  ...kbliImpactOptions,
]);
const secondaryExpImpactOptions = computed(() => [
  { value: null, label: '— Tanpa Dampak Sekunder —' },
  ...expenditureImpactOptions,
]);

const modalOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

function getTodayWitaDateInput(): string {
  const { year, month, day } = getWitaDateParts(new Date());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const currentPeriod = getCurrentQuarterYearWita();

const formState = reactive<CreateManualArticleInput>({
  title: '',
  url: '',
  sourcePortal: 'Input Manual',
  publishedAt: getTodayWitaDateInput(),
  snippetText: '',
  summary: '',
  kbliCategory: KbliCategoryEnum.A,
  kbliImpact: KbliImpactEnum.INCREASE_NTB,
  expenditureComponent: ExpenditureComponentEnum.PK_RT,
  expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
  secondaryKbliCategory: null,
  secondaryKbliImpact: null,
  secondaryExpenditureComponent: null,
  secondaryExpenditureImpact: null,
  quarter: currentPeriod.quarter,
  year: currentPeriod.year,
  verifyImmediately: true,
});

const isSubmitting = ref(false);
const isExtractingUrl = ref(false);
const submitError = ref<string | null>(null);
const ignoreNextDateQuarterSync = ref(false);

async function handleExtractFromUrl() {
  const url = formState.url.trim();
  if (!url || !url.startsWith('http')) {
    toast.add({
      title: 'URL Belum Lengkap',
      description: 'Masukkan URL berita berawalan http:// atau https:// terlebih dahulu.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
    return;
  }

  isExtractingUrl.value = true;
  submitError.value = null;

  try {
    const res = await $fetch<{
      url: string;
      sourcePortal: string;
      title: string;
      snippetText: string;
      publishedAt: string;
      year: number;
      quarter: 1 | 2 | 3 | 4;
      summary: string;
      kbliCategory: KbliCategoryEnum;
      kbliImpact: KbliImpactEnum;
      expenditureComponent: ExpenditureComponentEnum;
      expenditureImpact: ExpenditureImpactEnum;
      secondaryKbliCategory?: KbliCategoryEnum | null;
      secondaryKbliImpact?: KbliImpactEnum | null;
      secondaryExpenditureComponent?: ExpenditureComponentEnum | null;
      secondaryExpenditureImpact?: ExpenditureImpactEnum | null;
    }>('/api/admin/articles/extract-url', {
      method: 'POST',
      body: { url },
      credentials: 'include',
    });

    formState.title = res.title;
    formState.sourcePortal = res.sourcePortal;
    formState.publishedAt = res.publishedAt;
    formState.year = res.year;
    formState.quarter = res.quarter;
    formState.snippetText = res.snippetText;
    formState.summary = res.summary;
    formState.kbliCategory = res.kbliCategory;
    formState.kbliImpact = res.kbliImpact;
    formState.expenditureComponent = res.expenditureComponent;
    formState.expenditureImpact = res.expenditureImpact;
    formState.secondaryKbliCategory = res.secondaryKbliCategory ?? null;
    formState.secondaryKbliImpact = res.secondaryKbliImpact ?? null;
    formState.secondaryExpenditureComponent = res.secondaryExpenditureComponent ?? null;
    formState.secondaryExpenditureImpact = res.secondaryExpenditureImpact ?? null;

    toast.add({
      title: 'Berhasil Ekstrak Konten & Analisis AI',
      description: `Judul terisi: ${res.title.slice(0, 48)}...`,
      color: 'success',
      icon: 'i-lucide-sparkles',
    });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    submitError.value = fetchErr.data?.message || 'Gagal mengekstrak berita dari URL tersebut.';
  } finally {
    isExtractingUrl.value = false;
  }
}

function resetForm() {
  const period = getCurrentQuarterYearWita();
  const todayStr = getTodayWitaDateInput();
  if (formState.publishedAt !== todayStr && (props.defaultQuarter || props.defaultYear)) {
    ignoreNextDateQuarterSync.value = true;
  }
  formState.title = '';
  formState.url = '';
  formState.sourcePortal = 'Input Manual';
  formState.publishedAt = todayStr;
  formState.snippetText = '';
  formState.summary = '';
  formState.kbliCategory = props.defaultKbli ?? KbliCategoryEnum.A;
  formState.kbliImpact = KbliImpactEnum.INCREASE_NTB;
  formState.expenditureComponent = ExpenditureComponentEnum.PK_RT;
  formState.expenditureImpact = ExpenditureImpactEnum.INCREASE_REAL;
  formState.secondaryKbliCategory = null;
  formState.secondaryKbliImpact = null;
  formState.secondaryExpenditureComponent = null;
  formState.secondaryExpenditureImpact = null;
  formState.quarter = props.defaultQuarter ?? period.quarter;
  formState.year = props.defaultYear ?? period.year;
  formState.verifyImmediately = true;
  submitError.value = null;
}

watch(
  () => formState.publishedAt,
  (nextDate: string) => {
    if (ignoreNextDateQuarterSync.value) {
      ignoreNextDateQuarterSync.value = false;
      return;
    }
    if (!nextDate) return;
    try {
      const derived = getQuarterFromDateWita(nextDate);
      formState.quarter = derived.quarter;
      formState.year = derived.year;
    } catch {
      // Abaikan tanggal belum lengkap saat mengetik
    }
  },
);

watch(
  () => props.open,
  (isOpen: boolean) => {
    if (isOpen) {
      resetForm();
    }
  },
);

async function handleSubmit(event: FormSubmitEvent<CreateManualArticleInput>) {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  submitError.value = null;

  try {
    const res = await $fetch<{ item: AdminArticleItem }>('/api/admin/articles', {
      method: 'POST',
      body: event.data,
      credentials: 'include',
    });

    toast.add({
      title: 'Berita Manual Tersimpan',
      description: res.item.title,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });

    emit('created', res.item);
    modalOpen.value = false;
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; statusCode?: number };
    submitError.value = fetchErr.data?.message || 'Gagal menyimpan fenomena manual.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Tambah Fenomena Ekonomi Manual"
    description="Catat berita daerah, siaran pers Pemkab/BPS, atau catatan fenomena lapangan non-crawler."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <UAlert
        v-if="submitError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="submitError"
        class="mb-4"
      />

      <UForm
        :schema="CreateManualArticleSchema"
        :state="formState"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-700">URL Sumber Berita atau Referensi Surat</span>
            <button
              v-if="formState.url.startsWith('http')"
              type="button"
              :disabled="isExtractingUrl"
              class="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              @click="handleExtractFromUrl"
            >
              <UIcon :name="isExtractingUrl ? 'i-lucide-loader-circle' : 'i-lucide-sparkles'" class="w-3.5 h-3.5" :class="isExtractingUrl ? 'animate-spin' : 'text-indigo-600'" />
              <span>{{ isExtractingUrl ? 'Mengekstrak...' : 'Tarik & Analisis AI Otomatis' }}</span>
            </button>
          </div>
          <div class="flex gap-2">
            <UInput
              v-model="formState.url"
              placeholder="https://... atau Surat Keputusan No. 123/2026"
              class="flex-1"
            />
            <button
              type="button"
              :disabled="!formState.url.startsWith('http') || isExtractingUrl"
              class="min-h-9 px-3 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-800 inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              @click="handleExtractFromUrl"
            >
              <UIcon :name="isExtractingUrl ? 'i-lucide-loader-circle' : 'i-solar-magic-stick-3-bold-duotone'" class="w-4 h-4" :class="isExtractingUrl ? 'animate-spin' : ''" />
              <span>{{ isExtractingUrl ? 'Ekstrak...' : 'Tarik AI' }}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="Judul Berita / Fenomena" name="title" required class="sm:col-span-2">
            <UInput
              v-model="formState.title"
              placeholder="Mis. Realisasi Proyek Infrastruktur Jalan Tideng Pale Triwulan IV"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Nama Sumber / Portal" name="sourcePortal" required class="sm:col-span-2">
            <UInput v-model="formState.sourcePortal" placeholder="Input Manual atau nama portal" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UFormField label="Tanggal Rilis (WITA)" name="publishedAt" required>
            <UInput v-model="formState.publishedAt" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Triwulan" name="quarter">
            <USelect
              :model-value="formState.quarter"
              :items="quarterOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              @update:model-value="(val: unknown) => { if (val === 1 || val === 2 || val === 3 || val === 4) formState.quarter = val; }"
            />
          </UFormField>

          <UFormField label="Tahun" name="year">
            <UInput v-model.number="formState.year" type="number" :min="2000" :max="2100" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Cuplikan Sumber / Uraian Kejadian" name="snippetText" required>
          <UTextarea
            v-model="formState.snippetText"
            :rows="3"
            placeholder="Salin kutipan berita atau uraian fakta lapangan..."
            class="w-full"
          />
        </UFormField>

        <UFormField label="Ringkasan Resmi (2–3 Kalimat)" name="summary" required>
          <UTextarea
            v-model="formState.summary"
            :rows="3"
            placeholder="Ringkasan padat yang akan tampil di portal publik dan kertas kerja Excel..."
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="Kategori KBLI (A–V)" name="kbliCategory" required>
            <USelectMenu
              v-model="formState.kbliCategory"
              :items="kbliOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Dampak Sisi Lapangan Usaha" name="kbliImpact" required>
            <USelect
              v-model="formState.kbliImpact"
              :items="kbliImpactOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Komponen PDRB Pengeluaran" name="expenditureComponent" required>
            <USelect
              v-model="formState.expenditureComponent"
              :items="expenditureOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Dampak Sisi Pengeluaran" name="expenditureImpact" required>
            <USelect
              v-model="formState.expenditureImpact"
              :items="expenditureImpactOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Sektor & Dampak Sekunder (Opsional / Inter-industry Linkage) -->
        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-solar-link-round-bold-duotone" class="w-4 h-4 text-indigo-600" />
            <span class="text-xs font-bold text-slate-800">Sektor Sekunder (Opsional — Keterkaitan Sektoral)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="KBLI Sekunder" name="secondaryKbliCategory">
              <USelectMenu
                v-model="formState.secondaryKbliCategory"
                :items="secondaryKbliOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Dampak KBLI Sekunder" name="secondaryKbliImpact">
              <USelect
                v-model="formState.secondaryKbliImpact"
                :items="secondaryKbliImpactOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Pengeluaran Sekunder" name="secondaryExpenditureComponent">
              <USelect
                v-model="formState.secondaryExpenditureComponent"
                :items="secondaryExpenditureOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Dampak Pengeluaran Sekunder" name="secondaryExpenditureImpact">
              <USelect
                v-model="formState.secondaryExpenditureImpact"
                :items="secondaryExpImpactOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <UCheckbox
          v-model="formState.verifyImmediately"
          label="Langsung tandai Terverifikasi (otomatis tampil di Portal Publik & siap Ekspor)"
        />

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <UButton color="neutral" variant="ghost" @click="() => { modalOpen = false; }">
            Batal
          </UButton>
          <UButton
            type="submit"
            color="primary"
            icon="i-solar-add-circle-bold-duotone"
            :loading="isSubmitting"
          >
            Simpan Fenomena Manual
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
