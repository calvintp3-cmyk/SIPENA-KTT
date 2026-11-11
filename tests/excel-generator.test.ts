import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  generateOdonSheet6503Workbook,
  generatePdrbPhenomenaWorkbook,
  sanitizeSpreadsheetText,
} from "@/lib/export/excel-generator";
import type { PhenomenonWithArticle } from "@/types";

describe("ExcelJS Diseminasi Workbook Generator & Formula Injection Protection", () => {
  it("neutralizes dangerous leading spreadsheet formula characters (CWE-1236)", () => {
    expect(sanitizeSpreadsheetText("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeSpreadsheetText("+SUM(A1:A10)")).toBe("'+SUM(A1:A10)");
    expect(sanitizeSpreadsheetText("-2+3")).toBe("'-2+3");
    expect(sanitizeSpreadsheetText("@HYPERLINK()")).toBe("'@HYPERLINK()");
    expect(sanitizeSpreadsheetText("Produksi Sawit KTT Normal")).toBe(
      "Produksi Sawit KTT Normal"
    );
  });

  it("builds a valid multi-sheet BPS XLSX workbook with accurate sheet placement and sanitized text", async () => {
    const sampleItems: PhenomenonWithArticle[] = [
      {
        id: "phen-1",
        articleId: "art-1",
        isEconomicPhenomenon: true,
        summary: "=BAD_FORMULA_SUM() Proyek jembatan Sesayap selesai.",
        kbliCategory: "F",
        kbliSubsector: "Konstruksi Jalan dan Jembatan",
        expenditureComponent: "PMTB",
        impactType: "positif",
        priceVolumeEffect: "volume",
        affectedCommodities: ["Semen", "Baja"],
        keyNumericalData: { nilai_proyek_miliar: 42 },
        quarter: "Q1",
        year: 2025,
        confidenceScore: 0.94,
        status: "approved",
        verifiedBy: "user-1",
        verifiedAt: new Date("2025-03-10T05:00:00Z"),
        reviewerNotes: "Valid SP2D",
        createdAt: new Date("2025-03-09T05:00:00Z"),
        updatedAt: new Date("2025-03-10T05:00:00Z"),
        article: {
          id: "art-1",
          title: "Pembangunan Infrastruktur KTT Rampung",
          url: "https://korankaltara.com/infrastruktur-ktt",
          source: "koran_kaltara",
          publishedDate: new Date("2025-03-08T05:00:00Z"),
          author: "Redaksi",
          content: "Konten lengkap berita pembangunan...",
        },
        verifier: {
          id: "user-1",
          name: "Analis Nerwilis",
          email: "analis@bps6504.go.id",
        },
      },
      {
        id: "phen-2",
        articleId: "art-2",
        isEconomicPhenomenon: true,
        summary: "Festival budaya lokal tanpa transaksi industri besar.",
        kbliCategory: "R_S_T_U",
        kbliSubsector: "Jasa Hiburan",
        expenditureComponent: "TIDAK_RELEVAN",
        impactType: "netral",
        priceVolumeEffect: "tidak_langsung",
        affectedCommodities: [],
        keyNumericalData: null,
        quarter: "Q1",
        year: 2025,
        confidenceScore: 0.72,
        status: "approved",
        verifiedBy: null,
        verifiedAt: null,
        reviewerNotes: null,
        createdAt: new Date("2025-03-05T05:00:00Z"),
        updatedAt: new Date("2025-03-05T05:00:00Z"),
        article: {
          id: "art-2",
          title: "Agenda Daerah",
          url: "https://benuanta.co.id/agenda-daerah",
          source: "benuanta",
          publishedDate: new Date("2025-03-04T05:00:00Z"),
          author: null,
          content: "Artikel agenda...",
        },
        verifier: null,
      },
    ];

    const buffer = await generatePdrbPhenomenaWorkbook({
      quarter: "Q1",
      year: 2025,
      statusScope: "approved",
      items: sampleItems,
    });

    // Verify ZIP/XLSX magic signature ("PK")
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const parsedWorkbook = new ExcelJS.Workbook();
    await parsedWorkbook.xlsx.load(new Uint8Array(buffer).buffer);

    const sheetNames = parsedWorkbook.worksheets.map((ws) => ws.name);
    expect(sheetNames).toEqual([
      "Lapangan Usaha KBLI",
      "Komponen Pengeluaran",
      "Ringkasan Eksekutif",
    ]);

    const sheet1 = parsedWorkbook.getWorksheet("Lapangan Usaha KBLI");
    expect(sheet1?.getCell(1, 1).value).toContain("Q1 TAHUN 2025");
    // Data starts on row 5 (row 1 banner, row 2 subtitle, row 3 spacer, row 4 header)
    expect(sheet1?.getRow(5).getCell(4).value).toBe(
      "'=BAD_FORMULA_SUM() Proyek jembatan Sesayap selesai."
    );
    expect(sheet1?.getRow(6).getCell(4).value).toBe(
      "Festival budaya lokal tanpa transaksi industri besar."
    );

    const sheet2 = parsedWorkbook.getWorksheet("Komponen Pengeluaran");
    // Row 5 exists (PMTB item), Row 6 should NOT exist because TIDAK_RELEVAN is excluded from Sheet 2
    expect(sheet2?.getRow(5).getCell(2).value).toContain("PMTB");
    expect(sheet2?.getRow(6).getCell(1).value).toBeNull();
  });

  it("builds ODON Sheet 6503 XLSX workbook with KBLI 2020<->2025 and CWE-1236 protection", async () => {
    const buffer = await generateOdonSheet6503Workbook({
      generatedAt: new Date("2025-05-10T05:00:00Z"),
      rows: [
        {
          entryDate: "2025-05-10",
          releaseDate: "2025-05-09",
          source: "Koran Kaltara",
          sourceUrl: "https://korankaltara.com/ekspor-batubara-ktt",
          title: "=SUM(1,2) Pengiriman Tongkang Batubara Sesayap",
          summary: "Volume pengapalan batubara menuju luar daerah meningkat pada Mei 2025.",
          kbliCategory: "B",
          kbliCode2020: "05100",
          kbliTitle2020: "Pertambangan Batubara",
          kbliCode2025: "05101",
          kbliTitle2025: "Pertambangan Batu Bara",
          pdrbWeightPercent: 37.80,
          expenditureComponent: "EKSPOR",
          expenditureWeightPercent: 49.98,
          impactType: "positif",
          quarter: "Q2",
          year: 2025,
          verifierName: "Admin Nerwilis 6504",
        },
      ],
    });

    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const parsedWorkbook = new ExcelJS.Workbook();
    await parsedWorkbook.xlsx.load(new Uint8Array(buffer).buffer);

    const sheet = parsedWorkbook.getWorksheet("Sheet 6503 ODON");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(4).getCell(8).value).toBe("KBLI 2020");
    expect(sheet?.getRow(4).getCell(9).value).toBe("KBLI 2025");
    expect(sheet?.getRow(5).getCell(5).value).toBe(
      "'=SUM(1,2) Pengiriman Tongkang Batubara Sesayap"
    );
    expect(sheet?.getRow(5).getCell(8).value).toBe("05100");
    expect(sheet?.getRow(5).getCell(9).value).toBe("05101");
    expect(sheet?.getRow(5).getCell(10).value).toBe("37.80%");
    expect(sheet?.getRow(5).getCell(12).value).toBe("49.98%");
  });
});

