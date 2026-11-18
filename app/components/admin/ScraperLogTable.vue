<!-- app/components/admin/ScraperLogTable.vue -->
<script setup lang="ts">
import { formatDateTimeWita } from '#shared/utils/period';
import type { ScraperLogItem, ScraperProviderStatEntry } from '~/types/sipena';

defineProps<{
  logs: ScraperLogItem[];
  loading: boolean;
}>();

const {
  getScraperStatusBadge,
  getScraperRunTypeLabel,
  formatLlmProviderBadge,
  formatDurationMs,
  formatNumberId,
} = usePdrbLabels();

const detailModalOpen = ref(false);
const selectedLog = ref<ScraperLogItem | null>(null);

function openDetail(log: ScraperLogItem) {
  selectedLog.value = log;
  detailModalOpen.value = true;
}

function getProviderEntries(log: ScraperLogItem | null | undefined): ScraperProviderStatEntry[] {
  const stats = log?.providerStats;
  if (!stats || typeof stats !== 'object') return [];
  return Object.values(stats)
    .filter((entry): entry is ScraperProviderStatEntry => Boolean(entry && entry.calls > 0))
    .sort((a, b) => b.calls - a.calls);
}

function formatAvgLatency(entry: ScraperProviderStatEntry): string {
  if (!entry.calls || entry.totalLatencyMs <= 0) return '-';
  return `${Math.round(entry.totalLatencyMs / entry.calls)} ms`;
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading && logs.length === 0" class="p-6 space-y-3">
      <div
        v-for="idx in 4"
        :key="idx"
        class="h-14 rounded-xl bg-[#ECEAE2]/80 animate-pulse border border-[#141917]/10"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="logs.length === 0"
      class="px-5 py-10 text-center text-xs sm:text-sm text-[#737B76]"
    >
      Belum ada riwayat eksekusi scraper.
    </div>

    <!-- Desktop & Tablet View (>= md): Tabel Padat Tanpa Horizontal Scroll -->
    <div
      v-else
      role="region"
      aria-label="Riwayat Eksekusi Scraper & Pipeline AI"
      class="hidden md:block w-full"
    >
      <table class="w-full table-fixed border-collapse text-left text-xs">
        <caption class="sr-only">
          Riwayat eksekusi harian dan manual crawler beserta metrik pipeline URL, klasifikasi AI, dan pemakaian token LLM
        </caption>
        <thead>
          <tr class="border-b border-[#141917]/10 bg-[#F6F5F1] text-[11px] font-bold uppercase tracking-wider text-[#737B76]">
            <th scope="col" class="w-[21%] py-3 pl-4 pr-2.5">Waktu &amp; Jenis Sesi</th>
            <th scope="col" class="w-[14%] py-3 px-2.5">Status &amp; Durasi</th>
            <th scope="col" class="w-[18%] py-3 px-2.5">Pipeline URL</th>
            <th scope="col" class="w-[15%] py-3 px-2.5">Klasifikasi AI</th>
            <th scope="col" class="w-[22%] py-3 px-2.5">Rute &amp; Token LLM</th>
            <th scope="col" class="w-[10%] py-3 pl-2.5 pr-4 text-right">Log</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#141917]/10 bg-white">
          <tr
            v-for="log in logs"
            :key="log.id"
            class="hover:bg-[#F6F5F1] transition-colors align-top"
          >
            <!-- 1. Waktu & Jenis Sesi -->
            <td class="py-3 pl-4 pr-2.5">
              <div class="font-bold tabular-nums text-[#141917] leading-snug font-mono">
                {{ formatDateTimeWita(log.startedAt) }}
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <UBadge color="neutral" variant="outline" size="xs" class="text-[10px] py-0 px-1.5">
                  {{ getScraperRunTypeLabel(log.runType) }}
                </UBadge>
                <span
                  v-if="log.triggeredByName"
                  class="text-[11px] text-[#737B76] truncate max-w-[130px]"
                  :title="`Dipicu oleh: ${log.triggeredByName}`"
                >
                  • {{ log.triggeredByName }}
                </span>
              </div>
            </td>

            <!-- 2. Status & Durasi -->
            <td class="py-3 px-2.5">
              <div>
                <UBadge
                  :color="getScraperStatusBadge(log.status).color"
                  variant="subtle"
                  size="xs"
                  :icon="getScraperStatusBadge(log.status).icon"
                >
                  {{ getScraperStatusBadge(log.status).label }}
                </UBadge>
              </div>
              <div class="mt-1 text-[11px] font-medium tabular-nums text-[#737B76] font-mono flex items-center gap-1">
                <UIcon name="i-lucide-timer" class="w-3 h-3 text-[#737B76]/70 shrink-0" />
                <span>{{ formatDurationMs(log.durationMs) }}</span>
              </div>
            </td>

            <!-- 3. Pipeline URL -->
            <td class="py-3 px-2.5 tabular-nums">
              <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[#4A524E] leading-snug">
                <span><strong class="font-semibold text-[#141917]">{{ log.articlesFetched }}</strong> diambil</span>
                <span class="text-[#141917]/20">•</span>
                <span class="text-[#737B76]">{{ log.articlesDeduplicated }} dedup</span>
              </div>
              <div class="mt-1">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold"
                  :class="
                    log.articlesInserted > 0
                      ? 'bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB]'
                      : 'bg-[#ECEAE2] text-[#737B76]'
                  "
                >
                  +{{ log.articlesInserted }} artikel baru
                </span>
              </div>
            </td>

            <!-- 4. Klasifikasi AI -->
            <td class="py-3 px-2.5 tabular-nums">
              <div class="flex flex-wrap items-center gap-1 leading-snug">
                <span class="text-[#0B3D2E] font-bold">{{ log.economicCount }} Ekon</span>
                <span class="text-[#141917]/20">/</span>
                <span class="text-[#737B76] font-medium">{{ log.nonEconomicCount }} Non</span>
              </div>
              <div class="mt-1">
                <span
                  v-if="log.llmFailedCount > 0"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FBECE8] text-[#C8553D] border border-[#F2C9BE] text-[10px] font-bold"
                >
                  <UIcon name="i-lucide-alert-circle" class="w-3 h-3 shrink-0" />
                  <span>{{ log.llmFailedCount }} gagal AI</span>
                </span>
                <span v-else class="text-[11px] text-[#737B76]">
                  0 gagal AI
                </span>
              </div>
            </td>

            <!-- 5. Rute & Token LLM -->
            <td class="py-3 px-2.5">
              <div
                v-if="getProviderEntries(log).length > 0"
                class="flex flex-wrap items-center gap-1"
              >
                <span
                  v-for="entry in getProviderEntries(log).slice(0, 2)"
                  :key="entry.slotId"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold tabular-nums max-w-full truncate"
                  :class="formatLlmProviderBadge(`${entry.provider}:${entry.model}`).pillClass"
                  :title="`${entry.slotId} (${entry.model}) • Sukses: ${entry.successes}/${entry.calls}, 429: ${entry.rateLimits}, Gagal: ${entry.failures}`"
                >
                  <span class="truncate">{{ formatLlmProviderBadge(`${entry.provider}:${entry.model}`).shortLabel }}</span>
                  <span class="opacity-80 shrink-0">{{ entry.successes }}/{{ entry.calls }}</span>
                </span>
                <span
                  v-if="getProviderEntries(log).length > 2"
                  class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#ECEAE2] border border-[#141917]/10 text-[10px] font-bold text-[#4A524E] tabular-nums"
                  :title="getProviderEntries(log).slice(2).map((e) => `${e.slotId}: ${e.successes}/${e.calls}`).join(', ')"
                >
                  +{{ getProviderEntries(log).length - 2 }}
                </span>
              </div>
              <div v-else class="text-[11px] text-[#737B76]">
                Tanpa panggilan LLM
              </div>

              <div class="mt-1 text-[11px] tabular-nums text-[#737B76] font-mono truncate">
                <strong class="font-semibold text-[#141917]">{{ formatNumberId(log.totalTokens) }} tk</strong>
                <span class="text-[#737B76]/50 mx-1">•</span>
                <span>{{ formatNumberId(log.totalInputTokens) }} in / {{ formatNumberId(log.totalOutputTokens) }} out</span>
              </div>
            </td>

            <!-- 6. Aksi Detail -->
            <td class="py-3 pl-2.5 pr-4 text-right">
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-solar-document-text-bold-duotone"
                class="min-h-8 cursor-pointer"
                @click="() => { openDetail(log); }"
              >
                <span>Detail</span>
                <span v-if="log.errorSummary?.length" class="ml-0.5 font-bold tabular-nums text-[#C8553D]">
                  ({{ log.errorSummary.length }})
                </span>
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile View (< md): Daftar Kartu Responsif Tanpa Scroll Horizontal -->
    <div
      v-if="logs.length > 0"
      role="region"
      aria-label="Daftar Riwayat Eksekusi Scraper Mobile"
      class="md:hidden divide-y divide-[#141917]/10"
    >
      <div
        v-for="log in logs"
        :key="`mob-${log.id}`"
        class="p-4 space-y-3 bg-white hover:bg-[#F6F5F1] transition-colors"
      >
        <!-- Baris Atas: Waktu & Status -->
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs font-bold tabular-nums text-[#141917] font-mono">
              {{ formatDateTimeWita(log.startedAt) }}
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              <UBadge color="neutral" variant="outline" size="xs" class="text-[10px]">
                {{ getScraperRunTypeLabel(log.runType) }}
              </UBadge>
              <span v-if="log.triggeredByName" class="text-[11px] text-[#737B76] truncate">
                • {{ log.triggeredByName }}
              </span>
            </div>
          </div>

          <div class="flex flex-col items-end gap-1 shrink-0">
            <UBadge
              :color="getScraperStatusBadge(log.status).color"
              variant="subtle"
              size="xs"
              :icon="getScraperStatusBadge(log.status).icon"
            >
              {{ getScraperStatusBadge(log.status).label }}
            </UBadge>
            <span class="text-[11px] font-mono tabular-nums text-[#737B76]">
              {{ formatDurationMs(log.durationMs) }}
            </span>
          </div>
        </div>

        <!-- Baris Tengah: 2 Kolom Pipeline & Klasifikasi -->
        <div class="grid grid-cols-2 gap-2.5 rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-2.5 text-xs tabular-nums font-mono">
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-wider text-[#737B76]">
              Pipeline URL
            </div>
            <div class="mt-0.5 text-[#4A524E]">
              {{ log.articlesFetched }} ambil • {{ log.articlesDeduplicated }} dedup
            </div>
            <div class="font-bold text-[#0B3D2E] mt-0.5">
              +{{ log.articlesInserted }} baru
            </div>
          </div>

          <div>
            <div class="text-[10px] font-semibold uppercase tracking-wider text-[#737B76]">
              Klasifikasi AI
            </div>
            <div class="mt-0.5">
              <span class="font-bold text-[#0B3D2E]">{{ log.economicCount }} Ekon</span>
              <span class="text-[#737B76]/50 mx-1">/</span>
              <span class="text-[#4A524E]">{{ log.nonEconomicCount }} Non</span>
            </div>
            <div
              class="mt-0.5 text-[11px] font-semibold"
              :class="log.llmFailedCount > 0 ? 'text-[#C8553D]' : 'text-[#737B76]'"
            >
              {{ log.llmFailedCount > 0 ? `+${log.llmFailedCount} gagal AI` : '0 gagal AI' }}
            </div>
          </div>
        </div>

        <!-- Baris Bawah: Rute LLM, Token & Tombol Detail -->
        <div class="flex items-center justify-between gap-2 pt-0.5">
          <div class="min-w-0 flex-1 space-y-1">
            <div v-if="getProviderEntries(log).length > 0" class="flex flex-wrap items-center gap-1">
              <span
                v-for="entry in getProviderEntries(log).slice(0, 2)"
                :key="entry.slotId"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold tabular-nums"
                :class="formatLlmProviderBadge(`${entry.provider}:${entry.model}`).pillClass"
              >
                <span>{{ formatLlmProviderBadge(`${entry.provider}:${entry.model}`).shortLabel }}</span>
                <span class="opacity-75">{{ entry.successes }}/{{ entry.calls }}</span>
              </span>
              <span
                v-if="getProviderEntries(log).length > 2"
                class="px-1.5 py-0.5 rounded-full bg-[#ECEAE2] border border-[#141917]/10 text-[10px] font-bold text-[#4A524E]"
              >
                +{{ getProviderEntries(log).length - 2 }}
              </span>
            </div>
            <div class="text-[11px] font-mono tabular-nums text-[#737B76]">
              <strong class="text-[#141917]">{{ formatNumberId(log.totalTokens) }} tk</strong>
              ({{ formatNumberId(log.totalInputTokens) }} in / {{ formatNumberId(log.totalOutputTokens) }} out)
            </div>
          </div>

          <UButton
            size="sm"
            color="primary"
            variant="subtle"
            icon="i-solar-document-text-bold-duotone"
            class="min-h-9 shrink-0 cursor-pointer"
            @click="() => { openDetail(log); }"
          >
            Detail
            <span v-if="log.errorSummary?.length" class="ml-1 font-bold tabular-nums text-[#C8553D]">
              ({{ log.errorSummary.length }})
            </span>
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal Detail Log & Error Summary -->
    <UModal
      v-model:open="detailModalOpen"
      title="Detail Eksekusi Scraper"
      :description="selectedLog ? formatDateTimeWita(selectedLog.startedAt) : ''"
      :ui="{ content: 'max-w-2xl w-[calc(100vw-1.5rem)]' }"
    >
      <template #body>
        <div v-if="selectedLog" class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div class="rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-3">
              <div class="text-[#737B76] font-medium">Portal / Keyword</div>
              <div class="font-extrabold text-[#141917] mt-0.5 tabular-nums font-mono">
                {{ selectedLog.portalsChecked }} / {{ selectedLog.keywordsChecked }}
              </div>
            </div>
            <div class="rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-3">
              <div class="text-[#737B76] font-medium">Rata-rata AI</div>
              <div class="font-extrabold text-[#141917] mt-0.5 tabular-nums font-mono">
                {{ selectedLog.avgResponseTimeMs ? `${selectedLog.avgResponseTimeMs} ms` : '-' }}
              </div>
            </div>
            <div class="rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-3">
              <div class="text-[#737B76] font-medium">Total Token</div>
              <div class="font-extrabold text-[#141917] mt-0.5 tabular-nums font-mono">
                {{ formatNumberId(selectedLog.totalTokens) }}
              </div>
            </div>
            <div class="rounded-xl bg-[#F6F5F1] border border-[#141917]/10 p-3">
              <div class="text-[#737B76] font-medium">Total Durasi</div>
              <div class="font-extrabold text-[#141917] mt-0.5 tabular-nums font-mono">
                {{ formatDurationMs(selectedLog.durationMs) }}
              </div>
            </div>
          </div>

          <!-- Rincian Pemakaian per Slot Penyedia LLM -->
          <div class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#737B76]">
              Rincian Pemakaian per Slot LLM
            </h3>

            <div
              v-if="getProviderEntries(selectedLog).length === 0"
              class="rounded-xl border border-[#141917]/10 bg-[#F6F5F1] px-3.5 py-2.5 text-xs text-[#737B76]"
            >
              Belum ada panggilan LLM tercatat pada sesi ini.
            </div>

            <div
              v-else
              role="region"
              aria-label="Rincian pemakaian per slot penyedia LLM"
              class="rounded-xl border border-[#141917]/10 overflow-hidden"
            >
              <table class="w-full table-fixed divide-y divide-[#141917]/10 text-left text-xs">
                <caption class="sr-only">
                  Rincian panggilan, keberhasilan, HTTP 429, latensi rata-rata, dan token per slot LLM pada sesi ini
                </caption>
                <thead class="bg-[#F6F5F1] text-[11px] font-semibold text-[#737B76]">
                  <tr>
                    <th scope="col" class="w-[36%] px-3 py-2">Slot / Model</th>
                    <th scope="col" class="w-[14%] px-2 py-2 text-right">Calls</th>
                    <th scope="col" class="w-[18%] px-2 py-2 text-right">Sukses/Gagal</th>
                    <th scope="col" class="w-[14%] px-2 py-2 text-right hidden sm:table-cell">Latensi</th>
                    <th scope="col" class="w-[18%] px-3 py-2 text-right">Token</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#141917]/10 bg-white">
                  <tr v-for="entry in getProviderEntries(selectedLog)" :key="entry.slotId">
                    <td class="px-3 py-2 min-w-0">
                      <span
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold max-w-full truncate"
                        :class="formatLlmProviderBadge(`${entry.provider}:${entry.model}`).pillClass"
                      >
                        <span class="truncate">{{ formatLlmProviderBadge(`${entry.provider}:${entry.model}`).shortLabel }}</span>
                      </span>
                      <div class="text-[10px] text-[#737B76] mt-0.5 truncate font-mono">{{ entry.slotId }}</div>
                    </td>
                    <td class="px-2 py-2 text-right tabular-nums font-semibold text-[#141917] font-mono">
                      {{ formatNumberId(entry.calls) }}
                      <div v-if="entry.rateLimits > 0" class="text-[10px] text-[#B45309] font-medium">
                        {{ entry.rateLimits }}x 429
                      </div>
                    </td>
                    <td class="px-2 py-2 text-right tabular-nums font-mono">
                      <span class="font-semibold text-[#0B3D2E]">{{ formatNumberId(entry.successes) }}</span>
                      /
                      <span :class="entry.failures > 0 ? 'font-semibold text-[#C8553D]' : 'text-[#737B76]'">
                        {{ formatNumberId(entry.failures) }}
                      </span>
                    </td>
                    <td class="px-2 py-2 text-right tabular-nums text-[#4A524E] hidden sm:table-cell font-mono">
                      {{ formatAvgLatency(entry) }}
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums font-semibold text-[#0B3D2E] font-mono">
                      {{ formatNumberId(entry.totalTokens) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#737B76]">
              Ringkasan Error ({{ selectedLog.errorSummary?.length ?? 0 }})
            </h3>

            <UAlert
              v-if="!selectedLog.errorSummary?.length"
              color="success"
              variant="subtle"
              icon="i-lucide-check-circle-2"
              title="Tidak ada error yang tercatat pada sesi eksekusi ini."
            />

            <div v-else class="max-h-72 overflow-y-auto saas-scroll space-y-2 pr-1">
              <div
                v-for="(entry, idx) in selectedLog.errorSummary"
                :key="idx"
                class="rounded-xl border border-[#F2C9BE] bg-[#FBECE8]/50 p-3 text-xs space-y-1"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-[#141917] break-words min-w-0">{{ entry.source }}</span>
                  <UBadge color="error" variant="subtle" size="xs" class="shrink-0">
                    {{ entry.stage }}
                  </UBadge>
                </div>
                <p class="text-[#4A524E] leading-relaxed break-words">{{ entry.message }}</p>
                <div v-if="entry.url" class="text-[11px] text-[#737B76] break-all font-mono">
                  {{ entry.url }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="w-full flex justify-end">
          <UButton color="neutral" variant="outline" @click="() => { detailModalOpen = false; }">
            Tutup
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
