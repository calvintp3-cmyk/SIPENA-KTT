import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { odonClassifications, odonEntries } from "@/db/schema";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";
import {
  getExpenditureWeightPercent,
  getSectorWeightPercent,
} from "@/lib/constants/taxonomy";
import { resolveDbUserId } from "@/lib/db-user";
import { resolveFullKbli2020To2025 } from "@/lib/kbli/crosswalk-server";
import type { ExpenditureCode, KbliCode } from "@/types/client";

const uuidParam = z.string().uuid();

const patchOdonSchema = z.object({
  title: z.string().min(5).max(500).optional(),
  economicPhenomenonSummary: z.string().min(10).max(5000).optional(),
  status: z.enum(["draft", "pending_curation", "verified", "archived"]).optional(),
  curatorNotes: z.string().max(1000).nullable().optional(),
  kbliCategory: z
    .enum([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M_N",
      "O",
      "P",
      "Q",
      "R_S_T_U",
    ])
    .optional(),
  kbliCode2020: z.string().regex(/^\d{5}$/).optional(),
  expenditureComponent: z
    .enum([
      "PK_RT",
      "PK_LNPRT",
      "PK_P",
      "PMTB",
      "PI",
      "EKSPOR",
      "IMPOR",
      "TIDAK_RELEVAN",
    ])
    .optional(),
  impactType: z.enum(["positif", "negatif", "netral"]).optional(),
});

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
        { error: "Akun Viewer tidak memiliki izin untuk mengubah klasifikasi ODON." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!uuidParam.safeParse(id).success) {
      return NextResponse.json({ error: "ID ODON tidak valid." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = patchOdonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data pembaruan ODON tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const dbUserId = await resolveDbUserId(user);
    const now = new Date();

    const updated = await db.transaction(async (tx) => {
      const [existingEntry] = await tx
        .select()
        .from(odonEntries)
        .where(eq(odonEntries.id, id))
        .limit(1);

      if (!existingEntry) return null;

      const nextStatus = payload.status ?? existingEntry.status;
      const becomesVerified = nextStatus === "verified";
      const newlyVerified = existingEntry.status !== "verified" && becomesVerified;

      const [savedEntry] = await tx
        .update(odonEntries)
        .set({
          entryDate: newlyVerified ? now : existingEntry.entryDate,
          title: payload.title ?? existingEntry.title,
          economicPhenomenonSummary:
            payload.economicPhenomenonSummary ?? existingEntry.economicPhenomenonSummary,
          status: nextStatus,
          curatorNotes:
            payload.curatorNotes !== undefined
              ? payload.curatorNotes
              : existingEntry.curatorNotes,
          verifiedBy: becomesVerified
            ? dbUserId ?? existingEntry.verifiedBy
            : existingEntry.verifiedBy,
          verifiedAt: becomesVerified ? existingEntry.verifiedAt ?? now : existingEntry.verifiedAt,
          updatedAt: now,
        })
        .where(eq(odonEntries.id, id))
        .returning();

      const hasClassificationUpdate =
        payload.kbliCategory !== undefined ||
        payload.kbliCode2020 !== undefined ||
        payload.expenditureComponent !== undefined ||
        payload.impactType !== undefined;

      if (hasClassificationUpdate) {
        const [existingCls] = await tx
          .select()
          .from(odonClassifications)
          .where(eq(odonClassifications.odonId, id))
          .limit(1);

        const nextCode2020 =
          payload.kbliCode2020 ?? existingCls?.kbliCode2020 ?? "84119";
        const resolved = resolveFullKbli2020To2025(nextCode2020);
        const nextCategory = (resolved?.pdrbCategory ??
          payload.kbliCategory ??
          existingCls?.kbliCategory ??
          "O") as KbliCode;
        const nextExp = (payload.expenditureComponent ??
          existingCls?.expenditureComponent ??
          "PK_P") as ExpenditureCode;
        const nextImpact =
          payload.impactType ?? existingCls?.impactType ?? "positif";

        const nextValues = {
          kbliCategory: nextCategory,
          kbliCode2020: nextCode2020,
          kbliTitle2020: resolved?.title2020 ?? existingCls?.kbliTitle2020 ?? nextCode2020,
          kbliCode2025: resolved?.code2025 ?? existingCls?.kbliCode2025 ?? nextCode2020,
          kbliTitle2025: resolved?.title2025 ?? existingCls?.kbliTitle2025 ?? nextCode2020,
          pdrbWeight: Number((getSectorWeightPercent(nextCategory) / 100).toFixed(4)),
          expenditureComponent: nextExp,
          expenditureWeight: Number(
            (getExpenditureWeightPercent(nextExp) / 100).toFixed(4)
          ),
          impactType: nextImpact,
        };

        if (existingCls) {
          await tx
            .update(odonClassifications)
            .set(nextValues)
            .where(eq(odonClassifications.id, existingCls.id));
        } else {
          await tx.insert(odonClassifications).values({
            odonId: id,
            ...nextValues,
          });
        }
      }

      return savedEntry;
    });

    if (!updated) {
      return NextResponse.json({ error: "Entri ODON tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("ODON PATCH error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui klasifikasi ODON." },
      { status: 500 }
    );
  }
}
