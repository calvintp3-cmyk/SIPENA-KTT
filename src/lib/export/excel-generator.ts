import ExcelJS from "exceljs";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_CATEGORIES,
  SOURCE_MEDIA_LABELS,
} from "@/lib/constants/taxonomy";
import { formatShortDate } from "@/lib/utils";
import type { PhenomenonWithArticle } from "@/types";
import type { ExpenditureCode, KbliCode } from "@/types/client";

const BPS_NAVY_ARGB = "FF003366";
const BPS_SUBHEADER_ARGB = "FFE2E8F0";
const ZEBRA_FILL_ARGB = "FFF8FAFC";
const BORDER_COLOR_ARGB = "FFCBD5E1";

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
  left: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
  right: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
};

/**
 * Prevents spreadsheet formula injection (CSV/XLSX CWE-1236) on untrusted scraped text.
 */
export function sanitizeSpreadsheetText(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

function formatImpactLabel(impact: string | null): string {
  if (impact === "positif") return "Positif";
  if (impact === "negatif") return "Negatif";
  if (impact === "netral") return "Netral";
  return "-";
}

function formatEffectLabel(effect: string | null): string {
  if (effect === "volume") return "Volume";
  if (effect === "harga") return "Harga";
  if (effect === "keduanya") return "Harga & Volume";
  if (effect === "tidak_langsung") return "Tidak Langsung";
  return "-";
}

function formatNumericalSummary(
  data: Record<string, string | number | null> | null
): string {
  if (!data) return "-";
  const entries = Object.entries(data).filter(
    ([, val]) => val !== null && val !== ""
  );
  if (entries.length === 0) return "-";
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join("; ");
}

function applyBannerHeader(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  colSpan: number
) {
  sheet.mergeCells(1, 1, 1, colSpan);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = {
    name: "Calibri",
    size: 13,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BPS_NAVY_ARGB },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, colSpan);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: { argb: "FF1E293B" },
  };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BPS_SUBHEADER_ARGB },
  };
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(2).height = 20;

  sheet.addRow([]);
}

function styleTableHeaderRow(row: ExcelJS.Row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BPS_NAVY_ARGB },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = THIN_BORDER;
  });
}

