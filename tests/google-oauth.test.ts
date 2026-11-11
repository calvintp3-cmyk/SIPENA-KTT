// tests/google-oauth.test.ts
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { UserRoleEnum } from '#shared/enums/pdrb';
import {
  CreateAdminUserSchema,
  UpdateAdminUserSchema,
} from '#shared/schemas/user.schema';
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthStateCookieValue,
  decodeAndVerifyGoogleIdTokenClaims,
  exchangeGoogleCodeForUser,
  generateOAuthStateToken,
  generatePkcePair,
  getGoogleOAuthConfig,
  isConfiguredSuperAdminEmail,
  sanitizeOAuthRedirectPath,
  timingSafeEqualStrings,
  verifyGoogleOAuthStateCookieValue,
} from '#server/utils/google-oauth';
import {
  OAUTH_ONLY_PASSWORD_MARKER,
  hasLocalPasswordHash,
  hashPassword,
  verifyPassword,
} from '#server/utils/password';

const TEST_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const TEST_CLIENT_ID = '1234567890-abc.apps.googleusercontent.com';

function createFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesignature`;
}

describe('Google OAuth, PKCE State, & Admin Whitelist Security', () => {
  const savedEnv = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NUXT_GOOGLE_CLIENT_ID: process.env.NUXT_GOOGLE_CLIENT_ID,
    NUXT_GOOGLE_CLIENT_SECRET: process.env.NUXT_GOOGLE_CLIENT_SECRET,
  };

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = savedEnv.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = savedEnv.GOOGLE_CLIENT_SECRET;
    process.env.NUXT_GOOGLE_CLIENT_ID = savedEnv.NUXT_GOOGLE_CLIENT_ID;
    process.env.NUXT_GOOGLE_CLIENT_SECRET = savedEnv.NUXT_GOOGLE_CLIENT_SECRET;
  });

  it('tidak melempar error dan menandai configured=false saat env OAuth masih kosong', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.NUXT_GOOGLE_CLIENT_ID;
    delete process.env.NUXT_GOOGLE_CLIENT_SECRET;

    const emptyCfg = getGoogleOAuthConfig();
    expect(emptyCfg.configured).toBe(false);
    expect(emptyCfg.clientId).toBe('');
    expect(emptyCfg.clientSecret).toBe('');

    const configuredCfg = getGoogleOAuthConfig({
      clientId: TEST_CLIENT_ID,
      clientSecret: 'GOCSPX-test-secret-value',
    });
    expect(configuredCfg.configured).toBe(true);
  });

  it('menghasilkan PKCE S256 dan URL otorisasi Google yang valid', () => {
    const state = generateOAuthStateToken();
    const { codeVerifier, codeChallenge } = generatePkcePair();

    const expectedChallenge = createHash('sha256')
      .update(codeVerifier, 'ascii')
      .digest('base64url');
    expect(codeChallenge).toBe(expectedChallenge);

    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: TEST_CLIENT_ID,
        redirectUri: 'https://sipena6503.caplinlab.my.id/api/auth/google/callback',
        state,
        codeChallenge,
      }),
    );

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe(TEST_CLIENT_ID);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(codeChallenge);
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('prompt')).toBe('select_account');
  });

  it('mengenkripsi & memverifikasi cookie state OAuth AES-256-GCM dan menolak manipulasi / kadaluwarsa', () => {
    const token = createGoogleOAuthStateCookieValue(
      {
        state: 'state-123',
        codeVerifier: 'verifier-abc',
        redirectTo: '/admin/users',
        redirectUri: 'https://sipena6503.caplinlab.my.id/api/auth/google/callback',
      },
      { secret: TEST_SECRET, ttlSeconds: 600 },
    );

    const parsed = verifyGoogleOAuthStateCookieValue(token, TEST_SECRET);
    expect(parsed?.state).toBe('state-123');
    expect(parsed?.codeVerifier).toBe('verifier-abc');
    expect(parsed?.redirectTo).toBe('/admin/users');

    const tampered = `${token.slice(0, -4)}zzzz`;
    expect(verifyGoogleOAuthStateCookieValue(tampered, TEST_SECRET)).toBeNull();
    expect(verifyGoogleOAuthStateCookieValue(token, 'b'.repeat(64))).toBeNull();

    const expired = createGoogleOAuthStateCookieValue(
      {
        state: 'state-old',
        codeVerifier: 'verifier-old',
        redirectTo: '/admin/review',
        redirectUri: 'https://sipena6503.caplinlab.my.id/api/auth/google/callback',
      },
      { secret: TEST_SECRET, ttlSeconds: -10 },
    );
    expect(verifyGoogleOAuthStateCookieValue(expired, TEST_SECRET)).toBeNull();
  });

  it('mencegah Open Redirect pada parameter redirect pasca-OAuth dan memeriksa state secara timing-safe', () => {
    expect(sanitizeOAuthRedirectPath('/admin/review?tab=PENDING')).toBe('/admin/review?tab=PENDING');
    expect(sanitizeOAuthRedirectPath('https://evil.example/phish')).toBe('/admin/review');
    expect(sanitizeOAuthRedirectPath('//evil.example')).toBe('/admin/review');
    expect(sanitizeOAuthRedirectPath('/\\evil.example')).toBe('/admin/review');
    expect(sanitizeOAuthRedirectPath('/api/auth/google/callback')).toBe('/admin/review');
    expect(sanitizeOAuthRedirectPath('/login')).toBe('/admin/review');

    expect(timingSafeEqualStrings('abc123', 'abc123')).toBe(true);
    expect(timingSafeEqualStrings('abc123', 'abc124')).toBe(false);
    expect(timingSafeEqualStrings('abc', 'abcd')).toBe(false);
    expect(timingSafeEqualStrings('', '')).toBe(false);
  });

  it('memverifikasi klaim id_token Google dengan ketat (iss, aud, exp, email_verified)', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const validToken = createFakeJwt({
      iss: 'https://accounts.google.com',
      aud: TEST_CLIENT_ID,
      exp: futureExp,
      sub: '108899776655443322',
      email: 'Staf.Nerwilis@gmail.com',
      email_verified: true,
      name: 'Staf Nerwilis KTT',
    });

    const verified = decodeAndVerifyGoogleIdTokenClaims(validToken, TEST_CLIENT_ID);
    expect(verified.email).toBe('staf.nerwilis@gmail.com');
    expect(verified.emailVerified).toBe(true);
    expect(verified.name).toBe('Staf Nerwilis KTT');

    const unverifiedEmail = createFakeJwt({
      iss: 'https://accounts.google.com',
      aud: TEST_CLIENT_ID,
      exp: futureExp,
      sub: '123',
      email: 'unverified@gmail.com',
      email_verified: false,
    });
    expect(() => decodeAndVerifyGoogleIdTokenClaims(unverifiedEmail, TEST_CLIENT_ID)).toThrow();

    const wrongAud = createFakeJwt({
      iss: 'https://accounts.google.com',
      aud: 'other-client-id',
      exp: futureExp,
      sub: '123',
      email: 'staf@gmail.com',
      email_verified: true,
    });
    expect(() => decodeAndVerifyGoogleIdTokenClaims(wrongAud, TEST_CLIENT_ID)).toThrow();

    const expiredJwt = createFakeJwt({
      iss: 'https://accounts.google.com',
      aud: TEST_CLIENT_ID,
      exp: 1_000,
      sub: '123',
      email: 'staf@gmail.com',
      email_verified: true,
    });
    expect(() => decodeAndVerifyGoogleIdTokenClaims(expiredJwt, TEST_CLIENT_ID, 2_000)).toThrow();
  });

  it('menukar authorization code via endpoint Google dan mencocokkan profil userinfo', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const fakeIdToken = createFakeJwt({
      iss: 'https://accounts.google.com',
      aud: TEST_CLIENT_ID,
      exp: futureExp,
      sub: 'sub-777',
      email: 'Operator.KTT@gmail.com',
      email_verified: true,
      name: 'Operator KTT',
    });

    const mockFetch = (async (input: string | URL) => {
      const target = String(input);
      if (target.includes('/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'ya29.mock',
            id_token: fakeIdToken,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          sub: 'sub-777',
          email: 'operator.ktt@gmail.com',
          email_verified: true,
          name: 'Operator KTT',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const identity = await exchangeGoogleCodeForUser({
      code: '4/0AcvDMr-mock-code',
      codeVerifier: 'verifier-abc',
      redirectUri: 'https://sipena6503.caplinlab.my.id/api/auth/google/callback',
      clientId: TEST_CLIENT_ID,
      clientSecret: 'GOCSPX-mock',
      fetchFn: mockFetch,
    });

    expect(identity.email).toBe('operator.ktt@gmail.com');
    expect(identity.sub).toBe('sub-777');
  });

  it('menolak login kata sandi untuk akun whitelist OAuth-Only dan mengizinkan hash Scrypt sah', () => {
    expect(hasLocalPasswordHash(OAUTH_ONLY_PASSWORD_MARKER)).toBe(false);
    expect(verifyPassword('password-apapun', OAUTH_ONLY_PASSWORD_MARKER)).toBe(false);

    const scryptHash = hashPassword('KaltaraAman2026!');
    expect(hasLocalPasswordHash(scryptHash)).toBe(true);
    expect(verifyPassword('KaltaraAman2026!', scryptHash)).toBe(true);
  });

  it('memvalidasi skema Zod CreateAdminUserSchema dan UpdateAdminUserSchema untuk whitelist Gmail', () => {
    const oauthOnlyUser = CreateAdminUserSchema.parse({
      email: '  Staf.BPS@Gmail.com ',
      name: 'Staf Nerwilis',
      role: UserRoleEnum.OPERATOR,
      password: '',
    });
    expect(oauthOnlyUser.email).toBe('staf.bps@gmail.com');
    expect(oauthOnlyUser.isActive).toBe(true);

    expect(() =>
      CreateAdminUserSchema.parse({
        email: 'staf.bps@gmail.com',
        name: 'Staf Nerwilis',
        role: UserRoleEnum.OPERATOR,
        password: 'short',
      }),
    ).toThrow();

    const deactivate = UpdateAdminUserSchema.parse({ isActive: false });
    expect(deactivate.isActive).toBe(false);

    expect(() =>
      UpdateAdminUserSchema.parse({
        password: 'StrongPassword1234',
        clearPassword: true,
      }),
    ).toThrow();
  });

  it('mencocokkan SUPERADMIN_EMAIL secara case-insensitive termasuk dukungan multi-email koma', () => {
    expect(isConfiguredSuperAdminEmail('Boss@Gmail.com', 'boss@gmail.com')).toBe(true);
    expect(
      isConfiguredSuperAdminEmail(
        'kadis.nerwilis@gmail.com',
        'admin1@gmail.com, Kadis.Nerwilis@gmail.com ',
      ),
    ).toBe(true);
    expect(isConfiguredSuperAdminEmail('stranger@gmail.com', 'boss@gmail.com')).toBe(false);
    expect(isConfiguredSuperAdminEmail('boss@gmail.com', '')).toBe(false);
  });
});

