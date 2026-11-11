// app/types/sipena.ts
import type {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  ScraperRunStatusEnum,
  ScraperRunTypeEnum,
  UserRoleEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';

export type UiSemanticColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleEnum;
}

export interface AuthProvidersResponse {
  googleEnabled: boolean;
  passwordEnabled: boolean;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: UserRoleEnum;
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface KbliDistributionItem {
  code: KbliCategoryEnum;
  name: string;
  fullLabel: string;
  pdrb17GroupCode: string;
  count: number;
  percentage: number;
}

export interface ExpenditureDistributionItem {
  code: ExpenditureComponentEnum;
  label: string;
  officialLabel: string;
  count: number;
  percentage: number;
}

export interface PublicOverviewResponse {
  period: {
    year: number;
    quarter: 1 | 2 | 3 | 4;
    label: string;
    previousYear: number;
    previousQuarter: 1 | 2 | 3 | 4;
    previousLabel: string;
  };
  kpi: {
    totalVerified: number;
    previousTotalVerified: number;
    deltaCount: number;
    deltaPercent: number | null;
    dominantKbli: KbliDistributionItem | null;
    dominantExpenditure: ExpenditureDistributionItem | null;
    expansionStats: {
      expansionCount: number;
      pressureOrContractionCount: number;
      positiveRealPercent: number;
    };
    impactBreakdown: {
      kbli: Record<KbliImpactEnum, number>;
      expenditure: Record<ExpenditureImpactEnum, number>;
    };
  };
  kbliDistribution: KbliDistributionItem[];
  expenditureDistribution: ExpenditureDistributionItem[];
  availablePeriods: Array<{
    year: number;
    quarter: number;
    label: string;
    count: number;
  }>;
}

export interface PublicArticleItem {
  id: string;
  url: string;
  sourceType: ArticleSourceTypeEnum;
  sourcePortal: string;
  title: string;
  summary: string | null;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
  publishedAt: string;
  quarter: number;
  year: number;
}

export interface PublicArticlesResponse {
  items: PublicArticleItem[];
  pagination: PaginationMeta;
}

export interface AdminArticleItem {
  id: string;
  url: string;
  urlHash: string;
  sourceType: ArticleSourceTypeEnum;
  sourcePortal: string;
  keywordId: string | null;
  title: string;
  snippetText: string;
  summary: string | null;
  isEconomicPhenomenon: boolean | null;
  aiConfidence: number | null;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
  publishedAt: string;
  quarter: number;
  year: number;
  llmStatus: LlmStatusEnum;
  llmErrorMessage: string | null;
  verificationStatus: VerificationStatusEnum;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSummaryCounts {
  pendingCount: number;
  verifiedCount: number;
  ignoredCount: number;
  llmFailedCount: number;
}

export interface AdminArticlesResponse {
  items: AdminArticleItem[];
  pagination: PaginationMeta;
  summaryCounts: AdminSummaryCounts;
  availablePortals: string[];
}

export interface KeywordItem {
  id: string;
  keyword: string;
  defaultKbliCategory: KbliCategoryEnum | null;
  defaultExpenditureComponent: ExpenditureComponentEnum | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  articleCount: number;
}

export interface ScraperErrorEntry {
  source: string;
  stage: 'FETCH' | 'EXTRACT' | 'LLM' | 'DB';
  message: string;
  url?: string;
}

export interface ScraperLogItem {
  id: string;
  runType: ScraperRunTypeEnum;
  status: ScraperRunStatusEnum;
  portalsChecked: number;
  keywordsChecked: number;
  articlesFetched: number;
  articlesDeduplicated: number;
  articlesInserted: number;
  economicCount: number;
  nonEconomicCount: number;
  llmFailedCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgResponseTimeMs: number | null;
  durationMs: number | null;
  errorSummary: ScraperErrorEntry[];
  triggeredBy: string | null;
  triggeredByName?: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ScraperObservability {
  isRunning: boolean;
  runningLogId: string | null;
  latestRun: ScraperLogItem | null;
  pendingLlmFailedCount: number;
  totalLlmFailedCount: number;
  tokenStats30d: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    articlesFetched: number;
    articlesDeduplicated: number;
    articlesInserted: number;
    deduplicationRatePercent: number;
  };
}

export interface ScraperLogsResponse {
  items: ScraperLogItem[];
  pagination: PaginationMeta;
  observability: ScraperObservability;
}

export interface SelectOptionItem<T extends string | number = string> {
  label: string;
  value: T;
  shortLabel?: string;
}

