import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  articleProposals,
  odonClassifications,
  odonEntries,
} from "@/db/schema";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";
import {
  getExpenditureWeightPercent,
  getSectorWeightPercent,
} from "@/lib/constants/taxonomy";
import { resolveDbUserId } from "@/lib/db-user";
import { resolveFullKbli2020To2025 } from "@/lib/kbli/crosswalk-server";
import { getQuarterFromDate } from "@/lib/utils";
import type { ExpenditureCode, KbliCode, SourceMediaCode } from "@/types/client";

const uuidParam = z.string().uuid();

const moderateProposalSchema = z.object({
  action: z.enum(["accept", "reject"]),
  kbliCode2020: z.string().regex(/^\d{5}$/).default("84119"),
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
    .default("PMTB"),
  impactType: z.enum(["positif", "negatif", "netral"]).default("positif"),
});

function inferSourceMediaFromUrl(rawUrl: string): SourceMediaCode {
  const lower = rawUrl.toLowerCase();
  if (lower.includes("korankaltara.com")) return "koran_kaltara";
  if (lower.includes("jawapos.com") || lower.includes("prokal.co")) return "radar_tarakan";
  if (lower.includes("tribunnews.com")) return "tribun_kaltara";
  if (lower.includes("benuanta.co.id")) return "benuanta";
  if (lower.includes("fokusborneo.com")) return "fokus_borneo";
  if (lower.includes("kaltara.antaranews.com")) return "antara_kaltara";
  return "national_media";
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
        { error: "Akun Viewer tidak memiliki izin untuk memoderasi usulan berita." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!uuidParam.safeParse(id).success) {
      return NextResponse.json({ error: "ID usulan tidak valid." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = moderateProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload moderasi usulan tidak valid." },
        { status: 400 }
      );
    }

    const { action, kbliCode2020, expenditureComponent, impactType } = parsed.data;
    const dbUserId = await resolveDbUserId(user);
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [proposal] = await tx
        .select()
        .from(articleProposals)
        .where(eq(articleProposals.id, id))
        .limit(1);

      if (!proposal) return null;

      const nextStatus = action === "accept" ? "accepted" : "rejected";
      const [updatedProposal] = await tx
        .update(articleProposals)
        .set({
          status: nextStatus,
          reviewedBy: dbUserId,
          reviewedAt: now,
        })
        .where(eq(articleProposals.id, id))
        .returning();

      let promotedOdonId: string | null = null;
      if (action === "accept") {
        const [existingOdon] = await tx
          .select({ id: odonEntries.id })
          .from(odonEntries)
          .where(eq(odonEntries.sourceUrl, proposal.url))
          .limit(1);

        if (existingOdon) {
          promotedOdonId = existingOdon.id;
        } else {
          const resolved = resolveFullKbli2020To2025(kbliCode2020);
          const kbliCategory = (resolved?.pdrbCategory ?? "O") as KbliCode;
          const quarter = getQuarterFromDate(now);
          const year = now.getUTCFullYear();

          const [newEntry] = await tx
            .insert(odonEntries)
            .values({
              entryDate: now,
              publishedDate: now,
              sourceMedia: inferSourceMediaFromUrl(proposal.url),
              sourceUrl: proposal.url,
              title: proposal.title || proposal.url,
              economicPhenomenonSummary:
                proposal.economicNotes ||
                `Usulan dari ${proposal.submitterName} (${proposal.submitterAgency ?? "Publik"})`,
              quarter,
              year,
              status: "pending_curation",
              curatorNotes: `Usulan publik dari ${proposal.submitterName}`,
            })
            .returning({ id: odonEntries.id });

          promotedOdonId = newEntry.id;

          await tx.insert(odonClassifications).values({
            odonId: newEntry.id,
            kbliCategory,
            kbliCode2020,
            kbliTitle2020: resolved?.title2020 ?? kbliCode2020,
            kbliCode2025: resolved?.code2025 ?? kbliCode2020,
            kbliTitle2025: resolved?.title2025 ?? kbliCode2020,
            pdrbWeight: Number((getSectorWeightPercent(kbliCategory) / 100).toFixed(4)),
            expenditureComponent: expenditureComponent as ExpenditureCode,
            expenditureWeight: Number(
              (getExpenditureWeightPercent(expenditureComponent) / 100).toFixed(4)
            ),
            impactType,
          });
        }
      }

      return { updatedProposal, promotedOdonId };
    });

    if (!result) {
      return NextResponse.json({ error: "Usulan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.updatedProposal,
      promotedOdonId: result.promotedOdonId,
    });
  } catch (err) {
    console.error("Proposals PATCH error:", err);
    return NextResponse.json(
      { error: "Gagal memproses moderasi usulan." },
      { status: 500 }
    );
  }
}

