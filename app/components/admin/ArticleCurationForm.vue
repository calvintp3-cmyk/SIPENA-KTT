<!-- app/components/admin/ArticleCurationForm.vue -->
<script setup lang="ts">
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import { getKbliFourGenerations } from '#shared/utils/kbli-concordance';
import type { PdrbQuarter } from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';

export interface CurationFormData {
  title: string;
  summary: string;
  kbliCategory: KbliCategoryEnum | '';
  kbliImpact: KbliImpactEnum | '';
  expenditureComponent: ExpenditureComponentEnum | '';
  expenditureImpact: ExpenditureImpactEnum | '';
  secondaryKbliCategory: KbliCategoryEnum | '';
  secondaryKbliImpact: KbliImpactEnum | '';
  secondaryExpenditureComponent: ExpenditureComponentEnum | '';
  secondaryExpenditureImpact: ExpenditureImpactEnum | '';
  subdistrict: string;
  curatorNotes: string;
  quarter: PdrbQuarter;
  year: number;
  isEconomicPhenomenon: boolean;
}

const props = withDefaults(
  defineProps<{
    article: AdminArticleItem | null;
    modelValue: CurationFormData;
    submittingAction?: 'VERIFIED' | 'IGNORED' | 'DRAFT' | null;
    validationAlert?: string | null;
    highlightIncomplete?: boolean;
    showAutoNextToggle?: boolean;
    autoAdvanceNext?: boolean;
    canRestoreAiSummary?: boolean;
    mode?: 'inspector' | 'slideover';
  }>(),
  {
    submittingAction: null,
    validationAlert: null,
    highlightIncomplete: false,
    showAutoNextToggle: false,
    autoAdvanceNext: false,
    canRestoreAiSummary: false,
    mode: 'inspector',
  },
);

const emit = defineEmits<{
  'update:modelValue': [val: CurationFormData];
  'update:autoAdvanceNext': [val: boolean];
  restoreAiSummary: [];
  submit: [action: 'VERIFIED' | 'IGNORED' | 'DRAFT'];
  openFullSnippet: [];
}>();

const {
  kbliOptions,
  kbliImpactOptions,
  expenditureOptions,
  expenditureImpactOptions,
  quarterOptions,
  subdistrictOptions,
  getLlmStatusBadge,
  getSourceTypeLabel,
  isSafeHttpUrl,
} = usePdrbLabels();

const autoNextModel = computed({
  get: () => props.autoAdvanceNext,
  set: (v: boolean) => emit('update:autoAdvanceNext', v),
});

