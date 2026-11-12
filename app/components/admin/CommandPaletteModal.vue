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
      section: 'Analitik & Sintesis PDRB',
      icon: 'i-solar-widget-4-bold-duotone',
      keywords: 'dashboard gap radar heatmap kbli 17 sektor',
    },
    {
      to: '/admin/trends',
      label: 'Tren & Komparasi (q-to-q / y-on-y)',
      section: 'Analitik & Sintesis PDRB',
      icon: 'i-solar-graph-new-up-bold-duotone',
      keywords: 'tren komparasi qoq yoy grafik historis 8 triwulan',
    },
    {
      to: '/admin/synthesis',
      label: 'Sintesis Narasi PDRB',
      section: 'Analitik & Sintesis PDRB',
      icon: 'i-solar-magic-stick-3-bold-duotone',
      keywords: 'sintesis narasi brs gemini cerebras mistral nim groq openrouter multi llm export docx pdf',
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
      label: 'Kamus & Taksonomi PDRB',
      section: 'Sumber Berita & Taksonomi',
      icon: 'i-solar-book-bookmark-bold-duotone',
      keywords: 'kamus taksonomi kbli 17 sektor 6 pengeluaran ntb deflator',
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
      label: 'Lihat Portal Publik (Linimasa)',
      section: 'Portal Eksternal',
      icon: 'i-solar-calendar-search-bold-duotone',
      keywords: 'publik linimasa eksternal snapshot pdrb',
    },
    {
      to: '/',
      label: 'Beranda Utama SIPENA KTT',
      section: 'Portal Eksternal',
      icon: 'i-solar-home-smile-bold-duotone',
      keywords: 'beranda landing page utama publik',
    },
  ];

  if (user.value?.role === UserRoleEnum.ADMIN) {
    items.splice(items.length - 2, 0, {
      to: '/admin/users',
      label: 'Kelola Akses & Tim',
      section: 'Sistem & Tata Kelola',
      icon: 'i-solar-shield-user-bold-duotone',
      keywords: 'admin operator whitelist oauth akses user',
    });
  }

  return items;
});

const query = ref('');
const searchingArticles = ref(false);
const matchedArticles = ref<AdminArticleItem[]>([]);
const searchInputEl = ref<HTMLInputElement | null>(null);

const filteredRoutes = computed<PaletteRouteItem[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return routeItems.value;
  return routeItems.value.filter(
    (item: PaletteRouteItem) =>
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q),
  );
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(query, (nextVal: string) => {
  if (searchTimer) clearTimeout(searchTimer);
  const trimmed = nextVal.trim();
  if (trimmed.length < 2) {
    matchedArticles.value = [];
    searchingArticles.value = false;
    return;
  }

  searchingArticles.value = true;
  searchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<AdminArticlesResponse>('/api/admin/articles', {
        query: {
          q: trimmed,
          limit: 6,
          page: 1,
        },
        credentials: 'include',
      });
      matchedArticles.value = res.items;
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
    nextTick(() => {
      searchInputEl.value?.focus();
    });
  }
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

async function goToRoute(path: string) {
  modalOpen.value = false;
  await router.push(path);
}

async function openArticleInReview(article: AdminArticleItem) {
  modalOpen.value = false;
  await router.push({
    path: '/admin/review',
    query: { articleId: article.id, status: article.verificationStatus },
  });
}

async function handleSubmitEnter() {
  const firstRoute = filteredRoutes.value[0];
  if (firstRoute) {
    await goToRoute(firstRoute.to);
    return;
  }
  const firstArticle = matchedArticles.value[0];
  if (firstArticle) {
    await openArticleInReview(firstArticle);
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Command Palette SIPENA KTT"
    description="Navigasi cepat menu workstation dan pencarian arsip fenomena ekonomi"
    :ui="{ content: 'sm:max-w-xl p-0 overflow-hidden rounded-2xl' }"
  >
    <template #content>
      <div class="bg-white flex flex-col max-h-[80vh]">
        <!-- Search Header -->
        <div class="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3 focus-within:border-indigo-500">
          <UIcon name="i-solar-magnifer-line-duotone" class="w-4 h-4 text-indigo-600 shrink-0" />
          <label for="admin-command-palette-input" class="sr-only">
            Cari halaman atau fenomena ekonomi
          </label>
          <input
            id="admin-command-palette-input"
            ref="searchInputEl"
            v-model="query"
            type="search"
            placeholder="Lompat ke menu atau ketik minimal 2 huruf untuk cari artikel..."
            class="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            @keydown.enter.prevent="handleSubmitEnter"
          >
          <button
            type="button"
            class="min-h-8 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 shrink-0 cursor-pointer"
            @click="() => { modalOpen = false; }"
          >
            ESC
          </button>
        </div>

        <!-- Results Body -->
        <div class="flex-1 overflow-y-auto saas-scroll p-3 space-y-4">
          <!-- Routes Section -->
          <div v-if="filteredRoutes.length > 0" class="space-y-1">
            <div class="px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-600">
              Menu Workstation
            </div>
            <button
              v-for="item in filteredRoutes"
              :key="item.to"
              type="button"
              class="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-indigo-50/50 border border-transparent hover:border-indigo-200/70 transition-colors cursor-pointer"
              @click="() => { void goToRoute(item.to); }"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <UIcon :name="item.icon" class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-slate-900 truncate">{{ item.label }}</div>
                  <div class="text-[11px] text-slate-600 truncate">{{ item.section }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  v-if="item.badge"
                  class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold tabular-nums"
                >
                  {{ item.badge }}
                </span>
                <UIcon name="i-lucide-corner-down-left" class="w-3.5 h-3.5 text-slate-500" />
              </div>
            </button>
          </div>

          <!-- Articles Section -->
          <div v-if="query.trim().length >= 2" class="space-y-1 pt-2 border-t border-slate-100">
            <div class="px-2 py-1 flex items-center justify-between">
              <span class="text-[11px] font-semibold tracking-wide text-slate-600">
                Hasil Fenomena Ekonomi
              </span>
              <span v-if="searchingArticles" class="text-xs font-semibold text-indigo-600">
                Mencari...
              </span>
            </div>

            <div
              v-if="!searchingArticles && matchedArticles.length === 0"
              class="px-2 py-4 text-center text-xs text-slate-600"
            >
              Tidak ditemukan fenomena yang cocok dengan "{{ query.trim() }}".
            </div>

            <button
              v-for="art in matchedArticles"
              :key="art.id"
              type="button"
              class="w-full flex items-start justify-between gap-3 px-2.5 py-2.5 rounded-xl text-left hover:bg-indigo-50/45 border border-transparent hover:border-indigo-200/70 transition-colors cursor-pointer"
              @click="() => { void openArticleInReview(art); }"
            >
              <div class="min-w-0 space-y-1">
                <div class="text-xs font-semibold text-slate-900 line-clamp-1">
                  {{ art.title }}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 tabular-nums">
                  <span>{{ formatDateId(art.publishedAt) }}</span>
                  <span>•</span>
                  <span>{{ art.sourcePortal }}</span>
                  <span>•</span>
                  <span>TW {{ toRomanQuarter(art.quarter) }} {{ art.year }}</span>
                  <span v-if="art.kbliCategory" class="text-indigo-700 font-semibold">• KBLI {{ art.kbliCategory }}</span>
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
              type="button"
              class="w-full mt-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center justify-between cursor-pointer"
              @click="() => { void goToRoute(`/admin/articles?q=${encodeURIComponent(query.trim())}`); }"
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
