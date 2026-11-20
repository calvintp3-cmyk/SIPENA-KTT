<!-- app/components/admin/review/ReviewBatchBar.vue -->
<script setup lang="ts">
import { VerificationStatusEnum } from '#shared/enums/pdrb';

defineProps<{
  selectedCount: number;
  activeStatus: string;
  isSidebarCollapsed: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  verify: [];
  ignore: [];
  clear: [];
}>();
</script>

<template>
  <div
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-brand-primary text-white rounded-2xl shadow-[0_20px_50px_rgba(11,61,46,0.38)] border border-brand-border/30 px-4 py-2.5 flex flex-wrap items-center gap-3 transition-[left] duration-200 font-display"
    :class="isSidebarCollapsed ? 'lg:left-[calc(50%+2.5rem)]' : 'lg:left-[calc(50%+8rem)]'"
  >
    <span class="text-xs font-bold tabular-nums font-mono">
      {{ selectedCount }} Artikel Dipilih
    </span>

    <div class="flex items-center gap-2">
      <button
        v-if="activeStatus !== VerificationStatusEnum.VERIFIED"
        type="button"
        :disabled="loading"
        class="min-h-8 px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-white text-brand-primary hover:bg-surface-subtle disabled:opacity-50 cursor-pointer shadow-2xs font-display"
        @click="emit('verify')"
      >
        <UIcon name="i-lucide-check" class="w-3.5 h-3.5" />
        <span>Verifikasi</span>
      </button>

      <button
        v-if="activeStatus !== VerificationStatusEnum.IGNORED"
        type="button"
        :disabled="loading"
        class="min-h-8 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
        @click="emit('ignore')"
      >
        Abaikan
      </button>

      <button
        type="button"
        :disabled="loading"
        class="min-h-8 px-2.5 py-1.5 rounded-xl text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
        @click="emit('clear')"
      >
        Batal
      </button>
    </div>
  </div>
</template>
