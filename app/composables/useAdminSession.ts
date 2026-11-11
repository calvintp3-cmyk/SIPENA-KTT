// app/composables/useAdminSession.ts
import type { AdminArticlesResponse, AuthUser } from '~/types/sipena';

export function useAdminSession() {
  const user = useState<AuthUser | null>('sipena:auth-user', () => null);
  const pendingCount = useState<number>('sipena:pending-count', () => 0);
  const llmFailedCount = useState<number>('sipena:llm-failed-count', () => 0);
  const authLoading = useState<boolean>('sipena:auth-loading', () => false);

  async function fetchSession(force = false): Promise<AuthUser | null> {
    if (!force && user.value) {
      return user.value;
    }

    authLoading.value = true;
    try {
      const requestFetch = useRequestFetch();
      const res = await requestFetch<{ user: AuthUser }>('/api/auth/me', {
        credentials: 'include',
      });
      user.value = res.user;
      return res.user;
    } catch {
      user.value = null;
      return null;
    } finally {
      authLoading.value = false;
    }
  }

  async function refreshQueueCounters(): Promise<void> {
    try {
      const res = await $fetch<AdminArticlesResponse>('/api/admin/articles', {
        query: { status: 'PENDING', limit: 1 },
        credentials: 'include',
      });
      pendingCount.value = res.summaryCounts.pendingCount;
      llmFailedCount.value = res.summaryCounts.llmFailedCount;
    } catch {
      // Abaikan diam-diam agar navigasi tidak terganggu
    }
  }

  function setUser(nextUser: AuthUser | null): void {
    user.value = nextUser;
  }

  function setQueueCounts(pending: number, failed?: number): void {
    pendingCount.value = pending;
    if (failed !== undefined) {
      llmFailedCount.value = failed;
    }
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      user.value = null;
      pendingCount.value = 0;
      llmFailedCount.value = 0;
      await navigateTo('/login');
    }
  }

  return {
    user,
    pendingCount,
    llmFailedCount,
    authLoading,
    fetchSession,
    refreshQueueCounters,
    setUser,
    setQueueCounts,
    logout,
  };
}

