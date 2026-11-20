<!-- app/components/admin/HighlightedSnippetBox.vue -->
<script setup lang="ts">
import { parseEconomicSnippetSegments } from '~/utils/snippetHighlight';

const props = withDefaults(
  defineProps<{
    text: string;
    maxHeightClass?: string;
  }>(),
  {
    maxHeightClass: 'max-h-60 overflow-y-auto',
  },
);

const segments = computed(() => parseEconomicSnippetSegments(props.text || ''));
</script>

<template>
  <div
    class="saas-scroll rounded-xl bg-canvas border border-border-hairline p-4 text-sm text-ink-primary leading-relaxed whitespace-pre-line"
    :class="maxHeightClass"
  >
    <template v-if="segments.length > 0">
      <template v-for="(seg, idx) in segments" :key="idx">
        <mark
          v-if="seg.kind === 'location'"
          class="bg-brand-tint text-brand-primary px-1 rounded font-semibold"
        >{{ seg.text }}</mark>
        <mark
          v-else-if="seg.kind === 'metric'"
          class="bg-ochre-surface text-ochre-ink px-1 rounded font-mono font-semibold"
        >{{ seg.text }}</mark>
        <template v-else>{{ seg.text }}</template>
      </template>
    </template>
    <div v-else class="text-ink-muted italic text-xs">
      Kutipan fenomena ekonomi belum tersedia.
    </div>
  </div>
</template>
