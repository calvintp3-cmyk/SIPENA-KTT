<!-- app/components/public/PublicArticleDetailModal.vue -->
<script setup lang="ts">
import {
  PDRB_6_EXPENDITURE_LIST,
  getPdrb17GroupForKbli,
} from '#shared/enums/pdrb';
import { getKbliFourGenerations } from '#shared/utils/kbli-concordance';
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

const slideoverOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const copied = ref(false);
const copiedLink = ref(false);
let resetCopyTimer: ReturnType<typeof setTimeout> | null = null;
let resetCopyLinkTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (resetCopyTimer) clearTimeout(resetCopyTimer);
  if (resetCopyLinkTimer) clearTimeout(resetCopyLinkTimer);
});

watch(
  () => props.article?.id,
  () => {
    copied.value = false;
    copiedLink.value = false;
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

const kbliBridge = computed(() => {
  if (!props.article?.kbliCategory) return null;
  return getKbliFourGenerations(props.article.kbliCategory);
});

const secondaryKbliImpactBadge = computed(() =>
  getKbliImpactBadge(props.article?.secondaryKbliImpact),
);
const secondaryExpImpactBadge = computed(() =>
  getExpenditureImpactBadge(props.article?.secondaryExpenditureImpact),
);

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
      description: 'Salin teks secara manual dari lembar baca.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    });
  }
}

async function handleCopyArticleLink() {
  if (!props.article?.url) return;
  try {
    await navigator.clipboard.writeText(props.article.url);
    copiedLink.value = true;
    toast.add({
      title: 'Tautan Berita Asli Disalin',
      description: 'URL berita berhasil disalin ke clipboard.',
      color: 'success',
      icon: 'i-lucide-link',
    });
    if (resetCopyLinkTimer) clearTimeout(resetCopyLinkTimer);
    resetCopyLinkTimer = setTimeout(() => {
      copiedLink.value = false;
    }, 2000);
  } catch {
    toast.add({
      title: 'Gagal Menyalin Tautan',
      color: 'warning',
    });
  }
}
</script>

