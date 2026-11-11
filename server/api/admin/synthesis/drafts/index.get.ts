// server/api/admin/synthesis/drafts/index.get.ts
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { defineEventHandler } from 'h3';
import { ListSynthesisDraftsQuerySchema } from '../../../../../shared/schemas/synthesis.schema';
import { db } from '../../../../db';
import { synthesisDrafts, users } from '../../../../db/schema';
import { parseQueryWithSchema } from '../../../../utils/request';
import { requireAdminSession } from '../../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const query = parseQueryWithSchema(event, ListSynthesisDraftsQuerySchema);

  const conditions: SQL[] = [];
  if (query.year !== undefined) conditions.push(eq(synthesisDrafts.year, query.year));
  if (query.quarter !== undefined) conditions.push(eq(synthesisDrafts.quarter, query.quarter));
  if (query.dimension !== undefined) conditions.push(eq(synthesisDrafts.dimension, query.dimension));
  if (query.targetCode !== undefined) {
    conditions.push(eq(synthesisDrafts.targetCode, query.targetCode));
  }

  const creatorUser = alias(users, 'creator_user');
  const updaterUser = alias(users, 'updater_user');

  const items = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(synthesisDrafts.updatedAt), desc(synthesisDrafts.createdAt))
    .limit(query.limit);

  return { items };
});

