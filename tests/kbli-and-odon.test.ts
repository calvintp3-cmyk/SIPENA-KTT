import { describe, it, expect } from "vitest";
import {
  TOP_KTT_KBLI_CONVERSIONS,
  lookupKbliConversion,
  convertKbli2020To2025,
} from "../src/lib/kbli/conversions";
import { PDRB_KTT_WEIGHTS } from "../src/lib/constants/taxonomy";

describe("Single Source of Truth: PDRB KTT 2025 Weights", () => {
  it("should have correct top 4 sector shares equaling 88.14%", () => {
    const { lapanganUsaha, top4LapanganUsahaShare } = PDRB_KTT_WEIGHTS;
    expect(lapanganUsaha.B.weight).toBe(37.80);
    expect(lapanganUsaha.A.weight).toBe(23.41);
    expect(lapanganUsaha.F.weight).toBe(18.46);
    expect(lapanganUsaha.O.weight).toBe(8.47);

    const calculatedSum = Number(
      (
        lapanganUsaha.B.weight +
        lapanganUsaha.A.weight +
        lapanganUsaha.F.weight +
        lapanganUsaha.O.weight
      ).toFixed(2)
    );
    expect(calculatedSum).toBe(88.14);
    expect(top4LapanganUsahaShare).toBe(88.14);
  });

  it("should have correct expenditure dominant shares equaling 81.36%", () => {
    const { pengeluaran, top2PengeluaranShare } = PDRB_KTT_WEIGHTS;
    expect(pengeluaran.NET_EKSPOR.weight).toBe(49.98);
    expect(pengeluaran.PMTB.weight).toBe(31.38);

    const sum = Number((pengeluaran.NET_EKSPOR.weight + pengeluaran.PMTB.weight).toFixed(2));
    expect(sum).toBe(81.36);
    expect(top2PengeluaranShare).toBe(81.36);
  });
});

describe("KBLI 2020 ↔ 2025 Crosswalk Engine", () => {
  it("should correctly convert KBLI 2020 05100 to KBLI 2025 05101", () => {
    const result = convertKbli2020To2025("05100");
    expect(result.code2025).toBe("05101");
    expect(result.title2025).toBe("Penambangan Batubara");
  });

  it("should preserve KBLI 01262 for Kelapa Sawit", () => {
    const result = convertKbli2020To2025("01262");
    expect(result.code2025).toBe("01262");
    expect(result.title2025).toBe("Perkebunan Buah Kelapa Sawit");
  });

  it("should allow search by keyword across KTT dominant commodities", () => {
    const batubaraMatches = lookupKbliConversion("batubara");
    expect(batubaraMatches.length).toBeGreaterThan(0);
    expect(batubaraMatches.some((m) => m.code2020 === "05100")).toBe(true);

    const sawitMatches = lookupKbliConversion("sawit");
    expect(sawitMatches.length).toBeGreaterThan(0);
    expect(sawitMatches.some((m) => m.code2020 === "01262")).toBe(true);
  });
});