<template>
  <USlideover
    v-model:open="slideoverOpen"
    side="right"
    :title="article?.title || 'Lembar Ringkasan Fenomena'"
    :description="
      article
        ? `${article.sourcePortal} • ${formatDateTimeWita(article.publishedAt)}`
        : 'Pemetaan dua sisi PDRB BPS Kabupaten Tana Tidung'
    "
    :ui="{ content: 'sm:max-w-2xl bg-[#F6F5F1]' }"
  >
    <template #header="{ close }">
      <div v-if="article" class="w-full flex items-center justify-between gap-3 pb-2 border-b border-[#141917]/[0.08]">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#141917] bg-[#ECEAE2] px-2.5 py-0.5 rounded-full border border-[#141917]/10 truncate max-w-[200px]">
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
          <span
            v-if="article.subdistrict"
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-[#E3F0EA] text-[#0B3D2E] border-[#BBD8CB]"
          >
            <UIcon name="i-lucide-map-pin" class="w-3 h-3 text-[#0B3D2E]" />
            <span>Kec. {{ article.subdistrict }}</span>
          </span>
          <span class="text-xs font-mono text-[#737B76]">
            {{ formatDateTimeWita(article.publishedAt) }}
          </span>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB]">
            <UIcon name="i-solar-verified-check-bold-duotone" class="w-3.5 h-3.5 text-[#0B3D2E]" />
            <span>Terverifikasi Nerwilis</span>
          </span>
        </div>

        <button
          type="button"
          aria-label="Tutup lembar ringkasan"
          class="min-w-9 min-h-9 inline-flex items-center justify-center rounded-xl text-[#737B76] hover:text-[#141917] hover:bg-[#ECEAE2] transition-colors shrink-0 cursor-pointer"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>
    </template>

    <template #body>
      <div v-if="article" class="space-y-6 py-2">
        <!-- Eyebrow & Judul Artikel -->
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 text-xs font-bold text-[#0B3D2E] font-mono">
            <span>TW {{ toRomanQuarter(article.quarter) }} {{ article.year }}</span>
            <span class="text-[#141917]/20">&bull;</span>
            <span class="font-sans font-semibold text-[#4A524E]">Konsolidasi PDRB Kabupaten Tana Tidung</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-extrabold text-[#141917] leading-snug tracking-tight font-display">
            {{ article.title }}
          </h2>
        </div>

        <!-- Ringkasan Lengkap Editorial -->
        <div class="bg-white rounded-2xl p-5 border border-[#141917]/[0.08] shadow-2xs space-y-2 border-l-4 border-l-[#0B3D2E]">
          <span class="text-xs font-bold text-[#737B76] uppercase tracking-wider block font-mono">
            Intisari &amp; Dampak Ekonomi
          </span>
          <p class="text-sm text-[#141917] leading-relaxed">
            {{ article.summary || 'Ringkasan intelijen ekonomi untuk artikel ini belum dicatat.' }}
          </p>
        </div>

        <!-- Grid Pemetaan Dua Sisi PDRB -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Sisi Lapangan Usaha -->
          <div class="p-4.5 rounded-2xl border border-[#141917]/[0.08] bg-white shadow-2xs flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-[#737B76] font-mono uppercase tracking-wider">
                1. Lapangan Usaha (KBLI)
              </span>
            </div>
            <div class="font-bold text-sm text-[#141917] leading-snug">
              {{ getKbliLabel(article.kbliCategory, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-[#4A524E]">Arah Dampak:</span>
              <UBadge
                :color="kbliImpactBadge.color"
                variant="subtle"
                size="xs"
                :icon="kbliImpactBadge.icon"
                :title="kbliImpactBadge.label"
              >
                {{ kbliImpactBadge.shortLabel }}
              </UBadge>
            </div>
            <div
              v-if="kbliGroupMeta"
              class="text-[11px] text-[#737B76] mt-1 pt-2 border-t border-[#141917]/[0.06] leading-relaxed"
            >
              Grup PDRB {{ kbliGroupMeta.groupCode }} - {{ kbliGroupMeta.shortName }}: {{ kbliGroupMeta.description }}
            </div>
          </div>

          <!-- Sisi Pengeluaran PDRB -->
          <div class="p-4.5 rounded-2xl border border-[#141917]/[0.08] bg-white shadow-2xs flex flex-col gap-2.5">
            <span class="text-xs font-bold text-[#737B76] font-mono uppercase tracking-wider">
              2. Sisi Pengeluaran
            </span>
            <div class="font-bold text-sm text-[#141917] leading-snug">
              {{ getExpenditureLabel(article.expenditureComponent, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-[#4A524E]">Arah Dampak:</span>
              <UBadge
                :color="expImpactBadge.color"
                variant="subtle"
                size="xs"
                :icon="expImpactBadge.icon"
                :title="expImpactBadge.label"
              >
                {{ expImpactBadge.shortLabel }}
              </UBadge>
            </div>
            <div
              v-if="expenditureMeta"
              class="text-[11px] text-[#737B76] mt-1 pt-2 border-t border-[#141917]/[0.06] leading-relaxed"
            >
              {{ expenditureMeta.description }}
            </div>
          </div>
        </div>

        <!-- Keterkaitan Sektoral Sekunder (Jika ada) -->
        <div
          v-if="article.secondaryKbliCategory || article.secondaryExpenditureComponent"
          class="p-4.5 rounded-2xl bg-white border border-[#141917]/[0.08] space-y-3"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-solar-link-round-bold-duotone" class="w-4 h-4 text-[#0B3D2E]" />
            <span class="text-xs font-bold text-[#141917] font-display">
              Keterkaitan Sektoral Sekunder (Inter-Industry Linkage)
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div
              v-if="article.secondaryKbliCategory"
              class="p-3 rounded-xl bg-[#F6F5F1] border border-[#141917]/[0.06] flex flex-col gap-1.5"
            >
              <span class="text-[11px] font-semibold text-[#737B76]">Sektor Sekunder (KBLI)</span>
              <span class="font-bold text-[#141917]">{{ getKbliLabel(article.secondaryKbliCategory, true) }}</span>
              <div v-if="article.secondaryKbliImpact" class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] text-[#737B76]">Dampak:</span>
                <UBadge :color="secondaryKbliImpactBadge.color" variant="subtle" size="xs" :icon="secondaryKbliImpactBadge.icon" :title="secondaryKbliImpactBadge.label">
                  {{ secondaryKbliImpactBadge.shortLabel }}
                </UBadge>
              </div>
            </div>
            <div
              v-if="article.secondaryExpenditureComponent"
              class="p-3 rounded-xl bg-[#F6F5F1] border border-[#141917]/[0.06] flex flex-col gap-1.5"
            >
              <span class="text-[11px] font-semibold text-[#737B76]">Pengeluaran Sekunder</span>
              <span class="font-bold text-[#141917]">{{ getExpenditureLabel(article.secondaryExpenditureComponent, true) }}</span>
              <div v-if="article.secondaryExpenditureImpact" class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] text-[#737B76]">Dampak:</span>
                <UBadge :color="secondaryExpImpactBadge.color" variant="subtle" size="xs" :icon="secondaryExpImpactBadge.icon" :title="secondaryExpImpactBadge.label">
                  {{ secondaryExpImpactBadge.shortLabel }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Jembatan Konkordansi KBLI 4-Generasi (2009 -> 2025) -->
        <div
          v-if="kbliBridge"
          class="p-4.5 rounded-2xl bg-[#E3F0EA]/40 border border-[#BBD8CB] space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-solar-route-bold-duotone" class="w-4 h-4 text-[#0B3D2E]" />
              <span class="text-xs font-bold text-[#141917] font-display">
                Jembatan Konkordansi KBLI 4-Generasi (BPS RI)
              </span>
            </div>
            <span class="text-[10px] bg-[#E3F0EA] text-[#0B3D2E] font-bold px-2 py-0.5 rounded-md font-mono">
              {{ kbliBridge.pdrbSector }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-xl bg-white border border-[#BBD8CB] shadow-2xs">
              <div class="text-[10px] font-bold text-[#0B3D2E] uppercase tracking-wider mb-1 font-mono">
                KBLI 2025 (Terkini)
              </div>
              <div class="font-bold text-[#141917]">
                Kategori {{ kbliBridge.code2025 }}
              </div>
              <div class="text-[11px] text-[#4A524E] line-clamp-2" :title="kbliBridge.title2025">
                {{ kbliBridge.title2025 }}
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-white/90 border border-[#141917]/10 shadow-2xs">
              <div class="text-[10px] font-bold text-[#737B76] uppercase tracking-wider mb-1 font-mono">
                KBLI 2020 (Transisi)
              </div>
              <div class="font-bold text-[#4A524E]">
                Kategori {{ kbliBridge.code2020 }}
              </div>
              <div class="text-[11px] text-[#4A524E] line-clamp-2" :title="kbliBridge.title2020">
                {{ kbliBridge.title2020 }}
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-white/80 border border-[#141917]/10">
              <div class="text-[10px] font-bold text-[#737B76] uppercase tracking-wider mb-1 font-mono">
                KBLI 2015
              </div>
              <div class="font-bold text-[#4A524E]">
                Kategori {{ kbliBridge.code2015 }}
              </div>
              <div class="text-[11px] text-[#4A524E] line-clamp-2" :title="kbliBridge.title2015">
                {{ kbliBridge.title2015 }}
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-white/80 border border-[#141917]/10">
              <div class="text-[10px] font-bold text-[#737B76] uppercase tracking-wider mb-1 font-mono">
                KBLI 2009 (Awal)
              </div>
              <div class="font-bold text-[#4A524E]">
                Kategori {{ kbliBridge.code2009 }}
              </div>
              <div class="text-[11px] text-[#4A524E] line-clamp-2" :title="kbliBridge.title2009">
                {{ kbliBridge.title2009 }}
              </div>
            </div>
          </div>

          <div class="text-[11px] text-[#4A524E] bg-white/70 p-2.5 rounded-xl border border-[#BBD8CB] leading-relaxed">
            <span class="font-bold text-[#0B3D2E]">Catatan Perubahan Struktur BPS: </span>
            {{ kbliBridge.changeNotes }}
          </div>
        </div>

        <!-- Keterangan Validasi Nerwilis -->
        <div class="p-4.5 rounded-2xl bg-white border border-[#141917]/[0.08] flex items-start gap-3.5">
          <div class="w-9 h-9 rounded-xl bg-[#0B3D2E] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <UIcon name="i-solar-shield-check-bold-duotone" class="w-5 h-5 text-white" />
          </div>
          <div class="flex-1 flex flex-col gap-1 text-xs text-[#4A524E]">
            <span class="text-xs font-bold text-[#141917] font-display">
              Validasi Metodologi Nerwilis BPS Kab. Tana Tidung
            </span>
            <p class="leading-relaxed">
              Fenomena bersumber dari {{ article.sourcePortal }} telah ditelaah dan diklasifikasikan ke
              kerangka dua sisi PDRB (Lapangan Usaha &amp; Pengeluaran) sebagai bukti pendukung penyusunan
              angka PDRB Triwulan {{ toRomanQuarter(article.quarter) }} {{ article.year }}.
            </p>
            <span class="text-[11px] font-medium text-[#0B3D2E] mt-0.5 font-mono tabular-nums">
              Referensi Arsip: #{{ article.id.slice(0, 8).toUpperCase() }} &bull; {{ formatDateTimeWita(article.publishedAt) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="article" class="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#141917]/[0.08]">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-if="hasSafeUrl"
            type="button"
            class="min-h-9 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#141917]/10 bg-white hover:border-[#0B3D2E] hover:text-[#0B3D2E] text-xs font-semibold text-[#141917] shadow-2xs transition-colors cursor-pointer"
            @click="handleCopyArticleLink"
          >
            <UIcon
              :name="copiedLink ? 'i-lucide-check' : 'i-lucide-link'"
              class="w-3.5 h-3.5"
              :class="copiedLink ? 'text-[#0B3D2E]' : 'text-[#737B76]'"
            />
            <span>{{ copiedLink ? 'Tautan Disalin!' : 'Salin Tautan' }}</span>
          </button>

          <a
            v-if="hasSafeUrl"
            :href="article.url"
            target="_blank"
            rel="noopener noreferrer"
            class="min-h-9 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#141917]/10 bg-white hover:bg-[#F6F5F1] text-xs font-semibold text-[#141917] shadow-2xs transition-colors"
          >
            <span>Buka Sumber Asli</span>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5 text-[#737B76]" />
          </a>
        </div>

        <button
          type="button"
          class="obs-btn-primary min-h-9 inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
          @click="handleCopyCitation"
        >
          <UIcon :name="copied ? 'i-lucide-check' : 'i-solar-copy-bold-duotone'" class="w-4 h-4" />
          <span>{{ copied ? 'Tersalin ke Clipboard!' : 'Salin Format Sitasi BPS' }}</span>
        </button>
      </div>
    </template>
  </USlideover>
</template>
