import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { economicPhenomena } from "@/db/schema";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";
import { getClientIp, recordAuditLog } from "@/lib/audit";
import { resolveDbUserId } from "@/lib/db-user";
import { batchVerificationSchema } from "@/types";

export async function POST(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditPhenomena(user)) {
      return NextResponse.json(
        { error: "Akun Viewer tidak memiliki izin untuk verifikasi massal." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = batchVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload verifikasi massal tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ids, action, reviewer_notes } = parsed.data;
    const ipAddress = getClientIp(request);
    const verifierUserId = await resolveDbUserId(user);

    const updatedCount = await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({ id: economicPhenomena.id, status: economicPhenomena.status })
        .from(economicPhenomena)
        .where(inArray(economicPhenomena.id, ids));

      if (existingRows.length === 0) {
        return 0;
      }

      const now = new Date();
      await tx
        .update(economicPhenomena)
        .set({
          status: action,
          reviewerNotes: reviewer_notes ?? undefined,
          verifiedBy: verifierUserId,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(inArray(economicPhenomena.id, ids));

      const auditAction = action === "approved" ? "BATCH_APPROVE" : "BATCH_REJECT";
      for (const row of existingRows) {
        await recordAuditLog(tx, {
          phenomenonId: row.id,
          userId: verifierUserId,
          action: auditAction,
          previousValues: { status: row.status },
          newValues: { status: action, reviewerNotes: reviewer_notes ?? null },
          ipAddress,
        });
      }

      return existingRows.length;
    });

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
    });
  } catch (err) {
    console.error("Batch verification error:", err);
    return NextResponse.json(
      { error: "Gagal memproses verifikasi massal." },
      { status: 500 }
    );
  }
}

