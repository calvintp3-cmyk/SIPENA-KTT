# Database Schema & TypeScript Types
## SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)
**Document Version:** 1.0.0  
**Target ORM:** Drizzle ORM (`drizzle-orm/pg-core`)  
**Target Database:** PostgreSQL 16+  
**Classification:** Single Source of Truth for Data Models & Schemas  

---

## 1. PostgreSQL Enums

The application enforces domain-specific business rules at the database level using PostgreSQL native `ENUM` types.

```sql
-- 1. Source Media Outlets (7 Verified Portals)
CREATE TYPE source_media_enum AS ENUM (
  'koran_kaltara',
  'radar_tarakan',
  'tribun_kaltara',
  'benuanta',
  'fokus_borneo',
  'antara_kaltara',
  'national_media'
);

-- 2. ODON Workflow Status
CREATE TYPE odon_status_enum AS ENUM (
  'draft',
  'pending_curation',
  'verified',
  'archived'
);

-- 3. Community Proposal Moderation Status
CREATE TYPE proposal_status_enum AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

-- 2. Phenomenon Verification Workflow Status
CREATE TYPE phenomenon_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_revision'
);

-- 3. Economic Impact Direction
CREATE TYPE impact_type_enum AS ENUM (
  'positif',
  'negatif',
  'netral'
);

-- 4. Price vs Volume Transmission Mechanism
CREATE TYPE price_volume_effect_enum AS ENUM (
  'volume',
  'harga',
  'keduanya',
  'tidak_langsung'
);

-- 5. KBLI 2025 / PDRB 17 Lapangan Usaha Categories
CREATE TYPE kbli_category_enum AS ENUM (
  'A',  -- Pertanian, Kehutanan, dan Perikanan
  'B',  -- Pertambangan dan Penggalian
  'C',  -- Industri Pengolahan
  'D',  -- Pengadaan Listrik dan Gas
  'E',  -- Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang
  'F',  -- Konstruksi
  'G',  -- Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor
  'H',  -- Transportasi dan Pergudangan
  'I',  -- Penyediaan Akomodasi dan Makan Minum
  'J',  -- Informasi dan Komunikasi
  'K',  -- Jasa Keuangan dan Asuransi
  'L',  -- Real Estat
  'M_N',-- Jasa Perusahaan (M: Profesional, Ilmiah, Teknis; N: Aktivitas Administrasi)
  'O',  -- Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib
  'P',  -- Jasa Pendidikan
  'Q',  -- Jasa Kesehatan dan Kegiatan Sosial
  'R_S_T_U' -- Jasa Lainnya (Kesenian, Hiburan, Rekreasi, Perorangan, dll.)
);

-- 6. PDRB Komponen Pengeluaran
CREATE TYPE expenditure_component_enum AS ENUM (
  'PK_RT',         -- Pengeluaran Konsumsi Rumah Tangga
  'PK_LNPRT',      -- Pengeluaran Konsumsi Lembaga Non-Profit Rumah Tangga
  'PK_P',          -- Pengeluaran Konsumsi Pemerintah
  'PMTB',          -- Pembentukan Modal Tetap Bruto (Investasi)
  'PI',            -- Perubahan Inventori
  'EKSPOR',        -- Ekspor Luar Negeri & Antar Daerah
  'IMPOR',         -- Impor Luar Negeri & Antar Daerah
  'TIDAK_RELEVAN'  -- Tidak Berdampak Langsung ke Komponen Pengeluaran
);

-- 7. Calendar Quarter
CREATE TYPE quarter_enum AS ENUM (
  'Q1',
  'Q2',
  'Q3',
  'Q4'
);

-- 8. User Roles
CREATE TYPE user_role_enum AS ENUM (
  'admin',
  'editor',
  'viewer'
);
```

---

## 2. Drizzle ORM Schema Implementation (`src/db/schema.ts`)

