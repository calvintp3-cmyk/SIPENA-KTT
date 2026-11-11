// server/utils/password.ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PARAMS = {
  N: 16_384,
  r: 8,
  p: 1,
} as const;

/**
 * Menghasilkan hash password format `scrypt$<saltHex>$<derivedKeyHex>`.
 */
export function hashPassword(plainPassword: string): string {
  const saltHex = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(plainPassword, saltHex, SCRYPT_KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt$${saltHex}$${derivedKey.toString('hex')}`;
}

/**
 * Memverifikasi password plaintext terhadap hash Scrypt menggunakan timing-safe comparison.
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) {
    return false;
  }

  const expectedBuffer = Buffer.from(hashHex, 'hex');
  const derivedBuffer = scryptSync(plainPassword, saltHex, expectedBuffer.length, SCRYPT_PARAMS);

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedBuffer);
}

