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
  quarter: currentPeriod.quarter,
  year: currentPeriod.year,
  verifyImmediately: true,
});

const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const ignoreNextDateQuarterSync = ref(false);

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
        <UFormField label="Judul Berita / Fenomena" name="title" required>
          <UInput
            v-model="formState.title"
            placeholder="Mis. Realisasi Proyek Infrastruktur Jalan Tideng Pale Triwulan IV"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="URL Sumber atau Referensi Surat/Dokumen" name="url" required>
            <UInput
              v-model="formState.url"
              placeholder="https://... atau Surat BPS No. 123/2026"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Nama Sumber / Portal" name="sourcePortal" required>
            <UInput v-model="formState.sourcePortal" placeholder="Input Manual" class="w-full" />
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
