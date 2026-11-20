<!-- app/pages/admin/portals.vue -->
<script setup lang="ts">
import { ArticleSourceTypeEnum } from '#shared/enums/pdrb';
import { formatDateTimeWita } from '#shared/utils/period';
import type { AdminPortalsResponse, PortalDirectoryItem, PortalPingResult } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
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

const searchQuery = ref('');
const healthFilter = ref<'all' | 'error' | 'healthy' | 'inactive'>('all');
const pingingIds = ref<Set<string>>(new Set());
const pingResults = ref<Record<string, PortalPingResult>>({});

const filteredPortals = computed<PortalDirectoryItem[]>(() => {
  const list = portalsData.value?.portals ?? [];
  const q = searchQuery.value.trim().toLowerCase();
  return list.filter((p: PortalDirectoryItem) => {
    if (healthFilter.value === 'inactive' && p.isActive !== false) return false;
    if (healthFilter.value === 'error' && (p.recentErrorsCount === 0 || p.isActive === false)) return false;
    if (healthFilter.value === 'healthy' && (p.recentErrorsCount > 0 || p.isActive === false)) return false;
    if (!q) return true;
    return (
      p.label.toLowerCase().includes(q) ||
      p.sourcePortal.toLowerCase().includes(q) ||
      p.allowedHosts.some((h) => h.toLowerCase().includes(q))
    );
  });
});

