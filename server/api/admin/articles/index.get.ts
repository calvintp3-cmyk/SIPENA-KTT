// server/api/admin/articles/index.get.ts
import { count, desc } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { AdminArticlesQuerySchema } from '../../../../shared/schemas/article.schema';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import {
  buildAdminArticleFilters,
  getAdminArticleSummaryCounts,
} from '../../../services/articles/query';
import { parseQueryWithSchema } from '../../../utils/request';

export default defineEventHandler(async (event) => {
  const query = parseQueryWithSchema(event, AdminArticlesQuerySchema);
  const whereClause = buildAdminArticleFilters(query);
  const offset = (query.page - 1) * query.limit;

  const [items, [totalRow], summaryCounts, portalRows] = await Promise.all([
    db
      .select()
      .from(articles)
      .where(whereClause)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(articles).where(whereClause),
    getAdminArticleSummaryCounts(),
    db
      .selectDistinct({ sourcePortal: articles.sourcePortal })
      .from(articles)
      .orderBy(articles.sourcePortal),
  ]);

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
    summaryCounts,
    availablePortals: portalRows.map((p) => p.sourcePortal),
  };
});

