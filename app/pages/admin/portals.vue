<!-- app/pages/admin/portals.vue -->
<script setup lang="ts">
import { ArticleSourceTypeEnum } from '#shared/enums/pdrb';
import { formatDateTimeWita } from '#shared/utils/period';
import type { AdminPortalsResponse, PortalDirectoryItem } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const { getScraperStatusBadge, getSourceTypeLabel, formatNumberId, isSafeHttpUrl } =
  usePdrbLabels();

const {
  data: portalsData,
  pending,
  error,
  refresh,
} = await useFetch<AdminPortalsResponse>('/api/admin/portals', {
  credentials: 'include',
});

const summaryStats = computed(() => {
  const portals = portalsData.value?.portals ?? [];
  const other = portalsData.value?.otherSources ?? [];
  const totalRegionalArticles = portals.reduce((sum, p) => sum + p.totalArticles, 0);
  const totalRegionalVerified = portals.reduce((sum, p) => sum + p.verifiedArticles, 0);
  const totalRegionalPending = portals.reduce((sum, p) => sum + p.pendingArticles, 0);
  const errorPortals = portals.filter((p) => p.recentErrorsCount > 0).length;
  const totalExternalArticles = other.reduce((sum, s) => sum + s.totalArticles, 0);

  return {
    portalCount: portals.length,
    otherSourceCount: other.length,
    totalRegionalArticles,
    totalRegionalVerified,
    totalRegionalPending,
    errorPortals,
    totalExternalArticles,
  };
});

function portalHealthMeta(portal: PortalDirectoryItem) {
  if (portal.recentErrorsCount > 0) {
    return {
      label: `${portal.recentErrorsCount} Error Terbaru`,
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500',
    };
  }
  if (portal.totalArticles > 0) {
    return {
      label: 'Aktif · Sehat',
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-600',
    };
  }
  return {
    label: 'Belum Terjaring',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  };
}

function sourceTypeBadgeClass(sourceType: ArticleSourceTypeEnum): string {
  switch (sourceType) {
    case ArticleSourceTypeEnum.NATIONAL:
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case ArticleSourceTypeEnum.MANUAL:
      return 'bg-amber-50 text-amber-800 border-amber-200';
    default:
      return 'bg-teal-50 text-teal-800 border-teal-200';
  }
}

