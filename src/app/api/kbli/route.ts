import { NextResponse } from "next/server";
import { count, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { kbliConversions } from "@/db/schema";
import { getSectorWeightPercent } from "@/lib/constants/taxonomy";
import {
  getAllLampiran5Records,
  lookupFullKbliConversion,
} from "@/lib/kbli/crosswalk-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limitParam = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, limitParam))
      : 50;

    const [{ value: dbCount }] = await db
      .select({ value: count() })
      .from(kbliConversions);

    if (Number(dbCount) > 0) {
      const pattern = `%${q}%`;
      const rows = q
        ? await db
            .select()
            .from(kbliConversions)
            .where(
              or(
                ilike(kbliConversions.code2020, pattern),
                ilike(kbliConversions.code2025, pattern),
                ilike(kbliConversions.title2020, pattern),
                ilike(kbliConversions.title2025, pattern)
              )
            )
            .limit(limit)
        : await db.select().from(kbliConversions).limit(limit);

      const jsonLookup = new Map(
        getAllLampiran5Records().map((r) => [`${r.c20}-${r.c25}`, r])
      );

      const items = rows.map((row) => {
        const meta = jsonLookup.get(`${row.code2020}-${row.code2025}`);
        const pdrbCat = meta?.pdrb ?? "O";
        return {
          code2020: row.code2020,
          title2020: row.title2020,
          code2025: row.code2025,
          title2025: row.title2025,
          category: pdrbCat,
          category2025: meta?.k25 ?? pdrbCat,
          conversionType: (row.conversionType ?? meta?.type ?? "1_to_1") as
            | "1_to_1"
            | "split_1_to_n"
            | "merge_n_to_1"
            | "many_to_many",
          pdrbWeightPercent: getSectorWeightPercent(pdrbCat),
          lampiranRef: row.lampiranRef,
        };
      });

      return NextResponse.json({
        items,
        totalPairs: Number(dbCount),
        source: "BPS0000 Lampiran 5 (Peraturan BPS No. 7 Tahun 2025)",
      });
    }

    // Graceful fallback before seed completes
    const fallbackMatches = lookupFullKbliConversion(q, limit);
    return NextResponse.json({
      items: fallbackMatches.map((m) => ({
        code2020: m.c20,
        title2020: m.t20,
        code2025: m.c25,
        title2025: m.t25,
        category: m.pdrb,
        category2025: m.k25,
        conversionType: m.type,
        pdrbWeightPercent: getSectorWeightPercent(m.pdrb),
        lampiranRef: "BPS0000-L5",
      })),
      totalPairs: getAllLampiran5Records().length,
      source: "BPS0000 Lampiran 5 (Peraturan BPS No. 7 Tahun 2025)",
    });
  } catch (err) {
    console.error("KBLI GET error:", err);
    return NextResponse.json(
      { error: "Gagal memuat tabel konversi KBLI." },
      { status: 500 }
    );
  }
}
