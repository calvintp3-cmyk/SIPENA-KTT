<!-- app/components/admin/UserPasswordModal.vue -->
<script setup lang="ts">
import type { AdminUserItem } from '~/types/sipena';

const props = defineProps<{
  open: boolean;
  targetUser: AdminUserItem | null;
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

const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

watch(
  () => [props.open, props.targetUser] as const,
  ([isOpen]: readonly [boolean, AdminUserItem | null]) => {
    if (!isOpen) return;
    newPassword.value = '';
    confirmPassword.value = '';
    showPassword.value = false;
    errorMessage.value = null;
  },
  { immediate: true },
);

async function handleSubmit() {
  if (!props.targetUser || isSubmitting.value) return;
  errorMessage.value = null;

  if (newPassword.value.length < 12) {
    errorMessage.value = 'Kata sandi baru minimal harus 12 karakter.';
    return;
  }
  if (newPassword.value.length > 128) {
    errorMessage.value = 'Kata sandi maksimal 128 karakter.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.';
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await $fetch<{ item: AdminUserItem }>(
      `/api/admin/users/${props.targetUser.id}`,
      {
        method: 'PATCH',
        body: { password: newPassword.value },
        credentials: 'include',
      },
    );

    toast.add({
      title: 'Kata Sandi Diperbarui',
      description: `Kata sandi lokal untuk ${res.item.email} berhasil diubah.`,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    });

    emit('saved', res.item);
    modalOpen.value = false;
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; message?: string };
    errorMessage.value =
      fetchErr.data?.message || fetchErr.message || 'Gagal memperbarui kata sandi akun admin.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Ganti Kata Sandi Akun Admin"
    description="Khusus Administrator Utama. Perubahan kata sandi langsung berlaku dan mencabut sesi lama akun target."
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="() => { void handleSubmit(); }">
        <div
          v-if="targetUser"
          class="rounded-xl border border-[#141917]/[0.08] bg-[#F6F5F1] px-3.5 py-2.5 text-xs"
        >
          <div class="font-bold text-[#141917]">{{ targetUser.name }}</div>
          <div class="text-[#4A524E] mt-0.5">{{ targetUser.email }}</div>
        </div>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :title="errorMessage"
        />

        <UFormField label="Kata Sandi Baru" name="newPassword" required>
          <UInput
            v-model="newPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Minimal 12 karakter"
            icon="i-lucide-lock"
            autocomplete="new-password"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                class="min-w-8 min-h-8"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="() => { showPassword = !showPassword; }"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Konfirmasi Kata Sandi Baru" name="confirmPassword" required>
          <UInput
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Ulangi kata sandi baru"
            icon="i-lucide-check-check"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-3 border-t border-[#141917]/[0.08]">
          <UButton color="neutral" variant="ghost" @click="() => { modalOpen = false; }">
            Batal
          </UButton>
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-key-round"
            :loading="isSubmitting"
          >
            Simpan Kata Sandi
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
