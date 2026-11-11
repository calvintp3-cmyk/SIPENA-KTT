<!-- app/pages/admin/scrapers.vue -->
<script setup lang="ts">
import { formatDateTimeWita } from '#shared/utils/period';
import type { ScraperLogsResponse } from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { refreshQueueCounters } = useAdminSession();
const { getScraperStatusBadge, formatDurationMs, formatNumberId } = usePdrbLabels();

const page = ref(1);
const PAGE_LIMIT = 15;
const selectedMode = ref<'ALL' | 'REGIONAL_ONLY' | 'NATIONAL_ONLY'>('ALL');
const isTriggeringRun = ref(false);
const isTriggeringRetry = ref(false);

const modeOptions = [
  { label: 'Semua Sumber (4 Portal Lokal + Keyword Nasional)', value: 'ALL' },
  { label: 'Hanya 4 Portal Regional Kaltara', value: 'REGIONAL_ONLY' },
  { label: 'Hanya Penjaringan Keyword Nasional', value: 'NATIONAL_ONLY' },
];

const queryParams = computed(() => ({
  page: page.value,
  limit: PAGE_LIMIT,
}));

const {
  data: logsData,
  pending,
  error,
  refresh,
} = await useFetch<ScraperLogsResponse>('/api/admin/scrapers/logs', {
  query: queryParams,
  watch: [queryParams],
  credentials: 'include',
});

const observability = computed(() => logsData.value?.observability);
const isRunning = computed(() => Boolean(observability.value?.isRunning));

let pollTimer: ReturnType<typeof setInterval> | null = null;
const wasRunning = ref(false);

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void refresh();
  }, 4000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