const lastRunBadge = computed(() =>
  getScraperStatusBadge(portalsData.value?.lastCrawlerRun?.status),
);
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
        >
          <UIcon name="i-solar-globe-bold-duotone" class="w-3.5 h-3.5" />
          <span>Cakupan Sumber Media &amp; Telemetri Portal</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] mt-2">
          Direktori Portal Regional Kaltara
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
          Konfigurasi host resmi berita Kalimantan Utara yang dipantau crawler otomatis harian serta
          ringkasan kontribusi sumber nasional &amp; input manual.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          :disabled="pending"
          class="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          @click="() => { void refresh(); }"
        >
          <UIcon
            name="i-solar-restart-bold-duotone"
            class="w-4 h-4 text-indigo-600"
            :class="{ 'animate-spin': pending }"
          />
          <span>Segarkan</span>
        </button>

        <NuxtLink
          to="/admin/scrapers"
          class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <UIcon name="i-solar-cpu-bolt-bold-duotone" class="w-4 h-4 text-emerald-200" />
          <span>Monitor Scraper &amp; AI</span>
        </NuxtLink>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat direktori portal"
      description="Pastikan koneksi database aktif lalu muat ulang."
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- Summary Metrics & Last Run Strip -->
    <div v-if="portalsData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Portal Regional Aktif
          </span>
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-globe-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-[#0F172A] tabular-nums">
          {{ summaryStats.portalCount }}
        </div>
        <div class="text-xs text-slate-600 tabular-nums">
          {{
            summaryStats.errorPortals > 0
              ? `${summaryStats.errorPortals} portal punya log error`
              : 'Semua host target terpantau'
          }}
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Artikel Portal Regional
          </span>
          <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-documents-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-[#0F172A] tabular-nums">
          {{ formatNumberId(summaryStats.totalRegionalArticles) }}
        </div>
        <div class="text-xs text-slate-600 tabular-nums">
          <span class="text-emerald-700 font-semibold">
            {{ formatNumberId(summaryStats.totalRegionalVerified) }}
          </span>
          verif •
          <span class="text-amber-700 font-semibold">
            {{ formatNumberId(summaryStats.totalRegionalPending) }}
          </span>
          pending
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Sumber Nasional &amp; Manual
          </span>
          <div class="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-layers-minimalistic-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-[#0F172A] tabular-nums">
          {{ formatNumberId(summaryStats.totalExternalArticles) }}
        </div>
        <div class="text-xs text-slate-600 tabular-nums">
          Dari {{ summaryStats.otherSourceCount }} portal eksternal/manual
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Eksekusi Crawler Terakhir
          </span>
          <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-clock-circle-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <template v-if="portalsData.lastCrawlerRun">
          <div class="flex items-center gap-2 pt-0.5">
            <UBadge
              :color="lastRunBadge.color"
              variant="subtle"
              size="xs"
              :icon="lastRunBadge.icon"
            >
              {{ lastRunBadge.label }}
            </UBadge>
            <span class="text-xs font-bold text-emerald-700 tabular-nums">
              +{{ portalsData.lastCrawlerRun.articlesInserted }} baru
            </span>
          </div>
          <div class="text-xs tabular-nums text-slate-600">
            {{ formatDateTimeWita(portalsData.lastCrawlerRun.startedAt) }}
          </div>
        </template>
        <template v-else>
          <div class="text-sm font-semibold text-slate-400 pt-1">Belum ada riwayat</div>
          <div class="text-xs text-slate-500">Jadwal otomatis pukul 04:00 WITA</div>
        </template>
      </div>
    </div>

    <!-- Configured Regional Portals Grid -->
    <div v-if="portalsData" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-extrabold text-[#0F172A]">
          Portal Regional Terkonfigurasi ({{ portalsData.portals.length }} Sumber Utama)
        </h2>
        <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <UIcon name="i-solar-shield-check-bold-duotone" class="w-4 h-4 text-emerald-600" />
          <span>Guardrail SSRF aktif pada allowed hosts</span>
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article
          v-for="portal in portalsData.portals"
          :key="portal.id"
          class="saas-card saas-card-interactive rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden"
        >
          <span
            aria-hidden="true"
            class="absolute inset-x-0 top-0 h-1"
            :class="
              portal.recentErrorsCount > 0
                ? 'bg-rose-500'
                : portal.totalArticles > 0
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-500'
                  : 'bg-slate-300'
            "
          />

          <div class="space-y-3.5 pt-0.5">
            <!-- Top header -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base font-bold text-[#0F172A] leading-snug">
                    {{ portal.label }}
                  </h3>
                  <span
                    class="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-[11px] font-semibold text-indigo-700"
                  >
                    {{ portal.sourcePortal }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 text-xs text-slate-500">
                  <UIcon name="i-lucide-link" class="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <a
                    v-if="isSafeHttpUrl(portal.indexUrl)"
                    :href="portal.indexUrl!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-indigo-700 hover:text-indigo-900 hover:underline truncate text-xs inline-flex items-center gap-1 font-medium"
                  >
                    <span class="truncate">{{ portal.indexUrl }}</span>
                    <UIcon name="i-lucide-external-link" class="w-3 h-3 shrink-0" />
                  </a>
                  <span v-else class="text-xs text-slate-400">—</span>
                </div>
              </div>

              <span
                class="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                :class="portalHealthMeta(portal).classes"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="portalHealthMeta(portal).dotClass"
                />
                {{ portalHealthMeta(portal).label }}
              </span>
            </div>

            <!-- Allowed Hosts & Additional Index URLs -->
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[11px] font-semibold text-slate-500">
                  Whitelist Host:
                </span>
                <span
                  v-for="host in portal.allowedHosts"
                  :key="host"
                  class="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700"
                >
                  {{ host }}
                </span>
                <span
                  v-if="portal.additionalIndexUrls.length > 0"
                  class="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 tabular-nums"
                >
                  +{{ portal.additionalIndexUrls.length }} kanal indeks tambahan
                </span>
              </div>
            </div>

            <!-- 3 Telemetry Boxes -->
            <div class="grid grid-cols-3 gap-2.5">
              <div class="rounded-xl bg-[#FAFBFD] border border-slate-200/90 px-3 py-2.5">
                <div class="text-[11px] font-semibold text-slate-500">
                  Total Arsip
                </div>
                <div class="text-lg font-extrabold tabular-nums text-[#0F172A] mt-0.5">
                  {{ formatNumberId(portal.totalArticles) }}
                </div>
              </div>
              <div class="rounded-xl bg-emerald-50/55 border border-emerald-200/70 px-3 py-2.5">
                <div class="text-[11px] font-semibold text-emerald-700">
                  Terverifikasi
                </div>
                <div class="text-lg font-extrabold tabular-nums text-emerald-800 mt-0.5">
                  {{ formatNumberId(portal.verifiedArticles) }}
                </div>
              </div>
              <div class="rounded-xl bg-amber-50/55 border border-amber-200/70 px-3 py-2.5">
                <div class="text-[11px] font-semibold text-amber-700">
                  Pending
                </div>
                <div class="text-lg font-extrabold tabular-nums text-amber-800 mt-0.5">
                  {{ formatNumberId(portal.pendingArticles) }}
                </div>
              </div>
            </div>

            <!-- Latest Error Warning if present -->
            <div
              v-if="portal.lastErrorMessage"
              class="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-rose-800 inline-flex items-center gap-1">
                  <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5 shrink-0" />
                  Catatan Error Crawler Terbaru
                </span>
                <span v-if="portal.lastErrorAt" class="text-[11px] text-rose-700 tabular-nums">
                  {{ formatDateTimeWita(portal.lastErrorAt) }}
                </span>
              </div>
              <p class="text-rose-900/90 leading-relaxed line-clamp-2 text-[11px]">
                {{ portal.lastErrorMessage }}
              </p>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <span class="text-xs text-slate-600 tabular-nums">
              Artikel terbaru:
              <strong class="text-[#0F172A]">
                {{ portal.lastArticleAt ? formatDateTimeWita(portal.lastArticleAt) : 'Belum ada data' }}
              </strong>
            </span>

            <NuxtLink
              :to="`/admin/articles?portal=${encodeURIComponent(portal.sourcePortal)}`"
              class="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-700 text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Lihat Arsip Portal</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>

    <!-- Other Sources Table (National Keywords & Manual Entries) -->
    <div v-if="portalsData" class="saas-card rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-[#FAFBFD]">
        <div>
          <h2 class="text-sm font-bold text-[#0F172A]">
            Sumber Eksternal Lainnya ({{ portalsData.otherSources.length }})
          </h2>
          <p class="text-xs text-slate-600 mt-0.5">
            Portal berita nasional hasil penjaringan Google News Keyword serta entri Input Manual tim Nerwilis.
          </p>
        </div>

        <NuxtLink
          to="/admin/keywords"
          class="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1"
        >
          <span>Kelola Master Keyword</span>
          <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div
        v-if="portalsData.otherSources.length === 0"
        class="p-8 text-center text-sm text-slate-600"
      >
        Belum ada artikel dari sumber berita nasional maupun input manual.
      </div>

      <div
        v-else
        tabindex="0"
        role="region"
        aria-label="Tabel Sumber Berita Nasional dan Input Manual"
        class="saas-table-scroller"
      >
        <table class="w-full text-left border-collapse min-w-[680px]">
          <caption class="sr-only">
            Daftar sumber berita nasional dan input manual selain portal regional utama
          </caption>
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <th scope="col" class="py-3 px-4">Nama Portal / Sumber</th>
              <th scope="col" class="py-3 px-4">Tipe Sumber</th>
              <th scope="col" class="py-3 px-4 text-right">Total</th>
              <th scope="col" class="py-3 px-4 text-right">Terverifikasi</th>
              <th scope="col" class="py-3 px-4 text-right">Pending</th>
              <th scope="col" class="py-3 px-4">Artikel Terbaru (WITA)</th>
              <th scope="col" class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            <tr
              v-for="src in portalsData.otherSources"
              :key="`${src.sourcePortal}-${src.sourceType}`"
              class="hover:bg-indigo-50/30 transition-colors"
            >
              <th scope="row" class="py-3 px-4 font-semibold text-[#0F172A] text-left">
                {{ src.sourcePortal }}
              </th>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                  :class="sourceTypeBadgeClass(src.sourceType)"
                >
                  {{ getSourceTypeLabel(src.sourceType) }}
                </span>
              </td>
              <td class="py-3 px-4 text-right font-semibold tabular-nums text-[#0F172A]">
                {{ formatNumberId(src.totalArticles) }}
              </td>
              <td class="py-3 px-4 text-right font-semibold tabular-nums text-emerald-700">
                {{ formatNumberId(src.verifiedArticles) }}
              </td>
              <td class="py-3 px-4 text-right font-semibold tabular-nums text-amber-700">
                {{ formatNumberId(src.pendingArticles) }}
              </td>
              <td class="py-3 px-4 tabular-nums text-slate-600">
                {{ src.lastArticleAt ? formatDateTimeWita(src.lastArticleAt) : '—' }}
              </td>
              <td class="py-3 px-4 text-right">
                <NuxtLink
                  :to="`/admin/articles?portal=${encodeURIComponent(src.sourcePortal)}`"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 text-[11px] font-semibold text-indigo-700 transition-colors"
                >
                  <span>Arsip</span>
                  <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

