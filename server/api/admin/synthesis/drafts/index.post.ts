// server/api/admin/synthesis/drafts/index.post.ts
import { defineEventHandler, setResponseStatus } from 'h3';
import { CreateSynthesisDraftSchema } from '../../../../../shared/schemas/synthesis.schema';
import { db } from '../../../../db';
import { synthesisDrafts } from '../../../../db/schema';
import { parseBodyWithSchema } from '../../../../utils/request';
import { requireAdminSession } from '../../../../utils/session';

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, CreateSynthesisDraftSchema);

  const uniqueArticleIds = Array.from(
    new Set(
      body.articleIds.length > 0 ? body.articleIds : body.citations.map((c) => c.id),
    ),
  );
  const articleCount =
    body.citations.length > 0 ? body.citations.length : uniqueArticleIds.length;

  const [created] = await db
    .insert(synthesisDrafts)
    .values({
      year: body.year,
      quarter: body.quarter,
      dimension: body.dimension,
      targetCode: body.targetCode,
      targetLabel: body.targetLabel,
      style: body.style,
      title: body.title,
      narrativeMarkdown: body.narrativeMarkdown,
      generationMode: body.generationMode,
      modelUsed: body.modelUsed,
      notice: body.notice,
      citations: body.citations,
      articleIds: uniqueArticleIds,
      articleCount,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    })
    .returning();

  setResponseStatus(event, 201);

  return {
    item: {
      ...created,
      createdByName: adminUser.name,
      updatedByName: adminUser.name,
    },
  };
});

