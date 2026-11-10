import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardStats } from "@/db/queries";
import { getCurrentSessionUser } from "@/lib/auth";

const statsQuerySchema = z.object({
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).default("Q1"),
  year: z.coerce.number().int().min(2020).max(2035).default(2025),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = statsQuerySchema.safeParse({
      quarter: searchParams.get("quarter") ?? undefined,
      year: searchParams.get("year") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parameter quarter atau year tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const stats = await getDashboardStats(parsed.data);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil ringkasan statistik PDRB." },
      { status: 500 }
    );
  }
}

