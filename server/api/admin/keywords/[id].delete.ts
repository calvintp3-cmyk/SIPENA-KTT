// server/api/admin/keywords/[id].delete.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../../../db';
import { nationalKeywords } from '../../../db/schema';
import { getValidatedUuidParam } from '../../../utils/request';

export default defineEventHandler(async (event) => {
  const keywordId = getValidatedUuidParam(event, 'id');

  const [deleted] = await db
    .delete(nationalKeywords)
    .where(eq(nationalKeywords.id, keywordId))
    .returning({ id: nationalKeywords.id });

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Keyword yang ingin dihapus tidak ditemukan.',
    });
  }

  return { ok: true, id: deleted.id };
});

