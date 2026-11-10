import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCronOrOperator } from "@/lib/cron-auth";
import { runAiExtractionPipeline } from "@/lib/ai/extract-phenomenon";

const extractPayloadSchema = z
  .object({
    batch_size: z.number().int().min(1).max(50).optional(),
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
    const parsed = extractPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload request ekstraksi tidak valid." },
        { status: 400 }
      );
    }

    const result = await runAiExtractionPipeline({
      batchSize: parsed.data?.batch_size ?? 20,
      concurrency: 3,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: result.processed_count,
      failed: result.results.failures,
      ...result,
    });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Gagal memproses artikel dengan Gemini Flash.";
    const status = msg.includes("GOOGLE_GENERATIVE_AI_API_KEY") ? 503 : 500;
    console.error("Cron extract error:", err);
    return NextResponse.json({ error: msg }, { status });
  }
}

