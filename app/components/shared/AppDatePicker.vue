<!-- app/components/shared/AppDatePicker.vue -->
<script setup lang="ts">
import { parseDate } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';

interface Props {
  modelValue?: string | null;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Pilih tanggal',
  size: 'sm',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);

const calendarValue = computed<DateValue | undefined>({
  get() {
    if (!props.modelValue) return undefined;
    try {
      const dateStr = props.modelValue.slice(0, 10);
      return parseDate(dateStr);
    } catch {
      return undefined;
    }
  },
  set(val: DateValue | undefined) {
    if (!val) {
      emit('update:modelValue', '');
    } else {
      emit('update:modelValue', val.toString());
      isOpen.value = false;
    }
  },
});

const minValue = computed<DateValue | undefined>(() => {
  if (!props.min) return undefined;
  try {
    return parseDate(props.min.slice(0, 10));
  } catch {
    return undefined;
  }
});

const maxValue = computed<DateValue | undefined>(() => {
  if (!props.max) return undefined;
  try {
    return parseDate(props.max.slice(0, 10));
  } catch {
    return undefined;
  }
});

const formattedDisplay = computed<string>(() => {
  if (!props.modelValue) return '';
  try {
    const parts = props.modelValue.slice(0, 10).split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
    return props.modelValue;
  } catch {
    return props.modelValue;
  }
});

function handleClear(e: Event) {
  e.stopPropagation();
  emit('update:modelValue', '');
  isOpen.value = false;
}
</script>

<template>
  <UPopover v-model:open="isOpen">
    <UButton
      color="neutral"
      variant="outline"
      :size="size"
      :disabled="disabled"
      :aria-label="ariaLabel || placeholder"
      class="w-full justify-between font-normal text-left border-border-control hover:border-brand-primary bg-white cursor-pointer"
      :class="!modelValue ? 'text-ink-muted' : 'text-ink-primary font-medium font-mono'"
    >
      <span class="inline-flex items-center gap-2 truncate">
        <UIcon name="i-solar-calendar-line-duotone" class="w-4 h-4 text-ink-secondary shrink-0" />
        <span class="truncate">{{ formattedDisplay || placeholder }}</span>
      </span>

      <span class="inline-flex items-center gap-1 shrink-0 ml-1">
        <button
          v-if="modelValue && !disabled"
          type="button"
          aria-label="Hapus tanggal terpilih"
          class="p-0.5 rounded-full hover:bg-surface-subtle text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
          @click="handleClear"
        >
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>
        <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-ink-muted shrink-0" />
      </span>
    </UButton>

    <template #content>
      <div class="p-2 bg-white rounded-xl shadow-lg border border-border-hairline">
        <UCalendar
          v-model="calendarValue"
          :min-value="minValue"
          :max-value="maxValue"
          locale="id-ID"
          color="primary"
          class="font-sans"
        />
        <div v-if="modelValue" class="mt-2 pt-2 border-t border-border-hairline flex justify-end">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-rotate-ccw"
            @click="handleClear"
          >
            Hapus Pilihan
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
