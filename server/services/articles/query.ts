// server/services/articles/query.ts
import { and, count, eq, gte, ilike, inArray, lte, or, type SQL } from 'drizzle-orm';
import {
  LlmStatusEnum,
  resolvePdrbGroupCodes,
  VerificationStatusEnum,
} from '../../../shared/enums/pdrb';
import type { AdminArticlesQuery, ExportArticlesQuery } from '../../../shared/schemas/article.schema';
import { parseWitaDateBoundary } from '../../../shared/utils/period';
import { db } from '../../db';
import { articles, type ArticleRecord } from '../../db/schema';

export type ArticleFilterInput = Partial<
  Pick<
    AdminArticlesQuery | ExportArticlesQuery,
    | 'status'
    | 'llmStatus'
    | 'isEconomic'
    | 'year'
    | 'quarter'
    | 'kbli'
    | 'pdrbGroup'
    | 'expenditure'
    | 'portal'
    | 'from'
    | 'to'
    | 'q'
  >
>;

export function escapeSqlLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&');
}

export function buildArticleSearchClause(rawQuery: string | undefined): SQL | undefined {
  const q = rawQuery?.trim();
  if (!q) return undefined;
  const pattern = `%${escapeSqlLikePattern(q)}%`;
  return or(
    ilike(articles.title, pattern),
    ilike(articles.summary, pattern),
    ilike(articles.url, pattern),
  );
}

/**
 * Membangun kondisi WHERE Drizzle ORM yang aman dan terparameter untuk Bank Data (`/admin/articles`) & Ekspor.
 */
export function buildAdminArticleFilters(filter: ArticleFilterInput): SQL | undefined {
  const conditions: SQL[] = [];

  if (filter.status) {
    conditions.push(eq(articles.verificationStatus, filter.status));
  }
  if (filter.llmStatus) {
    conditions.push(eq(articles.llmStatus, filter.llmStatus));
  }
  if (filter.isEconomic === 'true') {
    conditions.push(eq(articles.isEconomicPhenomenon, true));
  } else if (filter.isEconomic === 'false') {
    conditions.push(eq(articles.isEconomicPhenomenon, false));
  }
  if (filter.year !== undefined) {
    conditions.push(eq(articles.year, filter.year));
  }
  if (filter.quarter !== undefined) {
    conditions.push(eq(articles.quarter, filter.quarter));
  }
  if (filter.kbli) {
    conditions.push(eq(articles.kbliCategory, filter.kbli));
  } else if (filter.pdrbGroup) {
    const codes = resolvePdrbGroupCodes(filter.pdrbGroup);
    if (codes.length === 1) {
      conditions.push(eq(articles.kbliCategory, codes[0]!));
    } else if (codes.length > 1) {
      conditions.push(inArray(articles.kbliCategory, codes));
    }
  }
  if (filter.expenditure) {
    conditions.push(eq(articles.expenditureComponent, filter.expenditure));
  }
  if (filter.portal) {
    conditions.push(eq(articles.sourcePortal, filter.portal));
  }
  if (filter.from) {
    conditions.push(gte(articles.publishedAt, parseWitaDateBoundary(filter.from, 'start')));
  }
  if (filter.to) {
    conditions.push(lte(articles.publishedAt, parseWitaDateBoundary(filter.to, 'end')));
  }

  const searchClause = buildArticleSearchClause(filter.q);
  if (searchClause) {
    conditions.push(searchClause);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export interface AdminArticleSummaryCounts {
  pendingCount: number;
  verifiedCount: number;
  ignoredCount: number;
  llmFailedCount: number;
}

export async function getAdminArticleSummaryCounts(): Promise<AdminArticleSummaryCounts> {
  const [groupedRows, failedRows] = await Promise.all([
    db
      .select({
        verificationStatus: articles.verificationStatus,
        total: count(),
      })
      .from(articles)
      .groupBy(articles.verificationStatus),
    db
      .select({ total: count() })
      .from(articles)
      .where(eq(articles.llmStatus, LlmStatusEnum.FAILED)),
  ]);

  let pendingCount = 0;
  let verifiedCount = 0;
  let ignoredCount = 0;

  for (const row of groupedRows) {
    if (row.verificationStatus === VerificationStatusEnum.PENDING) {
      pendingCount = Number(row.total);
    } else if (row.verificationStatus === VerificationStatusEnum.VERIFIED) {
      verifiedCount = Number(row.total);
    } else if (row.verificationStatus === VerificationStatusEnum.IGNORED) {
      ignoredCount = Number(row.total);
    }
  }

  return {
    pendingCount,
    verifiedCount,
    ignoredCount,
    llmFailedCount: Number(failedRows[0]?.total ?? 0),
  };
}

/**
 * Mengembalikan daftar field yang belum lengkap apabila artikel hendak diverifikasi (`VERIFIED`).
 */
export function getMissingVerificationFields(
  article: Pick<
    ArticleRecord,
    | 'isEconomicPhenomenon'
    | 'summary'
    | 'kbliCategory'
    | 'kbliImpact'
    | 'expenditureComponent'
    | 'expenditureImpact'
    | 'quarter'
    | 'year'
  >,
): string[] {
  const missing: string[] = [];
  if (article.isEconomicPhenomenon !== true) {
    missing.push('isEconomicPhenomenon');
  }
  if (!article.summary || article.summary.trim().length < 10) {
    missing.push('summary');
  }
  if (!article.kbliCategory) {
    missing.push('kbliCategory');
  }
  if (!article.kbliImpact) {
    missing.push('kbliImpact');
  }
  if (!article.expenditureComponent) {
    missing.push('expenditureComponent');
  }
  if (!article.expenditureImpact) {
    missing.push('expenditureImpact');
  }
  if (article.quarter < 1 || article.quarter > 4) {
    missing.push('quarter');
  }
  if (article.year < 2000 || article.year > 2100) {
    missing.push('year');
  }
  return missing;
}

