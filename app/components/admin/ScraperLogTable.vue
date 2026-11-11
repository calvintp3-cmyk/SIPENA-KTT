<!-- app/components/admin/ScraperLogTable.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { formatDateTimeWita } from '#shared/utils/period';
import type { ScraperLogItem } from '~/types/sipena';

defineProps<{
  logs: ScraperLogItem[];
  loading: boolean;
}>();

const { getScraperStatusBadge, getScraperRunTypeLabel, formatDurationMs, formatNumberId } =
  usePdrbLabels();

const detailModalOpen = ref(false);
const selectedLog = ref<ScraperLogItem | null>(null);

function openDetail(log: ScraperLogItem) {
  selectedLog.value = log;
  detailModalOpen.value = true;
}

const columns: TableColumn<ScraperLogItem>[] = [
  { id: 'startedAt', header: 'Waktu Mulai (WITA)' },
  { id: 'runType', header: 'Jenis' },
  { id: 'status', header: 'Status' },
  { id: 'pipeline', header: 'Diambil / Dedup / Masuk' },
  { id: 'classification', header: 'Ekon / Non / Gagal' },
  { id: 'tokens', header: 'Token LLM' },
  { id: 'duration', header: 'Durasi' },
  { id: 'actions', header: 'Log' },
];
</script>

<template>
  <div>
    <div
      tabindex="0"
      role="region"
      aria-label="Riwayat Eksekusi Scraper & Pipeline AI"
      class="saas-table-scroller"
    >
      <UTable :data="logs" :columns="columns" :loading="loading" empty="Belum ada riwayat eksekusi scraper.">
        <template #startedAt-cell="{ row }">
          <div class="space-y-0.5">
            <div class="text-xs font-medium tabular-nums text-[#0F172A]">
              {{ formatDateTimeWita(row.original.startedAt) }}
            </div>
            <div v-if="row.original.triggeredByName" class="text-[11px] text-slate-500">
              Oleh: {{ row.original.triggeredByName }}
            </div>
          </div>
        </template>

        <template #runType-cell="{ row }">
          <UBadge color="neutral" variant="outline" size="xs">
            {{ getScraperRunTypeLabel(row.original.runType) }}
          </UBadge>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="getScraperStatusBadge(row.original.status).color"
            variant="subtle"
            size="xs"
            :icon="getScraperStatusBadge(row.original.status).icon"
          >
            {{ getScraperStatusBadge(row.original.status).label }}
          </UBadge>
        </template>

        <template #pipeline-cell="{ row }">
          <div class="text-xs tabular-nums text-slate-700">
            {{ row.original.articlesFetched }} diambil /
            <span class="text-slate-500">{{ row.original.articlesDeduplicated }} dedup</span> /
            <strong class="text-indigo-700">+{{ row.original.articlesInserted }} baru</strong>
          </div>
        </template>

        <template #classification-cell="{ row }">
          <div class="text-xs tabular-nums">
            <span class="text-emerald-700 font-semibold">{{ row.original.economicCount }} Ekon</span>
            /
            <span class="text-slate-500">{{ row.original.nonEconomicCount }} Non</span>
            <span v-if="row.original.llmFailedCount > 0" class="text-rose-600 font-semibold ml-1">
              (+{{ row.original.llmFailedCount }}!)
            </span>
          </div>
        </template>

        <template #tokens-cell="{ row }">
          <div class="text-xs font-semibold tabular-nums text-[#0F172A]">
            {{ formatNumberId(row.original.totalTokens) }} tk
          </div>
          <div class="text-[11px] tabular-nums text-slate-500">
            {{ formatNumberId(row.original.totalInputTokens) }} in /
            {{ formatNumberId(row.original.totalOutputTokens) }} out
          </div>
        </template>

        <template #duration-cell="{ row }">
          <span class="text-xs font-medium tabular-nums text-slate-700">
            {{ formatDurationMs(row.original.durationMs) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            size="xs"
            color="primary"
            variant="subtle"
            icon="i-solar-document-text-bold-duotone"
            @click="() => { openDetail(row.original); }"
          >
            Detail
            <span v-if="row.original.errorSummary?.length" class="ml-1 font-bold tabular-nums text-rose-600">
              ({{ row.original.errorSummary.length }})
            </span>
          </UButton>
        </template>
      </UTable>
    </div>

    <!-- Modal Detail Log & Error Summary -->
    <UModal
      v-model:open="detailModalOpen"
      title="Detail Eksekusi Scraper"
      :description="selectedLog ? formatDateTimeWita(selectedLog.startedAt) : ''"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div v-if="selectedLog" class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="rounded-xl bg-[#FAFBFD] border border-slate-200/90 p-3">
              <div class="text-slate-500 font-medium">Portal / Keyword</div>
              <div class="font-extrabold text-[#0F172A] mt-0.5 tabular-nums">
                {{ selectedLog.portalsChecked }} / {{ selectedLog.keywordsChecked }}
              </div>
            </div>
            <div class="rounded-xl bg-[#FAFBFD] border border-slate-200/90 p-3">
              <div class="text-slate-500 font-medium">Rata-rata AI</div>
              <div class="font-extrabold text-[#0F172A] mt-0.5 tabular-nums">
                {{ selectedLog.avgResponseTimeMs ? `${selectedLog.avgResponseTimeMs} ms` : '-' }}
              </div>
            </div>
            <div class="rounded-xl bg-[#FAFBFD] border border-slate-200/90 p-3">
              <div class="text-slate-500 font-medium">Total Token</div>
              <div class="font-extrabold text-[#0F172A] mt-0.5 tabular-nums">
                {{ formatNumberId(selectedLog.totalTokens) }}
              </div>
            </div>
            <div class="rounded-xl bg-[#FAFBFD] border border-slate-200/90 p-3">
              <div class="text-slate-500 font-medium">Total Durasi</div>
              <div class="font-extrabold text-[#0F172A] mt-0.5 tabular-nums">
                {{ formatDurationMs(selectedLog.durationMs) }}
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600">
              Ringkasan Error ({{ selectedLog.errorSummary?.length ?? 0 }})
            </h4>

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
                class="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3 text-xs space-y-1"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-[#0F172A]">{{ entry.source }}</span>
                  <UBadge color="error" variant="subtle" size="xs">
                    {{ entry.stage }}
                  </UBadge>
                </div>
                <p class="text-slate-700 leading-relaxed">{{ entry.message }}</p>
                <div v-if="entry.url" class="text-[11px] text-slate-500 break-all">
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

