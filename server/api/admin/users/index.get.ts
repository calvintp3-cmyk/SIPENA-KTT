// server/api/admin/users/index.get.ts
import { asc } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { hasLocalPasswordHash } from '../../../utils/password';
import { requireSuperAdminRole } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireSuperAdminRole(event);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(asc(users.role), asc(users.name), asc(users.createdAt));

  return {
    items: rows.map(({ passwordHash, ...rest }) => ({
      ...rest,
      hasPassword: hasLocalPasswordHash(passwordHash),
    })),
  };
});

