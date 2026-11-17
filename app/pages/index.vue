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
    const shortCode = s.groupCode === 'M,N' ? 'MN' : s.groupCode === 'R,S,T,U' ? 'RU' : s.groupCode;

    let barClass = 'bg-slate-300';
    if (s.count === 0) {
      barClass = 'bg-rose-400';
    } else if (isTop) {
      barClass = 'bg-gradient-to-b from-[#059669] to-[#10B981]';
    } else if (s.count <= 2) {
      barClass = 'bg-amber-500';
    } else if (s.count >= 5) {
      barClass = 'bg-gradient-to-b from-[#0B57D0] to-[#3B82F6]';
    } else {
      barClass = 'bg-slate-400';
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

const dominantSectorText = computed(() => {
  const dom = activeOverview.value?.kpi.dominantKbli;
  if (!dom) return 'Menunggu data terverifikasi';
  return `${dom.code} — ${dom.name}`;
});

const deltaBadgeText = computed(() => {
  const d = activeOverview.value?.kpi.deltaPercent;
  if (d === null || d === undefined) return null;
  return `${d >= 0 ? '↑ +' : '↓ '}${d}%`;
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
  <div class="bg-white pb-20">
    <!-- SECTION 1: MODERN EXECUTIVE HERO (Stripe/Apple Layered Daylight Showcase) -->
    <section
      aria-label="Pengenalan Portal Intelijen Ekonomi SIPENA KTT"
      class="relative overflow-hidden border-b border-slate-200/80 bg-[radial-gradient(80%_90%_at_75%_20%,#EFF6FF_0%,#F0FDF4_38%,#FFFFFF_78%)]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-16">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <!-- Left Editorial Column -->
          <div class="lg:col-span-5 space-y-6 hero-entrance">
            <div class="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0B57D0]">
              <UIcon name="i-lucide-shield-check" class="w-4 h-4 shrink-0" />
              <span>Portal Resmi Pemantau Ekonomi Daerah • Fungsi Nerwilis</span>
            </div>

            <div class="space-y-4">
              <h1
                class="text-3xl sm:text-4xl lg:text-[48px] font-extrabold tracking-[-0.035em] text-slate-900 leading-[1.08] font-display"
              >
                Satu Portal Intelijen
                <span class="text-[#0B57D0]">Dinamika Ekonomi</span>
                Tana Tidung
              </h1>

              <p class="text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi
                Kabupaten Tana Tidung secara terkurasi dan transparan bagi publik serta pengambil
                kebijakan.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-1">
              <NuxtLink
                to="/linimasa"
                class="btn-primary-gradient h-11 px-6 rounded-[10px] text-sm font-semibold inline-flex items-center gap-2 font-display"
              >
                <span>Jelajahi Linimasa Ekonomi</span>
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
              </NuxtLink>

              <NuxtLink
                to="/#cara-kerja"
                class="h-11 px-5 rounded-[10px] bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)] font-display"
              >
                <span>Pelajari Metodologi</span>
              </NuxtLink>
            </div>

            <div class="pt-5 border-t border-slate-200/80 grid grid-cols-3 gap-4 sm:gap-6">
              <div>
                <div class="text-lg sm:text-xl font-extrabold text-slate-900 font-display tracking-tight">
                  17 Sektor
                </div>
                <div class="text-xs text-slate-500 mt-0.5">Lapangan Usaha KBLI 2025</div>
              </div>
              <div>
                <div class="text-lg sm:text-xl font-extrabold text-slate-900 font-display tracking-tight">
                  6 Komponen
                </div>
                <div class="text-xs text-slate-500 mt-0.5">PDRB Sisi Pengeluaran</div>
              </div>
              <div>
                <div class="text-lg sm:text-xl font-extrabold text-slate-900 font-display tracking-tight">
                  100% Kurasi
                </div>
                <div class="text-xs text-slate-500 mt-0.5">Validasi Tim Nerwilis</div>
              </div>
            </div>
          </div>

          <!-- Right Layered Apple/Stripe Product Showcase -->
          <div class="lg:col-span-7 hero-entrance hero-entrance-delayed">
            <div class="relative">
              <!-- Main Browser-Style Live Showcase Window -->
              <div
                class="bg-white border border-slate-200/90 rounded-[18px] shadow-[0_30px_70px_-18px_rgba(15,23,42,0.14),0_8px_20px_-6px_rgba(15,23,42,0.06)] overflow-hidden"
              >
                <!-- Window Chrome -->
                <div class="h-11 px-5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <div class="text-xs font-semibold text-slate-600 truncate">
                    Sebaran Fenomena Ekonomi KBLI 2025 • {{ snapshotPeriodLabel }}
                  </div>
                  <div class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 shrink-0">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Live</span>
                  </div>
                </div>

                <!-- Window Body -->
                <div class="p-5 sm:p-6 space-y-5">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h2 class="text-base font-bold text-slate-900 font-display">
                        Aktivitas Sektor Lapangan Usaha
                      </h2>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Proporsi bukti berita terverifikasi di Kabupaten Tana Tidung
                      </p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#0B57D0] text-[11px] font-semibold tabular-nums shrink-0">
                      {{ snapshotPeriodLabel }}
                    </span>
                  </div>

                  <!-- Live 17-Sector Bar Chart -->
                  <div v-if="sectorBars.length > 0" class="pt-2">
                    <div class="h-44 flex items-end gap-1.5 sm:gap-2 border-b border-slate-100 pb-2">
                      <NuxtLink
                        v-for="bar in sectorBars"
                        :key="bar.groupCode"
                        :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
                        :title="`${bar.groupCode} — ${bar.name}: ${bar.count} bukti`"
                        class="flex-1 h-full flex flex-col justify-end items-center group"
                      >
                        <span
                          class="text-[10px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 tabular-nums"
                        >
                          {{ bar.count }}
                        </span>
                        <div
                          class="w-full rounded-t-[5px] transition-[height,opacity] duration-300 group-hover:opacity-85"
                          :class="bar.barClass"
                          :style="{ height: `${bar.heightPct}%` }"
                        />
                      </NuxtLink>
                    </div>
                    <div class="flex items-center gap-1.5 sm:gap-2 pt-2">
                      <span
                        v-for="bar in sectorBars"
                        :key="`lbl-${bar.groupCode}`"
                        class="flex-1 text-center text-[10px] font-semibold tabular-nums"
                        :class="bar.count === 0 ? 'text-rose-600' : 'text-slate-500'"
                      >
                        {{ bar.shortCode }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-else
                    class="h-44 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-500"
                  >
                    Belum ada sebaran sektor terverifikasi pada periode ini.
                  </div>

                  <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span class="text-slate-600 truncate">
                      Sektor Teraktif:
                      <strong class="text-slate-900">{{ dominantSectorText }}</strong>
                    </span>
                    <NuxtLink
                      :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
                      class="font-semibold text-[#0B57D0] hover:underline shrink-0 tabular-nums"
                    >
                      {{ coveredSectorsCount }}/17 Sektor Terisi →
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <!-- Cleanly Docked Floating Summary Cards (Zero Overlap with Chart) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 sm:px-3">
                <div
                  class="bg-white border border-slate-200/90 rounded-[14px] p-4 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.12)]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11.5px] font-semibold text-slate-500">
                      Fenomena Terverifikasi ({{ snapshotPeriodLabel }})
                    </span>
                    <span
                      v-if="deltaBadgeText"
                      class="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold tabular-nums"
                    >
                      {{ deltaBadgeText }}
                    </span>
                  </div>
                  <div class="mt-1.5 flex items-baseline gap-2.5">
                    <span class="text-3xl font-extrabold text-slate-900 font-display tracking-tight tabular-nums">
                      {{ formatNumberId(activeOverview?.kpi.totalVerified ?? 0) }}
                    </span>
                    <span class="text-xs text-slate-600">Berita sah &amp; terkurasi</span>
                  </div>
                </div>

                <div
                  class="bg-white border border-slate-200/90 rounded-[14px] p-4 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.12)]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11.5px] font-semibold text-slate-500">
                      Sinyal Peningkatan Aktivitas Riil
                    </span>
                    <span class="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0B57D0] text-[11px] font-bold">
                      ADHK
                    </span>
                  </div>
                  <div class="mt-1.5 flex items-baseline gap-2.5">
                    <span class="text-3xl font-extrabold text-[#0B57D0] font-display tracking-tight tabular-nums">
                      {{ activeOverview?.kpi.expansionStats.positiveRealPercent ?? 0 }}%
                    </span>
                    <span class="text-xs text-slate-600 tabular-nums">
                      {{ formatNumberId(activeOverview?.kpi.expansionStats.expansionCount ?? 0) }} berita sektor naik
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: STANDAR ARSITEKTUR DATA + FENOMENA TERBARU (LIVE) -->
    <section
      aria-label="Standar Arsitektur Data dan Cuplikan Fenomena Terkini"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16"
    >
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <!-- Left: 4 Taxonomy Pillars -->
        <div class="lg:col-span-7 space-y-6">
          <div class="text-xs font-bold uppercase tracking-[0.06em] text-[#0B57D0]">
            Standar &amp; Arsitektur Data Resmi
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div
              v-for="pillar in taxonomyPillars"
              :key="pillar.title"
              class="flex items-start gap-3.5"
            >
              <div
                class="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0"
                :class="pillar.iconBoxClass"
              >
                <UIcon :name="pillar.icon" class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-[15px] font-bold text-slate-900 font-display">
                  {{ pillar.title }}
                </h3>
                <p class="text-[13px] text-slate-600 leading-relaxed mt-1">
                  {{ pillar.caption }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Live Recent Phenomena Preview -->
        <div class="lg:col-span-5">
          <div class="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 space-y-3.5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-bold text-slate-900 font-display">
                Fenomena Terbaru ({{ snapshotPeriodLabel }})
              </h2>
              <NuxtLink
                :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
                class="text-xs font-semibold text-[#0B57D0] hover:underline"
              >
                Lihat semua di Linimasa →
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

            <div v-else-if="recentPending && !recentArticlesData" class="space-y-2.5">
              <div v-for="i in 3" :key="i" class="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <div class="h-3 w-32 rounded bg-slate-200" />
                <div class="h-4 w-full rounded bg-slate-100" />
              </div>
            </div>

            <div v-else-if="recentArticlesData && recentArticlesData.items.length > 0" class="space-y-2.5">
              <article
                v-for="art in recentArticlesData.items"
                :key="art.id"
                class="bg-white border border-slate-200/90 hover:border-[#0B57D0]/40 rounded-xl p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all group relative"
              >
                <div class="flex items-center justify-between gap-2 text-[11px] font-semibold mb-1">
                  <span :style="{ color: getKbliClusterTheme(art.kbliCategory).hex }">
                    KBLI {{ art.kbliCategory }} • {{ art.sourcePortal }}
                  </span>
                  <span class="text-slate-500 tabular-nums shrink-0">
                    {{ formatDateId(art.publishedAt) }}
                  </span>
                </div>
                <h3 class="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2">
                  <button
                    type="button"
                    class="text-left group-hover:text-[#0B57D0] transition-colors cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0B57D0]"
                    @click="openPreviewModal(art)"
                  >
                    {{ art.title }}
                  </button>
                </h3>
                <div v-if="art.kbliImpact || art.expenditureComponent" class="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span v-if="art.expenditureComponent" class="truncate">
                    {{ getExpenditureLabel(art.expenditureComponent, false) }}
                  </span>
                  <span v-if="art.kbliImpact" class="font-semibold text-emerald-700 shrink-0">
                    {{ getKbliImpactBadge(art.kbliImpact).shortLabel }}
                  </span>
                </div>
              </article>
            </div>

            <div v-else class="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2">
              <p class="text-xs text-slate-600">
                Belum ada catatan fenomena terverifikasi yang dipublikasikan.
              </p>
              <NuxtLink
                :to="user ? '/admin/review' : '/login'"
                class="inline-flex items-center gap-1 text-xs font-semibold text-[#0B57D0] hover:underline"
              >
                <span>{{ user ? 'Buka Antrean Review' : 'Masuk Admin' }} →</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: METODOLOGI & ALUR KERJA (#cara-kerja) -->
    <section
      id="cara-kerja"
      aria-label="Cara Kerja dan Metodologi SIPENA KTT"
      class="border-t border-slate-200/80 bg-slate-50/60 py-14 sm:py-16 scroll-mt-20"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div class="max-w-2xl space-y-2.5">
          <div class="text-xs font-bold uppercase tracking-[0.06em] text-[#0B57D0]">
            Arsitektur &amp; Metodologi Kerja
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Dari Pemberitaan Daerah Menjadi Peta Fenomena Ekonomi Terstruktur
          </h2>
          <p class="text-sm text-slate-600 leading-relaxed">
            Alur kerja terpadu yang mendokumentasikan sinyal sektor ekonomi secara sistematis,
            terklasifikasi, dan dapat diakses terbuka oleh publik.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <article
            v-for="step in capabilitySteps"
            :key="step.num"
            class="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_28px_-12px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-5"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-bold uppercase tracking-wider text-[#0B57D0]">
                  {{ step.num }} • {{ step.tag }}
                </span>
              </div>
              <h3 class="text-lg font-bold tracking-tight text-slate-900 font-display leading-snug">
                {{ step.title }}
              </h3>
              <p class="text-[13.5px] text-slate-600 leading-relaxed">
                {{ step.description }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              <span
                v-for="tag in step.highlights"
                :key="tag"
                class="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700"
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
        class="rounded-2xl bg-[#0F2942] p-7 sm:p-10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_20px_50px_-15px_rgba(15,41,66,0.3)]"
      >
        <div class="space-y-2 max-w-2xl">
          <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display">
            Siap Menelusuri Pergerakan Ekonomi Kabupaten Tana Tidung per Sektor?
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Saring laporan berita berdasarkan 17 Kategori KBLI, 6 Komponen Pengeluaran, arah dampak
            riil/harga, maupun tampilan grafik interaktif.
          </p>
        </div>

        <NuxtLink
          to="/linimasa"
          class="h-11 px-6 rounded-[10px] bg-white hover:bg-slate-100 text-[#0F2942] text-sm font-bold inline-flex items-center gap-2 shrink-0 transition-colors font-display shadow-sm"
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
