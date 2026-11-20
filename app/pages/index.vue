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
  UiSemanticColor,
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
  title: 'SIPENA KTT — Observatorium Fenomena Ekonomi Kabupaten Tana Tidung',
  meta: [
    {
      name: 'description',
      content:
        'Observatorium analisis fenomena ekonomi, dinamika 17 sektor usaha KBLI, pergerakan harga, dan transmisi pengeluaran PDRB Kabupaten Tana Tidung.',
    },
  ],
});

const {
  formatNumberId,
  getKbliImpactBadge,
  getExpenditureLabel,
} = usePdrbLabels();

function getImpactBadgeClasses(color: UiSemanticColor | undefined) {
  switch (color) {
    case 'success':
      return 'bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB]';
    case 'error':
      return 'bg-[#FBECE8] text-[#C8553D] border border-[#F8D2C9]';
    case 'warning':
      return 'bg-[#FEF7E6] text-[#B45309] border border-[#F3D89C]';
    case 'info':
      return 'bg-[#E6F4F2] text-[#0F766E] border border-[#B2DFDB]';
    default:
      return 'bg-[#ECEAE2] text-[#4A524E] border border-[#141917]/10';
  }
}

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
} = await useFetch<PublicArticlesResponse>(
  '/api/public/articles',
  {
    query: recentQuery,
    watch: [recentQuery],
  },
);

const recentArticles = computed(() => recentArticlesData.value?.items ?? []);
const leadArticle = computed(() => recentArticles.value[0] ?? null);
const secondaryArticles = computed(() => recentArticles.value.slice(1, 3));

