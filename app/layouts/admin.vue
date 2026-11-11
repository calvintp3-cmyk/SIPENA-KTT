<!-- app/layouts/admin.vue -->
<script setup lang="ts">
import { UserRoleEnum } from '#shared/enums/pdrb';

const route = useRoute();
const { user, pendingCount, llmFailedCount, refreshQueueCounters, logout } = useAdminSession();

const mobileNavOpen = ref(false);
const isLoggingOut = ref(false);

interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: number;
  badgeColor?: 'warning' | 'error';
}

const navItems = computed<NavItem[]>(() => {
  const baseItems: NavItem[] = [
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
    {
      label: 'Master Keyword Nasional',
      to: '/admin/keywords',
      icon: 'i-lucide-tags',
    },
    {
      label: 'Monitor Scraper & AI',
      to: '/admin/scrapers',
      icon: 'i-lucide-activity',
      badge: llmFailedCount.value > 0 ? llmFailedCount.value : undefined,
      badgeColor: 'error',
    },
  ];

  if (user.value?.role === UserRoleEnum.ADMIN) {
    baseItems.push({
      label: 'Kelola Akses Admin',
      to: '/admin/users',
      icon: 'i-lucide-shield-check',
    });
  }

  return baseItems;
});

function isActiveRoute(target: string): boolean {
  return route.path === target || route.path.startsWith(`${target}/`);
}

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

watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false;
  },
);

onMounted(() => {
  void refreshQueueCounters();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <!-- Sidebar Desktop Fixed -->
    <aside
      class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200"
    >
      <div class="px-4 py-4 border-b border-slate-200/80 flex items-center gap-3">
        <div
          class="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs"
        >
          <UIcon name="i-lucide-line-chart" class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <div class="font-bold text-sm tracking-tight text-slate-900 truncate">
            SIPENA KTT • Nerwilis
          </div>
          <div class="text-xs text-slate-500 truncate">Kurasi Fenomena PDRB</div>
        </div>
      </div>

      <nav aria-label="Navigasi Admin" class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="
            isActiveRoute(item.to)
              ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-200/80'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
          "
        >
          <span class="flex items-center gap-2.5 min-w-0">
            <UIcon
              :name="item.icon"
              class="w-4 h-4 shrink-0"
              :class="isActiveRoute(item.to) ? 'text-teal-700' : 'text-slate-400'"
            />
            <span class="truncate">{{ item.label }}</span>
          </span>
          <UBadge
            v-if="item.badge !== undefined"
            :color="item.badgeColor || 'warning'"
            variant="subtle"
            size="xs"
            class="tabular-nums shrink-0"
          >
            {{ item.badge }}
          </UBadge>
        </NuxtLink>
      </nav>

      <div class="p-3 border-t border-slate-200/80 space-y-3 bg-slate-50/50">
        <UButton
          to="/"
          color="neutral"
          variant="outline"
          size="sm"
          block
          trailing-icon="i-lucide-external-link"
        >
          Lihat Portal Publik
        </UButton>

        <div
          class="rounded-lg bg-white border border-slate-200/90 p-2.5 flex items-center gap-2.5"
        >
          <div
            class="h-8 w-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-slate-900 truncate">
                {{ user?.name || 'Administrator' }}
              </span>
              <UBadge
                v-if="user?.role === UserRoleEnum.ADMIN"
                color="primary"
                variant="subtle"
                size="xs"
                class="shrink-0"
              >
                Admin
              </UBadge>
            </div>
            <div class="text-[11px] text-slate-500 truncate">
              {{ user?.email || 'Nerwilis KTT' }}
            </div>
          </div>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          block
          icon="i-lucide-log-out"
          :loading="isLoggingOut"
          @click="handleLogout"
        >
          Keluar
        </UButton>
      </div>
    </aside>

    <!-- Header Mobile & Tablet -->
    <header
      class="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-menu"
          aria-label="Buka menu navigasi admin"
          @click="mobileNavOpen = true"
        />
        <span class="font-bold text-sm text-slate-900 truncate">SIPENA KTT • Nerwilis</span>
      </div>

      <div class="flex items-center gap-2">
        <UBadge
          v-if="pendingCount > 0"
          color="warning"
          variant="subtle"
          size="xs"
          class="tabular-nums"
        >
          {{ pendingCount }} Pending
        </UBadge>
        <UButton
          to="/"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-globe"
          aria-label="Portal Publik"
        >
          Publik
        </UButton>
      </div>
    </header>

    <!-- Drawer Navigasi Mobile -->
    <USlideover
      v-model:open="mobileNavOpen"
      side="left"
      title="SIPENA KTT • Nerwilis"
      description="Menu workstation kurasi fenomena ekonomi"
      :ui="{ content: 'max-w-xs' }"
    >
      <template #body>
        <nav aria-label="Menu Mobile Admin" class="space-y-1.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors"
            :class="
              isActiveRoute(item.to)
                ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-200/80'
                : 'text-slate-700 hover:bg-slate-100 font-medium'
            "
          >
            <span class="flex items-center gap-2.5">
              <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
              <span>{{ item.label }}</span>
            </span>
            <UBadge
              v-if="item.badge !== undefined"
              :color="item.badgeColor || 'warning'"
              variant="subtle"
              size="xs"
              class="tabular-nums"
            >
              {{ item.badge }}
            </UBadge>
          </NuxtLink>
        </nav>
      </template>

      <template #footer>
        <div class="w-full space-y-2.5">
          <div class="text-xs text-slate-600 px-1">
            Login sebagai <strong class="text-slate-900">{{ user?.name || 'Admin' }}</strong>
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

    <!-- Main Workspace -->
    <div class="lg:pl-64 min-h-screen flex flex-col">
      <main class="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </main>
    </div>
  </div>
</template>

