<!-- app/components/admin/articles/ArticleTableList.vue -->
<script setup lang="ts">
import type { AdminArticleItem } from '~/types/sipena';
import { formatDateId, formatPeriodLabel } from '#shared/utils/period';

const props = defineProps<{
  items: AdminArticleItem[];
  columns: any[];
  pending: boolean;
  selectedMap: Record<string, boolean>;
  isAllSelected: boolean;
}>();

const emit = defineEmits<{
  toggleSelectAll: [];
  edit: [item: AdminArticleItem];
  delete: [item: AdminArticleItem];
}>();

const {
  getVerificationStatusBadge,
  getKbliClusterTheme,
  getKbliShortCodeName,
  getKbliImpactBadge,
  getExpenditureColorTheme,
  getExpenditureLabel,
  getExpenditureImpactBadge,
  isSafeHttpUrl,
} = usePdrbLabels();
</script>

<template>
  <div class="obs-panel rounded-2xl overflow-hidden">
    <!-- Desktop Table (>= lg) -->
    <div
      role="region"
      aria-label="Tabel Bank Data Fenomena Ekonomi"
      class="hidden lg:block w-full"
    >
      <UTable
        :data="items"
        :columns="columns"
        :loading="pending"
        :ui="{
          th: 'py-2.5 px-2.5 text-[11px] font-bold text-ink-secondary whitespace-nowrap bg-canvas',
          td: 'py-2.5 px-2.5 text-xs align-top whitespace-normal',
        }"
        empty="Tidak ada arsip berita yang sesuai dengan kriteria filter."
      >
        <template #select-header>
          <UCheckbox
            :model-value="isAllSelected"
            aria-label="Pilih semua baris di halaman"
            size="sm"
            @update:model-value="emit('toggleSelectAll')"
          />
        </template>

        <template #select-cell="{ row }">
          <UCheckbox
            v-model="selectedMap[row.original.id]"
            :aria-label="`Pilih ${row.original.title}`"
            size="sm"
          />
        </template>

        <template #publishedAt-cell="{ row }">
          <div class="space-y-0.5 min-w-[95px]">
            <div class="text-[11px] font-bold tabular-nums text-ink-primary whitespace-nowrap leading-tight font-mono">
              {{ formatDateId(row.original.publishedAt) }}
            </div>
            <div
              class="text-[10px] font-medium text-ink-muted truncate max-w-[110px]"
              :title="row.original.sourcePortal"
            >
              {{ row.original.sourcePortal }}
            </div>
          </div>
        </template>

        <template #title-cell="{ row }">
          <div class="space-y-1 min-w-[160px] max-w-[260px] lg:max-w-[320px]">
            <div
              class="font-semibold text-xs text-ink-primary line-clamp-2 leading-snug"
              :title="row.original.title"
            >
              {{ row.original.title }}
            </div>
            <div class="flex items-center gap-1 text-[10px] text-ink-muted">
              <a
                v-if="isSafeHttpUrl(row.original.url)"
                :href="row.original.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-brand-primary hover:text-[#072B20] hover:underline truncate max-w-[200px] inline-flex items-center gap-0.5 font-medium"
              >
                <span class="truncate">{{ row.original.url }}</span>
                <UIcon name="i-lucide-external-link" class="w-2.5 h-2.5 shrink-0" />
              </a>
              <span v-else class="truncate max-w-[200px]">{{ row.original.url }}</span>
            </div>

            <!-- Lokus Kecamatan KTT & Catatan Kurator -->
            <div v-if="row.original.subdistrict || row.original.curatorNotes" class="flex flex-wrap items-center gap-1 pt-0.5">
              <span
                v-if="row.original.subdistrict"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-brand-tint text-brand-primary border border-brand-border"
              >
                <UIcon name="i-lucide-map-pin" class="w-2.5 h-2.5" />
                <span>Kec. {{ row.original.subdistrict }}</span>
              </span>
              <span
                v-if="row.original.curatorNotes"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#FEF6EE] text-ochre-ink border border-[#F7D3A6] truncate max-w-[200px]"
                :title="`Catatan Kurator: ${row.original.curatorNotes}`"
              >
                <UIcon name="i-lucide-message-square" class="w-2.5 h-2.5 text-ochre-ink shrink-0" />
                <span class="truncate">{{ row.original.curatorNotes }}</span>
              </span>
            </div>
          </div>
        </template>

        <template #kbli-cell="{ row }">
          <div v-if="row.original.kbliCategory" class="space-y-1 max-w-[135px]">
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border leading-tight truncate max-w-full"
              :class="getKbliClusterTheme(row.original.kbliCategory).pillClass"
              :title="getKbliShortCodeName(row.original.kbliCategory)"
            >
              {{ getKbliShortCodeName(row.original.kbliCategory) }}
            </span>
            <div>
              <UBadge
                v-if="row.original.kbliImpact"
                :color="getKbliImpactBadge(row.original.kbliImpact).color"
                variant="subtle"
                size="xs"
                :icon="getKbliImpactBadge(row.original.kbliImpact).icon"
                class="text-[10px] py-0 px-1.5"
              >
                {{ getKbliImpactBadge(row.original.kbliImpact).shortLabel }}
              </UBadge>
            </div>

            <!-- Sektor KBLI Sekunder jika ada -->
            <div
              v-if="row.original.secondaryKbliCategory"
              class="pt-0.5 border-t border-border-hairline flex items-center gap-1 flex-wrap"
            >
              <span
                class="inline-flex items-center px-1 py-0.2 rounded text-[11px] font-medium border"
                :class="getKbliClusterTheme(row.original.secondaryKbliCategory).pillClass"
              >
                {{ getKbliShortCodeName(row.original.secondaryKbliCategory) }}
              </span>
              <UBadge
                v-if="row.original.secondaryKbliImpact"
                :color="getKbliImpactBadge(row.original.secondaryKbliImpact).color"
                variant="subtle"
                size="xs"
                class="text-[11px] py-0 px-1"
              >
                {{ getKbliImpactBadge(row.original.secondaryKbliImpact).shortLabel }}
              </UBadge>
            </div>
          </div>
          <span v-else class="text-xs text-ink-muted/70">—</span>
        </template>

        <template #expenditure-cell="{ row }">
          <div v-if="row.original.expenditureComponent" class="space-y-1 max-w-[135px]">
            <div class="inline-flex items-center gap-1 text-[11px] font-bold text-ink-primary leading-tight truncate max-w-full">
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="getExpenditureColorTheme(row.original.expenditureComponent).dotClass"
                :style="{ backgroundColor: getExpenditureColorTheme(row.original.expenditureComponent).hex }"
              />
              <span class="truncate">{{ getExpenditureLabel(row.original.expenditureComponent, false) }}</span>
            </div>
            <div>
              <UBadge
                v-if="row.original.expenditureImpact"
                :color="getExpenditureImpactBadge(row.original.expenditureImpact).color"
                variant="subtle"
                size="xs"
                :icon="getExpenditureImpactBadge(row.original.expenditureImpact).icon"
                class="text-[10px] py-0 px-1.5"
              >
                {{ getExpenditureImpactBadge(row.original.expenditureImpact).shortLabel }}
              </UBadge>
            </div>

            <!-- Komponen Pengeluaran Sekunder jika ada -->
            <div
              v-if="row.original.secondaryExpenditureComponent"
              class="pt-0.5 border-t border-border-hairline flex items-center gap-1 flex-wrap"
            >
              <span class="text-[11px] font-medium text-ink-secondary truncate max-w-[80px]">
                {{ getExpenditureLabel(row.original.secondaryExpenditureComponent, false) }}
              </span>
              <UBadge
                v-if="row.original.secondaryExpenditureImpact"
                :color="getExpenditureImpactBadge(row.original.secondaryExpenditureImpact).color"
                variant="subtle"
                size="xs"
                class="text-[11px] py-0 px-1"
              >
                {{ getExpenditureImpactBadge(row.original.secondaryExpenditureImpact).shortLabel }}
              </UBadge>
            </div>
          </div>
          <span v-else class="text-xs text-ink-muted/70">—</span>
        </template>

        <template #period-cell="{ row }">
          <span class="inline-flex px-1.5 py-0.5 rounded bg-surface-subtle text-[10px] font-bold tabular-nums text-ink-primary whitespace-nowrap font-mono">
            {{ formatPeriodLabel(row.original.quarter, row.original.year) }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="getVerificationStatusBadge(row.original.verificationStatus).color"
            variant="subtle"
            size="xs"
            :icon="getVerificationStatusBadge(row.original.verificationStatus).icon"
            class="text-[10px] py-0.5 px-1.5 font-semibold whitespace-nowrap"
          >
            {{ getVerificationStatusBadge(row.original.verificationStatus).label }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1 contextual-actions">
            <UTooltip text="Edit Arsip">
              <UButton
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-pencil"
                aria-label="Edit artikel arsip"
                class="w-7 h-7 p-0 flex items-center justify-center cursor-pointer tactile-press"
                @click="emit('edit', row.original)"
              />
            </UTooltip>

            <UTooltip text="Hapus Permanen">
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="Hapus artikel arsip"
                class="w-7 h-7 p-0 flex items-center justify-center cursor-pointer tactile-press"
                @click="emit('delete', row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </div>

    <!-- Mobile & Tablet (< lg): Daftar Kartu Arsip Berita Responsif -->
    <div class="lg:hidden divide-y divide-[#141917]/10">
      <div
        v-if="!pending && items.length === 0"
        class="p-6 text-center text-xs text-ink-muted"
      >
        Tidak ada arsip berita yang sesuai dengan kriteria filter.
      </div>

      <div
        v-for="item in items"
        :key="`mob-art-${item.id}`"
        class="p-4 space-y-2.5 bg-white hover:bg-canvas transition-colors"
      >
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-start gap-2.5 min-w-0">
            <UCheckbox
              v-model="selectedMap[item.id]"
              :aria-label="`Pilih ${item.title}`"
              size="sm"
              class="mt-0.5 shrink-0"
            />
            <div class="min-w-0 space-y-1">
              <div class="font-bold text-xs sm:text-sm text-ink-primary leading-snug break-words">
                {{ item.title }}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted tabular-nums font-mono">
                <span class="font-semibold text-ink-secondary">{{ formatDateId(item.publishedAt) }}</span>
                <span>•</span>
                <span class="truncate max-w-[160px]">{{ item.sourcePortal }}</span>
                <span>•</span>
                <span class="px-1.5 py-0.2 rounded bg-surface-subtle font-bold text-ink-secondary">
                  {{ formatPeriodLabel(item.quarter, item.year) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <UButton
              size="xs"
              color="primary"
              variant="subtle"
              icon="i-lucide-pencil"
              aria-label="Edit artikel arsip"
              class="w-8 h-8 p-0 flex items-center justify-center cursor-pointer"
              @click="emit('edit', item)"
            />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              aria-label="Hapus artikel arsip"
              class="w-8 h-8 p-0 flex items-center justify-center cursor-pointer"
              @click="emit('delete', item)"
            />
          </div>
        </div>

        <div class="pl-6 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <UBadge
              :color="getVerificationStatusBadge(item.verificationStatus).color"
              variant="subtle"
              size="xs"
              :icon="getVerificationStatusBadge(item.verificationStatus).icon"
              class="text-[10px]"
            >
              {{ getVerificationStatusBadge(item.verificationStatus).label }}
            </UBadge>

            <span
              v-if="item.kbliCategory"
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border"
              :class="getKbliClusterTheme(item.kbliCategory).pillClass"
            >
              {{ getKbliShortCodeName(item.kbliCategory) }}
            </span>

            <span
              v-if="item.expenditureComponent"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-subtle border border-border-hairline text-[10px] font-semibold text-ink-primary"
            >
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :style="{ backgroundColor: getExpenditureColorTheme(item.expenditureComponent).hex }"
              />
              <span>{{ getExpenditureLabel(item.expenditureComponent, false) }}</span>
            </span>
          </div>

          <a
            v-if="isSafeHttpUrl(item.url)"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] font-semibold text-brand-primary hover:underline inline-flex items-center gap-0.5 shrink-0"
          >
            <span>Buka Sumber</span>
            <UIcon name="i-lucide-external-link" class="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
