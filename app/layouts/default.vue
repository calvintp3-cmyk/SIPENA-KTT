<!-- app/layouts/default.vue -->
<script setup lang="ts">
const route = useRoute();
const { user } = useAdminSession();
const { searchInput, shortHeaderPeriod } = usePublicPortalState();

const headerSearchEl = ref<HTMLInputElement | null>(null);
const isPublicIndex = computed(() => route.path === '/');

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && isPublicIndex.value) {
    e.preventDefault();
    headerSearchEl.value?.focus();
    headerSearchEl.value?.select();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="min-h-screen bg-[#EFF2F7] text-[#0B1220] font-sans relative flex flex-col selection:bg-teal-100 selection:text-teal-900">
    <!-- Ambient Top Atmospheric Glow -->
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,rgba(15,118,110,0.10),rgba(37,99,235,0.04),transparent)] z-0"
    />

    <!-- 56px Frosted Glass Top Navbar -->
    <header
      class="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-900/[0.07] shadow-[0_1px_3px_rgba(11,18,32,0.03)]"
    >
      <div class="max-w-7xl mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <!-- Brand Lockup -->
        <NuxtLink to="/" class="flex items-center gap-2.5 group shrink-0 rounded-lg">
          <div
            class="w-8 h-8 rounded-lg bg-gradient-to-b from-[#0F766E] to-[#0B5B55] text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_3px_rgba(11,91,85,0.35)]"
          >
            <UIcon name="i-lucide-box" class="w-4 h-4" />
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-bold tracking-tight text-[#0B1220] text-[15px] whitespace-nowrap">
              SIPENA <span class="text-teal-700">KTT</span>
            </span>
            <span class="text-slate-300 font-light hidden sm:inline">/</span>
            <span class="hidden lg:inline-flex text-[#5B677A] text-xs font-medium whitespace-nowrap">
              Sistem Pemantauan Fenomena Ekonomi
            </span>
          </div>
        </NuxtLink>

        <!-- Central Quick Search Bar (Desktop) -->
        <div v-if="isPublicIndex" class="flex-1 max-w-md hidden md:block">
          <div class="relative group">
            <UIcon
              name="i-lucide-search"
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-700 pointer-events-none transition-colors"
            />
            <label for="public-header-search" class="sr-only">Cari fenomena ekonomi</label>
            <input
              id="public-header-search"
              ref="headerSearchEl"
              v-model="searchInput"
              type="search"
              placeholder="Cari komoditas, fenomena, atau portal berita..."
              class="w-full h-8 pl-9 pr-14 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-[#0B1220] placeholder:text-slate-500 rounded-lg border border-slate-200/90 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] transition-all"
            >
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                v-if="searchInput"
                type="button"
                aria-label="Hapus kata kunci pencarian"
                class="min-w-6 min-h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 rounded"
                @click="searchInput = ''"
              >
                <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
              </button>
              <kbd
                v-else
                class="font-mono text-[10px] text-slate-500 bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(11,18,32,0.06)] rounded px-1.5 py-0.5 font-medium leading-none pointer-events-none"
              >
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        <!-- Period Status Pill & Admin CTA -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div
            class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#DCE3EC] text-slate-700 font-mono text-[11px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.04)] whitespace-nowrap tabular-nums"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{{ shortHeaderPeriod }} • Terverifikasi</span>
          </div>

          <NuxtLink
            v-if="user"
            to="/admin"
            class="obsidian-button text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UIcon name="i-lucide-layout-dashboard" class="w-3.5 h-3.5 text-teal-300" />
            <span>Workspace Admin</span>
          </NuxtLink>
          <NuxtLink
            v-else
            to="/login"
            class="obsidian-button text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UIcon name="i-lucide-lock" class="w-3.5 h-3.5 text-slate-300" />
            <span>Masuk Admin</span>
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="relative z-10 flex-1 w-full pb-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
        <slot />
      </div>
    </main>

    <!-- Sleek Footer -->
    <footer
      class="relative z-10 w-full bg-white border-t border-[#DCE3EC] py-4 shrink-0 shadow-[0_-1px_2px_rgba(11,18,32,0.02)]"
    >
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[#5B677A] font-mono text-[11px]"
      >
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="font-bold text-[#0B1220] font-sans">SIPENA KTT</span>
          <span>•</span>
          <span>Badan Pusat Statistik Kabupaten Tana Tidung (Fungsi Nerwilis)</span>
          <span>•</span>
          <span>Kalimantan Utara</span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span>WITA (UTC+8)</span>
          <span>•</span>
          <NuxtLink to="/login" class="text-teal-700 hover:text-teal-800 hover:underline font-sans font-semibold">
            Workstation Nerwilis
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
