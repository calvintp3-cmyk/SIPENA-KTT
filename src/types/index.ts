import { z } from "zod";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  articles,
  economicPhenomena,
  auditLogs,
} from "../db/schema";

// ==========================================
// 1. INFERRED DRIZZLE ORM TYPES
// ==========================================

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Article = InferSelectModel<typeof articles>;
export type NewArticle = InferInsertModel<typeof articles>;

export type EconomicPhenomenon = InferSelectModel<typeof economicPhenomena>;
export type NewEconomicPhenomenon = InferInsertModel<typeof economicPhenomena>;

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

export interface PhenomenonWithArticle extends EconomicPhenomenon {
  article: Pick<Article, "id" | "title" | "url" | "source" | "publishedDate" | "author" | "content">;
  verifier?: Pick<User, "id" | "name" | "email"> | null;
}

// ==========================================
// 2. GEMINI LLM EXTRACTION SCHEMA
// ==========================================

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

// ==========================================
// 3. API QUERY & PAYLOAD SCHEMAS
// ==========================================

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
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const updatePhenomenonSchema = z.object({
  summary: z.string().min(10).max(5000).optional(),
  kbli_category: z.enum([
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M_N", "O", "P", "Q", "R_S_T_U"
  ]).nullable().optional(),
  kbli_subsector: z.string().max(150).nullable().optional(),
  expenditure_component: z.enum([
    "PK_RT", "PK_LNPRT", "PK_P", "PMTB", "PI", "EKSPOR", "IMPOR", "TIDAK_RELEVAN"
  ]).nullable().optional(),
  impact_type: z.enum(["positif", "negatif", "netral"]).nullable().optional(),
  price_volume_effect: z.enum(["volume", "harga", "keduanya", "tidak_langsung"]).nullable().optional(),
  status: z.enum(["pending", "approved", "rejected", "needs_revision"]),
  reviewer_notes: z.string().max(1000).optional()
});

export const batchVerificationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["approved", "rejected"]),
  reviewer_notes: z.string().max(500).optional()
});

export const exportQuerySchema = z.object({
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.coerce.number().int().min(2020).max(2035),
  status: z.enum(["approved", "all"]).default("approved")
});

