import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { articles, economicPhenomena } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit";
import { getQuarterFromDate } from "@/lib/utils";
import { phenomenonExtractionSchema, type PhenomenonExtractionOutput } from "@/types";
import { buildArticleExtractionPrompt, SIPENA_AI_SYSTEM_PROMPT } from "./prompts";

// Gemini OpenAPI-safe structured output schema (avoids z.record/z.union schema rejections)
const geminiWireSchema = z.object({
  is_economic_phenomenon: z.boolean(),
  summary: z.string(),
  kbli_category: z
    .enum([
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
    ])
    .nullable(),
  kbli_subsector: z.string().nullable(),
  expenditure_component: z
    .enum([
      "PK_RT",
      "PK_LNPRT",
      "PK_P",
      "PMTB",
      "PI",
      "EKSPOR",
      "IMPOR",
      "TIDAK_RELEVAN",
    ])
    .nullable(),
  impact_type: z.enum(["positif", "negatif", "netral"]).nullable(),
  price_volume_effect: z
    .enum(["volume", "harga", "keduanya", "tidak_langsung"])
    .nullable(),
  affected_commodities: z.array(z.string()),
  numerical_metrics: z.array(
    z.object({
      metric_key: z.string(),
      numeric_value: z.number().nullable(),
      unit_or_label: z.string(),
    })
  ),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.number().int(),
  confidence_score: z.number(),
});

export interface AiExtractorDependency {
  extract: (article: {
    title: string;
    source: string;
    publishedDate: Date;
    content: string;
  }) => Promise<PhenomenonExtractionOutput>;
}

export function normalizeWireOutputToPhenomenon(
  wire: z.infer<typeof geminiWireSchema>,
  fallbackDate: Date
): PhenomenonExtractionOutput {
  const keyNumericalData: Record<string, string | number | null> = {};
  for (const item of wire.numerical_metrics) {
    const cleanKey = item.metric_key.trim();
    if (!cleanKey) continue;
    keyNumericalData[cleanKey] =
      item.numeric_value !== null ? item.numeric_value : item.unit_or_label;
  }

  const safeYear =
    wire.year >= 2020 && wire.year <= 2035
      ? wire.year
      : fallbackDate.getUTCFullYear();

  const rawConfidence = Math.min(1, Math.max(0, wire.confidence_score));

  return phenomenonExtractionSchema.parse({
    is_economic_phenomenon: wire.is_economic_phenomenon,
    summary: wire.summary.trim() || "Tidak ada ringkasan tersedia.",
    kbli_category: wire.kbli_category,
    kbli_subsector: wire.kbli_subsector,
    expenditure_component: wire.expenditure_component,
    impact_type: wire.impact_type,
    price_volume_effect: wire.price_volume_effect,
    affected_commodities: wire.affected_commodities.slice(0, 12),
    key_numerical_data: keyNumericalData,
    quarter: wire.quarter ?? getQuarterFromDate(fallbackDate),
    year: safeYear,
    confidence_score: Number(rawConfidence.toFixed(2)),
  });
}

export function createGeminiExtractor(): AiExtractorDependency {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY belum dikonfigurasi pada environment server."
    );
  }

  const googleProvider = createGoogleGenerativeAI({ apiKey });
  const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

  return {
    async extract(article) {
      const prompt = buildArticleExtractionPrompt({
        title: article.title,
        source: article.source,
        publishedDateIso: article.publishedDate.toISOString(),
        content: article.content,
      });

      let lastErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { object } = await generateObject({
            model: googleProvider(modelId),
            schema: geminiWireSchema,
            system: SIPENA_AI_SYSTEM_PROMPT,
            prompt,
            temperature: 0.1,
          });
          return normalizeWireOutputToPhenomenon(object, article.publishedDate);
        } catch (err) {
          lastErr = err;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
          }
        }
      }
      throw lastErr instanceof Error
        ? lastErr
        : new Error("Gemini Flash structured extraction failed");
    },
  };
}

export interface ExtractionPipelineResult {
  processed_count: number;
  results: {
    economic_phenomena_created: number;
    non_economic_rejected: number;
    failures: number;
  };
}

export async function runAiExtractionPipeline(options?: {
  batchSize?: number;
  concurrency?: number;
  extractor?: AiExtractorDependency;
}): Promise<ExtractionPipelineResult> {
  const batchSize = Math.min(50, Math.max(1, options?.batchSize ?? 20));
  const concurrency = Math.min(3, Math.max(1, options?.concurrency ?? 3));

  const pendingArticles = await db
    .select()
    .from(articles)
    .where(and(eq(articles.isProcessed, false), eq(articles.isScraped, true)))
    .orderBy(desc(articles.publishedDate))
    .limit(batchSize);

  if (pendingArticles.length === 0) {
    return {
      processed_count: 0,
      results: {
        economic_phenomena_created: 0,
        non_economic_rejected: 0,
        failures: 0,
      },
    };
  }

  const extractor = options?.extractor ?? createGeminiExtractor();

  const summary: ExtractionPipelineResult = {
    processed_count: 0,
    results: {
      economic_phenomena_created: 0,
      non_economic_rejected: 0,
      failures: 0,
    },
  };

  let cursor = 0;

  async function worker() {
    while (cursor < pendingArticles.length) {
      const idx = cursor++;
      const article = pendingArticles[idx];
      if (!article) break;

      try {
        const extracted = await extractor.extract({
          title: article.title,
          source: article.source,
          publishedDate: article.publishedDate,
          content: article.content,
        });

        await db.transaction(async (tx) => {
          const isEconomic = extracted.is_economic_phenomenon;
          const [inserted] = await tx
            .insert(economicPhenomena)
            .values({
              articleId: article.id,
              isEconomicPhenomenon: isEconomic,
              summary: extracted.summary,
              kbliCategory: extracted.kbli_category,
              kbliSubsector: extracted.kbli_subsector,
              expenditureComponent: extracted.expenditure_component,
              impactType: extracted.impact_type,
              priceVolumeEffect: extracted.price_volume_effect,
              affectedCommodities: extracted.affected_commodities,
              keyNumericalData: extracted.key_numerical_data,
              quarter: extracted.quarter,
              year: extracted.year,
              confidenceScore: extracted.confidence_score,
              status: isEconomic ? "pending" : "rejected",
              reviewerNotes: isEconomic
                ? null
                : "Auto-classified: Non-economic event",
            })
            .onConflictDoNothing({ target: economicPhenomena.articleId })
            .returning({ id: economicPhenomena.id });

          if (inserted) {
            await recordAuditLog(tx, {
              phenomenonId: inserted.id,
              userId: null,
              action: "CREATE",
              previousValues: null,
              newValues: {
                status: isEconomic ? "pending" : "rejected",
                kbliCategory: extracted.kbli_category,
                expenditureComponent: extracted.expenditure_component,
                confidenceScore: extracted.confidence_score,
              },
              ipAddress: "system-cron",
            });
          }

          await tx
            .update(articles)
            .set({ isProcessed: true, updatedAt: new Date() })
            .where(eq(articles.id, article.id));
        });

        summary.processed_count += 1;
        if (extracted.is_economic_phenomenon) {
          summary.results.economic_phenomena_created += 1;
        } else {
          summary.results.non_economic_rejected += 1;
        }
      } catch (err) {
        summary.results.failures += 1;
        console.error(
          `[AI Extract] Gagal memproses artikel ${article.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return summary;
}

