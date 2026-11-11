<!-- app/layouts/admin.vue -->
<script setup lang="ts">
import { UserRoleEnum } from '#shared/enums/pdrb';

const route = useRoute();
const { user, pendingCount, llmFailedCount, refreshQueueCounters, logout } = useAdminSession();
const {
  selectedYear,
  selectedQuarter,
  yearOptions,
  quarterChips,
  shortPeriodLabel,
  setPeriod,
} = useAdminPeriod();

const mobileNavOpen = ref(false);
const commandPaletteOpen = ref(false);
const isLoggingOut = ref(false);

interface NavItem {
  label: string;
  to: string;
  icon: string;
  exact?: boolean;
  badge?: number;
  badgeColor?: 'warning' | 'error';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups = computed<NavGroup[]>(() => {
  const systemItems: NavItem[] = [
    {
      label: 'Monitor Scraper & AI',
      to: '/admin/scrapers',
      icon: 'i-lucide-activity',
      badge: llmFailedCount.value > 0 ? llmFailedCount.value : undefined,
      badgeColor: 'error',
    },
  ];

  if (user.value?.role === UserRoleEnum.ADMIN) {
    systemItems.push({
      label: 'Kelola Akses & Tim',
      to: '/admin/users',
      icon: 'i-lucide-shield-check',
    });
  }

  return [
    {
      title: 'Analitik & Sintesis PDRB',
      items: [
        {
          label: 'Dashboard & Gap Sektoral',
          to: '/admin',
          icon: 'i-lucide-layout-grid',
          exact: true,
        },
        {
          label: 'Tren & Komparasi',
          to: '/admin/trends',
          icon: 'i-lucide-trending-up',
        },
        {
          label: 'Sintesis Narasi PDRB',
          to: '/admin/synthesis',
          icon: 'i-lucide-sparkles',
        },
      ],
    },
    {
      title: 'Kurasi & Repositori Data',
      items: [
        {
          label: 'Review Harian',
          to: '/admin/review',
          icon: 'i-lucide-inbox',
          badge: pendingCount.value > 0 ? pendingCount.value : undefined,
          badgeColor: 'warning',
        },
        {
          label: 'Bank Data & Ekspor',
          to: '/admin/articles',
          icon: 'i-lucide-database',
        },
      ],
    },
    {
      title: 'Sumber Berita & Taksonomi',
      items: [
        {
          label: 'Direktori Portal Regional',
          to: '/admin/portals',
          icon: 'i-lucide-radio',
        },
        {
          label: 'Master Keyword Nasional',
          to: '/admin/keywords',
          icon: 'i-lucide-tags',
        },
        {
          label: 'Kamus & Taksonomi PDRB',
          to: '/admin/taxonomy',
          icon: 'i-lucide-book-open',
        },
      ],
    },
    {
      title: 'Sistem & Tata Kelola',
      items: systemItems,
    },
  ];
});

function isActiveRoute(item: NavItem): boolean {
  if (item.exact) {
    return route.path === item.to;
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

const currentBreadcrumb = computed(() => {
  for (const group of navGroups.value) {
    for (const item of group.items) {
      if (isActiveRoute(item)) {
        return { section: group.title, page: item.label };
      }
    }
  }
  return { section: 'Workstation Nerwilis', page: 'SIPENA KTT' };
});

const userInitials = computed(() => {
  const name = user.value?.name?.trim();
  if (!name) return 'AD';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
});

async function handleLogout() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await logout();
  } finally {
    isLoggingOut.value = false;
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    commandPaletteOpen.value = !commandPaletteOpen.value;
  }
}

watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false;
  },
);

