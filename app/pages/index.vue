<!-- app/pages/index.vue -->
<script setup lang="ts">
import {
  hasLegacyTimelineQuery,
  pickLandingSnapshotPeriod,
} from '#shared/utils/public-helpers';
import {
  formatDateId,
  getCurrentQuarterYearWita,
  toRomanQuarter,
} from '#shared/utils/period';
import type {
  Pdrb17DistributionItem,
  PublicArticleItem,
  PublicArticlesResponse,
  PublicOverviewResponse,
} from '~/types/sipena';

const route = useRoute();
const { user } = useAdminSession();

// Preserve legacy query bookmarks (e.g., /?year=2026&quarter=4) by redirecting cleanly to /linimasa
if (hasLegacyTimelineQuery(route.query as Record<string, unknown>)) {
  await navigateTo(
    {
      path: '/linimasa',
      query: route.query,
    },
    { replace: true },
  );
}

useHead({
  title: 'SIPENA KTT — Portal Pencari & Pemantau Fenomena Ekonomi Kabupaten Tana Tidung',
  meta: [
    {
      name: 'description',
      content:
        'Portal pencari berita ekonomi dan pemantau dinamika sektor usaha Kabupaten Tana Tidung serta transmisi kebijakan nasional.',
    },
  ],
});

const {
  formatNumberId,
  getKbliClusterTheme,
  getKbliImpactBadge,
  getExpenditureLabel,
} = usePdrbLabels();

const currentWita = getCurrentQuarterYearWita();

const { data: currentOverview } = await useFetch<PublicOverviewResponse>('/api/public/overview', {
  query: {
    year: currentWita.year,
    quarter: currentWita.quarter,
  },
});

const fallbackTargetPeriod = computed(() => {
  const curTotal = currentOverview.value?.kpi.totalVerified ?? 0;
  if (curTotal > 0) return null;
  const candidate = pickLandingSnapshotPeriod(currentOverview.value?.availablePeriods);
  if (
    candidate &&
    candidate.count > 0 &&
    (candidate.year !== currentWita.year || candidate.quarter !== currentWita.quarter)
  ) {
    return candidate;
  }
  return null;
});

const { data: fallbackOverview } = await useFetch<PublicOverviewResponse>('/api/public/overview', {
  query: computed(() => ({
    year: fallbackTargetPeriod.value?.year ?? currentWita.year,
    quarter: fallbackTargetPeriod.value?.quarter ?? currentWita.quarter,
  })),
  immediate: false,
  watch: [fallbackTargetPeriod],
});

const activeOverview = computed<PublicOverviewResponse | null>(() => {
  if ((currentOverview.value?.kpi.totalVerified ?? 0) > 0) {
    return currentOverview.value ?? null;
  }
  if (fallbackTargetPeriod.value && fallbackOverview.value) {
    return fallbackOverview.value;
  }
  return currentOverview.value ?? null;
});

const snapshotYear = computed(
  () => activeOverview.value?.period.year ?? fallbackTargetPeriod.value?.year ?? currentWita.year,
);
const snapshotQuarter = computed(
  () =>
    activeOverview.value?.period.quarter ??
    fallbackTargetPeriod.value?.quarter ??
    currentWita.quarter,
);

const snapshotPeriodLabel = computed(
  () => `TW ${toRomanQuarter(snapshotQuarter.value)} ${snapshotYear.value}`,
);

const recentQuery = computed(() => ({
  year: snapshotYear.value,
  quarter: snapshotQuarter.value,
  page: 1,
  limit: 3,
}));

const {
  data: recentArticlesData,
  pending: recentPending,
  error: recentError,
  refresh: refreshRecentArticles,
} = await useFetch<PublicArticlesResponse>(
  '/api/public/articles',
  {
    query: recentQuery,
    watch: [recentQuery],
  },
);

