// tests/ssrf-and-security.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { UserRoleEnum } from '#shared/enums/pdrb';
import { isAdminApiPath } from '#server/utils/admin-path';
import { verifyCronSecret } from '#server/utils/cron-secret';
import { hashPassword, verifyPassword } from '#server/utils/password';
import {
  __clearAllRateLimitsForTest,
  checkLoginRateLimit,
  resetLoginRateLimit,
} from '#server/utils/rate-limit';
import { createSessionToken, verifySessionToken } from '#server/utils/session';
import {
  enforceHostRateLimit,
  isForbiddenIp,
  resetHostRateLimitsForTest,
  SsrfValidationError,
  validateExternalUrl,
} from '#server/utils/ssrf';
import { extractHostnameLabel, hashNormalizedUrl, normalizeUrl } from '#server/utils/url-hash';

const TEST_SESSION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

afterEach(() => {
  __clearAllRateLimitsForTest();
});

describe('SSRF Guard, URL Hash, Auth Security & Rate Limit', () => {
  it('memblokir IP privat, loopback, metadata cloud, CGNAT, dan IPv6-mapped IPv4', () => {
    expect(isForbiddenIp('127.0.0.1')).toBe(true);
    expect(isForbiddenIp('10.10.2.5')).toBe(true);
    expect(isForbiddenIp('172.16.0.1')).toBe(true);
    expect(isForbiddenIp('192.168.1.254')).toBe(true);
    expect(isForbiddenIp('169.254.169.254')).toBe(true);
    expect(isForbiddenIp('100.64.12.1')).toBe(true);
    expect(isForbiddenIp('::1')).toBe(true);
    expect(isForbiddenIp('fc00::1')).toBe(true);
    expect(isForbiddenIp('fe80::1')).toBe(true);
    expect(isForbiddenIp('::ffff:127.0.0.1')).toBe(true);
    expect(isForbiddenIp('::ffff:169.254.169.254')).toBe(true);
    expect(isForbiddenIp('64:ff9b::10.0.0.1')).toBe(true);

    // IP publik sah diizinkan
    expect(isForbiddenIp('103.58.100.169')).toBe(false);
    expect(isForbiddenIp('8.8.8.8')).toBe(false);
    expect(isForbiddenIp('2606:4700:4700::1111')).toBe(false);
  });

  it('memvalidasi URL eksternal via DNS lookup dan menolak DNS rebinding ke IP privat', async () => {
    await expect(validateExternalUrl('http://localhost:3000/secret')).rejects.toThrow(
      SsrfValidationError,
    );
    await expect(validateExternalUrl('file:///etc/passwd')).rejects.toThrow(SsrfValidationError);
    await expect(validateExternalUrl('https://user:pass@example.com/')).rejects.toThrow(
      SsrfValidationError,
    );

    const mockPrivateDns = async () => [{ address: '10.0.0.8', family: 4 }];
    await expect(
      validateExternalUrl('https://rebind.evil.test/article', mockPrivateDns),
    ).rejects.toThrow(SsrfValidationError);

    const mockPublicDns = async () => [{ address: '104.21.10.2', family: 4 }];
    const okUrl = await validateExternalUrl('https://korankaltara.com/berita', mockPublicDns);
    expect(okUrl.hostname).toBe('korankaltara.com');
  });

  it('menormalisasi parameter tracking dan menghasilkan url_hash SHA-256 deterministik', () => {
    const urlA =
      'HTTPS://WWW.KoranKaltara.com/berita-sawit/?utm_source=ig&b=2&fbclid=xyz&a=1#komentar';
    const urlB = 'https://www.korankaltara.com/berita-sawit?a=1&b=2';

    expect(normalizeUrl(urlA)).toBe('https://www.korankaltara.com/berita-sawit?a=1&b=2');
    expect(hashNormalizedUrl(urlA).urlHash).toBe(hashNormalizedUrl(urlB).urlHash);
    expect(hashNormalizedUrl(urlA).urlHash).toHaveLength(64);
    expect(extractHostnameLabel(urlA)).toBe('korankaltara.com');
  });

  it('membuat & memverifikasi cookie token AES-256-GCM dan menolak manipulasi / kadaluwarsa', () => {
    const token = createSessionToken(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        email: 'admin@sipena-ktt.go.id',
        name: 'Admin Nerwilis',
        role: UserRoleEnum.ADMIN,
        tokenVersion: 1,
      },
      { secret: TEST_SESSION_SECRET, ttlSeconds: 3600 },
    );

    const verified = verifySessionToken(token, TEST_SESSION_SECRET);
    expect(verified?.email).toBe('admin@sipena-ktt.go.id');
    expect(verified?.role).toBe(UserRoleEnum.ADMIN);

    // Manipulasi byte auth tag / ciphertext harus ditolak
    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(verifySessionToken(tampered, TEST_SESSION_SECRET)).toBeNull();

    // Token expired harus ditolak
    const expired = createSessionToken(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        email: 'admin@sipena-ktt.go.id',
        name: 'Admin Nerwilis',
        role: UserRoleEnum.ADMIN,
        tokenVersion: 1,
      },
      { secret: TEST_SESSION_SECRET, ttlSeconds: -5 },
    );
    expect(verifySessionToken(expired, TEST_SESSION_SECRET)).toBeNull();
  });

  it('memverifikasi cron secret dengan timing-safe dan password hashing Scrypt', () => {
    const validSecret = 'super-secure-cron-secret-key-2026';
    expect(verifyCronSecret(validSecret, validSecret)).toBe(true);
    expect(verifyCronSecret('wrong-secret-same-length-123456', validSecret)).toBe(false);
    expect(verifyCronSecret('short', 'short')).toBe(false);
    expect(verifyCronSecret('GANTI_DENGAN_CRON_SECRET_1234', 'GANTI_DENGAN_CRON_SECRET_1234')).toBe(
      false,
    );

    const hash = hashPassword('KaltaraMaju2026!');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('KaltaraMaju2026!', hash)).toBe(true);
    expect(verifyPassword('SalahPassword!', hash)).toBe(false);
  });

  it('membatasi percobaan login maksimal 10 kali per 15 menit per IP', () => {
    const ip = '103.58.100.5';
    const baseTime = 1_760_000_000_000;

    for (let i = 0; i < 10; i += 1) {
      const check = checkLoginRateLimit(ip, baseTime + i * 1000);
      expect(check.allowed).toBe(true);
    }

    const eleventh = checkLoginRateLimit(ip, baseTime + 11_000);
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.retryAfterSeconds).toBeGreaterThan(0);

    // Setelah reset login berhasil, IP langsung pulih
    resetLoginRateLimit(ip);
    expect(checkLoginRateLimit(ip, baseTime + 12_000).allowed).toBe(true);
  });

  it('mendeteksi path /api/admin secara case-insensitive dan tahan variasi slash/encoding', () => {
    expect(isAdminApiPath('/api/admin')).toBe(true);
    expect(isAdminApiPath('/api/admin/')).toBe(true);
    expect(isAdminApiPath('/api/admin/articles')).toBe(true);
    expect(isAdminApiPath('/API/Admin/scrapers/logs')).toBe(true);
    expect(isAdminApiPath('/api/%61dmin/articles')).toBe(true);
    expect(isAdminApiPath('//api//admin/users')).toBe(true);

    expect(isAdminApiPath('/api/admin-public')).toBe(false);
    expect(isAdminApiPath('/api/public/articles')).toBe(false);
    expect(isAdminApiPath('/admin/articles')).toBe(false);
    expect(isAdminApiPath('/api/%ZZinvalid')).toBe(false);
  });

  it('enforceHostRateLimit menjaga jeda sopan per hostname tanpa menghambat domain berbeda', async () => {
    resetHostRateLimitsForTest();
    let nowMs = 10_000;
    const sleeps: number[] = [];

    await enforceHostRateLimit('korankaltara.com', {
      minIntervalMs: 1_200,
      nowFn: () => nowMs,
      sleepFn: async (ms) => {
        sleeps.push(ms);
        nowMs += ms;
      },
    });
    // Hit kedua langsung pada host yang sama -> tunggu 1.200ms
    nowMs += 200;
    await enforceHostRateLimit('korankaltara.com', {
      minIntervalMs: 1_200,
      nowFn: () => nowMs,
      sleepFn: async (ms) => {
        sleeps.push(ms);
        nowMs += ms;
      },
    });
    // Host berbeda pada saat yang sama -> 0ms
    await enforceHostRateLimit('benuanta.co.id', {
      minIntervalMs: 1_200,
      nowFn: () => nowMs,
      sleepFn: async (ms) => {
        sleeps.push(ms);
        nowMs += ms;
      },
    });

    expect(sleeps).toEqual([1_000]);
    resetHostRateLimitsForTest();
  });
});

