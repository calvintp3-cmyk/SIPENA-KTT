// server/api/admin/keywords/index.post.ts
import { createError, defineEventHandler, setResponseStatus } from 'h3';
import { CreateKeywordSchema } from '../../../../shared/schemas/keyword.schema';
import { db } from '../../../db';
import { nationalKeywords } from '../../../db/schema';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, CreateKeywordSchema);

  try {
    const [created] = await db
      .insert(nationalKeywords)
      .values({
        keyword: body.keyword,
        defaultKbliCategory: body.defaultKbliCategory ?? null,
        defaultExpenditureComponent: body.defaultExpenditureComponent ?? null,
        description: body.description ?? null,
        isActive: body.isActive,
        createdBy: adminUser.id,
      })
      .returning();

    setResponseStatus(event, 201);
    return {
      item: created ? { ...created, articleCount: 0 } : null,
    };
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: `Kata kunci "${body.keyword}" sudah terdaftar.`,
      });
    }
    throw err;
  }
});

