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

export interface Pdrb17DistributionItem {
  groupCode: string;
  shortName: string;
  officialName: string;
  kbliCodes: KbliCategoryEnum[];
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
  pdrb17Distribution: Pdrb17DistributionItem[];
  expenditureDistribution: ExpenditureDistributionItem[];
  sourceBreakdown: {
    regional: number;
    national: number;
    manual: number;
  };
  lastUpdatedAt: string | null;
  availablePeriods: Array<{
    year: number;
    quarter: number;
    label: string;
    count: number;
  }>;
}

export interface DashboardGapTileItem {
  groupCode: string;
  shortName: string;
  officialName: string;
  kbliCodes: KbliCategoryEnum[];
  primaryKbliCode: KbliCategoryEnum;
  count: number;
  sharePercent: number;
  isGap: boolean;
  isThin: boolean;
  dominantImpact: KbliImpactEnum | null;
  latestHeadline: string | null;
  latestPublishedAt: string | null;
}

export interface DashboardHeatmapRow {
  groupCode: string;
  shortName: string;
  totalCount: number;
  cells: Record<ExpenditureComponentEnum, number>;
}

export interface AdminDashboardResponse {
  period: {
    year: number;
    quarter: 1 | 2 | 3 | 4;
    label: string;
    previousYear: number;
    previousQuarter: 1 | 2 | 3 | 4;
    previousLabel: string;
  };
  kpi: {
    totalVerifiedPeriod: number;
    previousTotalVerified: number;
    deltaPercent: number | null;
    coveredSectors: number;
    totalSectors: number;
    gapSectorsCount: number;
    pendingQueueCount: number;
    llmFailedCount: number;
    expansionPercent: number;
  };
  gapTiles: DashboardGapTileItem[];
  gapSectorCodes: string[];
  heatmapMatrix: DashboardHeatmapRow[];
  availableYears: number[];
}

export interface TrendPeriodPoint {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  total: number;
  increaseNtb: number;
  decreaseNtb: number;
  pricePressure: number;
  isTarget: boolean;
}

export interface TrendComparisonRow {
  code: string;
  label: string;
  officialLabel: string;
  kbliCodes?: KbliCategoryEnum[];
  currentCount: number;
  baselineCount: number;
  deltaCount: number;
  deltaPercent: number | null;
  dominantImpact: string | null;
  latestHeadline: string | null;
  isGap: boolean;
}

export interface AdminTrendsResponse {
  mode: 'qoq' | 'yoy';
  dimension: 'kbli' | 'expenditure';
  period: {
    year: number;
    quarter: 1 | 2 | 3 | 4;
    label: string;
  };
  baseline: {
    year: number;
    quarter: 1 | 2 | 3 | 4;
    label: string;
  };
  kpi: {
    currentTotal: number;
    baselineTotal: number;
    deltaCount: number;
    deltaPercent: number | null;
    topRiser: TrendComparisonRow | null;
    topDecliner: TrendComparisonRow | null;
    gapCount: number;
  };
  history8Quarters: TrendPeriodPoint[];
  rows: TrendComparisonRow[];
  availableYears: number[];
}

export interface PortalDirectoryItem {
  id: string;
  label: string;
  sourcePortal: string;
  sourceType: ArticleSourceTypeEnum;
  indexUrl: string | null;
  additionalIndexUrls: string[];
  allowedHosts: string[];
  totalArticles: number;
  verifiedArticles: number;
  pendingArticles: number;
  lastArticleAt: string | null;
  recentErrorsCount: number;
  lastErrorMessage: string | null;
  lastErrorAt: string | null;
}

export interface AdminPortalsResponse {
  portals: PortalDirectoryItem[];
  otherSources: Array<{
    sourcePortal: string;
    sourceType: ArticleSourceTypeEnum;
    totalArticles: number;
    verifiedArticles: number;
    pendingArticles: number;
    lastArticleAt: string | null;
  }>;
  lastCrawlerRun: {
    id: string;
    startedAt: string;
    status: ScraperRunStatusEnum;
    portalsChecked: number;
    articlesInserted: number;
  } | null;
}

export interface SynthesisCitationItem {
  index: number;
  id: string;
  title: string;
  sourcePortal: string;
  publishedAt: string;
  url: string;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
}

export type SynthesisStyle = 'BRS_FORMAL' | 'EXECUTIVE_BRIEF' | 'BULLET_POINTS';

export interface SynthesisGenerateResponse {
  narrativeMarkdown: string;
  mode: 'gemini' | 'template';
  modelUsed: string | null;
  notice: string | null;
  citations: SynthesisCitationItem[];
  generatedAt: string;
  articleCount: number;
}

export interface SynthesisDraftItem {
  id: string;
  year: number;
  quarter: number;
  dimension: 'kbli' | 'expenditure';
  targetCode: string;
  targetLabel: string;
  style: SynthesisStyle;
  title: string;
  narrativeMarkdown: string;
  generationMode: 'gemini' | 'template';
  modelUsed: string | null;
  notice: string | null;
  citations: SynthesisCitationItem[];
  articleIds: string[];
  articleCount: number;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SynthesisDraftsResponse {
  items: SynthesisDraftItem[];
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
  llmConfidence: number | null;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
  publishedAt: string;
  quarter: number;
  year: number;
  llmModel: string | null;
  llmStatus: LlmStatusEnum;
  llmError: string | null;
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
  stage: 'HARVEST' | 'FETCH' | 'EXTRACT' | 'LLM' | 'SYSTEM';
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

