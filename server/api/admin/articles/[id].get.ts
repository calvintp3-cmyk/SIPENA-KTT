// server/api/admin/articles/[id].get.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { getValidatedUuidParam } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const articleId = getValidatedUuidParam(event, 'id');

  const [item] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Artikel tidak ditemukan di database.',
    });
  }

  return { item };
});

