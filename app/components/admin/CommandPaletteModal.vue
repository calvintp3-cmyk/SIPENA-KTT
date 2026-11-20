<!-- app/components/admin/CommandPaletteModal.vue -->
<script setup lang="ts">
import { UserRoleEnum } from '#shared/enums/pdrb';
import { formatDateId, toRomanQuarter } from '#shared/utils/period';
import type { AdminArticleItem, AdminArticlesResponse } from '~/types/sipena';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const router = useRouter();
const { user, pendingCount, llmFailedCount } = useAdminSession();
const { getVerificationStatusBadge } = usePdrbLabels();

const modalOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
});

interface PaletteRouteItem {
  to: string;
  label: string;
  section: string;
  icon: string;
  keywords: string;
  badge?: number;
}

const routeItems = computed<PaletteRouteItem[]>(() => {
  const items: PaletteRouteItem[] = [
    {
      to: '/admin',
      label: 'Dashboard & Gap Sektoral',
      section: 'Analitik & Rangkuman Ekonomi',
      icon: 'i-solar-widget-4-bold-duotone',
      keywords: 'dashboard gap radar heatmap kbli 17 sektor',
    },
    {
      to: '/admin/trends',
      label: 'Tren & Komparasi Antar-Waktu',
      section: 'Analitik & Rangkuman Ekonomi',
      icon: 'i-solar-graph-new-up-bold-duotone',
      keywords: 'tren komparasi grafik historis 8 triwulan',
    },
    {
      to: '/admin/synthesis',
      label: 'Sintesis Fenomena',
      section: 'Analitik & Rangkuman Ekonomi',
      icon: 'i-solar-magic-stick-3-bold-duotone',
      keywords: 'sintesis narasi fenomena rangkuman multi llm export docx',
    },
    {
      to: '/admin/review',
      label: 'Review Harian',
      section: 'Kurasi & Repositori Data',
      icon: 'i-solar-inbox-in-bold-duotone',
      keywords: 'review harian kurasi pending antrean verifikasi',
      badge: pendingCount.value > 0 ? pendingCount.value : undefined,
    },
    {
      to: '/admin/articles',
      label: 'Bank Data & Ekspor',
      section: 'Kurasi & Repositori Data',
      icon: 'i-solar-database-bold-duotone',
      keywords: 'bank data arsip excel xlsx csv ekspor cari berita',
    },
    {
      to: '/admin/portals',
      label: 'Direktori Portal Regional',
      section: 'Sumber Berita & Taksonomi',
      icon: 'i-solar-globe-bold-duotone',
      keywords: 'portal regional tribun kaltara koran benuanta radar tarakan',
    },
    {
      to: '/admin/keywords',
      label: 'Master Keyword Nasional',
      section: 'Sumber Berita & Taksonomi',
      icon: 'i-solar-tag-price-bold-duotone',
      keywords: 'keyword nasional sawit batubara transmisi',
    },
    {
      to: '/admin/taxonomy',
      label: 'Kamus & Taksonomi Sektor',
      section: 'Sumber Berita & Taksonomi',
      icon: 'i-solar-book-bookmark-bold-duotone',
      keywords: 'kamus taksonomi kbli 17 sektor 6 pengeluaran',
    },
    {
      to: '/admin/kbli',
      label: 'Struktur Lapangan Usaha KBLI',
      section: 'Sumber Berita & Taksonomi',
      icon: 'i-solar-layers-minimalistic-bold-duotone',
      keywords: 'kbli 2025 2020 2015 2009 generasi',
    },
    {
      to: '/admin/scrapers',
      label: 'Monitor Scraper & AI',
      section: 'Sistem & Tata Kelola',
      icon: 'i-solar-cpu-bolt-bold-duotone',
      keywords: 'scraper crawler token llm failed cron',
      badge: llmFailedCount.value > 0 ? llmFailedCount.value : undefined,
    },
    {
      to: '/linimasa',
      label: 'Buka Portal Linimasa Publik',
      section: 'Portal Eksternal',
      icon: 'i-solar-calendar-search-bold-duotone',
      keywords: 'portal publik linimasa eksplorasi',
    },
  ];

  if (user.value?.role === UserRoleEnum.ADMIN) {
    items.push({
      to: '/admin/users',
      label: 'Kelola Akses & Tim',
      section: 'Sistem & Tata Kelola',
      icon: 'i-solar-shield-user-bold-duotone',
      keywords: 'user staf operator admin whitelist role akun',
    });
  }

  return items;
});

const query = ref('');
const searchInputEl = ref<HTMLInputElement | null>(null);

const filteredRoutes = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return routeItems.value.slice(0, 7);
  return routeItems.value.filter(
    (item: typeof routeItems.value[number]) =>
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q),
  );
});

