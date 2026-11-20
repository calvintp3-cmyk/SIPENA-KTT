<!-- app/components/admin/synthesis/SynthesisDiscardModal.vue -->
<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
  >
    <template #body>
      <p class="text-sm text-ink-secondary leading-relaxed text-pretty">
        {{ description }}
      </p>
    </template>

    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          autofocus
          color="neutral"
          variant="subtle"
          @click="emit('cancel')"
        >
          Tetap di Editor
        </UButton>
        <UButton
          color="warning"
          @click="emit('confirm')"
        >
          Buang Perubahan &amp; Lanjutkan
        </UButton>
      </div>
    </template>
  </UModal>
</template>
