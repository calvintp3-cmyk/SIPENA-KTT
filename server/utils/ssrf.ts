// server/utils/ssrf.ts
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class SsrfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfValidationError';
  }
}

export class ExternalFetchError extends Error {
  readonly statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ExternalFetchError';
    this.statusCode = statusCode;
  }
}

const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
]);

export const DEFAULT_FETCH_TIMEOUT_MS = 7_000;
export const DEFAULT_HOST_MIN_INTERVAL_MS = 1_200;

const hostNextAllowedAt = new Map<string, number>();

export function resetHostRateLimitsForTest(): void {
  hostNextAllowedAt.clear();
}

export interface HostRateLimitOptions {
  minIntervalMs?: number;
  nowFn?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

/**
 * Menjaga jeda sopan per domain host (`minIntervalMs` antar permintaan ke host yang sama)
 * tanpa menghambat domain berbeda agar tidak memicu WAF/rate-limit portal lokal.
 */
export async function enforceHostRateLimit(
  hostname: string,
  options: HostRateLimitOptions = {},
): Promise<void> {
  const minIntervalMs = Math.max(0, options.minIntervalMs ?? DEFAULT_HOST_MIN_INTERVAL_MS);
  const key = hostname.trim().toLowerCase().replace(/^www\./, '');
  if (!key || minIntervalMs <= 0) return;

  const nowFn = options.nowFn ?? (() => Date.now());
  const sleepFn =
    options.sleepFn ??
    ((ms: number) =>
      new Promise<void>((resolve, reject) => {
        if (options.signal?.aborted) {
          reject(options.signal.reason ?? createAbortError('Pipeline dibatalkan.'));
          return;
        }
        const onAbort = () => {
          clearTimeout(timer);
          reject(options.signal?.reason ?? createAbortError('Pipeline dibatalkan.'));
        };
        const timer = setTimeout(() => {
          options.signal?.removeEventListener('abort', onAbort);
          resolve();
        }, ms);
        options.signal?.addEventListener('abort', onAbort, { once: true });
      }));

  const currentNow = nowFn();
  const reservedAt = hostNextAllowedAt.get(key) ?? 0;
  const targetAt = Math.max(currentNow, reservedAt);
  hostNextAllowedAt.set(key, targetAt + minIntervalMs);

  const waitMs = targetAt - currentNow;
  if (waitMs > 0) {
    await sleepFn(waitMs);
  }
}

export const DEFAULT_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const DEFAULT_BROWSER_HEADERS: Readonly<Record<string, string>> = {
  'user-agent': DEFAULT_BROWSER_USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'upgrade-insecure-requests': '1',
};

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return 0;
  }
  const [a = 0, b = 0, c = 0, d = 0] = parts;
  return (((a << 24) >>> 0) | (b << 16) | (c << 8) | d) >>> 0;
}

function isForbiddenIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const first = (n >>> 24) & 0xff;
  const second = (n >>> 16) & 0xff;

  if (first === 0) return true; // 0.0.0.0/8 ("this network")
  if (first === 10) return true; // 10.0.0.0/8 (RFC1918 private)
  if (first === 100 && second >= 64 && second <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (first === 127) return true; // 127.0.0.0/8 (loopback)
  if (first === 169 && second === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
  if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (first === 192 && second === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (first === 192 && second === 0 && ((n >>> 8) & 0xff) === 0) return true; // 192.0.0.0/24
  if (first === 192 && second === 0 && ((n >>> 8) & 0xff) === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (first === 198 && (second === 18 || second === 19)) return true; // 198.18.0.0/15 benchmarking
  if (first === 198 && second === 51 && ((n >>> 8) & 0xff) === 100) return true; // TEST-NET-2
  if (first === 203 && second === 0 && ((n >>> 8) & 0xff) === 113) return true; // TEST-NET-3
  if (first >= 224) return true; // 224.0.0.0/4 multicast & 240.0.0.0/4 reserved & broadcast

  return false;
}

function expandIpv6ToWords(rawIpv6: string): number[] | null {
  const withoutZone = rawIpv6.split('%')[0]?.toLowerCase() ?? '';
  if (!withoutZone) return null;

  // Handle IPv4-embedded suffix (e.g., ::ffff:127.0.0.1)
  let normalized = withoutZone;
  const lastColon = normalized.lastIndexOf(':');
  if (lastColon !== -1 && normalized.slice(lastColon + 1).includes('.')) {
    const ipv4Part = normalized.slice(lastColon + 1);
    if (isIP(ipv4Part) !== 4) return null;
    const v4Int = ipv4ToInt(ipv4Part);
    const highHex = ((v4Int >>> 16) & 0xffff).toString(16);
    const lowHex = (v4Int & 0xffff).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${highHex}:${lowHex}`;
  }

  const doubleColonParts = normalized.split('::');
  if (doubleColonParts.length > 2) return null;

  const parseGroups = (part: string): number[] | null => {
    if (!part) return [];
    const groups = part.split(':');
    const out: number[] = [];
    for (const g of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(Number.parseInt(g, 16));
    }
    return out;
  };

  if (doubleColonParts.length === 1) {
    const words = parseGroups(doubleColonParts[0] ?? '');
    return words && words.length === 8 ? words : null;
  }

  const left = parseGroups(doubleColonParts[0] ?? '');
  const right = parseGroups(doubleColonParts[1] ?? '');
  if (!left || !right) return null;

  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;

  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

/**
 * Mengembalikan true jika IP adalah loopback, private, link-local, CGNAT, multicast, atau reserved.
 */
export function isForbiddenIp(rawIp: string): boolean {
  const cleanIp = rawIp.trim().replace(/^\[|\]$/g, '').split('%')[0] ?? '';
  const version = isIP(cleanIp);

  if (version === 4) {
    return isForbiddenIpv4(cleanIp);
  }

  if (version === 6) {
    const words = expandIpv6ToWords(cleanIp);
    if (!words || words.length !== 8) return true;

    const isAllZero = words.every((w) => w === 0);
    if (isAllZero) return true; // :: unspecified

    const isLoopback = words.slice(0, 7).every((w) => w === 0) && words[7] === 1;
    if (isLoopback) return true; // ::1

    const firstWord = words[0] ?? 0;
    if ((firstWord & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local IPv6
    if ((firstWord & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-Local
    if ((firstWord & 0xff00) === 0xff00) return true; // ff00::/8 Multicast

    // IPv4-mapped IPv6 (::ffff:0:0/96) atau IPv4-compatible (::/96)
    const isIpv4Mapped = words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff;
    const isIpv4Compat = words.slice(0, 6).every((w) => w === 0);
    if (isIpv4Mapped || isIpv4Compat) {
      const w6 = words[6] ?? 0;
      const w7 = words[7] ?? 0;
      const mappedIpv4 = `${(w6 >>> 8) & 0xff}.${w6 & 0xff}.${(w7 >>> 8) & 0xff}.${w7 & 0xff}`;
      return isForbiddenIpv4(mappedIpv4);
    }

    // NAT64 well-known prefix 64:ff9b::/96 & 64:ff9b:1::/48
    if (words[0] === 0x0064 && words[1] === 0xff9b) {
      const w6 = words[6] ?? 0;
      const w7 = words[7] ?? 0;
      const embeddedIpv4 = `${(w6 >>> 8) & 0xff}.${w6 & 0xff}.${(w7 >>> 8) & 0xff}.${w7 & 0xff}`;
      return isForbiddenIpv4(embeddedIpv4);
    }

    return false;
  }

  return true;
}

export type DnsLookupFn = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultDnsLookup: DnsLookupFn = async (hostname) => {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results;
};

/**
 * Memvalidasi URL eksternal sebelum melakukan koneksi HTTP (mitigasi SSRF).
 */
export async function validateExternalUrl(
  rawUrl: string,
  dnsLookup: DnsLookupFn = defaultDnsLookup,
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new SsrfValidationError(`URL tidak valid: "${rawUrl}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfValidationError(`Protokol "${parsed.protocol}" dilarang; hanya http/https.`);
  }

  if (parsed.username || parsed.password) {
    throw new SsrfValidationError('URL tidak boleh mengandung kredensial user:pass.');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) {
    throw new SsrfValidationError('Hostname URL kosong.');
  }

  if (
    FORBIDDEN_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    throw new SsrfValidationError(`Hostname internal "${hostname}" diblokir oleh SSRF Guard.`);
  }

  if (isIP(hostname) !== 0) {
    if (isForbiddenIp(hostname)) {
      throw new SsrfValidationError(`Alamat IP privat/reserved "${hostname}" diblokir.`);
    }
    return parsed;
  }

  let resolved: Array<{ address: string; family: number }>;
  try {
    resolved = await dnsLookup(hostname);
  } catch (err) {
    throw new SsrfValidationError(
      `Gagal melakukan resolusi DNS untuk "${hostname}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!resolved || resolved.length === 0) {
    throw new SsrfValidationError(`DNS tidak mengembalikan alamat IP untuk "${hostname}".`);
  }

  for (const record of resolved) {
    if (isForbiddenIp(record.address)) {
      throw new SsrfValidationError(
        `Domain "${hostname}" mengarah ke IP privat/terlarang (${record.address}).`,
      );
    }
  }

  return parsed;
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  dnsLookup?: DnsLookupFn;
  politeHostPacing?: boolean;
  minHostIntervalMs?: number;
}

export interface SafeFetchResult {
  finalUrl: string;
  body: string;
  contentType: string;
  status: number;
}

function createAbortError(message: string): Error {
  const err = new Error(message);
  err.name = 'AbortError';
  return err;
}

async function readResponseWithByteCap(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string> {
  if (signal.aborted) {
    throw createAbortError('Request dibatalkan karena batas waktu tercapai.');
  }

  const declaredLen = response.headers.get('content-length');
  if (declaredLen && Number(declaredLen) > maxBytes) {
    throw new ExternalFetchError(
      `Ukuran respons melebihi batas ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
      response.status,
    );
  }

  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new ExternalFetchError('Ukuran respons teks melebihi batas maksimal.', response.status);
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  const onAbort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (signal.aborted) {
        await reader.cancel().catch(() => {});
        throw createAbortError('Streaming respons dibatalkan karena timeout.');
      }

      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new ExternalFetchError(
            `Streaming respons melebihi batas ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
            response.status,
          );
        }
        chunks.push(value);
      }
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }

  const merged = Buffer.concat(chunks);
  return merged.toString('utf8');
}

/**
 * Mengambil dokumen HTML/XML eksternal secara aman:
 * - Memvalidasi setiap hop redirect melalui `validateExternalUrl` (`redirect: 'manual'`, maks 3 hop)
 * - Timeout ketat default 7 detik via AbortController
 * - Header User-Agent Chrome desktop lengkap + Accept-Language Indonesia
 * - Batas maksimal body default 2 MB
 */
export async function safeFetchText(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? 3;
  const accept = options.accept ?? DEFAULT_BROWSER_HEADERS.accept!;
  const userAgent = options.userAgent ?? DEFAULT_BROWSER_USER_AGENT;

  const controller = new AbortController();
  let timedOut = false;

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    controller.abort(createAbortError(`Timeout melebihi ${timeoutMs}ms saat mengambil ${rawUrl}`));
  }, timeoutMs);

  const externalSignal = options.signal;
  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason ?? createAbortError('Pipeline dibatalkan.'));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutHandle);
      throw new ExternalFetchError(`Eksekusi dibatalkan sebelum mengambil ${rawUrl}.`);
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let currentUrl = rawUrl;
  let redirectsLeft = maxRedirects;

  try {
    while (true) {
      const validatedUrl = await validateExternalUrl(currentUrl, options.dnsLookup);

      if (options.politeHostPacing || (options.minHostIntervalMs ?? 0) > 0) {
        await enforceHostRateLimit(validatedUrl.hostname, {
          minIntervalMs: options.minHostIntervalMs ?? DEFAULT_HOST_MIN_INTERVAL_MS,
          signal: controller.signal,
        });
      }

      let response: Response;
      try {
        response = await fetch(validatedUrl.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            ...DEFAULT_BROWSER_HEADERS,
            'user-agent': userAgent,
            accept,
            ...options.headers,
          },
        });
      } catch (err) {
        if (timedOut) {
          throw new ExternalFetchError(
            `Timeout >${timeoutMs}ms saat menghubungi ${validatedUrl.hostname}`,
          );
        }
        throw new ExternalFetchError(
          `Gagal menghubungi ${validatedUrl.hostname}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel().catch(() => {});

        if (!location) {
          throw new ExternalFetchError(
            `HTTP redirect ${response.status} tanpa header Location.`,
            response.status,
          );
        }
        if (redirectsLeft <= 0) {
          throw new ExternalFetchError(
            `Redirect melebihi batas maksimal (${maxRedirects} hop).`,
            response.status,
          );
        }

        currentUrl = new URL(location, validatedUrl).toString();
        redirectsLeft -= 1;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new ExternalFetchError(
          `HTTP ${response.status} dari ${validatedUrl.hostname}`,
          response.status,
        );
      }

      const body = await readResponseWithByteCap(response, maxBytes, controller.signal);
      const contentType = response.headers.get('content-type') ?? '';

      return {
        finalUrl: validatedUrl.toString(),
        body,
        contentType,
        status: response.status,
      };
    }
  } catch (err) {
    if (err instanceof SsrfValidationError || err instanceof ExternalFetchError) {
      throw err;
    }
    if (timedOut) {
      throw new ExternalFetchError(`Timeout >${timeoutMs}ms saat membaca respons dari ${rawUrl}`);
    }
    throw new ExternalFetchError(
      `Gagal membaca respons ${rawUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timeoutHandle);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

