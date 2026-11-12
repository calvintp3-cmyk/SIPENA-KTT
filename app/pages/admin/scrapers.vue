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
      description: 'Worker sedang mengambil artikel dan memetakan via pipeline Multi-LLM (Gemini, Groq & OpenRouter).',
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
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold"
        >
          <UIcon name="i-solar-cpu-bolt-bold-duotone" class="w-3.5 h-3.5" />
          <span>Observabilitas Crawler &amp; Pipeline Multi-LLM</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] mt-2">
          Monitor Crawler &amp; Rute Multi-LLM
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
          Pemantauan eksekusi harian otomatis (04:00 WITA), pemulihan antrean AI gagal, serta
          efisiensi deduplikasi kuota Free Tier (Gemini, Groq &amp; OpenRouter).
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-2xs"
          :class="
            isRunning
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          "
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="isRunning ? 'bg-sky-600 animate-pulse' : 'bg-emerald-600'"
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
        <UButton size="xs" color="error" variant="solid" @click="() => { void refresh(); }">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <!-- 4 Kartu Metrik Observabilitas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Eksekusi Terakhir
          </span>
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
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
            <span class="text-xs font-medium tabular-nums text-slate-600">
              {{ formatDurationMs(latestRun.durationMs) }}
            </span>
          </div>
          <div class="text-xs tabular-nums text-slate-600">
            {{ formatDateTimeWita(latestRun.startedAt) }}
          </div>
        </template>
        <template v-else>
          <div class="text-sm font-semibold text-slate-400">Belum pernah berjalan</div>
        </template>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Token LLM (30 Hari)
          </span>
          <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-cpu-bolt-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold text-[#0F172A] tabular-nums">
          {{ formatNumberId(observability?.tokenStats30d.totalTokens) }}
        </div>
        <div class="text-xs tabular-nums text-slate-600">
          In: {{ formatNumberId(observability?.tokenStats30d.totalInputTokens) }} • Out:
          {{ formatNumberId(observability?.tokenStats30d.totalOutputTokens) }}
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Antrean LLM Gagal
          </span>
          <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-refresh-circle-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-3xl font-extrabold tabular-nums"
            :class="
              (observability?.pendingLlmFailedCount ?? 0) > 0
                ? 'text-rose-600'
                : 'text-emerald-700'
            "
          >
            {{ formatNumberId(observability?.pendingLlmFailedCount) }}
            <span class="text-xs font-semibold text-slate-500">Artikel</span>
          </span>

          <UButton
            size="xs"
            color="warning"
            variant="subtle"
            icon="i-solar-restart-bold-duotone"
            :disabled="isRunning || (observability?.totalLlmFailedCount ?? 0) === 0"
            :loading="isTriggeringRetry"
            @click="() => { void triggerRetryFailedLlm(); }"
          >
            Retry
          </UButton>
        </div>
        <div class="text-xs text-slate-600 tabular-nums">
          Total gagal keseluruhan: {{ formatNumberId(observability?.totalLlmFailedCount) }}
        </div>
      </div>

      <div class="saas-card rounded-2xl p-5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">
            Efisiensi Deduplikasi (30h)
          </span>
          <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-filter-bold-duotone" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold text-emerald-700 tabular-nums">
          {{ observability?.tokenStats30d.deduplicationRatePercent ?? 0 }}%
        </div>
        <div class="text-xs tabular-nums text-slate-600">
          {{ formatNumberId(observability?.tokenStats30d.articlesDeduplicated) }} URL ditolak awal /
          {{ formatNumberId(observability?.tokenStats30d.articlesFetched) }} diambil
        </div>
      </div>
    </div>

    <!-- Status & Kapasitas Penyedia Multi-LLM -->
    <section
      v-if="providerSlots.length > 0"
      aria-label="Status dan Kapasitas Penyedia LLM"
      class="saas-card rounded-2xl p-5 space-y-4"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0"
          >
            <UIcon name="i-solar-routing-2-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#0F172A]">
              Status &amp; Kapasitas Penyedia LLM
            </h2>
            <p class="text-xs text-slate-600">
              Urutan failover otomatis antar slot berdasarkan batas RPM, TPM, dan kuota harian.
            </p>
          </div>
        </div>

        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border tabular-nums self-start sm:self-auto"
          :class="
            configuredProviderSlotsCount > 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          "
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="configuredProviderSlotsCount > 0 ? 'bg-emerald-600' : 'bg-amber-500'"
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
              ? 'bg-white border-slate-200/90'
              : 'bg-slate-50/80 border-dashed border-slate-200'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold tabular-nums text-slate-700 shrink-0"
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
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 tabular-nums"
              :class="
                slot.configured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              "
            >
              {{ slot.configured ? `Siap • ${slot.keyCount} Key` : 'Belum Diisi' }}
            </span>
          </div>

          <div class="space-y-1 text-xs">
            <div class="font-semibold text-[#0F172A] truncate" :title="slot.model">
              {{ slot.model }}
            </div>
            <div class="text-[11px] text-slate-600 tabular-nums">
              Batas: {{ slot.rpmLimit }} RPM • {{ formatNumberId(slot.tpmLimit) }} TPM
            </div>
            <div class="text-[11px] text-slate-500">
              Kuota Harian: {{ slot.dailyQuotaNote }}
            </div>
          </div>

          <div
            v-if="getSlotStat30d(slot.slotId)"
            class="pt-2.5 border-t border-slate-100 grid grid-cols-4 gap-2 text-[11px] tabular-nums"
          >
            <div>
              <div class="text-slate-500">Calls</div>
              <div class="font-bold text-[#0F172A]">
                {{ formatNumberId(getSlotStat30d(slot.slotId)!.calls) }}
              </div>
            </div>
            <div>
              <div class="text-slate-500">Sukses</div>
              <div class="font-bold text-emerald-700">
                {{ getSlotSuccessRate(getSlotStat30d(slot.slotId)!) }}%
              </div>
            </div>
            <div>
              <div class="text-slate-500">HTTP 429</div>
              <div
                class="font-bold"
                :class="getSlotStat30d(slot.slotId)!.rateLimits > 0 ? 'text-amber-700' : 'text-slate-600'"
              >
                {{ formatNumberId(getSlotStat30d(slot.slotId)!.rateLimits) }}
              </div>
            </div>
            <div>
              <div class="text-slate-500">Token</div>
              <div class="font-bold text-indigo-700">
                {{ formatNumberId(getSlotStat30d(slot.slotId)!.totalTokens) }}
              </div>
            </div>
          </div>
          <div v-else class="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
            Belum ada panggilan 30 hari terakhir
          </div>
        </div>
      </div>
    </section>

    <!-- Panel Kontrol Manual Trigger -->
    <div class="saas-card rounded-2xl p-5 space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5">
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
            class="btn-primary-gradient h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            @click="() => { void triggerManualRun(); }"
          >
            <UIcon
              :name="isTriggeringRun ? 'i-lucide-loader-circle' : 'i-solar-server-2-bold-duotone'"
              class="w-4 h-4 text-emerald-200"
              :class="{ 'animate-spin': isTriggeringRun }"
            />
            <span>Jalankan Scraping Sekarang</span>
          </button>

          <button
            type="button"
            :disabled="isRunning || isTriggeringRetry || (observability?.totalLlmFailedCount ?? 0) === 0"
            class="h-9 px-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            @click="() => { void triggerRetryFailedLlm(); }"
          >
            <UIcon
              name="i-solar-refresh-circle-bold-duotone"
              class="w-4 h-4 text-amber-700"
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
    <div class="saas-card rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-200/80 bg-[#FAFBFD] flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0">
            <UIcon name="i-solar-history-2-bold-duotone" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#0F172A]">
              Riwayat Log Eksekusi Crawler
            </h2>
            <p class="text-xs text-slate-600">
              Catatan lengkap pipeline fetch, deduplikasi URL, pemetaan AI, dan ringkasan error per sesi.
            </p>
          </div>
        </div>

        <button
          type="button"
          :disabled="pending"
          class="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          @click="() => { void refresh(); }"
        >
          <UIcon
            name="i-solar-restart-bold-duotone"
            class="w-3.5 h-3.5 text-indigo-600"
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