```typescript
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
  uniqueIndex
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
  "national_media"
]);

export const odonStatusEnum = pgEnum("odon_status_enum", [
  "draft",
  "pending_curation",
  "verified",
  "archived"
]);

export const proposalStatusEnum = pgEnum("proposal_status_enum", [
  "pending",
  "accepted",
  "rejected"
]);

export const phenomenonStatusEnum = pgEnum("phenomenon_status_enum", [
  "pending",
  "approved",
  "rejected",
  "needs_revision"
]);

export const impactTypeEnum = pgEnum("impact_type_enum", [
  "positif",
  "negatif",
  "netral"
]);

export const priceVolumeEffectEnum = pgEnum("price_volume_effect_enum", [
  "volume",
  "harga",
  "keduanya",
  "tidak_langsung"
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
  "R_S_T_U"
]);

export const expenditureComponentEnum = pgEnum("expenditure_component_enum", [
  "PK_RT",
  "PK_LNPRT",
  "PK_P",
  "PMTB",
  "PI",
  "EKSPOR",
  "IMPOR",
  "TIDAK_RELEVAN"
]);

export const quarterEnum = pgEnum("quarter_enum", [
  "Q1",
  "Q2",
  "Q3",
  "Q4"
]);

export const userRoleEnum = pgEnum("user_role_enum", [
  "admin",
  "editor",
  "viewer"
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    urlHashIdx: uniqueIndex("articles_url_hash_idx").on(table.urlHash),
    publishedDateIdx: index("articles_published_date_idx").on(table.publishedDate),
    sourceIdx: index("articles_source_idx").on(table.source),
    isProcessedIdx: index("articles_is_processed_idx").on(table.isProcessed)
  })
);

// ==========================================
// 4. ECONOMIC PHENOMENA TABLE (Extracted & Curated Data)
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    articleIdIdx: index("phenomena_article_id_idx").on(table.articleId),
    statusIdx: index("phenomena_status_idx").on(table.status),
    quarterYearIdx: index("phenomena_quarter_year_idx").on(table.year, table.quarter),
    kbliIdx: index("phenomena_kbli_idx").on(table.kbliCategory),
    expenditureIdx: index("phenomena_expenditure_idx").on(table.expenditureComponent)
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
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // 'CREATE', 'APPROVE', 'REJECT', 'EDIT'
    previousValues: jsonb("previous_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    phenomenonIdIdx: index("audit_logs_phenomenon_id_idx").on(table.phenomenonId),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId)
  })
);

// ==========================================
// 6. RELATIONS
// ==========================================

export const articlesRelations = relations(articles, ({ one }) => ({
  phenomenon: one(economicPhenomena, {
    fields: [articles.id],
    references: [economicPhenomena.articleId]
  })
}));

export const economicPhenomenaRelations = relations(economicPhenomena, ({ one, many }) => ({
  article: one(articles, {
    fields: [economicPhenomena.articleId],
    references: [articles.id]
  }),
  verifier: one(users, {
    fields: [economicPhenomena.verifiedBy],
    references: [users.id]
  }),
  auditLogs: many(auditLogs)
}));

export const usersRelations = relations(users, ({ many }) => ({
  verifiedPhenomena: many(economicPhenomena),
  auditLogs: many(auditLogs)
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  phenomenon: one(economicPhenomena, {
    fields: [auditLogs.phenomenonId],
    references: [economicPhenomena.id]
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

// ==========================================
// 7. ODON ENTRIES (Sheet 6503 Master)
// ==========================================

export const odonEntries = pgTable(
  "odon_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").references(() => articles.id, { onDelete: "set null" }),
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
    publishedDate: timestamp("published_date", { withTimezone: true }).notNull(),
    sourceMedia: sourceMediaEnum("source_media").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    economicPhenomenonSummary: text("economic_phenomenon_summary").notNull(),
    quarter: quarterEnum("quarter").notNull(),
    year: smallint("year").notNull(),
    status: odonStatusEnum("status").default("draft").notNull(),
    curatorNotes: text("curator_notes"),
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
// 8. ODON CLASSIFICATIONS (Dual-Pillar KBLI 2020<->2025 & Pengeluaran)
// ==========================================

export const odonClassifications = pgTable(
  "odon_classifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    odonId: uuid("odon_id")
      .notNull()
      .references(() => odonEntries.id, { onDelete: "cascade" }),
    kbliCategory: kbliCategoryEnum("kbli_category").notNull(),
    kbliCode2020: varchar("kbli_code_2020", { length: 10 }),
    kbliTitle2020: varchar("kbli_title_2020", { length: 255 }),
    kbliCode2025: varchar("kbli_code_2025", { length: 10 }),
    kbliTitle2025: varchar("kbli_title_2025", { length: 255 }),
    pdrbWeight: real("pdrb_weight"),
    expenditureComponent: expenditureComponentEnum("expenditure_component").notNull(),
    expenditureWeight: real("expenditure_weight"),
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
// 9. KBLI CONVERSIONS (2,560 Pairs BPS0000)
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
// 10. ARTICLE PROPOSALS (Usulan Publik / OPD)
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
```

