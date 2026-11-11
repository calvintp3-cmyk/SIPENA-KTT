import { and, count, desc, eq, inArray, max } from "drizzle-orm";
import { db } from "./index";
import {
  articleProposals,
  articles,
  economicPhenomena,
  odonClassifications,
  odonEntries,
  users,
} from "./schema";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_CATEGORIES,
  PORTAL_SOURCES,
  SOURCE_MEDIA_LABELS,
  getExpenditureWeightPercent,
  getSectorWeightPercent,
} from "@/lib/constants/taxonomy";
import { resolveFullKbli2020To2025 } from "@/lib/kbli/crosswalk-server";
import type {
  ExpenditureCode,
  ImpactDirection,
  KbliCode,
  PeriodQuarter,
  SourceMediaCode,
} from "@/types/client";
import type {
  OdonBrsNarrativeDto,
  OdonCandidateDto,
  OdonLedgerRowDto,
  OdonOverviewPayload,
  OdonProposalDto,
  OdonSourceStatusDto,
  OdonSpotlightDto,
} from "@/types/odon";

const DEFAULT_KBLI_BY_CATEGORY: Record<KbliCode, string> = {
  A: "01262",
  B: "05100",
  C: "10431",
  D: "35111",
  E: "36001",
  F: "42101",
  G: "47111",
  H: "50211",
  I: "55110",
  J: "61100",
  K: "64121",
  L: "68111",
  M_N: "71101",
  O: "84119",
  P: "85111",
  Q: "86101",
  R_S_T_U: "93111",
};

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

function toWitaParts(dateInput: Date | string): Date {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Date(d.getTime() + WITA_OFFSET_MS);
}

