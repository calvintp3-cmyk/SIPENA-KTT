import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { articleProposals } from "@/db/schema";
import { getClientIp } from "@/lib/audit";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";
import { checkSlidingRateLimit } from "@/lib/rate-limit";

function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.includes(":") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    ) {
      return false;
    }
    return host.includes(".");
  } catch {
    return false;
  }
}

const createProposalSchema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine(isSafePublicHttpUrl, "URL berita harus menggunakan domain publik http/https yang valid."),
  title: z.string().trim().max(400).optional(),
  submitterName: z.string().trim().min(2).max(150).default("Masyarakat / OPD"),
  submitterAgency: z.string().trim().max(150).optional(),
  submitterEmail: z
    .string()
    .trim()
    .email()
    .max(150)
    .optional()
    .or(z.literal("")),
  economicNotes: z.string().trim().max(2000).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditPhenomena(user)) {
      return NextResponse.json(
        { error: "Hanya tim kurator BPS yang dapat melihat antrean moderasi usulan." },
        { status: 403 }
      );
    }

    const rows = await db
      .select()
      .from(articleProposals)
      .orderBy(desc(articleProposals.createdAt))
      .limit(100);

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("Proposals GET error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar usulan berita." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rate = checkSlidingRateLimit(`proposal:ip:${clientIp}`, {
      maxAttempts: 12,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak pengajuan dalam waktu singkat. Coba beberapa menit lagi." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Format usulan berita tidak valid. Pastikan URL diawali https://.",
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const derivedTitle =
      input.title && input.title.length >= 3
        ? input.title
        : new URL(input.url).hostname.replace(/^www\./, "");

    const [created] = await db
      .insert(articleProposals)
      .values({
        url: input.url,
        title: derivedTitle,
        submitterName: input.submitterName || "Masyarakat / OPD",
        submitterAgency: input.submitterAgency || "Masyarakat Umum / OPD",
        submitterEmail: input.submitterEmail || null,
        economicNotes:
          input.economicNotes ||
          "Usulan publik untuk ditinjau kesesuaiannya dengan indikator PDRB Tana Tidung.",
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error("Proposals POST error:", err);
    return NextResponse.json(
      { error: "Gagal mengirim usulan berita ke server." },
      { status: 500 }
    );
  }
}

