// server/api/admin/keywords/[id].patch.ts
import { count, eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { UpdateKeywordSchema } from '../../../../shared/schemas/keyword.schema';
import { db } from '../../../db';
import { articles, nationalKeywords } from '../../../db/schema';
import { getValidatedUuidParam, parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const keywordId = getValidatedUuidParam(event, 'id');
  const body = await parseBodyWithSchema(event, UpdateKeywordSchema);

  const [existing] = await db
    .select()
    .from(nationalKeywords)
    .where(eq(nationalKeywords.id, keywordId))
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Keyword tidak ditemukan.',
    });
  }

  try {
    const [updated] = await db
      .update(nationalKeywords)
      .set({
        ...(body.keyword !== undefined ? { keyword: body.keyword } : {}),
        ...(body.defaultKbliCategory !== undefined
          ? { defaultKbliCategory: body.defaultKbliCategory }
          : {}),
        ...(body.defaultExpenditureComponent !== undefined
          ? { defaultExpenditureComponent: body.defaultExpenditureComponent }
          : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      })
      .where(eq(nationalKeywords.id, keywordId))
      .returning();

    const [cntRow] = await db
      .select({ total: count() })
      .from(articles)
      .where(eq(articles.keywordId, keywordId));

    return {
      item: updated ? { ...updated, articleCount: Number(cntRow?.total ?? 0) } : null,
    };
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Kata kunci serupa sudah terdaftar.',
      });
    }
    throw err;
  }
});

