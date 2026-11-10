import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { articles, auditLogs, economicPhenomena, users } from "@/db/schema";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";
import { getClientIp, recordAuditLog } from "@/lib/audit";
import { updatePhenomenonSchema } from "@/types";

const uuidParamSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!uuidParamSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID fenomena tidak valid." }, { status: 400 });
    }

    const [row] = await db
      .select({
        phenomenon: economicPhenomena,
        article: articles,
        verifier: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(economicPhenomena)
      .innerJoin(articles, eq(economicPhenomena.articleId, articles.id))
      .leftJoin(users, eq(economicPhenomena.verifiedBy, users.id))
      .where(eq(economicPhenomena.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Fenomena tidak ditemukan." }, { status: 404 });
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        previousValues: auditLogs.previousValues,
        newValues: auditLogs.newValues,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.phenomenonId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    return NextResponse.json({
      data: {
        ...row.phenomenon,
        article: row.article,
        verifier: row.verifier?.id ? row.verifier : null,
      },
      auditLogs: logs,
    });
  } catch (err) {
    console.error("Phenomenon detail GET error:", err);
    return NextResponse.json({ error: "Gagal mengambil detail fenomena." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditPhenomena(user)) {
      return NextResponse.json(
        { error: "Akun Viewer tidak memiliki izin untuk memverifikasi atau menyunting data." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!uuidParamSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID fenomena tidak valid." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updatePhenomenonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data pembaruan tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const ipAddress = getClientIp(request);

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(economicPhenomena)
        .where(eq(economicPhenomena.id, id))
        .limit(1);

      if (!existing) {
        return null;
      }

      const now = new Date();
      const isFinalDecision = payload.status === "approved" || payload.status === "rejected";

      const updateValues = {
        summary: payload.summary ?? existing.summary,
        kbliCategory:
          payload.kbli_category !== undefined ? payload.kbli_category : existing.kbliCategory,
        kbliSubsector:
          payload.kbli_subsector !== undefined ? payload.kbli_subsector : existing.kbliSubsector,
        expenditureComponent:
          payload.expenditure_component !== undefined
            ? payload.expenditure_component
            : existing.expenditureComponent,
        impactType: payload.impact_type !== undefined ? payload.impact_type : existing.impactType,
        priceVolumeEffect:
          payload.price_volume_effect !== undefined
            ? payload.price_volume_effect
            : existing.priceVolumeEffect,
        status: payload.status,
        reviewerNotes:
          payload.reviewer_notes !== undefined ? payload.reviewer_notes : existing.reviewerNotes,
        verifiedBy: isFinalDecision ? user.id : existing.verifiedBy,
        verifiedAt: isFinalDecision ? now : existing.verifiedAt,
        updatedAt: now,
      };

      const [saved] = await tx
        .update(economicPhenomena)
        .set(updateValues)
        .where(eq(economicPhenomena.id, id))
        .returning();

      const action =
        payload.status === "approved"
          ? "APPROVE"
          : payload.status === "rejected"
            ? "REJECT"
            : "EDIT";

      await recordAuditLog(tx, {
        phenomenonId: id,
        userId: user.id,
        action,
        previousValues: {
          status: existing.status,
          kbliCategory: existing.kbliCategory,
          expenditureComponent: existing.expenditureComponent,
          impactType: existing.impactType,
          priceVolumeEffect: existing.priceVolumeEffect,
          summary: existing.summary,
        },
        newValues: {
          status: saved.status,
          kbliCategory: saved.kbliCategory,
          expenditureComponent: saved.expenditureComponent,
          impactType: saved.impactType,
          priceVolumeEffect: saved.priceVolumeEffect,
          summary: saved.summary,
          reviewerNotes: saved.reviewerNotes,
        },
        ipAddress,
      });

      return saved;
    });

    if (!updated) {
      return NextResponse.json({ error: "Fenomena tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("Phenomenon PATCH error:", err);
    return NextResponse.json({ error: "Gagal menyimpan verifikasi fenomena." }, { status: 500 });
  }
}

