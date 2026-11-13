// server/db/schema.ts
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
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
} from '../../shared/enums/pdrb';

// Helper untuk mengubah TypeScript String Enum menjadi tuple pgEnum Drizzle
function enumValues<T extends Record<string, string>>(e: T): [T[keyof T], ...T[keyof T][]] {
  return Object.values(e) as [T[keyof T], ...T[keyof T][]];
}

// ============================================================================
// 1. PostgreSQL Native Enums (pgEnum)
// ============================================================================

export const kbliCategoryPgEnum = pgEnum('kbli_category', enumValues(KbliCategoryEnum));
export const kbliImpactPgEnum = pgEnum('kbli_impact', enumValues(KbliImpactEnum));
export const expenditureComponentPgEnum = pgEnum(
  'expenditure_component',
  enumValues(ExpenditureComponentEnum),
);
export const expenditureImpactPgEnum = pgEnum(
  'expenditure_impact',
  enumValues(ExpenditureImpactEnum),
);
export const verificationStatusPgEnum = pgEnum(
  'verification_status',
  enumValues(VerificationStatusEnum),
);
export const articleSourceTypePgEnum = pgEnum(
  'article_source_type',
  enumValues(ArticleSourceTypeEnum),
);
export const llmStatusPgEnum = pgEnum('llm_status', enumValues(LlmStatusEnum));
export const scraperRunTypePgEnum = pgEnum(
  'scraper_run_type',
  enumValues(ScraperRunTypeEnum),
);
export const scraperRunStatusPgEnum = pgEnum(
  'scraper_run_status',
  enumValues(ScraperRunStatusEnum),
);
export const userRolePgEnum = pgEnum('user_role', enumValues(UserRoleEnum));
export const synthesisStylePgEnum = pgEnum('synthesis_style', [
  'BRS_FORMAL',
  'EXECUTIVE_BRIEF',
  'BULLET_POINTS',
]);

// ============================================================================
// 2. Tabel `users` — Autentikasi & Otorisasi Staf Admin Nerwilis
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRolePgEnum('role').notNull().default(UserRoleEnum.OPERATOR),
    isActive: boolean('is_active').notNull().default(true),
    tokenVersion: integer('token_version').notNull().default(1),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('users_email_uidx').on(sql`lower(${t.email})`),
    index('users_is_active_idx').on(t.isActive),
  ],
);

// ============================================================================
// 3. Tabel `national_keywords` — Master Keyword Portal Berita Nasional
// ============================================================================

export const nationalKeywords = pgTable(
  'national_keywords',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyword: text('keyword').notNull(),
    defaultKbliCategory: kbliCategoryPgEnum('default_kbli_category'),
    defaultExpenditureComponent: expenditureComponentPgEnum('default_expenditure_component'),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('national_keywords_keyword_uidx').on(sql`lower(${t.keyword})`),
    index('national_keywords_active_idx').on(t.isActive),
    index('national_keywords_created_by_idx').on(t.createdBy),
  ],
);

// ============================================================================
// 4. Tabel `scraper_logs` — Riwayat Bot Subuh, Trigger Manual & Token LLM
// ============================================================================

export interface ScraperPortalErrorEntry {
  source: string;
  stage: 'HARVEST' | 'FETCH' | 'EXTRACT' | 'LLM' | 'SYSTEM';
  message: string;
  url?: string;
}

export interface ScraperProviderStatEntry {
  slotId: string;
  provider: 'gemini' | 'groq' | 'openrouter' | 'cerebras' | 'mistral' | 'nvidia';
  model: string;
  calls: number;
  successes: number;
  rateLimits: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
}