async function pingPortal(portal: PortalDirectoryItem) {
  if (pingingIds.value.has(portal.id)) return;
  const nextBusy = new Set(pingingIds.value);
  nextBusy.add(portal.id);
  pingingIds.value = nextBusy;

  try {
    const res = await $fetch<PortalPingResult>('/api/admin/portals/ping', {
      method: 'POST',
      body: { portalId: portal.id },
      credentials: 'include',
    });
    pingResults.value = {
      ...pingResults.value,
      [portal.id]: res,
    };
    toast.add({
      title: res.ok
        ? `Portal ${portal.label} Terjangkau (${res.latencyMs} ms)`
        : `Kendala Akses ${portal.label}`,
      description: res.ok
        ? `Ditemukan ${res.itemsFound} kandidat berita terbaru.`
        : res.error || (res.isSoftBlocked ? 'Terdeteksi anti-bot / soft-block.' : `Status HTTP ${res.status}`),
      color: res.ok ? 'success' : 'warning',
      icon: res.ok ? 'i-lucide-wifi' : 'i-lucide-wifi-off',
    });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: 'Gagal Menguji Feed Portal',
      description: fetchErr.data?.message || 'Coba ulang beberapa saat lagi.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  } finally {
    const nextAfter = new Set(pingingIds.value);
    nextAfter.delete(portal.id);
    pingingIds.value = nextAfter;
  }
}

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
  if (portal.isActive === false) {
    return {
      label: 'Non-Aktif / Dilebur',
      classes: 'bg-surface-subtle text-ink-secondary border-border-hairline',
      dotClass: 'bg-[#737B76]',
    };
  }
  if (portal.recentErrorsCount > 0) {
    return {
      label: `${portal.recentErrorsCount} Error Terbaru`,
      classes: 'bg-terracotta-surface text-terracotta-ink border-terracotta/30',
      dotClass: 'bg-terracotta',
    };
  }
  if (portal.totalArticles > 0) {
    return {
      label: 'Aktif · Sehat',
      classes: 'bg-brand-tint text-brand-primary border-brand-border',
      dotClass: 'bg-brand-primary',
    };
  }
  return {
    label: 'Belum Terjaring',
    classes: 'bg-surface-subtle text-ink-secondary border-border-hairline',
    dotClass: 'bg-[#737B76]',
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
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-tint text-brand-primary border border-brand-border text-xs font-semibold"
        >
          <UIcon name="i-solar-globe-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
          <span>Cakupan Sumber Media &amp; Telemetri Portal</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-primary text-balance mt-2 font-display">
          Direktori Portal Regional Kaltara
        </h1>
        <p class="text-xs sm:text-sm text-ink-secondary mt-0.5 text-pretty">
          Konfigurasi host resmi berita Kalimantan Utara yang dipantau crawler otomatis harian serta
          ringkasan kontribusi sumber nasional &amp; input manual.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          :disabled="pending"
          class="min-h-9 px-3.5 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          @click="() => { void refresh(); }"
        >
          <UIcon
            name="i-solar-restart-bold-duotone"
            class="w-4 h-4 text-brand-primary"
            :class="{ 'animate-spin': pending }"
          />
          <span>Segarkan</span>
        </button>

        <NuxtLink
          to="/admin/scrapers"
          class="obs-btn-primary min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
        >
          <UIcon name="i-solar-cpu-bolt-bold-duotone" class="w-4 h-4 text-[#BBD8CB]" />
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

    <!-- Loading Skeletons -->
    <div v-if="pending && !portalsData" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="obs-panel rounded-xl p-5 space-y-2.5">
          <div class="h-3 w-28 rounded bg-surface-subtle" />
          <div class="h-8 w-20 rounded bg-surface-subtle" />
          <div class="h-3 w-36 rounded bg-canvas" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-for="i in 2" :key="i" class="obs-panel rounded-xl p-5 space-y-3 h-44" />
      </div>
    </div>

    <!-- Summary Metrics & Last Run Strip -->
    <div v-else-if="portalsData" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="obs-panel rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-secondary">
            Portal Regional Aktif
          </span>
          <div class="w-7 h-7 rounded-md bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-globe-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-ink-primary tabular-nums font-mono">
          {{ summaryStats.portalCount }}
        </div>
        <div class="text-xs text-ink-secondary tabular-nums font-mono">
          {{
            summaryStats.errorPortals > 0
              ? `${summaryStats.errorPortals} portal punya log error`
              : 'Semua host target terpantau'
          }}
        </div>
      </div>

      <div class="obs-panel rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-secondary">
            Artikel Portal Regional
          </span>
          <div class="w-7 h-7 rounded-md bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-documents-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-ink-primary tabular-nums font-mono">
          {{ formatNumberId(summaryStats.totalRegionalArticles) }}
        </div>
        <div class="text-xs text-ink-secondary tabular-nums font-mono">
          <span class="text-brand-primary font-semibold">
            {{ formatNumberId(summaryStats.totalRegionalVerified) }}
          </span>
          verif •
          <span class="text-ochre-ink font-semibold">
            {{ formatNumberId(summaryStats.totalRegionalPending) }}
          </span>
          pending
        </div>
      </div>

      <div class="obs-panel rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-secondary">
            Sumber Nasional &amp; Manual
          </span>
          <div class="w-8 h-8 rounded-xl bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-layers-minimalistic-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold tracking-tight text-ink-primary tabular-nums font-mono">
          {{ formatNumberId(summaryStats.totalExternalArticles) }}
        </div>
        <div class="text-xs text-ink-secondary tabular-nums">
          Dari {{ summaryStats.otherSourceCount }} portal eksternal/manual
        </div>
      </div>

      <div class="obs-panel rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-secondary">
            Eksekusi Crawler Terakhir
          </span>
          <div class="w-8 h-8 rounded-xl bg-[#FEF3C7] text-ochre-ink border border-ochre/30 flex items-center justify-center shrink-0">
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
            <span class="text-xs font-bold text-brand-primary tabular-nums font-mono">
              +{{ portalsData.lastCrawlerRun.articlesInserted }} baru
            </span>
          </div>
          <div class="text-xs tabular-nums text-ink-secondary font-mono">
            {{ formatDateTimeWita(portalsData.lastCrawlerRun.startedAt) }}
          </div>
        </template>
        <template v-else>
          <div class="text-sm font-semibold text-ink-secondary pt-1">Belum ada riwayat</div>
          <div class="text-xs text-ink-secondary">Jadwal otomatis pukul 04:00 WITA</div>
        </template>
      </div>
    </div>

    <!-- Configured Regional Portals Grid -->
    <div v-if="portalsData" class="space-y-3">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="space-y-0.5">
          <h2 class="text-base font-extrabold text-ink-primary text-balance font-display">
            Portal Regional Terkonfigurasi ({{ filteredPortals.length }}/{{ portalsData.portals.length }})
          </h2>
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
            <UIcon name="i-solar-shield-check-bold-duotone" class="w-4 h-4 text-brand-primary" />
            <span>Guardrail SSRF aktif pada allowed hosts • Uji koneksi feed secara langsung</span>
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="w-full sm:w-56">
            <label for="portals-search-input" class="sr-only">Cari portal regional</label>
            <UInput
              id="portals-search-input"
              v-model="searchQuery"
              type="search"
              size="sm"
              leading-icon="i-solar-magnifer-line-duotone"
              placeholder="Cari portal atau domain..."
              class="w-full"
            />
          </div>

          <div
            role="group"
            aria-label="Filter kesehatan portal"
            class="inline-flex p-1 rounded-xl bg-surface-subtle border border-border-hairline"
          >
            <button
              v-for="tab in [
                { id: 'all', label: 'Semua' },
                { id: 'healthy', label: 'Sehat' },
                { id: 'error', label: 'Bermasalah' },
                { id: 'inactive', label: 'Non-Aktif' },
              ] as const"
              :key="tab.id"
              type="button"
              :aria-pressed="healthFilter === tab.id"
              class="min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              :class="
                healthFilter === tab.id
                  ? 'bg-white text-brand-primary shadow-2xs border border-brand-border'
                  : 'text-ink-secondary hover:text-ink-primary'
              "
              @click="() => { healthFilter = tab.id; }"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="filteredPortals.length === 0"
        class="obs-panel rounded-2xl p-8 text-center text-sm text-ink-secondary"
      >
        Tidak ada portal regional yang cocok dengan filter aktif.
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article
          v-for="portal in filteredPortals"
          :key="portal.id"
          class="obs-panel hover:border-brand-primary/40 transition-colors rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden"
        >
          <div class="space-y-3.5">
            <!-- Top header -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base font-bold text-ink-primary leading-snug">
                    {{ portal.label }}
                  </h3>
                  <span
                    class="px-2 py-0.5 rounded-full bg-brand-tint border border-brand-border text-[11px] font-semibold text-brand-primary font-mono"
                  >
                    {{ portal.sourcePortal }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 text-xs text-ink-secondary">
                  <UIcon name="i-lucide-link" class="w-3.5 h-3.5 shrink-0 text-ink-muted" />
                  <a
                    v-if="isSafeHttpUrl(portal.indexUrl)"
                    :href="portal.indexUrl!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-brand-primary hover:text-[#072B20] hover:underline truncate text-xs inline-flex items-center gap-1 font-medium font-mono"
                  >
                    <span class="truncate">{{ portal.indexUrl }}</span>
                    <UIcon name="i-lucide-external-link" class="w-3 h-3 shrink-0" />
                  </a>
                  <span v-else class="text-xs text-ink-muted">—</span>
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
                <span class="text-[11px] font-semibold text-ink-secondary">
                  Whitelist Host:
                </span>
                <span
                  v-for="host in portal.allowedHosts"
                  :key="host"
                  class="px-2 py-0.5 rounded-md bg-surface-subtle border border-border-hairline text-[11px] font-medium text-ink-primary font-mono"
                >
                  {{ host }}
                </span>
                <span
                  v-if="portal.additionalIndexUrls.length > 0"
                  class="px-2 py-0.5 rounded-md bg-brand-tint border border-brand-border text-[11px] font-semibold text-brand-primary tabular-nums font-mono"
                >
                  +{{ portal.additionalIndexUrls.length }} kanal indeks tambahan
                </span>
              </div>
            </div>

            <!-- 3 Telemetry Boxes -->
            <div class="grid grid-cols-3 gap-2.5">
              <div class="rounded-xl bg-canvas border border-border-hairline px-3 py-2.5">
                <div class="text-[11px] font-semibold text-ink-secondary">
                  Total Arsip
                </div>
                <div class="text-lg font-extrabold tabular-nums text-ink-primary mt-0.5 font-mono">
                  {{ formatNumberId(portal.totalArticles) }}
                </div>
              </div>
              <div class="rounded-xl bg-brand-tint/50 border border-brand-border px-3 py-2.5">
                <div class="text-[11px] font-semibold text-brand-primary">
                  Terverifikasi
                </div>
                <div class="text-lg font-extrabold tabular-nums text-brand-primary mt-0.5 font-mono">
                  {{ formatNumberId(portal.verifiedArticles) }}
                </div>
              </div>
              <div class="rounded-xl bg-[#FEF3C7]/60 border border-ochre/30 px-3 py-2.5">
                <div class="text-[11px] font-semibold text-ochre-ink">
                  Pending
                </div>
                <div class="text-lg font-extrabold tabular-nums text-ochre-ink mt-0.5 font-mono">
                  {{ formatNumberId(portal.pendingArticles) }}
                </div>
              </div>
            </div>

            <!-- Inactive Notice if marked inactive -->
            <div
              v-if="portal.isActive === false && portal.inactiveReason"
              class="rounded-xl border border-border-hairline bg-canvas px-3 py-2 text-xs text-ink-secondary flex items-start gap-2"
            >
              <UIcon name="i-solar-info-circle-line-duotone" class="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
              <div class="leading-relaxed">
                <span class="font-semibold text-ink-primary">Status Non-Aktif:</span>
                {{ portal.inactiveReason }}
              </div>
            </div>

            <!-- Live Ping Result Pill if Tested -->
            <div
              v-if="pingResults[portal.id]"
              class="rounded-xl border px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
              :class="
                pingResults[portal.id]!.ok
                  ? 'bg-brand-tint border-brand-border text-brand-primary'
                  : 'bg-[#FEF3C7] border-ochre/30 text-ochre-ink'
              "
            >
              <span class="font-semibold inline-flex items-center gap-1.5">
                <UIcon
                  :name="pingResults[portal.id]!.ok ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
                  class="w-3.5 h-3.5 shrink-0"
                />
                <span v-if="pingResults[portal.id]!.ok">
                  Uji Feed OK (HTTP {{ pingResults[portal.id]!.status }}) • {{ pingResults[portal.id]!.itemsFound }} artikel ditemukan
                </span>
                <span v-else>
                  {{ pingResults[portal.id]!.isSoftBlocked ? `Soft-block: ${pingResults[portal.id]!.error || 'Anti-bot aktif'}` : (pingResults[portal.id]!.error || 'Koneksi bermasalah') }}
                </span>
              </span>
              <span class="text-[11px] font-bold tabular-nums font-mono">
                {{ pingResults[portal.id]!.latencyMs }} ms
              </span>
            </div>

            <!-- Latest Error Warning if present -->
            <div
              v-if="portal.lastErrorMessage"
              class="rounded-xl border border-terracotta/30 bg-terracotta-surface p-3 text-xs space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-terracotta-ink inline-flex items-center gap-1">
                  <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5 shrink-0" />
                  Catatan Error Crawler Terbaru
                </span>
                <span v-if="portal.lastErrorAt" class="text-[11px] text-terracotta-ink tabular-nums font-mono">
                  {{ formatDateTimeWita(portal.lastErrorAt) }}
                </span>
              </div>
              <p class="text-terracotta-ink leading-relaxed line-clamp-2 text-[11px]">
                {{ portal.lastErrorMessage }}
              </p>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border-hairline">
            <span class="text-xs text-ink-secondary tabular-nums font-mono">
              Artikel terbaru:
              <strong class="text-ink-primary">
                {{ portal.lastArticleAt ? formatDateTimeWita(portal.lastArticleAt) : 'Belum ada data' }}
              </strong>
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="pingingIds.has(portal.id)"
                class="min-h-9 px-3 rounded-xl border border-border-control bg-white hover:bg-surface-subtle text-xs font-semibold text-ink-secondary inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                @click="() => { void pingPortal(portal); }"
              >
                <UIcon
                  :name="pingingIds.has(portal.id) ? 'i-lucide-loader-circle' : 'i-lucide-activity'"
                  class="w-3.5 h-3.5"
                  :class="pingingIds.has(portal.id) ? 'animate-spin' : ''"
                />
                <span>{{ pingingIds.has(portal.id) ? 'Menguji...' : 'Uji Feed' }}</span>
              </button>

              <NuxtLink
                :to="`/admin/articles?portal=${encodeURIComponent(portal.sourcePortal)}`"
                class="min-h-9 px-3 rounded-xl border border-border-control bg-white hover:border-brand-primary/40 hover:text-brand-primary text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Lihat Arsip Portal</span>
                <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Other Sources Table (National Keywords & Manual Entries) -->
    <div v-if="portalsData" class="obs-panel rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border-hairline flex flex-wrap items-center justify-between gap-2 bg-canvas">
        <div>
          <h2 class="text-sm font-bold text-ink-primary">
            Sumber Eksternal Lainnya ({{ portalsData.otherSources.length }})
          </h2>
          <p class="text-xs text-ink-secondary mt-0.5 text-pretty">
            Portal berita nasional hasil penjaringan Google News, Bing News, &amp; GDELT Keyword serta entri
            Input Manual tim Nerwilis.
          </p>
        </div>

        <NuxtLink
          to="/admin/keywords"
          class="min-h-8 inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-[#072B20] hover:underline"
        >
          <span>Kelola Master Keyword</span>
          <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div
        v-if="portalsData.otherSources.length === 0"
        class="p-8 text-center text-sm text-ink-secondary"
      >
        Belum ada artikel dari sumber berita nasional maupun input manual.
      </div>

      <div
        v-else
        role="region"
        aria-label="Tabel Sumber Berita Nasional dan Input Manual"
      >
        <!-- Desktop & Tablet (>= md): Tabel Tanpa Scroll Horizontal -->
        <div class="hidden md:block w-full">
          <table class="w-full table-fixed text-left border-collapse">
            <caption class="sr-only">
              Daftar sumber berita nasional dan input manual selain portal regional utama
            </caption>
            <thead>
              <tr class="border-b border-border-hairline bg-canvas text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                <th scope="col" class="w-[34%] py-3 px-4">Nama Portal &amp; Tipe Sumber</th>
                <th scope="col" class="w-[28%] py-3 px-3 text-right">Total / Verified / Pending</th>
                <th scope="col" class="w-[24%] py-3 px-3">Artikel Terbaru (WITA)</th>
                <th scope="col" class="w-[14%] py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#141917]/[0.06] text-xs">
              <tr
                v-for="src in portalsData.otherSources"
                :key="`${src.sourcePortal}-${src.sourceType}`"
                class="hover:bg-canvas transition-colors"
              >
                <th scope="row" class="py-3 px-4 font-semibold text-ink-primary text-left min-w-0">
                  <div class="truncate" :title="src.sourcePortal">{{ src.sourcePortal }}</div>
                  <div class="mt-1">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      :class="sourceTypeBadgeClass(src.sourceType)"
                    >
                      {{ getSourceTypeLabel(src.sourceType) }}
                    </span>
                  </div>
                </th>
                <td class="py-3 px-3 text-right tabular-nums font-mono">
                  <span class="font-bold text-ink-primary">{{ formatNumberId(src.totalArticles) }}</span>
                  <span class="text-ink-primary/20 mx-1">/</span>
                  <span class="font-semibold text-brand-primary">{{ formatNumberId(src.verifiedArticles) }} ver</span>
                  <span class="text-ink-primary/20 mx-1">/</span>
                  <span class="font-semibold text-ochre-ink">{{ formatNumberId(src.pendingArticles) }} pend</span>
                </td>
                <td class="py-3 px-3 tabular-nums text-ink-secondary font-mono">
                  {{ src.lastArticleAt ? formatDateTimeWita(src.lastArticleAt) : '—' }}
                </td>
                <td class="py-3 px-4 text-right">
                  <NuxtLink
                    :to="`/admin/articles?portal=${encodeURIComponent(src.sourcePortal)}`"
                    class="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-control bg-white hover:border-brand-primary/40 text-[11px] font-semibold text-brand-primary transition-colors"
                  >
                    <span>Arsip</span>
                    <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3" />
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile (< md): Kartu Responsif -->
        <div class="md:hidden divide-y divide-[#141917]/[0.08]">
          <div
            v-for="src in portalsData.otherSources"
            :key="`mob-${src.sourcePortal}-${src.sourceType}`"
            class="p-4 space-y-2.5 bg-white"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-xs text-ink-primary break-words">{{ src.sourcePortal }}</div>
                <span
                  class="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                  :class="sourceTypeBadgeClass(src.sourceType)"
                >
                  {{ getSourceTypeLabel(src.sourceType) }}
                </span>
              </div>
              <NuxtLink
                :to="`/admin/articles?portal=${encodeURIComponent(src.sourcePortal)}`"
                class="min-h-8 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-control bg-white text-[11px] font-semibold text-brand-primary shrink-0"
              >
                <span>Arsip</span>
                <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3" />
              </NuxtLink>
            </div>
            <div class="flex items-center justify-between text-xs tabular-nums text-ink-secondary pt-1 border-t border-border-hairline font-mono">
              <div>
                <strong class="text-ink-primary">{{ formatNumberId(src.totalArticles) }}</strong> total •
                <span class="text-brand-primary font-semibold">{{ formatNumberId(src.verifiedArticles) }} ver</span> •
                <span class="text-ochre-ink font-semibold">{{ formatNumberId(src.pendingArticles) }} pend</span>
              </div>
              <span class="text-[11px] text-ink-muted">
                {{ src.lastArticleAt ? formatDateTimeWita(src.lastArticleAt) : '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

