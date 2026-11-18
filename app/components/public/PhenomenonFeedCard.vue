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
      return 'bg-[#E7F3EE] text-[#0F4C3A] border-[#C3DFD3]';
    case 'error':
      return 'bg-[#FCECE8] text-[#B4482D] border-[#F5C6BA]';
    case 'warning':
      return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    case 'info':
      return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
    default:
      return 'bg-[#F2F0EB] text-[#575B58] border-[#DDD9D0]';
  }
});

const secondaryExpImpactToneClass = computed(() => {
  switch (secondaryExpImpactMeta.value.color) {
    case 'success':
      return 'bg-[#E7F3EE] text-[#0F4C3A] border-[#C3DFD3]';
    case 'error':
      return 'bg-[#FCECE8] text-[#B4482D] border-[#F5C6BA]';
    case 'warning':
      return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    case 'info':
      return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
    default:
      return 'bg-[#F2F0EB] text-[#575B58] border-[#DDD9D0]';
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
      return 'bg-[#E7F3EE] text-[#0F4C3A] border-[#C3DFD3]';
    case 'error':
      return 'bg-[#FCECE8] text-[#B4482D] border-[#F5C6BA]';
    case 'warning':
      return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    case 'info':
      return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
    default:
      return 'bg-[#F2F0EB] text-[#575B58] border-[#DDD9D0]';
  }
});