---

## 3. TypeScript Domain Types

These TypeScript interfaces are strictly inferred from the Drizzle ORM definitions to guarantee complete end-to-end type safety:

```typescript
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  articles,
  economicPhenomena,
  auditLogs
} from "./schema";

// Users
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Articles
export type Article = InferSelectModel<typeof articles>;
export type NewArticle = InferInsertModel<typeof articles>;

// Economic Phenomena
export type EconomicPhenomenon = InferSelectModel<typeof economicPhenomena>;
export type NewEconomicPhenomenon = InferInsertModel<typeof economicPhenomena>;

// Audit Logs
export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

// Joined Type for Dashboard UI
export interface PhenomenonWithArticle extends EconomicPhenomenon {
  article: Pick<Article, "id" | "title" | "url" | "source" | "publishedDate" | "author" | "content">;
  verifier?: Pick<User, "id" | "name" | "email"> | null;
}
```

---

## 4. Zod Validation Schemas for Gemini Flash LLM Structured Output

The following schema is passed directly into Vercel AI SDK's `generateObject({ schema: phenomenonExtractionSchema })`. It guarantees that Google Gemini Flash returns data conforming exactly to our database enum constraints.

```typescript
import { z } from "zod";

export const phenomenonExtractionSchema = z.object({
  is_economic_phenomenon: z.boolean().describe(
    "Set to true if this news article describes an economic event, price change, production shock, infrastructure spending, investment, or budget allocation affecting Kabupaten Tana Tidung or Provinsi Kalimantan Utara. Set to false for purely political, ceremonial, sporting, or criminal news with no economic relevance."
  ),
  summary: z.string().describe(
    "A concise, factual 2-4 sentence summary in formal Indonesian statistical style (BPS style). Detail what happened, the economic agents involved, commodities impacted, and financial or volume amounts mentioned."
  ),
  kbli_category: z.enum([
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M_N", "O", "P", "Q", "R_S_T_U"
  ]).nullable().describe(
    "Primary 1-letter KBLI sector impacted: A (Pertanian/Perkebunan/Perikanan), B (Pertambangan Batubara/Galian C), C (Industri Pengolahan/PKS), D (Listrik/Gas), E (Air/Sampah), F (Konstruksi), G (Perdagangan), H (Transportasi Laut/Sungai/Darat), I (Akomodasi/Makan Minum), J (Komunikasi), K (Keuangan), L (Real Estat), M_N (Jasa Perusahaan), O (Pemerintah/APBD), P (Pendidikan), Q (Kesehatan), R_S_T_U (Jasa Lainnya)."
  ),
  kbli_subsector: z.string().nullable().describe(
    "Specific subsector name in Indonesian, e.g., 'Perkebunan Kelapa Sawit', 'Pertambangan Batubara', 'Konstruksi Jalan', 'Perikanan Tangkap', 'Angkutan Sungai Speedboat'."
  ),
  expenditure_component: z.enum([
    "PK_RT", "PK_LNPRT", "PK_P", "PMTB", "PI", "EKSPOR", "IMPOR", "TIDAK_RELEVAN"
  ]).nullable().describe(
    "Primary impacted GDP expenditure component: PK_RT (Household Consumption), PK_LNPRT (Non-profit Consumption), PK_P (Government Consumption/Bansos/APBD), PMTB (Gross Fixed Capital Formation/Infrastructure/Assets), PI (Inventories), EKSPOR (Export), IMPOR (Import), or TIDAK_RELEVAN."
  ),
  impact_type: z.enum(["positif", "negatif", "netral"]).nullable().describe(
    "Economic direction: 'positif' (growth, expansion, higher yield, budget increase), 'negatif' (disruption, inflation, flood damage, harvest failure, delay), or 'netral'."
  ),
  price_volume_effect: z.enum(["volume", "harga", "keduanya", "tidak_langsung"]).nullable().describe(
    "Transmission channel: 'volume' (production yield, metric tons, number of passengers), 'harga' (price hikes, inflation, tariff changes), 'keduanya' (both price and quantity affected), or 'tidak_langsung' (indirect administrative effect)."
  ),
  affected_commodities: z.array(z.string()).describe(
    "Array of specific commodities mentioned, e.g. ['Kelapa Sawit', 'Tandan Buah Segar', 'Beras', 'Semen', 'Batubara', 'Udang Windu']."
  ),
  key_numerical_data: z.record(z.union([z.string(), z.number(), z.null()])).describe(
    "Key numerical metrics extracted, e.g. {'anggaran_idr': 45000000000, 'volume_ton': 1500, 'persentase_perubahan': 4.2}."
  ),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).describe(
    "Target calendar quarter of the economic phenomenon based on article publication date and mentioned event timeframe."
  ),
  year: z.number().int().min(2020).max(2035).describe(
    "Target 4-digit calendar year of the economic phenomenon."
  ),
  confidence_score: z.number().min(0).max(1).describe(
    "Model's confidence in this classification from 0.00 to 1.00."
  )
});

export type PhenomenonExtractionOutput = z.infer<typeof phenomenonExtractionSchema>;
```

