// server/api/admin/analytics/trends.get.ts
import { and, desc, eq, or } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { VerificationStatusEnum } from '../../../../shared/enums/pdrb';
import { AdminTrendsQuerySchema } from '../../../../shared/schemas/article.schema';
import {
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  type PdrbQuarter,
} from '../../../../shared/utils/period';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import {
  buildQuarterSeries,
  computeTrendAnalytics,
} from '../../../services/analytics/pdrb-analytics';
import { parseQueryWithSchema } from '../../../utils/request';

export default defineEventHandler(async (event) => {
  const query = parseQueryWithSchema(event, AdminTrendsQuerySchema);
  const currentPeriod = getCurrentQuarterYearWita();

  const targetYear = query.year ?? currentPeriod.year;
  const targetQuarter = (query.quarter ?? currentPeriod.quarter) as PdrbQuarter;

  const baselinePeriod =
    query.mode === 'yoy'
      ? { quarter: targetQuarter, year: targetYear - 1 }
      : getPreviousQuarterYear(targetQuarter, targetYear);

  const historyQuarters = buildQuarterSeries(targetQuarter, targetYear, 8);
  const allPeriodPairs = [...historyQuarters];
  if (
    !allPeriodPairs.some(
      (p) => p.year === baselinePeriod.year && p.quarter === baselinePeriod.quarter,
    )
  ) {
    allPeriodPairs.push(baselinePeriod);
  }

  const periodConds = allPeriodPairs.map((p) =>
    and(eq(articles.year, p.year), eq(articles.quarter, p.quarter)),
  );

  const [historyArticles, yearRows] = await Promise.all([
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
          eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
          eq(articles.isEconomicPhenomenon, true),
          or(...periodConds),
        ),
      )
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt)),
    db
      .selectDistinct({ year: articles.year })
      .from(articles)
      .orderBy(desc(articles.year)),
  ]);

  const yearSet = new Set<number>([currentPeriod.year, targetYear]);
  for (const r of yearRows) {
    yearSet.add(r.year);
  }

  return computeTrendAnalytics({
    mode: query.mode,
    dimension: query.dimension,
    targetYear,
    targetQuarter,
    baselineYear: baselinePeriod.year,
    baselineQuarter: baselinePeriod.quarter,
    historyQuarters,
    historyArticles,
    availableYears: Array.from(yearSet).sort((a, b) => b - a),
  });
});

