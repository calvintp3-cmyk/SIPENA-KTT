<!-- app/app.vue -->
<template>
  <MotionConfig reduced-motion="user">
    <NuxtRouteAnnouncer />
    <UApp :toaster="{ position: 'top-right' }">
      <NuxtLoadingIndicator color="#2563EB" :height="3" />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UApp>
  </MotionConfig>
</template>
