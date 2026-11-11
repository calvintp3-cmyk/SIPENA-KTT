<!-- app/components/public/PhenomenonFeedCard.vue -->
<script setup lang="ts">
import { formatDateId, formatPeriodLabel } from '#shared/utils/period';
import type { PublicArticleItem } from '~/types/sipena';

const props = defineProps<{
  article: PublicArticleItem;
}>();

const {
  getKbliLabel,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getSourceTypeLabel,
  isSafeHttpUrl,
} = usePdrbLabels();

const kbliImpactMeta = computed(() => getKbliImpactBadge(props.article.kbliImpact));
const expImpactMeta = computed(() => getExpenditureImpactBadge(props.article.expenditureImpact));
const hasExternalUrl = computed(() => isSafeHttpUrl(props.article.url));
</script>

<template>
  <UCard class="hover:ring-slate-300 transition-shadow">
    <article class="space-y-3.5">
      <!-- Metadata Atas -->
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1 font-mono tabular-nums font-medium text-slate-700"
          >
            <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-slate-400" />
            {{ formatDateId(article.publishedAt) }}
          </span>
          <span class="text-slate-300">•</span>
          <span class="font-medium text-slate-700">{{ article.sourcePortal }}</span>
          <UBadge color="neutral" variant="outline" size="xs">
            {{ getSourceTypeLabel(article.sourceType) }}
          </UBadge>
        </div>

        <UBadge color="primary" variant="subtle" size="xs" class="font-mono tabular-nums">
          {{ formatPeriodLabel(article.quarter, article.year) }}
        </UBadge>
      </div>

      <!-- Judul & Ringkasan Berita -->
      <div class="space-y-1.5">
        <h3 class="text-base sm:text-lg font-semibold leading-snug text-slate-900">
          {{ article.title }}
        </h3>
        <p class="text-sm leading-relaxed text-slate-700">
          {{ article.summary || 'Ringkasan tidak tersedia.' }}
        </p>
      </div>

      <!-- Panel Pemetaan Dua Sisi PDRB -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100"
      >
        <div class="rounded-lg bg-slate-50/90 border border-slate-200/70 p-2.5 space-y-1.5">
          <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sisi Lapangan Usaha (KBLI)
          </div>
          <div class="text-xs font-semibold text-slate-800 leading-snug">
            {{ getKbliLabel(article.kbliCategory, true) }}
          </div>
          <div>
            <UBadge
              :color="kbliImpactMeta.color"
              variant="subtle"
              size="sm"
              :icon="kbliImpactMeta.icon"
            >
              {{ kbliImpactMeta.label }}
            </UBadge>
          </div>
        </div>

        <div class="rounded-lg bg-slate-50/90 border border-slate-200/70 p-2.5 space-y-1.5">
          <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sisi Pengeluaran PDRB
          </div>
          <div class="text-xs font-semibold text-slate-800 leading-snug">
            {{ getExpenditureLabel(article.expenditureComponent, true) }}
          </div>
          <div>
            <UBadge
              :color="expImpactMeta.color"
              variant="subtle"
              size="sm"
              :icon="expImpactMeta.icon"
            >
              {{ expImpactMeta.label }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Footer Sumber Asli -->
      <div class="flex items-center justify-between gap-2 pt-1">
        <span class="text-[11px] text-slate-400">
          Status: Terverifikasi Nerwilis
        </span>

        <UButton
          v-if="hasExternalUrl"
          :to="article.url"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-external-link"
        >
          Baca Berita Asli
        </UButton>
        <span v-else class="text-xs text-slate-500 font-mono truncate max-w-xs" :title="article.url">
          Sumber: {{ article.url }}
        </span>
      </div>
    </article>
  </UCard>
</template>

