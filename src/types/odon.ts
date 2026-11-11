import type {
  ExpenditureCode,
  ImpactDirection,
  KbliCode,
  PeriodQuarter,
  SourceMediaCode,
} from "./client";

export interface OdonSpotlightDto {
  id: string;
  entryDateIso: string;
  entryDate: string;
  releaseDate: string;
  source: string;
  sourceMedia: SourceMediaCode;
  sourceUrl: string;
  title: string;
  economicPhenomenonSummary: string;
  kbliCategory: KbliCode;
  kbliCode2020: string;
  kbliTitle2020: string;
  kbliCode2025: string;
  kbliTitle2025: string;
  kbliWeightPercent: number;
  expenditureComponent: ExpenditureCode;
  expenditureCode: string;
  expenditureWeightPercent: number;
  aggregateShare: string;
  impactType: ImpactDirection;
  quarter: PeriodQuarter;
  year: number;
  verifierName: string;
  verifiedTime: string;
}

export interface OdonLedgerRowDto {
  id: string;
  entryDateIso: string;
  entryDate: string;
  releaseDate: string;
  source: string;
  sourceMedia: SourceMediaCode;
  sourceUrl: string;
  title: string;
  summary: string;
  kbliCategory: KbliCode;
  kbliCode2020: string;
  kbliTitle2020: string;
  kbliCode2025: string;
  kbliTitle2025: string;
  pdrbWeightPercent: number;
  expenditureComponent: ExpenditureCode;
  expenditureLabel: string;
  expenditureWeightPercent: number;
  impactType: ImpactDirection;
  quarter: PeriodQuarter;
  year: number;
  status: "draft" | "pending_curation" | "verified" | "archived";
  verifierName: string | null;
  verifiedTime: string | null;
}

export interface OdonCandidateDto {
  id: string;
  kind: "odon_entry" | "phenomenon";
  articleId: string | null;
  source: string;
  sourceMedia: SourceMediaCode;
  sourceUrl: string;
  publishedDateIso: string;
  publishedDateLabel: string;
  title: string;
  summary: string;
  kbliCategory: KbliCode;
  kbliCode2020: string;
  kbliTitle2020: string;
  kbliCode2025: string;
  kbliTitle2025: string;
  pdrbWeightPercent: number;
  expenditureComponent: ExpenditureCode;
  expenditureLabel: string;
  impactType: ImpactDirection;
  quarter: PeriodQuarter;
  year: number;
  confidenceScore: number | null;
  isRecommended: boolean;
}

export interface OdonProposalDto {
  id: string;
  url: string;
  title: string;
  submitterName: string;
  submitterAgency: string;
  submitterEmail: string | null;
  economicNotes: string;
  status: "pending" | "accepted" | "rejected";
  submittedAt: string;
}

export interface OdonSourceStatusDto {
  source: SourceMediaCode;
  label: string;
  url: string;
  scope: "regional" | "national";
  schedule: string;
  articlesCount: number;
  lastSyncedAt: string | null;
}

export interface OdonBrsNarrativeDto {
  quarter: PeriodQuarter;
  year: number;
  kbliCategory: KbliCode;
  kbliTitle: string;
  pdrbWeightPercent: number;
  entriesCount: number;
  paragraphs: string[];
}

export interface OdonKpiSummaryDto {
  verifiedCount: number;
  pendingCandidatesCount: number;
  pendingProposalsCount: number;
  activePortalsCount: number;
  totalArticlesCount: number;
  latestEntryLabel: string | null;
}

export interface OdonOverviewPayload {
  kpis: OdonKpiSummaryDto;
  spotlight: OdonSpotlightDto | null;
  ledgerRows: OdonLedgerRowDto[];
  candidates: OdonCandidateDto[];
  proposals: OdonProposalDto[];
  sourceStatuses: OdonSourceStatusDto[];
  brsNarratives: OdonBrsNarrativeDto[];
}