onMounted(() => {
  void refreshQueueCounters();
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="min-h-screen bg-[#EFF2F7] text-[#0B1220] font-sans selection:bg-teal-100 selection:text-teal-900">
    <!-- Fixed 264px Porcelain Sidebar (Desktop) -->
    <aside
      class="no-print hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col bg-[#F8FAFC] border-r border-[#DCE3EC]"
    >
      <!-- Sidebar Brand Header -->
      <div class="h-14 px-4 border-b border-[#DCE3EC] flex items-center gap-2.5 shrink-0">
        <NuxtLink to="/admin" class="flex items-center gap-2.5 min-w-0 rounded-lg">
          <div
            class="h-8 w-8 rounded-lg bg-gradient-to-b from-[#0F766E] to-[#0B5B55] text-white flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_3px_rgba(11,91,85,0.35)]"
          >
            <UIcon name="i-lucide-box" class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-sm tracking-tight text-[#0B1220] truncate">
              SIPENA <span class="text-teal-700">KTT</span>
            </div>
            <div class="font-mono text-[10px] text-[#5B677A] uppercase tracking-wider truncate">
              Workstation Nerwilis
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Grouped Navigation -->
      <nav aria-label="Navigasi Admin" class="flex-1 px-3 py-4 space-y-5 overflow-y-auto saas-scroll">
        <div v-for="group in navGroups" :key="group.title" class="space-y-1">
          <div class="px-2.5 pb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {{ group.title }}
          </div>

          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-all"
            :class="
              isActiveRoute(item)
                ? 'active-nav-card text-[#0B1220] font-semibold'
                : 'text-[#334155] hover:bg-white/70 hover:text-[#0B1220] font-medium border border-transparent'
            "
          >
            <span class="flex items-center gap-2.5 min-w-0">
              <UIcon
                :name="item.icon"
                class="w-4 h-4 shrink-0"
                :class="isActiveRoute(item) ? 'text-teal-700' : 'text-slate-400'"
              />
              <span class="truncate">{{ item.label }}</span>
            </span>

            <span
              v-if="item.badge !== undefined"
              class="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tabular-nums shrink-0 border"
              :class="
                item.badgeColor === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              "
            >
              {{ item.badge }}
            </span>
          </NuxtLink>
        </div>
      </nav>

      <!-- Sidebar Footer Profile & Portal Link -->
      <div class="p-3 border-t border-[#DCE3EC] space-y-2.5 bg-white/50">
        <NuxtLink
          to="/"
          class="w-full inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-[#334155] transition-colors shadow-[0_1px_2px_rgba(11,18,32,0.03)]"
        >
          <span class="inline-flex items-center gap-2">
            <UIcon name="i-lucide-globe" class="w-3.5 h-3.5 text-teal-700" />
            <span>Lihat Portal Publik</span>
          </span>
          <UIcon name="i-lucide-arrow-up-right" class="w-3.5 h-3.5 text-slate-400" />
        </NuxtLink>

        <div class="rounded-lg bg-white border border-[#DCE3EC] p-2.5 flex items-center gap-2.5">
          <div
            class="h-8 w-8 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-mono font-bold text-xs flex items-center justify-center shrink-0"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-[#0B1220] truncate">
                {{ user?.name || 'Administrator' }}
              </span>
              <span
                v-if="user?.role === UserRoleEnum.ADMIN"
                class="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[9px] font-bold uppercase shrink-0"
              >
                Admin
              </span>
            </div>
            <div class="text-[11px] text-[#5B677A] truncate">
              {{ user?.email || 'Nerwilis KTT' }}
            </div>
          </div>
          <button
            type="button"
            aria-label="Keluar dari sesi admin"
            title="Keluar"
            :disabled="isLoggingOut"
            class="min-w-7 min-h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors shrink-0"
            @click="handleLogout"
          >
            <UIcon name="i-lucide-log-out" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Navigation Slideover -->
    <USlideover
      v-model:open="mobileNavOpen"
      side="left"
      title="SIPENA KTT • Nerwilis"
      description="Menu workstation kurasi dan analisis PDRB"
      :ui="{ content: 'max-w-xs' }"
    >
      <template #body>
        <nav aria-label="Menu Mobile Admin" class="space-y-5">
          <div v-for="group in navGroups" :key="group.title" class="space-y-1">
            <div class="px-2 pb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {{ group.title }}
            </div>
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors"
              :class="
                isActiveRoute(item)
                  ? 'bg-teal-50 text-teal-900 font-semibold ring-1 ring-teal-200'
                  : 'text-slate-700 hover:bg-slate-100 font-medium'
              "
            >
              <span class="flex items-center gap-2.5 min-w-0">
                <UIcon
                  :name="item.icon"
                  class="w-4 h-4 shrink-0"
                  :class="isActiveRoute(item) ? 'text-teal-700' : 'text-slate-400'"
                />
                <span class="truncate">{{ item.label }}</span>
              </span>
              <span
                v-if="item.badge !== undefined"
                class="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tabular-nums shrink-0 border"
                :class="
                  item.badgeColor === 'error'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                "
              >
                {{ item.badge }}
              </span>
            </NuxtLink>
          </div>
        </nav>
      </template>

      <template #footer>
        <div class="w-full space-y-2.5">
          <div class="text-xs text-slate-600 px-1">
            Login sebagai <strong class="text-[#0B1220]">{{ user?.name || 'Admin' }}</strong>
          </div>
          <UButton to="/" color="neutral" variant="outline" size="sm" block icon="i-lucide-globe">
            Lihat Portal Publik
          </UButton>
          <UButton
            color="error"
            variant="subtle"
            size="sm"
            block
            icon="i-lucide-log-out"
            :loading="isLoggingOut"
            @click="handleLogout"
          >
            Keluar
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- Main Workspace Wrapper -->
    <div class="lg:pl-64 min-h-screen flex flex-col">
      <!-- Single-Line Frosted Top Utility Bar -->
      <header
        class="no-print sticky top-0 z-20 h-14 bg-white/85 backdrop-blur-xl border-b border-[#DCE3EC] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3"
      >
        <!-- Left: Hamburger + Breadcrumb -->
        <div class="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            aria-label="Buka menu navigasi admin"
            class="lg:hidden min-w-8 min-h-8 inline-flex items-center justify-center rounded-lg border border-[#DCE3EC] bg-white text-slate-700 hover:bg-slate-50"
            @click="mobileNavOpen = true"
          >
            <UIcon name="i-lucide-menu" class="w-4 h-4" />
          </button>

          <div class="hidden sm:flex items-center gap-2 text-xs min-w-0">
            <span class="text-[#5B677A] font-medium truncate">{{ currentBreadcrumb.section }}</span>
            <span class="text-slate-300">/</span>
            <span class="font-semibold text-[#0B1220] truncate">{{ currentBreadcrumb.page }}</span>
          </div>
          <span class="sm:hidden font-bold text-xs text-[#0B1220] truncate">
            {{ currentBreadcrumb.page }}
          </span>

          <span
            class="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#DCE3EC] font-mono text-[10px] font-semibold text-teal-800 tabular-nums shrink-0"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-teal-600" />
            <span>{{ shortPeriodLabel }}</span>
          </span>
        </div>

        <!-- Right: Command Search + Shared Period Control + Review CTA -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Command Palette Trigger -->
          <button
            type="button"
            class="h-8 px-2.5 rounded-lg border border-[#DCE3EC] bg-[#F8FAFC] hover:bg-white text-xs text-[#5B677A] hover:text-[#0B1220] inline-flex items-center gap-2 transition-colors"
            @click="commandPaletteOpen = true"
          >
            <UIcon name="i-lucide-search" class="w-3.5 h-3.5 text-slate-400" />
            <span class="hidden md:inline">Cari menu / artikel...</span>
            <kbd
              class="hidden sm:inline font-mono text-[10px] px-1 py-0.5 rounded bg-white border border-slate-200 text-slate-500 leading-none"
            >
              ⌘K
            </kbd>
          </button>

          <!-- Shared Global Period Selector -->
          <div class="hidden md:flex items-center gap-1.5">
            <div class="relative">
              <label for="admin-global-year" class="sr-only">Tahun Analisis PDRB</label>
              <select
                id="admin-global-year"
                :value="selectedYear"
                class="h-8 pl-2 pr-6 bg-white text-xs font-mono font-semibold text-[#0B1220] border border-[#DCE3EC] rounded-lg hover:border-slate-300 appearance-none tabular-nums cursor-pointer"
                @change="setPeriod(Number(($event.target as HTMLSelectElement).value), selectedQuarter)"
              >
                <option v-for="opt in yearOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <UIcon
                name="i-lucide-chevron-down"
                class="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>

            <div
              role="group"
              aria-label="Pilih Triwulan Global"
              class="inline-flex p-0.5 bg-slate-200/70 rounded-lg border border-slate-200/80"
            >
              <button
                v-for="chip in quarterChips"
                :key="chip.value"
                type="button"
                :aria-pressed="selectedQuarter === chip.value"
                class="px-2 py-1 rounded-md font-mono text-[10px] tabular-nums transition-all"
                :class="
                  selectedQuarter === chip.value
                    ? 'bg-white text-teal-800 font-bold shadow-[0_1px_2px_rgba(11,18,32,0.08)]'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                "
                @click="setPeriod(selectedYear, chip.value)"
              >
                {{ chip.shortLabel }}
              </button>
            </div>
          </div>

          <!-- High-Contrast Obsidian Review CTA -->
          <NuxtLink
            to="/admin/review"
            class="obsidian-button h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UIcon name="i-lucide-inbox" class="w-3.5 h-3.5 text-teal-300" />
            <span class="hidden sm:inline">Buka Review</span>
            <span
              v-if="pendingCount > 0"
              class="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px] font-bold tabular-nums leading-none"
            >
              {{ pendingCount }}
            </span>
          </NuxtLink>
        </div>
      </header>

      <main class="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </main>
    </div>

    <!-- Command Palette Modal -->
    <AdminCommandPaletteModal v-model:open="commandPaletteOpen" />
  </div>
</template>