export const scraperLogs = pgTable(
  'scraper_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runType: scraperRunTypePgEnum('run_type').notNull(),
    status: scraperRunStatusPgEnum('status').notNull().default(ScraperRunStatusEnum.RUNNING),
    portalsChecked: integer('portals_checked').notNull().default(0),
    keywordsChecked: integer('keywords_checked').notNull().default(0),
    articlesFetched: integer('articles_fetched').notNull().default(0),
    articlesDeduplicated: integer('articles_deduplicated').notNull().default(0),
    articlesInserted: integer('articles_inserted').notNull().default(0),
    economicCount: integer('economic_count').notNull().default(0),
    nonEconomicCount: integer('non_economic_count').notNull().default(0),
    llmFailedCount: integer('llm_failed_count').notNull().default(0),
    totalInputTokens: integer('total_input_tokens').notNull().default(0),
    totalOutputTokens: integer('total_output_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    avgResponseTimeMs: integer('avg_response_time_ms').notNull().default(0),
    durationMs: integer('duration_ms'),
    errorSummary: jsonb('error_summary').$type<ScraperPortalErrorEntry[]>().notNull().default([]),
    providerStats: jsonb('provider_stats')
      .$type<Record<string, ScraperProviderStatEntry>>()
      .notNull()
      .default({}),
    triggeredBy: uuid('triggered_by').references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    index('scraper_logs_started_at_idx').on(t.startedAt.desc()),
    index('scraper_logs_status_idx').on(t.status),
    index('scraper_logs_triggered_by_idx').on(t.triggeredBy),
    check('scraper_logs_counters_nonneg_chk', sql`
      ${t.portalsChecked} >= 0 AND
      ${t.keywordsChecked} >= 0 AND
      ${t.articlesFetched} >= 0 AND
      ${t.articlesDeduplicated} >= 0 AND
      ${t.articlesInserted} >= 0 AND
      ${t.totalTokens} >= 0
    `),
  ],
);