const sectorBars = computed(() => {
  const items: Pdrb17DistributionItem[] = activeOverview.value?.pdrb17Distribution ?? [];
  const maxCount = Math.max(1, ...items.map((s) => s.count));
  const topCode = activeOverview.value?.kpi.dominantKbli?.code;

  return items.map((s) => {
    const isTop = topCode && s.kbliCodes.includes(topCode);
    const heightPct = s.count === 0 ? 4 : Math.max(14, Math.round((s.count / maxCount) * 100));
    const shortCode = s.groupCode === 'R,S,T,U' ? 'R–U' : s.groupCode === 'S,T,U,V' ? 'S–V' : s.groupCode;

    let barClass = 'bg-[#D7E5DF]';
    if (s.count === 0) {
      barClass = 'bg-[#C2593F]';
    } else if (isTop || s.count >= 5) {
      barClass = 'bg-[#0F4C3A]';
    } else if (s.count <= 2) {
      barClass = 'bg-[#D97706]';
    } else {
      barClass = 'bg-[#94B5A7]';
    }

    return {
      groupCode: s.groupCode,
      shortCode,
      name: s.shortName,
      count: s.count,
      heightPct,
      barClass,
    };
  });
});

const coveredSectorsCount = computed(
  () => sectorBars.value.filter((s) => s.count > 0).length,
);

const gapSectorCodesText = computed(() => {
  const gaps = sectorBars.value.filter((s) => s.count === 0).map((s) => s.shortCode);
  return gaps.length > 0 ? gaps.slice(0, 4).join(', ') + (gaps.length > 4 ? '…' : '') : 'Nihil';
});

const topExpenditureItems = computed(() => {
  const dist = activeOverview.value?.expenditureDistribution ?? [];
  const total = Math.max(1, activeOverview.value?.kpi.totalVerified ?? 1);
  return [...dist]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e, idx) => ({
      code: e.component,
      label: getExpenditureLabel(e.component, false),
      count: e.count,
      percent: Math.round((e.count / total) * 100),
      dotClass: idx === 2 ? 'bg-[#C2593F]' : 'bg-[#0F4C3A]',
    }));
});

const dominantSectorText = computed(() => {
  const dom = activeOverview.value?.kpi.dominantKbli;
  if (!dom) return 'Menunggu data terverifikasi';
  return `${dom.code} • ${dom.name}`;
});

const deltaBadge = computed(() => {
  const d = activeOverview.value?.kpi.deltaPercent;
  if (d === null || d === undefined) return null;
  return {
    text: `${d >= 0 ? '↑ +' : '↓ '}${d}%`,
    isPositive: d >= 0,
  };
});

const previewModalOpen = ref(false);
const selectedPreviewArticle = ref<PublicArticleItem | null>(null);

function openPreviewModal(article: PublicArticleItem) {
  selectedPreviewArticle.value = article;
  previewModalOpen.value = true;
}

