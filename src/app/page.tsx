import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { economicPhenomena } from "@/db/schema";
import { getDashboardStats } from "@/db/queries";
import { getCurrentSessionUser } from "@/lib/auth";
import { getQuarterFromDate } from "@/lib/utils";
import type { WorkspaceTab } from "@/components/dashboard/command-header";
import { SipenaWorkspace } from "@/components/sipena-workspace";
import type { DashboardStatsPayload, PeriodQuarter } from "@/types/client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ quarter?: string; year?: string; tab?: string }>;
}

const VALID_QUARTERS = new Set(["Q1", "Q2", "Q3", "Q4"]);
const VALID_TABS = new Set<WorkspaceTab>(["feed", "overview", "export"]);

export default async function HomePage({ searchParams }: PageProps) {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const initialTab: WorkspaceTab =
    sp.tab && VALID_TABS.has(sp.tab as WorkspaceTab)
      ? (sp.tab as WorkspaceTab)
      : "feed";
  let quarter: PeriodQuarter | undefined =
    sp.quarter && VALID_QUARTERS.has(sp.quarter)
      ? (sp.quarter as PeriodQuarter)
      : undefined;
  let year: number | undefined =
    sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined;

  if (!quarter || !year) {
    // Default to the latest quarter/year that actually has phenomena records
    const [latest] = await db
      .select({
        quarter: economicPhenomena.quarter,
        year: economicPhenomena.year,
      })
      .from(economicPhenomena)
      .orderBy(desc(economicPhenomena.year), desc(economicPhenomena.quarter))
      .limit(1);

    if (latest) {
      quarter = quarter ?? latest.quarter;
      year = year ?? latest.year;
    } else {
      const now = new Date();
      quarter = quarter ?? getQuarterFromDate(now);
      year = year ?? now.getUTCFullYear();
    }
  }

  const stats = await getDashboardStats({ quarter, year });

  // Serialize Date fields cleanly for Client Component hydration
  const serializedStats: DashboardStatsPayload = {
    quarter: stats.quarter as PeriodQuarter,
    year: stats.year,
    totalArticles: stats.totalArticles,
    todayArticlesCount: stats.todayArticlesCount,
    unprocessedArticlesCount: stats.unprocessedArticlesCount,
    latestIngestedAt: stats.latestIngestedAt,
    totalEconomicPhenomena: stats.totalEconomicPhenomena,
    pendingCount: stats.pendingCount,
    approvedCount: stats.approvedCount,
    rejectedCount: stats.rejectedCount,
    hitRatePercent: stats.hitRatePercent,
    sourceBreakdown: stats.sourceBreakdown,
    kbliDistribution: stats.kbliDistribution,
    expenditureDistribution: stats.expenditureDistribution,
    recentPending: stats.recentPending.map((item) => ({
      ...item,
      verifier: item.verifier ?? null,
      verifiedAt: item.verifiedAt ? item.verifiedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      article: {
        ...item.article,
        publishedDate: item.article.publishedDate.toISOString(),
      },
    })),
  };

  return (
    <SipenaWorkspace
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }}
      initialStats={serializedStats}
      initialTab={initialTab}
    />
  );
}
