<!-- app/components/admin/KeywordFormModal.vue -->
<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import type { ExpenditureComponentEnum, KbliCategoryEnum } from '#shared/enums/pdrb';
import { CreateKeywordSchema, type CreateKeywordInput } from '#shared/schemas/keyword.schema';
import type { KeywordItem, SelectOptionItem } from '~/types/sipena';

const props = defineProps<{
  open: boolean;
  editingKeyword: KeywordItem | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [item: KeywordItem];
}>();

const toast = useToast();
const { kbliOptions, expenditureOptions } = usePdrbLabels();

const modalOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

const kbliOptionalItems = computed<SelectOptionItem<string>[]>(() => [
  { label: '— Tidak ada asosiasi default —', value: 'NONE' },
  ...kbliOptions,
]);

const expOptionalItems = computed<SelectOptionItem<string>[]>(() => [
  { label: '— Tidak ada asosiasi default —', value: 'NONE' },
  ...expenditureOptions,
]);

const formState = reactive<{
  keyword: string;
  defaultKbliCategory: KbliCategoryEnum | null;
  defaultExpenditureComponent: ExpenditureComponentEnum | null;
  description: string;
  isActive: boolean;
}>({
  keyword: '',
  defaultKbliCategory: null,
  defaultExpenditureComponent: null,
  description: '',
  isActive: true,
});

const kbliModel = computed<string>({
  get: () => formState.defaultKbliCategory ?? 'NONE',
  set: (val: string) => {
    formState.defaultKbliCategory = val === 'NONE' ? null : (val as KbliCategoryEnum);
  },
});

const expModel = computed<string>({
  get: () => formState.defaultExpenditureComponent ?? 'NONE',
  set: (val: string) => {
    formState.defaultExpenditureComponent =
      val === 'NONE' ? null : (val as ExpenditureComponentEnum);
  },
});

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

watch(
  () => [props.open, props.editingKeyword] as const,
  ([isOpen, kw]: readonly [boolean, KeywordItem | null]) => {
    if (!isOpen) return;
    errorMessage.value = null;
    if (kw) {
      formState.keyword = kw.keyword;
      formState.defaultKbliCategory = kw.defaultKbliCategory;
      formState.defaultExpenditureComponent = kw.defaultExpenditureComponent;
      formState.description = kw.description ?? '';
      formState.isActive = kw.isActive;
    } else {
      formState.keyword = '';
      formState.defaultKbliCategory = null;
      formState.defaultExpenditureComponent = null;
      formState.description = '';
      formState.isActive = true;
    }
  },
  { immediate: true },
);

async function handleSubmit(event: FormSubmitEvent<CreateKeywordInput>) {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const bodyPayload = {
      keyword: event.data.keyword.trim(),
      defaultKbliCategory: formState.defaultKbliCategory,
      defaultExpenditureComponent: formState.defaultExpenditureComponent,
      description: formState.description.trim() || null,
      isActive: formState.isActive,
    };

    const res = props.editingKeyword
      ? await $fetch<{ item: KeywordItem }>(`/api/admin/keywords/${props.editingKeyword.id}`, {
          method: 'PATCH',
          body: bodyPayload,
          credentials: 'include',
        })
      : await $fetch<{ item: KeywordItem }>('/api/admin/keywords', {
          method: 'POST',
          body: bodyPayload,
          credentials: 'include',
        });

    toast.add({
      title: props.editingKeyword ? 'Keyword Diperbarui' : 'Keyword Ditambahkan',
      description: res.item.keyword,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });

    emit('saved', res.item);
    modalOpen.value = false;
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    errorMessage.value = fetchErr.data?.message || 'Gagal menyimpan kata kunci.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="editingKeyword ? 'Edit Kata Kunci Nasional' : 'Tambah Kata Kunci Nasional'"
    description="Kata kunci aktif dipakai crawler untuk menjaring berita nasional transmisi ekonomi KTT."
    :ui="{ content: 'max-w-lg' }"
  >
    <template #body>
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="errorMessage"
        class="mb-4"
      />

      <UForm
        :schema="CreateKeywordSchema"
        :state="formState"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <UFormField label="Frasa Kata Kunci" name="keyword" required>
          <UInput
            v-model="formState.keyword"
            placeholder="Mis. harga TBS kelapa sawit Kalimantan Utara, HBA batubara Kaltara, subsidi ongkos angkut Tana Tidung"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Asosiasi Default KBLI (Opsional)" name="defaultKbliCategory">
          <USelectMenu
            v-model="kbliModel"
            :items="kbliOptionalItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Asosiasi Default Pengeluaran (Opsional)"
          name="defaultExpenditureComponent"
        >
          <USelect
            v-model="expModel"
            :items="expOptionalItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Catatan Transmisi Ekonomi (Opsional)" name="description">
          <UTextarea
            v-model="formState.description"
            :rows="2"
            placeholder="Keterangan singkat keterkaitan komoditas/kebijakan dengan ekonomi Kab. Tana Tidung..."
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center justify-between rounded-xl border border-indigo-200/70 bg-indigo-50/40 px-3.5 py-2.5">
          <div class="flex items-center gap-2">
            <UIcon name="i-solar-check-circle-bold-duotone" class="w-4 h-4 text-indigo-600 shrink-0" />
            <label
              for="keyword-active-switch"
              class="text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer"
            >
              Aktifkan saat crawling harian
            </label>
          </div>
          <USwitch id="keyword-active-switch" v-model="formState.isActive" />
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <UButton color="neutral" variant="ghost" @click="() => { modalOpen = false; }">
            Batal
          </UButton>
          <UButton
            type="submit"
            color="primary"
            icon="i-solar-tag-price-bold-duotone"
            :loading="isSubmitting"
          >
            {{ editingKeyword ? 'Simpan Perubahan' : 'Simpan Kata Kunci' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
