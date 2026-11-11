// server/api/admin/analytics/dashboard.get.ts
import { and, count, desc, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { LlmStatusEnum, VerificationStatusEnum } from '../../../../shared/enums/pdrb';
import { AdminDashboardQuerySchema } from '../../../../shared/schemas/article.schema';
import {
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  type PdrbQuarter,
} from '../../../../shared/utils/period';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { computeDashboardAnalytics } from '../../../services/analytics/pdrb-analytics';
import { parseQueryWithSchema } from '../../../utils/request';

export default defineEventHandler(async (event) => {
  const query = parseQueryWithSchema(event, AdminDashboardQuerySchema);
  const currentPeriod = getCurrentQuarterYearWita();

  const targetYear = query.year ?? currentPeriod.year;
  const targetQuarter = (query.quarter ?? currentPeriod.quarter) as PdrbQuarter;
  const prevPeriod = getPreviousQuarterYear(targetQuarter, targetYear);

  const verifiedEconomicFilter = and(
    eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
    eq(articles.isEconomicPhenomenon, true),
  );

  const [periodRows, [prevCountRow], [pendingRow], [failedRow], yearRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        summary: articles.summary,
        sourcePortal: articles.sourcePortal,
        url: articles.url,
        kbliCategory: articles.kbliCategory,
        kbliImpact: articles.kbliImpact,
        expenditureComponent: articles.expenditureComponent,
        expenditureImpact: articles.expenditureImpact,
        publishedAt: articles.publishedAt,
        quarter: articles.quarter,
        year: articles.year,
      })
      .from(articles)
      .where(
        and(
          verifiedEconomicFilter,
          eq(articles.year, targetYear),
          eq(articles.quarter, targetQuarter),
        ),
      )
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt)),
    db
      .select({ total: count() })
      .from(articles)
      .where(
        and(
          verifiedEconomicFilter,
          eq(articles.year, prevPeriod.year),
          eq(articles.quarter, prevPeriod.quarter),
        ),
      ),
    db
      .select({ total: count() })
      .from(articles)
      .where(eq(articles.verificationStatus, VerificationStatusEnum.PENDING)),
    db
      .select({ total: count() })
      .from(articles)
      .where(
        and(
          eq(articles.verificationStatus, VerificationStatusEnum.PENDING),
          eq(articles.llmStatus, LlmStatusEnum.FAILED),
        ),
      ),
    db
      .selectDistinct({ year: articles.year })
      .from(articles)
      .orderBy(desc(articles.year)),
  ]);

  const yearSet = new Set<number>([currentPeriod.year, targetYear]);
  for (const r of yearRows) {
    yearSet.add(r.year);
  }
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  return computeDashboardAnalytics({
    periodArticles: periodRows,
    prevTotalVerified: Number(prevCountRow?.total ?? 0),
    pendingQueueCount: Number(pendingRow?.total ?? 0),
    llmFailedCount: Number(failedRow?.total ?? 0),
    availableYears,
    year: targetYear,
    quarter: targetQuarter,
  });
});