// ============================================================================
// 5. Tabel `articles` — Bank Data Berita & Klasifikasi Fenomena PDRB
// ============================================================================

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    url: text('url').notNull(),
    urlHash: text('url_hash').notNull(), // SHA-256 hex (64 char) dari URL ternormalisasi
    sourceType: articleSourceTypePgEnum('source_type').notNull(),
    sourcePortal: text('source_portal').notNull(), // mis. 'kaltara.tribunnews.com', 'korankaltara.com', 'Manual'
    title: text('title').notNull(),
    snippetText: text('snippet_text').notNull(), // Teks bersih 150-250 kata (~1.000-1.500 karakter)
    wordCount: integer('word_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }).notNull(),
    quarter: smallint('quarter').notNull(), // 1 | 2 | 3 | 4
    year: smallint('year').notNull(), // mis. 2026

    // Hasil Klasifikasi AI / Kurasi Admin
    geographicScope: text('geographic_scope'),
    isEconomicPhenomenon: boolean('is_economic_phenomenon'), // null bila LLM gagal & belum ditinjau manual
    summary: text('summary'), // Ringkasan berita 2-3 kalimat baku bahasa Indonesia
    kbliCategory: kbliCategoryPgEnum('kbli_category'),
    kbliImpact: kbliImpactPgEnum('kbli_impact'),
    expenditureComponent: expenditureComponentPgEnum('expenditure_component'),
    expenditureImpact: expenditureImpactPgEnum('expenditure_impact'),

    // Sektor & Dampak Sekunder (Inter-industry Linkage)
    secondaryKbliCategory: kbliCategoryPgEnum('secondary_kbli_category'),
    secondaryKbliImpact: kbliImpactPgEnum('secondary_kbli_impact'),
    secondaryExpenditureComponent: expenditureComponentPgEnum('secondary_expenditure_component'),
    secondaryExpenditureImpact: expenditureImpactPgEnum('secondary_expenditure_impact'),

    titleEmbedding: doublePrecision('title_embedding').array(), // Vektor semantik opsional (768-dim) untuk Stage-2 dedup

    // Telemetry & Fallback LLM Worker
    llmModel: text('llm_model'), // mis. 'gemini-3.8-flash' | 'gemini-3.5-flash-lite'
    llmStatus: llmStatusPgEnum('llm_status').notNull().default(LlmStatusEnum.SUCCESS),
    llmError: text('llm_error'),
    llmConfidence: doublePrecision('llm_confidence'), // 0.0 - 1.0 opsional untuk prioritas review

    // Alur Kurasi Nerwilis
    verificationStatus: verificationStatusPgEnum('verification_status')
      .notNull()
      .default(VerificationStatusEnum.PENDING),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),

    // Jejak Sumber & Audit
    keywordId: uuid('keyword_id').references(() => nationalKeywords.id, { onDelete: 'set null' }),
    scraperLogId: uuid('scraper_log_id').references(() => scraperLogs.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Keunikan & Deduplikasi URL O(1)
    uniqueIndex('articles_url_hash_uidx').on(t.urlHash),

    // Query Feed Publik (`/`) & Agregasi KPI Triwulanan (covering filter tercepat)
    index('articles_public_period_idx').on(
      t.verificationStatus,
      t.isEconomicPhenomenon,
      t.year,
      t.quarter,
      t.publishedAt.desc(),
    ),

    // Query Antrean Review Harian (`/admin/review`: Tab Pending/Verified/Ignored)
    index('articles_review_queue_idx').on(t.verificationStatus, t.publishedAt.desc()),

    // Filter Analitik KBLI & Komponen Pengeluaran per Periode
    index('articles_kbli_period_idx').on(t.kbliCategory, t.year, t.quarter),
    index('articles_exp_period_idx').on(t.expenditureComponent, t.year, t.quarter),
    index('articles_sec_kbli_period_idx').on(t.secondaryKbliCategory, t.year, t.quarter),
    index('articles_sec_exp_period_idx').on(t.secondaryExpenditureComponent, t.year, t.quarter),
    index('articles_source_portal_idx').on(t.sourcePortal, t.publishedAt.desc()),
    index('articles_source_type_period_idx').on(t.sourceType, t.year, t.quarter, t.publishedAt.desc()),
    index('articles_geo_scope_period_idx').on(t.geographicScope, t.year, t.quarter),

    // Indeks Wajib seluruh Foreign Key (PostgreSQL tidak mengindeks FK secara otomatis)
    index('articles_keyword_id_idx').on(t.keywordId),
    index('articles_scraper_log_id_idx').on(t.scraperLogId),
    index('articles_verified_by_idx').on(t.verifiedBy),
    index('articles_created_by_idx').on(t.createdBy),

    // Partial Index khusus antrean retry artikel yang gagal diproses Gemini / Multi-LLM
    index('articles_llm_retry_partial_idx')
      .on(t.publishedAt.desc())
      .where(sql`${t.llmStatus} = 'FAILED' AND ${t.verificationStatus} = 'PENDING'`),

    // Integritas Domain & Kebenaran Data
    check('articles_quarter_range_chk', sql`${t.quarter} BETWEEN 1 AND 4`),
    check('articles_year_range_chk', sql`${t.year} BETWEEN 2000 AND 2100`),
    check('articles_word_count_chk', sql`${t.wordCount} >= 0`),
    check('articles_confidence_range_chk', sql`${t.llmConfidence} IS NULL OR (${t.llmConfidence} >= 0 AND ${t.llmConfidence} <= 1)`),
    check(
      'articles_verified_completeness_chk',
      sql`${t.verificationStatus} <> 'VERIFIED' OR (
        ${t.isEconomicPhenomenon} = true AND
        ${t.summary} IS NOT NULL AND
        ${t.kbliCategory} IS NOT NULL AND
        ${t.kbliImpact} IS NOT NULL AND
        ${t.expenditureComponent} IS NOT NULL AND
        ${t.expenditureImpact} IS NOT NULL
      )`,
    ),
  ],
);

// ============================================================================
// 6. Tabel `synthesis_drafts` — Draf & Riwayat Narasi BRS PDRB Bersama
// ============================================================================

