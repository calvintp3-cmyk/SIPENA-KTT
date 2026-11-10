import { describe, expect, it } from "vitest";
import { normalizeWireOutputToPhenomenon } from "@/lib/ai/extract-phenomenon";
import {
  batchVerificationSchema,
  exportQuerySchema,
  updatePhenomenonSchema,
} from "@/types";

describe("LLM Wire Normalization & API Zod Validation Contracts", () => {
  it("normalizes Gemini wire metrics array into key_numerical_data record and clamps confidence", () => {
    const normalized = normalizeWireOutputToPhenomenon(
      {
        is_economic_phenomenon: true,
        summary:
          "Produksi TBS kelapa sawit di Kecamatan Sesayap meningkat signifikan pada triwulan berjalan.",
        kbli_category: "A",
        kbli_subsector: "Perkebunan Kelapa Sawit",
        expenditure_component: "EKSPOR",
        impact_type: "positif",
        price_volume_effect: "keduanya",
        affected_commodities: ["Kelapa Sawit", "TBS"],
        numerical_metrics: [
          {
            metric_key: "produksi_ton",
            numeric_value: 14500,
            unit_or_label: "ton",
          },
          {
            metric_key: "harga_tbs_kg",
            numeric_value: null,
            unit_or_label: "Rp 2.650",
          },
        ],
        quarter: "Q1",
        year: 2025,
        confidence_score: 1.35, // Intentionally out of range to verify clamp
      },
      new Date("2025-02-15T08:00:00Z")
    );

    expect(normalized.confidence_score).toBe(1);
    expect(normalized.key_numerical_data).toEqual({
      produksi_ton: 14500,
      harga_tbs_kg: "Rp 2.650",
    });
  });

  it("validates curation update payloads and rejects invalid status or short summaries", () => {
    expect(
      updatePhenomenonSchema.safeParse({
        status: "approved",
        kbli_category: "F",
        expenditure_component: "PMTB",
        summary: "Proyek jalan lingkar Sebawang menyerap belanja modal daerah.",
      }).success
    ).toBe(true);

    expect(
      updatePhenomenonSchema.safeParse({
        status: "approved",
        summary: "Pendek", // < 10 chars
      }).success
    ).toBe(false);

    expect(
      updatePhenomenonSchema.safeParse({
        status: "invalid_status",
      }).success
    ).toBe(false);
  });

  it("validates batch UUID arrays and Excel export query parameters", () => {
    expect(
      batchVerificationSchema.safeParse({
        ids: ["550e8400-e29b-41d4-a716-446655440000"],
        action: "approved",
      }).success
    ).toBe(true);

    expect(
      batchVerificationSchema.safeParse({
        ids: ["not-a-uuid"],
        action: "approved",
      }).success
    ).toBe(false);

    const parsedExport = exportQuerySchema.parse({
      quarter: "Q1",
      year: "2025",
    });
    expect(parsedExport).toEqual({
      quarter: "Q1",
      year: 2025,
      status: "approved",
    });
  });
});

