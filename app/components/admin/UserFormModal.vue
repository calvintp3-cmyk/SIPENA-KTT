<!-- app/components/admin/UserFormModal.vue -->
<script setup lang="ts">
import { UserRoleEnum } from '#shared/enums/pdrb';
import {
  CreateAdminUserSchema,
  UpdateAdminUserSchema,
} from '#shared/schemas/user.schema';
import type { AdminUserItem, SelectOptionItem } from '~/types/sipena';

const props = defineProps<{
  open: boolean;
  editingUser: AdminUserItem | null;
  currentUserId?: string | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [item: AdminUserItem];
}>();

const toast = useToast();

const modalOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const isEditingSelf = computed(
  () => Boolean(props.editingUser && props.currentUserId && props.editingUser.id === props.currentUserId),
);

const roleOptions: SelectOptionItem<UserRoleEnum>[] = [
  {
    value: UserRoleEnum.OPERATOR,
    label: 'Operator Kurasi (Review, Bank Data, Keyword & Scraper)',
  },
  {
    value: UserRoleEnum.ADMIN,
    label: 'Administrator Utama (+ Kelola Daftar Whitelist Admin)',
  },
];

const formState = reactive<{
  email: string;
  name: string;
  role: UserRoleEnum;
  password: string;
  clearPassword: boolean;
  isActive: boolean;
}>({
  email: '',
  name: '',
  role: UserRoleEnum.OPERATOR,
  password: '',
  clearPassword: false,
  isActive: true,
});

const showPassword = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const activeSchema = computed(() =>
  props.editingUser ? UpdateAdminUserSchema : CreateAdminUserSchema,
);

watch(
  () => [props.open, props.editingUser] as const,
  ([isOpen, targetUser]: readonly [boolean, AdminUserItem | null]) => {
    if (!isOpen) return;
    errorMessage.value = null;
    showPassword.value = false;

    if (targetUser) {
      formState.email = targetUser.email;
      formState.name = targetUser.name;
      formState.role = targetUser.role;
      formState.password = '';
      formState.clearPassword = false;
      formState.isActive = targetUser.isActive;
    } else {
      formState.email = '';
      formState.name = '';
      formState.role = UserRoleEnum.OPERATOR;
      formState.password = '';
      formState.clearPassword = false;
      formState.isActive = true;
    }
  },
  { immediate: true },
);

watch(
  () => formState.clearPassword,
  (cleared: boolean) => {
    if (cleared) {
      formState.password = '';
    }
  },
);

async function handleSubmit() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const trimmedPassword = formState.password.trim();

    if (props.editingUser) {
      const patchBody: Record<string, unknown> = {
        email: formState.email.trim().toLowerCase(),
        name: formState.name.trim(),
        role: formState.role,
        isActive: formState.isActive,
      };
      if (trimmedPassword.length > 0) {
        patchBody.password = formState.password;
      } else if (formState.clearPassword) {
        patchBody.clearPassword = true;
      }

      const res = await $fetch<{ item: AdminUserItem }>(
        `/api/admin/users/${props.editingUser.id}`,
        {
          method: 'PATCH',
          body: patchBody,
          credentials: 'include',
        },
      );

      toast.add({
        title: 'Akses Staf Diperbarui',
        description: res.item.email,
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      });

      emit('saved', res.item);
      modalOpen.value = false;
    } else {
      const createBody = {
        email: formState.email.trim().toLowerCase(),
        name: formState.name.trim(),
        role: formState.role,
        isActive: formState.isActive,
        password: trimmedPassword.length > 0 ? formState.password : null,
      };

      const res = await $fetch<{ item: AdminUserItem }>('/api/admin/users', {
        method: 'POST',
        body: createBody,
        credentials: 'include',
      });

      toast.add({
        title: 'Email Staf Ditambahkan ke Whitelist',
        description: res.item.email,
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      });

      emit('saved', res.item);
      modalOpen.value = false;
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    errorMessage.value = fetchErr.data?.message || 'Gagal menyimpan data akses admin.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="editingUser ? 'Edit Akses Staf Admin' : 'Tambah Email Whitelist Admin'"
    description="Hanya alamat email Google / Gmail yang terdaftar & aktif di sini yang diizinkan masuk ke SIPENA KTT."
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
        :schema="activeSchema"
        :state="formState"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <UFormField
          label="Alamat Gmail / Email Google Staf"
          name="email"
          hint="Otomatis dinormalisasi huruf kecil"
          required
        >
          <UInput
            v-model="formState.email"
            type="email"
            placeholder="nama.staf@gmail.com"
            icon="i-lucide-mail"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Nama Lengkap Staf" name="name" required>
          <UInput
            v-model="formState.name"
            placeholder="Mis. Budi Santoso (Statistisi Nerwilis)"
            icon="i-lucide-user"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Peran & Kewenangan" name="role" required>
          <USelect
            v-model="formState.role"
            :items="roleOptions"
            value-key="value"
            label-key="label"
            :disabled="isEditingSelf"
            class="w-full"
          />
          <p v-if="isEditingSelf" class="text-[11px] text-slate-500 mt-1">
            Peran Administrator Utama milik akun yang sedang aktif tidak dapat diturunkan.
          </p>
        </UFormField>

        <UFormField
          :label="editingUser ? 'Setel / Ganti Kata Sandi Lokal (Opsional)' : 'Kata Sandi Lokal Cadangan (Opsional)'"
          name="password"
        >
          <UInput
            v-model="formState.password"
            :type="showPassword ? 'text' : 'password'"
            :disabled="formState.clearPassword"
            placeholder="Kosongkan jika cukup login via Google OAuth (min. 12 karakter jika diisi)"
            icon="i-lucide-lock"
            autocomplete="new-password"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="() => { showPassword = !showPassword; }"
              />
            </template>
          </UInput>
          <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
            <template v-if="editingUser">
              Biarkan kosong jika tidak ingin mengubah pengaturan kata sandi saat ini.
            </template>
            <template v-else>
              Direkomendasikan kosong apabila staf cukup masuk menggunakan tombol <strong>Masuk dengan Google</strong>.
            </template>
          </p>
        </UFormField>

        <div
          v-if="editingUser?.hasPassword && !isEditingSelf"
          class="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 flex items-center justify-between gap-3"
        >
          <div>
            <div class="text-xs font-semibold text-amber-900">
              Nonaktifkan login kata sandi lokal
            </div>
            <div class="text-[11px] text-amber-800/90">
              Ubah akun ini menjadi khusus <strong>Google OAuth Only</strong>.
            </div>
          </div>
          <USwitch v-model="formState.clearPassword" />
        </div>

        <div class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <div>
            <div class="text-sm font-medium text-slate-800">Status Akses Aktif (Whitelist)</div>
            <div class="text-[11px] text-slate-500">
              Jika dimatikan, akun otomatis ditolak saat mencoba login Google maupun sesi aktifnya dicabut.
            </div>
          </div>
          <USwitch v-model="formState.isActive" :disabled="isEditingSelf" />
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <UButton color="neutral" variant="ghost" @click="() => { modalOpen = false; }">
            Batal
          </UButton>
          <UButton type="submit" color="primary" :loading="isSubmitting">
            {{ editingUser ? 'Simpan Perubahan' : 'Tambahkan ke Whitelist' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

