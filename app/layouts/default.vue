<!-- app/layouts/default.vue -->
<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { user } = useAdminSession();
const { shortHeaderPeriod } = usePublicPortalState();

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
    label: 'Ikhtisar',
    to: '/',
    icon: 'i-solar-home-smile-bold-duotone',
    active: route.path === '/',
  },
  {
    label: 'Eksplorasi Fenomena',
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
  if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
    e.preventDefault();
    const dockSearch = document.getElementById('filter-dock-search') as HTMLInputElement | null;
    if (dockSearch) {
      dockSearch.focus();
      dockSearch.select();
    } else {
      void router.push('/linimasa').then(() => {
        setTimeout(() => {
          const el = document.getElementById('filter-dock-search') as HTMLInputElement | null;
          el?.focus();
          el?.select();
        }, 120);
      });
    }
    return;
  }

  // Shortcut tombol '/' saat tidak sedang mengetik di input
  if (e.key === '/' && !isInputActive && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    const dockSearch = document.getElementById('filter-dock-search') as HTMLInputElement | null;
    if (dockSearch) {
      dockSearch.focus();
      dockSearch.select();
    } else {
      void router.push('/linimasa').then(() => {
        setTimeout(() => {
          const el = document.getElementById('filter-dock-search') as HTMLInputElement | null;
          el?.focus();
          el?.select();
        }, 120);
      });
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
    class="min-h-screen bg-canvas text-ink-primary font-sans relative flex flex-col selection:bg-brand-tint selection:text-brand-primary"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-primary focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
    >
      Lewati ke konten utama
    </a>

    <!-- Full-Width Edge-to-Edge Sticky Masthead -->
    <header
      class="sticky top-0 z-40 w-full frosted-header border-b border-border-hairline transition-[background-color,border-color]"
      style="view-transition-name: sipena-public-header"
    >
      <div class="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <!-- Brand Lockup -->
        <NuxtLink to="/" class="flex items-center gap-3 group shrink-0 rounded-lg py-1 focus-visible:outline-[#0B3D2E] tactile-press">
          <div class="flex items-baseline gap-2">
            <span class="font-display font-extrabold tracking-tight text-ink-primary text-lg sm:text-[19px] whitespace-nowrap">
              SIPENA <span class="text-brand-primary">KTT</span>
            </span>
            <span class="hidden sm:inline-block w-px h-3.5 bg-[#141917]/15 self-center" />
            <span class="hidden sm:inline-block text-[11px] font-semibold text-ink-secondary tracking-wider uppercase whitespace-nowrap">
              BPS Kab. Tana Tidung
            </span>
          </div>
        </NuxtLink>

        <!-- Minimalist Text-Only Navigation Links (Desktop) -->
        <nav
          aria-label="Navigasi Portal Publik"
          class="hidden md:flex items-center gap-1 shrink-0"
        >
          <NuxtLink
            v-for="item in navLinks"
            :key="item.to"
            :to="item.to"
            :aria-current="item.active ? 'page' : undefined"
            class="relative px-3.5 py-1.5 rounded-lg text-[13px] transition-colors whitespace-nowrap tactile-press"
            :class="
              item.active
                ? 'text-brand-primary font-bold bg-brand-tint/70'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-white/80 font-medium'
            "
            @click="(e: MouseEvent) => handleNavClick(item.to, e)"
          >
            <span>{{ item.label }}</span>
            <span
              v-if="item.active"
              class="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-brand-primary rounded-full"
            />
          </NuxtLink>
        </nav>

        <!-- Right Utility Cluster -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div
            class="items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-tint border border-brand-border text-brand-primary text-[11.5px] font-semibold tabular-nums whitespace-nowrap"
            :class="isLinimasaRoute ? 'hidden sm:inline-flex' : 'hidden lg:inline-flex'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            <span>{{ shortHeaderPeriod }}</span>
          </div>

          <NuxtLink
            v-if="user"
            to="/admin"
            class="obs-btn-primary h-9 text-xs sm:text-[13px] font-semibold px-4 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap tactile-press shadow-xs"
          >
            <span>Workstation</span>
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
          <NuxtLink
            v-else
            to="/login"
            class="obs-btn-primary h-9 text-xs sm:text-[13px] font-semibold px-4 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap tactile-press shadow-xs"
          >
            <span>Workstation</span>
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>

          <button
            type="button"
            aria-label="Buka menu navigasi publik"
            class="md:hidden min-w-10 min-h-10 inline-flex items-center justify-center rounded-xl border border-border-hairline bg-white text-ink-primary hover:bg-surface-subtle cursor-pointer tactile-press"
            @click="() => { mobileMenuOpen = true; }"
          >
            <UIcon name="i-solar-hamburger-menu-bold-duotone" class="w-5 h-5 text-brand-primary" />
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Navigation Slideover -->
    <USlideover
      v-model:open="mobileMenuOpen"
      side="right"
      title="Navigasi Observatorium"
      description="Akses portal data fenomena ekonomi dan workstation BPS Tana Tidung"
      :ui="{ content: 'max-w-xs bg-canvas' }"
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
                ? 'bg-brand-tint text-brand-primary font-bold border border-brand-border'
                : 'text-ink-secondary hover:bg-white font-medium'
            "
            @click="(e: MouseEvent) => handleNavClick(item.to, e)"
          >
            <UIcon
              :name="item.icon"
              class="w-5 h-5 shrink-0"
              :class="item.active ? 'text-brand-primary' : 'text-ink-muted'"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>

          <div class="pt-4 mt-4 border-t border-border-hairline space-y-3">
            <div class="px-3 py-2 rounded-xl bg-brand-tint border border-brand-border text-xs text-brand-primary font-medium flex items-center justify-between">
              <span>Periode Aktif</span>
              <span class="font-bold tabular-nums font-mono">{{ shortHeaderPeriod }}</span>
            </div>

            <NuxtLink
              :to="user ? '/admin' : '/login'"
              class="obs-btn-primary w-full h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <UIcon
                :name="user ? 'i-solar-widget-5-bold-duotone' : 'i-solar-shield-keyhole-bold-duotone'"
                class="w-4 h-4"
              />
              <span>{{ user ? 'Buka Workstation' : 'Masuk Workstation Nerwilis' }}</span>
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

    <!-- Asymmetric 2-Band Observatory Colophon Footer -->
    <footer class="relative z-10 w-full bg-canvas border-t border-border-hairline py-10 shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pb-8 border-b border-border-hairline">
          <!-- Left Column: Editorial Manifesto Colophon -->
          <div class="md:col-span-7 space-y-2.5">
            <div class="flex items-center gap-2">
              <span class="font-display font-extrabold tracking-tight text-ink-primary text-base">
                SIPENA <span class="text-brand-primary">KTT</span>
              </span>
              <span class="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                • Observatorium Fenomena Ekonomi
              </span>
            </div>
            <p class="text-xs text-ink-secondary leading-relaxed max-w-xl">
              Platform intelijen dan rekam jejak dinamika 17 Lapangan Usaha KBLI serta 6 Komponen Pengeluaran PDRB Kabupaten Tana Tidung. Dikurasi oleh Tim Neraca Wilayah dan Analisis Statistik (Nerwilis) BPS Kabupaten Tana Tidung, Kalimantan Utara.
            </p>
            <div class="text-[11px] text-ink-muted font-mono">
              Zona Waktu Operasional: WITA (UTC+8)
            </div>
          </div>

          <!-- Right Column: Institutional Navigation Links -->
          <div class="md:col-span-5 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-6 text-xs font-medium text-ink-secondary">
            <div class="flex flex-col space-y-2">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Eksplorasi</span>
              <NuxtLink to="/" class="hover:text-brand-primary transition-colors">
                Ikhtisar Denyut
              </NuxtLink>
              <NuxtLink to="/linimasa" class="hover:text-brand-primary transition-colors">
                Sinyal Fenomena
              </NuxtLink>
              <button
                type="button"
                class="hover:text-brand-primary transition-colors cursor-pointer text-left"
                @click="(e: MouseEvent) => handleNavClick('/#cara-kerja', e)"
              >
                Metodologi BPS
              </button>
            </div>

            <div class="flex flex-col space-y-2">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Aparatur</span>
              <NuxtLink
                :to="user ? '/admin' : '/login'"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-border-hairline text-brand-primary hover:bg-brand-tint font-semibold transition-colors shadow-2xs"
              >
                <span>{{ user ? 'Workstation Admin' : 'Masuk Workstation' }}</span>
                <UIcon name="i-lucide-arrow-up-right" class="w-3.5 h-3.5" />
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-muted">
          <div>
            &copy; {{ new Date().getFullYear() }} Badan Pusat Statistik Kabupaten Tana Tidung. Seluruh hak cipta dilindungi.
          </div>
          <div class="font-mono text-[10.5px]">
            PDRB SNA 2008 &bull; KBLI 2025 Multi-Generasi
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