export async function generatePdrbPhenomenaWorkbook(params: {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  statusScope: "approved" | "all";
  items: PhenomenonWithArticle[];
}): Promise<Buffer> {
  const { quarter, year, statusScope, items } = params;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIPENA-KTT — BPS Kabupaten Tana Tidung (65.04)";
  workbook.created = new Date();

  const statusText =
    statusScope === "approved"
      ? "Status: Hanya Telah Diverifikasi (Approved)"
      : "Status: Seluruh Data (Draft Rekonsiliasi)";
  const bannerTitle = `KOMPILASI FENOMENA EKONOMI TRIWULAN ${quarter} TAHUN ${year} — KABUPATEN TANA TIDUNG (65.04)`;
  const bannerSubtitle = `Badan Pusat Statistik Kabupaten Tana Tidung · ${statusText} · Dihasilkan: ${formatShortDate(new Date())}`;

  // =========================================================================
  // SHEET 1: FENOMENA LAPANGAN USAHA (17 KBLI)
  // =========================================================================
  const kbliSheet = workbook.addWorksheet("Lapangan Usaha KBLI", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const kbliWidths = [6, 30, 26, 52, 13, 16, 24, 24, 18, 14, 34, 18];
  kbliSheet.columns = kbliWidths.map((width) => ({ width }));

  applyBannerHeader(kbliSheet, bannerTitle, bannerSubtitle, kbliWidths.length);

  const kbliHeaderRow = kbliSheet.addRow([
    "No",
    "Kategori KBLI",
    "Rincian Subsektor",
    "Ringkasan Fenomena Ekonomi",
    "Arah Dampak",
    "Transmisi Efek",
    "Komoditas Terkait",
    "Angka Nominal Kunci",
    "Sumber Media",
    "Tanggal Terbit",
    "Tautan URL Artikel",
    "Verifikator / Status",
  ]);
  styleTableHeaderRow(kbliHeaderRow);

  const sortedByKbli = [...items].sort((a, b) =>
    (a.kbliCategory ?? "Z").localeCompare(b.kbliCategory ?? "Z")
  );

  sortedByKbli.forEach((item, idx) => {
    const kbliName = item.kbliCategory
      ? KBLI_CATEGORIES[item.kbliCategory as KbliCode]?.fullName ??
        item.kbliCategory
      : "Belum Terklasifikasi";

    const row = kbliSheet.addRow([
      idx + 1,
      sanitizeSpreadsheetText(kbliName),
      sanitizeSpreadsheetText(item.kbliSubsector ?? "-"),
      sanitizeSpreadsheetText(item.summary),
      formatImpactLabel(item.impactType),
      formatEffectLabel(item.priceVolumeEffect),
      sanitizeSpreadsheetText(
        item.affectedCommodities?.length
          ? item.affectedCommodities.join(", ")
          : "-"
      ),
      sanitizeSpreadsheetText(formatNumericalSummary(item.keyNumericalData)),
      SOURCE_MEDIA_LABELS[item.article.source] ?? item.article.source,
      formatShortDate(item.article.publishedDate),
      sanitizeSpreadsheetText(item.article.url),
      item.verifier?.name
        ? `${item.verifier.name} (${item.status.toUpperCase()})`
        : item.status.toUpperCase(),
    ]);

    row.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "top",
        horizontal: colNumber === 1 || colNumber === 10 ? "center" : "left",
        wrapText: true,
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_FILL_ARGB },
        };
      }
    });
  });

  // =========================================================================
  // SHEET 2: FENOMENA KOMPONEN PENGELUARAN PDRB
  // =========================================================================
  const expSheet = workbook.addWorksheet("Komponen Pengeluaran", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const expWidths = [6, 32, 26, 52, 13, 16, 24, 18, 14, 34];
  expSheet.columns = expWidths.map((width) => ({ width }));

  applyBannerHeader(expSheet, bannerTitle, bannerSubtitle, expWidths.length);

  const expHeaderRow = expSheet.addRow([
    "No",
    "Komponen Pengeluaran PDRB",
    "Kategori KBLI Terkait",
    "Ringkasan Fenomena Ekonomi",
    "Arah Dampak",
    "Transmisi Efek",
    "Angka Nominal Kunci",
    "Sumber Media",
    "Tanggal Terbit",
    "Tautan URL Artikel",
  ]);
  styleTableHeaderRow(expHeaderRow);

  const expenditureItems = [...items]
    .filter((i) => i.expenditureComponent !== "TIDAK_RELEVAN")
    .sort((a, b) =>
      (a.expenditureComponent ?? "Z").localeCompare(
        b.expenditureComponent ?? "Z"
      )
    );

  expenditureItems.forEach((item, idx) => {
    const expMeta = item.expenditureComponent
      ? EXPENDITURE_COMPONENTS[item.expenditureComponent as ExpenditureCode]
      : null;
    const expLabel = expMeta
      ? `${expMeta.label} — ${expMeta.fullName}`
      : "Belum Terpetakan";

    const kbliName = item.kbliCategory
      ? KBLI_CATEGORIES[item.kbliCategory as KbliCode]?.fullName ??
        item.kbliCategory
      : "-";

    const row = expSheet.addRow([
      idx + 1,
      sanitizeSpreadsheetText(expLabel),
      sanitizeSpreadsheetText(kbliName),
      sanitizeSpreadsheetText(item.summary),
      formatImpactLabel(item.impactType),
      formatEffectLabel(item.priceVolumeEffect),
      sanitizeSpreadsheetText(formatNumericalSummary(item.keyNumericalData)),
      SOURCE_MEDIA_LABELS[item.article.source] ?? item.article.source,
      formatShortDate(item.article.publishedDate),
      sanitizeSpreadsheetText(item.article.url),
    ]);

    row.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "top",
        horizontal: colNumber === 1 || colNumber === 9 ? "center" : "left",
        wrapText: true,
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_FILL_ARGB },
        };
      }
    });
  });

  // =========================================================================
  // SHEET 3: RINGKASAN EKSEKUTIF & STATISTIK FENOMENA
  // =========================================================================
  const summarySheet = workbook.addWorksheet("Ringkasan Eksekutif");
  summarySheet.columns = [
    { width: 42 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  applyBannerHeader(
    summarySheet,
    `RINGKASAN EKSEKUTIF FENOMENA PDRB — ${quarter} ${year}`,
    bannerSubtitle,
    5
  );

  // KBLI Aggregation Section
  const kbliSummaryHeader = summarySheet.addRow([
    "Kategori KBLI (Lapangan Usaha)",
    "Total Kasus",
    "Dampak Positif",
    "Dampak Negatif",
    "Netral",
  ]);
  styleTableHeaderRow(kbliSummaryHeader);

  const kbliStats = new Map<
    string,
    { label: string; total: number; pos: number; neg: number; netral: number }
  >();

  for (const item of items) {
    const code = item.kbliCategory ?? "UNSET";
    const label =
      code !== "UNSET"
        ? KBLI_CATEGORIES[code as KbliCode]?.fullName ?? code
        : "Belum Terklasifikasi";
    const entry = kbliStats.get(code) ?? {
      label,
      total: 0,
      pos: 0,
      neg: 0,
      netral: 0,
    };
    entry.total += 1;
    if (item.impactType === "positif") entry.pos += 1;
    else if (item.impactType === "negatif") entry.neg += 1;
    else entry.netral += 1;
    kbliStats.set(code, entry);
  }

  for (const rowStat of kbliStats.values()) {
    const r = summarySheet.addRow([
      rowStat.label,
      rowStat.total,
      rowStat.pos,
      rowStat.neg,
      rowStat.netral,
    ]);
    r.eachCell((cell, idx) => {
      cell.border = THIN_BORDER;
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { horizontal: idx === 1 ? "left" : "center" };
    });
  }

  summarySheet.addRow([]);

  // Expenditure Aggregation Section
  const expSummaryHeader = summarySheet.addRow([
    "Komponen Pengeluaran PDRB",
    "Total Kasus",
    "Dampak Positif",
    "Dampak Negatif",
    "Netral",
  ]);
  styleTableHeaderRow(expSummaryHeader);

  const expStats = new Map<
    string,
    { label: string; total: number; pos: number; neg: number; netral: number }
  >();

  for (const item of expenditureItems) {
    const code = item.expenditureComponent ?? "UNSET";
    const meta =
      code !== "UNSET"
        ? EXPENDITURE_COMPONENTS[code as ExpenditureCode]
        : null;
    const label = meta ? `${meta.label} — ${meta.fullName}` : code;
    const entry = expStats.get(code) ?? {
      label,
      total: 0,
      pos: 0,
      neg: 0,
      netral: 0,
    };
    entry.total += 1;
    if (item.impactType === "positif") entry.pos += 1;
    else if (item.impactType === "negatif") entry.neg += 1;
    else entry.netral += 1;
    expStats.set(code, entry);
  }

  for (const rowStat of expStats.values()) {
    const r = summarySheet.addRow([
      rowStat.label,
      rowStat.total,
      rowStat.pos,
      rowStat.neg,
      rowStat.netral,
    ]);
    r.eachCell((cell, idx) => {
      cell.border = THIN_BORDER;
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { horizontal: idx === 1 ? "left" : "center" };
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

