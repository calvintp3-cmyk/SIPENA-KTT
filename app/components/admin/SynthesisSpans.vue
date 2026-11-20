<!-- app/components/admin/SynthesisSpans.vue -->
<script setup lang="ts">
import type { BrsInlineSpan } from '#shared/utils/markdown-brs';

defineProps<{
  spans: BrsInlineSpan[];
}>();

const emit = defineEmits<{
  cite: [citeNum: number];
}>();

const { isSafeHttpUrl } = usePdrbLabels();
</script>

<template>
  <template v-for="(span, idx) in spans" :key="idx">
    <strong v-if="span.type === 'bold'" class="font-semibold text-ink-primary">
      {{ span.text }}
    </strong>
    <em v-else-if="span.type === 'italic'" class="italic text-ink-primary">
      {{ span.text }}
    </em>
    <code
      v-else-if="span.type === 'code'"
      class="rounded bg-surface-subtle px-1.5 py-0.5 text-[12px] font-semibold text-ink-primary border border-border-hairline"
    >
      {{ span.text }}
    </code>
    <a
      v-else-if="span.type === 'link' && span.href && isSafeHttpUrl(span.href)"
      :href="span.href"
      target="_blank"
      rel="noopener noreferrer"
      class="text-brand-primary underline underline-offset-2 hover:text-[#072B20] font-medium"
    >
      {{ span.text }}
    </a>
    <button
      v-else-if="span.type === 'cite' && span.citeNum"
      type="button"
      title="Sorot kartu sumber bukti"
      class="inline-flex items-center min-h-6 px-1.5 py-0.5 mx-0.5 rounded-md bg-brand-tint hover:bg-[#d0e7dc] text-brand-primary border border-brand-border text-[11px] font-bold tabular-nums align-baseline transition-colors cursor-pointer font-mono"
      @click="() => { emit('cite', span.citeNum!); }"
    >
      {{ span.text }}
    </button>
    <template v-else>{{ span.text }}</template>
  </template>
</template>
