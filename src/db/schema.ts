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
  "fokus_borneo",
  "antara_kaltara",
  "national_media",
]);

export const odonStatusEnum = pgEnum("odon_status_enum", [
  "draft",
  "pending_curation",
  "verified",
  "archived",
]);

export const proposalStatusEnum = pgEnum("proposal_status_enum", [
  "pending",
  "accepted",
  "rejected",
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
    articleIdIdx: uniqueIndex("phenomena_article_id_idx").on(table.articleId),
    verifiedByIdx: index("phenomena_verified_by_idx").on(table.verifiedBy),
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

// ==========================================
// 7. ODON ENTRIES (One Day One News - BPS 6504 Sheet Master)
// ==========================================

export const odonEntries = pgTable(
  "odon_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").references(() => articles.id, { onDelete: "set null" }),

    // Tanggal H-1 Rilis Berita (Format Buku Kerja Sheet 6503)
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
    publishedDate: timestamp("published_date", { withTimezone: true }).notNull(),

    // Sumber & Metadata
    sourceMedia: sourceMediaEnum("source_media").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),

    // Ringkasan Fenomena Ekonomi Resmi (Sintesis AI & Catatan Nerwilis)
    economicPhenomenonSummary: text("economic_phenomenon_summary").notNull(),

    // Temporal
    quarter: quarterEnum("quarter").notNull(),
    year: smallint("year").notNull(),

    // Status Alur Kerja
    status: odonStatusEnum("status").default("draft").notNull(),
    curatorNotes: text("curator_notes"),

    // Audit Verifikasi BPS
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    entryDateIdx: index("odon_entries_date_idx").on(table.entryDate),
    quarterYearIdx: index("odon_entries_quarter_year_idx").on(table.year, table.quarter),
    statusIdx: index("odon_entries_status_idx").on(table.status),
  })
);

// ==========================================
// 8. ODON CLASSIFICATIONS (Dual-Pillar Balance: KBLI & Pengeluaran)
// ==========================================

export const odonClassifications = pgTable(
  "odon_classifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    odonId: uuid("odon_id")
      .notNull()
      .references(() => odonEntries.id, { onDelete: "cascade" }),

    // Sisi Lapangan Usaha (KBLI)
    kbliCategory: kbliCategoryEnum("kbli_category").notNull(),
    kbliCode2020: varchar("kbli_code_2020", { length: 10 }), // e.g. "05100"
    kbliTitle2020: varchar("kbli_title_2020", { length: 255 }), // e.g. "Pertambangan Batubara"
    kbliCode2025: varchar("kbli_code_2025", { length: 10 }), // e.g. "05101"
    kbliTitle2025: varchar("kbli_title_2025", { length: 255 }), // e.g. "Penambangan Batubara"
    pdrbWeight: real("pdrb_weight"), // Bobot PDRB Tana Tidung 2025 (e.g. 0.3780)

    // Sisi Pengeluaran
    expenditureComponent: expenditureComponentEnum("expenditure_component").notNull(),
    expenditureWeight: real("expenditure_weight"), // Bobot komponen pengeluaran (e.g. 0.4998)

    // Arah & Dampak Transmisi
    impactType: impactTypeEnum("impact_type").default("positif").notNull(),
    impactNarrative: text("impact_narrative"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    odonIdIdx: index("odon_classifications_odon_id_idx").on(table.odonId),
    kbliIdx: index("odon_classifications_kbli_idx").on(table.kbliCategory),
    expenditureIdx: index("odon_classifications_expenditure_idx").on(table.expenditureComponent),
  })
);

// ==========================================
// 9. KBLI 2020 ↔ 2025 CONVERSIONS (Crosswalk Resmi BPS RI)
// ==========================================

export const kbliConversions = pgTable(
  "kbli_conversions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code2020: varchar("code_2020", { length: 10 }).notNull(),
    title2020: text("title_2020").notNull(),
    code2025: varchar("code_2025", { length: 10 }).notNull(),
    title2025: text("title_2025").notNull(),
    lampiranRef: varchar("lampiran_ref", { length: 50 }).default("BPS0000").notNull(),
    conversionType: varchar("conversion_type", { length: 50 }).default("1_to_1"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    code2020Idx: index("kbli_conv_code_2020_idx").on(table.code2020),
    code2025Idx: index("kbli_conv_code_2025_idx").on(table.code2025),
  })
);

// ==========================================
// 10. ARTICLE PROPOSALS (Crowdsourced / Non-Admin Submissions)
// ==========================================

export const articleProposals = pgTable(
  "article_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    title: text("title"),
    submitterName: varchar("submitter_name", { length: 255 }).default("Masyarakat / OPD").notNull(),
    submitterAgency: varchar("submitter_agency", { length: 255 }),
    submitterEmail: varchar("submitter_email", { length: 255 }),
    economicNotes: text("economic_notes"),
    status: proposalStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("proposals_status_idx").on(table.status),
    createdAtIdx: index("proposals_created_at_idx").on(table.createdAt),
  })
);

// ==========================================
// 11. ODON RELATIONS
// ==========================================

export const odonEntriesRelations = relations(odonEntries, ({ one, many }) => ({
  article: one(articles, {
    fields: [odonEntries.articleId],
    references: [articles.id],
  }),
  verifier: one(users, {
    fields: [odonEntries.verifiedBy],
    references: [users.id],
  }),
  classifications: many(odonClassifications),
}));

export const odonClassificationsRelations = relations(odonClassifications, ({ one }) => ({
  entry: one(odonEntries, {
    fields: [odonClassifications.odonId],
    references: [odonEntries.id],
  }),
}));

