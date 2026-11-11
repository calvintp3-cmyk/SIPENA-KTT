// server/utils/url-hash.ts
import { createHash } from 'node:crypto';

const TRACKING_QUERY_KEYS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'yclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref_src',
  'ref',
  'source',
  'si',
  'spm',
  '_hsenc',
  '_hsmi',
]);

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lower);
}

/**
 * Memeriksa apakah string adalah URL http/https yang valid.
 */
export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Menormalisasi URL eksternal untuk mencegah duplikasi akibat parameter pelacakan (`utm_*`),
 * fragment (`#`), huruf besar host, default port, atau trailing slash.
 */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const url = new URL(trimmed);

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';

  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  // Hapus parameter pelacakan umum lalu urutkan sisa parameter agar deterministik
  const keptEntries: Array<[string, string]> = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (!isTrackingParam(key)) {
      keptEntries.push([key, value]);
    }
  }
  keptEntries.sort(([aKey, aVal], [bKey, bVal]) =>
    aKey === bKey ? aVal.localeCompare(bVal) : aKey.localeCompare(bKey),
  );

  url.search = '';
  for (const [key, value] of keptEntries) {
    url.searchParams.append(key, value);
  }

  // Normalisasi trailing slash pada path non-root
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  }

  return url.toString();
}

/**
 * Menghasilkan URL ternormalisasi & digest SHA-256 (64 karakter hex) untuk deduplikasi `articles.url_hash`.
 */
export function hashNormalizedUrl(rawUrlOrRef: string): {
  normalizedUrl: string;
  urlHash: string;
} {
  const trimmed = rawUrlOrRef.trim();
  let normalizedUrl: string;

  if (isSafeHttpUrl(trimmed)) {
    normalizedUrl = normalizeUrl(trimmed);
  } else {
    normalizedUrl = trimmed.replace(/\s+/g, ' ');
  }

  const urlHash = createHash('sha256').update(normalizedUrl, 'utf8').digest('hex');
  return { normalizedUrl, urlHash };
}

/**
 * Mengambil nama domain bersih tanpa awalan `www.` untuk kolom `source_portal`.
 */
export function extractHostnameLabel(rawUrl: string): string {
  try {
    const { hostname } = new URL(rawUrl.trim());
    return hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

