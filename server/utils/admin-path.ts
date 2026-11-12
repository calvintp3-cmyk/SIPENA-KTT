// server/utils/admin-path.ts

/**
 * Memeriksa apakah path request HTTP menargetkan namespace `/api/admin` secara case-insensitive,
 * aman terhadap variasi casing, garis miring ganda, atau percent-encoding (`GHSA-vjh5-4x84-xrqp`).
 */
export function isAdminApiPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }

  const normalized = decoded.replace(/\/{2,}/g, '/').toLowerCase();
  return normalized === '/api/admin' || normalized.startsWith('/api/admin/');
}

