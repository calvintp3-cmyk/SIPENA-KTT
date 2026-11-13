// server/utils/overview-cache.ts

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 15_000; // 15 detik TTL

export function getCachedOverview<T>(year: number, quarter: number): T | null {
  const key = `overview:${year}:${quarter}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedOverview<T>(
  year: number,
  quarter: number,
  data: T,
  ttlMs = DEFAULT_TTL_MS,
): void {
  const key = `overview:${year}:${quarter}`;
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateOverviewCache(): void {
  cache.clear();
}