const expImpactToneClass = computed(() => {
  switch (expImpactMeta.value.color) {
    case 'success':
      return 'bg-[#E7F3EE] text-[#0F4C3A] border-[#C3DFD3]';
    case 'error':
      return 'bg-[#FCECE8] text-[#B4482D] border-[#F5C6BA]';
    case 'warning':
      return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    case 'info':
      return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
    default:
      return 'bg-[#F2F0EB] text-[#575B58] border-[#DDD9D0]';
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
    <!-- Top Metadata Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 min-w-0 text-xs">
        <a
          v-if="hasExternalUrl"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="relative z-10 inline-flex items-center gap-1 min-h-7 font-semibold text-[#3D423F] bg-[#F2F0EB] hover:bg-[#E7E4DC] hover:text-[#1A1D1B] px-2.5 py-0.5 rounded-lg border border-[#DDD9D0] transition-colors"
        >
          <span class="truncate max-w-[180px] sm:max-w-[240px]">{{ article.sourcePortal }}</span>
          <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3 text-[#6B6F6C] shrink-0" />
        </a>
        <span
          v-else
          class="inline-flex items-center gap-1 font-semibold text-[#3D423F] bg-[#F2F0EB] px-2.5 py-1 rounded-lg border border-[#DDD9D0]"
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

        <span
          v-if="article.subdistrict"
          class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-[#E7F3EE] text-[#0F4C3A] border-[#C3DFD3]"
        >
          <UIcon name="i-lucide-map-pin" class="w-3 h-3 text-[#0F4C3A]" />
          <span>Kec. {{ article.subdistrict }}</span>
        </span>

        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3D423F]">
          <span class="w-2 h-2 rounded-full shrink-0" :class="clusterTheme.accentBarClass" />
          <span>{{ clusterTheme.label }}</span>
        </span>

        <span class="text-[#DDD9D0]" aria-hidden="true">•</span>

        <span v-if="timeWitaText" class="text-xs font-medium font-mono tabular-nums text-[#6B6F6C]">
          {{ timeWitaText }}
        </span>
        <span class="text-xs font-semibold font-mono tabular-nums text-[#3D423F]">
          {{ periodShortLabel }}
        </span>
      </div>

      <button
        type="button"
        aria-label="Salin Sitasi Fenomena"
        title="Salin format sitasi BPS"
        class="relative z-10 min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg text-[#6B6F6C] hover:text-[#0F4C3A] hover:bg-[#E7F3EE] transition-colors shrink-0 cursor-pointer"
        @click="copyCitation"
      >
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-solar-copy-bold-duotone'"
          class="w-4 h-4"
          :class="copied ? 'text-[#0F4C3A]' : ''"
        />
      </button>
    </div>

    <!-- Title & Brief Summary -->
    <h2 class="text-[17px] sm:text-lg font-bold leading-snug tracking-tight text-[#1A1D1B] font-display">
      <button
        type="button"
        class="text-left group-hover:text-[#0F4C3A] transition-colors rounded cursor-pointer after:content-[''] after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0F4C3A] focus-visible:after:ring-offset-2"
        @click="() => { emit('select', article); }"
      >
        {{ article.title }}
      </button>
    </h2>

    <p class="text-[13px] sm:text-sm text-[#5C615E] leading-relaxed">
      {{ article.summary || 'Ringkasan terverifikasi belum tersedia untuk catatan ini.' }}
    </p>

    <!-- Dual-Axis Executive Strip Footer -->
    <div
      class="bg-[#FAF9F7] border-t border-[#EFECE6] -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs mt-1"
    >
      <!-- Left: Lapangan Usaha (KBLI) -->
      <div class="flex flex-col gap-1.5 min-w-0">
        <div class="flex items-center justify-between gap-1.5 text-xs font-semibold text-[#5C615E]">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full shrink-0" :class="clusterTheme.accentBarClass" />
            <span class="font-display">Lapangan Usaha (KBLI 2025)</span>
          </div>
          <UPopover v-if="kbliBridge" :ui="{ content: 'w-72 sm:w-80 p-3 text-xs z-50' }">
            <button
              type="button"
              class="relative z-10 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F4C3A] hover:text-[#0B3B2D] bg-[#E7F3EE] hover:bg-[#D7E5DF] px-2 py-0.5 rounded-full border border-[#C3DFD3] transition-colors cursor-pointer"
              title="Lihat padanan KBLI 2009, 2015, dan 2020"
              @click.stop
            >
              <UIcon name="i-solar-transfer-horizontal-bold-duotone" class="w-3 h-3" />
              <span>Konversi KBLI</span>
            </button>
            <template #content>
              <div class="space-y-2 p-1" @click.stop>
                <div class="flex items-center justify-between pb-1.5 border-b border-[#E7E4DC]">
                  <span class="font-bold text-[#1A1D1B] flex items-center gap-1 font-display">
                    <UIcon name="i-solar-route-bold-duotone" class="w-3.5 h-3.5 text-[#0F4C3A]" />
                    Jembatan Konkordansi 4-Generasi
                  </span>
                  <span class="text-[10px] bg-[#E7F3EE] text-[#0F4C3A] font-bold px-1.5 py-0.5 rounded font-mono">BPS KTT</span>
                </div>
                <div class="space-y-1.5 text-[11px]">
                  <div class="flex items-start gap-1.5 bg-[#E7F3EE]/70 p-1.5 rounded-lg border border-[#C3DFD3]">
                    <span class="font-bold text-[#0F4C3A] w-16 shrink-0 font-mono">KBLI 2025:</span>
                    <span class="text-[#1A1D1B] font-semibold">{{ kbliBridge.code2025 }} • {{ kbliBridge.title2025 }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#FAF9F7] border border-[#E7E4DC]">
                    <span class="font-bold text-[#575B58] w-16 shrink-0">KBLI 2020:</span>
                    <span class="text-[#575B58]">{{ kbliBridge.code2020 }} • {{ kbliBridge.title2020 }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#FAF9F7] border border-[#E7E4DC]">
                    <span class="font-bold text-[#575B58] w-16 shrink-0">KBLI 2015:</span>
                    <span class="text-[#575B58]">{{ kbliBridge.code2015 }} • {{ kbliBridge.title2015 }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#FAF9F7] border border-[#E7E4DC]">
                    <span class="font-bold text-[#575B58] w-16 shrink-0">KBLI 2009:</span>
                    <span class="text-[#575B58]">{{ kbliBridge.code2009 }} • {{ kbliBridge.title2009 }}</span>
                  </div>
                </div>
                <div class="text-[10px] text-[#6B6F6C] pt-1 border-t border-[#EFECE6] leading-tight">
                  {{ kbliBridge.changeNotes }}
                </div>
              </div>
            </template>
          </UPopover>
        </div>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-semibold text-[#1A1D1B] truncate min-w-0"
            :title="getKbliLabel(article.kbliCategory, true)"
          >
            {{ getKbliLabel(article.kbliCategory, true) }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shrink-0"
            :class="kbliImpactToneClass"
            :title="kbliImpactMeta.label"
          >
            <UIcon :name="kbliImpactMeta.icon" class="w-3 h-3" />
            <span>{{ kbliImpactMeta.shortLabel }}</span>
          </span>
        </div>
        <!-- Sektor Sekunder jika ada -->
        <div
          v-if="article.secondaryKbliCategory"
          class="flex items-center justify-between gap-2 pt-1 border-t border-[#EFECE6] text-[11px]"
        >
          <span class="text-[#5C615E] flex items-center gap-1 truncate" :title="getKbliLabel(article.secondaryKbliCategory, true)">
            <span class="font-bold text-[#3D423F]">+ Sekunder:</span>
            <span class="truncate">{{ getKbliLabel(article.secondaryKbliCategory, true) }}</span>
          </span>
          <span
            v-if="article.secondaryKbliImpact"
            class="text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0"
            :class="secondaryKbliImpactToneClass"
            :title="secondaryKbliImpactMeta.label"
          >
            {{ secondaryKbliImpactMeta.shortLabel }}
          </span>
        </div>
      </div>

      <!-- Right: Pengeluaran PDRB -->
      <div class="flex flex-col gap-1.5 md:border-l md:border-[#EFECE6] md:pl-4 min-w-0">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-[#5C615E]">
          <span class="w-2 h-2 rounded-full shrink-0" :class="expenditureTheme.dotClass" />
          <span>Pengeluaran PDRB</span>
        </div>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-semibold text-[#1A1D1B] truncate min-w-0"
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
          class="flex items-center justify-between gap-2 pt-1 border-t border-[#EFECE6] text-[11px]"
        >
          <span class="text-[#5C615E] flex items-center gap-1 truncate" :title="getExpenditureLabel(article.secondaryExpenditureComponent, true)">
            <span class="font-bold text-[#3D423F]">+ Sekunder:</span>
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
