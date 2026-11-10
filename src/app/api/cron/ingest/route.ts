import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCronOrOperator } from "@/lib/cron-auth";
import { runIngestionPipeline } from "@/lib/scrapers";

const ingestPayloadSchema = z
  .object({
    sources: z
      .array(
        z.enum([
          "koran_kaltara",
          "radar_tarakan",
          "tribun_kaltara",
          "benuanta",
          "antara_kaltara",
          "national_media",
        ])
      )
      .optional(),
    max_articles_per_source: z.number().int().min(1).max(50).optional(),
  })
  .optional();

export async function POST(request: Request) {
  const auth = await authorizeCronOrOperator(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.reason ?? "Unauthorized" },
      { status: auth.reason?.startsWith("Forbidden") ? 403 : 401 }
    );
  }

  try {
    const rawBody = await request.json().catch(() => undefined);
    const parsed = ingestPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload request ingest tidak valid." },
        { status: 400 }
      );
    }

    const stats = await runIngestionPipeline({
      sources: parsed.data?.sources,
      maxArticlesPerSource: parsed.data?.max_articles_per_source ?? 15,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      inserted: stats.inserted_articles,
      total_fetched: stats.scanned_urls,
      stats,
    });
  } catch (err) {
    console.error("Cron ingest error:", err);
    return NextResponse.json(
      { error: "Terjadi kegagalan internal saat menjalankan pipeline scraping." },
      { status: 500 }
    );
  }
}

