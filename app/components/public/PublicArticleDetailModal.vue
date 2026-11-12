<!-- app/components/public/PublicArticleDetailModal.vue -->
<script setup lang="ts">
import {
  PDRB_6_EXPENDITURE_LIST,
  getPdrb17GroupForKbli,
} from '#shared/enums/pdrb';
import { formatDateTimeWita, toRomanQuarter } from '#shared/utils/period';
import type { PublicArticleItem } from '~/types/sipena';

const props = defineProps<{
  open: boolean;
  article: PublicArticleItem | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
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

const modalOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const copied = ref(false);
let resetCopyTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (resetCopyTimer) clearTimeout(resetCopyTimer);
});

watch(
  () => props.article?.id,
  () => {
    copied.value = false;
  },
);

const clusterTheme = computed(() => getKbliClusterTheme(props.article?.kbliCategory));
const expenditureTheme = computed(() =>
  getExpenditureColorTheme(props.article?.expenditureComponent),
);

const scopeMeta = computed(() =>
  getGeographicScopeBadge(props.article?.geographicScope, props.article?.sourceType),
);

const kbliGroupMeta = computed(() => {
  if (!props.article?.kbliCategory) return null;
  return getPdrb17GroupForKbli(props.article.kbliCategory);
});

const expenditureMeta = computed(() => {
  if (!props.article?.expenditureComponent) return null;
  return PDRB_6_EXPENDITURE_LIST.find((e) => e.code === props.article?.expenditureComponent) ?? null;
});

const kbliImpactBadge = computed(() => getKbliImpactBadge(props.article?.kbliImpact));
const expImpactBadge = computed(() => getExpenditureImpactBadge(props.article?.expenditureImpact));
const hasSafeUrl = computed(() => isSafeHttpUrl(props.article?.url));

