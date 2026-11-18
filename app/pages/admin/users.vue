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
const passwordModalOpen = ref(false);
const passwordTarget = ref<AdminUserItem | null>(null);
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

function openPasswordModal(item: AdminUserItem) {
  passwordTarget.value = item;
  passwordModalOpen.value = true;
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
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] text-xs font-semibold"
          >
            <UIcon name="i-solar-shield-user-bold-duotone" class="w-3.5 h-3.5 text-[#0B3D2E]" />
            <span>Tata Kelola Akses &amp; RBAC</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141917] mt-2 font-display">
            Kelola Akses Admin &amp; Whitelist Google
          </h1>
          <p class="text-xs sm:text-sm text-[#4A524E] mt-0.5">
            Daftar email staf yang diizinkan masuk ke workspace admin menggunakan Login with Google
            maupun kata sandi lokal.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <div class="w-full sm:w-56">
            <label for="users-search-input" class="sr-only">Cari nama atau Gmail staf</label>
            <UInput
              id="users-search-input"
              v-model="searchText"
              type="search"
              size="sm"
              leading-icon="i-solar-magnifer-line-duotone"
              placeholder="Cari nama / Gmail..."
              class="w-full"
            />
          </div>

          <button
            type="button"
            class="obs-btn-primary min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            @click="() => { openCreateModal(); }"
          >
            <UIcon name="i-solar-user-plus-bold-duotone" class="w-4 h-4 text-[#BBD8CB]" />
            <span>Tambah Email Staf</span>
          </button>
        </div>
      </div>

      <!-- Whitelist Security Notice Card -->
      <div class="obs-panel rounded-xl p-5 flex items-start gap-3.5 border-[#BBD8CB] bg-[#E3F0EA]/40">
        <div
          class="w-10 h-10 rounded-xl bg-white border border-[#BBD8CB] text-[#0B3D2E] flex items-center justify-center shrink-0"
        >
          <UIcon name="i-solar-shield-check-bold-duotone" class="w-5 h-5 text-[#0B3D2E]" />
        </div>
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-bold text-[#141917] font-display">
              Mekanisme Whitelist Aktif
            </h2>
            <span
              class="px-2.5 py-0.5 rounded-full bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] text-[11px] font-semibold tabular-nums font-mono"
            >
              {{ activeCount }} aktif / {{ usersList.length }} terdaftar
            </span>
          </div>
          <p class="text-xs text-[#4A524E] leading-relaxed">
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

      <!-- Users Table (Desktop >= md) & Responsive Cards (< md) -->
      <div class="obs-panel rounded-2xl overflow-hidden">
        <div
          role="region"
          aria-label="Tabel Daftar Akses Admin dan Whitelist Google"
          class="hidden md:block w-full"
        >
          <UTable
            :data="filteredUsers"
            :columns="columns"
            :loading="pending"
            :ui="{
              th: 'py-3 px-3.5 text-[11px] font-bold text-[#4A524E] bg-[#F6F5F1]',
              td: 'py-3 px-3.5 text-xs whitespace-normal align-middle',
            }"
            empty="Belum ada akun staf admin yang terdaftar."
          >
            <template #staff-cell="{ row }">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                  :class="
                    row.original.role === UserRoleEnum.ADMIN
                      ? 'bg-[#0B3D2E] text-white'
                      : 'bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB]'
                  "
                >
                  {{ row.original.name.trim().charAt(0).toUpperCase() || 'A' }}
                </div>
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-[#141917]">{{ row.original.name }}</span>
                    <UBadge
                      v-if="row.original.id === user?.id"
                      color="primary"
                      variant="soft"
                      size="xs"
                    >
                      Anda
                    </UBadge>
                  </div>
                  <div class="text-xs text-[#4A524E]">{{ row.original.email }}</div>
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
                class="text-xs font-medium tabular-nums text-[#4A524E] font-mono"
              >
                {{ formatDateTimeWita(row.original.lastLoginAt) }}
              </span>
              <span v-else class="text-xs text-[#737B76]">Belum pernah login</span>
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
                  :class="row.original.isActive ? 'text-[#0B3D2E]' : 'text-[#737B76]'"
                >
                  {{ row.original.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex items-center gap-1">
                <UTooltip text="Ganti Kata Sandi">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="subtle"
                    icon="i-lucide-key-round"
                    aria-label="Ganti kata sandi akun"
                    class="min-w-8 min-h-8"
                    @click="() => { openPasswordModal(row.original); }"
                  />
                </UTooltip>
                <UTooltip text="Edit Akses Staf">
                  <UButton
                    size="sm"
                    color="primary"
                    variant="subtle"
                    icon="i-lucide-pencil"
                    aria-label="Edit akses staf"
                    class="min-w-8 min-h-8"
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
                    size="sm"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    aria-label="Hapus akses staf"
                    class="min-w-8 min-h-8"
                    :disabled="row.original.id === user?.id"
                    @click="() => { askDelete(row.original); }"
                  />
                </UTooltip>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Mobile Cards (< md) -->
        <div class="md:hidden divide-y divide-[#141917]/[0.08]">
          <div
            v-if="!pending && filteredUsers.length === 0"
            class="p-6 text-center text-xs text-[#737B76]"
          >
            Belum ada akun staf admin yang terdaftar.
          </div>
          <div
            v-for="u in filteredUsers"
            :key="`mob-u-${u.id}`"
            class="p-4 space-y-3 bg-white"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                  :class="
                    u.role === UserRoleEnum.ADMIN
                      ? 'bg-[#0B3D2E] text-white'
                      : 'bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB]'
                  "
                >
                  {{ u.name.trim().charAt(0).toUpperCase() || 'A' }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-sm text-[#141917] truncate">{{ u.name }}</span>
                    <UBadge v-if="u.id === user?.id" color="primary" variant="soft" size="xs">
                      Anda
                    </UBadge>
                  </div>
                  <div class="text-xs text-[#4A524E] break-all">{{ u.email }}</div>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-key-round"
                  aria-label="Ganti kata sandi akun"
                  class="min-w-8 min-h-8"
                  @click="() => { openPasswordModal(u); }"
                />
                <UButton
                  size="xs"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-pencil"
                  aria-label="Edit akses staf"
                  class="min-w-8 min-h-8"
                  @click="() => { openEditModal(u); }"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  aria-label="Hapus akses staf"
                  class="min-w-8 min-h-8"
                  :disabled="u.id === user?.id"
                  @click="() => { askDelete(u); }"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#141917]/[0.08] text-xs">
              <div class="flex flex-wrap items-center gap-1.5">
                <UBadge
                  :color="u.role === UserRoleEnum.ADMIN ? 'primary' : 'info'"
                  variant="subtle"
                  size="xs"
                >
                  {{ u.role === UserRoleEnum.ADMIN ? 'Admin Utama' : 'Operator Kurasi' }}
                </UBadge>
                <UBadge
                  :color="u.hasPassword ? 'neutral' : 'info'"
                  variant="outline"
                  size="xs"
                >
                  {{ u.hasPassword ? 'OAuth + Password' : 'Google OAuth' }}
                </UBadge>
              </div>

              <div class="flex items-center gap-2">
                <USwitch
                  :model-value="u.isActive"
                  :disabled="u.id === user?.id"
                  :loading="togglingIds.has(u.id)"
                  :aria-label="`Status aktif untuk ${u.email}`"
                  @update:model-value="(val: boolean) => { void toggleActiveStatus(u, val); }"
                />
                <span class="text-xs font-semibold" :class="u.isActive ? 'text-[#0B3D2E]' : 'text-[#737B76]'">
                  {{ u.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminUserFormModal
        v-model:open="formModalOpen"
        :editing-user="editingUser"
        :current-user-id="user?.id ?? null"
        @saved="() => { void loadUsers(); }"
      />

      <AdminUserPasswordModal
        v-model:open="passwordModalOpen"
        :target-user="passwordTarget"
        @saved="() => { void loadUsers(); }"
      />

      <UModal
        v-model:open="deleteModalOpen"
        title="Hapus Email dari Whitelist Admin?"
        description="Staf bersangkutan tidak lagi dapat masuk via Google OAuth maupun kata sandi. Riwayat verifikasi artikel tetap tersimpan aman."
      >
        <template #body>
          <p class="text-sm text-[#4A524E] leading-relaxed">
            Anda yakin ingin menghapus akun
            <strong>{{ deleteTarget?.name }}</strong>
            (<span class="font-medium text-[#141917]">{{ deleteTarget?.email }}</span>)
            dari daftar akses admin SIPENA KTT?
          </p>
        </template>

        <template #footer>
          <div class="w-full flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" autofocus @click="() => { deleteModalOpen = false; }">
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
