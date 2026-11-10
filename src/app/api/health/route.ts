import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      ok: true,
      service: "sipena-ktt",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "sipena-ktt",
        db: "unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

