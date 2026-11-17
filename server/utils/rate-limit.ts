// server/utils/rate-limit.ts
import { getRequestHeader, type H3Event } from 'h3';

const WINDOW_MS = 15 * 60 * 1000; // 15 menit (docs/prd.md §6.3)
const MAX_ATTEMPTS = 10;
const CLEANUP_INTERVAL_BUCKETS = 250;
const MAX_TRACKED_BUCKETS = 5_000;

const PUBLIC_WINDOW_MS = 60 * 1000; // 1 menit
const PUBLIC_MAX_REQUESTS = 60; // 60 request/menit

interface RateLimitBucket {
  timestamps: number[];
}

const loginAttemptsByIp = new Map<string, RateLimitBucket>();
const publicRequestsByIp = new Map<string, RateLimitBucket>();

function pruneStaleBuckets(now: number): void {
  if (loginAttemptsByIp.size < CLEANUP_INTERVAL_BUCKETS && publicRequestsByIp.size < CLEANUP_INTERVAL_BUCKETS) {
    return;
  }

  const cutoffLogin = now - WINDOW_MS;
  for (const [key, bucket] of loginAttemptsByIp.entries()) {
    const fresh = bucket.timestamps.filter((ts) => ts > cutoffLogin);
    if (fresh.length === 0) {
      loginAttemptsByIp.delete(key);
    } else {
      bucket.timestamps = fresh;
    }
  }

  const cutoffPub = now - PUBLIC_WINDOW_MS;
  for (const [key, bucket] of publicRequestsByIp.entries()) {
    const fresh = bucket.timestamps.filter((ts) => ts > cutoffPub);
    if (fresh.length === 0) {
      publicRequestsByIp.delete(key);
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

  if (publicRequestsByIp.size > MAX_TRACKED_BUCKETS) {
    const excess = publicRequestsByIp.size - MAX_TRACKED_BUCKETS;
    let evicted = 0;
    for (const key of publicRequestsByIp.keys()) {
      publicRequestsByIp.delete(key);
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

export function checkPublicApiRateLimit(
  ip: string,
  now: number = Date.now(),
  maxRequests: number = PUBLIC_MAX_REQUESTS,
  windowMs: number = PUBLIC_WINDOW_MS,
): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  pruneStaleBuckets(now);

  const cutoff = now - windowMs;
  const bucket = publicRequestsByIp.get(ip) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    publicRequestsByIp.set(ip, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);
  publicRequestsByIp.set(ip, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttemptsByIp.delete(ip);
}

export function __clearAllRateLimitsForTest(): void {
  loginAttemptsByIp.clear();
  publicRequestsByIp.clear();
}

