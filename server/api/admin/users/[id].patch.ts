// server/api/admin/users/[id].patch.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { UserRoleEnum } from '../../../../shared/enums/pdrb';
import { UpdateAdminUserSchema } from '../../../../shared/schemas/user.schema';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import {
  OAUTH_ONLY_PASSWORD_MARKER,
  hasLocalPasswordHash,
  hashPassword,
} from '../../../utils/password';
import { getValidatedUuidParam, parseBodyWithSchema } from '../../../utils/request';
import { requireSuperAdminRole, setSessionCookie } from '../../../utils/session';

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireSuperAdminRole(event);
  const targetUserId = getValidatedUuidParam(event, 'id');
  const body = await parseBodyWithSchema(event, UpdateAdminUserSchema);

  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Akun staf admin tidak ditemukan.',
    });
  }

  if (targetUserId === currentAdmin.id && body.isActive === false) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang login.',
    });
  }

  if (
    targetUserId === currentAdmin.id &&
    body.role !== undefined &&
    body.role !== UserRoleEnum.ADMIN
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Anda tidak dapat menurunkan peran Administrator Utama milik akun Anda sendiri.',
    });
  }

  const hasNewPassword =
    typeof body.password === 'string' && body.password.trim().length > 0;

  const shouldBumpTokenVersion =
    body.isActive === false ||
    (body.role !== undefined && body.role !== existing.role) ||
    (body.email !== undefined && body.email !== existing.email) ||
    hasNewPassword ||
    body.clearPassword === true;

  const nextTokenVersion = shouldBumpTokenVersion
    ? existing.tokenVersion + 1
    : existing.tokenVersion;

  try {
    const [updated] = await db
      .update(users)
      .set({
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(hasNewPassword ? { passwordHash: hashPassword(body.password as string) } : {}),
        ...(body.clearPassword === true && !hasNewPassword
          ? { passwordHash: OAUTH_ONLY_PASSWORD_MARKER }
          : {}),
        ...(shouldBumpTokenVersion ? { tokenVersion: nextTokenVersion } : {}),
      })
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
        tokenVersion: users.tokenVersion,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updated) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Akun staf admin tidak ditemukan.',
      });
    }

    // Perbarui cookie sesi aktif jika Administrator Utama memperbarui kredensialnya sendiri
    if (
      targetUserId === currentAdmin.id &&
      (shouldBumpTokenVersion || updated.name !== currentAdmin.name)
    ) {
      setSessionCookie(event, {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        tokenVersion: updated.tokenVersion,
      });
    }

    const { passwordHash, tokenVersion: _tv, ...safeUser } = updated;
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
        message: `Alamat email "${body.email}" sudah digunakan oleh akun admin lain.`,
      });
    }
    throw err;
  }
});

