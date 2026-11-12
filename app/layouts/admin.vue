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
const isSidebarCollapsed = useState<boolean>('sipena:admin-sidebar-collapsed', () => false);

function toggleSidebarCollapsed() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  if (import.meta.client) {
    try {
      window.localStorage.setItem('sipena:sidebar-collapsed', isSidebarCollapsed.value ? '1' : '0');
    } catch {
      // Abaikan kegagalan storage pada private mode
    }
  }
}

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
      icon: 'i-solar-cpu-bolt-bold-duotone',
      badge: llmFailedCount.value > 0 ? llmFailedCount.value : undefined,
      badgeColor: 'error',
    },
  ];

  if (user.value?.role === UserRoleEnum.ADMIN) {
    systemItems.push({
      label: 'Kelola Akses & Tim',
      to: '/admin/users',
      icon: 'i-solar-shield-user-bold-duotone',
    });
  }

  return [
    {
      title: 'Analitik & Sintesis PDRB',
      items: [
        {
          label: 'Dashboard & Gap Sektoral',
          to: '/admin',
          icon: 'i-solar-widget-4-bold-duotone',
          exact: true,
        },
        {
          label: 'Tren & Komparasi',
          to: '/admin/trends',
          icon: 'i-solar-graph-new-up-bold-duotone',
        },
        {
          label: 'Sintesis Narasi PDRB',
          to: '/admin/synthesis',
          icon: 'i-solar-magic-stick-3-bold-duotone',
        },
      ],
    },
    {
      title: 'Kurasi & Repositori Data',
      items: [
        {
          label: 'Review Harian',
          to: '/admin/review',
          icon: 'i-solar-inbox-in-bold-duotone',
          badge: pendingCount.value > 0 ? pendingCount.value : undefined,
          badgeColor: 'warning',
        },
        {
          label: 'Bank Data & Ekspor',
          to: '/admin/articles',
          icon: 'i-solar-database-bold-duotone',
        },
      ],
    },
    {
      title: 'Sumber Berita & Taksonomi',
      items: [
        {
          label: 'Direktori Portal Regional',
          to: '/admin/portals',
          icon: 'i-solar-globe-bold-duotone',
        },
        {
          label: 'Master Keyword Nasional',
          to: '/admin/keywords',
          icon: 'i-solar-tag-price-bold-duotone',
        },
        {
          label: 'Kamus & Taksonomi PDRB',
          to: '/admin/taxonomy',
          icon: 'i-solar-book-bookmark-bold-duotone',
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

useHead({
  title: computed(() => `${currentBreadcrumb.value.page} — Workstation SIPENA KTT`),
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
  try {
    isSidebarCollapsed.value = window.localStorage.getItem('sipena:sidebar-collapsed') === '1';
  } catch {
    // Abaikan kegagalan storage pada private mode
  }
  void refreshQueueCounters();
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div
    class="min-h-screen canvas-aurora-light text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900"
  >
    <a
      href="#main-content"
      class="no-print sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-indigo-700 focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
    >
      Lewati ke konten utama
    </a>

    <!-- Collapsible Modern SaaS Sidebar Rail (Desktop) -->
    <aside
      class="no-print hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col bg-white/95 backdrop-blur-xl border-r border-slate-200/85 shadow-[4px_0_24px_-16px_rgba(15,23,42,0.08)] transition-[width] duration-200 ease-out"
      :class="isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'"
    >
      <!-- Edge Collapse Toggle Button -->
      <button
        type="button"
        :aria-label="isSidebarCollapsed ? 'Perluas sidebar navigasi' : 'Ciutkan sidebar navigasi'"
        :title="isSidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
        class="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-700 hover:border-indigo-300 shadow-xs absolute -right-3.5 top-4.5 z-40 transition-colors cursor-pointer"
        @click="() => { toggleSidebarCollapsed(); }"
      >
        <UIcon
          :name="isSidebarCollapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
          class="w-3.5 h-3.5"
        />
      </button>

      <!-- Sidebar Brand Header -->
      <div
        class="h-16 border-b border-slate-200/80 flex items-center shrink-0"
        :class="isSidebarCollapsed ? 'justify-center px-2' : 'px-4 gap-2.5'"
      >
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2.5 min-w-0 rounded-xl py-1"
          :class="isSidebarCollapsed ? 'justify-center' : ''"
        >
          <div
            class="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_12px_-2px_rgba(37,99,235,0.38)]"
          >
            <UIcon name="i-solar-chart-2-bold-duotone" class="w-5 h-5" />
          </div>
          <div v-if="!isSidebarCollapsed" class="min-w-0">
            <div class="font-extrabold text-sm tracking-tight text-slate-900 truncate">
              SIPENA
              <span class="text-indigo-700">KTT</span>
            </div>
            <div class="text-xs font-medium text-slate-600 truncate">
              Workstation Nerwilis
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Grouped Navigation -->
      <nav
        aria-label="Navigasi Admin"
        class="flex-1 py-4 space-y-5 overflow-y-auto overflow-x-hidden saas-scroll"
        :class="isSidebarCollapsed ? 'px-2.5' : 'px-3'"
      >
        <div v-for="group in navGroups" :key="group.title" class="space-y-1">
          <div
            v-if="!isSidebarCollapsed"
            class="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-600"
          >
            {{ group.title }}
          </div>
          <div v-else class="border-t border-slate-200/70 mx-2 my-1 first:hidden" aria-hidden="true" />

          <UTooltip
            v-for="item in group.items"
            :key="item.to"
            :text="item.label"
            :disabled="!isSidebarCollapsed"
            :content="{ side: 'right', sideOffset: 10 }"
          >
            <NuxtLink
              :to="item.to"
              :aria-current="isActiveRoute(item) ? 'page' : undefined"
              :aria-label="isSidebarCollapsed ? item.label : undefined"
              class="relative flex items-center rounded-xl text-[13px] min-h-9 transition-[color,background-color,border-color,box-shadow]"
              :class="[
                isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between gap-2 px-3 py-2',
                isActiveRoute(item)
                  ? 'active-nav-card text-indigo-950 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium border border-transparent',
              ]"
            >
              <span class="flex items-center min-w-0" :class="isSidebarCollapsed ? '' : 'gap-2.5'">
                <UIcon
                  :name="item.icon"
                  class="w-[18px] h-[18px] shrink-0 transition-colors"
                  :class="isActiveRoute(item) ? 'text-indigo-600' : 'text-slate-500'"
                />
                <span v-if="!isSidebarCollapsed" class="truncate">{{ item.label }}</span>
              </span>

              <span
                v-if="item.badge !== undefined && !isSidebarCollapsed"
                class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 border"
                :class="
                  item.badgeColor === 'error'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                "
              >
                {{ item.badge }}
              </span>

              <span
                v-else-if="item.badge !== undefined && isSidebarCollapsed"
                class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white"
                :class="item.badgeColor === 'error' ? 'bg-rose-500' : 'bg-amber-500'"
              />
            </NuxtLink>
          </UTooltip>
        </div>
      </nav>

      <!-- Sidebar Footer Profile & Portal Link -->
      <div class="p-3 border-t border-slate-200/80 space-y-2.5 bg-slate-50/75">
        <UTooltip
          text="Lihat Portal Publik"
          :disabled="!isSidebarCollapsed"
          :content="{ side: 'right', sideOffset: 10 }"
        >
          <NuxtLink
            to="/linimasa"
            aria-label="Lihat Portal Publik"
            class="w-full min-h-9 inline-flex items-center rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-semibold text-slate-700 hover:text-indigo-800 transition-colors shadow-2xs"
            :class="isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'"
          >
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-solar-calendar-search-bold-duotone" class="w-4 h-4 text-emerald-700 shrink-0" />
              <span v-if="!isSidebarCollapsed">Lihat Portal Publik</span>
            </span>
            <UIcon v-if="!isSidebarCollapsed" name="i-lucide-arrow-up-right" class="w-3.5 h-3.5 text-slate-500" />
          </NuxtLink>
        </UTooltip>

        <div
          v-if="!isSidebarCollapsed"
          class="rounded-xl bg-white border border-slate-200/90 p-2.5 flex items-center gap-2.5 shadow-2xs"
        >
          <div
            class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-900 truncate">
                {{ user?.name || 'Administrator' }}
              </span>
              <span
                v-if="user?.role === UserRoleEnum.ADMIN"
                class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-bold shrink-0"
              >
                Admin
              </span>
            </div>
            <div class="text-[11px] text-slate-600 truncate">
              {{ user?.email || 'Nerwilis KTT' }}
            </div>
          </div>
          <button
            type="button"
            aria-label="Keluar dari sesi admin"
            title="Keluar"
            :disabled="isLoggingOut"
            class="min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            @click="handleLogout"
          >
            <UIcon name="i-lucide-log-out" class="w-4 h-4" />
          </button>
        </div>

        <div v-else class="flex flex-col items-center gap-2">
          <UTooltip :text="`${user?.name || 'Administrator'} • Keluar`" :content="{ side: 'right', sideOffset: 10 }">
            <button
              type="button"
              aria-label="Keluar dari sesi admin"
              :disabled="isLoggingOut"
              class="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 inline-flex items-center justify-center transition-colors cursor-pointer"
              @click="handleLogout"
            >
              <UIcon name="i-lucide-log-out" class="w-4 h-4" />
            </button>
          </UTooltip>
        </div>
      </div>
    </aside>

    <!-- Mobile Navigation Slideover (includes Global Period Selector!) -->
    <USlideover
      v-model:open="mobileNavOpen"
      side="left"
      title="SIPENA KTT • Nerwilis"
      description="Menu workstation kurasi dan analisis PDRB"
      :ui="{ content: 'max-w-xs' }"
    >
      <template #body>
        <div class="space-y-5">
          <!-- Mobile Global Period Selector inside Drawer -->
          <div class="rounded-xl bg-slate-50 border border-slate-200/90 p-3 space-y-2.5">
            <label for="admin-mobile-drawer-year" class="block text-xs font-bold text-slate-800">
              Periode Analisis Global ({{ shortPeriodLabel }})
            </label>
            <USelect
              id="admin-mobile-drawer-year"
              :model-value="selectedYear"
              :items="yearOptions"
              value-key="value"
              label-key="label"
              leading-icon="i-solar-calendar-bold-duotone"
              size="sm"
              class="w-full"
              @update:model-value="(val: unknown) => { if (typeof val === 'number') setPeriod(val, selectedQuarter); }"
            />
            <div
              role="group"
              aria-label="Pilih Triwulan Global Mobile"
              class="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/90"
            >
              <button
                v-for="chip in quarterChips"
                :key="chip.value"
                type="button"
                :aria-pressed="selectedQuarter === chip.value"
                class="min-h-9 px-2 py-1 rounded-lg text-xs tabular-nums transition-colors cursor-pointer"
                :class="
                  selectedQuarter === chip.value
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                "
                @click="() => { setPeriod(selectedYear, chip.value); }"
              >
                {{ chip.shortLabel }}
              </button>
            </div>
          </div>

          <nav aria-label="Menu Mobile Admin" class="space-y-5">
            <div v-for="group in navGroups" :key="group.title" class="space-y-1">
              <div class="px-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-600">
                {{ group.title }}
              </div>
              <NuxtLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                :aria-current="isActiveRoute(item) ? 'page' : undefined"
                class="flex items-center justify-between gap-2 px-3 py-2.5 min-h-11 rounded-xl text-sm transition-colors"
                :class="
                  isActiveRoute(item)
                    ? 'active-nav-card text-indigo-950 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                "
              >
                <span class="flex items-center gap-2.5 min-w-0">
                  <UIcon
                    :name="item.icon"
                    class="w-[18px] h-[18px] shrink-0"
                    :class="isActiveRoute(item) ? 'text-indigo-600' : 'text-slate-500'"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </span>
                <span
                  v-if="item.badge !== undefined"
                  class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 border"
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
        </div>
      </template>

      <template #footer>
        <div class="w-full space-y-2.5">
          <div class="text-xs text-slate-600 px-1">
            Login sebagai <strong class="text-slate-900">{{ user?.name || 'Admin' }}</strong>
          </div>
          <UButton
            to="/linimasa"
            color="neutral"
            variant="outline"
            size="sm"
            block
            icon="i-solar-calendar-search-bold-duotone"
          >
            Lihat Portal Publik
          </UButton>
          <UButton
            color="error"
            variant="subtle"
            size="sm"
            block
            icon="i-lucide-log-out"
            :loading="isLoggingOut"
            @click="() => { void handleLogout(); }"
          >
            Keluar
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- Main Workspace Wrapper -->
    <div
      class="min-h-screen flex flex-col transition-[padding] duration-200 ease-out"
      :class="isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'"
    >
      <!-- Floating Frosted Glass Header Bar -->
      <header
        class="no-print sticky top-0 z-20 px-4 sm:px-6 lg:px-8 pt-2.5 pb-1.5 pointer-events-none space-y-1.5"
        style="view-transition-name: sipena-admin-header"
      >
        <div
          class="pointer-events-auto max-w-[1440px] mx-auto h-14 px-3.5 sm:px-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/85 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.1)] flex items-center justify-between gap-3"
        >
          <!-- Left: Hamburger + Breadcrumb -->
          <div class="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Buka menu navigasi admin"
              class="lg:hidden min-w-10 min-h-10 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              @click="() => { mobileNavOpen = true; }"
            >
              <UIcon name="i-solar-hamburger-menu-bold-duotone" class="w-5 h-5 text-indigo-600" />
            </button>

            <div class="hidden sm:flex items-center gap-2 text-xs min-w-0">
              <span class="text-slate-600 font-medium truncate">{{ currentBreadcrumb.section }}</span>
              <span class="text-slate-400">/</span>
              <span class="font-bold text-slate-900 truncate">{{ currentBreadcrumb.page }}</span>
            </div>
            <span class="sm:hidden font-bold text-xs text-slate-900 truncate">
              {{ currentBreadcrumb.page }}
            </span>

            <span
              class="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 tabular-nums shrink-0"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>{{ shortPeriodLabel }}</span>
            </span>
          </div>

          <!-- Right: Command Search + Shared Period Control + Review CTA -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Command Palette Trigger -->
            <button
              type="button"
              aria-label="Cari menu atau artikel dengan pintasan Command K"
              class="h-9 min-w-9 px-3 rounded-xl border border-slate-200/90 bg-slate-100/75 hover:bg-white hover:border-indigo-300 text-xs text-slate-700 hover:text-slate-900 inline-flex items-center gap-2 transition-colors cursor-pointer"
              @click="() => { commandPaletteOpen = true; }"
            >
              <UIcon name="i-solar-magnifer-line-duotone" class="w-4 h-4 text-slate-500" />
              <span class="hidden md:inline font-medium">Cari menu / artikel...</span>
              <kbd
                class="hidden sm:inline text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 leading-none"
              >
                ⌘K
              </kbd>
            </button>

            <!-- Shared Global Period Selector (Desktop >= md) -->
            <div class="hidden md:flex items-center gap-1.5">
              <div class="w-24">
                <USelect
                  id="admin-global-year"
                  :model-value="selectedYear"
                  :items="yearOptions"
                  value-key="value"
                  label-key="label"
                  leading-icon="i-solar-calendar-bold-duotone"
                  size="sm"
                  aria-label="Tahun Analisis PDRB"
                  class="w-full"
                  @update:model-value="(val: unknown) => { if (typeof val === 'number') setPeriod(val, selectedQuarter); }"
                />
              </div>

              <div
                role="group"
                aria-label="Pilih Triwulan Global"
                class="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/90"
              >
                <button
                  v-for="chip in quarterChips"
                  :key="chip.value"
                  type="button"
                  :aria-pressed="selectedQuarter === chip.value"
                  class="px-2.5 py-1 min-h-8 rounded-lg text-xs tabular-nums transition-[color,background-color,box-shadow] cursor-pointer"
                  :class="
                    selectedQuarter === chip.value
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                      : 'text-slate-700 hover:text-slate-950 font-medium'
                  "
                  @click="() => { setPeriod(selectedYear, chip.value); }"
                >
                  {{ chip.shortLabel }}
                </button>
              </div>
            </div>

            <!-- Cobalt-Emerald Gradient Review CTA -->
            <NuxtLink
              to="/admin/review"
              class="btn-primary-gradient h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <UIcon name="i-solar-inbox-in-bold-duotone" class="w-4 h-4 text-emerald-100" />
              <span class="hidden sm:inline">Buka Review</span>
              <span
                v-if="pendingCount > 0"
                class="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tabular-nums leading-none"
              >
                {{ pendingCount }}
              </span>
            </NuxtLink>
          </div>
        </div>

        <!-- Compact Mobile Period Switcher Sub-bar (< md) -->
        <div
          class="md:hidden pointer-events-auto max-w-[1440px] mx-auto px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-lg border border-slate-200/85 shadow-xs flex items-center justify-between gap-2"
        >
          <div class="w-24 shrink-0">
            <USelect
              id="admin-mobile-year"
              :model-value="selectedYear"
              :items="yearOptions"
              value-key="value"
              label-key="label"
              size="sm"
              aria-label="Tahun Analisis Mobile"
              class="w-full"
              @update:model-value="(val: unknown) => { if (typeof val === 'number') setPeriod(val, selectedQuarter); }"
            />
          </div>
          <div
            role="group"
            aria-label="Pilih Triwulan Mobile"
            class="flex-1 grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/80"
          >
            <button
              v-for="chip in quarterChips"
              :key="`m-${chip.value}`"
              type="button"
              :aria-pressed="selectedQuarter === chip.value"
              class="min-h-9 px-1.5 py-1 rounded-md text-xs tabular-nums transition-colors cursor-pointer"
              :class="
                selectedQuarter === chip.value
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs border border-indigo-200/70'
                  : 'text-slate-700 hover:text-slate-950 font-medium'
              "
              @click="() => { setPeriod(selectedYear, chip.value); }"
            >
              {{ chip.shortLabel }}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabindex="-1" class="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <slot />
      </main>
    </div>

    <!-- Command Palette Modal -->
    <AdminCommandPaletteModal v-model:open="commandPaletteOpen" />
  </div>
</template>
