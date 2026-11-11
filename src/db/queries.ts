import { and, desc, eq, gte, ilike, max, or, sql, count } from "drizzle-orm";
import { db } from "./index";
import { articles, economicPhenomena, users } from "./schema";
import type { PhenomenonWithArticle } from "../types";

export interface PeriodFilter {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

export interface PhenomenaFilterParams {
  status?: "pending" | "approved" | "rejected" | "needs_revision";
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
  year?: number;
  kbli_category?:
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M_N"
    | "O"
    | "P"
    | "Q"
    | "R_S_T_U";
  expenditure_component?:
    | "PK_RT"
    | "PK_LNPRT"
    | "PK_P"
    | "PMTB"
    | "PI"
    | "EKSPOR"
    | "IMPOR"
    | "TIDAK_RELEVAN";
  source?:
    | "koran_kaltara"
    | "radar_tarakan"
    | "tribun_kaltara"
    | "benuanta"
    | "fokus_borneo"
    | "antara_kaltara"
    | "national_media";
  search?: string;
  page?: number;
  limit?: number;
}

export interface DashboardStatsResult {
  quarter: string;
  year: number;
  totalArticles: number;
  todayArticlesCount: number;
  unprocessedArticlesCount: number;
  latestIngestedAt: string | null;
  totalEconomicPhenomena: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  hitRatePercent: number;
  sourceBreakdown: Array<{ source: string; count: number }>;
  kbliDistribution: Array<{ category: string; count: number }>;
  expenditureDistribution: Array<{ component: string; count: number }>;
  recentPending: PhenomenonWithArticle[];
}

function getStartOfTodayWita(): Date {
  // WITA is UTC+8
  const now = new Date();
  const witaMs = now.getTime() + 8 * 60 * 60 * 1000;
  const witaDate = new Date(witaMs);
  witaDate.setUTCHours(0, 0, 0, 0);
  return new Date(witaDate.getTime() - 8 * 60 * 60 * 1000);
}

export async function getDashboardStats({
  quarter,
  year,
}: PeriodFilter): Promise<DashboardStatsResult> {
  const startOfToday = getStartOfTodayWita();

  // 1. Total articles count, latest timestamp, today count, unprocessed count, breakdown by source
  const [sourceRows, articleMetaRows, unprocessedRows, todayRows] = await Promise.all([
    db
      .select({
        source: articles.source,
        total: count(),
      })
      .from(articles)
      .groupBy(articles.source),
    db
      .select({
        latestAt: max(articles.createdAt),
      })
      .from(articles),
    db
      .select({
        total: count(),
      })
      .from(articles)
      .where(eq(articles.isProcessed, false)),
    db
      .select({
        total: count(),
      })
      .from(articles)
      .where(gte(articles.createdAt, startOfToday)),
  ]);

  const totalArticles = sourceRows.reduce((acc, row) => acc + Number(row.total), 0);
  const unprocessedArticlesCount = Number(unprocessedRows[0]?.total ?? 0);
  const todayArticlesCount = Number(todayRows[0]?.total ?? 0);
  const latestAtValue = articleMetaRows[0]?.latestAt ?? null;
  const latestIngestedAt = latestAtValue ? latestAtValue.toISOString() : null;

  // 2. Phenomena status counts for target quarter & year
  const statusRows = await db
    .select({
      status: economicPhenomena.status,
      isEconomic: economicPhenomena.isEconomicPhenomenon,
      total: count(),
    })
    .from(economicPhenomena)
    .where(and(eq(economicPhenomena.quarter, quarter), eq(economicPhenomena.year, year)))
    .groupBy(economicPhenomena.status, economicPhenomena.isEconomicPhenomenon);

  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let totalEconomicPhenomena = 0;

  for (const row of statusRows) {
    const n = Number(row.total);
    if (row.isEconomic) {
      totalEconomicPhenomena += n;
    }
    if (row.status === "pending" || row.status === "needs_revision") {
      pendingCount += n;
    } else if (row.status === "approved") {
      approvedCount += n;
    } else if (row.status === "rejected") {
      rejectedCount += n;
    }
  }

  // 3. KBLI category distribution (only economic phenomena)
  const kbliRows = await db
    .select({
      category: economicPhenomena.kbliCategory,
      total: count(),
    })
    .from(economicPhenomena)
    .where(
      and(
        eq(economicPhenomena.quarter, quarter),
        eq(economicPhenomena.year, year),
        eq(economicPhenomena.isEconomicPhenomenon, true)
      )
    )
    .groupBy(economicPhenomena.kbliCategory);

  // 4. Expenditure component distribution
  const expenditureRows = await db
    .select({
      component: economicPhenomena.expenditureComponent,
      total: count(),
    })
    .from(economicPhenomena)
    .where(
      and(
        eq(economicPhenomena.quarter, quarter),
        eq(economicPhenomena.year, year),
        eq(economicPhenomena.isEconomicPhenomenon, true)
      )
    )
    .groupBy(economicPhenomena.expenditureComponent);

  // 5. Recent items needing review (pending items prioritized, up to 5)
  const { items: recentPending } = await getPhenomenaList({
    quarter,
    year,
    status: "pending",
    page: 1,
    limit: 5,
  });

  const totalPeriodRows = pendingCount + approvedCount + rejectedCount;
  const hitRatePercent =
    totalPeriodRows > 0
      ? Number(((totalEconomicPhenomena / totalPeriodRows) * 100).toFixed(1))
      : 0;

  return {
    quarter,
    year,
    totalArticles,
    todayArticlesCount,
    unprocessedArticlesCount,
    latestIngestedAt,
    totalEconomicPhenomena,
    pendingCount,
    approvedCount,
    rejectedCount,
    hitRatePercent,
    sourceBreakdown: sourceRows.map((r) => ({
      source: r.source,
      count: Number(r.total),
    })),
    kbliDistribution: kbliRows
      .filter((r) => r.category !== null)
      .map((r) => ({
        category: r.category as string,
        count: Number(r.total),
      }))
      .sort((a, b) => b.count - a.count),
    expenditureDistribution: expenditureRows
      .filter((r) => r.component !== null && r.component !== "TIDAK_RELEVAN")
      .map((r) => ({
        component: r.component as string,
        count: Number(r.total),
      }))
      .sort((a, b) => b.count - a.count),
    recentPending,
  };
}

export async function getPhenomenaList(params: PhenomenaFilterParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.status) {
    conditions.push(eq(economicPhenomena.status, params.status));
  }
  if (params.quarter) {
    conditions.push(eq(economicPhenomena.quarter, params.quarter));
  }
  if (params.year) {
    conditions.push(eq(economicPhenomena.year, params.year));
  }
  if (params.kbli_category) {
    conditions.push(eq(economicPhenomena.kbliCategory, params.kbli_category));
  }
  if (params.expenditure_component) {
    conditions.push(eq(economicPhenomena.expenditureComponent, params.expenditure_component));
  }
  if (params.source) {
    conditions.push(eq(articles.source, params.source));
  }
  if (params.search && params.search.trim().length > 0) {
    const pattern = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(economicPhenomena.summary, pattern),
        ilike(articles.title, pattern),
        ilike(economicPhenomena.kbliSubsector, pattern),
        sql`array_to_string(${economicPhenomena.affectedCommodities}, ' ') ILIKE ${pattern}`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ total: count() })
    .from(economicPhenomena)
    .innerJoin(articles, eq(economicPhenomena.articleId, articles.id))
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);

  const rows = await db
    .select({
      phenomenon: economicPhenomena,
      article: {
        id: articles.id,
        title: articles.title,
        url: articles.url,
        source: articles.source,
        publishedDate: articles.publishedDate,
        author: articles.author,
        content: articles.content,
      },
      verifier: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(economicPhenomena)
    .innerJoin(articles, eq(economicPhenomena.articleId, articles.id))
    .leftJoin(users, eq(economicPhenomena.verifiedBy, users.id))
    .where(whereClause)
    .orderBy(desc(articles.publishedDate), desc(economicPhenomena.createdAt))
    .limit(limit)
    .offset(offset);

  const items: PhenomenonWithArticle[] = rows.map((row) => ({
    ...row.phenomenon,
    article: row.article,
    verifier: row.verifier?.id ? row.verifier : null,
  }));

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getExportPhenomena({
  quarter,
  year,
  status,
}: {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  status: "approved" | "all";
}): Promise<PhenomenonWithArticle[]> {
  const conditions = [
    eq(economicPhenomena.quarter, quarter),
    eq(economicPhenomena.year, year),
    eq(economicPhenomena.isEconomicPhenomenon, true),
  ];

  if (status === "approved") {
    conditions.push(eq(economicPhenomena.status, "approved"));
  }

  const rows = await db
    .select({
      phenomenon: economicPhenomena,
      article: {
        id: articles.id,
        title: articles.title,
        url: articles.url,
        source: articles.source,
        publishedDate: articles.publishedDate,
        author: articles.author,
        content: articles.content,
      },
      verifier: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(economicPhenomena)
    .innerJoin(articles, eq(economicPhenomena.articleId, articles.id))
    .leftJoin(users, eq(economicPhenomena.verifiedBy, users.id))
    .where(and(...conditions))
    .orderBy(economicPhenomena.kbliCategory, desc(articles.publishedDate));

  return rows.map((row) => ({
    ...row.phenomenon,
    article: row.article,
    verifier: row.verifier?.id ? row.verifier : null,
  }));
}
