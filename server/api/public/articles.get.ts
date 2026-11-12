// server/api/public/articles.get.ts
import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import {
  KbliImpactEnum,
  resolvePdrbGroupCodes,
  VerificationStatusEnum,
} from '../../../shared/enums/pdrb';
import { PublicArticlesQuerySchema } from '../../../shared/schemas/article.schema';
import { db } from '../../db';
import { articles } from '../../db/schema';
import { escapeSqlLikePattern } from '../../services/articles/query';
import { parseQueryWithSchema } from '../../utils/request';

export default defineEventHandler(async (event) => {
  const query = parseQueryWithSchema(event, PublicArticlesQuerySchema);

  const conditions: SQL[] = [
    eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
    eq(articles.isEconomicPhenomenon, true),
  ];

  if (query.year !== undefined) {
    conditions.push(eq(articles.year, query.year));
  }
  if (query.quarter !== undefined) {
    conditions.push(eq(articles.quarter, query.quarter));
  }
  if (query.kbli) {
    conditions.push(eq(articles.kbliCategory, query.kbli));
  } else if (query.pdrbGroup) {
    const groupCodes = resolvePdrbGroupCodes(query.pdrbGroup);
    if (groupCodes.length === 1) {
      conditions.push(eq(articles.kbliCategory, groupCodes[0]!));
    } else if (groupCodes.length > 1) {
      conditions.push(inArray(articles.kbliCategory, groupCodes));
    }
  }
  if (query.expenditure) {
    conditions.push(eq(articles.expenditureComponent, query.expenditure));
  }
  if (query.sourceType) {
    conditions.push(eq(articles.sourceType, query.sourceType));
  }
  if (query.impactMacro) {
    const impactMap: Record<NonNullable<typeof query.impactMacro>, KbliImpactEnum> = {
      EXPANSION: KbliImpactEnum.INCREASE_NTB,
      CONTRACTION: KbliImpactEnum.DECREASE_NTB,
      PRICE_UP: KbliImpactEnum.INCREASE_PRICE,
      PRICE_DOWN: KbliImpactEnum.DECREASE_PRICE,
    };
    conditions.push(eq(articles.kbliImpact, impactMap[query.impactMacro]));
  }
  if (query.q) {
    const pattern = `%${escapeSqlLikePattern(query.q)}%`;
    const searchCond = or(
      ilike(articles.title, pattern),
      ilike(articles.summary, pattern),
      ilike(articles.sourcePortal, pattern),
    );
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const whereClause = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [items, [countRow]] = await Promise.all([
    db
      .select({
        id: articles.id,
        url: articles.url,
        sourceType: articles.sourceType,
        sourcePortal: articles.sourcePortal,
        title: articles.title,
        summary: articles.summary,
        geographicScope: articles.geographicScope,
        kbliCategory: articles.kbliCategory,
        kbliImpact: articles.kbliImpact,
        expenditureComponent: articles.expenditureComponent,
        expenditureImpact: articles.expenditureImpact,
        publishedAt: articles.publishedAt,
        quarter: articles.quarter,
        year: articles.year,
      })
      .from(articles)
      .where(whereClause)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(articles).where(whereClause),
  ]);

  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
});
