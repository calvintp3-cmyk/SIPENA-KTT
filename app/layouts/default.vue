<!-- app/layouts/default.vue -->
<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { user } = useAdminSession();
const { searchInput, shortHeaderPeriod } = usePublicPortalState();
const { shortcutKey, shortcutTitle } = usePlatformShortcut();

const headerSearchEl = ref<HTMLInputElement | null>(null);
const mobileMenuOpen = ref(false);

const isLandingRoute = computed(() => route.path === '/');
const isLinimasaRoute = computed(() => route.path === '/linimasa');

function handleNavClick(to: string, e?: MouseEvent) {
  if (to.includes('#cara-kerja')) {
    if (e) e.preventDefault();
    mobileMenuOpen.value = false;
    if (route.path === '/') {
      const target = document.getElementById('cara-kerja');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '/#cara-kerja');
        return;
      }
    }
    void router.push({ path: '/', hash: '#cara-kerja' }).then(() => {
      setTimeout(() => {
        const target = document.getElementById('cara-kerja');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    });
  }
}

const navLinks = computed(() => [
  {
    label: 'Beranda',
    to: '/',
    icon: 'i-solar-home-smile-bold-duotone',
    active: route.path === '/',
  },
  {
    label: 'Linimasa Ekonomi',
    to: '/linimasa',
    icon: 'i-solar-calendar-search-bold-duotone',
    active: route.path === '/linimasa',
  },
  {
    label: 'Metodologi',
    to: '/#cara-kerja',
    icon: 'i-solar-layers-minimalistic-bold-duotone',
    active: false,
  },
]);

