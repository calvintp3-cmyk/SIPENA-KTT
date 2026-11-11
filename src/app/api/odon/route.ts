import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getOdonOverviewData } from "@/db/odon-queries";
import {
  articles,
  economicPhenomena,
  odonClassifications,
  odonEntries,
} from "@/db/schema";
import { recordAuditLog, getClientIp } from "@/lib/audit";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";
import {
  SOURCE_MEDIA_VALUES,
  getExpenditureWeightPercent,
  getSectorWeightPercent,
} from "@/lib/constants/taxonomy";
import { resolveDbUserId } from "@/lib/db-user";
import { resolveFullKbli2020To2025 } from "@/lib/kbli/crosswalk-server";
import { getQuarterFromDate } from "@/lib/utils";
import type { ExpenditureCode, KbliCode } from "@/types/client";

const kbliCategoryZod = z.enum([
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
]);

const expenditureZod = z.enum([
  "PK_RT",
  "PK_LNPRT",
  "PK_P",
  "PMTB",
  "PI",
  "EKSPOR",
  "IMPOR",
  "TIDAK_RELEVAN",
]);

const createOdonSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("from_phenomenon"),
    phenomenonId: z.string().uuid(),
    kbliCategory: kbliCategoryZod.optional(),
    kbliCode2020: z.string().regex(/^\d{5}$/).optional(),
    expenditureComponent: expenditureZod.optional(),
    impactType: z.enum(["positif", "negatif", "netral"]).optional(),
    economicPhenomenonSummary: z.string().min(10).max(5000).optional(),
    curatorNotes: z.string().max(1000).optional(),
  }),
  z.object({
    mode: z.literal("manual"),
    sourceMedia: z.enum(SOURCE_MEDIA_VALUES).default("radar_tarakan"),
    sourceUrl: z.string().url().max(2000),
    title: z.string().min(5).max(500),
    economicPhenomenonSummary: z.string().min(10).max(5000),
    kbliCategory: kbliCategoryZod,
    kbliCode2020: z.string().regex(/^\d{5}$/),
    expenditureComponent: expenditureZod,
    impactType: z.enum(["positif", "negatif", "netral"]).default("positif"),
    quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
    year: z.coerce.number().int().min(2020).max(2035).optional(),
    status: z.enum(["verified", "pending_curation", "draft"]).default("verified"),
    curatorNotes: z.string().max(1000).optional(),
  }),
]);

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    const includeAdmin = Boolean(user && canEditPhenomena(user));
    const data = await getOdonOverviewData({ includeAdmin });
    return NextResponse.json(data);
  } catch (err) {
    console.error("ODON GET error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data ODON BPS 6504." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditPhenomena(user)) {
      return NextResponse.json(
        { error: "Hanya Admin/Editor Nerwilis yang dapat menetapkan entri ODON." },
        { status: 403 }
      );
    }

    const raw = await request.json().catch(() => null);
    const bodyWithMode =
      raw && typeof raw === "object" && !("mode" in raw)
        ? "phenomenonId" in raw
          ? { mode: "from_phenomenon", ...raw }
          : { mode: "manual", ...raw }
        : raw;

    const parsed = createOdonSchema.safeParse(bodyWithMode);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload penetapan ODON tidak valid.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const dbUserId = await resolveDbUserId(user);
    const ipAddress = getClientIp(request);
    const data = parsed.data;
    const now = new Date();

    if (data.mode === "from_phenomenon") {
      const createdId = await db.transaction(async (tx) => {
        const [row] = await tx
          .select({
            phenomenon: economicPhenomena,
            article: articles,
          })
          .from(economicPhenomena)
          .innerJoin(articles, eq(economicPhenomena.articleId, articles.id))
          .where(eq(economicPhenomena.id, data.phenomenonId))
          .limit(1);

        if (!row) return null;

        const chosenCategory = (data.kbliCategory ??
          row.phenomenon.kbliCategory ??
          "O") as KbliCode;
        const chosenCode2020 = data.kbliCode2020 ?? "84119";
        const resolved = resolveFullKbli2020To2025(chosenCode2020);
        const finalCategory = (resolved?.pdrbCategory ?? chosenCategory) as KbliCode;
        const chosenExp = (data.expenditureComponent ??
          row.phenomenon.expenditureComponent ??
          "PMTB") as ExpenditureCode;
        const summary =
          data.economicPhenomenonSummary?.trim() || row.phenomenon.summary;
        const impact = data.impactType ?? row.phenomenon.impactType ?? "positif";

        const [existingOdon] = await tx
          .select({ id: odonEntries.id })
          .from(odonEntries)
          .where(eq(odonEntries.articleId, row.article.id))
          .limit(1);

        let entryId: string;
        if (existingOdon) {
          entryId = existingOdon.id;
          await tx
            .update(odonEntries)
            .set({
              economicPhenomenonSummary: summary,
              status: "verified",
              curatorNotes: data.curatorNotes ?? "Ditetapkan dari antrean Meja Kurasi AI",
              verifiedBy: dbUserId,
              verifiedAt: now,
              updatedAt: now,
            })
            .where(eq(odonEntries.id, entryId));
          await tx
            .delete(odonClassifications)
            .where(eq(odonClassifications.odonId, entryId));
        } else {
          const [inserted] = await tx
            .insert(odonEntries)
            .values({
              articleId: row.article.id,
              entryDate: now,
              publishedDate: row.article.publishedDate,
              sourceMedia: row.article.source,
              sourceUrl: row.article.url,
              title: row.article.title,
              economicPhenomenonSummary: summary,
              quarter: row.phenomenon.quarter,
              year: row.phenomenon.year,
              status: "verified",
              curatorNotes: data.curatorNotes ?? "Ditetapkan dari antrean Meja Kurasi AI",
              verifiedBy: dbUserId,
              verifiedAt: now,
            })
            .returning({ id: odonEntries.id });
          entryId = inserted.id;
        }

        await tx.insert(odonClassifications).values({
          odonId: entryId,
          kbliCategory: finalCategory,
          kbliCode2020: chosenCode2020,
          kbliTitle2020: resolved?.title2020 ?? chosenCode2020,
          kbliCode2025: resolved?.code2025 ?? chosenCode2020,
          kbliTitle2025: resolved?.title2025 ?? chosenCode2020,
          pdrbWeight: Number((getSectorWeightPercent(finalCategory) / 100).toFixed(4)),
          expenditureComponent: chosenExp,
          expenditureWeight: Number(
            (getExpenditureWeightPercent(chosenExp) / 100).toFixed(4)
          ),
          impactType: impact,
        });

        await tx
          .update(economicPhenomena)
          .set({
            status: "approved",
            summary,
            kbliCategory: finalCategory,
            expenditureComponent: chosenExp,
            impactType: impact,
            verifiedBy: dbUserId,
            verifiedAt: now,
            updatedAt: now,
          })
          .where(eq(economicPhenomena.id, row.phenomenon.id));

        await recordAuditLog(tx, {
          phenomenonId: row.phenomenon.id,
          userId: dbUserId,
          action: "APPROVE",
          previousValues: { status: row.phenomenon.status },
          newValues: { status: "approved", promotedToOdonId: entryId },
          ipAddress,
        });

        return entryId;
      });

      if (!createdId) {
        return NextResponse.json(
          { error: "Kandidat fenomena tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, id: createdId }, { status: 201 });
    }

    // Manual creation mode
    const resolved = resolveFullKbli2020To2025(data.kbliCode2020);
    const finalCat = (resolved?.pdrbCategory ?? data.kbliCategory) as KbliCode;
    const isVerified = data.status === "verified";
    const quarter = data.quarter ?? getQuarterFromDate(now);
    const year = data.year ?? now.getUTCFullYear();

    const createdId = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(odonEntries)
        .values({
          entryDate: now,
          publishedDate: now,
          sourceMedia: data.sourceMedia,
          sourceUrl: data.sourceUrl,
          title: data.title.trim(),
          economicPhenomenonSummary: data.economicPhenomenonSummary.trim(),
          quarter,
          year,
          status: data.status,
          curatorNotes: data.curatorNotes ?? null,
          verifiedBy: isVerified ? dbUserId : null,
          verifiedAt: isVerified ? now : null,
        })
        .returning({ id: odonEntries.id });

      await tx.insert(odonClassifications).values({
        odonId: inserted.id,
        kbliCategory: finalCat,
        kbliCode2020: data.kbliCode2020,
        kbliTitle2020: resolved?.title2020 ?? data.kbliCode2020,
        kbliCode2025: resolved?.code2025 ?? data.kbliCode2020,
        kbliTitle2025: resolved?.title2025 ?? data.kbliCode2020,
        pdrbWeight: Number((getSectorWeightPercent(finalCat) / 100).toFixed(4)),
        expenditureComponent: data.expenditureComponent,
        expenditureWeight: Number(
          (getExpenditureWeightPercent(data.expenditureComponent) / 100).toFixed(4)
        ),
        impactType: data.impactType,
      });

      return inserted.id;
    });

    return NextResponse.json({ success: true, id: createdId }, { status: 201 });
  } catch (err) {
    console.error("ODON POST error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan entri ODON ke database." },
      { status: 500 }
    );
  }
}

