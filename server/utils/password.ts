// server/utils/password.ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PARAMS = {
  N: 16_384,
  r: 8,
  p: 1,
} as const;

/**
 * Penanda pada kolom `password_hash` bagi akun whitelist staf yang khusus login lewat Google OAuth.
 * Format ini sengaja tidak memakai awalan `scrypt$` sehingga `verifyPassword` selalu menolaknya.
 */
export const OAUTH_ONLY_PASSWORD_MARKER = 'oauth2:google_only';

/**
 * Hash dummy 64-byte Scrypt untuk mitigasi side-channel timing attack (user enumeration) pada login.
 * Memastikan branch user yang tidak ditemukan tetap mengeksekusi scryptSync dengan durasi konstan.
 */
export const DUMMY_SCRYPT_HASH =
  'scrypt$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';


/**
 * Memeriksa apakah nilai `password_hash` merepresentasikan kata sandi lokal Scrypt yang aktif.
 */
export function hasLocalPasswordHash(storedHash: string | null | undefined): boolean {
  if (!storedHash || storedHash === OAUTH_ONLY_PASSWORD_MARKER) {
    return false;
  }
  const parts = storedHash.split('$');
  return parts.length === 3 && parts[0] === 'scrypt' && Boolean(parts[1]) && Boolean(parts[2]);
}

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

