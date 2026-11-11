<!-- app/layouts/default.vue -->
<script setup lang="ts">
const route = useRoute();
const { user } = useAdminSession();
const { searchInput, shortHeaderPeriod } = usePublicPortalState();

const headerSearchEl = ref<HTMLInputElement | null>(null);
const mobileMenuOpen = ref(false);

const isLandingRoute = computed(() => route.path === '/');
const isLinimasaRoute = computed(() => route.path === '/linimasa');

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
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && isLinimasaRoute.value) {
    e.preventDefault();
    headerSearchEl.value?.focus();
    headerSearchEl.value?.select();
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
    class="min-h-screen canvas-aurora-light text-[#0F172A] font-sans relative flex flex-col selection:bg-indigo-100 selection:text-indigo-900"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-indigo-700 focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
    >
      Lewati ke konten utama
    </a>

    <!-- Floating Frosted Glass Header -->
    <header
      class="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-1.5 pointer-events-none"
      style="view-transition-name: sipena-public-header"
    >
      <div
        class="pointer-events-auto max-w-7xl mx-auto h-14 px-3.5 sm:px-5 rounded-2xl bg-white/85 backdrop-blur-xl border border-slate-200/85 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.92)_inset] flex items-center justify-between gap-3"
      >
        <!-- Brand Lockup -->
        <NuxtLink to="/" class="flex items-center gap-2.5 group shrink-0 rounded-xl py-1">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_12px_-2px_rgba(37,99,235,0.38)] group-hover:scale-[1.03] transition-transform"
          >
            <UIcon name="i-solar-chart-2-bold-duotone" class="w-5 h-5" />
          </div>
          <div class="flex flex-col leading-tight min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-extrabold tracking-tight text-[#0F172A] text-[15px] whitespace-nowrap">
                SIPENA
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
                  KTT
                </span>
              </span>
              <span
                class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80"
              >
                Nerwilis
              </span>
            </div>
            <span class="hidden lg:inline text-[11px] text-slate-500 font-medium whitespace-nowrap">
              Portal Intelijen Ekonomi Tana Tidung
            </span>
          </div>
        </NuxtLink>

        <!-- Primary Navigation Pills (Desktop) -->
        <nav
          aria-label="Navigasi Portal Publik"
          class="hidden md:inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shrink-0"
        >
          <NuxtLink
            v-for="item in navLinks"
            :key="item.to"
            :to="item.to"
            :aria-current="item.active ? 'page' : undefined"
            class="px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-all whitespace-nowrap"
            :class="
              item.active
                ? 'bg-white text-indigo-700 font-semibold shadow-[0_1px_3px_rgba(15,23,42,0.08),0_0_0_1px_rgba(79,70,229,0.16)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60 font-medium'
            "
          >
            <UIcon
              :name="item.icon"
              class="w-4 h-4 shrink-0"
              :class="item.active ? 'text-indigo-600' : 'text-slate-400'"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Quick Search Bar on /linimasa (Desktop Large) -->
        <div v-if="isLinimasaRoute" class="flex-1 max-w-xs hidden lg:block">
          <div class="relative group">
            <UIcon
              name="i-solar-magnifer-line-duotone"
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 pointer-events-none transition-colors"
            />
            <label for="public-header-search" class="sr-only">Cari fenomena ekonomi</label>
            <input
              id="public-header-search"
              ref="headerSearchEl"
              v-model="searchInput"
              type="search"
              placeholder="Cari komoditas atau berita..."
              class="w-full h-9 pl-9 pr-14 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-500 rounded-xl border border-slate-200/90 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
            >
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                v-if="searchInput"
                type="button"
                aria-label="Hapus kata kunci pencarian"
                class="min-w-6 min-h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 rounded"
                @click="() => { searchInput = ''; }"
              >
                <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
              </button>
              <kbd
                v-else
                class="text-[10px] text-slate-500 bg-white border border-slate-200/90 shadow-2xs rounded-md px-1.5 py-0.5 font-semibold leading-none pointer-events-none"
              >
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        <!-- Right Utility Cluster -->
        <div class="flex items-center gap-2 shrink-0">
          <div
            class="items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/90 text-emerald-800 text-[11px] font-semibold tabular-nums whitespace-nowrap"
            :class="isLinimasaRoute ? 'hidden sm:inline-flex' : 'hidden xl:inline-flex'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{{ shortHeaderPeriod }} • Aktif</span>
          </div>

          <NuxtLink
            v-if="user"
            to="/admin"
            class="btn-primary-gradient h-9 text-xs font-semibold px-3.5 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UIcon name="i-solar-widget-5-bold-duotone" class="w-4 h-4 text-emerald-200" />
            <span class="hidden sm:inline">Workspace Admin</span>
            <span class="sm:hidden">Admin</span>
          </NuxtLink>
          <NuxtLink
            v-else
            to="/login"
            class="btn-primary-gradient h-9 text-xs font-semibold px-3.5 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UIcon name="i-solar-shield-keyhole-bold-duotone" class="w-4 h-4 text-blue-100" />
            <span class="hidden sm:inline">Masuk Admin</span>
            <span class="sm:hidden">Masuk</span>
          </NuxtLink>

          <button
            type="button"
            aria-label="Buka menu navigasi publik"
            class="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            @click="() => { mobileMenuOpen = true; }"
          >
            <UIcon name="i-solar-hamburger-menu-bold-duotone" class="w-5 h-5 text-indigo-600" />
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
                ? 'bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200/80'
                : 'text-slate-700 hover:bg-slate-100 font-medium'
            "
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

    <!-- Modern SaaS Footer -->
    <footer class="relative z-10 w-full bg-white/90 backdrop-blur-md border-t border-slate-200/85 py-6 shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 text-white flex items-center justify-center shrink-0">
            <UIcon name="i-solar-chart-2-bold-duotone" class="w-4 h-4" />
          </div>
          <div class="text-xs text-slate-600 leading-relaxed">
            <div class="font-bold text-[#0F172A]">
              SIPENA KTT • Badan Pusat Statistik Kabupaten Tana Tidung
            </div>
            <div class="text-slate-500">
              Fungsi Neraca Wilayah &amp; Analisis Statistik (Nerwilis) • Kalimantan Utara • Zona Waktu WITA (UTC+8)
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
          <NuxtLink to="/" class="hover:text-indigo-700 transition-colors">
            Beranda
          </NuxtLink>
          <NuxtLink to="/linimasa" class="hover:text-indigo-700 transition-colors">
            Linimasa Ekonomi
          </NuxtLink>
          <NuxtLink to="/#cara-kerja" class="hover:text-indigo-700 transition-colors">
            Metodologi
          </NuxtLink>
          <NuxtLink
            :to="user ? '/admin' : '/login'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition-colors"
          >
            <UIcon name="i-solar-widget-5-bold-duotone" class="w-3.5 h-3.5" />
            <span>{{ user ? 'Workstation Admin' : 'Workstation Nerwilis' }}</span>
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
