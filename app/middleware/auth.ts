// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { fetchSession } = useAdminSession();
  const currentUser = await fetchSession();

  if (!currentUser) {
    const redirectQuery =
      to.fullPath && to.fullPath !== '/login' ? { redirect: to.fullPath } : undefined;
    return navigateTo({
      path: '/login',
      query: redirectQuery,
    });
  }
});

