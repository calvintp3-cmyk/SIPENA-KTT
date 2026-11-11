// server/api/auth/google/callback.get.ts
import { eq, sql } from 'drizzle-orm';
import { defineEventHandler, getQuery, sendRedirect } from 'h3';
import { UserRoleEnum } from '../../../../shared/enums/pdrb';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import {
  clearGoogleOAuthStateCookie,
  exchangeGoogleCodeForUser,
  getGoogleOAuthConfig,
  getGoogleOAuthStateCookie,
  sanitizeOAuthRedirectPath,
  timingSafeEqualStrings,
  verifyGoogleOAuthStateCookieValue,
} from '../../../utils/google-oauth';
import { getClientIp, resetLoginRateLimit } from '../../../utils/rate-limit';
import { isSessionSecretConfigured, setSessionCookie } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  const rawStateCookie = getGoogleOAuthStateCookie(event);
  // Bersihkan cookie PKCE/state sesegera mungkin agar tidak dapat dipakai ulang (anti-replay)
  clearGoogleOAuthStateCookie(event);

  const config = getGoogleOAuthConfig();
  if (!config.configured) {
    return sendRedirect(event, '/login?oauth_error=google_not_configured', 302);
  }

  if (!isSessionSecretConfigured()) {
    return sendRedirect(event, '/login?oauth_error=session_not_configured', 302);
  }

  const query = getQuery(event);
  const oauthError = typeof query.error === 'string' ? query.error.trim() : '';
  if (oauthError) {
    const mappedError = oauthError === 'access_denied' ? 'access_denied' : 'oauth_failed';
    return sendRedirect(event, `/login?oauth_error=${mappedError}`, 302);
  }

  const code = typeof query.code === 'string' ? query.code.trim() : '';
  const state = typeof query.state === 'string' ? query.state.trim() : '';

  const savedState = rawStateCookie
    ? verifyGoogleOAuthStateCookieValue(rawStateCookie)
    : null;

  if (!savedState || !code || !state || !timingSafeEqualStrings(state, savedState.state)) {
    return sendRedirect(event, '/login?oauth_error=invalid_state', 302);
  }

  let googleIdentity;
  try {
    googleIdentity = await exchangeGoogleCodeForUser({
      code,
      codeVerifier: savedState.codeVerifier,
      redirectUri: savedState.redirectUri,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Google OAuth Callback] Pertukaran kode/verifikasi profil gagal:', message);
    const codeParam = message.toLowerCase().includes('belum terverifikasi')
      ? 'email_unverified'
      : 'oauth_failed';
    return sendRedirect(event, `/login?oauth_error=${codeParam}`, 302);
  }

  let dbUser:
    | {
        id: string;
        email: string;
        name: string;
        role: UserRoleEnum;
        isActive: boolean;
        tokenVersion: number;
      }
    | undefined;

  try {
    // Verifikasi ketat terhadap whitelist tabel `users` (case-insensitive) & status aktif
    const [foundUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        tokenVersion: users.tokenVersion,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${googleIdentity.email}`)
      .limit(1);

    dbUser = foundUser;

    if (!dbUser) {
      return sendRedirect(event, '/login?oauth_error=not_whitelisted', 302);
    }

    if (!dbUser.isActive) {
      return sendRedirect(event, '/login?oauth_error=account_inactive', 302);
    }

    if (dbUser.role !== UserRoleEnum.ADMIN && dbUser.role !== UserRoleEnum.OPERATOR) {
      return sendRedirect(event, '/login?oauth_error=forbidden_role', 302);
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, dbUser.id));
  } catch (err) {
    console.error(
      '[Google OAuth Callback] Gagal memverifikasi whitelist admin di database:',
      err instanceof Error ? err.message : 'Unknown DB error',
    );
    return sendRedirect(event, '/login?oauth_error=oauth_failed', 302);
  }

  resetLoginRateLimit(getClientIp(event));

  try {
    setSessionCookie(event, {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      tokenVersion: dbUser.tokenVersion,
    });
  } catch {
    return sendRedirect(event, '/login?oauth_error=session_not_configured', 302);
  }

  return sendRedirect(event, sanitizeOAuthRedirectPath(savedState.redirectTo), 302);
});