---

## 5. API Request & Response Zod Schemas

```typescript
import { z } from "zod";

// 1. Phenomenon Filtering Query Params
export const phenomenonQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "needs_revision"]).optional(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
  year: z.coerce.number().int().min(2020).max(2035).optional(),
  kbli_category: z.enum([
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M_N", "O", "P", "Q", "R_S_T_U"
  ]).optional(),
  expenditure_component: z.enum([
    "PK_RT", "PK_LNPRT", "PK_P", "PMTB", "PI", "EKSPOR", "IMPOR", "TIDAK_RELEVAN"
  ]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// 2. Phenomenon Manual Update / Approval Payload
export const updatePhenomenonSchema = z.object({
  summary: z.string().min(10).optional(),
  kbli_category: z.enum([
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M_N", "O", "P", "Q", "R_S_T_U"
  ]).nullable().optional(),
  kbli_subsector: z.string().nullable().optional(),
  expenditure_component: z.enum([
    "PK_RT", "PK_LNPRT", "PK_P", "PMTB", "PI", "EKSPOR", "IMPOR", "TIDAK_RELEVAN"
  ]).nullable().optional(),
  impact_type: z.enum(["positif", "negatif", "netral"]).nullable().optional(),
  price_volume_effect: z.enum(["volume", "harga", "keduanya", "tidak_langsung"]).nullable().optional(),
  status: z.enum(["pending", "approved", "rejected", "needs_revision"]),
  reviewer_notes: z.string().max(1000).optional()
});

// 3. Batch Verification Payload
export const batchVerificationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["approved", "rejected"]),
  reviewer_notes: z.string().max(500).optional()
});

// 4. Excel Export Query Params
export const exportQuerySchema = z.object({
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.coerce.number().int().min(2020).max(2035),
  status: z.enum(["approved", "all"]).default("approved")
});
```

---

## 6. Database Migration Strategy (Drizzle Kit)

All migrations are maintained under `src/db/migrations/`.

### Migration Commands:
1. **Generate Migration Files**:
   ```bash
   npx drizzle-kit generate
   ```
2. **Apply Migrations to Target PostgreSQL**:
   ```bash
   npx drizzle-kit migrate
   ```
3. **Database Inspection & Drizzle Studio**:
   ```bash
   npx drizzle-kit studio --port 4983
   ```

### Drizzle Configuration (`drizzle.config.ts`):
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string
  },
  verbose: true,
  strict: true
});
```

