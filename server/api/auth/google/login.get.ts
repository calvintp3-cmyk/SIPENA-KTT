// server/api/auth/google/login.get.ts
import { defineEventHandler, getQuery, sendRedirect } from 'h3';
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthStateCookieValue,
  generateOAuthStateToken,
  generatePkcePair,
  getGoogleOAuthConfig,
  resolveGoogleRedirectUri,
  sanitizeOAuthRedirectPath,
  setGoogleOAuthStateCookie,
} from '../../../utils/google-oauth';
import { checkLoginRateLimit, getClientIp } from '../../../utils/rate-limit';
import { isSessionSecretConfigured } from '../../../utils/session';

export default defineEventHandler((event) => {
  const clientIp = getClientIp(event);
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return sendRedirect(event, '/login?oauth_error=rate_limited', 302);
  }

  const config = getGoogleOAuthConfig();
  if (!config.configured) {
    return sendRedirect(event, '/login?oauth_error=google_not_configured', 302);
  }

  if (!isSessionSecretConfigured()) {
    return sendRedirect(event, '/login?oauth_error=session_not_configured', 302);
  }

  let redirectUri: string;
  try {
    redirectUri = resolveGoogleRedirectUri(event, config.redirectUri);
  } catch {
    return sendRedirect(event, '/login?oauth_error=google_not_configured', 302);
  }

  const query = getQuery(event);
  const redirectTo = sanitizeOAuthRedirectPath(query.redirect);
  const state = generateOAuthStateToken();
  const { codeVerifier, codeChallenge } = generatePkcePair();

  const encryptedState = createGoogleOAuthStateCookieValue({
    state,
    codeVerifier,
    redirectTo,
    redirectUri,
  });

  setGoogleOAuthStateCookie(event, encryptedState);

  const authorizeUrl = buildGoogleAuthorizationUrl({
    clientId: config.clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  return sendRedirect(event, authorizeUrl, 302);
});

