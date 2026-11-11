<!-- app/components/public/PhenomenonFeedCard.vue -->
<script setup lang="ts">
import { ArticleSourceTypeEnum } from '#shared/enums/pdrb';
import {
  formatDateTimeWita,
  getWitaDateParts,
  toRomanQuarter,
} from '#shared/utils/period';
import type { PublicArticleItem } from '~/types/sipena';

const props = defineProps<{
  article: PublicArticleItem;
}>();

const emit = defineEmits<{
  select: [article: PublicArticleItem];
}>();

const toast = useToast();
const {
  getKbliLabel,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  isSafeHttpUrl,
} = usePdrbLabels();

const copied = ref(false);
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer);
});

const kbliImpactMeta = computed(() => getKbliImpactBadge(props.article.kbliImpact));
const expImpactMeta = computed(() => getExpenditureImpactBadge(props.article.expenditureImpact));
const hasExternalUrl = computed(() => isSafeHttpUrl(props.article.url));

const timeWitaText = computed(() => {
  try {
    const p = getWitaDateParts(props.article.publishedAt);
    return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} WITA`;
  } catch {
    return '';
  }
});

const periodShortLabel = computed(
  () => `TW ${toRomanQuarter(props.article.quarter)} ${props.article.year}`,
);

const scopeMeta = computed(() => {
  switch (props.article.sourceType) {
    case ArticleSourceTypeEnum.REGIONAL:
      return {
        label: 'Lokal KTT',
        pillClass: 'text-teal-800 bg-teal-50 border-teal-200/80',
        dotClass: 'bg-teal-600',
      };
    case ArticleSourceTypeEnum.NATIONAL:
      return {
        label: 'Nasional',
        pillClass: 'text-slate-700 bg-slate-100 border-slate-200',
        dotClass: 'bg-slate-500',
      };
    case ArticleSourceTypeEnum.MANUAL:
    default:
      return {
        label: 'Input Manual',
        pillClass: 'text-sky-800 bg-sky-50 border-sky-200',
        dotClass: 'bg-sky-600',
      };
  }
});

const kbliImpactToneClass = computed(() => {
  switch (kbliImpactMeta.value.color) {
    case 'success':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'error':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'warning':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'info':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
});

const expImpactToneClass = computed(() => {
  switch (expImpactMeta.value.color) {
    case 'success':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'error':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'warning':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'info':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
});

function handleCardClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (target?.closest('a') || target?.closest('button')) return;
  emit('select', props.article);
}

async function copyCitation() {
  const citation = `[BPS KTT SIPENA] ${props.article.title}. Sumber: ${props.article.sourcePortal} (${formatDateTimeWita(props.article.publishedAt)}). Diverifikasi Tim Nerwilis BPS Kab. Tana Tidung.`;
  try {
    await navigator.clipboard.writeText(citation);
    copied.value = true;
    toast.add({
      title: 'Format sitasi disalin',
      description: 'Siap ditempel ke dokumen kerja PDRB atau laporan BRS.',
      color: 'success',
      icon: 'i-lucide-clipboard-check',
    });
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copied.value = false;
    }, 1800);
  } catch {
    toast.add({
      title: 'Gagal menyalin sitasi',
      description: 'Silakan salin manual melalui jendela detail fenomena.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
  }
}
</script>

<template>
  <article
    class="group saas-card saas-card-interactive hover:-translate-y-[1px] rounded-xl overflow-hidden p-5 sm:p-6 flex flex-col gap-3.5 relative cursor-pointer"
    @click="handleCardClick"
  >
    <!-- Top Metadata Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <a
          v-if="hasExternalUrl"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 px-2 py-0.5 rounded border border-slate-200 transition-colors"
          @click.stop
        >
          <span class="truncate max-w-[180px] sm:max-w-[240px]">{{ article.sourcePortal }}</span>
          <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3 text-slate-400 shrink-0" />
        </a>
        <span
          v-else
          class="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
        >
          {{ article.sourcePortal }}
        </span>

        <span
          class="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border"
          :class="scopeMeta.pillClass"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="scopeMeta.dotClass" />
          {{ scopeMeta.label }}
        </span>

        <span v-if="timeWitaText" class="font-mono text-[11px] tabular-nums text-[#5B677A]">
          {{ timeWitaText }}
        </span>
        <span class="text-slate-300 text-xs">•</span>
        <span class="font-mono text-[11px] tabular-nums text-[#5B677A]">
          {{ periodShortLabel }}
        </span>
      </div>

      <button
        type="button"
        aria-label="Salin Sitasi Fenomena"
        title="Salin format sitasi BPS"
        class="min-w-7 min-h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
        @click.stop="copyCitation"
      >
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          class="w-4 h-4"
          :class="copied ? 'text-emerald-600' : ''"
        />
      </button>
    </div>

    <!-- Title & Brief Summary -->
    <h2 class="text-[17px] sm:text-lg font-bold leading-snug tracking-tight text-[#0B1220]">
      <button
        type="button"
        class="text-left group-hover:text-teal-700 transition-colors rounded"
        @click="emit('select', article)"
      >
        {{ article.title }}
      </button>
    </h2>

    <p class="text-[13px] sm:text-sm text-[#334155] leading-relaxed">
      {{ article.summary || 'Ringkasan terverifikasi belum tersedia untuk catatan ini.' }}
    </p>

    <!-- Dual-Axis Executive Strip Footer -->
    <div
      class="bg-[#F8FAFC] border-t border-slate-200/80 px-5 sm:px-6 py-3.5 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 rounded-b-xl grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-1"
    >
      <!-- Left: Lapangan Usaha (KBLI) -->
      <div class="flex flex-col gap-1.5 min-w-0">
        <span class="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
          Lapangan Usaha (KBLI)
        </span>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-medium text-slate-800 truncate min-w-0"
            :title="getKbliLabel(article.kbliCategory, true)"
          >
            KBLI {{ getKbliLabel(article.kbliCategory, true).replace(' - ', ' • ') }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[11px] font-semibold shrink-0"
            :class="kbliImpactToneClass"
          >
            <UIcon :name="kbliImpactMeta.icon" class="w-3 h-3" />
            <span>{{ kbliImpactMeta.label }}</span>
          </span>
        </div>
      </div>

      <!-- Right: Pengeluaran PDRB -->
      <div class="flex flex-col gap-1.5 md:border-l md:border-slate-200/80 md:pl-4 min-w-0">
        <span class="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
          Pengeluaran PDRB
        </span>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-medium text-slate-800 truncate min-w-0"
            :title="getExpenditureLabel(article.expenditureComponent, true)"
          >
            {{ getExpenditureLabel(article.expenditureComponent, true) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[11px] font-semibold shrink-0"
            :class="expImpactToneClass"
          >
            <UIcon :name="expImpactMeta.icon" class="w-3 h-3" />
            <span>{{ expImpactMeta.shortLabel }}</span>
          </span>
        </div>
      </div>
    </div>
  </article>
</template>
