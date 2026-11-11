// server/api/public/overview.get.ts
import { and, count, desc, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import {
  EXPENDITURE_COMPONENT_LABELS,
  ExpenditureImpactEnum,
  KBLI_CATEGORY_META,
  KbliImpactEnum,
  VerificationStatusEnum,
} from '../../../shared/enums/pdrb';
import { PublicOverviewQuerySchema } from '../../../shared/schemas/article.schema';
import {
  formatPeriodLabel,
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  type PdrbQuarter,
} from '../../../shared/utils/period';
import { db } from '../../db';
import { articles } from '../../db/schema';
import { parseQueryWithSchema } from '../../utils/request';

export default defineEventHandler(async (event) => {
  const query = parseQueryWithSchema(event, PublicOverviewQuerySchema);
  const currentPeriod = getCurrentQuarterYearWita();

  const targetYear = query.year ?? currentPeriod.year;
  const targetQuarter = (query.quarter ?? currentPeriod.quarter) as PdrbQuarter;
  const prevPeriod = getPreviousQuarterYear(targetQuarter, targetYear);

  const verifiedEconomicFilter = and(
    eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
    eq(articles.isEconomicPhenomenon, true),
  );

  const targetPeriodFilter = and(
    verifiedEconomicFilter,
    eq(articles.year, targetYear),
    eq(articles.quarter, targetQuarter),
  );

  const prevPeriodFilter = and(
    verifiedEconomicFilter,
    eq(articles.year, prevPeriod.year),
    eq(articles.quarter, prevPeriod.quarter),
  );

  const [
    [currentCountRow],
    [prevCountRow],
    kbliRows,
    expenditureRows,
    kbliImpactRows,
    expImpactRows,
    periodRows,
  ] = await Promise.all([
    db.select({ total: count() }).from(articles).where(targetPeriodFilter),
    db.select({ total: count() }).from(articles).where(prevPeriodFilter),
    db
      .select({
        code: articles.kbliCategory,
        total: count(),
      })
      .from(articles)
      .where(targetPeriodFilter)
      .groupBy(articles.kbliCategory),
    db
      .select({
        code: articles.expenditureComponent,
        total: count(),
      })
      .from(articles)
      .where(targetPeriodFilter)
      .groupBy(articles.expenditureComponent),
    db
      .select({
        impact: articles.kbliImpact,
        total: count(),
      })
      .from(articles)
      .where(targetPeriodFilter)
      .groupBy(articles.kbliImpact),
    db
      .select({
        impact: articles.expenditureImpact,
        total: count(),
      })
      .from(articles)
      .where(targetPeriodFilter)
      .groupBy(articles.expenditureImpact),
    db
      .select({
        year: articles.year,
        quarter: articles.quarter,
        total: count(),
      })
      .from(articles)
      .where(verifiedEconomicFilter)
      .groupBy(articles.year, articles.quarter)
      .orderBy(desc(articles.year), desc(articles.quarter)),
  ]);

  const totalVerified = Number(currentCountRow?.total ?? 0);
  const previousTotalVerified = Number(prevCountRow?.total ?? 0);
  const deltaCount = totalVerified - previousTotalVerified;
  const deltaPercent =
    previousTotalVerified > 0
      ? Math.round((deltaCount / previousTotalVerified) * 1000) / 10
      : null;

  const kbliDistribution = kbliRows
    .filter((row): row is { code: NonNullable<typeof row.code>; total: number } => row.code !== null)
    .map((row) => {
      const numCount = Number(row.total);
      const meta = KBLI_CATEGORY_META[row.code];
      return {
        code: row.code,
        name: meta?.name ?? row.code,
        fullLabel: meta?.fullLabel ?? row.code,
        pdrb17GroupCode: meta?.pdrb17GroupCode ?? row.code,
        count: numCount,
        percentage: totalVerified > 0 ? Math.round((numCount / totalVerified) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const expenditureDistribution = expenditureRows
    .filter((row): row is { code: NonNullable<typeof row.code>; total: number } => row.code !== null)
    .map((row) => {
      const numCount = Number(row.total);
      const meta = EXPENDITURE_COMPONENT_LABELS[row.code];
      return {
        code: row.code,
        label: meta?.short ?? row.code,
        officialLabel: meta?.official ?? row.code,
        count: numCount,
        percentage: totalVerified > 0 ? Math.round((numCount / totalVerified) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const kbliImpactCounts: Record<KbliImpactEnum, number> = {
    [KbliImpactEnum.INCREASE_NTB]: 0,
    [KbliImpactEnum.DECREASE_NTB]: 0,
    [KbliImpactEnum.INCREASE_PRICE]: 0,
    [KbliImpactEnum.DECREASE_PRICE]: 0,
  };
  for (const row of kbliImpactRows) {
    if (row.impact) {
      kbliImpactCounts[row.impact] = Number(row.total);
    }
  }

  const expImpactCounts: Record<ExpenditureImpactEnum, number> = {
    [ExpenditureImpactEnum.INCREASE_REAL]: 0,
    [ExpenditureImpactEnum.DECREASE_REAL]: 0,
    [ExpenditureImpactEnum.INCREASE_DEFLATOR]: 0,
    [ExpenditureImpactEnum.DECREASE_DEFLATOR]: 0,
  };
  for (const row of expImpactRows) {
    if (row.impact) {
      expImpactCounts[row.impact] = Number(row.total);
    }
  }

  const expansionCount = kbliImpactCounts[KbliImpactEnum.INCREASE_NTB];
  const pressureOrContractionCount = Math.max(0, totalVerified - expansionCount);
  const positiveRealPercent =
    totalVerified > 0 ? Math.round((expansionCount / totalVerified) * 100) : 0;

  // Pastikan periode WITA berjalan selalu muncul di daftar periode
  const periodMap = new Map<string, { year: number; quarter: number; label: string; count: number }>();
  periodMap.set(`${currentPeriod.year}-${currentPeriod.quarter}`, {
    year: currentPeriod.year,
    quarter: currentPeriod.quarter,
    label: formatPeriodLabel(currentPeriod.quarter, currentPeriod.year),
    count: 0,
  });

  for (const row of periodRows) {
    periodMap.set(`${row.year}-${row.quarter}`, {
      year: row.year,
      quarter: row.quarter,
      label: formatPeriodLabel(row.quarter, row.year),
      count: Number(row.total),
    });
  }

  const availablePeriods = Array.from(periodMap.values()).sort(
    (a, b) => b.year - a.year || b.quarter - a.quarter,
  );

  return {
    period: {
      year: targetYear,
      quarter: targetQuarter,
      label: formatPeriodLabel(targetQuarter, targetYear),
      previousYear: prevPeriod.year,
      previousQuarter: prevPeriod.quarter,
      previousLabel: formatPeriodLabel(prevPeriod.quarter, prevPeriod.year),
    },
    kpi: {
      totalVerified,
      previousTotalVerified,
      deltaCount,
      deltaPercent,
      dominantKbli: kbliDistribution[0] ?? null,
      dominantExpenditure: expenditureDistribution[0] ?? null,
      expansionStats: {
        expansionCount,
        pressureOrContractionCount,
        positiveRealPercent,
      },
      impactBreakdown: {
        kbli: kbliImpactCounts,
        expenditure: expImpactCounts,
      },
    },
    kbliDistribution,
    expenditureDistribution,
    availablePeriods,
  };
});

