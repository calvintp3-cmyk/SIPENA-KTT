// server/api/admin/keywords/index.get.ts
import { asc, count, desc, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { db } from '../../../db';
import { articles, nationalKeywords } from '../../../db/schema';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const rows = await db
    .select({
      id: nationalKeywords.id,
      keyword: nationalKeywords.keyword,
      defaultKbliCategory: nationalKeywords.defaultKbliCategory,
      defaultExpenditureComponent: nationalKeywords.defaultExpenditureComponent,
      description: nationalKeywords.description,
      isActive: nationalKeywords.isActive,
      createdBy: nationalKeywords.createdBy,
      createdAt: nationalKeywords.createdAt,
      updatedAt: nationalKeywords.updatedAt,
      articleCount: count(articles.id),
    })
    .from(nationalKeywords)
    .leftJoin(articles, eq(articles.keywordId, nationalKeywords.id))
    .groupBy(nationalKeywords.id)
    .orderBy(desc(nationalKeywords.isActive), asc(nationalKeywords.keyword));

  return {
    items: rows.map((r) => ({
      ...r,
      articleCount: Number(r.articleCount),
    })),
  };
});

