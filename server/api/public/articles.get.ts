// server/api/public/articles.get.ts
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, type SQL } from 'drizzle-orm';
import { defineEventHandler, setResponseHeader } from 'h3';
import {
  ExpenditureImpactEnum,
  KbliImpactEnum,
  resolvePdrbGroupCodes,
  VerificationStatusEnum,
} from '../../../shared/enums/pdrb';
import { PublicArticlesQuerySchema } from '../../../shared/schemas/article.schema';
import { parseWitaDateBoundary } from '../../../shared/utils/period';
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
  if (query.from) {
    conditions.push(gte(articles.publishedAt, parseWitaDateBoundary(query.from, 'start')));
  }
  if (query.to) {
    conditions.push(lte(articles.publishedAt, parseWitaDateBoundary(query.to, 'end')));
  }
  if (query.kbli) {
    conditions.push(or(eq(articles.kbliCategory, query.kbli), eq(articles.secondaryKbliCategory, query.kbli))!);
  } else if (query.pdrbGroup) {
    const rawGroups = query.pdrbGroup.split(',').map((s) => s.trim()).filter(Boolean);
    const allGroupCodes = rawGroups.flatMap((grp) => resolvePdrbGroupCodes(grp));
    const uniqueCodes = Array.from(new Set(allGroupCodes));
    if (uniqueCodes.length === 1) {
      conditions.push(or(eq(articles.kbliCategory, uniqueCodes[0]!), eq(articles.secondaryKbliCategory, uniqueCodes[0]!))!);
    } else if (uniqueCodes.length > 1) {
      conditions.push(or(inArray(articles.kbliCategory, uniqueCodes), inArray(articles.secondaryKbliCategory, uniqueCodes))!);
    }
  }
  if (query.expenditure) {
    const rawExp = query.expenditure.split(',').map((s) => s.trim()).filter(Boolean);
    if (rawExp.length === 1) {
      conditions.push(or(eq(articles.expenditureComponent, rawExp[0] as any), eq(articles.secondaryExpenditureComponent, rawExp[0] as any))!);
    } else if (rawExp.length > 1) {
      conditions.push(or(inArray(articles.expenditureComponent, rawExp as any), inArray(articles.secondaryExpenditureComponent, rawExp as any))!);
    }
  }
  if (query.sourceType) {
    conditions.push(eq(articles.sourceType, query.sourceType));
  }
  if (query.geographicScope) {
    conditions.push(eq(articles.geographicScope, query.geographicScope));
  }
  if (query.impactMacro) {
    if (query.impactMacro === 'EXPANSION') {
      conditions.push(
        or(
          eq(articles.kbliImpact, KbliImpactEnum.INCREASE_NTB),
          eq(articles.expenditureImpact, ExpenditureImpactEnum.INCREASE_REAL),
          eq(articles.secondaryKbliImpact, KbliImpactEnum.INCREASE_NTB),
          eq(articles.secondaryExpenditureImpact, ExpenditureImpactEnum.INCREASE_REAL),
        )!,
      );
    } else if (query.impactMacro === 'CONTRACTION') {
      conditions.push(
        or(
          eq(articles.kbliImpact, KbliImpactEnum.DECREASE_NTB),
          eq(articles.expenditureImpact, ExpenditureImpactEnum.DECREASE_REAL),
          eq(articles.secondaryKbliImpact, KbliImpactEnum.DECREASE_NTB),
          eq(articles.secondaryExpenditureImpact, ExpenditureImpactEnum.DECREASE_REAL),
        )!,
      );
    } else if (query.impactMacro === 'PRICE_UP') {
      conditions.push(
        or(
          eq(articles.kbliImpact, KbliImpactEnum.INCREASE_PRICE),
          eq(articles.expenditureImpact, ExpenditureImpactEnum.INCREASE_DEFLATOR),
          eq(articles.secondaryKbliImpact, KbliImpactEnum.INCREASE_PRICE),
          eq(articles.secondaryExpenditureImpact, ExpenditureImpactEnum.INCREASE_DEFLATOR),
        )!,
      );
    } else if (query.impactMacro === 'PRICE_DOWN') {
      conditions.push(
        or(
          eq(articles.kbliImpact, KbliImpactEnum.DECREASE_PRICE),
          eq(articles.expenditureImpact, ExpenditureImpactEnum.DECREASE_DEFLATOR),
          eq(articles.secondaryKbliImpact, KbliImpactEnum.DECREASE_PRICE),
          eq(articles.secondaryExpenditureImpact, ExpenditureImpactEnum.DECREASE_DEFLATOR),
        )!,
      );
    }
  }
  if (query.q) {
    const pattern = `%${escapeSqlLikePattern(query.q)}%`;
    const searchCond = or(
      ilike(articles.title, pattern),
      ilike(articles.summary, pattern),
      ilike(articles.snippetText, pattern),
      ilike(articles.sourcePortal, pattern),
    );
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const whereClause = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const orderClauses =
    query.sort === 'oldest'
      ? [asc(articles.publishedAt), asc(articles.createdAt)]
      : query.sort === 'sector'
        ? [asc(articles.kbliCategory), desc(articles.publishedAt)]
        : [desc(articles.publishedAt), desc(articles.createdAt)];

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
        secondaryKbliCategory: articles.secondaryKbliCategory,
        secondaryKbliImpact: articles.secondaryKbliImpact,
        secondaryExpenditureComponent: articles.secondaryExpenditureComponent,
        secondaryExpenditureImpact: articles.secondaryExpenditureImpact,
        publishedAt: articles.publishedAt,
        quarter: articles.quarter,
        year: articles.year,
      })
      .from(articles)
      .where(whereClause)
      .orderBy(...orderClauses)
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(articles).where(whereClause),
  ]);

  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  setResponseHeader(event, 'Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  setResponseHeader(event, 'Vary', 'Accept-Encoding');

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