const coveredSectorsCount = computed(() => {
  const dist = activeOverview.value?.pdrb17Distribution ?? [];
  return dist.filter((s: Pdrb17DistributionItem) => s.count > 0).length;
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

const methodologyColumns = [
  {
    num: '01',
    tag: 'Penjaringan Terarah',
    title: 'Pemantauan Media Lokal Kaltara & Kebijakan Nasional',
    desc: 'Penelusuran berkala atas pemberitaan ekonomi daerah, proyek strategis, pasar komoditas, dan kebijakan pusat yang mentransmisikan dampak langsung ke Tana Tidung.',
  },
  {
    num: '02',
    tag: 'Taksonomi Dua Sisi',
    title: 'Pemetaan KBLI 2025 & Komponen Pengeluaran PDRB',
    desc: 'Setiap peristiwa diklasifikasikan ke 17 Lapangan Usaha dan 6 Pengeluaran PDRB serta dinilai arah dampaknya: volume riil (ADHK) atau pergerakan harga.',
  },
  {
    num: '03',
    tag: 'Kurasi Analis BPS',
    title: 'Validasi Fakta, Lokus Wilayah & Deteksi Sektor Kosong',
    desc: 'Tim Neraca Wilayah menguji keaslian informasi, menetapkan lokus kecamatan, memastikan bukti representatif, serta memantau sektor yang belum memiliki bukti (gap 0).',
  },
  {
    num: '04',
    tag: 'Sintesis Narasi BRS',
    title: 'Pondasi Berita Resmi Statistik & Rekonsiliasi PDRB',
    desc: 'Bukti empiris diolah menjadi ikhtisar narasi terstruktur yang siap pakai untuk penyusunan Berita Resmi Statistik (BRS) dan ekspor data tabel analitis.',
  },
];
</script>

<template>
  <div class="bg-[#F6F5F1] pb-24">
    <!-- SECTION 1: ASYMMETRIC OBSERVATORY HERO -->
    <section
      aria-label="Pengantar Observatorium Fenomena Ekonomi SIPENA KTT"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-12"
    >
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <!-- Left (7 Cols): Editorial Headline & Thesis Statement -->
        <div class="lg:col-span-7 space-y-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3F0EA] border border-[#BBD8CB] text-xs font-mono font-semibold text-[#0B3D2E]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#0B3D2E]" />
            <span>OBSERVATORIUM FENOMENA EKONOMI &bull; BPS KAB. TANA TIDUNG</span>
          </div>

          <h1 class="font-display font-extrabold text-3xl sm:text-5xl lg:text-[50px] leading-[1.08] tracking-tight text-[#141917]">
            Bukan Sekadar Berita.
            <span class="block text-[#0B3D2E]">Rekam Jejak Analisis Dinamika Ekonomi Daerah.</span>
          </h1>

          <p class="text-base sm:text-[17px] text-[#4A524E] leading-relaxed max-w-2xl">
            Sistem pemantauan empiris yang mengurai denyut 17 sektor usaha KBLI, 6 komponen pengeluaran PDRB, dan transmisi pergerakan harga di Kabupaten Tana Tidung secara terkurasi, berimbang, dan transparan.
          </p>

          <div class="flex flex-wrap items-center gap-3.5 pt-2">
            <NuxtLink
              to="/linimasa"
              class="obs-btn-primary h-12 px-6 rounded-xl text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
            >
              <span>Eksplorasi Sinyal Fenomena</span>
              <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
            </NuxtLink>

            <NuxtLink
              to="/#cara-kerja"
              class="obs-btn-ghost h-12 px-5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <span>Metodologi Nerwilis</span>
            </NuxtLink>
          </div>

          <div class="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11.5px] text-[#737B76] font-mono border-t border-[#141917]/[0.08]">
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-[#0B3D2E]" />
              KBLI 2025 Multi-Generasi
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-[#0B3D2E]" />
              Standar SNA 2008
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-[#0B3D2E]" />
              Zona Waktu WITA (UTC+8)
            </span>
          </div>
        </div>

        <!-- Right (5 Cols): Deep Borneo Pine Telemetry Panel -->
        <div class="lg:col-span-5">
          <PublicObservatoryHeroPulse
            :overview="activeOverview"
            :period-label="snapshotPeriodLabel"
            :covered-sectors-count="coveredSectorsCount"
            :snapshot-year="snapshotYear"
            :snapshot-quarter="snapshotQuarter"
          />
        </div>
      </div>
    </section>

    <!-- SECTION 2: 17-SECTOR KBLI MOSAIC MATRIX & EXPENDITURE STRIP -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <PublicSectorMosaicMatrix
        :overview="activeOverview"
        :snapshot-year="snapshotYear"
        :snapshot-quarter="snapshotQuarter"
        :period-label="snapshotPeriodLabel"
      />
    </section>

    <!-- SECTION 3: ASYMMETRIC CURATED HIGHLIGHTS ("SOROTAN FENOMENA TERKINI") -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#141917]/[0.08]">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C8553D] mb-1">
            INTELLIGENCE HIGHLIGHTS
          </div>
          <h2 class="font-display font-bold text-2xl sm:text-3xl text-[#141917] tracking-tight">
            Sorotan Fenomena Terkurasi
          </h2>
          <p class="text-xs sm:text-sm text-[#4A524E] mt-1">
            Telaah empiris peristiwa ekonomi terkini di {{ snapshotPeriodLabel }} hasil verifikasi analis Nerwilis.
          </p>
        </div>

        <NuxtLink
          :to="`/linimasa?year=${snapshotYear}&quarter=${snapshotQuarter}`"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3D2E] hover:underline self-start sm:self-auto shrink-0"
        >
          <span>Buka Semua Fenomena ({{ formatNumberId(activeOverview?.kpi.totalVerified ?? 0) }})</span>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="recentPending" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 h-80 rounded-2xl bg-[#ECEAE2] animate-pulse" />
        <div class="lg:col-span-5 space-y-4">
          <div class="h-38 rounded-2xl bg-[#ECEAE2] animate-pulse" />
          <div class="h-38 rounded-2xl bg-[#ECEAE2] animate-pulse" />
        </div>
      </div>

      <!-- Content -->
      <div v-else-if="recentArticles.length > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Lead Editorial Feature Brief (7 Cols) -->
        <article
          v-if="leadArticle"
          class="relative lg:col-span-7 bg-white rounded-2xl border border-[#141917]/[0.08] p-6 sm:p-8 flex flex-col justify-between hover:border-[#0B3D2E]/35 hover:shadow-[0_12px_32px_-12px_rgba(11,61,46,0.12)] transition-all group"
        >
          <div>
            <!-- Top Metadata Strip -->
            <div class="flex items-center justify-between gap-3 text-xs text-[#737B76] pb-4 border-b border-[#141917]/[0.06]">
              <div class="flex items-center gap-2">
                <span class="font-bold text-[#141917]">{{ leadArticle.sourcePortal }}</span>
                <span>&bull;</span>
                <span class="font-mono text-[11px]">{{ formatDateId(leadArticle.publishedAt) }}</span>
                <span v-if="leadArticle.subdistrict" class="px-2 py-0.5 rounded-md bg-[#ECEAE2] text-[#141917] text-[10.5px] font-medium">
                  {{ leadArticle.subdistrict }}
                </span>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-[#E3F0EA] text-[#0B3D2E] text-[10.5px] font-bold">
                Terkurasi Nerwilis
              </span>
            </div>

            <!-- Title & Excerpt -->
            <div class="mt-5 space-y-3">
              <h3 class="font-display font-bold text-xl sm:text-2xl text-[#141917] leading-snug">
                <button
                  type="button"
                  class="text-left group-hover:text-[#0B3D2E] transition-colors rounded cursor-pointer after:content-[''] after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0B3D2E] focus-visible:after:ring-offset-2"
                  @click="openPreviewModal(leadArticle)"
                >
                  {{ leadArticle.title }}
                </button>
              </h3>
              <p v-if="leadArticle.summary" class="text-sm text-[#4A524E] leading-relaxed line-clamp-3">
                {{ leadArticle.summary }}
              </p>
            </div>
          </div>

          <!-- Bottom Dual-Axis Linkage Strip -->
          <div class="mt-6 pt-5 border-t border-[#141917]/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-10 pointer-events-none">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span v-if="leadArticle.kbliCategory" class="px-2.5 py-1 rounded-lg bg-[#E3F0EA] text-[#0B3D2E] font-semibold font-mono">
                KBLI {{ leadArticle.kbliCategory }}
              </span>
              <span v-if="leadArticle.expenditureComponent" class="px-2.5 py-1 rounded-lg bg-[#ECEAE2] text-[#141917] font-semibold">
                {{ leadArticle.expenditureComponent }}
              </span>
              <span
                v-if="leadArticle.kbliImpact && getKbliImpactBadge(leadArticle.kbliImpact)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold"
                :class="getImpactBadgeClasses(getKbliImpactBadge(leadArticle.kbliImpact).color)"
              >
                {{ getKbliImpactBadge(leadArticle.kbliImpact).shortLabel || getKbliImpactBadge(leadArticle.kbliImpact).label }}
              </span>
            </div>

            <span class="text-xs font-semibold text-[#0B3D2E] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              <span>Baca Lembar Ringkasan</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </span>
          </div>
        </article>

        <!-- Stacked Secondary Briefs (5 Cols) -->
        <div class="lg:col-span-5 flex flex-col gap-4 justify-between">
          <article
            v-for="item in secondaryArticles"
            :key="item.id"
            class="relative bg-white rounded-2xl border border-[#141917]/[0.08] p-5 flex flex-col justify-between hover:border-[#0B3D2E]/35 hover:shadow-sm transition-all group flex-1"
          >
            <div>
              <div class="flex items-center justify-between text-[11px] text-[#737B76] mb-2 font-mono">
                <span>{{ item.sourcePortal }} &bull; {{ formatDateId(item.publishedAt) }}</span>
                <span v-if="item.kbliCategory" class="font-bold text-[#0B3D2E]">KBLI {{ item.kbliCategory }}</span>
              </div>
              <h4 class="font-display font-bold text-sm sm:text-base text-[#141917] leading-snug">
                <button
                  type="button"
                  class="text-left group-hover:text-[#0B3D2E] transition-colors rounded cursor-pointer after:content-[''] after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0B3D2E] focus-visible:after:ring-offset-2"
                  @click="openPreviewModal(item)"
                >
                  {{ item.title }}
                </button>
              </h4>
            </div>

            <div class="mt-3 pt-3 border-t border-[#141917]/[0.06] flex items-center justify-between text-xs relative z-10 pointer-events-none">
              <span class="text-[#4A524E] truncate max-w-[200px]">
                {{ item.subdistrict || 'Kab. Tana Tidung' }}
              </span>
              <span class="text-[11.5px] font-semibold text-[#0B3D2E] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                <span>Telaah</span>
                <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
              </span>
            </div>
          </article>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 rounded-2xl bg-white border border-[#141917]/[0.08]">
        <UIcon name="i-solar-notes-line-duotone" class="w-10 h-10 text-[#737B76] mx-auto mb-2" />
        <div class="font-display font-bold text-base text-[#141917]">
          Belum ada fenomena terverifikasi di {{ snapshotPeriodLabel }}
        </div>
        <p class="text-xs text-[#737B76] mt-1">
          Pilih triwulan lain di Eksplorasi Fenomena untuk melihat arsip data historis.
        </p>
      </div>
    </section>

    <!-- SECTION 4: OPEN-CANVAS METHODOLOGY STRIP (#cara-kerja) -->
    <section id="cara-kerja" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#141917]/[0.08]">
      <div class="max-w-2xl mb-12">
        <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C8553D] mb-1">
          METHODOLOGICAL RIGOR
        </div>
        <h2 class="font-display font-bold text-2xl sm:text-3xl text-[#141917] tracking-tight">
          Bagaimana Analisis Fenomena Bekerja
        </h2>
        <p class="text-xs sm:text-sm text-[#4A524E] mt-1.5 leading-relaxed">
          SIPENA KTT menjembatani data tidak terstruktur (pemberitaan) menjadi bukti empiris terstruktur yang selaras dengan kaidah Produk Domestik Regional Bruto (PDRB).
        </p>
      </div>

      <!-- 4 Numbered Columns Divided by Hairlines (No Nested Gray Boxes!) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#141917]/[0.08] border-y border-[#141917]/[0.08]">
        <div
          v-for="col in methodologyColumns"
          :key="col.num"
          class="py-8 lg:py-4 lg:px-6 first:lg:pl-0 last:lg:pr-0 space-y-3"
        >
          <div class="font-mono text-2xl font-bold text-[#0B3D2E]">
            {{ col.num }}
          </div>
          <div class="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#C8553D]">
            {{ col.tag }}
          </div>
          <h3 class="font-display font-bold text-base text-[#141917] leading-snug">
            {{ col.title }}
          </h3>
          <p class="text-xs text-[#4A524E] leading-relaxed">
            {{ col.desc }}
          </p>
        </div>
      </div>
    </section>

    <!-- SECTION 5: MINIMALIST DEEP PINE CLOSING BAND -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div class="rounded-3xl bg-[#0B3D2E] text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div class="space-y-2 max-w-xl relative z-10">
          <div class="text-xs font-mono font-semibold text-emerald-300 uppercase tracking-wider">
            ARSIP DIGITAL BPS KABUPATEN TANA TIDUNG
          </div>
          <h3 class="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white">
            Siap Menjelajahi Seluruh Sinyal Ekonomi?
          </h3>
          <p class="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
            Telusuri arsip berkala, filter berdasarkan 17 sektor usaha KBLI atau 6 komponen pengeluaran, dan pelajari narasi ekonomi Tana Tidung.
          </p>
        </div>

        <div class="relative z-10 shrink-0">
          <NuxtLink
            to="/linimasa"
            class="h-12 px-7 rounded-xl bg-white hover:bg-[#F6F5F1] text-[#0B3D2E] text-sm font-bold inline-flex items-center gap-2 transition-colors shadow-lg"
          >
            <span>Buka Eksplorasi Sekarang</span>
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-[#0B3D2E]" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Detail Reading Sheet Modal Mount -->
    <PublicArticleDetailModal
      v-model:open="previewModalOpen"
      :article="selectedPreviewArticle"
    />
  </div>
</template>
