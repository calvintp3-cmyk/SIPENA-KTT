// server/api/auth/login.post.ts
import { eq, sql } from 'drizzle-orm';
import { createError, defineEventHandler, setResponseHeader } from 'h3';
import { LoginRequestSchema } from '../../../shared/schemas/auth.schema';
import { db } from '../../db';
import { users } from '../../db/schema';
import { DUMMY_SCRYPT_HASH, verifyPassword } from '../../utils/password';
import {
  checkLoginRateLimit,
  getClientIp,
  resetLoginRateLimit,
} from '../../utils/rate-limit';
import { parseBodyWithSchema } from '../../utils/request';
import { setSessionCookie } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const clientIp = getClientIp(event);
  const rateLimit = checkLoginRateLimit(clientIp);

  if (!rateLimit.allowed) {
    setResponseHeader(event, 'Retry-After', rateLimit.retryAfterSeconds);
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
    });
  }

  const body = await parseBodyWithSchema(event, LoginRequestSchema);

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      role: users.role,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${body.email}`)
    .limit(1);

  // Evaluasi scrypt selalu dieksekusi bahkan jika akun tidak terdaftar (constant-time defense against timing attacks)
  const passwordValid = user && user.isActive
    ? verifyPassword(body.password, user.passwordHash)
    : verifyPassword(body.password, DUMMY_SCRYPT_HASH);

  if (!user || !user.isActive || !passwordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Email atau kata sandi salah.',
    });
  }

  resetLoginRateLimit(clientIp);

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };

  setSessionCookie(event, authUser);

  return {
    user: {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
    },
  };
});
