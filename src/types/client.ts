export type PeriodQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export type PhenomenonStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_revision";

export type KbliCode =
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

export type ExpenditureCode =
  | "PK_RT"
  | "PK_LNPRT"
  | "PK_P"
  | "PMTB"
  | "PI"
  | "EKSPOR"
  | "IMPOR"
  | "TIDAK_RELEVAN";

export type ImpactDirection = "positif" | "negatif" | "netral";
export type PriceVolumeEffect =
  | "volume"
  | "harga"
  | "keduanya"
  | "tidak_langsung";

export type SourceMediaCode =
  | "koran_kaltara"
  | "radar_tarakan"
  | "tribun_kaltara"
  | "benuanta"
  | "antara_kaltara"
  | "national_media";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
}

export interface SerializedArticleRef {
  id: string;
  title: string;
  url: string;
  source: SourceMediaCode;
  publishedDate: string;
  author: string | null;
  content: string;
}

export interface SerializedPhenomenon {
  id: string;
  articleId: string;
  isEconomicPhenomenon: boolean;
  summary: string;
  kbliCategory: KbliCode | null;
  kbliSubsector: string | null;
  expenditureComponent: ExpenditureCode | null;
  impactType: ImpactDirection | null;
  priceVolumeEffect: PriceVolumeEffect | null;
  affectedCommodities: string[] | null;
  keyNumericalData: Record<string, string | number | null> | null;
  quarter: PeriodQuarter;
  year: number;
  confidenceScore: number | null;
  status: PhenomenonStatus;
  reviewerNotes: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  article: SerializedArticleRef;
  verifier: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface SerializedAuditLog {
  id: string;
  action: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  userName: string | null;
}

export interface DashboardStatsPayload {
  quarter: PeriodQuarter;
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
  recentPending: SerializedPhenomenon[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

