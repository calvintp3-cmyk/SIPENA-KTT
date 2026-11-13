// server/middleware/02-admin-auth.ts
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  getRequestHost,
  getRequestURL,
  type H3Event,
} from 'h3';
import { isAdminApiPath } from '../utils/admin-path';
import { requireAdminSession } from '../utils/session';

/**
 * Memvalidasi permintaan mutasi admin terhadap serangan Cross-Site Request Forgery (CSRF).
 * Memeriksa metadata `Sec-Fetch-Site` dan kesesuaian `Origin`/`Host`.
 */
export function isCsrfSafeRequest(event: H3Event): boolean {
  const method = event.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const secFetchSite = getRequestHeader(event, 'sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = getRequestHeader(event, 'origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const requestHost = getRequestHost(event, { xForwardedHost: true }).toLowerCase();
      if (originHost !== requestHost) {
        if (
          process.env.NODE_ENV !== 'production' &&
          (originHost.startsWith('localhost:') || originHost.startsWith('127.0.0.1:'))
        ) {
          return true;
        }
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event);
  if (isAdminApiPath(pathname)) {
    if (!isCsrfSafeRequest(event)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Akses ditolak: permintaan lintas situs (cross-origin) pada panel admin tidak diizinkan.',
      });
    }
    await requireAdminSession(event);
  }
});


