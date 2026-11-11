// server/utils/session.ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  createError,
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
  type H3Event,
} from 'h3';
import { UserRoleEnum } from '../../shared/enums/pdrb';
import { db } from '../db';
import { users } from '../db/schema';

export const SESSION_COOKIE_NAME = 'sipena_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 jam sesuai docs/prd.md

const SESSION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRoleEnum;
  tokenVersion: number;
  iat: number; // epoch seconds
  exp: number; // epoch seconds
}

export interface AuthenticatedAdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleEnum;
  tokenVersion: number;
}

export function getConfiguredSessionSecret(secretOverride?: string): string | null {
  let secret = secretOverride;
  if (!secret) {
    secret = process.env.NUXT_SESSION_PASSWORD;
  }
  if (!secret || secret.length < 32 || secret.includes('GANTI_DENGAN_SECRET')) {
    return null;
  }
  return secret;
}

export function isSessionSecretConfigured(secretOverride?: string): boolean {
  return getConfiguredSessionSecret(secretOverride) !== null;
}

function getSessionSecret(secretOverride?: string): string {
  const secret = getConfiguredSessionSecret(secretOverride);
  if (!secret) {
    throw new Error(
      '[Session] NUXT_SESSION_PASSWORD wajib dikonfigurasi di .env dengan panjang minimal 32 karakter.',
    );
  }
  return secret;
}

function deriveAesKey(secret: string): Buffer {
  return createHash('sha256').update(`sipena-ktt-session:${secret}`, 'utf8').digest();
}

/**
 * Mengenkripsi dan menandatangani payload sesi memakai AES-256-GCM.
 */
export function createSessionToken(
  data: Omit<SessionPayload, 'iat' | 'exp'>,
  options?: { ttlSeconds?: number; secret?: string },
): string {
  const secret = getSessionSecret(options?.secret);
  const key = deriveAesKey(secret);
  const ttl = options?.ttlSeconds ?? SESSION_TTL_SECONDS;
  const nowSec = Math.floor(Date.now() / 1000);

  const payload: SessionPayload = {
    ...data,
    iat: nowSec,
    exp: nowSec + ttl,
  };

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(SESSION_ALGORITHM, key, iv, {
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

/**
 * Mendekripsi token sesi AES-256-GCM dan memeriksa masa berlaku (`exp`).
 */
export function verifySessionToken(
  token: string,
  secretOverride?: string,
): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [ivB64, tagB64, cipherB64] = parts;
  if (!ivB64 || !tagB64 || !cipherB64) return null;

  let secret: string;
  try {
    secret = getSessionSecret(secretOverride);
  } catch {
    return null;
  }

  try {
    const key = deriveAesKey(secret);
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ciphertext = Buffer.from(cipherB64, 'base64url');

    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
      return null;
    }

    const decipher = createDecipheriv(SESSION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as Partial<SessionPayload>;

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.tokenVersion !== 'number' ||
      typeof parsed.exp !== 'number' ||
      !Object.values(UserRoleEnum).includes(parsed.role as UserRoleEnum)
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSec) {
      return null;
    }

    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export function shouldUseSecureCookie(event: H3Event): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  return getRequestProtocol(event, { xForwardedProto: true }) === 'https';
}

export function setSessionCookie(
  event: H3Event,
  user: AuthenticatedAdminUser,
): void {
  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(event),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(event),
    path: '/',
  });
}

export function getSessionFromEvent(event: H3Event): SessionPayload | null {
  const rawCookie = getCookie(event, SESSION_COOKIE_NAME);
  if (!rawCookie) return null;
  return verifySessionToken(rawCookie);
}

/**
 * Mengambil user terautentikasi dari cookie + verifikasi status aktif & `token_version` DB.
 */
export async function resolveActiveSessionUser(
  event: H3Event,
): Promise<AuthenticatedAdminUser | null> {
  const session = getSessionFromEvent(event);
  if (!session) return null;

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);

  if (!dbUser || dbUser.tokenVersion !== session.tokenVersion) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    tokenVersion: dbUser.tokenVersion,
  };
}

/**
 * Guard ketat untuk endpoint `/api/admin/**`: memastikan user aktif dan berhak mengakses panel admin.
 */
export async function requireAdminSession(event: H3Event): Promise<AuthenticatedAdminUser> {
  const cached = event.context.authUser as AuthenticatedAdminUser | undefined;
  if (cached) {
    return cached;
  }

  const activeUser = await resolveActiveSessionUser(event);
  if (!activeUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.',
    });
  }

  if (activeUser.role !== UserRoleEnum.ADMIN && activeUser.role !== UserRoleEnum.OPERATOR) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Akun Anda tidak memiliki izin akses ruang kerja admin.',
    });
  }

  event.context.authUser = activeUser;
  return activeUser;
}

/**
 * Guard ketat untuk pengelolaan daftar whitelist & peran staf: wajib role `ADMIN` utama.
 */
export async function requireSuperAdminRole(event: H3Event): Promise<AuthenticatedAdminUser> {
  const user = await requireAdminSession(event);
  if (user.role !== UserRoleEnum.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Hanya Administrator Utama yang berhak mengelola daftar akses admin.',
    });
  }
  return user;
}

