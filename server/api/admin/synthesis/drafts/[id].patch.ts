// server/api/admin/synthesis/drafts/[id].patch.ts
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { createError, defineEventHandler } from 'h3';
import { UpdateSynthesisDraftSchema } from '../../../../../shared/schemas/synthesis.schema';
import { db } from '../../../../db';
import { synthesisDrafts, users } from '../../../../db/schema';
import { getValidatedUuidParam, parseBodyWithSchema } from '../../../../utils/request';
import { requireAdminSession } from '../../../../utils/session';

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const draftId = getValidatedUuidParam(event, 'id');
  const body = await parseBodyWithSchema(event, UpdateSynthesisDraftSchema);

  const [existing] = await db
    .select({ id: synthesisDrafts.id })
    .from(synthesisDrafts)
    .where(eq(synthesisDrafts.id, draftId))
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Draf sintesis tidak ditemukan di database.',
    });
  }

  await db
    .update(synthesisDrafts)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.style !== undefined ? { style: body.style } : {}),
      ...(body.narrativeMarkdown !== undefined
        ? { narrativeMarkdown: body.narrativeMarkdown }
        : {}),
      updatedBy: adminUser.id,
    })
    .where(eq(synthesisDrafts.id, draftId));

  const creatorUser = alias(users, 'creator_user');
  const updaterUser = alias(users, 'updater_user');

  const [item] = await db
    .select({
      id: synthesisDrafts.id,
      year: synthesisDrafts.year,
      quarter: synthesisDrafts.quarter,
      dimension: synthesisDrafts.dimension,
      targetCode: synthesisDrafts.targetCode,
      targetLabel: synthesisDrafts.targetLabel,
      style: synthesisDrafts.style,
      title: synthesisDrafts.title,
      narrativeMarkdown: synthesisDrafts.narrativeMarkdown,
      generationMode: synthesisDrafts.generationMode,
      modelUsed: synthesisDrafts.modelUsed,
      notice: synthesisDrafts.notice,
      citations: synthesisDrafts.citations,
      articleIds: synthesisDrafts.articleIds,
      articleCount: synthesisDrafts.articleCount,
      createdBy: synthesisDrafts.createdBy,
      createdByName: creatorUser.name,
      updatedBy: synthesisDrafts.updatedBy,
      updatedByName: updaterUser.name,
      createdAt: synthesisDrafts.createdAt,
      updatedAt: synthesisDrafts.updatedAt,
    })
    .from(synthesisDrafts)
    .leftJoin(creatorUser, eq(synthesisDrafts.createdBy, creatorUser.id))
    .leftJoin(updaterUser, eq(synthesisDrafts.updatedBy, updaterUser.id))
    .where(eq(synthesisDrafts.id, draftId))
    .limit(1);

  return { item };
});

