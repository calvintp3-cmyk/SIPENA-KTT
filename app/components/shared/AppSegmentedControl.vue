<!-- app/components/shared/AppSegmentedControl.vue -->
<script setup lang="ts" generic="T extends string | number">
export interface SegmentItem<Val extends string | number = string | number> {
  value: Val;
  label: string;
  icon?: string;
  badge?: number | string;
  badgeToneClass?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: T;
    items: SegmentItem<T>[];
    ariaLabel?: string;
    variant?: 'brand' | 'surface';
    size?: 'xs' | 'sm' | 'md';
    block?: boolean;
    compact?: boolean;
  }>(),
  {
    ariaLabel: 'Segmented Control',
    variant: 'surface',
    size: 'sm',
    block: false,
    compact: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: T];
  change: [value: T];
}>();

const containerRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string | number, HTMLElement | null>>({});

const pillStyle = ref<{
  left: string;
  top: string;
  width: string;
  height: string;
  opacity: number;
}>({
  left: '0px',
  top: '0px',
  width: '0px',
  height: '0px',
  opacity: 0,
});

const isMeasured = ref(false);

function updatePillPosition() {
  if (!containerRef.value) return;
  const activeEl = itemRefs.value[props.modelValue];
  if (!activeEl) {
    pillStyle.value.opacity = 0;
    return;
  }

  const containerRect = containerRef.value.getBoundingClientRect();
  const activeRect = activeEl.getBoundingClientRect();

  pillStyle.value = {
    left: `${activeRect.left - containerRect.left}px`,
    top: `${activeRect.top - containerRect.top}px`,
    width: `${activeRect.width}px`,
    height: `${activeRect.height}px`,
    opacity: 1,
  };
  isMeasured.value = true;
}

function selectItem(val: T) {
  if (props.modelValue === val) return;
  emit('update:modelValue', val);
  emit('change', val);
}

function handleKeydown(e: KeyboardEvent, index: number) {
  let nextIdx = index;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    nextIdx = (index + 1) % props.items.length;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    nextIdx = (index - 1 + props.items.length) % props.items.length;
  } else if (e.key === 'Home') {
    e.preventDefault();
    nextIdx = 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    nextIdx = props.items.length - 1;
  } else {
    return;
  }

  const nextItem = props.items[nextIdx];
  if (nextItem) {
    selectItem(nextItem.value);
    nextTick(() => {
      itemRefs.value[nextItem.value]?.focus();
    });
  }
}

watch(
  () => props.modelValue,
  () => {
    nextTick(updatePillPosition);
  },
);

watch(
  () => props.items,
  () => {
    nextTick(updatePillPosition);
  },
  { deep: true },
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  nextTick(() => {
    updatePillPosition();
    if (containerRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updatePillPosition();
      });
      resizeObserver.observe(containerRef.value);
    }
  });
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div
    ref="containerRef"
    role="group"
    :aria-label="ariaLabel"
    class="relative inline-flex items-center p-1 rounded-xl bg-surface-subtle border border-border-hairline select-none font-mono"
    :class="[
      block ? 'w-full flex' : 'inline-flex',
      compact ? 'gap-0.5' : 'gap-1',
    ]"
  >
    <!-- Sliding Pill Indicator -->
    <div
      aria-hidden="true"
      class="absolute pointer-events-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-lg"
      :class="[
        variant === 'brand'
          ? 'bg-brand-primary shadow-xs'
          : 'bg-white border border-brand-border/60 shadow-2xs',
        isMeasured ? 'opacity-100' : 'opacity-0',
      ]"
      :style="{
        transform: `translate3d(${pillStyle.left}, ${pillStyle.top}, 0)`,
        width: pillStyle.width,
        height: pillStyle.height,
      }"
    />

    <!-- Segment Buttons -->
    <button
      v-for="(item, idx) in items"
      :key="item.value"
      :ref="(el) => { itemRefs[item.value] = el as HTMLElement | null; }"
      type="button"
      :aria-pressed="modelValue === item.value"
      tabindex="0"
      class="relative z-10 inline-flex items-center justify-center gap-1.5 transition-colors duration-150 rounded-lg cursor-pointer font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-[0.98]"
      :class="[
        block ? 'flex-1' : '',
        size === 'xs' ? 'min-h-7 px-2 text-[11px]' : size === 'sm' ? 'min-h-8 px-2.5 py-1 text-xs' : 'min-h-9 px-3.5 py-1.5 text-xs sm:text-[13px]',
        modelValue === item.value
          ? variant === 'brand'
            ? 'text-white font-bold'
            : 'text-brand-primary font-bold'
          : 'text-ink-secondary hover:text-ink-primary font-medium',
        // Fallback for SSR / pre-measurement
        !isMeasured && modelValue === item.value
          ? variant === 'brand'
            ? 'bg-brand-primary text-white shadow-xs'
            : 'bg-white text-brand-primary border border-brand-border/60 shadow-2xs'
          : '',
      ]"
      @click="selectItem(item.value)"
      @keydown="handleKeydown($event, idx)"
    >
      <UIcon
        v-if="item.icon"
        :name="item.icon"
        class="shrink-0 transition-colors"
        :class="[
          size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5',
          modelValue === item.value && variant === 'brand'
            ? 'text-white'
            : modelValue === item.value
              ? 'text-brand-primary'
              : 'text-ink-muted',
        ]"
      />
      <span class="truncate">{{ item.label }}</span>
      <span
        v-if="item.badge !== undefined"
        class="px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums border shrink-0 transition-colors"
        :class="[
          item.badgeToneClass || (
            modelValue === item.value && variant === 'brand'
              ? 'bg-white/20 text-white border-white/30'
              : modelValue === item.value
                ? 'bg-brand-tint text-brand-primary border-brand-border'
                : 'bg-surface-subtle text-ink-muted border-border-hairline'
          ),
        ]"
      >
        {{ item.badge }}
      </span>
    </button>
  </div>
</template>