export interface SynthesisDraftCitationEntry {
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

export const synthesisDrafts = pgTable(
  'synthesis_drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    year: smallint('year').notNull(),
    quarter: smallint('quarter').notNull(),
    dimension: text('dimension').$type<'kbli' | 'expenditure'>().notNull(),
    targetCode: text('target_code').notNull(),
    targetLabel: text('target_label').notNull(),
    style: synthesisStylePgEnum('style').notNull().default('BRS_FORMAL'),
    title: text('title').notNull(),
    narrativeMarkdown: text('narrative_markdown').notNull(),
    generationMode: text('generation_mode')
      .$type<'gemini' | 'llm' | 'template'>()
      .notNull()
      .default('template'),
    modelUsed: text('model_used'),
    notice: text('notice'),
    citations: jsonb('citations').$type<SynthesisDraftCitationEntry[]>().notNull().default([]),
    articleIds: jsonb('article_ids').$type<string[]>().notNull().default([]),
    articleCount: integer('article_count').notNull().default(0),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('synthesis_drafts_period_updated_idx').on(t.year, t.quarter, t.updatedAt.desc()),
    index('synthesis_drafts_target_idx').on(t.dimension, t.targetCode),
    index('synthesis_drafts_created_by_idx').on(t.createdBy),
    index('synthesis_drafts_updated_by_idx').on(t.updatedBy),
    check('synthesis_drafts_quarter_range_chk', sql`${t.quarter} BETWEEN 1 AND 4`),
    check('synthesis_drafts_year_range_chk', sql`${t.year} BETWEEN 2000 AND 2100`),
    check('synthesis_drafts_dimension_chk', sql`${t.dimension} IN ('kbli', 'expenditure')`),
    check('synthesis_drafts_mode_chk', sql`${t.generationMode} IN ('gemini', 'llm', 'template')`),
    check('synthesis_drafts_article_count_chk', sql`${t.articleCount} >= 0`),
  ],
);

// ============================================================================
// 7. Drizzle Relations & Inferred Types
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  createdKeywords: many(nationalKeywords),
  triggeredRuns: many(scraperLogs),
  verifiedArticles: many(articles, { relationName: 'verifiedByUser' }),
  createdArticles: many(articles, { relationName: 'createdByUser' }),
  createdSynthesisDrafts: many(synthesisDrafts, { relationName: 'synthesisCreatedBy' }),
  updatedSynthesisDrafts: many(synthesisDrafts, { relationName: 'synthesisUpdatedBy' }),
}));

export const nationalKeywordsRelations = relations(nationalKeywords, ({ one, many }) => ({
  creator: one(users, {
    fields: [nationalKeywords.createdBy],
    references: [users.id],
  }),
  articles: many(articles),
}));

export const scraperLogsRelations = relations(scraperLogs, ({ one, many }) => ({
  triggeredByUser: one(users, {
    fields: [scraperLogs.triggeredBy],
    references: [users.id],
  }),
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  keyword: one(nationalKeywords, {
    fields: [articles.keywordId],
    references: [nationalKeywords.id],
  }),
  scraperLog: one(scraperLogs, {
    fields: [articles.scraperLogId],
    references: [scraperLogs.id],
  }),
  verifier: one(users, {
    fields: [articles.verifiedBy],
    references: [users.id],
    relationName: 'verifiedByUser',
  }),
  creator: one(users, {
    fields: [articles.createdBy],
    references: [users.id],
    relationName: 'createdByUser',
  }),
}));

export const synthesisDraftsRelations = relations(synthesisDrafts, ({ one }) => ({
  creator: one(users, {
    fields: [synthesisDrafts.createdBy],
    references: [users.id],
    relationName: 'synthesisCreatedBy',
  }),
  updater: one(users, {
    fields: [synthesisDrafts.updatedBy],
    references: [users.id],
    relationName: 'synthesisUpdatedBy',
  }),
}));

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type NationalKeywordRecord = typeof nationalKeywords.$inferSelect;
export type NewNationalKeywordRecord = typeof nationalKeywords.$inferInsert;
export type ScraperLogRecord = typeof scraperLogs.$inferSelect;
export type NewScraperLogRecord = typeof scraperLogs.$inferInsert;
export type ArticleRecord = typeof articles.$inferSelect;
export type NewArticleRecord = typeof articles.$inferInsert;
export type SynthesisDraftRecord = typeof synthesisDrafts.$inferSelect;
export type NewSynthesisDraftRecord = typeof synthesisDrafts.$inferInsert;