async function handleCopyCitation() {
  if (!props.article) return;
  const citation = `[BPS KTT SIPENA] ${props.article.title}. Sumber: ${props.article.sourcePortal} (${formatDateTimeWita(props.article.publishedAt)}). Diverifikasi Tim Nerwilis BPS Kab. Tana Tidung (ID ${props.article.id.slice(0, 8).toUpperCase()}).`;
  try {
    await navigator.clipboard.writeText(citation);
    copied.value = true;
    toast.add({
      title: 'Format sitasi BPS disalin',
      color: 'success',
      icon: 'i-lucide-clipboard-check',
    });
    if (resetCopyTimer) clearTimeout(resetCopyTimer);
    resetCopyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    toast.add({
      title: 'Clipboard tidak tersedia',
      description: 'Salin teks secara manual dari dialog.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="article?.title || 'Detail Fenomena Ekonomi'"
    :description="
      article
        ? `${article.sourcePortal} • ${formatDateTimeWita(article.publishedAt)}`
        : 'Pemetaan dua sisi PDRB BPS Kabupaten Tana Tidung'
    "
    :ui="{ content: 'sm:max-w-2xl rounded-2xl overflow-hidden' }"
  >
    <template #header="{ close }">
      <div v-if="article" class="w-full flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <span
            class="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 truncate max-w-[200px]"
          >
            {{ article.sourcePortal }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 text-[11px] font-semibold border px-2.5 py-0.5 rounded-full"
            :class="scopeMeta.pillClass"
            :title="scopeMeta.label"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="scopeMeta.dotClass" />
            {{ scopeMeta.shortLabel }}
          </span>
          <span class="text-xs font-medium tabular-nums text-slate-600">
            {{ formatDateTimeWita(article.publishedAt) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
          >
            <UIcon name="i-solar-verified-check-bold-duotone" class="w-3.5 h-3.5 text-emerald-700" />
            <span>Terverifikasi Nerwilis</span>
          </span>
        </div>

        <button
          type="button"
          aria-label="Tutup dialog"
          class="min-w-10 min-h-10 inline-flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>
    </template>

    <template #body>
      <div v-if="article" class="space-y-5">
        <!-- Eyebrow & Judul -->
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 text-xs font-bold text-indigo-700">
            <span>TW {{ toRomanQuarter(article.quarter) }} {{ article.year }}</span>
            <span class="text-slate-400">•</span>
            <span>Konsolidasi PDRB Kabupaten Tana Tidung</span>
          </div>
          <h2 class="text-lg sm:text-[21px] font-extrabold text-slate-900 leading-snug tracking-tight">
            {{ article.title }}
          </h2>
        </div>

        <!-- Ringkasan Lengkap -->
        <div class="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/85 text-sm text-slate-700 leading-relaxed space-y-1.5">
          <span class="block text-xs font-bold text-slate-600">
            Intisari &amp; Konteks Intelijen Ekonomi
          </span>
          <p>
            {{ article.summary || 'Ringkasan intelijen ekonomi untuk artikel ini belum dicatat.' }}
          </p>
        </div>

        <!-- Grid Pemetaan Dua Sisi PDRB -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col gap-2.5 border-t-2"
            :style="{ borderTopColor: clusterTheme.hex }"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-600">
                1. Lapangan Usaha (Produksi)
              </span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                :class="clusterTheme.pillClass"
              >
                {{ clusterTheme.label }}
              </span>
            </div>
            <div class="font-bold text-sm text-slate-900 leading-snug">
              {{ getKbliLabel(article.kbliCategory, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-slate-600">Arah Dampak:</span>
              <UBadge
                :color="kbliImpactBadge.color"
                variant="subtle"
                size="xs"
                :icon="kbliImpactBadge.icon"
              >
                {{ kbliImpactBadge.label }}
              </UBadge>
            </div>
            <div
              v-if="kbliGroupMeta"
              class="text-[11px] text-slate-600 mt-1 pt-2 border-t border-slate-100 leading-relaxed"
            >
              Grup PDRB {{ kbliGroupMeta.groupCode }} - {{ kbliGroupMeta.shortName }}: {{ kbliGroupMeta.description }}
            </div>
          </div>

          <div
            class="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col gap-2.5 border-t-2"
            :style="{ borderTopColor: expenditureTheme.hex }"
          >
            <span class="text-xs font-bold text-slate-600">
              2. Sisi Pengeluaran (Expenditure)
            </span>
            <div class="font-bold text-sm text-slate-900 leading-snug">
              {{ getExpenditureLabel(article.expenditureComponent, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-slate-600">Arah Dampak:</span>
              <UBadge
                :color="expImpactBadge.color"
                variant="subtle"
                size="xs"
                :icon="expImpactBadge.icon"
              >
                {{ expImpactBadge.label }}
              </UBadge>
            </div>
            <div
              v-if="expenditureMeta"
              class="text-[11px] text-slate-600 mt-1 pt-2 border-t border-slate-100 leading-relaxed"
            >
              {{ expenditureMeta.description }}
            </div>
          </div>
        </div>

        <!-- Keterangan Validasi Nerwilis -->
        <div
          class="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/75 border border-indigo-200/80 flex items-start gap-3.5"
        >
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
          >
            <UIcon name="i-solar-shield-check-bold-duotone" class="w-5 h-5" />
          </div>
          <div class="flex-1 flex flex-col gap-1 text-xs text-slate-700">
            <span class="text-xs font-bold text-indigo-950">
              Validasi Metodologi Nerwilis BPS Kab. Tana Tidung
            </span>
            <p class="leading-relaxed">
              Fenomena bersumber dari {{ article.sourcePortal }} telah ditelaah dan diklasifikasikan ke
              kerangka dua sisi PDRB (Lapangan Usaha &amp; Pengeluaran) sebagai bukti pendukung penyusunan
              angka PDRB Triwulan {{ toRomanQuarter(article.quarter) }} {{ article.year }}.
            </p>
            <span class="text-[11px] font-medium text-indigo-800 mt-0.5 tabular-nums">
              Referensi Arsip: #{{ article.id.slice(0, 8).toUpperCase() }} • {{ formatDateTimeWita(article.publishedAt) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="article" class="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <a
          v-if="hasSafeUrl"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="min-h-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
        >
          <span>Buka Sumber Berita Asli</span>
          <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5 text-slate-500" />
        </a>
        <span v-else class="text-xs font-medium text-slate-600 truncate max-w-xs" :title="article.url">
          Sumber: {{ article.url }}
        </span>

        <button
          type="button"
          class="btn-primary-gradient min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          @click="handleCopyCitation"
        >
          <UIcon :name="copied ? 'i-lucide-check' : 'i-solar-copy-bold-duotone'" class="w-4 h-4" />
          <span>{{ copied ? 'Tersalin ke Clipboard!' : 'Salin Format Sitasi BPS' }}</span>
        </button>
      </div>
    </template>
  </UModal>
</template>
