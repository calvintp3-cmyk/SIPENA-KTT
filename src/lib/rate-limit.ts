interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkSlidingRateLimit(
  key: string,
  options: { maxAttempts: number; windowMs: number; increment?: boolean }
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - options.windowMs;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= options.maxAttempts) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + options.windowMs - now) / 1000)
    );
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  if (options.increment !== false) {
    bucket.timestamps.push(now);
    buckets.set(key, bucket);
  }

  // Opportunistic map cleanup to prevent unbounded growth in long-running PM2 processes
  if (buckets.size > 5000) {
    for (const [k, b] of buckets.entries()) {
      if (b.timestamps.every((ts) => ts <= cutoff)) {
        buckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.maxAttempts - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitKey(key: string): void {
  buckets.delete(key);
}

