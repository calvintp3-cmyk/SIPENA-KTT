// server/utils/google-oauth.ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import {
  deleteCookie,
  getCookie,
  getRequestURL,
  setCookie,
  type H3Event,
} from 'h3';
import {
  getConfiguredSessionSecret,
  shouldUseSecureCookie,
} from './session';

export const GOOGLE_OAUTH_COOKIE_NAME = 'sipena_google_oauth';
export const GOOGLE_OAUTH_COOKIE_PATH = '/api/auth/google';
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 600; // 10 menit
export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

const GOOGLE_VALID_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  configured: boolean;
}

export interface GoogleOAuthStatePayload {
  state: string;
  codeVerifier: string;
  redirectTo: string;
  redirectUri: string;
  iat: number;
  exp: number;
}

export interface VerifiedGoogleIdentity {
  email: string;
  emailVerified: boolean;
  name: string;
  sub: string;
}

function isUnconfiguredPlaceholder(value: string): boolean {
  if (!value) return true;
  const upper = value.toUpperCase();
  return upper.includes('GANTI_') || upper.includes('YOUR_GOOGLE_');
}

/**
 * Membaca konfigurasi Google OAuth secara aman dari environment runtime tanpa melempar error
 * saat variabel masih kosong (mendukung build/typecheck sebelum .env diisi).
 */
export function getGoogleOAuthConfig(overrides?: {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}): GoogleOAuthConfig {
  const clientId = (
    overrides?.clientId ??
    process.env.NUXT_GOOGLE_CLIENT_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    ''
  ).trim();
  const clientSecret = (
    overrides?.clientSecret ??
    process.env.NUXT_GOOGLE_CLIENT_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    ''
  ).trim();
  const redirectUri = (
    overrides?.redirectUri ??
    process.env.NUXT_GOOGLE_REDIRECT_URI ??
    process.env.GOOGLE_REDIRECT_URI ??
    ''
  ).trim();

  const configured =
    !isUnconfiguredPlaceholder(clientId) && !isUnconfiguredPlaceholder(clientSecret);

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured,
  };
}

export function isConfiguredSuperAdminEmail(
  candidateEmail: string,
  configuredOverride?: string,
): boolean {
  const normalizedCandidate = candidateEmail.trim().toLowerCase();
  if (!normalizedCandidate || !normalizedCandidate.includes('@')) {
    return false;
  }

  const rawConfigured = (configuredOverride ?? process.env.SUPERADMIN_EMAIL ?? '').trim();
  if (!rawConfigured) {
    return false;
  }

  const allowedList = rawConfigured
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.includes('@'));

  return allowedList.includes(normalizedCandidate);
}

/**
 * Mencegah Open Redirect setelah login OAuth: hanya path relatif tunggal (`/admin/...`).
 */
export function sanitizeOAuthRedirectPath(rawTarget: unknown): string {
  if (typeof rawTarget !== 'string') return '/admin/review';
  const trimmed = rawTarget.trim();
  if (
    !trimmed ||
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    /[\r\n\0]/.test(trimmed) ||
    trimmed === '/login' ||
    trimmed.startsWith('/api/auth')
  ) {
    return '/admin/review';
  }
  return trimmed;
}

/**
 * Menentukan callback URL Google OAuth dari override eksplisit atau header reverse proxy Nginx.
 */
export function resolveGoogleRedirectUri(event: H3Event, configuredUri?: string): string {
  const candidate = configuredUri?.trim();
  if (candidate) {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('GOOGLE_REDIRECT_URI harus menggunakan protokol http:// atau https://.');
    }
    return candidate;
  }

  const reqUrl = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  return `${reqUrl.origin}/api/auth/google/callback`;
}

