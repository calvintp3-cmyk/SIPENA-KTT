// server/utils/rate-limit.ts
import { getRequestHeader, type H3Event } from 'h3';

const WINDOW_MS = 15 * 60 * 1000; // 15 menit (docs/prd.md §6.3)
const MAX_ATTEMPTS = 10;
const CLEANUP_INTERVAL_BUCKETS = 250;
const MAX_TRACKED_BUCKETS = 5_000;

interface RateLimitBucket {
  timestamps: number[];
}

const loginAttemptsByIp = new Map<string, RateLimitBucket>();

function pruneStaleBuckets(now: number): void {
  if (loginAttemptsByIp.size < CLEANUP_INTERVAL_BUCKETS) {
    return;
  }

  const cutoff = now - WINDOW_MS;
  for (const [key, bucket] of loginAttemptsByIp.entries()) {
    const fresh = bucket.timestamps.filter((ts) => ts > cutoff);
    if (fresh.length === 0) {
      loginAttemptsByIp.delete(key);
    } else {
      bucket.timestamps = fresh;
    }
  }

  // Cap kapasitas memori: buang entri tertua bila diserang jutaan IP acak
  if (loginAttemptsByIp.size > MAX_TRACKED_BUCKETS) {
    const excess = loginAttemptsByIp.size - MAX_TRACKED_BUCKETS;
    let evicted = 0;
    for (const key of loginAttemptsByIp.keys()) {
      loginAttemptsByIp.delete(key);
      evicted += 1;
      if (evicted >= excess) break;
    }
  }
}

export function getClientIp(event: H3Event): string {
  const xRealIp = getRequestHeader(event, 'x-real-ip')?.trim();
  if (xRealIp) return xRealIp;

  const xForwardedFor = getRequestHeader(event, 'x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  return event.node.req.socket.remoteAddress ?? 'unknown';
}

export function checkLoginRateLimit(
  ip: string,
  now: number = Date.now(),
): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  pruneStaleBuckets(now);

  const cutoff = now - WINDOW_MS;
  const bucket = loginAttemptsByIp.get(ip) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= MAX_ATTEMPTS) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    loginAttemptsByIp.set(ip, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);
  loginAttemptsByIp.set(ip, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttemptsByIp.delete(ip);
}

export function __clearAllRateLimitsForTest(): void {
  loginAttemptsByIp.clear();
}