const searchingArticles = ref(false);
const matchedArticles = ref<AdminArticleItem[]>([]);
let articleSearchTimer: ReturnType<typeof setTimeout> | null = null;

watch(query, (val: string) => {
  const trimmed = val.trim();
  if (articleSearchTimer) clearTimeout(articleSearchTimer);
  if (trimmed.length < 2) {
    matchedArticles.value = [];
    searchingArticles.value = false;
    return;
  }
  searchingArticles.value = true;
  articleSearchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<AdminArticlesResponse>('/api/admin/articles', {
        query: {
          q: trimmed,
          limit: 5,
        },
      });
      matchedArticles.value = res.items ?? [];
    } catch {
      matchedArticles.value = [];
    } finally {
      searchingArticles.value = false;
    }
  }, 260);
});

watch(modalOpen, (isOpen: boolean) => {
  if (isOpen) {
    query.value = '';
    matchedArticles.value = [];
    selectedIndex.value = 0;
    nextTick(() => {
      searchInputEl.value?.focus();
    });
  }
});

onBeforeUnmount(() => {
  if (articleSearchTimer) clearTimeout(articleSearchTimer);
});

type PaletteEntry =
  | { type: 'route'; item: PaletteRouteItem }
  | { type: 'article'; item: AdminArticleItem }
  | { type: 'all_articles'; query: string };

const selectedIndex = ref(0);

const flatEntries = computed<PaletteEntry[]>(() => {
  const entries: PaletteEntry[] = [];
  for (const r of filteredRoutes.value) {
    entries.push({ type: 'route', item: r });
  }
  if (query.value.trim().length >= 2) {
    for (const a of matchedArticles.value) {
      entries.push({ type: 'article', item: a });
    }
    if (matchedArticles.value.length > 0) {
      entries.push({ type: 'all_articles', query: query.value.trim() });
    }
  }
  return entries;
});

watch([query, matchedArticles], () => {
  selectedIndex.value = 0;
});

function handleKeydown(e: KeyboardEvent) {
  const total = flatEntries.value.length;
  if (!total) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % total;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + total) % total;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    void executeSelected();
  }
}

async function goToRoute(to: string) {
  modalOpen.value = false;
  await router.push(to);
}

async function openArticleInReview(article: AdminArticleItem) {
  modalOpen.value = false;
  await router.push({
    path: '/admin/review',
    query: {
      status: article.verificationStatus,
      articleId: article.id,
    },
  });
}

