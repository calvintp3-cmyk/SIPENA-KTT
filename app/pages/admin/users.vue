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
  <div class="space-y-6">
    <!-- RBAC Guard Notice -->
    <div v-if="!isSuperAdmin && !pending" class="saas-card rounded-2xl p-6 space-y-4">
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-shield-alert"
        title="Akses Khusus Administrator Utama"
        description="Halaman pengelolaan whitelist email staf dan peran admin hanya dapat diakses oleh akun dengan peran Administrator Utama (ADMIN)."
      />
      <NuxtLink
        to="/admin/review"
        class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
      >
        <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5 text-emerald-200" />
        <span>Kembali ke Antrean Review Harian</span>
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
          >
            <UIcon name="i-solar-shield-user-bold-duotone" class="w-3.5 h-3.5" />
            <span>Tata Kelola Akses &amp; RBAC</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] mt-2">
            Kelola Akses Admin &amp; Whitelist Google
          </h1>
          <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
            Daftar email staf yang diizinkan masuk ke workspace admin menggunakan Login with Google
            maupun kata sandi lokal.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <div class="relative w-full sm:w-auto">
            <label for="users-search-input" class="sr-only">Cari nama atau Gmail staf</label>
            <UIcon
              name="i-solar-magnifer-line-duotone"
              class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              id="users-search-input"
              v-model="searchText"
              type="search"
              placeholder="Cari nama / Gmail..."
              class="h-9 w-full sm:w-56 pl-9 pr-7 rounded-xl border border-slate-200 bg-white text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            >
            <button
              v-if="searchText"
              type="button"
              aria-label="Hapus pencarian staf"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-6 min-h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              @click="() => { searchText = ''; }"
            >
              <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            @click="() => { openCreateModal(); }"
          >
            <UIcon name="i-solar-user-plus-bold-duotone" class="w-4 h-4 text-emerald-200" />
            <span>Tambah Email Staf</span>
          </button>
        </div>
      </div>

      <!-- Whitelist Security Notice Card -->
      <div class="saas-card rounded-2xl p-5 flex items-start gap-3.5 border-l-4 border-l-indigo-600">
        <div
          class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-solar-shield-check-bold-duotone" class="w-5 h-5" />
        </div>
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-bold text-[#0F172A]">
              Mekanisme Whitelist Aktif
            </h2>
            <span
              class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold tabular-nums"
            >
              {{ activeCount }} aktif / {{ usersList.length }} terdaftar
            </span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Siapa pun yang mencoba masuk menggunakan Google OAuth akan ditolak secara otomatis
            apabila alamat Gmail-nya tidak terdaftar atau berstatus nonaktif dalam tabel ini.
          </p>
        </div>
      </div>

      <UAlert
        v-if="loadError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="loadError"
      />

      <!-- Users Table -->
      <div class="saas-card rounded-2xl overflow-hidden">
        <div
          tabindex="0"
          role="region"
          aria-label="Tabel Daftar Akses Admin dan Whitelist Google"
          class="saas-table-scroller"
        >
          <UTable
            :data="filteredUsers"
            :columns="columns"
            :loading="pending"
            empty="Belum ada akun staf admin yang terdaftar."
          >
            <template #staff-cell="{ row }">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                  :class="
                    row.original.role === UserRoleEnum.ADMIN
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                  "
                >
                  {{ row.original.name.trim().charAt(0).toUpperCase() || 'A' }}
                </div>
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-[#0F172A]">{{ row.original.name }}</span>
                    <UBadge
                      v-if="row.original.id === user?.id"
                      color="primary"
                      variant="soft"
                      size="xs"
                    >
                      Anda
                    </UBadge>
                  </div>
                  <div class="text-xs text-slate-600">{{ row.original.email }}</div>
                </div>
              </div>
            </template>

            <template #role-cell="{ row }">
              <UBadge
                :color="row.original.role === UserRoleEnum.ADMIN ? 'primary' : 'info'"
                variant="subtle"
                size="xs"
                :icon="
                  row.original.role === UserRoleEnum.ADMIN
                    ? 'i-solar-shield-check-bold-duotone'
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
                :icon="row.original.hasPassword ? 'i-lucide-key-round' : 'i-solar-globe-bold-duotone'"
              >
                {{ row.original.hasPassword ? 'Google OAuth + Password' : 'Google OAuth Only' }}
              </UBadge>
            </template>

            <template #lastLoginAt-cell="{ row }">
              <span
                v-if="row.original.lastLoginAt"
                class="text-xs font-medium tabular-nums text-slate-700"
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
                    @update:model-value="(val: boolean) => { void toggleActiveStatus(row.original, val); }"
                  />
                </UTooltip>
                <span
                  class="text-xs font-semibold"
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
                    @click="() => { openEditModal(row.original); }"
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
                    @click="() => { askDelete(row.original); }"
                  />
                </UTooltip>
              </div>
            </template>
          </UTable>
        </div>
      </div>

      <AdminUserFormModal
        v-model:open="formModalOpen"
        :editing-user="editingUser"
        :current-user-id="user?.id ?? null"
        @saved="() => { void loadUsers(); }"
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
            (<span class="font-medium text-[#0F172A]">{{ deleteTarget?.email }}</span>)
            dari daftar akses admin SIPENA KTT?
          </p>
        </template>

        <template #footer>
          <div class="w-full flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="() => { deleteModalOpen = false; }">
              Batal
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="() => { void confirmDelete(); }">
              Ya, Hapus dari Whitelist
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