function handleGlobalKeydown(e: KeyboardEvent) {
  const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  const isInputActive = targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

  // Shortcut Ctrl+K / Cmd+K (aktif di semua rute publik)
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (!isLinimasaRoute.value) {
      void router.push('/linimasa').then(() => {
        nextTick(() => {
          headerSearchEl.value?.focus();
          headerSearchEl.value?.select();
        });
      });
    } else {
      headerSearchEl.value?.focus();
      headerSearchEl.value?.select();
    }
    return;
  }

  // Shortcut tombol '/' saat tidak sedang mengetik di input
  if (e.key === '/' && !isInputActive && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    if (!isLinimasaRoute.value) {
      void router.push('/linimasa').then(() => {
        nextTick(() => {
          headerSearchEl.value?.focus();
          headerSearchEl.value?.select();
        });
      });
    } else {
      headerSearchEl.value?.focus();
      headerSearchEl.value?.select();
    }
  }
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
  },
);

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div
    class="min-h-screen canvas-aurora-light text-slate-900 font-sans relative flex flex-col selection:bg-indigo-100 selection:text-indigo-900"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-indigo-700 focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
    >
      Lewati ke konten utama
    </a>

    <!-- Clean Modern Executive Header -->
    <header
      class="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80"
      style="view-transition-name: sipena-public-header"
    >
      <div
        class="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4"
      >
        <!-- Brand Lockup -->
        <NuxtLink to="/" class="flex items-center gap-3 group shrink-0 rounded-xl py-1">
          <div
            class="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#0B57D0] to-[#059669] text-white flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(11,87,208,0.32)] group-hover:scale-[1.03] transition-transform"
          >
            <UIcon name="i-lucide-trending-up" class="w-4.5 h-4.5 text-white" />
          </div>
          <div class="flex flex-col leading-tight min-w-0">
            <span class="font-display font-extrabold tracking-tight text-slate-900 text-[16px] whitespace-nowrap">
              SIPENA <span class="text-[#0B57D0]">KTT</span>
            </span>
            <span class="hidden sm:inline text-[11px] text-slate-500 font-medium whitespace-nowrap">
              BPS Kabupaten Tana Tidung
            </span>
          </div>
        </NuxtLink>

        <!-- Clean Text Navigation Links (Desktop) -->
        <nav
          aria-label="Navigasi Portal Publik"
          class="hidden md:flex items-center gap-8 shrink-0"
        >
          <NuxtLink
            v-for="item in navLinks"
            :key="item.to"
            :to="item.to"
            :aria-current="item.active ? 'page' : undefined"
            class="py-1.5 text-[14px] transition-colors whitespace-nowrap relative"
            :class="
              item.active
                ? 'text-[#0B57D0] font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            "
            @click="(e: MouseEvent) => handleNavClick(item.to, e)"
          >
            <span>{{ item.label }}</span>
            <span
              v-if="item.active"
              class="absolute left-0 right-0 -bottom-[17px] h-0.5 bg-[#0B57D0] rounded-full"
            />
          </NuxtLink>
        </nav>

        <!-- Quick Search Bar on /linimasa (Desktop Large) -->
        <div v-if="isLinimasaRoute" class="flex-1 max-w-xs hidden lg:block">
          <div class="relative group">
            <UIcon
              name="i-solar-magnifer-line-duotone"
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-700 pointer-events-none transition-colors"
            />
            <label for="public-header-search" class="sr-only">Cari fenomena ekonomi</label>
            <input
              id="public-header-search"
              ref="headerSearchEl"
              v-model="searchInput"
              type="search"
              placeholder="Cari komoditas atau berita..."
              class="w-full h-9 pl-9 pr-14 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-900 placeholder:text-slate-500 rounded-xl border border-slate-200/90 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-[color,background-color,border-color,box-shadow]"
            >
            <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                v-if="searchInput"
                type="button"
                aria-label="Hapus kata kunci pencarian"
                class="min-w-8 min-h-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                @click="() => { searchInput = ''; }"
              >
                <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
              </button>
              <kbd
                v-else
                :title="shortcutTitle"
                class="text-[11px] text-slate-600 bg-white border border-slate-200/90 shadow-2xs rounded-md px-1.5 py-0.5 font-semibold leading-none pointer-events-none font-mono"
              >
                {{ shortcutKey }}
              </kbd>
            </div>
          </div>
        </div>

        <!-- Right Utility Cluster -->
        <div class="flex items-center gap-3 shrink-0">
          <div
            class="items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tabular-nums whitespace-nowrap"
            :class="isLinimasaRoute ? 'hidden sm:inline-flex' : 'hidden lg:inline-flex'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{{ shortHeaderPeriod }} • Aktif</span>
          </div>

          <NuxtLink
            v-if="user"
            to="/admin"
            class="btn-primary-gradient h-10 text-xs sm:text-[13px] font-semibold px-4 rounded-[10px] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Workspace Admin</span>
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
          <NuxtLink
            v-else
            to="/login"
            class="btn-primary-gradient h-10 text-xs sm:text-[13px] font-semibold px-4 rounded-[10px] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Masuk Admin</span>
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>

          <button
            type="button"
            aria-label="Buka menu navigasi publik"
            class="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
            @click="() => { mobileMenuOpen = true; }"
          >
            <UIcon name="i-solar-hamburger-menu-bold-duotone" class="w-5 h-5 text-blue-700" />
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Navigation Slideover -->
    <USlideover
      v-model:open="mobileMenuOpen"
      side="right"
      title="Navigasi SIPENA KTT"
      description="Akses portal data, linimasa ekonomi, dan workstation BPS Tana Tidung"
      :ui="{ content: 'max-w-xs' }"
    >
      <template #body>
        <nav aria-label="Menu Mobile Publik" class="space-y-2">
          <NuxtLink
            v-for="item in navLinks"
            :key="item.to"
            :to="item.to"
            :aria-current="item.active ? 'page' : undefined"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors"
            :class="
              item.active
                ? 'bg-blue-50 text-blue-800 font-semibold border border-blue-200/80'
                : 'text-slate-700 hover:bg-slate-100 font-medium'
            "
            @click="(e: MouseEvent) => handleNavClick(item.to, e)"
          >
            <UIcon
              :name="item.icon"
              class="w-5 h-5 shrink-0"
              :class="item.active ? 'text-indigo-600' : 'text-slate-400'"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>

          <div class="pt-4 mt-4 border-t border-slate-200/80 space-y-3">
            <div class="px-3 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-900 font-medium flex items-center justify-between">
              <span>Periode Aktif</span>
              <span class="font-bold tabular-nums">{{ shortHeaderPeriod }}</span>
            </div>

            <NuxtLink
              :to="user ? '/admin' : '/login'"
              class="btn-primary-gradient w-full h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <UIcon
                :name="user ? 'i-solar-widget-5-bold-duotone' : 'i-solar-shield-keyhole-bold-duotone'"
                class="w-4 h-4"
              />
              <span>{{ user ? 'Buka Workspace Admin' : 'Masuk Workstation Admin' }}</span>
            </NuxtLink>
          </div>
        </nav>
      </template>
    </USlideover>

    <!-- Main Page Container -->
    <main id="main-content" tabindex="-1" class="relative z-10 flex-1 w-full">
      <div
        :class="
          isLandingRoute
            ? ''
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16'
        "
      >
        <slot />
      </div>
    </main>

    <!-- Modern Executive Footer -->
    <footer class="relative z-10 w-full bg-white border-t border-slate-200/80 py-7 shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0B57D0] to-[#059669] text-white flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-trending-up" class="w-4 h-4" />
          </div>
          <div class="text-xs text-slate-600 leading-relaxed">
            <div class="font-bold text-slate-900">
              SIPENA KTT • Badan Pusat Statistik Kabupaten Tana Tidung
            </div>
            <div class="text-slate-500">
              Fungsi Neraca Wilayah &amp; Analisis Statistik (Nerwilis) • Kalimantan Utara • Zona Waktu WITA (UTC+8)
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
          <NuxtLink to="/" class="py-1.5 px-1 hover:text-[#0B57D0] transition-colors">
            Beranda
          </NuxtLink>
          <NuxtLink to="/linimasa" class="py-1.5 px-1 hover:text-[#0B57D0] transition-colors">
            Linimasa Ekonomi
          </NuxtLink>
          <button
            type="button"
            class="py-1.5 px-1 hover:text-[#0B57D0] transition-colors cursor-pointer text-left"
            @click="(e: MouseEvent) => handleNavClick('/#cara-kerja', e)"
          >
            Metodologi
          </button>
          <NuxtLink
            :to="user ? '/admin' : '/login'"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-9 rounded-lg bg-[#EFF6FF] text-[#0B57D0] hover:bg-blue-100 font-semibold transition-colors"
          >
            <span>{{ user ? 'Workstation Admin' : 'Workstation Nerwilis' }}</span>
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
