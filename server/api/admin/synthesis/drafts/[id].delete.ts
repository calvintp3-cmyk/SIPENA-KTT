// server/api/admin/synthesis/drafts/[id].delete.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../../../../db';
import { synthesisDrafts } from '../../../../db/schema';
import { getValidatedUuidParam } from '../../../../utils/request';
import { requireAdminSession } from '../../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const draftId = getValidatedUuidParam(event, 'id');

  const [deleted] = await db
    .delete(synthesisDrafts)
    .where(eq(synthesisDrafts.id, draftId))
    .returning({ id: synthesisDrafts.id });

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Draf sintesis yang ingin dihapus tidak ditemukan.',
    });
  }

  return { ok: true, id: deleted.id };
});

