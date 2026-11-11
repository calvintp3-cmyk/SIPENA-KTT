// server/utils/cron-secret.ts
import { timingSafeEqual } from 'node:crypto';

/**
 * Memvalidasi header `x-cron-secret` secara timing-safe terhadap `CRON_SECRET`.
 */
export function verifyCronSecret(
  providedSecret: string | undefined,
  expectedSecret: string | undefined,
): boolean {
  if (
    !providedSecret ||
    !expectedSecret ||
    expectedSecret.length < 16 ||
    expectedSecret.includes('GANTI_DENGAN_CRON_SECRET')
  ) {
    return false;
  }

  const providedBuf = Buffer.from(providedSecret, 'utf8');
  const expectedBuf = Buffer.from(expectedSecret, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

