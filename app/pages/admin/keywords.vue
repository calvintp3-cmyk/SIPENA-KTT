<!-- app/pages/admin/keywords.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { KeywordItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { getKbliShortCodeName, getExpenditureLabel, formatNumberId } = usePdrbLabels();

const {
  data: keywordsData,
  pending,
  error,
  refresh,
} = await useFetch<{ items: KeywordItem[] }>('/api/admin/keywords', {
  credentials: 'include',
});

const searchText = ref('');

const filteredKeywords = computed<KeywordItem[]>(() => {
  const list = keywordsData.value?.items ?? [];
  const q = searchText.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (item: KeywordItem) =>
      item.keyword.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q),
  );
});

const keywordMetrics = computed(() => {
  const list = keywordsData.value?.items ?? [];
  const total = list.length;
  const active = list.filter((k: KeywordItem) => k.isActive).length;
  const capturedArticles = list.reduce(
    (sum: number, k: KeywordItem) => sum + k.articleCount,
    0,
  );
  return { total, active, inactive: total - active, capturedArticles };
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
  const nextToggling = new Set(togglingIds.value);
  nextToggling.add(item.id);
  togglingIds.value = nextToggling;

  try {
    const res = await $fetch<{ item: KeywordItem | null }>(`/api/admin/keywords/${item.id}`, {
      method: 'PATCH',
      body: { isActive: nextVal },
      credentials: 'include',
    });

    if (res.item) {
      item.isActive = res.item.isActive;
      item.articleCount = res.item.articleCount;
      item.updatedAt = res.item.updatedAt;
    }

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
    const afterToggling = new Set(togglingIds.value);
    afterToggling.delete(item.id);
    togglingIds.value = afterToggling;
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
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal-700"
        >
          <UIcon name="i-lucide-tags" class="w-3.5 h-3.5" />
          <span>Penjaringan Transmisi Ekonomi Nasional</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1220] mt-0.5">
          Master Keyword Berita Nasional
        </h1>
        <p class="text-xs sm:text-sm text-[#5B677A] mt-0.5">
          Kata kunci isu strategis nasional yang memengaruhi ekonomi Kabupaten Tana Tidung (dijaring
          otomatis setiap 04:00 WITA).
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <div class="relative w-full sm:w-auto">
          <label for="keyword-search-input" class="sr-only">Cari kata kunci nasional</label>
          <UIcon
            name="i-lucide-search"
            class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            id="keyword-search-input"
            v-model="searchText"
            type="search"
            placeholder="Cari kata kunci..."
            class="h-9 w-full sm:w-52 pl-8 pr-7 rounded-lg border border-[#DCE3EC] bg-white text-xs text-[#0B1220] placeholder:text-slate-400 focus:border-teal-700"
          >
          <button
            v-if="searchText"
            type="button"
            aria-label="Hapus pencarian kata kunci"
            class="absolute right-1 top-1/2 -translate-y-1/2 min-w-6 min-h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700"
            @click="searchText = ''"
          >
            <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          class="obsidian-button h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          @click="openCreateModal"
        >
          <UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-teal-300" />
          <span>Tambah Keyword</span>
        </button>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat daftar kata kunci nasional"
      description="Pastikan koneksi database aktif lalu muat ulang."
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="refresh()">Muat Ulang</UButton>
      </template>
    </UAlert>

    <!-- 3 Compact Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="saas-card rounded-xl p-4 sm:p-5 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Keyword Terdaftar
          </span>
          <UIcon name="i-lucide-tag" class="w-4 h-4 text-teal-700" />
        </div>
        <div class="text-2xl font-bold font-mono tabular-nums text-[#0B1220]">
          {{ formatNumberId(keywordMetrics.total) }}
        </div>
        <div class="text-xs text-[#5B677A] font-mono tabular-nums">
          Query Google News Indonesia
        </div>
      </div>

      <div class="saas-card rounded-xl p-4 sm:p-5 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Keyword Aktif Dijaring
          </span>
          <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-emerald-600" />
        </div>
        <div class="text-2xl font-bold font-mono tabular-nums text-emerald-700">
          {{ formatNumberId(keywordMetrics.active) }}
        </div>
        <div class="text-xs text-[#5B677A] font-mono tabular-nums">
          {{ formatNumberId(keywordMetrics.inactive) }} keyword sedang dijeda
        </div>
      </div>

      <div class="saas-card rounded-xl p-4 sm:p-5 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Artikel Terjaring
          </span>
          <UIcon name="i-lucide-newspaper" class="w-4 h-4 text-sky-700" />
        </div>
        <div class="text-2xl font-bold font-mono tabular-nums text-[#0B1220]">
          {{ formatNumberId(keywordMetrics.capturedArticles) }}
        </div>
        <div class="text-xs text-[#5B677A]">Akumulasi di Bank Data SIPENA</div>
      </div>
    </div>

    <!-- Keywords Table -->
    <div class="saas-card rounded-xl overflow-hidden">
      <div
        tabindex="0"
        role="region"
        aria-label="Tabel Master Keyword Berita Nasional"
        class="saas-table-scroller"
      >
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
      </div>
    </div>

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
          <UButton color="neutral" variant="ghost" @click="() => { deleteModalOpen = false; }">
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