export function generateOAuthStateToken(): string {
  return randomBytes(24).toString('base64url');
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

function deriveOAuthStateKey(secret: string): Buffer {
  return createHash('sha256').update(`sipena-ktt-google-oauth:${secret}`, 'utf8').digest();
}

export function createGoogleOAuthStateCookieValue(
  data: Omit<GoogleOAuthStatePayload, 'iat' | 'exp'>,
  options?: { ttlSeconds?: number; secret?: string },
): string {
  const secret = getConfiguredSessionSecret(options?.secret);
  if (!secret) {
    throw new Error(
      '[Google OAuth] NUXT_SESSION_PASSWORD wajib dikonfigurasi (min. 32 karakter) untuk menandatangani state OAuth.',
    );
  }

  const key = deriveOAuthStateKey(secret);
  const ttl = options?.ttlSeconds ?? GOOGLE_OAUTH_STATE_TTL_SECONDS;
  const nowSec = Math.floor(Date.now() / 1000);

  const payload: GoogleOAuthStatePayload = {
    ...data,
    iat: nowSec,
    exp: nowSec + ttl,
  };

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function verifyGoogleOAuthStateCookieValue(
  token: string,
  secretOverride?: string,
  nowSecOverride?: number,
): GoogleOAuthStatePayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [ivB64, tagB64, cipherB64] = parts;
  if (!ivB64 || !tagB64 || !cipherB64) return null;

  const secret = getConfiguredSessionSecret(secretOverride);
  if (!secret) return null;

  try {
    const key = deriveOAuthStateKey(secret);
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ciphertext = Buffer.from(cipherB64, 'base64url');

    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
      return null;
    }

    const decipher = createDecipheriv(AES_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as Partial<GoogleOAuthStatePayload>;

    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      typeof parsed.redirectTo !== 'string' ||
      typeof parsed.redirectUri !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    const nowSec = nowSecOverride ?? Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSec) {
      return null;
    }

    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      redirectTo: sanitizeOAuthRedirectPath(parsed.redirectTo),
      redirectUri: parsed.redirectUri,
      iat: typeof parsed.iat === 'number' ? parsed.iat : nowSec,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function setGoogleOAuthStateCookie(event: H3Event, token: string): void {
  setCookie(event, GOOGLE_OAUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(event),
    path: GOOGLE_OAUTH_COOKIE_PATH,
    maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
  });
}

export function getGoogleOAuthStateCookie(event: H3Event): string | undefined {
  return getCookie(event, GOOGLE_OAUTH_COOKIE_NAME);
}

export function clearGoogleOAuthStateCookie(event: H3Event): void {
  deleteCookie(event, GOOGLE_OAUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(event),
    path: GOOGLE_OAUTH_COOKIE_PATH,
  });
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${search.toString()}`;
}

export function decodeAndVerifyGoogleIdTokenClaims(
  idToken: string,
  expectedClientId: string,
  nowSecOverride?: number,
): VerifiedGoogleIdentity {
  const segments = idToken.split('.');
  if (segments.length !== 3 || !segments[1]) {
    throw new Error('Format id_token Google tidak valid.');
  }

  let claims: Record<string, unknown>;
  try {
    const json = Buffer.from(segments[1], 'base64url').toString('utf8');
    claims = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('Payload id_token Google gagal didekode.');
  }

  if (typeof claims.iss !== 'string' || !GOOGLE_VALID_ISSUERS.has(claims.iss)) {
    throw new Error('Issuer id_token Google tidak valid.');
  }

  const audMatches =
    claims.aud === expectedClientId ||
    (Array.isArray(claims.aud) && claims.aud.includes(expectedClientId));
  if (!audMatches) {
    throw new Error('Audience (aud) id_token Google tidak cocok dengan GOOGLE_CLIENT_ID.');
  }

  const nowSec = nowSecOverride ?? Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + 60 <= nowSec) {
    throw new Error('Token identitas Google telah kedaluwarsa.');
  }

  if (claims.email_verified !== true) {
    throw new Error('Email akun Google belum terverifikasi oleh Google.');
  }

  if (typeof claims.email !== 'string' || !claims.email.includes('@')) {
    throw new Error('Klaim email pada token Google tidak tersedia.');
  }

  if (typeof claims.sub !== 'string' || !claims.sub.trim()) {
    throw new Error('Klaim subjek (sub) Google tidak tersedia.');
  }

  const normalizedEmail = claims.email.trim().toLowerCase();
  const displayName =
    typeof claims.name === 'string' && claims.name.trim()
      ? claims.name.trim()
      : normalizedEmail.split('@')[0] || 'Staf Admin';

  return {
    email: normalizedEmail,
    emailVerified: true,
    name: displayName,
    sub: claims.sub.trim(),
  };
}

export async function exchangeGoogleCodeForUser(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchFn?: typeof fetch;
}): Promise<VerifiedGoogleIdentity> {
  const doFetch = params.fetchFn ?? fetch;

  const tokenBody = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: params.codeVerifier,
  });

  const tokenRes = await doFetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: tokenBody.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  const tokenPayload = (await tokenRes.json().catch(() => null)) as {
    access_token?: unknown;
    id_token?: unknown;
    error?: unknown;
    error_description?: unknown;
  } | null;

  if (!tokenRes.ok || !tokenPayload) {
    const errMsg =
      (typeof tokenPayload?.error_description === 'string' && tokenPayload.error_description) ||
      (typeof tokenPayload?.error === 'string' && tokenPayload.error) ||
      `HTTP ${tokenRes.status}`;
    throw new Error(`Penukaran kode otorisasi Google gagal: ${errMsg}`);
  }

  let identity: VerifiedGoogleIdentity | null = null;
  if (typeof tokenPayload.id_token === 'string' && tokenPayload.id_token.trim()) {
    identity = decodeAndVerifyGoogleIdTokenClaims(tokenPayload.id_token, params.clientId);
  }

  if (typeof tokenPayload.access_token === 'string' && tokenPayload.access_token.trim()) {
    const userInfoRes = await doFetch(GOOGLE_USERINFO_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (userInfoRes.ok) {
      const profile = (await userInfoRes.json().catch(() => null)) as {
        sub?: unknown;
        email?: unknown;
        email_verified?: unknown;
        name?: unknown;
      } | null;

      if (profile && typeof profile.email === 'string' && profile.email.includes('@')) {
        if (profile.email_verified !== true) {
          throw new Error('Alamat email pada profil Google belum terverifikasi.');
        }

        const profileEmail = profile.email.trim().toLowerCase();
        if (identity && identity.email !== profileEmail) {
          throw new Error('Ketidakcocokan email antara id_token dan profil Google.');
        }

        if (!identity) {
          identity = {
            email: profileEmail,
            emailVerified: true,
            name:
              typeof profile.name === 'string' && profile.name.trim()
                ? profile.name.trim()
                : profileEmail.split('@')[0] || 'Staf Admin',
            sub: typeof profile.sub === 'string' ? profile.sub.trim() : profileEmail,
          };
        }
      }
    } else if (!identity) {
      throw new Error(`Gagal mengambil profil pengguna Google (HTTP ${userInfoRes.status}).`);
    }
  }

  if (!identity) {
    throw new Error('Respons OAuth Google tidak menyertakan identitas email yang terverifikasi.');
  }

  return identity;
}