export function formatWitaDdMmYyyy(dateInput: Date | string): string {
  const d = toWitaParts(dateInput);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatWitaDdMm(dateInput: Date | string): string {
  const d = toWitaParts(dateInput);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export function formatWitaLongDate(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatWitaShortStamp(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const datePart = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  const wita = toWitaParts(d);
  const hh = String(wita.getUTCHours()).padStart(2, "0");
  const min = String(wita.getUTCMinutes()).padStart(2, "0");
  return `${datePart} ${hh}:${min} WITA`;
}

export function getDefaultKbliCodeForCategory(cat: KbliCode): string {
  return DEFAULT_KBLI_BY_CATEGORY[cat] ?? "84119";
}

function formatExpenditureBadgeLabel(
  component: ExpenditureCode,
  weightPercent: number
): string {
  if (component === "EKSPOR" || component === "IMPOR") {
    return `${EXPENDITURE_COMPONENTS[component].label} (${weightPercent.toFixed(2)}% Net Ekspor)`;
  }
  if (component === "TIDAK_RELEVAN") {
    return "Tidak Langsung";
  }
  const meta = EXPENDITURE_COMPONENTS[component];
  return `${meta.label} (${weightPercent.toFixed(2)}%)`;
}

function formatExpenditureSpotlightLabel(
  component: ExpenditureCode,
  weightPercent: number
): string {
  if (component === "EKSPOR") {
    return `Pos 6 • Ekspor / Net Ekspor Barang dan Jasa (${weightPercent.toFixed(2)}%)`;
  }
  if (component === "IMPOR") {
    return `Pos 6 • Impor / Net Ekspor Barang dan Jasa (${weightPercent.toFixed(2)}%)`;
  }
  if (component === "PMTB") {
    return `Pos 4 • PMTB (${weightPercent.toFixed(2)}%)`;
  }
  if (component === "PK_P") {
    return `Pos 3 • Konsumsi Pemerintah PK-P (${weightPercent.toFixed(2)}%)`;
  }
  if (component === "PK_RT") {
    return `Pos 1 • Konsumsi Rumah Tangga PK-RT (${weightPercent.toFixed(2)}%)`;
  }
  if (component === "PK_LNPRT") {
    return `Pos 2 • Konsumsi LNPRT (${weightPercent.toFixed(2)}%)`;
  }
  if (component === "PI") {
    return `Pos 5 • Perubahan Inventori (${weightPercent.toFixed(2)}%)`;
  }
  return "Tidak Langsung ke Komponen Pengeluaran";
}

export async function getOdonOverviewData(options: {
  includeAdmin: boolean;
}): Promise<OdonOverviewPayload> {
  const { includeAdmin } = options;

  // 1. Fetch verified ODON entries with classifications + verifier
  const verifiedRows = await db
    .select({
      entry: odonEntries,
      classification: odonClassifications,
      verifierName: users.name,
    })
    .from(odonEntries)
    .leftJoin(odonClassifications, eq(odonClassifications.odonId, odonEntries.id))
    .leftJoin(users, eq(odonEntries.verifiedBy, users.id))
    .where(eq(odonEntries.status, "verified"))
    .orderBy(desc(odonEntries.entryDate), desc(odonEntries.createdAt))
    .limit(120);

  // Deduplicate rows by entry id (pick first classification if multiple exist)
  const ledgerMap = new Map<string, OdonLedgerRowDto>();
  let spotlight: OdonSpotlightDto | null = null;

  for (const row of verifiedRows) {
    if (ledgerMap.has(row.entry.id)) continue;

    const kbliCategory = (row.classification?.kbliCategory ?? "O") as KbliCode;
    const code2020 =
      row.classification?.kbliCode2020 ?? getDefaultKbliCodeForCategory(kbliCategory);
    const resolved = resolveFullKbli2020To2025(code2020);
    const title2020 =
      row.classification?.kbliTitle2020 ??
      resolved?.title2020 ??
      KBLI_CATEGORIES[kbliCategory].shortName;
    const code2025 =
      row.classification?.kbliCode2025 ?? resolved?.code2025 ?? code2020;
    const title2025 =
      row.classification?.kbliTitle2025 ?? resolved?.title2025 ?? title2020;

    const pdrbWeightPercent =
      row.classification?.pdrbWeight != null
        ? Number((row.classification.pdrbWeight * 100).toFixed(2))
        : getSectorWeightPercent(kbliCategory);

    const expComponent = (row.classification?.expenditureComponent ??
      "PK_P") as ExpenditureCode;
    const expWeightPercent =
      row.classification?.expenditureWeight != null
        ? Number((row.classification.expenditureWeight * 100).toFixed(2))
        : getExpenditureWeightPercent(expComponent);

    const sourceLabel =
      SOURCE_MEDIA_LABELS[row.entry.sourceMedia] ?? row.entry.sourceMedia;

    const ledgerRow: OdonLedgerRowDto = {
      id: row.entry.id,
      entryDateIso: row.entry.entryDate.toISOString(),
      entryDate: formatWitaDdMmYyyy(row.entry.entryDate),
      releaseDate: formatWitaDdMm(row.entry.publishedDate),
      source: sourceLabel,
      sourceMedia: row.entry.sourceMedia as SourceMediaCode,
      sourceUrl: row.entry.sourceUrl,
      title: row.entry.title,
      summary: row.entry.economicPhenomenonSummary,
      kbliCategory,
      kbliCode2020: code2020,
      kbliTitle2020: title2020,
      kbliCode2025: code2025,
      kbliTitle2025: title2025,
      pdrbWeightPercent,
      expenditureComponent: expComponent,
      expenditureLabel: formatExpenditureBadgeLabel(expComponent, expWeightPercent),
      expenditureWeightPercent: expWeightPercent,
      impactType: (row.classification?.impactType ?? "positif") as ImpactDirection,
      quarter: row.entry.quarter as PeriodQuarter,
      year: row.entry.year,
      status: row.entry.status,
      verifierName: row.verifierName ?? "Tim Nerwilis BPS 6504",
      verifiedTime: row.entry.verifiedAt
        ? formatWitaShortStamp(row.entry.verifiedAt)
        : formatWitaShortStamp(row.entry.createdAt),
    };

    ledgerMap.set(row.entry.id, ledgerRow);

    if (!spotlight) {
      spotlight = {
        id: ledgerRow.id,
        entryDateIso: ledgerRow.entryDateIso,
        entryDate: formatWitaLongDate(row.entry.entryDate),
        releaseDate: formatWitaDdMm(row.entry.publishedDate) + " " + row.entry.year,
        source: ledgerRow.source,
        sourceMedia: ledgerRow.sourceMedia,
        sourceUrl: ledgerRow.sourceUrl,
        title: ledgerRow.title,
        economicPhenomenonSummary: ledgerRow.summary,
        kbliCategory: ledgerRow.kbliCategory,
        kbliCode2020: ledgerRow.kbliCode2020,
        kbliTitle2020: ledgerRow.kbliTitle2020,
        kbliCode2025: ledgerRow.kbliCode2025,
        kbliTitle2025: ledgerRow.kbliTitle2025,
        kbliWeightPercent: ledgerRow.pdrbWeightPercent,
        expenditureComponent: ledgerRow.expenditureComponent,
        expenditureCode: formatExpenditureSpotlightLabel(expComponent, expWeightPercent),
        expenditureWeightPercent: ledgerRow.expenditureWeightPercent,
        aggregateShare: `${expWeightPercent.toFixed(2)}%`,
        impactType: ledgerRow.impactType,
        quarter: ledgerRow.quarter,
        year: ledgerRow.year,
        verifierName: ledgerRow.verifierName ?? "Tim Nerwilis BPS 6504",
        verifiedTime: ledgerRow.verifiedTime ?? "-",
      };
    }
  }

  const ledgerRows = Array.from(ledgerMap.values());

  // 2. Source statistics across all 7 official portals
  const articleAggRows = await db
    .select({
      source: articles.source,
      total: count(),
      latestAt: max(articles.createdAt),
    })
    .from(articles)
    .groupBy(articles.source);

  const articleStatsMap = new Map(
    articleAggRows.map((r) => [
      r.source,
      {
        count: Number(r.total),
        latestAt: r.latestAt ? formatWitaShortStamp(r.latestAt) : null,
      },
    ])
  );

  const sourceStatuses: OdonSourceStatusDto[] = PORTAL_SOURCES.map((portal) => {
    const stat = articleStatsMap.get(portal.source);
    return {
      source: portal.source,
      label: portal.label,
      url: portal.url,
      scope: portal.scope,
      schedule: portal.schedule,
      articlesCount: stat?.count ?? 0,
      lastSyncedAt: stat?.latestAt ?? null,
    };
  });

  const totalArticlesCount = sourceStatuses.reduce(
    (sum, item) => sum + item.articlesCount,
    0
  );

  // 3. Admin-only queues (curation candidates, crowdsourced proposals, BRS narratives)
  let candidates: OdonCandidateDto[] = [];
  let proposals: OdonProposalDto[] = [];
  let brsNarratives: OdonBrsNarrativeDto[] = [];

  if (includeAdmin) {
    // 3a. Existing draft/pending_curation ODON entries
    const pendingOdonRows = await db
      .select({
        entry: odonEntries,
        classification: odonClassifications,
      })
      .from(odonEntries)
      .leftJoin(odonClassifications, eq(odonClassifications.odonId, odonEntries.id))
      .where(inArray(odonEntries.status, ["pending_curation", "draft"]))
      .orderBy(desc(odonEntries.entryDate), desc(odonEntries.createdAt))
      .limit(30);

    const linkedArticleIds = new Set<string>();
    const allOdonArticleRefs = await db
      .select({ articleId: odonEntries.articleId })
      .from(odonEntries)
      .where(inArray(odonEntries.status, ["draft", "pending_curation", "verified"]));

    for (const ref of allOdonArticleRefs) {
      if (ref.articleId) linkedArticleIds.add(ref.articleId);
    }

    const candidateMap = new Map<string, OdonCandidateDto>();

    for (const row of pendingOdonRows) {
      if (candidateMap.has(row.entry.id)) continue;
      if (row.entry.articleId) linkedArticleIds.add(row.entry.articleId);

      const cat = (row.classification?.kbliCategory ?? "O") as KbliCode;
      const c20 =
        row.classification?.kbliCode2020 ?? getDefaultKbliCodeForCategory(cat);
      const resolved = resolveFullKbli2020To2025(c20);
      const exp = (row.classification?.expenditureComponent ?? "PMTB") as ExpenditureCode;
      const wPct = getSectorWeightPercent(cat);

      candidateMap.set(row.entry.id, {
        id: row.entry.id,
        kind: "odon_entry",
        articleId: row.entry.articleId,
        source: SOURCE_MEDIA_LABELS[row.entry.sourceMedia] ?? row.entry.sourceMedia,
        sourceMedia: row.entry.sourceMedia as SourceMediaCode,
        sourceUrl: row.entry.sourceUrl,
        publishedDateIso: row.entry.publishedDate.toISOString(),
        publishedDateLabel: formatWitaDdMmYyyy(row.entry.publishedDate),
        title: row.entry.title,
        summary: row.entry.economicPhenomenonSummary,
        kbliCategory: cat,
        kbliCode2020: c20,
        kbliTitle2020: row.classification?.kbliTitle2020 ?? resolved?.title2020 ?? c20,
        kbliCode2025: row.classification?.kbliCode2025 ?? resolved?.code2025 ?? c20,
        kbliTitle2025: row.classification?.kbliTitle2025 ?? resolved?.title2025 ?? c20,
        pdrbWeightPercent: wPct,
        expenditureComponent: exp,
        expenditureLabel: formatExpenditureBadgeLabel(
          exp,
          getExpenditureWeightPercent(exp)
        ),
        impactType: (row.classification?.impactType ?? "positif") as ImpactDirection,
        quarter: row.entry.quarter as PeriodQuarter,
        year: row.entry.year,
        confidenceScore: null,
        isRecommended: false,
      });
    }

    // 3b. Pending / needs_revision economic phenomena not yet in ODON entries
    const pendingPhenomenaRows = await db
      .select({
        phenomenon: economicPhenomena,
        article: articles,
      })
      .from(economicPhenomena)
      .innerJoin(articles, eq(economicPhenomena.articleId, articles.id))
      .where(
        and(
          eq(economicPhenomena.isEconomicPhenomenon, true),
          inArray(economicPhenomena.status, ["pending", "needs_revision"])
        )
      )
      .orderBy(desc(articles.publishedDate), desc(economicPhenomena.confidenceScore))
      .limit(30);

    for (const row of pendingPhenomenaRows) {
      if (linkedArticleIds.has(row.article.id)) continue;
      const cat = (row.phenomenon.kbliCategory ?? "O") as KbliCode;
      const c20 = getDefaultKbliCodeForCategory(cat);
      const resolved = resolveFullKbli2020To2025(c20);
      const exp = (row.phenomenon.expenditureComponent ?? "PMTB") as ExpenditureCode;
      const wPct = getSectorWeightPercent(cat);

      candidateMap.set(row.phenomenon.id, {
        id: row.phenomenon.id,
        kind: "phenomenon",
        articleId: row.article.id,
        source: SOURCE_MEDIA_LABELS[row.article.source] ?? row.article.source,
        sourceMedia: row.article.source as SourceMediaCode,
        sourceUrl: row.article.url,
        publishedDateIso: row.article.publishedDate.toISOString(),
        publishedDateLabel: formatWitaDdMmYyyy(row.article.publishedDate),
        title: row.article.title,
        summary: row.phenomenon.summary,
        kbliCategory: cat,
        kbliCode2020: c20,
        kbliTitle2020: resolved?.title2020 ?? row.phenomenon.kbliSubsector ?? c20,
        kbliCode2025: resolved?.code2025 ?? c20,
        kbliTitle2025: resolved?.title2025 ?? row.phenomenon.kbliSubsector ?? c20,
        pdrbWeightPercent: wPct,
        expenditureComponent: exp,
        expenditureLabel: formatExpenditureBadgeLabel(
          exp,
          getExpenditureWeightPercent(exp)
        ),
        impactType: (row.phenomenon.impactType ?? "positif") as ImpactDirection,
        quarter: row.phenomenon.quarter as PeriodQuarter,
        year: row.phenomenon.year,
        confidenceScore: row.phenomenon.confidenceScore ?? null,
        isRecommended: false,
      });
    }

    candidates = Array.from(candidateMap.values()).sort((a, b) => {
      const scoreA = a.pdrbWeightPercent + (a.confidenceScore ?? 0.85) * 10;
      const scoreB = b.pdrbWeightPercent + (b.confidenceScore ?? 0.85) * 10;
      return scoreB - scoreA;
    });
    if (candidates.length > 0) {
      candidates[0] = { ...candidates[0], isRecommended: true };
    }

    // 3c. Crowdsourced proposals
    const propRows = await db
      .select()
      .from(articleProposals)
      .orderBy(desc(articleProposals.createdAt))
      .limit(50);

    proposals = propRows.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title || p.url,
      submitterName: p.submitterName,
      submitterAgency: p.submitterAgency || "Masyarakat Umum",
      submitterEmail: p.submitterEmail ?? null,
      economicNotes: p.economicNotes || "Tidak ada catatan tambahan.",
      status: p.status,
      submittedAt: formatWitaShortStamp(p.createdAt),
    }));

    // 3d. Grouped BRS narrative synthesis from verified ODON entries
    const narrativeGroups = new Map<string, OdonBrsNarrativeDto>();
    for (const row of ledgerRows) {
      const key = `${row.year}-${row.quarter}-${row.kbliCategory}`;
      const existing = narrativeGroups.get(key);
      if (existing) {
        existing.entriesCount += 1;
        existing.paragraphs.push(row.summary);
      } else {
        narrativeGroups.set(key, {
          quarter: row.quarter,
          year: row.year,
          kbliCategory: row.kbliCategory,
          kbliTitle: KBLI_CATEGORIES[row.kbliCategory].fullName,
          pdrbWeightPercent: getSectorWeightPercent(row.kbliCategory),
          entriesCount: 1,
          paragraphs: [row.summary],
        });
      }
    }
    brsNarratives = Array.from(narrativeGroups.values()).sort(
      (a, b) => b.pdrbWeightPercent - a.pdrbWeightPercent
    );
  }

  return {
    kpis: {
      verifiedCount: ledgerRows.length,
      pendingCandidatesCount: candidates.length,
      pendingProposalsCount: proposals.filter((p) => p.status === "pending").length,
      activePortalsCount: PORTAL_SOURCES.length,
      totalArticlesCount,
      latestEntryLabel: spotlight ? spotlight.entryDate : null,
    },
    spotlight,
    ledgerRows,
    candidates,
    proposals,
    sourceStatuses,
    brsNarratives,
  };
}

