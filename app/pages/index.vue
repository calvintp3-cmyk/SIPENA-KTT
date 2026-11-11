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
  KbliDistributionItem,
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
  title: 'SIPENA KTT — Portal Intelijen Ekonomi & Fenomena PDRB Kabupaten Tana Tidung',
  meta: [
    {
      name: 'description',
      content:
        'Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan.',
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

const { data: recentArticlesData, pending: recentPending } = await useFetch<PublicArticlesResponse>(
  '/api/public/articles',
  {
    query: recentQuery,
    watch: [recentQuery],
  },
);

const topSectors = computed<KbliDistributionItem[]>(() =>
  (activeOverview.value?.kbliDistribution ?? []).slice(0, 3),
);

const maxTopSectorCount = computed<number>(() =>
  Math.max(1, ...topSectors.value.map((s: KbliDistributionItem) => s.count)),
);

const previewModalOpen = ref(false);
const selectedPreviewArticle = ref<PublicArticleItem | null>(null);

function openPreviewModal(article: PublicArticleItem) {
  selectedPreviewArticle.value = article;
  previewModalOpen.value = true;
}

const taxonomyPillars = [
  {
    metric: '17 Kategori KBLI',
    caption: 'Memetakan seluruh 21 huruf KBLI (A–U) Lapangan Usaha resmi BPS',
    icon: 'i-solar-buildings-2-bold-duotone',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  {
    metric: '6 Komponen',
    caption: 'PDRB Pengeluaran dari Konsumsi Rumah Tangga hingga Ekspor Neto',
    icon: 'i-solar-wallet-money-bold-duotone',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  {
    metric: '4 Klaster Warna',
    caption: 'Pemetaan sinyal produksi riil (ADHK) dan tekanan harga (ADHB)',
    icon: 'i-solar-chart-square-bold-duotone',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  {
    metric: 'Verifikasi Nerwilis',
    caption: 'Kurasi berlapis sebelum publikasi transparan kepada masyarakat',
    icon: 'i-solar-shield-check-bold-duotone',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/80',
  },
];

const capabilityBento = [
  {
    span: 'lg:col-span-7',
    eyebrow: '01 • Penjaringan Media Terkurasi',
    title: 'Pemantauan Media Regional Kaltara & Isu Transmisi Nasional',
    description:
      'Crawler harian menghimpun pemberitaan dari portal berita Kalimantan Utara dan isu komoditas strategis nasional, dilengkapi catatan lapangan manual oleh tim statistisi.',
    icon: 'i-solar-radar-2-bold-duotone',
    accentBg: 'from-blue-50/90 to-indigo-50/40 border-blue-200/80',
    iconBox: 'bg-blue-600 text-white shadow-blue-600/25',
    eyebrowClass: 'text-blue-700',
    tags: ['Portal Kaltara', 'Isu Strategis Nasional', 'Deduplikasi Cerdas'],
  },
  {
    span: 'lg:col-span-5',
    eyebrow: '02 • Taksonomi Dua Sisi PDRB',
    title: 'Klasifikasi 17 KBLI & 6 Pengeluaran',
    description:
      'Setiap peristiwa ekonomi dipetakan ganda pada sisi produksi dan penggunaan beserta arah dampaknya terhadap volume riil dan indeks harga.',
    icon: 'i-solar-diagram-up-bold-duotone',
    accentBg: 'from-emerald-50/90 to-teal-50/40 border-emerald-200/80',
    iconBox: 'bg-emerald-600 text-white shadow-emerald-600/25',
    eyebrowClass: 'text-emerald-700',
    tags: ['Lapangan Usaha', 'Sisi Pengeluaran', 'ADHK vs ADHB'],
  },
  {
    span: 'lg:col-span-5',
    eyebrow: '03 • Audit & Validasi Berlapis',
    title: 'Kurasi Ketat Tim Nerwilis BPS KTT',
    description:
      'Tidak ada draf mentah yang langsung tayang ke publik. Setiap fenomena ditelaah relevansi wilayah, kejelasan ringkasan, dan akurasi sektornya terlebih dahulu.',
    icon: 'i-solar-checklist-minimalistic-bold-duotone',
    accentBg: 'from-amber-50/90 to-orange-50/35 border-amber-200/80',
    iconBox: 'bg-amber-600 text-white shadow-amber-600/25',
    eyebrowClass: 'text-amber-700',
    tags: ['Human-in-the-Loop', 'Sitasi Jelas', 'Arsip Periodik'],
  },
  {
    span: 'lg:col-span-7',
    eyebrow: '04 • Intelijen Gap & Sintesis BRS',
    title: 'Deteksi Sektor Kosong, Tren 8 Triwulan & Penulisan Narasi',
    description:
      'Analis Nerwilis memantau kekosongan bukti pada 17 sektor KBLI secara seketika, menelusuri pergeseran q-to-q dan y-on-y, serta menyusun narasi Berita Resmi Statistik bersitasi.',
    icon: 'i-solar-document-add-bold-duotone',
    accentBg: 'from-violet-50/90 to-indigo-50/40 border-violet-200/80',
    iconBox: 'bg-violet-600 text-white shadow-violet-600/25',
    eyebrowClass: 'text-violet-700',
    tags: ['Radar Gap 17 Sektor', 'Ekspor 10 Kolom', 'Draf Narasi BRS'],
  },
];
</script>

<template>
  <div class="pb-16">
    <!-- SECTION 1: MIDNIGHT COBALT–EMERALD HERO -->
    <section
      aria-label="Pengenalan Portal Intelijen Ekonomi SIPENA KTT"
      class="hero-mesh-dark relative overflow-hidden border-b border-slate-800/80"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 sm:pt-14 sm:pb-24 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          <!-- Left Editorial Column -->
          <Motion
            :initial="{ opacity: 0, y: 14 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4 }"
            class="lg:col-span-7 space-y-6"
          >
            <div
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-200"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400" />
              <span>BPS Kabupaten Tana Tidung • Fungsi Nerwilis</span>
            </div>

            <div class="space-y-4">
              <h1
                class="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-white leading-[1.12]"
              >
                Satu Portal Intelijen
                <span
                  class="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-emerald-300"
                >
                  Dinamika Ekonomi Tana Tidung
                </span>
              </h1>

              <p class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi
                Kabupaten Tana Tidung secara terkurasi dan transparan.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-1">
              <NuxtLink
                to="/linimasa"
                class="btn-primary-gradient h-11 px-6 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
              >
                <span>Jelajahi Linimasa Ekonomi</span>
                <UIcon name="i-solar-arrow-right-bold-duotone" class="w-4 h-4" />
              </NuxtLink>

              <NuxtLink
                to="/#cara-kerja"
                class="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors backdrop-blur-md"
              >
                <UIcon name="i-solar-layers-minimalistic-bold-duotone" class="w-4 h-4 text-sky-300" />
                <span>Pelajari Metodologi</span>
              </NuxtLink>

              <NuxtLink
                :to="user ? '/admin' : '/login'"
                class="h-11 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <UIcon name="i-solar-shield-keyhole-bold-duotone" class="w-4 h-4 text-emerald-300" />
                <span>{{ user ? 'Buka Workstation' : 'Akses Tim Nerwilis' }}</span>
              </NuxtLink>
            </div>
          </Motion>

          <!-- Right Live API Snapshot Bento -->
          <Motion
            :initial="{ opacity: 0, y: 18 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.08 }"
            class="lg:col-span-5"
          >
            <div
              class="rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-white/15 p-5 sm:p-6 shadow-[0_28px_60px_-15px_rgba(0,0,0,0.55)] space-y-5 text-white"
            >
              <div class="flex items-center justify-between gap-2 pb-3.5 border-b border-white/10">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-emerald-500/30 border border-white/15 flex items-center justify-center"
                  >
                    <UIcon name="i-solar-pulse-2-bold-duotone" class="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white">Ringkasan Data Live</div>
                    <div class="text-[11px] text-slate-400">Terhubung ke arsip terverifikasi</div>
                  </div>
                </div>

                <span
                  class="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold tabular-nums"
                >
                  {{ snapshotPeriodLabel }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-white/[0.05] border border-white/10 p-3.5 space-y-1">
                  <div class="text-[11px] font-medium text-slate-400">Fenomena Valid</div>
                  <div class="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
                    {{ formatNumberId(activeOverview?.kpi.totalVerified ?? 0) }}
                  </div>
                  <div class="text-[11px] text-emerald-300 font-medium">
                    Terverifikasi Nerwilis
                  </div>
                </div>

                <div class="rounded-xl bg-white/[0.05] border border-white/10 p-3.5 space-y-1">
                  <div class="text-[11px] font-medium text-slate-400">Sinyal Ekspansi Riil</div>
                  <div class="text-2xl sm:text-3xl font-extrabold text-emerald-300 tabular-nums">
                    {{ activeOverview?.kpi.expansionStats.positiveRealPercent ?? 0 }}%
                  </div>
                  <div class="text-[11px] text-slate-300 tabular-nums">
                    {{ formatNumberId(activeOverview?.kpi.expansionStats.expansionCount ?? 0) }} catatan naik NTB
                  </div>
                </div>
              </div>

              <div class="space-y-2.5">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="font-semibold text-slate-300">Sektor KBLI Teraktif ({{ snapshotPeriodLabel }})</span>
                  <span class="text-slate-400">Proporsi bukti</span>
                </div>

                <div v-if="topSectors.length > 0" class="space-y-2.5">
                  <div
                    v-for="sector in topSectors"
                    :key="sector.code"
                    class="space-y-1"
                  >
                    <div class="flex items-center justify-between gap-2 text-xs">
                      <span class="text-slate-200 font-medium truncate">
                        <span class="font-bold text-white mr-1">[{{ sector.code }}]</span>
                        {{ sector.name }}
                      </span>
                      <span class="text-slate-300 font-semibold tabular-nums shrink-0">
                        {{ sector.count }} ({{ sector.percentage }}%)
                      </span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :style="{
                          width: `${Math.max(8, Math.round((sector.count / maxTopSectorCount) * 100))}%`,
                          backgroundColor: getKbliClusterTheme(sector.code).hex,
                        }"
                      />
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="rounded-xl bg-white/[0.04] border border-dashed border-white/15 p-3.5 text-xs text-slate-300 leading-relaxed"
                >
                  Belum ada catatan fenomena terverifikasi pada database saat ini. Jalankan scraping atau
                  input manual di Workstation Admin untuk mengisi linimasa.
                </div>
              </div>

              <NuxtLink
                :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
                class="w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>Buka Eksplorasi &amp; Grafik Interaktif</span>
                <UIcon name="i-lucide-arrow-up-right" class="w-3.5 h-3.5 text-emerald-300" />
              </NuxtLink>
            </div>
          </Motion>
        </div>
      </div>
    </section>

    <!-- SECTION 2: FLOATING TAXONOMY TRUST STRIP -->
    <section
      aria-label="Standar Taksonomi PDRB Resmi"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20"
    >
      <div
        class="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_14px_36px_-14px_rgba(15,23,42,0.12)] p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <div
          v-for="item in taxonomyPillars"
          :key="item.metric"
          class="flex items-start gap-3.5"
        >
          <div
            class="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
            :class="item.badgeClass"
          >
            <UIcon :name="item.icon" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-extrabold text-[#0F172A] tracking-tight">
              {{ item.metric }}
            </div>
            <p class="text-xs text-slate-500 leading-relaxed mt-0.5">
              {{ item.caption }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: METODOLOGI & KAPABILITAS BENTO GRID (#cara-kerja) -->
    <section
      id="cara-kerja"
      aria-label="Cara Kerja dan Metodologi SIPENA KTT"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-18 pb-10 space-y-8 scroll-mt-24"
    >
      <div class="max-w-2xl space-y-2.5">
        <div
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold"
        >
          <UIcon name="i-solar-layers-minimalistic-bold-duotone" class="w-3.5 h-3.5" />
          <span>Arsitektur &amp; Metodologi Kerja</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
          Dari Pemberitaan Daerah Hingga Rekonsiliasi PDRB Resmi
        </h2>
        <p class="text-sm text-slate-600 leading-relaxed">
          Alur kerja terpadu yang membantu tim statistik mendokumentasikan sinyal sektor riil secara
          sistematis, terklasifikasi dua sisi, dan dapat diakses terbuka oleh publik.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <article
          v-for="card in capabilityBento"
          :key="card.title"
          class="rounded-2xl border bg-gradient-to-br p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.08)]"
          :class="[card.span, card.accentBg]"
        >
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <span class="text-xs font-bold tracking-wide" :class="card.eyebrowClass">
                {{ card.eyebrow }}
              </span>
              <div
                class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                :class="card.iconBox"
              >
                <UIcon :name="card.icon" class="w-6 h-6" />
              </div>
            </div>

            <div class="space-y-2">
              <h3 class="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A]">
                {{ card.title }}
              </h3>
              <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {{ card.description }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-2">
            <span
              v-for="tag in card.tags"
              :key="tag"
              class="px-2.5 py-1 rounded-lg bg-white/85 border border-slate-200/80 text-[11px] font-semibold text-slate-700"
            >
              {{ tag }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <!-- SECTION 4: LIVE RECENT PHENOMENA PREVIEW -->
    <section
      aria-label="Cuplikan Fenomena Ekonomi Terkini"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6"
    >
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="space-y-1.5">
          <div
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold"
          >
            <UIcon name="i-solar-document-text-bold-duotone" class="w-3.5 h-3.5" />
            <span>Cuplikan Arsip Terverifikasi • {{ snapshotPeriodLabel }}</span>
          </div>
          <h2 class="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            Fenomena Ekonomi Terbaru
          </h2>
          <p class="text-xs sm:text-sm text-slate-600">
            Klik kartu untuk membaca intisari pemetaan PDRB lengkap atau telusuri seluruh arsip per sektor.
          </p>
        </div>

        <NuxtLink
          :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
          class="btn-primary-gradient h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <span>Lihat Semua di Linimasa</span>
          <UIcon name="i-solar-arrow-right-bold-duotone" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <div v-if="recentPending && !recentArticlesData" class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div v-for="i in 3" :key="i" class="saas-card rounded-2xl p-6 space-y-3">
          <div class="h-3 w-28 rounded bg-slate-200" />
          <div class="h-5 w-4/5 rounded bg-slate-200" />
          <div class="h-14 w-full rounded bg-slate-100" />
        </div>
      </div>

      <div
        v-else-if="recentArticlesData && recentArticlesData.items.length > 0"
        class="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        <article
          v-for="art in recentArticlesData.items"
          :key="art.id"
          class="saas-card saas-card-interactive rounded-2xl overflow-hidden flex flex-col cursor-pointer relative pl-1.5"
          @click="openPreviewModal(art)"
        >
          <div
            class="absolute inset-y-0 left-0 w-1.5"
            :class="getKbliClusterTheme(art.kbliCategory).accentBarClass"
          />

          <div class="p-5 flex-1 flex flex-col justify-between gap-4">
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2 text-[11px]">
                <span
                  class="px-2.5 py-0.5 rounded-full font-semibold border truncate max-w-[170px]"
                  :class="getKbliClusterTheme(art.kbliCategory).pillClass"
                >
                  {{ getKbliClusterTheme(art.kbliCategory).label }}
                </span>
                <span class="text-slate-500 font-medium tabular-nums shrink-0">
                  {{ formatDateId(art.publishedAt) }}
                </span>
              </div>

              <h3 class="text-base font-bold text-[#0F172A] leading-snug line-clamp-2">
                {{ art.title }}
              </h3>

              <p class="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {{ art.summary || 'Ringkasan terverifikasi tersedia di tampilan detail.' }}
              </p>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
              <span class="font-semibold text-slate-700 truncate">
                {{ art.sourcePortal }}
                <template v-if="art.expenditureComponent">
                  • {{ getExpenditureLabel(art.expenditureComponent, false) }}
                </template>
              </span>

              <UBadge
                v-if="art.kbliImpact"
                :color="getKbliImpactBadge(art.kbliImpact).color"
                variant="subtle"
                size="xs"
                class="shrink-0"
              >
                {{ getKbliImpactBadge(art.kbliImpact).shortLabel }}
              </UBadge>
            </div>
          </div>
        </article>
      </div>

      <div
        v-else
        class="saas-card rounded-2xl p-8 text-center space-y-3"
      >
        <div
          class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center mx-auto"
        >
          <UIcon name="i-solar-archive-minimalistic-bold-duotone" class="w-6 h-6" />
        </div>
        <h3 class="text-base font-bold text-[#0F172A]">
          Arsip Publik Menunggu Kurasi Awal
        </h3>
        <p class="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Belum ada catatan fenomena terverifikasi yang dipublikasikan. Tim Nerwilis dapat menjalankan
          crawler atau input manual di Workstation Admin.
        </p>
        <div class="pt-1 flex justify-center gap-2.5">
          <NuxtLink
            to="/linimasa"
            class="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5"
          >
            <span>Buka Halaman Linimasa</span>
          </NuxtLink>
          <NuxtLink
            :to="user ? '/admin/review' : '/login'"
            class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span>{{ user ? 'Buka Antrean Review' : 'Masuk Admin' }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- SECTION 5: BOTTOM CTA BANNER -->
    <section
      aria-label="Ajakan Eksplorasi Portal Publik"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"
    >
      <div
        class="rounded-3xl hero-mesh-dark p-7 sm:p-10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-800 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]"
      >
        <div class="space-y-2 max-w-2xl">
          <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight">
            Siap Menelusuri Pergerakan Ekonomi Kabupaten Tana Tidung per Sektor?
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Saring laporan berita berdasarkan 17 Kategori KBLI, 6 Komponen Pengeluaran, arah dampak
            riil/harga, maupun tampilan grafik interaktif.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <NuxtLink
            to="/linimasa"
            class="btn-primary-gradient h-11 px-6 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            <span>Buka Linimasa Lengkap</span>
            <UIcon name="i-solar-arrow-right-bold-duotone" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Preview Detail Modal -->
    <PublicArticleDetailModal v-model:open="previewModalOpen" :article="selectedPreviewArticle" />
  </div>
</template>
