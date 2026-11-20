<!-- app/components/admin/articles/ArticleDeleteModal.vue -->
<script setup lang="ts">
import type { AdminArticleItem } from '~/types/sipena';

defineProps<{
  article: AdminArticleItem | null;
  isDeleting: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  confirm: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Hapus Artikel Arsip?"
    description="Tindakan ini permanen dan akan menghapus artikel dari seluruh analitik PDRB."
  >
    <template #body>
      <p v-if="article" class="text-xs text-ink-secondary leading-relaxed">
        Anda akan menghapus: <br>
        <strong class="text-ink-primary font-bold">"{{ article.title }}"</strong>
        <br>
        <span class="text-terracotta-ink mt-2 block font-medium">
          Data klasifikasi KBLI dan Pengeluaran yang melekat pada artikel ini akan hilang.
        </span>
      </p>
    </template>

    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="open = false"
        >
          Batal
        </UButton>
        <UButton
          color="error"
          :loading="isDeleting"
          icon="i-lucide-trash-2"
          @click="emit('confirm')"
        >
          Ya, Hapus Permanen
        </UButton>
      </div>
    </template>
  </UModal>
</template>
