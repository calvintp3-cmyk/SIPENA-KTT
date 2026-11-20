<!-- app/components/admin/review/ReviewQueueCard.vue -->
<script setup lang="ts">
import { LlmStatusEnum, VerificationStatusEnum } from '#shared/enums/pdrb';
import { formatDateId, toRomanQuarter } from '#shared/utils/period';
import type { AdminArticleItem } from '~/types/sipena';

const props = defineProps<{
  article: AdminArticleItem;
  isSelected: boolean;
  isInspected: boolean;
  isBusy: boolean;
  activeStatus: string;
}>();

const emit = defineEmits<{
  select: [];
  toggleSelect: [];
  verify: [];
  ignore: [];
  openMobile: [];
}>();

const {
  getLlmStatusBadge,
  getKbliClusterTheme,
  getKbliShortCodeName,
  getExpenditureColorTheme,
  getExpenditureLabel,
} = usePdrbLabels();
</script>

<template>
  <article
    class="obs-panel rounded-xl p-4 transition-colors relative"
    :class="
      isInspected
        ? 'ring-2 ring-brand-primary border-brand-primary shadow-[0_8px_24px_-10px_rgba(11,61,46,0.28)]'
        : 'hover:border-brand-primary/30 hover:bg-canvas'
    "
  >
    <div class="flex items-start gap-3">
      <div class="pt-0.5 shrink-0 relative z-10">
        <UCheckbox
          :model-value="isSelected"
          :aria-label="`Pilih ${article.title}`"
          size="sm"
          @update:model-value="emit('toggleSelect')"
        />
      </div>

      <div class="min-w-0 flex-1 space-y-2">
        <!-- Metadata Row -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary tabular-nums">
            <span class="font-bold text-ink-primary">{{ formatDateId(article.publishedAt) }}</span>
            <span aria-hidden="true">•</span>
            <span class="truncate max-w-[150px] font-medium">{{ article.sourcePortal }}</span>
            <span aria-hidden="true">•</span>
            <span class="px-2 py-0.5 rounded-full bg-brand-tint border border-brand-border text-brand-primary text-[11px] font-semibold font-mono">
              TW {{ toRomanQuarter(article.quarter) }} {{ article.year }}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <UBadge
              v-if="article.llmStatus === LlmStatusEnum.FAILED"
              :color="getLlmStatusBadge(article.llmStatus).color"
              variant="subtle"
              size="xs"
              :icon="getLlmStatusBadge(article.llmStatus).icon"
            >
              AI Gagal
            </UBadge>
            <UBadge
              v-else-if="article.llmConfidence !== null"
              color="neutral"
              variant="subtle"
              size="xs"
              class="tabular-nums"
            >
              AI {{ Math.round(article.llmConfidence * 100) }}%
            </UBadge>
            <UBadge
              v-if="article.isEconomicPhenomenon === false"
              color="neutral"
              variant="outline"
              size="xs"
            >
              Non-Ekonomi
            </UBadge>
          </div>
        </div>

        <!-- Title (stretched card button for accessible selection) -->
        <h2 class="text-sm font-bold text-ink-primary leading-snug font-display">
          <button
            type="button"
            class="w-full text-left line-clamp-2 hover:text-brand-primary transition-colors rounded cursor-pointer after:content-[''] after:absolute after:inset-0 after:z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            @click="emit('select')"
          >
            {{ article.title }}
          </button>
        </h2>
        <p class="text-xs text-ink-secondary line-clamp-2 leading-relaxed text-pretty">
          {{ article.summary || article.snippetText }}
        </p>

        <!-- Dual-Axis Preview Chips + Quick Actions -->
        <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-hairline">
          <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              class="px-2.5 py-0.5 rounded-full border font-semibold font-mono"
              :class="
                article.kbliCategory
                  ? getKbliClusterTheme(article.kbliCategory).pillClass
                  : 'bg-[#FEF3C7] border-ochre/30 text-ochre-ink'
              "
            >
              {{ article.kbliCategory ? getKbliShortCodeName(article.kbliCategory) : 'KBLI Belum Dipetakan' }}
            </span>
            <span
              class="px-2.5 py-0.5 rounded-full border font-semibold font-mono"
              :class="
                article.expenditureComponent
                  ? getExpenditureColorTheme(article.expenditureComponent).pillClass
                  : 'bg-[#FEF3C7] border-ochre/30 text-ochre-ink'
              "
            >
              {{ article.expenditureComponent ? getExpenditureLabel(article.expenditureComponent, false) : 'Pengeluaran Kosong' }}
            </span>
          </div>

          <div class="flex items-center gap-1.5 relative z-10">
            <button
              v-if="activeStatus !== VerificationStatusEnum.VERIFIED"
              type="button"
              :disabled="isBusy"
              class="min-h-8 px-2.5 py-1 rounded-lg bg-brand-tint hover:bg-[#d0e7dc] text-brand-primary border border-brand-border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors tactile-press"
              @click="emit('verify')"
            >
              <UIcon name="i-lucide-check" class="w-3 h-3" />
              <span>Verifikasi</span>
            </button>

            <button
              type="button"
              class="lg:hidden min-h-8 px-2.5 py-1 rounded-lg bg-white border border-border-control text-ink-primary text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer tactile-press"
              @click="emit('openMobile')"
            >
              <UIcon name="i-lucide-pencil" class="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              v-if="activeStatus !== VerificationStatusEnum.IGNORED"
              type="button"
              :disabled="isBusy"
              class="min-h-8 px-2.5 py-1 rounded-lg hover:bg-surface-subtle text-ink-secondary text-[11px] font-semibold cursor-pointer transition-colors tactile-press"
              @click="emit('ignore')"
            >
              Abaikan
            </button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
