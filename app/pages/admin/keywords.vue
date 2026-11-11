<!-- app/pages/admin/keywords.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { KeywordItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { getKbliShortCodeName, getExpenditureLabel } = usePdrbLabels();

const {
  data: keywordsData,
  pending,
  refresh,
} = await useFetch<{ items: KeywordItem[] }>('/api/admin/keywords', {
  credentials: 'include',
});

const searchText = ref('');

const filteredKeywords = computed(() => {
  const list = keywordsData.value?.items ?? [];
  const q = searchText.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (item) =>
      item.keyword.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q),
  );
});

const formModalOpen = ref(false);
const editingKeyword = ref<KeywordItem | null>(null);
const togglingIds = ref<Set<string>>(new Set());

const deleteModalOpen = ref(false);
const deleteTarget = ref<KeywordItem | null>(null);
const isDeleting = ref(false);

function openCreateModal() {
  editingKeyword.value = null;
  formModalOpen.value = true;
}

function openEditModal(item: KeywordItem) {
  editingKeyword.value = item;
  formModalOpen.value = true;
}

async function toggleActiveStatus(item: KeywordItem, nextVal: boolean) {
  if (togglingIds.value.has(item.id)) return;
  const previous = item.isActive;
  item.isActive = nextVal;
  togglingIds.value.add(item.id);

  try {
    await $fetch(`/api/admin/keywords/${item.id}`, {
      method: 'PATCH',
      body: { isActive: nextVal },
      credentials: 'include',
    });

    toast.add({
      title: nextVal ? 'Kata Kunci Diaktifkan' : 'Kata Kunci Dinonaktifkan',
      description: item.keyword,
      color: nextVal ? 'success' : 'neutral',
      icon: nextVal ? 'i-lucide-check-circle-2' : 'i-lucide-pause-circle',
    });
  } catch (err: unknown) {
    item.isActive = previous;
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Mengubah Status Kata Kunci',
      description: fetchErr.data?.message || 'Silakan coba lagi.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    togglingIds.value.delete(item.id);
  }
}

function askDelete(item: KeywordItem) {
  deleteTarget.value = item;
  deleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value || isDeleting.value) return;
  isDeleting.value = true;

  try {
    await $fetch(`/api/admin/keywords/${deleteTarget.value.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    toast.add({
      title: 'Kata Kunci Dihapus',
      description: deleteTarget.value.keyword,
      color: 'neutral',
      icon: 'i-lucide-trash-2',
    });
    deleteModalOpen.value = false;
    deleteTarget.value = null;
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menghapus Kata Kunci',
      description: fetchErr.data?.message || 'Terjadi kesalahan saat menghapus.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    isDeleting.value = false;
  }
}

const columns: TableColumn<KeywordItem>[] = [
  { id: 'keyword', header: 'Kata Kunci (Keyword)' },
  { id: 'defaultKbli', header: 'Asosiasi Default KBLI' },
  { id: 'defaultExpenditure', header: 'Default Pengeluaran' },
  { id: 'articleCount', header: 'Terjaring' },
  { id: 'isActive', header: 'Aktif' },
  { id: 'actions', header: 'Aksi' },
];
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          Master Keyword Berita Nasional
        </h1>
        <p class="text-sm text-slate-600 mt-0.5">
          Kata kunci transmisi ekonomi nasional ke Kabupaten Tana Tidung (dijaring setiap 04:00 WITA).
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="searchText"
          icon="i-lucide-search"
          placeholder="Cari kata kunci..."
          size="sm"
          class="w-full sm:w-52"
        />
        <UButton color="primary" icon="i-lucide-plus" size="sm" @click="openCreateModal">
          Tambah Keyword
        </UButton>
      </div>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        :data="filteredKeywords"
        :columns="columns"
        :loading="pending"
        empty="Belum ada kata kunci nasional terdaftar."
      >
        <template #keyword-cell="{ row }">
          <div class="space-y-0.5 max-w-sm">
            <div class="font-semibold text-sm text-slate-900">{{ row.original.keyword }}</div>
            <p v-if="row.original.description" class="text-xs text-slate-500 leading-snug">
              {{ row.original.description }}
            </p>
          </div>
        </template>

        <template #defaultKbli-cell="{ row }">
          <UBadge
            v-if="row.original.defaultKbliCategory"
            color="primary"
            variant="subtle"
            size="xs"
          >
            {{ getKbliShortCodeName(row.original.defaultKbliCategory) }}
          </UBadge>
          <span v-else class="text-xs text-slate-400">Otomatis via AI</span>
        </template>

        <template #defaultExpenditure-cell="{ row }">
          <UBadge
            v-if="row.original.defaultExpenditureComponent"
            color="info"
            variant="subtle"
            size="xs"
          >
            {{ getExpenditureLabel(row.original.defaultExpenditureComponent, false) }}
          </UBadge>
          <span v-else class="text-xs text-slate-400">Otomatis via AI</span>
        </template>

        <template #articleCount-cell="{ row }">
          <span class="font-mono text-xs tabular-nums font-medium text-slate-700">
            {{ row.original.articleCount }} artikel
          </span>
        </template>

        <template #isActive-cell="{ row }">
          <USwitch
            :model-value="row.original.isActive"
            :loading="togglingIds.has(row.original.id)"
            :aria-label="`Aktifkan kata kunci ${row.original.keyword}`"
            @update:model-value="toggleActiveStatus(row.original, $event)"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip text="Edit Kata Kunci">
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-pencil"
                aria-label="Edit kata kunci"
                @click="openEditModal(row.original)"
              />
            </UTooltip>
            <UTooltip text="Hapus Kata Kunci">
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="Hapus kata kunci"
                @click="askDelete(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <AdminKeywordFormModal
      v-model:open="formModalOpen"
      :editing-keyword="editingKeyword"
      @saved="refresh()"
    />

    <UModal
      v-model:open="deleteModalOpen"
      title="Hapus Kata Kunci Nasional?"
      description="Artikel berita yang sudah terjaring ke Bank Data tidak akan ikut terhapus."
    >
      <template #body>
        <p class="text-sm text-slate-700 leading-relaxed">
          Anda yakin ingin menghapus kata kunci
          <strong>"{{ deleteTarget?.keyword }}"</strong> dari daftar penjaringan berita nasional?
        </p>
      </template>

      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
            Batal
          </UButton>
          <UButton color="error" :loading="isDeleting" @click="confirmDelete">
            Ya, Hapus Keyword
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

