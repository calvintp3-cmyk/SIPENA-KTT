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
  <div class="space-y-5">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold tracking-tight text-slate-900">
        Monitor Crawler &amp; Pemakaian Token Gemini Flash
      </h1>
      <p class="text-sm text-slate-600 mt-0.5">
        Pemantauan eksekusi harian otomatis (04:00 WITA), retry artikel gagal, dan efisiensi Free Tier.
      </p>
    </div>

    <!-- 4 Kartu Metrik Observabilitas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="space-y-2">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Eksekusi Terakhir
          </div>
          <template v-if="latestRun">
            <div class="flex items-center gap-2">
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
            <div class="text-xs font-mono tabular-nums text-slate-500">
              {{ formatDateTimeWita(latestRun.startedAt) }}
            </div>
          </template>
          <template v-else>
            <div class="text-sm font-semibold text-slate-400">Belum pernah berjalan</div>
          </template>
        </div>
      </UCard>

      <UCard>
        <div class="space-y-1.5">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Token LLM (30 Hari)
          </div>
          <div class="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {{ formatNumberId(observability?.tokenStats30d.totalTokens) }}
          </div>
          <div class="text-xs font-mono tabular-nums text-slate-500">
            In: {{ formatNumberId(observability?.tokenStats30d.totalInputTokens) }} • Out:
            {{ formatNumberId(observability?.tokenStats30d.totalOutputTokens) }}
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="space-y-2">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Antrean LLM Gagal
          </div>
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-2xl font-bold tabular-nums font-mono"
              :class="
                (observability?.pendingLlmFailedCount ?? 0) > 0
                  ? 'text-rose-600'
                  : 'text-emerald-700'
              "
            >
              {{ formatNumberId(observability?.pendingLlmFailedCount) }}
              <span class="text-xs font-sans font-medium text-slate-500">Artikel</span>
            </span>

            <UButton
              size="xs"
              color="warning"
              variant="subtle"
              icon="i-lucide-refresh-cw"
              :disabled="
                isRunning || (observability?.totalLlmFailedCount ?? 0) === 0
              "
              :loading="isTriggeringRetry"
              @click="triggerRetryFailedLlm"
            >
              Retry
            </UButton>
          </div>
          <div class="text-xs text-slate-500 font-mono tabular-nums">
            Total gagal keseluruhan: {{ formatNumberId(observability?.totalLlmFailedCount) }}
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="space-y-1.5">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Efisiensi Deduplikasi (30h)
          </div>
          <div class="text-2xl font-bold text-teal-700 tabular-nums font-mono">
            {{ observability?.tokenStats30d.deduplicationRatePercent ?? 0 }}%
          </div>
          <div class="text-xs font-mono tabular-nums text-slate-500">
            {{ formatNumberId(observability?.tokenStats30d.articlesDeduplicated) }} URL ditolak
            awal / {{ formatNumberId(observability?.tokenStats30d.articlesFetched) }} diambil
          </div>
        </div>
      </UCard>
    </div>

    <!-- Panel Kontrol Manual Trigger -->
    <UCard>
      <div class="space-y-4">
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

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-play"
              :disabled="isRunning"
              :loading="isTriggeringRun"
              @click="triggerManualRun"
            >
              Jalankan Scraping Sekarang
            </UButton>

            <UButton
              color="warning"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :disabled="isRunning || (observability?.totalLlmFailedCount ?? 0) === 0"
              :loading="isTriggeringRetry"
              @click="triggerRetryFailedLlm"
            >
              Proses Ulang Artikel LLM Gagal
            </UButton>
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
    </UCard>

    <!-- Riwayat Log Eksekusi -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-bold text-slate-900">
            Riwayat Log Eksekusi Crawler
          </h2>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-rotate-cw"
            :loading="pending"
            @click="refresh()"
          >
            Segarkan
          </UButton>
        </div>
      </template>

      <AdminScraperLogTable :logs="logsData?.items ?? []" :loading="pending" />
    </UCard>

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
