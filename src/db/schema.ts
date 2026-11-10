import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  real,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. ENUMS DEFINITION
// ==========================================

export const sourceMediaEnum = pgEnum("source_media_enum", [
  "koran_kaltara",
  "radar_tarakan",
  "tribun_kaltara",
  "benuanta",
  "antara_kaltara",
  "national_media",
]);

export const phenomenonStatusEnum = pgEnum("phenomenon_status_enum", [
  "pending",
  "approved",
  "rejected",
  "needs_revision",
]);

export const impactTypeEnum = pgEnum("impact_type_enum", [
  "positif",
  "negatif",
  "netral",
]);

export const priceVolumeEffectEnum = pgEnum("price_volume_effect_enum", [
  "volume",
  "harga",
  "keduanya",
  "tidak_langsung",
]);

export const kbliCategoryEnum = pgEnum("kbli_category_enum", [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M_N",
  "O",
  "P",
  "Q",
  "R_S_T_U",
]);

export const expenditureComponentEnum = pgEnum("expenditure_component_enum", [
  "PK_RT",
  "PK_LNPRT",
  "PK_P",
  "PMTB",
  "PI",
  "EKSPOR",
  "IMPOR",
  "TIDAK_RELEVAN",
]);

export const quarterEnum = pgEnum("quarter_enum", [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
]);

export const userRoleEnum = pgEnum("user_role_enum", [
  "admin",
  "editor",
  "viewer",
]);

// ==========================================
// 2. USERS TABLE
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("editor").notNull(),
  nip: varchar("nip", { length: 18 }), // Nomor Induk Pegawai BPS
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 3. ARTICLES TABLE (Raw Scraped Data)
// ==========================================

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    urlHash: varchar("url_hash", { length: 64 }).notNull(), // SHA-256 canonical hash
    title: text("title").notNull(),
    source: sourceMediaEnum("source").notNull(),
    publishedDate: timestamp("published_date", { withTimezone: true }).notNull(),
    author: varchar("author", { length: 255 }),
    content: text("content").notNull(), // Clean parsed article paragraphs
    rawHtml: text("raw_html"), // Optional debug archive
    isScraped: boolean("is_scraped").default(true).notNull(),
    isProcessed: boolean("is_processed").default(false).notNull(), // Processed by AI extraction
    scrapeError: text("scrape_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    urlHashIdx: uniqueIndex("articles_url_hash_idx").on(table.urlHash),
    publishedDateIdx: index("articles_published_date_idx").on(table.publishedDate),
    sourceIdx: index("articles_source_idx").on(table.source),
    isProcessedIdx: index("articles_is_processed_idx").on(table.isProcessed),
  })
);

// ==========================================
// 4. ECONOMIC PHENOMENA TABLE (Curated Data)
// ==========================================

export const economicPhenomena = pgTable(
  "economic_phenomena",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),

    // Core Classification Flag
    isEconomicPhenomenon: boolean("is_economic_phenomenon").notNull(),

    // Structured Economic Data
    summary: text("summary").notNull(), // Formal BPS narrative summary (Bahasa Indonesia)
    kbliCategory: kbliCategoryEnum("kbli_category"),
    kbliSubsector: varchar("kbli_subsector", { length: 255 }), // e.g. "Perkebunan Kelapa Sawit"
    expenditureComponent: expenditureComponentEnum("expenditure_component"),

    impactType: impactTypeEnum("impact_type"),
    priceVolumeEffect: priceVolumeEffectEnum("price_volume_effect"),

    // Detailed Metadata
    affectedCommodities: text("affected_commodities").array(), // e.g. ['Sawit', 'CPO']
    keyNumericalData: jsonb("key_numerical_data").$type<Record<string, string | number | null>>(),

    // Temporal Dimension
    quarter: quarterEnum("quarter").notNull(),
    year: smallint("year").notNull(),

    // AI Metrics & Workflow State
    confidenceScore: real("confidence_score"), // 0.00 to 1.00
    status: phenomenonStatusEnum("status").default("pending").notNull(),
    reviewerNotes: text("reviewer_notes"),

    // Verification Audit
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    articleIdIdx: index("phenomena_article_id_idx").on(table.articleId),
    statusIdx: index("phenomena_status_idx").on(table.status),
    quarterYearIdx: index("phenomena_quarter_year_idx").on(table.year, table.quarter),
    kbliIdx: index("phenomena_kbli_idx").on(table.kbliCategory),
    expenditureIdx: index("phenomena_expenditure_idx").on(table.expenditureComponent),
  })
);

// ==========================================
// 5. AUDIT LOGS TABLE
// ==========================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phenomenonId: uuid("phenomenon_id")
      .notNull()
      .references(() => economicPhenomena.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // 'CREATE', 'APPROVE', 'REJECT', 'EDIT'
    previousValues: jsonb("previous_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    phenomenonIdIdx: index("audit_logs_phenomenon_id_idx").on(table.phenomenonId),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  })
);

// ==========================================
// 6. RELATIONS
// ==========================================

export const articlesRelations = relations(articles, ({ one }) => ({
  phenomenon: one(economicPhenomena, {
    fields: [articles.id],
    references: [economicPhenomena.articleId],
  }),
}));

export const economicPhenomenaRelations = relations(economicPhenomena, ({ one, many }) => ({
  article: one(articles, {
    fields: [economicPhenomena.articleId],
    references: [articles.id],
  }),
  verifier: one(users, {
    fields: [economicPhenomena.verifiedBy],
    references: [users.id],
  }),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  verifiedPhenomena: many(economicPhenomena),
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  phenomenon: one(economicPhenomena, {
    fields: [auditLogs.phenomenonId],
    references: [economicPhenomena.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