watch(
  isRunning,
  (runningNow: boolean) => {
    if (runningNow) {
      wasRunning.value = true;
      startPolling();
    } else {
      stopPolling();
      if (wasRunning.value) {
        wasRunning.value = false;
        void refreshQueueCounters();
        toast.add({
          title: 'Eksekusi Scraper Selesai',
          description: 'Log dan metrik observabilitas telah diperbarui.',
          color: 'success',
          icon: 'i-lucide-check-circle-2',
        });
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopPolling();
});

async function triggerManualRun() {
  if (isTriggeringRun.value || isRunning.value) return;
  isTriggeringRun.value = true;

  try {
    await $fetch('/api/admin/scrapers/run', {
      method: 'POST',
      body: { mode: selectedMode.value },
      credentials: 'include',
    });

    toast.add({
      title: 'Scraping Dimulai',
      description: 'Worker sedang mengambil artikel dan memetakan via Gemini Flash.',
      color: 'info',
      icon: 'i-lucide-play-circle',
    });
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    toast.add({
      title: fetchErr.statusCode === 409 ? 'Eksekusi Sedang Berjalan' : 'Gagal Memicu Scraper',
      description: fetchErr.data?.message || 'Tidak dapat memulai scraping manual.',
      color: fetchErr.statusCode === 409 ? 'warning' : 'error',
      icon: 'i-lucide-alert-triangle',
    });
    await refresh();
  } finally {
    isTriggeringRun.value = false;
  }
}

async function triggerRetryFailedLlm() {
  if (isTriggeringRetry.value || isRunning.value) return;
  isTriggeringRetry.value = true;

  try {
    await $fetch('/api/admin/scrapers/retry-llm', {
      method: 'POST',
      credentials: 'include',
    });

    toast.add({
      title: 'Retry LLM Dimulai',
      description: 'Memproses ulang artikel berstatus LLM FAILED.',
      color: 'info',
      icon: 'i-lucide-refresh-cw',
    });
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    toast.add({
      title: fetchErr.statusCode === 409 ? 'Eksekusi Sedang Berjalan' : 'Gagal Memicu Retry LLM',
      description: fetchErr.data?.message || 'Tidak dapat memulai ulang klasifikasi AI.',
      color: fetchErr.statusCode === 409 ? 'warning' : 'error',
      icon: 'i-lucide-alert-triangle',
    });
    await refresh();
  } finally {
    isTriggeringRetry.value = false;
  }
}

const latestRun = computed(() => observability.value?.latestRun ?? null);
const latestStatusBadge = computed(() => getScraperStatusBadge(latestRun.value?.status));
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-teal-700"
        >
          <UIcon name="i-lucide-activity" class="w-3.5 h-3.5" />
          <span>Observabilitas Crawler &amp; Gemini Flash</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1220] mt-0.5">
          Monitor Crawler &amp; Pemakaian Token Gemini Flash
        </h1>
        <p class="text-xs sm:text-sm text-[#5B677A] mt-0.5">
          Pemantauan eksekusi harian otomatis (04:00 WITA), pemulihan antrean AI gagal, dan
          efisiensi deduplikasi kuota Free Tier.
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
          :class="
            isRunning
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          "
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="isRunning ? 'bg-sky-600' : 'bg-emerald-600'"
          />
          <span>{{ isRunning ? 'Worker Aktif Berjalan' : 'Scheduler 04:00 WITA Siap' }}</span>
        </span>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Gagal memuat log crawler &amp; telemetri LLM"
      description="Pastikan koneksi database aktif lalu muat ulang."
    >
      <template #actions>
        <UButton size="xs" color="error" variant="solid" @click="refresh()">Muat Ulang</UButton>
      </template>
    </UAlert>

    <!-- 4 Kartu Metrik Observabilitas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="saas-card rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Eksekusi Terakhir
          </span>
          <UIcon name="i-lucide-clock" class="w-4 h-4 text-teal-700" />
        </div>
        <template v-if="latestRun">
          <div class="flex items-center gap-2 pt-0.5">
            <UBadge
              :color="latestStatusBadge.color"
              variant="subtle"
              size="sm"
              :icon="latestStatusBadge.icon"
            >
              {{ latestStatusBadge.label }}
            </UBadge>
            <span class="text-xs font-mono tabular-nums text-slate-600">
              {{ formatDurationMs(latestRun.durationMs) }}
            </span>
          </div>
          <div class="text-xs font-mono tabular-nums text-[#5B677A]">
            {{ formatDateTimeWita(latestRun.startedAt) }}
          </div>
        </template>
        <template v-else>
          <div class="text-sm font-semibold text-slate-400">Belum pernah berjalan</div>
        </template>
      </div>

      <div class="saas-card rounded-xl p-5 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Token LLM (30 Hari)
          </span>
          <UIcon name="i-lucide-cpu" class="w-4 h-4 text-teal-700" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-[#0B1220] tabular-nums font-mono">
          {{ formatNumberId(observability?.tokenStats30d.totalTokens) }}
        </div>
        <div class="text-xs font-mono tabular-nums text-[#5B677A]">
          In: {{ formatNumberId(observability?.tokenStats30d.totalInputTokens) }} • Out:
          {{ formatNumberId(observability?.tokenStats30d.totalOutputTokens) }}
        </div>
      </div>

      <div class="saas-card rounded-xl p-5 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Antrean LLM Gagal
          </span>
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-amber-600" />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-2xl sm:text-3xl font-bold tabular-nums font-mono"
            :class="
              (observability?.pendingLlmFailedCount ?? 0) > 0
                ? 'text-rose-600'
                : 'text-emerald-700'
            "
          >
            {{ formatNumberId(observability?.pendingLlmFailedCount) }}
            <span class="text-xs font-sans font-medium text-[#5B677A]">Artikel</span>
          </span>

          <UButton
            size="xs"
            color="warning"
            variant="subtle"
            icon="i-lucide-refresh-cw"
            :disabled="isRunning || (observability?.totalLlmFailedCount ?? 0) === 0"
            :loading="isTriggeringRetry"
            @click="triggerRetryFailedLlm"
          >
            Retry
          </UButton>
        </div>
        <div class="text-xs text-[#5B677A] font-mono tabular-nums">
          Total gagal keseluruhan: {{ formatNumberId(observability?.totalLlmFailedCount) }}
        </div>
      </div>

      <div class="saas-card rounded-xl p-5 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Efisiensi Deduplikasi (30h)
          </span>
          <UIcon name="i-lucide-filter" class="w-4 h-4 text-teal-700" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-teal-700 tabular-nums font-mono">
          {{ observability?.tokenStats30d.deduplicationRatePercent ?? 0 }}%
        </div>
        <div class="text-xs font-mono tabular-nums text-[#5B677A]">
          {{ formatNumberId(observability?.tokenStats30d.articlesDeduplicated) }} URL ditolak awal /
          {{ formatNumberId(observability?.tokenStats30d.articlesFetched) }} diambil
        </div>
      </div>
    </div>

    <!-- Panel Kontrol Manual Trigger -->
    <div class="saas-card rounded-xl p-5 space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <UFormField label="Cakupan Eksekusi Manual" class="flex-1 max-w-xl">
          <USelect
            v-model="selectedMode"
            :items="modeOptions"
            value-key="value"
            label-key="label"
            :disabled="isRunning"
            class="w-full"
          />
        </UFormField>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            :disabled="isRunning || isTriggeringRun"
            class="obsidian-button h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            @click="triggerManualRun"
          >
            <UIcon
              :name="isTriggeringRun ? 'i-lucide-loader-circle' : 'i-lucide-play'"
              class="w-3.5 h-3.5 text-teal-300"
              :class="{ 'animate-spin': isTriggeringRun }"
            />
            <span>Jalankan Scraping Sekarang</span>
          </button>

          <button
            type="button"
            :disabled="isRunning || isTriggeringRetry || (observability?.totalLlmFailedCount ?? 0) === 0"
            class="h-9 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            @click="triggerRetryFailedLlm"
          >
            <UIcon
              name="i-lucide-refresh-cw"
              class="w-3.5 h-3.5 text-amber-700"
              :class="{ 'animate-spin': isTriggeringRetry }"
            />
            <span>Proses Ulang Artikel LLM Gagal</span>
          </button>
        </div>
      </div>

      <UAlert
        v-if="isRunning"
        color="info"
        variant="subtle"
        icon="i-lucide-loader-circle"
        title="Eksekusi scraper sedang berjalan di latar belakang..."
        description="Halaman otomatis menyegarkan progres setiap 4 detik hingga selesai."
      />
      <UProgress v-if="isRunning" :model-value="null" color="primary" animation="carousel" />
    </div>

    <!-- Riwayat Log Eksekusi -->
    <div class="saas-card rounded-xl overflow-hidden">
      <div class="px-5 py-3.5 border-b border-[#DCE3EC] bg-[#F8FAFC] flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-[#0B1220]">
            Riwayat Log Eksekusi Crawler
          </h2>
          <p class="text-[11px] text-[#5B677A]">
            Catatan lengkap pipeline fetch, deduplikasi URL, pemetaan AI, dan ringkasan error per sesi.
          </p>
        </div>

        <button
          type="button"
          :disabled="pending"
          class="h-8 px-2.5 rounded-lg border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1220] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          @click="refresh()"
        >
          <UIcon
            name="i-lucide-rotate-cw"
            class="w-3.5 h-3.5 text-teal-700"
            :class="{ 'animate-spin': pending }"
          />
          <span>Segarkan</span>
        </button>
      </div>

      <AdminScraperLogTable :logs="logsData?.items ?? []" :loading="pending" />
    </div>

    <div
      v-if="logsData && logsData.pagination.totalPages > 1"
      class="flex justify-center pt-1"
    >
      <UPagination
        v-model:page="page"
        :total="logsData.pagination.total"
        :items-per-page="PAGE_LIMIT"
      />
    </div>
  </div>
</template>