onMounted(() => {
  if (route.hash === '#cara-kerja') {
    setTimeout(() => {
      const target = document.getElementById('cara-kerja');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  }
});

const taxonomyPillars = [
  {
    title: '17 Kategori KBLI 2025',
    caption: 'Memetakan seluruh 22 huruf KBLI (A–V) Lapangan Usaha resmi BPS secara konsisten.',
    icon: 'i-lucide-layout-grid',
    iconBoxClass: 'bg-[#EFF6FF] text-[#0B57D0]',
  },
  {
    title: '6 Komponen Pengeluaran',
    caption: 'Dari Konsumsi Rumah Tangga, PMTB, hingga Ekspor Barang & Jasa daerah.',
    icon: 'i-lucide-pie-chart',
    iconBoxClass: 'bg-[#ECFDF5] text-[#059669]',
  },
  {
    title: '4 Sinyal Dinamika Riil',
    caption: 'Membedakan dampak volume output riil (ADHK) dengan pergerakan tingkat harga.',
    icon: 'i-lucide-trending-up',
    iconBoxClass: 'bg-[#ECFDF5] text-[#059669]',
  },
  {
    title: 'Verifikasi Human-in-the-Loop',
    caption: 'Setiap berita ditelaah lokus kecamatan dan keabsahan faktanya oleh Tim Nerwilis.',
    icon: 'i-lucide-check-circle-2',
    iconBoxClass: 'bg-[#EFF6FF] text-[#0B57D0]',
  },
];

const capabilitySteps = [
  {
    num: '01',
    tag: 'Penjaringan Terpadu',
    title: 'Pemantauan Media Lokal Kaltara & Transmisi Nasional',
    description:
      'Crawler otomatis menghimpun pemberitaan ekonomi Kabupaten Tana Tidung dari portal lokal serta kebijakan strategis nasional yang berdampak ke daerah.',
    highlights: ['Berita Lokal KTT', 'Dampak Nasional', 'Deduplikasi Cerdas'],
  },
  {
    num: '02',
    tag: 'Taksonomi Ekonomi',
    title: 'Klasifikasi Sektor Usaha & Kelompok Permintaan',
    description:
      'Setiap peristiwa ekonomi dipetakan ke sektor lapangan usaha (KBLI 2025) dan komponen pengeluaran PDRB beserta arah dampaknya pada volume dan harga.',
    highlights: ['17 Sektor KBLI', '6 Pengeluaran', 'Volume vs Harga'],
  },
  {
    num: '03',
    tag: 'Audit & Kurasi',
    title: 'Kurasi Ketat Berita Ekonomi oleh Tim Nerwilis',
    description:
      'Tidak ada draf mentah yang langsung tayang. Setiap fenomena ditelaah lokus kecamatannya, kejelasan ringkasan, serta kutipan beritanya.',
    highlights: ['Human-in-the-Loop', 'Sitasi Berita', 'Arsip Periodik'],
  },
  {
    num: '04',
    tag: 'Intelijen & Publikasi',
    title: 'Deteksi Sektor Kosong, Tren Periodik & Ikhtisar BRS',
    description:
      'Memantau sebaran bukti pada 17 sektor usaha, menelusuri tren antar-triwulan, mengekspor tabel Excel 10 kolom, dan menyusun narasi terstruktur.',
    highlights: ['Gap Detector', 'Ekspor Excel (.xlsx)', 'Sintesis Narasi'],
  },
];
</script>

<template>
  <div class="bg-[#F9F8F6] pb-20">
    <!-- SECTION 1: SUPER PREMIUM DAYLIGHT SAAS HERO + 3-COLUMN BENTO -->
    <section
      aria-label="Pengenalan Portal Intelijen Ekonomi SIPENA KTT"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10 sm:pt-12"
    >
      <!-- Centered Editorial SaaS Hero -->
      <div class="text-center max-w-3xl mx-auto space-y-5 hero-entrance">
        <div
          class="inline-flex items-center gap-2.5 bg-white border border-[#E7E4DC] rounded-full pl-2 pr-4 py-1.5 shadow-[0_1px_3px_rgba(26,29,27,0.04)] text-xs font-semibold text-[#3D423F]"
        >
          <span class="px-2.5 py-0.5 rounded-full bg-[#C2593F] text-white text-[11px] font-bold tabular-nums">
            {{ snapshotPeriodLabel }}
          </span>
          <span class="tabular-nums">
            {{ formatNumberId(activeOverview?.kpi.totalVerified ?? 0) }} Fenomena Terkurasi • {{ coveredSectorsCount }} dari 17 Sektor KBLI Aktif
          </span>
        </div>

        <h1
          class="text-3xl sm:text-5xl font-extrabold tracking-[-0.035em] text-[#1A1D1B] leading-[1.08] font-display"
        >
          Intelijen Ekonomi Daerah yang
          <span class="text-[#0F4C3A]">Terstruktur &amp; Terverifikasi.</span>
        </h1>

        <p class="text-[15px] sm:text-base text-[#5C615E] leading-relaxed max-w-2xl mx-auto">
          Memantau pergerakan harga komoditas, realisasi belanja modal, dan dinamika 17 sektor usaha
          di Kabupaten Tana Tidung secara transparan untuk penyusunan PDRB.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
          <NuxtLink
            to="/linimasa"
            class="btn-primary-gradient h-11 px-6 rounded-[10px] text-sm font-semibold inline-flex items-center gap-2 font-display"
          >
            <span>Jelajahi Linimasa Ekonomi</span>
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
          </NuxtLink>

          <NuxtLink
            to="/#cara-kerja"
            class="h-11 px-5 rounded-[10px] bg-white hover:bg-[#F2F0EB]/70 border border-[#DDD9D0] text-[#1A1D1B] text-sm font-semibold inline-flex items-center gap-2 transition-colors font-display"
          >
            <span>Pelajari Taksonomi KBLI 2025</span>
          </NuxtLink>
        </div>
      </div>

      <!-- 3-Column Bento Showcase -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-10 hero-entrance hero-entrance-delayed">
        <!-- Bento 1: 17-Sector Pulse -->
        <div
          class="lg:col-span-5 bg-white border border-[#E7E4DC] rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,29,27,0.03),0_10px_24px_-12px_rgba(26,29,27,0.07)] flex flex-col justify-between"
        >
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[11px] font-bold uppercase tracking-[0.04em] text-[#6B6F6C]">
              Distribusi 17 Sektor Lapangan Usaha
            </span>
            <span class="px-2.5 py-0.5 rounded-full bg-[#E7F3EE] text-[#0F4C3A] text-[11px] font-bold tabular-nums">
              {{ snapshotPeriodLabel }}
            </span>
          </div>

          <div v-if="sectorBars.length > 0" class="pt-1">
            <div class="h-36 flex items-end gap-1.5 border-b border-[#EFECE6] pb-2">
              <NuxtLink
                v-for="bar in sectorBars"
                :key="bar.groupCode"
                :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
                :title="`${bar.groupCode} — ${bar.name}: ${bar.count} bukti`"
                class="flex-1 h-full flex flex-col justify-end items-center group"
              >
                <span
                  class="text-[10px] font-bold text-[#1A1D1B] opacity-0 group-hover:opacity-100 transition-opacity mb-1 tabular-nums"
                >
                  {{ bar.count }}
                </span>
                <div
                  class="w-full rounded-t-[4px] transition-[height,opacity] duration-300 group-hover:opacity-85"
                  :class="bar.barClass"
                  :style="{ height: `${bar.heightPct}%` }"
                />
              </NuxtLink>
            </div>
            <div class="flex items-center gap-1.5 pt-2">
              <span
                v-for="bar in sectorBars"
                :key="`lbl-${bar.groupCode}`"
                class="flex-1 text-center text-[10px] font-bold tabular-nums"
                :class="bar.count === 0 ? 'text-[#C2593F]' : 'text-[#6B6F6C]'"
              >
                {{ bar.shortCode }}
              </span>
            </div>
          </div>
          <div
            v-else
            class="h-36 rounded-xl bg-[#FAF9F7] border border-dashed border-[#E7E4DC] flex items-center justify-center text-xs text-[#6B6F6C]"
          >
            Belum ada data sebaran sektor pada periode ini.
          </div>

          <div class="pt-3 mt-3 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C615E]">
            <span class="truncate">
              Dominan: <strong class="text-[#0F4C3A]">{{ dominantSectorText }}</strong>
            </span>
            <span class="shrink-0">
              Gap 0: <strong class="text-[#C2593F]">{{ gapSectorCodesText }}</strong>
            </span>
          </div>
        </div>

        <!-- Bento 2: Expenditure Components -->
        <div
          class="lg:col-span-4 bg-white border border-[#E7E4DC] rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,29,27,0.03),0_10px_24px_-12px_rgba(26,29,27,0.07)] flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="text-[11px] font-bold uppercase tracking-[0.04em] text-[#6B6F6C]">
                Sisi Pengeluaran PDRB
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-[#E7F3EE] text-[#0F4C3A] text-[11px] font-bold">
                6 Komponen
              </span>
            </div>

            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-extrabold tracking-tight text-[#1A1D1B] tabular-nums font-display">
                {{ formatNumberId(activeOverview?.kpi.totalVerified ?? 0) }}
              </span>
              <span class="text-sm font-semibold text-[#6B6F6C]">Fenomena</span>
              <span
                v-if="deltaBadge"
                class="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                :class="deltaBadge.isPositive ? 'bg-[#E7F3EE] text-[#0F4C3A]' : 'bg-[#FCECE8] text-[#B4482D]'"
              >
                {{ deltaBadge.text }}
              </span>
            </div>
            <p class="text-xs text-[#5C615E] mt-1 leading-relaxed">
              Sebaran kontribusi komponen pengeluaran utama penggerak ekonomi triwulan berjalan.
            </p>
          </div>

          <div class="mt-4 space-y-2">
            <div
              v-for="item in topExpenditureItems"
              :key="item.code"
              class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#EFECE6] text-xs font-semibold"
            >
              <span class="flex items-center gap-2 text-[#1A1D1B] truncate">
                <span class="w-2 h-2 rounded-full shrink-0" :class="item.dotClass" />
                <span class="truncate">{{ item.label }}</span>
              </span>
              <span class="text-[#0F4C3A] tabular-nums shrink-0">{{ item.percent }}%</span>
            </div>
          </div>
        </div>

        <!-- Bento 3: Source Credibility Radar -->
        <div
          class="lg:col-span-3 bg-white border border-[#E7E4DC] rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,29,27,0.03),0_10px_24px_-12px_rgba(26,29,27,0.07)] flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="text-[11px] font-bold uppercase tracking-[0.04em] text-[#6B6F6C]">
                Radar Sumber
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-[#FCECE8] text-[#B4482D] text-[11px] font-bold">
                Live Sync
              </span>
            </div>

            <div class="text-3xl font-extrabold tracking-tight text-[#1A1D1B] tabular-nums font-display">
              {{ activeOverview?.sourceBreakdown.regional ?? 0 }} : {{ activeOverview?.sourceBreakdown.national ?? 0 }}
            </div>
            <p class="text-xs text-[#5C615E] mt-1 leading-relaxed">
              Rasio liputan portal lokal Kaltara terhadap media nasional.
            </p>
          </div>

          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#EFECE6] text-xs font-semibold">
              <span class="text-[#575B58]">Portal Lokal</span>
              <span class="text-[#0F4C3A] tabular-nums">{{ activeOverview?.sourceBreakdown.regional ?? 0 }} Berita</span>
            </div>
            <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#EFECE6] text-xs font-semibold">
              <span class="text-[#575B58]">Portal Nasional</span>
              <span class="text-[#0F4C3A] tabular-nums">{{ activeOverview?.sourceBreakdown.national ?? 0 }} Berita</span>
            </div>
            <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#EFECE6] text-xs font-semibold">
              <span class="text-[#575B58]">Validasi Nerwilis</span>
              <span class="text-[#0F4C3A]">100% Sah</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: 3 LATEST CURATED PHENOMENA CARDS -->
    <section
      aria-label="Cuplikan Fenomena Ekonomi Terkini"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
    >
      <div class="flex items-center justify-between gap-2 mb-4">
        <h2 class="text-sm font-bold uppercase tracking-[0.04em] text-[#6B6F6C]">
          Fenomena Terkurasi Terbaru ({{ snapshotPeriodLabel }})
        </h2>
        <NuxtLink
          :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
          class="text-xs font-semibold text-[#0F4C3A] hover:underline"
        >
          Lihat seluruhnya di Linimasa →
        </NuxtLink>
      </div>

      <UAlert
        v-if="recentError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Gagal memuat cuplikan fenomena terkini"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            size="xs"
            label="Muat Ulang"
            @click="() => { refreshRecentArticles(); }"
          />
        </template>
      </UAlert>

      <div v-else-if="recentPending && !recentArticlesData" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="bg-white border border-[#E7E4DC] rounded-2xl p-5 space-y-2.5">
          <div class="h-3 w-32 rounded bg-[#EFECE6]" />
          <div class="h-4 w-full rounded bg-[#F2F0EB]" />
          <div class="h-3 w-2/3 rounded bg-[#F2F0EB]" />
        </div>
      </div>

      <div v-else-if="recentArticlesData && recentArticlesData.items.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article
          v-for="art in recentArticlesData.items"
          :key="art.id"
          class="bg-white border border-[#E7E4DC] hover:border-[#0F4C3A]/40 rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,29,27,0.03)] hover:shadow-md transition-all group relative flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 text-[11px] font-bold mb-2">
              <span class="text-[#0F4C3A]">
                KBLI {{ art.kbliCategory }} • {{ art.sourcePortal }}
              </span>
              <span class="text-[#6B6F6C] tabular-nums shrink-0">
                {{ formatDateId(art.publishedAt) }}
              </span>
            </div>
            <h3 class="text-[14px] font-bold text-[#1A1D1B] leading-snug line-clamp-2 mb-2">
              <button
                type="button"
                class="text-left group-hover:text-[#0F4C3A] transition-colors cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0F4C3A]"
                @click="openPreviewModal(art)"
              >
                {{ art.title }}
              </button>
            </h3>
            <p class="text-xs text-[#5C615E] line-clamp-2 leading-relaxed">
              {{ art.summary }}
            </p>
          </div>
          <div v-if="art.kbliImpact || art.expenditureComponent" class="mt-3 pt-2.5 border-t border-[#EFECE6] flex items-center justify-between gap-2 text-[11px] text-[#6B6F6C]">
            <span v-if="art.expenditureComponent" class="truncate">
              {{ getExpenditureLabel(art.expenditureComponent, false) }}
            </span>
            <span v-if="art.kbliImpact" class="font-bold text-[#0F4C3A] shrink-0">
              {{ getKbliImpactBadge(art.kbliImpact).shortLabel }}
            </span>
          </div>
        </article>
      </div>

      <div v-else class="bg-white border border-dashed border-[#DEDAD0] rounded-2xl p-8 text-center space-y-2">
        <p class="text-xs text-[#5C615E]">
          Belum ada catatan fenomena terverifikasi yang dipublikasikan.
        </p>
        <NuxtLink
          :to="user ? '/admin/review' : '/login'"
          class="inline-flex items-center gap-1 text-xs font-semibold text-[#0F4C3A] hover:underline"
        >
          <span>{{ user ? 'Buka Antrean Review' : 'Masuk Admin' }} →</span>
        </NuxtLink>
      </div>
    </section>

    <!-- SECTION 3: METODOLOGI & ALUR KERJA (#cara-kerja) -->
    <section
      id="cara-kerja"
      aria-label="Cara Kerja dan Metodologi SIPENA KTT"
      class="border-t border-[#E7E4DC] bg-white py-14 sm:py-16 scroll-mt-20"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div class="max-w-2xl space-y-2.5">
          <div class="text-xs font-bold uppercase tracking-[0.06em] text-[#C2593F]">
            Arsitektur &amp; Metodologi Kerja
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1D1B] leading-tight font-display">
            Dari Pemberitaan Daerah Menjadi Peta Fenomena Ekonomi Terstruktur
          </h2>
          <p class="text-sm text-[#5C615E] leading-relaxed">
            Alur kerja terpadu yang mendokumentasikan sinyal sektor ekonomi secara sistematis,
            terklasifikasi, dan dapat diakses terbuka oleh publik.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <article
            v-for="step in capabilitySteps"
            :key="step.num"
            class="bg-[#F9F8F6] border border-[#E7E4DC] rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-bold uppercase tracking-wider text-[#0F4C3A]">
                  {{ step.num }} • {{ step.tag }}
                </span>
              </div>
              <h3 class="text-lg font-bold tracking-tight text-[#1A1D1B] font-display leading-snug">
                {{ step.title }}
              </h3>
              <p class="text-[13.5px] text-[#5C615E] leading-relaxed">
                {{ step.description }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E7E4DC]">
              <span
                v-for="tag in step.highlights"
                :key="tag"
                class="px-2.5 py-1 rounded-md bg-white border border-[#E7E4DC] text-xs font-semibold text-[#3D423F]"
              >
                {{ tag }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- SECTION 4: EXECUTIVE BOTTOM CTA BANNER -->
    <section
      aria-label="Ajakan Eksplorasi Portal Publik"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
    >
      <div
        class="rounded-2xl bg-[#0F4C3A] p-7 sm:p-10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_20px_50px_-15px_rgba(15,76,58,0.28)]"
      >
        <div class="space-y-2 max-w-2xl">
          <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display">
            Siap Menelusuri Pergerakan Ekonomi Kabupaten Tana Tidung per Sektor?
          </h2>
          <p class="text-xs sm:text-sm text-[#D7E5DF] leading-relaxed">
            Saring laporan berita berdasarkan 17 Kategori KBLI, 6 Komponen Pengeluaran, arah dampak
            riil/harga, maupun tampilan grafik interaktif.
          </p>
        </div>

        <NuxtLink
          to="/linimasa"
          class="h-11 px-6 rounded-[10px] bg-white hover:bg-[#F9F8F6] text-[#0F4C3A] text-sm font-bold inline-flex items-center gap-2 shrink-0 transition-colors font-display shadow-sm"
        >
          <span>Buka Linimasa Lengkap</span>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- Preview Detail Modal -->
    <PublicArticleDetailModal v-model:open="previewModalOpen" :article="selectedPreviewArticle" />
  </div>
</template>
