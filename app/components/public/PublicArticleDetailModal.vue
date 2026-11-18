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

const modalOpen = computed({
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
      description: 'Salin teks secara manual dari dialog.',
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
            class="inline-flex items-center gap-1 text-xs font-semibold text-[#3D423F] bg-[#F2F0EB] px-2.5 py-0.5 rounded-full border border-[#DDD9D0] truncate max-w-[200px]"
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
          <span
            v-if="article.subdistrict"
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-[#E7F3EE] text-[#0F4C3A] border-[#C3DFD3]"
          >
            <UIcon name="i-lucide-map-pin" class="w-3 h-3 text-[#0F4C3A]" />
            <span>Kec. {{ article.subdistrict }}</span>
          </span>
          <span class="text-xs font-medium tabular-nums text-[#6B6F6C]">
            {{ formatDateTimeWita(article.publishedAt) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E7F3EE] text-[#0F4C3A] border border-[#C3DFD3]"
          >
            <UIcon name="i-solar-verified-check-bold-duotone" class="w-3.5 h-3.5 text-[#0F4C3A]" />
            <span>Terverifikasi Nerwilis</span>
          </span>
        </div>

        <button
          type="button"
          aria-label="Tutup dialog"
          class="min-w-9 min-h-9 inline-flex items-center justify-center rounded-xl text-[#6B6F6C] hover:text-[#1A1D1B] hover:bg-[#F2F0EB] transition-colors shrink-0 cursor-pointer"
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
          <div class="inline-flex items-center gap-2 text-xs font-bold text-[#0F4C3A] font-mono">
            <span>TW {{ toRomanQuarter(article.quarter) }} {{ article.year }}</span>
            <span class="text-[#DDD9D0]">•</span>
            <span class="font-sans font-semibold text-[#5C615E]">Konsolidasi PDRB Kabupaten Tana Tidung</span>
          </div>
          <h2 class="text-lg sm:text-[21px] font-extrabold text-[#1A1D1B] leading-snug tracking-tight font-display">
            {{ article.title }}
          </h2>
        </div>

        <!-- Ringkasan Lengkap -->
        <div class="bg-[#FAF9F7] rounded-2xl p-4 border border-[#E7E4DC] text-sm text-[#3D423F] leading-relaxed space-y-1.5">
          <span class="block text-xs font-bold text-[#5C615E]">
            Intisari &amp; Konteks Intelijen Ekonomi
          </span>
          <p>
            {{ article.summary || 'Ringkasan intelijen ekonomi untuk artikel ini belum dicatat.' }}
          </p>
        </div>

        <!-- Grid Pemetaan Dua Sisi PDRB -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="p-4 rounded-2xl border border-[#E7E4DC] bg-white shadow-2xs flex flex-col gap-2.5 border-t-2"
            :style="{ borderTopColor: clusterTheme.hex }"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-[#5C615E]">
                1. Lapangan Usaha (Produksi)
              </span>
            </div>
            <div class="font-bold text-sm text-[#1A1D1B] leading-snug">
              {{ getKbliLabel(article.kbliCategory, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-[#5C615E]">Arah Dampak:</span>
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
              class="text-[11px] text-[#6B6F6C] mt-1 pt-2 border-t border-[#EFECE6] leading-relaxed"
            >
              Grup PDRB {{ kbliGroupMeta.groupCode }} - {{ kbliGroupMeta.shortName }}: {{ kbliGroupMeta.description }}
            </div>
          </div>

          <div
            class="p-4 rounded-2xl border border-[#E7E4DC] bg-white shadow-2xs flex flex-col gap-2.5 border-t-2"
            :style="{ borderTopColor: expenditureTheme.hex }"
          >
            <span class="text-xs font-bold text-[#5C615E]">
              2. Sisi Pengeluaran (Expenditure)
            </span>
            <div class="font-bold text-sm text-[#1A1D1B] leading-snug">
              {{ getExpenditureLabel(article.expenditureComponent, true) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-[#5C615E]">Arah Dampak:</span>
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
              class="text-[11px] text-[#6B6F6C] mt-1 pt-2 border-t border-[#EFECE6] leading-relaxed"
            >
              {{ expenditureMeta.description }}
            </div>
          </div>
        </div>

        <!-- Keterkaitan Sektoral Sekunder (Jika teridentifikasi) -->
        <div
          v-if="article.secondaryKbliCategory || article.secondaryExpenditureComponent"
          class="p-4 rounded-xl bg-[#FAF9F7] border border-[#E7E4DC] space-y-3"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-solar-link-round-bold-duotone" class="w-4 h-4 text-[#0F4C3A]" />
            <span class="text-xs font-bold text-[#1A1D1B] font-display">
              Keterkaitan Sektoral Sekunder (Inter-Industry Linkage)
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div
              v-if="article.secondaryKbliCategory"
              class="p-3 rounded-lg bg-white border border-[#E7E4DC] flex flex-col gap-1.5"
            >
              <span class="text-[11px] font-semibold text-[#6B6F6C]">Sektor Sekunder (KBLI)</span>
              <span class="font-bold text-[#1A1D1B]">{{ getKbliLabel(article.secondaryKbliCategory, true) }}</span>
              <div v-if="article.secondaryKbliImpact" class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] text-[#6B6F6C]">Dampak:</span>
                <UBadge :color="secondaryKbliImpactBadge.color" variant="subtle" size="xs" :icon="secondaryKbliImpactBadge.icon" :title="secondaryKbliImpactBadge.label">
                  {{ secondaryKbliImpactBadge.shortLabel }}
                </UBadge>
              </div>
            </div>
            <div
              v-if="article.secondaryExpenditureComponent"
              class="p-3 rounded-lg bg-white border border-[#E7E4DC] flex flex-col gap-1.5"
            >
              <span class="text-[11px] font-semibold text-[#6B6F6C]">Pengeluaran Sekunder</span>
              <span class="font-bold text-[#1A1D1B]">{{ getExpenditureLabel(article.secondaryExpenditureComponent, true) }}</span>
              <div v-if="article.secondaryExpenditureImpact" class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] text-[#6B6F6C]">Dampak:</span>
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
          class="p-4 rounded-xl bg-[#E7F3EE]/40 border border-[#C3DFD3] space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-solar-route-bold-duotone" class="w-4 h-4 text-[#0F4C3A]" />
              <span class="text-xs font-bold text-[#1A1D1B] font-display">
                Jembatan Konkordansi KBLI 4-Generasi (BPS RI)
              </span>
            </div>
            <span class="text-[10px] bg-[#E7F3EE] text-[#0F4C3A] font-bold px-2 py-0.5 rounded-md font-mono">
              {{ kbliBridge.pdrbSector }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-lg bg-white border border-[#C3DFD3] shadow-2xs">
              <div class="text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider mb-1 font-mono">
                KBLI 2025 (Terkini)
              </div>
              <div class="font-bold text-[#1A1D1B]">
                Kategori {{ kbliBridge.code2025 }}
              </div>
              <div class="text-[11px] text-[#5C615E] line-clamp-2" :title="kbliBridge.title2025">
                {{ kbliBridge.title2025 }}
              </div>
            </div>

            <div class="p-2.5 rounded-lg bg-white/90 border border-[#E7E4DC] shadow-2xs">
              <div class="text-[10px] font-bold text-[#6B6F6C] uppercase tracking-wider mb-1 font-mono">
                KBLI 2020 (Transisi)
              </div>
              <div class="font-bold text-[#3D423F]">
                Kategori {{ kbliBridge.code2020 }}
              </div>
              <div class="text-[11px] text-[#5C615E] line-clamp-2" :title="kbliBridge.title2020">
                {{ kbliBridge.title2020 }}
              </div>
            </div>

            <div class="p-2.5 rounded-lg bg-white/80 border border-[#E7E4DC]">
              <div class="text-[10px] font-bold text-[#6B6F6C] uppercase tracking-wider mb-1 font-mono">
                KBLI 2015
              </div>
              <div class="font-bold text-[#3D423F]">
                Kategori {{ kbliBridge.code2015 }}
              </div>
              <div class="text-[11px] text-[#5C615E] line-clamp-2" :title="kbliBridge.title2015">
                {{ kbliBridge.title2015 }}
              </div>
            </div>

            <div class="p-2.5 rounded-lg bg-white/80 border border-[#E7E4DC]">
              <div class="text-[10px] font-bold text-[#6B6F6C] uppercase tracking-wider mb-1 font-mono">
                KBLI 2009 (Awal)
              </div>
              <div class="font-bold text-[#3D423F]">
                Kategori {{ kbliBridge.code2009 }}
              </div>
              <div class="text-[11px] text-[#5C615E] line-clamp-2" :title="kbliBridge.title2009">
                {{ kbliBridge.title2009 }}
              </div>
            </div>
          </div>

          <div class="text-[11px] text-[#5C615E] bg-white/70 p-2.5 rounded-lg border border-[#C3DFD3] leading-relaxed">
            <span class="font-bold text-[#0F4C3A]">Catatan Perubahan Struktur BPS: </span>
            {{ kbliBridge.changeNotes }}
          </div>
        </div>

        <!-- Keterangan Validasi Nerwilis -->
        <div
          class="p-4 rounded-xl bg-[#FAF9F7] border border-[#E7E4DC] flex items-start gap-3.5"
        >
          <div
            class="w-9 h-9 rounded-lg bg-[#0F4C3A] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
          >
            <UIcon name="i-solar-shield-check-bold-duotone" class="w-5 h-5 text-white" />
          </div>
          <div class="flex-1 flex flex-col gap-1 text-xs text-[#3D423F]">
            <span class="text-xs font-bold text-[#1A1D1B] font-display">
              Validasi Metodologi Nerwilis BPS Kab. Tana Tidung
            </span>
            <p class="leading-relaxed">
              Fenomena bersumber dari {{ article.sourcePortal }} telah ditelaah dan diklasifikasikan ke
              kerangka dua sisi PDRB (Lapangan Usaha &amp; Pengeluaran) sebagai bukti pendukung penyusunan
              angka PDRB Triwulan {{ toRomanQuarter(article.quarter) }} {{ article.year }}.
            </p>
            <span class="text-[11px] font-medium text-[#0F4C3A] mt-0.5 font-mono tabular-nums">
              Referensi Arsip: #{{ article.id.slice(0, 8).toUpperCase() }} • {{ formatDateTimeWita(article.publishedAt) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="article" class="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-if="hasSafeUrl"
            type="button"
            class="min-h-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD9D0] bg-white hover:border-[#0F4C3A] hover:text-[#0F4C3A] text-xs font-semibold text-[#3D423F] shadow-2xs transition-colors cursor-pointer"
            @click="handleCopyArticleLink"
          >
            <UIcon
              :name="copiedLink ? 'i-lucide-check' : 'i-lucide-link'"
              class="w-3.5 h-3.5"
              :class="copiedLink ? 'text-[#0F4C3A]' : 'text-[#6B6F6C]'"
            />
            <span>{{ copiedLink ? 'Tautan Disalin!' : 'Salin Link Berita Asli' }}</span>
          </button>

          <a
            v-if="hasSafeUrl"
            :href="article.url"
            target="_blank"
            rel="noopener noreferrer"
            class="min-h-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD9D0] bg-white hover:bg-[#FAF9F7] text-xs font-semibold text-[#3D423F] shadow-2xs transition-colors"
          >
            <span>Buka Sumber Asli</span>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5 text-[#6B6F6C]" />
          </a>
          <span v-else class="text-xs font-medium text-[#5C615E] truncate max-w-xs" :title="article.url">
            Sumber: {{ article.url }}
          </span>
        </div>

        <button
          type="button"
          class="btn-primary-gradient min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
          @click="handleCopyCitation"
        >
          <UIcon :name="copied ? 'i-lucide-check' : 'i-solar-copy-bold-duotone'" class="w-4 h-4" />
          <span>{{ copied ? 'Tersalin ke Clipboard!' : 'Salin Format Sitasi BPS' }}</span>
        </button>
      </div>
    </template>
  </UModal>
</template>
