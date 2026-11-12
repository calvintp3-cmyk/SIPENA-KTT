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
    <strong v-if="span.type === 'bold'" class="font-semibold text-slate-900">
      {{ span.text }}
    </strong>
    <em v-else-if="span.type === 'italic'" class="italic text-slate-800">
      {{ span.text }}
    </em>
    <code
      v-else-if="span.type === 'code'"
      class="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] font-semibold text-slate-900 border border-slate-200/80"
    >
      {{ span.text }}
    </code>
    <a
      v-else-if="span.type === 'link' && span.href && isSafeHttpUrl(span.href)"
      :href="span.href"
      target="_blank"
      rel="noopener noreferrer"
      class="text-indigo-700 underline underline-offset-2 hover:text-indigo-900 font-medium"
    >
      {{ span.text }}
    </a>
    <button
      v-else-if="span.type === 'cite' && span.citeNum"
      type="button"
      title="Sorot kartu sumber bukti"
      class="inline-flex items-center min-h-6 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold tabular-nums align-baseline transition-colors cursor-pointer"
      @click="() => { emit('cite', span.citeNum!); }"
    >
      {{ span.text }}
    </button>
    <template v-else>{{ span.text }}</template>
  </template>
</template>

