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
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const query = parseQueryWithSchema(event, AdminArticlesQuerySchema);
  const whereClause = buildAdminArticleFilters(query);
  const offset = (query.page - 1) * query.limit;

  const [items, [totalRow], summaryCounts, portalRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        url: articles.url,
        urlHash: articles.urlHash,
        sourceType: articles.sourceType,
        sourcePortal: articles.sourcePortal,
        title: articles.title,
        snippetText: articles.snippetText,
        wordCount: articles.wordCount,
        publishedAt: articles.publishedAt,
        quarter: articles.quarter,
        year: articles.year,
        geographicScope: articles.geographicScope,
        isEconomicPhenomenon: articles.isEconomicPhenomenon,
        summary: articles.summary,
        kbliCategory: articles.kbliCategory,
        kbliImpact: articles.kbliImpact,
        expenditureComponent: articles.expenditureComponent,
        expenditureImpact: articles.expenditureImpact,
        secondaryKbliCategory: articles.secondaryKbliCategory,
        secondaryKbliImpact: articles.secondaryKbliImpact,
        secondaryExpenditureComponent: articles.secondaryExpenditureComponent,
        secondaryExpenditureImpact: articles.secondaryExpenditureImpact,
        llmModel: articles.llmModel,
        llmStatus: articles.llmStatus,
        llmError: articles.llmError,
        llmConfidence: articles.llmConfidence,
        verificationStatus: articles.verificationStatus,
        verifiedBy: articles.verifiedBy,
        verifiedAt: articles.verifiedAt,
        keywordId: articles.keywordId,
        scraperLogId: articles.scraperLogId,
        createdBy: articles.createdBy,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
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

