// server/api/admin/users/index.post.ts
import { createError, defineEventHandler, setResponseStatus } from 'h3';
import { CreateAdminUserSchema } from '../../../../shared/schemas/user.schema';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import {
  OAUTH_ONLY_PASSWORD_MARKER,
  hasLocalPasswordHash,
  hashPassword,
} from '../../../utils/password';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireSuperAdminRole } from '../../../utils/session';

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

export default defineEventHandler(async (event) => {
  await requireSuperAdminRole(event);
  const body = await parseBodyWithSchema(event, CreateAdminUserSchema);

  const hasPasswordInput =
    typeof body.password === 'string' && body.password.trim().length > 0;
  const storedHash = hasPasswordInput
    ? hashPassword(body.password as string)
    : OAUTH_ONLY_PASSWORD_MARKER;

  try {
    const [created] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        passwordHash: storedHash,
        role: body.role,
        isActive: body.isActive,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    setResponseStatus(event, 201);
    if (!created) {
      return { item: null };
    }

    const { passwordHash, ...safeUser } = created;
    return {
      item: {
        ...safeUser,
        hasPassword: hasLocalPasswordHash(passwordHash),
      },
    };
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: `Alamat email "${body.email}" sudah terdaftar pada daftar akses admin.`,
      });
    }
    throw err;
  }
});