async function executeSelected() {
  const target = flatEntries.value[selectedIndex.value];
  if (!target) return;
  if (target.type === 'route') {
    await goToRoute(target.item.to);
  } else if (target.type === 'article') {
    await openArticleInReview(target.item);
  } else if (target.type === 'all_articles') {
    await goToRoute(`/admin/articles?q=${encodeURIComponent(target.query)}`);
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Command Palette SIPENA KTT"
    description="Navigasi cepat menu workstation dan pencarian arsip fenomena ekonomi"
    :ui="{ content: 'sm:max-w-xl p-0 overflow-hidden rounded-2xl bg-white border border-[#141917]/[0.08]' }"
  >
    <template #content>
      <div class="bg-white flex flex-col max-h-[80vh]">
        <!-- Search Header -->
        <div class="px-4 py-3.5 border-b border-[#141917]/[0.08] flex items-center gap-3 focus-within:border-[#0B3D2E]">
          <UIcon name="i-solar-magnifer-line-duotone" class="w-4 h-4 text-[#0B3D2E] shrink-0" />
          <label for="admin-command-palette-input" class="sr-only">
            Cari halaman atau fenomena ekonomi
          </label>
          <input
            id="admin-command-palette-input"
            ref="searchInputEl"
            v-model="query"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            :aria-activedescendant="flatEntries[selectedIndex] ? `palette-opt-${selectedIndex}` : undefined"
            placeholder="Lompat ke menu atau ketik minimal 2 huruf untuk cari artikel..."
            class="w-full bg-transparent text-sm text-[#141917] placeholder:text-[#737B76] focus:outline-none"
            @keydown="handleKeydown"
          >
          <button
            type="button"
            class="min-h-8 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border border-[#141917]/10 bg-[#F6F5F1] text-[#4A524E] hover:text-[#141917] shrink-0 cursor-pointer font-mono"
            @click="modalOpen = false"
          >
            ESC
          </button>
        </div>

        <!-- Results Body -->
        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Hasil pencarian perintah dan artikel"
          class="flex-1 overflow-y-auto saas-scroll p-3 space-y-4"
        >
          <!-- Routes Section -->
          <div v-if="filteredRoutes.length > 0" class="space-y-1">
            <div class="px-2 py-1 text-[11px] font-semibold tracking-wide text-[#737B76] uppercase font-mono">
              Menu Workstation
            </div>
            <button
              v-for="(item, idx) in filteredRoutes"
              :id="`palette-opt-${idx}`"
              :key="item.to"
              role="option"
              :aria-selected="selectedIndex === idx"
              type="button"
              class="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-left border transition-colors cursor-pointer"
              :class="
                selectedIndex === idx
                  ? 'border-[#BBD8CB] bg-[#E3F0EA]/60 ring-1 ring-[#0B3D2E]/20'
                  : 'border-transparent hover:bg-[#E3F0EA]/50 hover:border-[#BBD8CB]'
              "
              @click="goToRoute(item.to)"
              @mouseenter="selectedIndex = idx"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] flex items-center justify-center shrink-0">
                  <UIcon :name="item.icon" class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-[#141917] truncate font-display">{{ item.label }}</div>
                  <div class="text-[11px] text-[#737B76] truncate">{{ item.section }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  v-if="item.badge"
                  class="px-2 py-0.5 rounded-full bg-[#FEF7E6] text-[#B45309] border border-[#F3D89C] text-[11px] font-bold font-mono tabular-nums"
                >
                  {{ item.badge }}
                </span>
                <UIcon name="i-lucide-corner-down-left" class="w-3.5 h-3.5 text-[#737B76]" />
              </div>
            </button>
          </div>

          <!-- Articles Section -->
          <div v-if="query.trim().length >= 2" class="space-y-1 pt-2 border-t border-[#141917]/[0.08]">
            <div class="px-2 py-1 flex items-center justify-between">
              <span class="text-[11px] font-semibold tracking-wide text-[#737B76] uppercase font-mono">
                Hasil Fenomena Ekonomi
              </span>
              <span v-if="searchingArticles" class="text-xs font-semibold text-[#0B3D2E] font-mono">
                Mencari...
              </span>
            </div>

            <div
              v-if="!searchingArticles && matchedArticles.length === 0"
              class="px-2 py-4 text-center text-xs text-[#737B76]"
            >
              Tidak ditemukan fenomena yang cocok dengan "{{ query.trim() }}".
            </div>

            <button
              v-for="(art, artIdx) in matchedArticles"
              :id="`palette-opt-${filteredRoutes.length + artIdx}`"
              :key="art.id"
              role="option"
              :aria-selected="selectedIndex === (filteredRoutes.length + artIdx)"
              type="button"
              class="w-full flex items-start justify-between gap-3 px-2.5 py-2.5 rounded-xl text-left border transition-colors cursor-pointer"
              :class="
                selectedIndex === (filteredRoutes.length + artIdx)
                  ? 'border-[#BBD8CB] bg-[#E3F0EA]/60 ring-1 ring-[#0B3D2E]/20'
                  : 'border-transparent hover:bg-[#E3F0EA]/45 hover:border-[#BBD8CB]'
              "
              @click="openArticleInReview(art)"
              @mouseenter="selectedIndex = filteredRoutes.length + artIdx"
            >
              <div class="min-w-0 space-y-1">
                <div class="text-xs font-semibold text-[#141917] line-clamp-1 font-display">
                  {{ art.title }}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-[#737B76] font-mono tabular-nums">
                  <span>{{ formatDateId(art.publishedAt) }}</span>
                  <span>&bull;</span>
                  <span>{{ art.sourcePortal }}</span>
                  <span>&bull;</span>
                  <span>TW {{ toRomanQuarter(art.quarter) }} {{ art.year }}</span>
                  <span v-if="art.kbliCategory" class="text-[#0B3D2E] font-bold">&bull; KBLI {{ art.kbliCategory }}</span>
                </div>
              </div>
              <UBadge
                :color="getVerificationStatusBadge(art.verificationStatus).color"
                variant="subtle"
                size="xs"
                class="shrink-0"
              >
                {{ getVerificationStatusBadge(art.verificationStatus).shortLabel }}
              </UBadge>
            </button>

            <button
              v-if="matchedArticles.length > 0"
              :id="`palette-opt-${filteredRoutes.length + matchedArticles.length}`"
              role="option"
              :aria-selected="selectedIndex === (filteredRoutes.length + matchedArticles.length)"
              type="button"
              class="w-full mt-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#0B3D2E] flex items-center justify-between cursor-pointer font-display transition-colors"
              :class="
                selectedIndex === (filteredRoutes.length + matchedArticles.length)
                  ? 'bg-[#E3F0EA] ring-1 ring-[#0B3D2E]/20'
                  : 'hover:bg-[#E3F0EA]'
              "
              @click="goToRoute(`/admin/articles?q=${encodeURIComponent(query.trim())}`)"
              @mouseenter="selectedIndex = filteredRoutes.length + matchedArticles.length"
            >
              <span>Buka semua hasil "{{ query.trim() }}" di Bank Data</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
