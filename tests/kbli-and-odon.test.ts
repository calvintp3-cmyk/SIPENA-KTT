import { describe, it, expect } from "vitest";
import {
  TOP_KTT_KBLI_CONVERSIONS,
  lookupKbliConversion,
  convertKbli2020To2025,
} from "../src/lib/kbli/conversions";
import {
  getAllLampiran5Records,
  lookupFullKbliConversion,
  resolveFullKbli2020To2025,
} from "../src/lib/kbli/crosswalk-server";
import {
  PDRB_KTT_WEIGHTS,
  PDRB_LAPANGAN_USAHA_2025,
  PDRB_PENGELUARAN_2025,
  PORTAL_SOURCES,
  getExpenditureWeightPercent,
} from "../src/lib/constants/taxonomy";

describe("Single Source of Truth: PDRB KTT 2025 Weights & Portals", () => {
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

  it("should cover all 17 PDRB Lapangan Usaha 2025 sectors summing near 100%", () => {
    const sectors = Object.values(PDRB_LAPANGAN_USAHA_2025);
    expect(sectors).toHaveLength(17);
    const totalWeight = Number(
      sectors.reduce((acc, sector) => acc + sector.weight, 0).toFixed(2)
    );
    expect(totalWeight).toBeGreaterThanOrEqual(99.95);
    expect(totalWeight).toBeLessThanOrEqual(100.05);
  });

  it("should have all 6 PDRB Pengeluaran 2025 shares and top 2 equaling 81.36%", () => {
    const { pengeluaran, top2PengeluaranShare } = PDRB_KTT_WEIGHTS;
    expect(pengeluaran.NET_EKSPOR.weight).toBe(49.98);
    expect(pengeluaran.PMTB.weight).toBe(31.38);
    expect(PDRB_PENGELUARAN_2025.PK_P.weight).toBe(9.80);
    expect(PDRB_PENGELUARAN_2025.PK_RT.weight).toBe(7.06);
    expect(PDRB_PENGELUARAN_2025.PK_LNPRT.weight).toBe(1.31);
    expect(PDRB_PENGELUARAN_2025.PI.weight).toBe(0.48);
    expect(getExpenditureWeightPercent("EKSPOR")).toBe(49.98);

    const sum = Number((pengeluaran.NET_EKSPOR.weight + pengeluaran.PMTB.weight).toFixed(2));
    expect(sum).toBe(81.36);
    expect(top2PengeluaranShare).toBe(81.36);

    const totalExpWeight = Number(
      Object.values(PDRB_PENGELUARAN_2025)
        .reduce((acc, item) => acc + item.weight, 0)
        .toFixed(2)
    );
    expect(totalExpWeight).toBeGreaterThanOrEqual(99.95);
    expect(totalExpWeight).toBeLessThanOrEqual(100.05);
  });

  it("should register all 7 verified portal sources including Fokus Borneo and Radar Tarakan Jawa Pos", () => {
    expect(PORTAL_SOURCES).toHaveLength(7);
    expect(PORTAL_SOURCES.some((p) => p.source === "fokus_borneo")).toBe(true);
    const radar = PORTAL_SOURCES.find((p) => p.source === "radar_tarakan");
    expect(radar?.url).toContain("radartarakan.jawapos.com");
  });
});

describe("KBLI 2020 <-> 2025 Crosswalk Engine (Highlight & Full 2,560 Pairs)", () => {
  it("should include 24 KTT dominant commodities with aligned 2025 titles", () => {
    expect(TOP_KTT_KBLI_CONVERSIONS).toHaveLength(24);
    const c05100 = convertKbli2020To2025("05100");
    expect(c05100.code2025).toBe("05101");
    expect(c05100.title2025).toBe("Pertambangan Batu Bara");

    const c01262 = convertKbli2020To2025("01262");
    expect(c01262.code2025).toBe("01262");
    expect(c01262.title2025).toBe("Pertanian Kelapa Sawit");
  });

  it("should allow search by keyword across KTT dominant commodities", () => {
    const batubaraMatches = lookupKbliConversion("batu bara");
    expect(batubaraMatches.length).toBeGreaterThan(0);
    expect(batubaraMatches.some((m) => m.code2020 === "05100")).toBe(true);

    const sawitMatches = lookupKbliConversion("sawit");
    expect(sawitMatches.length).toBeGreaterThan(0);
    expect(sawitMatches.some((m) => m.code2020 === "01262")).toBe(true);
  });

  it("should load all 2,560 official BPS0000 Lampiran 5 crosswalk pairs accurately", () => {
    const allRecords = getAllLampiran5Records();
    expect(allRecords).toHaveLength(2560);

    const kayu = resolveFullKbli2020To2025("02111");
    expect(kayu?.code2025).toBe("02102");
    expect(kayu?.pdrbCategory).toBe("A");

    const perikanan = resolveFullKbli2020To2025("03111");
    expect(perikanan?.code2025).toBe("03110");
    expect(perikanan?.pdrbCategory).toBe("A");

    const pelabuhanKonstruksi = resolveFullKbli2020To2025("42912");
    expect(pelabuhanKonstruksi?.code2025).toBe("42912");
    expect(pelabuhanKonstruksi?.pdrbCategory).toBe("F");

    const angkutanPelabuhan = resolveFullKbli2020To2025("50132");
    expect(angkutanPelabuhan?.code2025).toBe("52227");
    expect(angkutanPelabuhan?.pdrbCategory).toBe("H");

    // Verify category alphabet shifts from KBLI 2020 (Seri 2010 PDRB) -> KBLI 2025
    const telco = resolveFullKbli2020To2025("61100");
    expect(telco?.code2025).toBe("61101");
    expect(telco?.pdrbCategory).toBe("J");
    expect(telco?.category2025).toBe("K");

    const gov = resolveFullKbli2020To2025("84112");
    expect(gov?.pdrbCategory).toBe("O");
    expect(gov?.category2025).toBe("P");

    const fullSearch = lookupFullKbliConversion("02102", 10);
    expect(fullSearch.some((item) => item.c20 === "02111")).toBe(true);
  });
});

