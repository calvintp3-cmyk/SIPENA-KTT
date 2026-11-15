<!-- app/components/public/PhenomenonFeedCard.vue -->
<script setup lang="ts">
import {
  formatDateTimeWita,
  getWitaDateParts,
  toRomanQuarter,
} from '#shared/utils/period';
import { getKbliFourGenerations } from '#shared/utils/kbli-concordance';
import type { PublicArticleItem } from '~/types/sipena';

const props = defineProps<{
  article: PublicArticleItem;
}>();

const emit = defineEmits<{
  select: [article: PublicArticleItem];
}>();

const toast = useToast();
const {
  getGeographicScopeBadge,
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

const kbliBridge = computed(() => {
  if (!props.article.kbliCategory) return null;
  return getKbliFourGenerations(props.article.kbliCategory);
});

const secondaryKbliImpactMeta = computed(() =>
  getKbliImpactBadge(props.article.secondaryKbliImpact),
);
const secondaryExpImpactMeta = computed(() =>
  getExpenditureImpactBadge(props.article.secondaryExpenditureImpact),
);

const secondaryKbliImpactToneClass = computed(() => {
  switch (secondaryKbliImpactMeta.value.color) {
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

const secondaryExpImpactToneClass = computed(() => {
  switch (secondaryExpImpactMeta.value.color) {
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

const scopeMeta = computed(() =>
  getGeographicScopeBadge(props.article.geographicScope, props.article.sourceType),
);

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
    class="group saas-card saas-card-interactive hover:-translate-y-0.5 rounded-2xl border-t-2 overflow-hidden flex flex-col gap-3.5 relative p-5 sm:p-6 pb-0 sm:pb-0"
    :style="{ borderTopColor: clusterTheme.hex }"
  >
    <!-- Top Metadata Header (Clean restraint: max 2 compact pills + plain text meta) -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 min-w-0 text-xs">
        <a
          v-if="hasExternalUrl"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="relative z-10 inline-flex items-center gap-1 min-h-8 font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 px-2.5 py-0.5 rounded-lg border border-slate-200 transition-colors"
        >
          <span class="truncate max-w-[180px] sm:max-w-[240px]">{{ article.sourcePortal }}</span>
          <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3 text-slate-500 shrink-0" />
        </a>
        <span
          v-else
          class="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
        >
          {{ article.sourcePortal }}
        </span>

        <span
          class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
          :class="scopeMeta.pillClass"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="scopeMeta.dotClass" />
          {{ scopeMeta.shortLabel }}
        </span>

        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span class="w-2 h-2 rounded-full shrink-0" :class="clusterTheme.accentBarClass" />
          <span>{{ clusterTheme.label }}</span>
        </span>

        <span class="text-slate-400" aria-hidden="true">•</span>

        <span v-if="timeWitaText" class="text-xs font-medium tabular-nums text-slate-600">
          {{ timeWitaText }}
        </span>
        <span class="text-xs font-semibold tabular-nums text-slate-700">
          {{ periodShortLabel }}
        </span>
      </div>

      <button
        type="button"
        aria-label="Salin Sitasi Fenomena"
        title="Salin format sitasi BPS"
        class="relative z-10 min-w-10 min-h-10 sm:min-w-9 sm:min-h-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shrink-0 cursor-pointer"
        @click="copyCitation"
      >
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-solar-copy-bold-duotone'"
          class="w-4 h-4"
          :class="copied ? 'text-emerald-700' : ''"
        />
      </button>
    </div>

    <!-- Title & Brief Summary (Stretched-link button ensures keyboard & click activation) -->
    <h2 class="text-[17px] sm:text-lg font-bold leading-snug tracking-tight text-slate-900">
      <button
        type="button"
        class="text-left group-hover:text-indigo-700 transition-colors rounded cursor-pointer after:content-[''] after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-600 focus-visible:after:ring-offset-2"
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
      class="bg-slate-50/90 border-t border-slate-200/80 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs mt-1"
    >
      <!-- Left: Lapangan Usaha (KBLI) -->
      <div class="flex flex-col gap-1.5 min-w-0">
        <div class="flex items-center justify-between gap-1.5 text-xs font-semibold text-slate-600">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full shrink-0" :class="clusterTheme.accentBarClass" />
            <span>Lapangan Usaha (KBLI 2025)</span>
          </div>
          <UPopover v-if="kbliBridge" :ui="{ content: 'w-72 sm:w-80 p-3 text-xs z-50' }">
            <button
              type="button"
              class="relative z-10 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 transition-colors cursor-pointer"
              title="Lihat padanan KBLI 2009, 2015, dan 2020"
              @click.stop
            >
              <UIcon name="i-solar-transfer-horizontal-bold-duotone" class="w-3 h-3" />
              <span>Konversi KBLI</span>
            </button>
            <template #content>
              <div class="space-y-2 p-1" @click.stop>
                <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span class="font-bold text-slate-900 flex items-center gap-1">
                    <UIcon name="i-solar-route-bold-duotone" class="w-3.5 h-3.5 text-indigo-600" />
                    Jembatan Konkordansi 4-Generasi
                  </span>
                  <span class="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">BPS KTT</span>
                </div>
                <div class="space-y-1.5 text-[11px]">
                  <div class="flex items-start gap-1.5 bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100">
                    <span class="font-bold text-indigo-900 w-16 shrink-0">KBLI 2025:</span>
                    <span class="text-slate-800 font-semibold">{{ kbliBridge.code2025 }} • {{ kbliBridge.title2025 }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span class="font-bold text-slate-700 w-16 shrink-0">KBLI 2020:</span>
                    <span class="text-slate-700">{{ kbliBridge.code2020 }} • {{ kbliBridge.title2020 }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span class="font-bold text-slate-700 w-16 shrink-0">KBLI 2015:</span>
                    <span class="text-slate-700">{{ kbliBridge.code2015 }} • {{ kbliBridge.title2015 }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span class="font-bold text-slate-700 w-16 shrink-0">KBLI 2009:</span>
                    <span class="text-slate-700">{{ kbliBridge.code2009 }} • {{ kbliBridge.title2009 }}</span>
                  </div>
                </div>
                <div class="text-[10px] text-slate-500 pt-1 border-t border-slate-100 leading-tight">
                  {{ kbliBridge.changeNotes }}
                </div>
              </div>
            </template>
          </UPopover>
        </div>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-semibold text-slate-900 truncate min-w-0"
            :title="getKbliLabel(article.kbliCategory, true)"
          >
            {{ getKbliLabel(article.kbliCategory, true) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shrink-0"
            :class="kbliImpactToneClass"
          >
            <UIcon :name="kbliImpactMeta.icon" class="w-3 h-3" />
            <span>{{ kbliImpactMeta.label }}</span>
          </span>
        </div>
        <!-- Sektor Sekunder jika ada -->
        <div
          v-if="article.secondaryKbliCategory"
          class="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]"
        >
          <span class="text-slate-600 flex items-center gap-1 truncate" :title="getKbliLabel(article.secondaryKbliCategory, true)">
            <span class="font-bold text-slate-700">+ Sekunder:</span>
            <span class="truncate">{{ getKbliLabel(article.secondaryKbliCategory, true) }}</span>
          </span>
          <span
            v-if="article.secondaryKbliImpact"
            class="text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0"
            :class="secondaryKbliImpactToneClass"
          >
            {{ secondaryKbliImpactMeta.label }}
          </span>
        </div>
      </div>

      <!-- Right: Pengeluaran PDRB -->
      <div class="flex flex-col gap-1.5 md:border-l md:border-slate-200/80 md:pl-4 min-w-0">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <span class="w-2 h-2 rounded-full shrink-0" :class="expenditureTheme.dotClass" />
          <span>Pengeluaran PDRB</span>
        </div>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-semibold text-slate-900 truncate min-w-0"
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
        <!-- Pengeluaran Sekunder jika ada -->
        <div
          v-if="article.secondaryExpenditureComponent"
          class="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]"
        >
          <span class="text-slate-600 flex items-center gap-1 truncate" :title="getExpenditureLabel(article.secondaryExpenditureComponent, true)">
            <span class="font-bold text-slate-700">+ Sekunder:</span>
            <span class="truncate">{{ getExpenditureLabel(article.secondaryExpenditureComponent, true) }}</span>
          </span>
          <span
            v-if="article.secondaryExpenditureImpact"
            class="text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0"
            :class="secondaryExpImpactToneClass"
          >
            {{ secondaryExpImpactMeta.shortLabel }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>
