import { NextResponse } from "next/server";
import { getExportPhenomena } from "@/db/queries";
import { getCurrentSessionUser } from "@/lib/auth";
import { generatePdrbPhenomenaWorkbook } from "@/lib/export/excel-generator";
import { exportQuerySchema } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = exportQuerySchema.safeParse({
      quarter: searchParams.get("quarter") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Parameter quarter atau year tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { quarter, year, status } = parsed.data;
    const items = await getExportPhenomena({ quarter, year, status });

    const buffer = await generatePdrbPhenomenaWorkbook({
      quarter,
      year,
      statusScope: status,
      items,
    });

    const filename = `Fenomena_Ekonomi_KTT_${quarter}_${year}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Excel export error:", err);
    return NextResponse.json(
      { error: "Gagal membuat berkas Excel (.xlsx)." },
      { status: 500 }
    );
  }
}

