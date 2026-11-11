import { NextResponse } from "next/server";
import { getOdonOverviewData } from "@/db/odon-queries";
import { getCurrentSessionUser } from "@/lib/auth";
import { generateOdonSheet6503Workbook } from "@/lib/export/excel-generator";

export async function GET(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quarterFilter = searchParams.get("quarter");
    const yearFilter = searchParams.get("year");
    const kbliFilter = searchParams.get("kbli");

    const { ledgerRows } = await getOdonOverviewData({ includeAdmin: false });

    const filtered = ledgerRows.filter((row) => {
      if (quarterFilter && quarterFilter !== "all" && row.quarter !== quarterFilter) {
        return false;
      }
      if (yearFilter && yearFilter !== "all" && String(row.year) !== yearFilter) {
        return false;
      }
      if (kbliFilter && kbliFilter !== "all" && row.kbliCategory !== kbliFilter) {
        return false;
      }
      return true;
    });

    const buffer = await generateOdonSheet6503Workbook({
      rows: filtered.map((r) => ({
        entryDate: r.entryDate,
        releaseDate: r.releaseDate,
        source: r.source,
        sourceUrl: r.sourceUrl,
        title: r.title,
        summary: r.summary,
        kbliCategory: r.kbliCategory,
        kbliCode2020: r.kbliCode2020,
        kbliTitle2020: r.kbliTitle2020,
        kbliCode2025: r.kbliCode2025,
        kbliTitle2025: r.kbliTitle2025,
        pdrbWeightPercent: r.pdrbWeightPercent,
        expenditureComponent: r.expenditureComponent,
        expenditureWeightPercent: r.expenditureWeightPercent,
        impactType: r.impactType,
        quarter: r.quarter,
        year: r.year,
        verifierName: r.verifierName,
      })),
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `ODON_6503_Tana_Tidung_${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ODON Export GET error:", err);
    return NextResponse.json(
      { error: "Gagal menghasilkan file Excel Sheet 6503." },
      { status: 500 }
    );
  }
}

