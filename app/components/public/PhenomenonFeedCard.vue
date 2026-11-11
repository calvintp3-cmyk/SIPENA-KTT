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
  getKbliClusterTheme,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  getExpenditureColorTheme,
  isSafeHttpUrl,
} = usePdrbLabels();

const copied = ref(false);
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer);
});

const clusterTheme = computed(() => getKbliClusterTheme(props.article.kbliCategory));
const expenditureTheme = computed(() =>
  getExpenditureColorTheme(props.article.expenditureComponent),
);
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
        pillClass: 'text-emerald-800 bg-emerald-50 border-emerald-200/90',
        dotClass: 'bg-emerald-600',
      };
    case ArticleSourceTypeEnum.NATIONAL:
      return {
        label: 'Nasional',
        pillClass: 'text-indigo-800 bg-indigo-50 border-indigo-200/90',
        dotClass: 'bg-indigo-600',
      };
    case ArticleSourceTypeEnum.MANUAL:
    default:
      return {
        label: 'Input Manual',
        pillClass: 'text-amber-800 bg-amber-50 border-amber-200/90',
        dotClass: 'bg-amber-600',
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
    class="group saas-card saas-card-interactive hover:-translate-y-0.5 rounded-2xl overflow-hidden pl-6 pr-5 py-5 sm:pl-7 sm:pr-6 sm:py-6 flex flex-col gap-3.5 relative cursor-pointer"
    @click="handleCardClick"
  >
    <!-- Dynamic KBLI Cluster Vertical Accent Stripe -->
    <div
      aria-hidden="true"
      class="absolute inset-y-0 left-0 w-1.5"
      :class="clusterTheme.accentBarClass"
    />

    <!-- Top Metadata Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <a
          v-if="hasExternalUrl"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 px-2.5 py-0.5 rounded-full border border-slate-200 transition-colors"
          @click.stop
        >
          <span class="truncate max-w-[180px] sm:max-w-[240px]">{{ article.sourcePortal }}</span>
          <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3 text-slate-400 shrink-0" />
        </a>
        <span
          v-else
          class="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200"
        >
          {{ article.sourcePortal }}
        </span>

        <span
          class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
          :class="scopeMeta.pillClass"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="scopeMeta.dotClass" />
          {{ scopeMeta.label }}
        </span>

        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
          :class="clusterTheme.pillClass"
        >
          {{ clusterTheme.label }}
        </span>

        <span v-if="timeWitaText" class="text-[11px] font-medium tabular-nums text-slate-500">
          {{ timeWitaText }}
        </span>
        <span class="text-slate-300 text-xs">•</span>
        <span class="text-[11px] font-semibold tabular-nums text-slate-600">
          {{ periodShortLabel }}
        </span>
      </div>

      <button
        type="button"
        aria-label="Salin Sitasi Fenomena"
        title="Salin format sitasi BPS"
        class="min-w-8 min-h-8 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shrink-0"
        @click.stop="copyCitation"
      >
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-solar-copy-bold-duotone'"
          class="w-4 h-4"
          :class="copied ? 'text-emerald-600' : ''"
        />
      </button>
    </div>

    <!-- Title & Brief Summary -->
    <h2 class="text-[17px] sm:text-lg font-bold leading-snug tracking-tight text-[#0F172A]">
      <button
        type="button"
        class="text-left group-hover:text-indigo-700 transition-colors rounded"
        @click="() => { emit('select', article); }"
      >
        {{ article.title }}
      </button>
    </h2>

    <p class="text-[13px] sm:text-sm text-slate-600 leading-relaxed">
      {{ article.summary || 'Ringkasan terverifikasi belum tersedia untuk catatan ini.' }}
    </p>

    <!-- Dual-Axis Executive Strip Footer -->
    <div
      class="bg-slate-50/90 border-t border-slate-200/80 pl-6 pr-5 py-3.5 sm:pl-7 sm:pr-6 -ml-6 -mr-5 sm:-ml-7 sm:-mr-6 -mb-5 sm:-mb-6 rounded-b-2xl grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs mt-1"
    >
      <!-- Left: Lapangan Usaha (KBLI) -->
      <div class="flex flex-col gap-1.5 min-w-0">
        <div class="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span class="w-2 h-2 rounded-full shrink-0" :class="clusterTheme.accentBarClass" />
          <span>Lapangan Usaha (KBLI)</span>
        </div>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-semibold text-[#0F172A] truncate min-w-0"
            :title="getKbliLabel(article.kbliCategory, true)"
          >
            {{ getKbliLabel(article.kbliCategory, true).replace(' - ', ' • ') }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shrink-0"
            :class="kbliImpactToneClass"
          >
            <UIcon :name="kbliImpactMeta.icon" class="w-3 h-3" />
            <span>{{ kbliImpactMeta.label }}</span>
          </span>
        </div>
      </div>

      <!-- Right: Pengeluaran PDRB -->
      <div class="flex flex-col gap-1.5 md:border-l md:border-slate-200/80 md:pl-4 min-w-0">
        <div class="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span class="w-2 h-2 rounded-full shrink-0" :class="expenditureTheme.dotClass" />
          <span>Pengeluaran PDRB</span>
        </div>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-semibold text-[#0F172A] truncate min-w-0"
            :title="getExpenditureLabel(article.expenditureComponent, true)"
          >
            {{ getExpenditureLabel(article.expenditureComponent, true) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shrink-0"
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
