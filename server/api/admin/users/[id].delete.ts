// server/api/admin/users/[id].delete.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { getValidatedUuidParam } from '../../../utils/request';
import { requireSuperAdminRole } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireSuperAdminRole(event);
  const targetUserId = getValidatedUuidParam(event, 'id');

  if (targetUserId === currentAdmin.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang login.',
    });
  }

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, targetUserId))
    .returning({ id: users.id, email: users.email });

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Akun staf admin yang ingin dihapus tidak ditemukan.',
    });
  }

  return { ok: true, id: deleted.id };
});

