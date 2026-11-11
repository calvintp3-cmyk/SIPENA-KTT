import { NextResponse } from "next/server";
import { z } from "zod";
import { getPhenomenaList } from "@/db/queries";
import { getCurrentSessionUser } from "@/lib/auth";
import { SOURCE_MEDIA_VALUES } from "@/lib/constants/taxonomy";
import { phenomenonQuerySchema } from "@/types";

const extendedQuerySchema = phenomenonQuerySchema.extend({
  source: z.enum(SOURCE_MEDIA_VALUES).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string | undefined> = {};
    for (const key of [
      "status",
      "quarter",
      "year",
      "kbli_category",
      "expenditure_component",
      "source",
      "search",
      "page",
      "limit",
    ]) {
      const val = searchParams.get(key);
      if (val && val.trim() !== "") {
        rawParams[key] = val;
      }
    }

    const parsed = extendedQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parameter filter tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getPhenomenaList(parsed.data);
    return NextResponse.json({
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("Phenomena GET error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar fenomena ekonomi." },
      { status: 500 }
    );
  }
}

