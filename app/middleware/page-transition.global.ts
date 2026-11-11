// app/middleware/page-transition.global.ts
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;
  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
    to.meta.pageTransition = false;
    to.meta.layoutTransition = false;
  }
});

