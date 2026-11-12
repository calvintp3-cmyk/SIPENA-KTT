// server/middleware/02-admin-auth.ts
import { defineEventHandler, getRequestURL } from 'h3';
import { isAdminApiPath } from '../utils/admin-path';
import { requireAdminSession } from '../utils/session';

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event);
  if (isAdminApiPath(pathname)) {
    await requireAdminSession(event);
  }
});

