<!-- app/app.vue -->
<template>
  <UApp :toaster="{ position: 'top-right' }">
    <NuxtLoadingIndicator color="#0d9488" :height="3" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

