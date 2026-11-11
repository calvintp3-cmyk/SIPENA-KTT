<!-- app/pages/admin/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
});

await navigateTo('/admin/review', { replace: true });
</script>

<template>
  <div class="py-12 text-center text-sm text-slate-500">
    Mengalihkan ke antrean review harian...
  </div>
</template>

