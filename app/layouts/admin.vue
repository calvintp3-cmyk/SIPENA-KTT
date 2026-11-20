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
const sidebarCookie = useCookie<boolean>('sipena_sidebar_collapsed', {
  default: () => false,
  sameSite: 'lax',
});
const isSidebarCollapsed = useState<boolean>(
  'sipena:admin-sidebar-collapsed',
  () => sidebarCookie.value ?? false,
);
const { shortcutKey, shortcutTitle } = usePlatformShortcut();

watch(isSidebarCollapsed, (val: boolean) => {
  sidebarCookie.value = val;
});

function toggleSidebarCollapsed() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

const quarterSegmentItems = computed(() =>
  quarterChips.map((c) => ({
    value: c.value,
    label: c.shortLabel,
  })),
);

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
      title: 'Analitik & Rangkuman Ekonomi',
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
          label: 'Sintesis Fenomena',
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
          label: 'Kamus & Taksonomi Sektor',
          to: '/admin/taxonomy',
          icon: 'i-solar-book-bookmark-bold-duotone',
        },
        {
          label: 'Struktur Lapangan Usaha',
          to: '/admin/kbli',
          icon: 'i-solar-layers-minimalistic-bold-duotone',
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
  return route.path.startsWith(item.to);
}

const isPeriodAgnosticRoute = computed(() => {
  const p = route.path;
  return (
    p.startsWith('/admin/users') ||
    p.startsWith('/admin/scrapers') ||
    p.startsWith('/admin/portals') ||
    p.startsWith('/admin/keywords') ||
    p.startsWith('/admin/taxonomy') ||
    p.startsWith('/admin/kbli')
  );
});

const currentBreadcrumb = computed(() => {
  for (const group of navGroups.value) {
    for (const item of group.items) {
      if (isActiveRoute(item)) {
        return {
          section: group.title,
          page: item.label,
        };
      }
    }
  }
  return {
    section: 'Workstation Nerwilis',
    page: 'Konsol Administrasi',
  };
});

const userInitials = computed(() => {
  const name = user.value?.name?.trim();
  if (!name) return 'AD';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? 'AD';
  }
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
});

async function handleLogout() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await logout();
    await navigateTo('/login', { replace: true });
  } finally {
    isLoggingOut.value = false;
  }
}

let queuePollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (sidebarCookie.value !== undefined) {
    isSidebarCollapsed.value = Boolean(sidebarCookie.value);
  }

  void refreshQueueCounters();
  queuePollTimer = setInterval(() => {
    void refreshQueueCounters();
  }, 45000);
});

onBeforeUnmount(() => {
  if (queuePollTimer) clearInterval(queuePollTimer);
});

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  },
);

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    commandPaletteOpen.value = true;
  }
}

