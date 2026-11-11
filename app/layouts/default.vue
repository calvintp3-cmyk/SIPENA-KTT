<!-- app/layouts/default.vue -->
<script setup lang="ts">
import { getCurrentQuarterYearWita, formatPeriodLabel } from '#shared/utils/period';

const { user } = useAdminSession();
const currentPeriod = computed(() => {
  const { quarter, year } = getCurrentQuarterYearWita();
  return formatPeriodLabel(quarter, year);
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200/90 bg-white">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4"
      >
        <NuxtLink
          to="/"
          class="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg"
        >
          <div
            class="h-10 w-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0"
          >
            <UIcon name="i-lucide-bar-chart-3" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold tracking-tight text-slate-900 text-base sm:text-lg">
                SIPENA KTT
              </span>
              <UBadge color="primary" variant="subtle" size="xs" class="hidden sm:inline-flex">
                PDRB Analytical Feed
              </UBadge>
            </div>
            <p class="text-xs text-slate-500 truncate">
              Pemantauan Fenomena Ekonomi Kabupaten Tana Tidung
            </p>
          </div>
        </NuxtLink>

        <div class="flex items-center gap-3 shrink-0">
          <div
            class="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/80 font-mono tabular-nums"
          >
            <UIcon name="i-lucide-calendar-clock" class="w-3.5 h-3.5 text-teal-600" />
            <span>{{ currentPeriod }} • WITA</span>
          </div>

          <UButton
            v-if="user"
            to="/admin/review"
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-layout-dashboard"
          >
            Workspace Admin
          </UButton>
          <UButton
            v-else
            to="/login"
            color="neutral"
            variant="outline"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          >
            Masuk Admin
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <slot />
      </div>
    </main>

    <footer class="border-t border-slate-200 bg-white mt-auto">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500"
      >
        <div>
          <span class="font-semibold text-slate-700">SIPENA KTT</span>
          — Instrumen Pemantauan Fenomena Ekonomi Dua Sisi PDRB (Lapangan Usaha KBLI A–U &amp;
          Pengeluaran) Kabupaten Tana Tidung, Kalimantan Utara.
        </div>
        <div class="flex items-center gap-4 shrink-0 font-mono tabular-nums">
          <span>Zona Waktu: Asia/Makassar (WITA)</span>
          <NuxtLink
            to="/login"
            class="text-teal-700 hover:text-teal-800 hover:underline font-sans font-medium"
          >
            Portal Kurasi Nerwilis
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

