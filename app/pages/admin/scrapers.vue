<!-- app/pages/admin/scrapers.vue -->
<script setup lang="ts">
import { formatDateTimeWita } from '#shared/utils/period';
import type {
  LlmProviderSlotStatus,
  ScraperLogsResponse,
  ScraperProviderStatEntry,
} from '~/types/sipena';

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

const toast = useToast();
const { refreshQueueCounters } = useAdminSession();
const {
  getScraperStatusBadge,
  formatLlmProviderBadge,
  formatDurationMs,
  formatNumberId,
} = usePdrbLabels();

const page = ref(1);
const PAGE_LIMIT = 15;
const selectedMode = ref<'ALL' | 'REGIONAL_ONLY' | 'NATIONAL_ONLY'>('ALL');
const isTriggeringRun = ref(false);
const isTriggeringRetry = ref(false);

const modeOptions = [
  { label: 'Semua Sumber (12 Portal Regional + 22 Keyword Nasional)', value: 'ALL' },
  { label: 'Hanya 12 Portal Regional Kaltara (Tribun, Koran Kaltara, Benuanta, Radar, dll.)', value: 'REGIONAL_ONLY' },
  { label: 'Hanya Penjaringan Keyword Nasional (Google News, Bing, GDELT)', value: 'NATIONAL_ONLY' },
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
      description:
        'Worker sedang mengambil artikel dan memetakan via pipeline 6 penyedia Multi-LLM (Gemini, Cerebras, Mistral, Groq, NVIDIA NIM & OpenRouter).',
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
const providerSlots = computed<LlmProviderSlotStatus[]>(
  () => observability.value?.providerHealth ?? [],
);
const configuredProviderSlotsCount = computed<number>(
  () => providerSlots.value.filter((slot: LlmProviderSlotStatus) => slot.configured).length,
);

function getSlotStat30d(slotId: string): ScraperProviderStatEntry | null {
  return observability.value?.providerStats30d?.[slotId] ?? null;
}

function getSlotSuccessRate(stat: ScraperProviderStatEntry): number {
  if (!stat.calls) return 0;
  return Math.round((stat.successes / stat.calls) * 100);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-tint text-brand-primary border border-brand-border text-xs font-semibold"
        >
          <UIcon name="i-solar-cpu-bolt-bold-duotone" class="w-3.5 h-3.5 text-brand-primary" />
          <span>Observabilitas Crawler &amp; Pipeline Multi-LLM</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-primary mt-2 font-display">
          Monitor Crawler &amp; Rute Multi-LLM
        </h1>
        <p class="text-xs sm:text-sm text-ink-secondary mt-0.5">
          Pemantauan eksekusi harian otomatis (04:00 WITA), feed GDELT opsional, pemulihan antrean AI gagal, serta
          efisiensi deduplikasi kuota 6 penyedia Multi-LLM (Gemini, Cerebras, Mistral, Groq, NVIDIA NIM &amp; OpenRouter).
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span
          role="status"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-2xs font-mono"
          :class="
            isRunning
              ? 'bg-[#E8F4F1] text-[#0F766E] border-[#A7D7CF]'
              : 'bg-brand-tint text-brand-primary border-brand-border'
          "
        >
          <UIcon
            :name="isRunning ? 'i-lucide-loader-circle' : 'i-lucide-check-circle-2'"
            class="w-3.5 h-3.5 shrink-0"
            :class="{ 'animate-spin': isRunning }"
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
        <UButton size="sm" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- 4 Kartu Metrik Observabilitas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="obs-panel rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-muted">
            Eksekusi Terakhir
          </span>
          <div class="w-7 h-7 rounded-md bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-clock-circle-bold-duotone" class="w-4 h-4" />
          </div>
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
            <span class="text-xs font-medium tabular-nums text-ink-muted font-mono">
              {{ formatDurationMs(latestRun.durationMs) }}
            </span>
          </div>
          <div class="text-xs tabular-nums text-ink-muted font-mono">
            {{ formatDateTimeWita(latestRun.startedAt) }}
          </div>
        </template>
        <template v-else>
          <div class="text-sm font-semibold text-ink-muted">Belum pernah berjalan</div>
        </template>
      </div>

      <div class="obs-panel rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-muted">
            Token LLM (30 Hari)
          </span>
          <div class="w-7 h-7 rounded-md bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-cpu-bolt-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold text-ink-primary tabular-nums font-mono">
          {{ formatNumberId(observability?.tokenStats30d.totalTokens) }}
        </div>
        <div class="text-xs tabular-nums text-ink-muted font-mono">
          In: {{ formatNumberId(observability?.tokenStats30d.totalInputTokens) }} • Out:
          {{ formatNumberId(observability?.tokenStats30d.totalOutputTokens) }}
        </div>
      </div>

      <div class="obs-panel rounded-xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-muted">
            Antrean LLM Gagal
          </span>
          <div class="w-7 h-7 rounded-md bg-[#FEF6EE] text-ochre-ink border border-[#F7D3A6] flex items-center justify-center shrink-0">
            <UIcon name="i-solar-refresh-circle-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-3xl font-extrabold tabular-nums font-mono"
            :class="
              (observability?.pendingLlmFailedCount ?? 0) > 0
                ? 'text-terracotta-ink'
                : 'text-brand-primary'
            "
          >
            {{ formatNumberId(observability?.pendingLlmFailedCount) }}
            <span class="text-xs font-semibold text-ink-muted">Artikel</span>
          </span>

          <UButton
            size="sm"
            color="warning"
            variant="subtle"
            icon="i-solar-restart-bold-duotone"
            class="min-h-8"
            :disabled="isRunning || (observability?.totalLlmFailedCount ?? 0) === 0"
            :loading="isTriggeringRetry"
            @click="() => { void triggerRetryFailedLlm(); }"
          >
            Retry
          </UButton>
        </div>
        <div class="text-xs text-ink-muted tabular-nums font-mono">
          Total gagal keseluruhan: {{ formatNumberId(observability?.totalLlmFailedCount) }}
        </div>
      </div>

      <div class="obs-panel rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-ink-muted">
            Efisiensi Deduplikasi (30h)
          </span>
          <div class="w-8 h-8 rounded-xl bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-filter-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold text-brand-primary tabular-nums font-mono">
          {{ observability?.tokenStats30d.deduplicationRatePercent ?? 0 }}%
        </div>
        <div class="text-xs tabular-nums text-ink-muted font-mono">
          {{ formatNumberId(observability?.tokenStats30d.articlesDeduplicated) }} URL ditolak awal /
          {{ formatNumberId(observability?.tokenStats30d.articlesFetched) }} diambil
        </div>
      </div>
    </div>

    <!-- Status & Kapasitas Penyedia Multi-LLM -->
    <section
      v-if="providerSlots.length > 0"
      aria-label="Status dan Kapasitas Penyedia LLM"
      class="obs-panel rounded-2xl p-5 space-y-4"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-xl bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0"
          >
            <UIcon name="i-solar-routing-2-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-ink-primary font-display">
              Status &amp; Kapasitas Penyedia LLM
            </h2>
            <p class="text-xs text-ink-secondary">
              Urutan failover otomatis antar slot berdasarkan batas RPM, TPM, dan kuota harian.
            </p>
          </div>
        </div>

        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border tabular-nums self-start sm:self-auto font-mono"
          :class="
            configuredProviderSlotsCount > 0
              ? 'bg-brand-tint text-brand-primary border-brand-border'
              : 'bg-[#FEF6EE] text-ochre-ink border-[#F7D3A6]'
          "
        >
          <UIcon
            :name="configuredProviderSlotsCount > 0 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
            class="w-3.5 h-3.5 shrink-0"
          />
          <span>{{ configuredProviderSlotsCount }} / {{ providerSlots.length }} Slot Aktif</span>
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        <div
          v-for="slot in providerSlots"
          :key="slot.slotId"
          class="rounded-xl border p-4 space-y-3 transition-colors"
          :class="
            slot.configured
              ? 'bg-white border-border-hairline'
              : 'bg-canvas border-dashed border-[#141917]/15'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="px-2 py-0.5 rounded-md bg-surface-subtle border border-border-hairline text-[11px] font-bold tabular-nums text-ink-secondary shrink-0 font-mono"
              >
                #{{ slot.priority }}
              </span>
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold truncate"
                :class="formatLlmProviderBadge(`${slot.provider}:${slot.model}`).pillClass"
                :title="slot.model"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="formatLlmProviderBadge(`${slot.provider}:${slot.model}`).dotClass"
                />
                <span class="truncate">
                  {{ formatLlmProviderBadge(`${slot.provider}:${slot.model}`).shortLabel }}
                </span>
              </span>
            </div>

            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 tabular-nums font-mono"
              :class="
                slot.configured
                  ? 'bg-brand-tint text-brand-primary border-brand-border'
                  : 'bg-surface-subtle text-ink-muted border-border-hairline'
              "
            >
              {{ slot.configured ? `Siap • ${slot.keyCount} Key` : 'Belum Diisi' }}
            </span>
          </div>

          <div class="space-y-1 text-xs">
            <div class="font-semibold text-ink-primary truncate font-mono" :title="slot.model">
              {{ slot.model }}
            </div>
            <div class="text-[11px] text-ink-muted tabular-nums font-mono">
              Batas: {{ slot.rpmLimit }} RPM • {{ formatNumberId(slot.tpmLimit) }} TPM
            </div>
            <div class="text-[11px] text-ink-muted">
              Kuota Harian: {{ slot.dailyQuotaNote }}
            </div>
          </div>

          <div
            v-if="getSlotStat30d(slot.slotId)"
            class="pt-2.5 border-t border-border-hairline grid grid-cols-4 gap-2 text-[11px] tabular-nums font-mono"
          >
            <div>
              <div class="text-ink-muted">Calls</div>
              <div class="font-bold text-ink-primary">
                {{ formatNumberId(getSlotStat30d(slot.slotId)!.calls) }}
              </div>
            </div>
            <div>
              <div class="text-ink-muted">Sukses</div>
              <div class="font-bold text-brand-primary">
                {{ getSlotSuccessRate(getSlotStat30d(slot.slotId)!) }}%
              </div>
            </div>
            <div>
              <div class="text-ink-muted">HTTP 429</div>
              <div
                class="font-bold"
                :class="getSlotStat30d(slot.slotId)!.rateLimits > 0 ? 'text-ochre-ink' : 'text-ink-muted'"
              >
                {{ formatNumberId(getSlotStat30d(slot.slotId)!.rateLimits) }}
              </div>
            </div>
            <div>
              <div class="text-ink-muted">Token</div>
              <div class="font-bold text-brand-primary">
                {{ formatNumberId(getSlotStat30d(slot.slotId)!.totalTokens) }}
              </div>
            </div>
          </div>
          <div v-else class="pt-2.5 border-t border-border-hairline text-[11px] text-ink-muted">
            Belum ada panggilan 30 hari terakhir
          </div>
        </div>
      </div>
    </section>

    <!-- Panel Kontrol Manual Trigger -->
    <div class="obs-panel rounded-2xl p-5 space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5">
        <UFormField label="Cakupan Eksekusi Manual" class="flex-1 max-w-xl">
          <USelect
            id="scraper-mode-select"
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
            class="obs-btn-primary min-h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            @click="() => { void triggerManualRun(); }"
          >
            <UIcon
              :name="isTriggeringRun ? 'i-lucide-loader-circle' : 'i-solar-server-2-bold-duotone'"
              class="w-4 h-4 text-[#E3F0EA]"
              :class="{ 'animate-spin': isTriggeringRun }"
            />
            <span>Jalankan Scraping Sekarang</span>
          </button>

          <button
            type="button"
            :disabled="isRunning || isTriggeringRetry || (observability?.totalLlmFailedCount ?? 0) === 0"
            class="min-h-9 px-3.5 rounded-xl border border-[#F7D3A6] bg-[#FEF6EE] hover:bg-[#FDEEDC] text-xs font-semibold text-ochre-ink inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            @click="() => { void triggerRetryFailedLlm(); }"
          >
            <UIcon
              name="i-solar-refresh-circle-bold-duotone"
              class="w-4 h-4 text-ochre-ink"
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
    <div class="obs-panel rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border-hairline bg-canvas flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-brand-tint text-brand-primary border border-brand-border flex items-center justify-center shrink-0">
            <UIcon name="i-solar-history-2-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-ink-primary font-display">
              Riwayat Log Eksekusi Crawler
            </h2>
            <p class="text-xs text-ink-secondary">
              Catatan lengkap pipeline fetch, deduplikasi URL, pemetaan AI, dan ringkasan error per sesi.
            </p>
          </div>
        </div>

        <button
          type="button"
          :disabled="pending"
          class="min-h-8 px-3 rounded-xl border border-border-hairline bg-white hover:border-brand-primary/30 hover:bg-canvas text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          @click="() => { void refresh(); }"
        >
          <UIcon
            name="i-solar-restart-bold-duotone"
            class="w-3.5 h-3.5 text-brand-primary"
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
