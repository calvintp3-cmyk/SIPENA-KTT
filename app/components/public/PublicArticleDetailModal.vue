<!-- app/components/public/PublicArticleDetailModal.vue -->
<script setup lang="ts">
import {
  ArticleSourceTypeEnum,
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
  getKbliLabel,
  getKbliImpactBadge,
  getExpenditureLabel,
  getExpenditureImpactBadge,
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

const scopeMeta = computed(() => {
  switch (props.article?.sourceType) {
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
    default:
      return {
        label: 'Input Manual',
        pillClass: 'text-sky-800 bg-sky-50 border-sky-200',
        dotClass: 'bg-sky-600',
      };
  }
});

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
            class="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 truncate max-w-[200px]"
          >
            {{ article.sourcePortal }}
          </span>
          <span
            class="inline-flex items-center gap-1 text-[11px] font-medium border px-2 py-0.5 rounded-full"
            :class="scopeMeta.pillClass"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="scopeMeta.dotClass" />
            {{ scopeMeta.label }}
          </span>
          <span class="font-mono text-[11px] tabular-nums text-[#5B677A]">
            {{ formatDateTimeWita(article.publishedAt) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
          >
            <UIcon name="i-lucide-check" class="w-3 h-3 text-emerald-600" />
            Terverifikasi Nerwilis
          </span>
        </div>

        <button
          type="button"
          aria-label="Tutup dialog"
          class="min-w-8 min-h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>
    </template>

    <template #body>
      <div v-if="article" class="space-y-5">
        <!-- Eyebrow & Judul -->
        <div>
          <div class="font-mono text-[11px] font-semibold text-teal-700 uppercase tracking-wider mb-1">
            TW {{ toRomanQuarter(article.quarter) }} {{ article.year }} • KONSOLIDASI PDRB
          </div>
          <h2 class="text-lg sm:text-[21px] font-bold text-[#0B1220] leading-snug tracking-tight">
            {{ article.title }}
          </h2>
        </div>

        <!-- Ringkasan Lengkap -->
        <div class="bg-slate-50/90 rounded-xl p-4 border border-slate-200/80 text-sm text-[#334155] leading-relaxed">
          <span class="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Intisari &amp; Konteks Intelijen Ekonomi
          </span>
          <p>
            {{ article.summary || 'Ringkasan intelijen ekonomi untuk artikel ini belum dicatat.' }}
          </p>
        </div>

        <!-- Grid Pemetaan Dua Sisi PDRB -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2">
            <span class="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              1. Sisi Lapangan Usaha (Produksi)
            </span>
            <div class="font-semibold text-sm text-[#0B1220] leading-snug">
              KBLI {{ getKbliLabel(article.kbliCategory, true).replace(' - ', ' • ') }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-slate-500">Arah Dampak:</span>
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
              class="text-[11px] text-[#5B677A] mt-1 pt-2 border-t border-slate-100 leading-relaxed"
            >
              Grup PDRB [{{ kbliGroupMeta.groupCode }}]: {{ kbliGroupMeta.description }}
            </div>
          </div>

          <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2">
            <span class="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              2. Sisi Pengeluaran (Expenditure)
            </span>
            <div class="font-semibold text-sm text-[#0B1220] leading-snug">
              {{ getExpenditureLabel(article.expenditureComponent, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-slate-500">Arah Dampak:</span>
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
              class="text-[11px] text-[#5B677A] mt-1 pt-2 border-t border-slate-100 leading-relaxed"
            >
              {{ expenditureMeta.description }}
            </div>
          </div>
        </div>

        <!-- Keterangan Validasi Nerwilis -->
        <div class="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
          <div class="w-7 h-7 rounded-md bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4" />
          </div>
          <div class="flex-1 flex flex-col gap-1 text-xs text-[#334155]">
            <span class="font-mono text-[11px] font-bold text-teal-900">
              Validasi Metodologi Nerwilis BPS Kab. Tana Tidung
            </span>
            <p class="leading-relaxed">
              Fenomena bersumber dari {{ article.sourcePortal }} telah ditelaah dan diklasifikasikan ke
              kerangka dua sisi PDRB (Lapangan Usaha &amp; Pengeluaran) sebagai bukti pendukung penyusunan
              angka PDRB Triwulan {{ toRomanQuarter(article.quarter) }} {{ article.year }}.
            </p>
            <span class="text-[10px] font-mono text-teal-800/80 mt-0.5 tabular-nums">
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
          class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
        >
          <span>Buka Sumber Berita Asli</span>
          <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5 text-slate-400" />
        </a>
        <span v-else class="text-xs font-mono text-slate-500 truncate max-w-xs" :title="article.url">
          Sumber: {{ article.url }}
        </span>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0B5B55] text-white text-xs font-semibold shadow-xs transition-colors"
          @click="handleCopyCitation"
        >
          <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="w-3.5 h-3.5" />
          <span>{{ copied ? 'Tersalin ke Clipboard!' : 'Salin Format Sitasi BPS' }}</span>
        </button>
      </div>
    </template>
  </UModal>
</template>

