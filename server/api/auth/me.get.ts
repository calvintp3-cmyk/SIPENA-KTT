// server/api/auth/me.get.ts
import { createError, defineEventHandler } from 'h3';
import { resolveActiveSessionUser } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const activeUser = await resolveActiveSessionUser(event);
  if (!activeUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Tidak ada sesi login yang aktif.',
    });
  }

  return {
    user: {
      id: activeUser.id,
      email: activeUser.email,
      name: activeUser.name,
      role: activeUser.role,
    },
  };
});