function updateField<K extends keyof CurationFormData>(key: K, value: CurationFormData[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}

const kbliModel = computed<string | undefined>({
  get: () => (props.modelValue.kbliCategory === '' ? undefined : props.modelValue.kbliCategory),
  set: (v: string | undefined) => {
    updateField('kbliCategory', (v as KbliCategoryEnum | undefined) ?? '');
  },
});

const expModel = computed<string | undefined>({
  get: () =>
    props.modelValue.expenditureComponent === ''
      ? undefined
      : props.modelValue.expenditureComponent,
  set: (v: string | undefined) => {
    updateField('expenditureComponent', (v as ExpenditureComponentEnum | undefined) ?? '');
  },
});

const secondaryKbliModel = computed<string | undefined>({
  get: () =>
    props.modelValue.secondaryKbliCategory === ''
      ? undefined
      : props.modelValue.secondaryKbliCategory,
  set: (v: string | undefined) => {
    const nextVal = (v as KbliCategoryEnum | undefined) ?? '';
    emit('update:modelValue', {
      ...props.modelValue,
      secondaryKbliCategory: nextVal,
      secondaryKbliImpact: nextVal ? props.modelValue.secondaryKbliImpact : '',
    });
  },
});

const secondaryExpModel = computed<string | undefined>({
  get: () =>
    props.modelValue.secondaryExpenditureComponent === ''
      ? undefined
      : props.modelValue.secondaryExpenditureComponent,
  set: (v: string | undefined) => {
    const nextVal = (v as ExpenditureComponentEnum | undefined) ?? '';
    emit('update:modelValue', {
      ...props.modelValue,
      secondaryExpenditureComponent: nextVal,
      secondaryExpenditureImpact: nextVal ? props.modelValue.secondaryExpenditureImpact : '',
    });
  },
});

const secondaryKbliOptions = computed(() => [
  { label: '— Tidak ada KBLI sekunder —', value: '' },
  ...kbliOptions.filter((opt) => opt.value !== props.modelValue.kbliCategory),
]);

const secondaryExpOptions = computed(() => [
  { label: '— Tidak ada pengeluaran sekunder —', value: '' },
  ...expenditureOptions.filter((opt) => opt.value !== props.modelValue.expenditureComponent),
]);

const secondaryKbliImpactOptions = computed(() => [
  { label: '— Pilih dampak sekunder —', value: '' },
  ...kbliImpactOptions,
]);

const secondaryExpImpactOptions = computed(() => [
  { label: '— Pilih dampak sekunder —', value: '' },
  ...expenditureImpactOptions,
]);

const snippetWordCount = computed(() => {
  const text = props.article?.snippetText?.trim() || '';
  if (!text) return 0;
  return text.split(/\s+/).length;
});

const bpsBridgingHint = computed(() => {
  if (!props.modelValue.kbliCategory) return null;
  const bridge = getKbliFourGenerations(props.modelValue.kbliCategory);
  return bridge
    ? `Padanan: ${bridge.code2020} (${bridge.code2015}) — ${bridge.title2020}`
    : null;
});

const hasHttpUrl = computed(() => isSafeHttpUrl(props.article?.url));
</script>

<template>
  <div v-if="article" class="space-y-4">
    <!-- Header Context Strip -->
    <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-hairline">
      <div class="flex flex-wrap items-center gap-1.5">
        <UBadge
          :color="getLlmStatusBadge(article.llmStatus).color"
          variant="subtle"
          size="xs"
        >
          {{ getLlmStatusBadge(article.llmStatus).label }}
        </UBadge>
        <UBadge
          v-if="article.llmConfidence !== null"
          color="neutral"
          variant="outline"
          size="xs"
          class="tabular-nums font-mono"
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
        size="sm"
        class="min-h-8"
        trailing-icon="i-lucide-external-link"
      >
        Buka URL
      </UButton>
    </div>

    <!-- Toggle Otomatis Lanjut Antrean -->
    <div
      v-if="showAutoNextToggle"
      class="flex items-center justify-between gap-3 rounded-lg bg-canvas border border-border-hairline px-3 py-2"
    >
      <label for="curation-auto-next" class="text-xs text-ink-secondary cursor-pointer">
        Otomatis buka antrean <strong class="text-ink-primary">Pending</strong> berikutnya setelah simpan
      </label>
      <USwitch id="curation-auto-next" v-model="autoNextModel" size="sm" />
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
    <div class="space-y-1">
      <label for="curation-title-input" class="block text-xs font-semibold text-ink-primary">
        Judul Berita <span class="text-terracotta-ink">*</span>
      </label>
      <UInput
        id="curation-title-input"
        :model-value="modelValue.title"
        class="w-full"
        @update:model-value="updateField('title', String($event))"
      />
    </div>

    <!-- Cuplikan Teks Asli -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <label for="curation-snippet-textarea" class="text-xs font-semibold text-ink-secondary">
          Cuplikan Teks Asli (Verifikasi Konten)
        </label>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold tabular-nums text-ink-secondary font-mono">
            {{ snippetWordCount }} kata
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1 min-h-7 px-2 rounded-lg text-[11px] font-semibold text-brand-primary hover:bg-brand-tint transition-colors cursor-pointer"
            @click="emit('openFullSnippet')"
          >
            <UIcon name="i-solar-maximize-square-2-linear" class="w-3.5 h-3.5" />
            <span>Baca Penuh</span>
          </button>
        </div>
      </div>
      <UTextarea
        id="curation-snippet-textarea"
        :model-value="article.snippetText"
        readonly
        :rows="mode === 'inspector' ? 6 : 8"
        class="w-full text-xs"
        :ui="{ base: 'bg-canvas text-ink-primary leading-relaxed resize-y font-normal' }"
      />
    </div>

    <!-- Ringkasan Berita -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <label for="curation-summary-textarea" class="text-xs font-semibold text-ink-primary">
          Ringkasan Berita (2–3 Kalimat untuk Publik &amp; Excel) <span class="text-terracotta-ink">*</span>
        </label>
        <button
          v-if="canRestoreAiSummary"
          type="button"
          class="inline-flex items-center gap-1 min-h-8 px-1.5 rounded-lg text-xs font-semibold text-brand-primary hover:text-[#072B20] hover:bg-brand-tint cursor-pointer"
          @click="emit('restoreAiSummary')"
        >
          <UIcon name="i-lucide-rotate-ccw" class="w-3 h-3" />
          <span>Kembalikan Teks AI</span>
        </button>
      </div>
      <UFormField
        :error="
          highlightIncomplete && modelValue.summary.trim().length < 10
            ? 'Wajib diisi minimal 10 karakter sebelum verifikasi'
            : undefined
        "
      >
        <UTextarea
          id="curation-summary-textarea"
          :model-value="modelValue.summary"
          :rows="mode === 'inspector' ? 5 : 6"
          placeholder="Tuliskan ringkasan 2–3 kalimat padat mengenai fenomena ekonomi daerah..."
          class="w-full text-xs"
          :ui="{ base: 'leading-relaxed resize-y' }"
          @update:model-value="updateField('summary', String($event))"
        />
      </UFormField>
    </div>

    <!-- Grid Klasifikasi Dua Sisi PDRB -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
      <!-- Sisi Lapangan Usaha -->
      <div class="rounded-xl border border-brand-border bg-brand-tint/40 p-3.5 space-y-3">
        <div class="text-xs font-bold text-brand-primary font-display">
          1. Sisi Lapangan Usaha (KBLI)
        </div>

        <div class="space-y-1">
          <label for="curation-kbli-select" class="block text-xs font-semibold text-ink-primary">
            Kategori KBLI (A–V) <span class="text-terracotta-ink">*</span>
          </label>
          <USelectMenu
            id="curation-kbli-select"
            v-model="kbliModel"
            :items="kbliOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih kategori KBLI..."
            class="w-full"
          />
          <p
            v-if="bpsBridgingHint"
            class="mt-1 text-[11px] font-medium text-brand-primary bg-brand-tint px-2 py-0.5 rounded border border-brand-border"
          >
            {{ bpsBridgingHint }}
          </p>
          <p
            v-if="highlightIncomplete && !modelValue.kbliCategory"
            class="text-xs text-terracotta-ink font-semibold mt-1"
          >
            Wajib dipilih sebelum verifikasi
          </p>
        </div>

        <div class="space-y-1">
          <label for="curation-kbli-impact-select" class="block text-xs font-semibold text-ink-primary">
            Dampak Lapangan Usaha <span class="text-terracotta-ink">*</span>
          </label>
          <USelect
            id="curation-kbli-impact-select"
            :model-value="modelValue.kbliImpact || undefined"
            :items="kbliImpactOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih arah dampak KBLI..."
            class="w-full"
            @update:model-value="updateField('kbliImpact', ($event as KbliImpactEnum) ?? '')"
          />
          <p
            v-if="highlightIncomplete && !modelValue.kbliImpact"
            class="text-xs text-terracotta-ink font-semibold mt-1"
          >
            Wajib dipilih sebelum verifikasi
          </p>
        </div>
      </div>

      <!-- Sisi Pengeluaran -->
      <div class="rounded-xl border border-brand-border bg-brand-tint/40 p-3.5 space-y-3">
        <div class="text-xs font-bold text-brand-primary font-display">
          2. Sisi Pengeluaran PDRB
        </div>

        <div class="space-y-1">
          <label for="curation-exp-select" class="block text-xs font-semibold text-ink-primary">
            Komponen Pengeluaran <span class="text-terracotta-ink">*</span>
          </label>
          <USelect
            id="curation-exp-select"
            v-model="expModel"
            :items="expenditureOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih komponen pengeluaran..."
            class="w-full"
          />
          <p
            v-if="highlightIncomplete && !modelValue.expenditureComponent"
            class="text-xs text-terracotta-ink font-semibold mt-1"
          >
            Wajib dipilih sebelum verifikasi
          </p>
        </div>

        <div class="space-y-1">
          <label for="curation-exp-impact-select" class="block text-xs font-semibold text-ink-primary">
            Dampak Pengeluaran <span class="text-terracotta-ink">*</span>
          </label>
          <USelect
            id="curation-exp-impact-select"
            :model-value="modelValue.expenditureImpact || undefined"
            :items="expenditureImpactOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih arah dampak pengeluaran..."
            class="w-full"
            @update:model-value="updateField('expenditureImpact', ($event as ExpenditureImpactEnum) ?? '')"
          />
          <p
            v-if="highlightIncomplete && !modelValue.expenditureImpact"
            class="text-xs text-terracotta-ink font-semibold mt-1"
          >
            Wajib dipilih sebelum verifikasi
          </p>
        </div>
      </div>
    </div>

    <!-- Keterkaitan Sektoral Sekunder (Opsional) -->
    <div class="rounded-xl border border-border-hairline bg-canvas p-3.5 space-y-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-solar-link-round-bold-duotone" class="w-4 h-4 text-brand-primary" />
        <span class="text-xs font-bold text-ink-primary font-display">Keterkaitan Sektoral Sekunder (Opsional)</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-1">
          <label for="curation-sec-kbli-select" class="block text-xs font-semibold text-ink-secondary">
            KBLI Sekunder
          </label>
          <USelectMenu
            id="curation-sec-kbli-select"
            v-model="secondaryKbliModel"
            :items="secondaryKbliOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih KBLI sekunder..."
            class="w-full"
          />
        </div>

        <div class="space-y-1">
          <label for="curation-sec-kbli-impact-select" class="block text-xs font-semibold text-ink-secondary">
            Dampak KBLI Sekunder
          </label>
          <USelect
            id="curation-sec-kbli-impact-select"
            :model-value="modelValue.secondaryKbliImpact || undefined"
            :items="secondaryKbliImpactOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih dampak sekunder..."
            class="w-full"
            @update:model-value="updateField('secondaryKbliImpact', ($event as KbliImpactEnum) ?? '')"
          />
        </div>

        <div class="space-y-1">
          <label for="curation-sec-exp-select" class="block text-xs font-semibold text-ink-secondary">
            Pengeluaran Sekunder
          </label>
          <USelect
            id="curation-sec-exp-select"
            v-model="secondaryExpModel"
            :items="secondaryExpOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih pengeluaran sekunder..."
            class="w-full"
          />
        </div>

        <div class="space-y-1">
          <label for="curation-sec-exp-impact-select" class="block text-xs font-semibold text-ink-secondary">
            Dampak Pengeluaran Sekunder
          </label>
          <USelect
            id="curation-sec-exp-impact-select"
            :model-value="modelValue.secondaryExpenditureImpact || undefined"
            :items="secondaryExpImpactOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih dampak pengeluaran..."
            class="w-full"
            @update:model-value="updateField('secondaryExpenditureImpact', ($event as ExpenditureImpactEnum) ?? '')"
          />
        </div>
      </div>
    </div>

    <!-- Lokus Kecamatan KTT & Catatan Kurator Nerwilis -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="space-y-1 sm:col-span-1">
        <label for="curation-subdistrict-select" class="block text-xs font-semibold text-ink-primary">
          Lokus Kecamatan KTT
        </label>
        <USelect
          id="curation-subdistrict-select"
          :model-value="modelValue.subdistrict"
          :items="subdistrictOptions"
          value-key="value"
          label-key="label"
          placeholder="Pilih kecamatan..."
          class="w-full"
          @update:model-value="updateField('subdistrict', String($event ?? ''))"
        />
      </div>

      <div class="space-y-1 sm:col-span-2">
        <label for="curation-notes-input" class="block text-xs font-semibold text-ink-primary">
          Catatan Kurator Nerwilis (Opsional)
        </label>
        <UInput
          id="curation-notes-input"
          :model-value="modelValue.curatorNotes"
          placeholder="Contoh: Konfirmasi ke Dinas PUPR saat rekonsiliasi..."
          class="w-full"
          @update:model-value="updateField('curatorNotes', String($event ?? ''))"
        />
      </div>
    </div>

    <!-- Periode & Status Fenomena Ekonomi -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
      <div class="space-y-1">
        <label for="curation-quarter-select" class="block text-xs font-semibold text-ink-primary">
          Triwulan PDRB
        </label>
        <USelect
          id="curation-quarter-select"
          :model-value="modelValue.quarter"
          :items="quarterOptions"
          value-key="value"
          label-key="label"
          class="w-full font-mono"
          @update:model-value="updateField('quarter', Number($event) as PdrbQuarter)"
        />
      </div>

      <div class="space-y-1">
        <label for="curation-year-input" class="block text-xs font-semibold text-ink-primary">
          Tahun
        </label>
        <UInput
          id="curation-year-input"
          :model-value="modelValue.year"
          type="number"
          :min="2000"
          :max="2100"
          class="w-full font-mono"
          @update:model-value="updateField('year', Number($event))"
        />
      </div>

      <div
        class="flex items-center justify-between gap-2 rounded-xl border border-border-control px-3 py-2 bg-white min-h-[38px]"
      >
        <label for="curation-is-economic" class="text-xs font-semibold text-ink-primary cursor-pointer">
          Fenomena Ekonomi Sah
        </label>
        <USwitch
          id="curation-is-economic"
          :model-value="modelValue.isEconomicPhenomenon"
          size="sm"
          @update:model-value="updateField('isEconomicPhenomenon', Boolean($event))"
        />
      </div>
    </div>

    <!-- Action Decision Buttons -->
    <div class="pt-3 border-t border-border-hairline flex flex-wrap items-center gap-2">
      <UButton
        color="success"
        size="sm"
        class="font-bold cursor-pointer"
        :loading="submittingAction === 'VERIFIED'"
        :disabled="Boolean(submittingAction)"
        icon="i-lucide-check-circle-2"
        @click="emit('submit', 'VERIFIED')"
      >
        Verifikasi &amp; Sahkan
      </UButton>

      <UButton
        color="error"
        variant="outline"
        size="sm"
        class="cursor-pointer"
        :loading="submittingAction === 'IGNORED'"
        :disabled="Boolean(submittingAction)"
        icon="i-lucide-archive-x"
        @click="emit('submit', 'IGNORED')"
      >
        Abaikan / Non-Ekonomi
      </UButton>

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        class="cursor-pointer"
        :loading="submittingAction === 'DRAFT'"
        :disabled="Boolean(submittingAction)"
        icon="i-lucide-save"
        @click="emit('submit', 'DRAFT')"
      >
        Simpan Draf
      </UButton>
    </div>
  </div>
</template>
