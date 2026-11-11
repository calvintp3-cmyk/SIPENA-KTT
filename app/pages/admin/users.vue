<!-- app/pages/admin/users.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { UserRoleEnum } from '#shared/enums/pdrb';
import { formatDateTimeWita } from '#shared/utils/period';
import type { AdminUserItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { user, fetchSession } = useAdminSession();

const isSuperAdmin = computed(() => user.value?.role === UserRoleEnum.ADMIN);

const usersList = ref<AdminUserItem[]>([]);
const pending = ref(true);
const loadError = ref<string | null>(null);

async function loadUsers() {
  pending.value = true;
  loadError.value = null;

  try {
    const active = await fetchSession();
    if (!active || active.role !== UserRoleEnum.ADMIN) {
      usersList.value = [];
      return;
    }

    const res = await $fetch<{ items: AdminUserItem[] }>('/api/admin/users', {
      credentials: 'include',
    });
    usersList.value = res.items;
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    if (fetchErr.statusCode === 403) {
      loadError.value = 'Hanya Administrator Utama yang dapat mengakses daftar whitelist admin.';
    } else {
      loadError.value = fetchErr.data?.message || 'Gagal memuat daftar akses staf admin.';
    }
  } finally {
    pending.value = false;
  }
}

onMounted(() => {
  void loadUsers();
});

const searchText = ref('');

const filteredUsers = computed<AdminUserItem[]>(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return usersList.value;
  return usersList.value.filter(
    (item: AdminUserItem) =>
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q),
  );
});

const activeCount = computed<number>(
  () => usersList.value.filter((u: AdminUserItem) => u.isActive).length,
);

const formModalOpen = ref(false);
const editingUser = ref<AdminUserItem | null>(null);
const togglingIds = ref<Set<string>>(new Set());

const deleteModalOpen = ref(false);
const deleteTarget = ref<AdminUserItem | null>(null);
const isDeleting = ref(false);

function openCreateModal() {
  editingUser.value = null;
  formModalOpen.value = true;
}

function openEditModal(item: AdminUserItem) {
  editingUser.value = item;
  formModalOpen.value = true;
}

async function toggleActiveStatus(item: AdminUserItem, nextVal: boolean) {
  if (item.id === user.value?.id || togglingIds.value.has(item.id)) return;
  const previous = item.isActive;
  item.isActive = nextVal;
  togglingIds.value.add(item.id);

  try {
    const res = await $fetch<{ item: AdminUserItem }>(`/api/admin/users/${item.id}`, {
      method: 'PATCH',
      body: { isActive: nextVal },
      credentials: 'include',
    });

    item.isActive = res.item.isActive;
    toast.add({
      title: nextVal ? 'Akses Staf Diaktifkan' : 'Akses Staf Dinonaktifkan',
      description: `${item.name} (${item.email})`,
      color: nextVal ? 'success' : 'warning',
      icon: nextVal ? 'i-lucide-check-circle-2' : 'i-lucide-user-x',
    });
  } catch (err: unknown) {
    item.isActive = previous;
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Mengubah Status Akses',
      description: fetchErr.data?.message || 'Silakan coba kembali.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    togglingIds.value.delete(item.id);
  }
}