useHead({
  htmlAttrs: {
    class: 'h-full overflow-hidden',
  },
  bodyAttrs: {
    class: 'h-full overflow-hidden',
  },
});

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div
    class="h-screen max-h-screen overflow-hidden bg-[#F6F5F1] text-[#141917] font-sans selection:bg-[#E3F0EA] selection:text-[#0B3D2E] flex flex-col lg:flex-row p-0 lg:p-4 xl:p-5 2xl:p-6 lg:gap-4 xl:gap-5 print:h-auto print:overflow-visible print:p-0"
  >
    <a
      href="#main-content"
      class="no-print sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#0B3D2E] focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
    >
      Lewati ke konten utama
    </a>

    <!-- Architectural Limestone Rail Sidebar (Desktop) -->
    <aside
      class="no-print hidden lg:flex lg:flex-col shrink-0 h-full frosted-sidebar border border-[#141917]/[0.08] rounded-2xl shadow-xs transition-[width] duration-200 ease-out relative"
      :class="isSidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <!-- Edge Collapse Toggle Button -->
      <button
        type="button"
        :aria-label="isSidebarCollapsed ? 'Perluas sidebar navigasi' : 'Ciutkan sidebar navigasi'"
        :title="isSidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
        class="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-[#141917]/10 text-[#4A524E] hover:text-[#0B3D2E] hover:border-[#0B3D2E]/40 shadow-xs absolute -right-3.5 top-5 z-40 transition-colors cursor-pointer tactile-press"
        @click="toggleSidebarCollapsed"
      >
        <UIcon
          :name="isSidebarCollapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
          class="w-3.5 h-3.5"
        />
      </button>

      <!-- Sidebar Brand Header -->
      <div
        class="pt-3.5 pb-2 shrink-0"
        :class="isSidebarCollapsed ? 'px-2.5' : 'px-3'"
      >
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2.5 min-w-0 rounded-xl bg-white border border-[#141917]/[0.08] p-2.5 shadow-2xs"
          :class="isSidebarCollapsed ? 'justify-center p-2' : ''"
        >
          <div
            class="h-8 w-8 rounded-lg bg-[#0B3D2E] text-white flex items-center justify-center shrink-0 font-display font-extrabold text-xs tracking-tight"
          >
            SK
          </div>
          <div v-if="!isSidebarCollapsed" class="min-w-0">
            <div class="font-display font-extrabold text-[13.5px] tracking-tight text-[#141917] truncate flex items-center gap-1.5">
              <span>SIPENA</span>
              <span class="text-[#0B3D2E]">KTT</span>
              <span class="w-1.5 h-1.5 rounded-full bg-[#0B3D2E]" title="Konsol Aktif • Nerwilis Online" />
            </div>
            <div class="text-[10.5px] font-medium text-[#737B76] truncate">
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
            class="px-2.5 pb-1 text-[10px] font-bold tracking-wider text-[#737B76] uppercase font-display"
          >
            {{ group.title }}
          </div>
          <div v-else class="border-t border-[#141917]/10 mx-2 my-1 first:hidden" aria-hidden="true" />

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
              class="relative flex items-center rounded-xl text-[13px] min-h-9 transition-all"
              :class="[
                isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between gap-2 px-3 py-2',
                isActiveRoute(item)
                  ? 'bg-[#0B3D2E] text-white font-semibold shadow-xs'
                  : 'text-[#4A524E] hover:bg-white hover:text-[#141917] font-medium',
              ]"
            >
              <span class="flex items-center min-w-0" :class="isSidebarCollapsed ? '' : 'gap-2.5'">
                <UIcon
                  :name="item.icon"
                  class="w-[18px] h-[18px] shrink-0 transition-colors"
                  :class="isActiveRoute(item) ? 'text-white' : 'text-[#737B76]'"
                />
                <span v-if="!isSidebarCollapsed" class="truncate">{{ item.label }}</span>
              </span>

              <span
                v-if="item.badge !== undefined && !isSidebarCollapsed"
                class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 border"
                :class="
                  item.badgeColor === 'error'
                    ? 'bg-[#FBECE8] text-[#C8553D] border-[#F8D2C9]'
                    : 'bg-[#FEF7E6] text-[#B45309] border-[#F3D89C]'
                "
              >
                {{ item.badge }}
              </span>

              <span
                v-else-if="item.badge !== undefined && isSidebarCollapsed"
                class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white"
                :class="item.badgeColor === 'error' ? 'bg-[#C8553D]' : 'bg-[#B45309]'"
              />
            </NuxtLink>
          </UTooltip>
        </div>
      </nav>

      <!-- Sidebar Footer Profile & Portal Link -->
      <div class="p-3 border-t border-[#141917]/[0.08] space-y-2.5 bg-[#ECEAE2] rounded-b-2xl shrink-0">
        <UTooltip
          text="Lihat Portal Publik"
          :disabled="!isSidebarCollapsed"
          :content="{ side: 'right', sideOffset: 10 }"
        >
          <NuxtLink
            to="/linimasa"
            aria-label="Lihat Portal Publik"
            class="w-full min-h-9 inline-flex items-center rounded-xl border border-[#141917]/10 bg-white hover:border-[#0B3D2E] hover:bg-[#E3F0EA]/40 text-xs font-semibold text-[#141917] hover:text-[#0B3D2E] transition-colors shadow-2xs"
            :class="isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'"
          >
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-solar-calendar-search-bold-duotone" class="w-4 h-4 text-[#0B3D2E] shrink-0" />
              <span v-if="!isSidebarCollapsed">Portal Publik</span>
            </span>
            <UIcon v-if="!isSidebarCollapsed" name="i-lucide-arrow-up-right" class="w-3.5 h-3.5 text-[#737B76]" />
          </NuxtLink>
        </UTooltip>

        <div
          v-if="!isSidebarCollapsed"
          class="rounded-xl bg-white border border-[#141917]/[0.08] p-2.5 flex items-center gap-2.5 shadow-2xs"
        >
          <div
            class="h-8 w-8 rounded-full bg-[#0B3D2E] text-white font-bold text-xs flex items-center justify-center shrink-0 font-mono shadow-2xs"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-[#141917] truncate">
                {{ user?.name || 'Administrator' }}
              </span>
              <span
                v-if="user?.role === UserRoleEnum.ADMIN"
                class="px-1.5 py-0.5 rounded-full bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] text-[10px] font-bold shrink-0 font-mono"
              >
                Admin
              </span>
            </div>
            <div class="text-[11px] text-[#737B76] truncate">
              {{ user?.email || 'Nerwilis KTT' }}
            </div>
          </div>
          <button
            type="button"
            aria-label="Keluar dari sesi admin"
            title="Keluar"
            :disabled="isLoggingOut"
            class="min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg text-[#737B76] hover:text-[#C8553D] hover:bg-[#FBECE8] transition-colors shrink-0 cursor-pointer"
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
              class="w-10 h-10 rounded-xl bg-white border border-[#141917]/10 hover:border-[#C8553D] hover:bg-[#FBECE8] text-[#737B76] hover:text-[#C8553D] inline-flex items-center justify-center transition-colors cursor-pointer"
              @click="handleLogout"
            >
              <UIcon name="i-lucide-log-out" class="w-4 h-4" />
            </button>
          </UTooltip>
        </div>
      </div>
    </aside>

    <!-- Mobile Navigation Slideover -->
    <USlideover
      v-model:open="mobileNavOpen"
      side="left"
      title="SIPENA KTT • Nerwilis"
      description="Menu workstation kurasi dan analisis PDRB"
      :ui="{ content: 'max-w-xs bg-[#F6F5F1]' }"
    >
      <template #body>
        <div class="space-y-5">
          <!-- Mobile Global Period Selector inside Drawer -->
          <div class="rounded-xl bg-white border border-[#141917]/[0.08] p-3 space-y-2.5">
            <label for="admin-mobile-drawer-year" class="block text-xs font-bold text-[#141917]">
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
              class="w-full font-mono"
              @update:model-value="(val: unknown) => { if (typeof val === 'number') setPeriod(val, selectedQuarter); }"
            />
            <AppSegmentedControl
              :model-value="selectedQuarter"
              :items="quarterSegmentItems"
              aria-label="Pilih Triwulan Global Mobile"
              variant="brand"
              size="xs"
              block
              @update:model-value="(val: any) => setPeriod(selectedYear, val as any)"
            />
          </div>

          <nav aria-label="Menu Mobile Admin" class="space-y-5">
            <div v-for="group in navGroups" :key="group.title" class="space-y-1">
              <div class="px-2 pb-1 text-[11px] font-semibold tracking-wide text-[#737B76] font-display">
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
                    ? 'bg-[#0B3D2E] text-white font-semibold shadow-xs'
                    : 'text-[#4A524E] hover:bg-white font-medium'
                "
              >
                <span class="flex items-center gap-2.5 min-w-0">
                  <UIcon
                    :name="item.icon"
                    class="w-[18px] h-[18px] shrink-0"
                    :class="isActiveRoute(item) ? 'text-white' : 'text-[#737B76]'"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </span>
                <span
                  v-if="item.badge !== undefined"
                  class="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 border font-mono"
                  :class="
                    item.badgeColor === 'error'
                      ? 'bg-[#FBECE8] text-[#C8553D] border-[#F8D2C9]'
                      : 'bg-[#FEF7E6] text-[#B45309] border-[#F3D89C]'
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
          <div class="text-xs text-[#4A524E] px-1">
            Login sebagai <strong class="text-[#141917]">{{ user?.name || 'Admin' }}</strong>
          </div>
          <UButton
            to="/linimasa"
            color="neutral"
            variant="outline"
            size="sm"
            block
            icon="i-solar-calendar-search-bold-duotone"
          >
            Portal Publik
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

    <!-- Main Floating Workspace Canvas -->
    <div
      class="flex-1 min-w-0 h-full flex flex-col bg-white border-0 lg:border lg:border-border-hairline rounded-none lg:rounded-2xl lg:shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none print:h-auto print:overflow-visible transition-all duration-200 ease-out"
    >
      <!-- Docked Top Header (Pinned inside Content Card) -->
      <header
        class="no-print shrink-0 z-20 w-full frosted-header !bg-white border-b border-border-hairline"
        style="view-transition-name: sipena-admin-header"
      >
        <div
          class="h-14 px-4 sm:px-6 lg:px-6 flex items-center justify-between gap-3"
        >
            <!-- Left: Hamburger + Breadcrumb -->
            <div class="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                aria-label="Buka menu navigasi admin"
                class="lg:hidden min-w-10 min-h-10 inline-flex items-center justify-center rounded-xl border border-[#141917]/10 bg-white text-[#141917] hover:bg-[#ECEAE2] cursor-pointer tactile-press"
                @click="mobileNavOpen = true"
              >
                <UIcon name="i-solar-hamburger-menu-bold-duotone" class="w-5 h-5 text-[#0B3D2E]" />
              </button>

              <div class="hidden sm:flex items-center gap-2 text-xs min-w-0 font-display">
                <span class="text-[#737B76] font-medium truncate">{{ currentBreadcrumb.section }}</span>
                <span class="text-[#141917]/20">/</span>
                <span class="font-bold text-[#141917] truncate">{{ currentBreadcrumb.page }}</span>
              </div>
              <span class="sm:hidden font-bold text-xs text-[#141917] truncate font-display">
                {{ currentBreadcrumb.page }}
              </span>

              <span
                v-if="!isPeriodAgnosticRoute"
                class="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-tint border border-brand-border text-xs font-semibold text-brand-primary tabular-nums shrink-0 font-mono"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span>{{ shortPeriodLabel }}</span>
              </span>
              <span
                v-else
                class="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-subtle border border-border-hairline text-xs font-semibold text-ink-secondary shrink-0 font-mono"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-ink-muted" />
                <span>Lintas Periode</span>
              </span>
            </div>

            <!-- Right: Command Search + Shared Period Control + Review CTA -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Command Palette Trigger -->
              <button
                type="button"
                aria-label="Cari menu atau artikel dengan pintasan Command K"
                class="h-9 min-w-9 px-3 rounded-xl border border-border-hairline bg-surface-subtle hover:bg-white hover:border-brand-primary/40 text-xs text-ink-secondary hover:text-ink-primary inline-flex items-center gap-2 transition-colors cursor-pointer tactile-press"
                @click="commandPaletteOpen = true"
              >
                <UIcon name="i-solar-magnifer-line-duotone" class="w-4 h-4 text-ink-muted" />
                <span class="hidden md:inline font-medium">Cari menu / artikel...</span>
                <kbd
                  :title="shortcutTitle"
                  class="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white border border-border-hairline text-ink-secondary leading-none font-mono"
                >
                  {{ shortcutKey }}
                </kbd>
              </button>

              <!-- Shared Global Period Selector (Desktop >= md) -->
              <div v-if="isPeriodAgnosticRoute" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-hairline text-xs font-semibold text-ink-secondary" title="Halaman master konfigurasi berlaku lintas periode">
                <UIcon name="i-solar-settings-minimalistic-bold-duotone" class="w-4 h-4 text-brand-primary" />
                <span>Pengaturan Global</span>
              </div>
              <div v-else class="hidden md:flex items-center gap-1.5">
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
                    class="w-full font-mono"
                    @update:model-value="(val: unknown) => { if (typeof val === 'number') setPeriod(val, selectedQuarter); }"
                  />
                </div>

                <AppSegmentedControl
                  :model-value="selectedQuarter"
                  :items="quarterSegmentItems"
                  aria-label="Pilih Triwulan Global"
                  variant="brand"
                  size="xs"
                  @update:model-value="(val: any) => setPeriod(selectedYear, val as any)"
                />
              </div>

              <!-- Review CTA -->
              <NuxtLink
                to="/admin/review"
                class="obs-btn-primary h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs tactile-press"
              >
                <UIcon name="i-solar-inbox-in-bold-duotone" class="w-4 h-4 text-emerald-200" />
                <span class="hidden sm:inline">Review</span>
                <span
                  v-if="pendingCount > 0"
                  class="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tabular-nums leading-none font-mono"
                >
                  {{ pendingCount }}
                </span>
              </NuxtLink>
            </div>
          </div>

          <!-- Compact Mobile Period Switcher Sub-bar (< md) -->
          <div
            class="md:hidden border-t border-[#141917]/[0.08] bg-[#F6F5F1] px-4 py-1.5 flex items-center justify-between gap-2"
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
                class="w-full font-mono"
                @update:model-value="(val: unknown) => { if (typeof val === 'number') setPeriod(val, selectedQuarter); }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <AppSegmentedControl
                :model-value="selectedQuarter"
                :items="quarterSegmentItems"
                aria-label="Pilih Triwulan Mobile"
                variant="brand"
                size="xs"
                block
                compact
                @update:model-value="(val: any) => setPeriod(selectedYear, val as any)"
              />
            </div>
          </div>
        </header>

      <!-- Scrollable Main Content Area (ONLY this container scrolls!) -->
      <main
        id="main-content"
        tabindex="-1"
        class="flex-1 min-h-0 w-full overflow-y-auto saas-scroll print:overflow-visible print:h-auto focus:outline-none"
      >
        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <slot />
        </div>
      </main>
    </div>

    <!-- Command Palette Modal -->
    <AdminCommandPaletteModal v-model:open="commandPaletteOpen" />
  </div>
</template>
