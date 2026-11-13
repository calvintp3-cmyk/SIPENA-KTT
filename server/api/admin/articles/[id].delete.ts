// server/api/admin/articles/[id].delete.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { getValidatedUuidParam } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';
import { invalidateOverviewCache } from '../../../utils/overview-cache';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const articleId = getValidatedUuidParam(event, 'id');

  const [deleted] = await db
    .delete(articles)
    .where(eq(articles.id, articleId))
    .returning({ id: articles.id });

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Artikel yang ingin dihapus tidak ditemukan.',
    });
  }

  invalidateOverviewCache();
  return { ok: true, id: deleted.id };
});

