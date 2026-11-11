// server/api/auth/logout.post.ts
import { defineEventHandler } from 'h3';
import { clearSessionCookie } from '../../utils/session';

export default defineEventHandler((event) => {
  clearSessionCookie(event);
  return { ok: true };
});