function askDelete(item: AdminUserItem) {
  if (item.id === user.value?.id) return;
  deleteTarget.value = item;
  deleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value || isDeleting.value) return;
  isDeleting.value = true;

  try {
    await $fetch(`/api/admin/users/${deleteTarget.value.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    toast.add({
      title: 'Email Dihapus dari Whitelist',
      description: deleteTarget.value.email,
      color: 'neutral',
      icon: 'i-lucide-trash-2',
    });

    deleteModalOpen.value = false;
    deleteTarget.value = null;
    await loadUsers();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menghapus Akun Staf',
      description: fetchErr.data?.message || 'Terjadi kesalahan saat menghapus.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    isDeleting.value = false;
  }
}

const columns: TableColumn<AdminUserItem>[] = [
  { id: 'staff', header: 'Staf & Alamat Email (Whitelist)' },
  { id: 'role', header: 'Peran' },
  { id: 'authMethod', header: 'Metode Login' },
  { id: 'lastLoginAt', header: 'Login Terakhir (WITA)' },
  { id: 'isActive', header: 'Status Aktif' },
  { id: 'actions', header: 'Aksi' },
];
</script>

<template>
  <div class="space-y-5">
    <div v-if="!isSuperAdmin && !pending" class="space-y-4">
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-shield-alert"
        title="Akses Khusus Administrator Utama"
        description="Halaman pengelolaan whitelist email staf dan peran admin hanya dapat diakses oleh akun dengan peran Administrator Utama (ADMIN)."
      />
      <UButton to="/admin/review" color="primary" icon="i-lucide-arrow-left">
        Kembali ke Antrean Review Harian
      </UButton>
    </div>

    <template v-else>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900">
            Kelola Akses Admin &amp; Whitelist Google
          </h1>
          <p class="text-sm text-slate-600 mt-0.5">
            Daftar email staf yang diizinkan masuk ke workspace admin menggunakan Login with Google maupun kata sandi lokal.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="searchText"
            icon="i-lucide-search"
            placeholder="Cari nama / Gmail..."
            size="sm"
            class="w-full sm:w-56"
          />
          <UButton color="primary" icon="i-lucide-user-plus" size="sm" @click="openCreateModal">
            Tambah Email Staf
          </UButton>
        </div>
      </div>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-shield-check"
        :title="`Mekanisme Whitelist Aktif (${activeCount} akun aktif dari ${usersList.length} terdaftar)`"
        description="Siapa pun yang login memakai Google OAuth akan ditolak secara otomatis apabila alamat Gmail-nya tidak terdaftar atau berstatus nonaktif di tabel ini."
      />

      <UAlert
        v-if="loadError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="loadError"
      />

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UTable
          :data="filteredUsers"
          :columns="columns"
          :loading="pending"
          empty="Belum ada akun staf admin yang terdaftar."
        >
          <template #staff-cell="{ row }">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-sm text-slate-900">{{ row.original.name }}</span>
                <UBadge
                  v-if="row.original.id === user?.id"
                  color="primary"
                  variant="soft"
                  size="xs"
                >
                  Anda
                </UBadge>
              </div>
              <div class="font-mono text-xs text-slate-600">{{ row.original.email }}</div>
            </div>
          </template>

          <template #role-cell="{ row }">
            <UBadge
              :color="row.original.role === UserRoleEnum.ADMIN ? 'primary' : 'info'"
              variant="subtle"
              size="xs"
              :icon="
                row.original.role === UserRoleEnum.ADMIN
                  ? 'i-lucide-shield-check'
                  : 'i-lucide-user-check'
              "
            >
              {{ row.original.role === UserRoleEnum.ADMIN ? 'Admin Utama' : 'Operator Kurasi' }}
            </UBadge>
          </template>

          <template #authMethod-cell="{ row }">
            <UBadge
              :color="row.original.hasPassword ? 'neutral' : 'info'"
              variant="outline"
              size="xs"
              :icon="row.original.hasPassword ? 'i-lucide-key-round' : 'i-lucide-globe'"
            >
              {{ row.original.hasPassword ? 'Google OAuth + Password' : 'Google OAuth Only' }}
            </UBadge>
          </template>

          <template #lastLoginAt-cell="{ row }">
            <span
              v-if="row.original.lastLoginAt"
              class="font-mono text-xs tabular-nums text-slate-700"
            >
              {{ formatDateTimeWita(row.original.lastLoginAt) }}
            </span>
            <span v-else class="text-xs text-slate-400">Belum pernah login</span>
          </template>

          <template #isActive-cell="{ row }">
            <div class="flex items-center gap-2">
              <UTooltip
                :text="
                  row.original.id === user?.id
                    ? 'Akun yang sedang login tidak dapat dinonaktifkan'
                    : row.original.isActive
                      ? 'Aktif (klik untuk nonaktifkan)'
                      : 'Nonaktif (klik untuk aktifkan)'
                "
              >
                <USwitch
                  :model-value="row.original.isActive"
                  :disabled="row.original.id === user?.id"
                  :loading="togglingIds.has(row.original.id)"
                  :aria-label="`Status aktif untuk ${row.original.email}`"
                  @update:model-value="toggleActiveStatus(row.original, $event)"
                />
              </UTooltip>
              <span
                class="text-xs font-medium"
                :class="row.original.isActive ? 'text-emerald-700' : 'text-slate-400'"
              >
                {{ row.original.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <UTooltip text="Edit Akses Staf">
                <UButton
                  size="xs"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-pencil"
                  aria-label="Edit akses staf"
                  @click="openEditModal(row.original)"
                />
              </UTooltip>
              <UTooltip
                :text="
                  row.original.id === user?.id
                    ? 'Akun sendiri tidak dapat dihapus'
                    : 'Hapus dari Whitelist'
                "
              >
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  aria-label="Hapus akses staf"
                  :disabled="row.original.id === user?.id"
                  @click="askDelete(row.original)"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>
      </UCard>

      <AdminUserFormModal
        v-model:open="formModalOpen"
        :editing-user="editingUser"
        :current-user-id="user?.id ?? null"
        @saved="loadUsers()"
      />

      <UModal
        v-model:open="deleteModalOpen"
        title="Hapus Email dari Whitelist Admin?"
        description="Staf bersangkutan tidak lagi dapat masuk via Google OAuth maupun kata sandi. Riwayat verifikasi artikel tetap tersimpan aman."
      >
        <template #body>
          <p class="text-sm text-slate-700 leading-relaxed">
            Anda yakin ingin menghapus akun
            <strong>{{ deleteTarget?.name }}</strong>
            (<span class="font-mono text-xs">{{ deleteTarget?.email }}</span>)
            dari daftar akses admin SIPENA KTT?
          </p>
        </template>

        <template #footer>
          <div class="w-full flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
              Batal
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="confirmDelete">
              Ya, Hapus dari Whitelist
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>

