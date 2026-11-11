// server/api/admin/synthesis/generate.post.ts
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import {
  EXPENDITURE_IMPACT_LABELS,
  KBLI_IMPACT_LABELS,
  VerificationStatusEnum,
} from '../../../../shared/enums/pdrb';
import { SynthesisGenerateSchema } from '../../../../shared/schemas/article.schema';
import { formatDateId, formatPeriodLabel } from '../../../../shared/utils/period';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import {
  buildGroundedBrsFallbackNarrative,
  resolveSynthesisTargetLabel,
} from '../../../services/analytics/pdrb-analytics';
import {
  FALLBACK_GEMINI_MODEL,
  PRIMARY_GEMINI_MODEL,
} from '../../../services/llm/gemini-client';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

const SYNTHESIS_TIMEOUT_MS = 22_000;

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, SynthesisGenerateSchema);

  const selectedRows = await db
    .select({
      id: articles.id,
      title: articles.title,
      summary: articles.summary,
      sourcePortal: articles.sourcePortal,
      url: articles.url,
      kbliCategory: articles.kbliCategory,
      kbliImpact: articles.kbliImpact,
      expenditureComponent: articles.expenditureComponent,
      expenditureImpact: articles.expenditureImpact,
      publishedAt: articles.publishedAt,
      quarter: articles.quarter,
      year: articles.year,
    })
    .from(articles)
    .where(
      and(
        inArray(articles.id, Array.from(new Set(body.articleIds))),
        eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
      ),
    )
    .orderBy(desc(articles.publishedAt));

  if (selectedRows.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Tidak ada artikel berstatus Terverifikasi yang ditemukan dari pilihan Anda.',
    });
  }

  const periodLabel = formatPeriodLabel(body.quarter, body.year);
  const targetLabel = resolveSynthesisTargetLabel(body.dimension, body.targetCode);

  const citations = selectedRows.map((row, idx) => ({
    index: idx + 1,
    id: row.id,
    title: row.title,
    sourcePortal: row.sourcePortal,
    publishedAt:
      row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt),
    url: row.url,
    kbliCategory: row.kbliCategory,
    kbliImpact: row.kbliImpact,
    expenditureComponent: row.expenditureComponent,
    expenditureImpact: row.expenditureImpact,
  }));

  const runtimeCfg = useRuntimeConfig(event);
  const apiKey = (runtimeCfg.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const hasValidKey = Boolean(apiKey && !apiKey.includes('GANTI_DENGAN_GEMINI_API_KEY'));

  const styleGuideMap: Record<typeof body.style, string> = {
    BRS_FORMAL:
      'Gaya Berita Resmi Statistik (BRS) BPS RI formal: 2-3 subjudul (`## ...`), paragraf analitis lugas, memisahkan faktor pendorong riil/NTB dan tekanan harga/kendala lapangan.',
    EXECUTIVE_BRIEF:
      'Gaya Ringkasan Eksekutif Pimpinan BPS / Kepala Daerah: ringkas, padat, maksimal 3 bagian (`## Ringkasan Eksekutif`, `## Sinyal Lapangan Utama`, `## Implikasi Rekonsiliasi`).',
    BULLET_POINTS:
      'Gaya Butir-Butir Fenomena Terstruktur (`## Butir Fenomena` + daftar `- ...` diikuti `## Catatan Metodologis Nerwilis`) siap tempel ke tabel lampiran.',
  };

  const dossierLines = selectedRows.map((art, i) => {
    const kbliImpact = art.kbliImpact ? KBLI_IMPACT_LABELS[art.kbliImpact] : '-';
    const expImpact = art.expenditureImpact
      ? EXPENDITURE_IMPACT_LABELS[art.expenditureImpact]
      : '-';
    return [
      `[${i + 1}] Judul: ${art.title}`,
      `Portal & Tgl: ${art.sourcePortal} (${formatDateId(art.publishedAt)})`,
      `Pemetaan PDRB: KBLI=${art.kbliCategory ?? '-'} (${kbliImpact}); Pengeluaran=${art.expenditureComponent ?? '-'} (${expImpact})`,
      `Ringkasan Terverifikasi: ${art.summary || art.title}`,
    ].join('\n');
  });

  const systemInstruction = `Anda adalah Statistisi Ahli Fungsi Neraca Wilayah dan Analisis Statistik (Nerwilis) BPS Kabupaten Tana Tidung.
Tugas: Menyusun draf sintesis narasi kualitatif PDRB berdasarkan kumpulan bukti fenomena media yang telah diverifikasi.

ATURAN KETAT (ANTI-HALUSINASI):
1. Gunakan HANYA fakta dari sumber bernomor [1]..[${selectedRows.length}] yang diberikan.
2. DILARANG KERAS mengarang angka persentase pertumbuhan ekonomi (y-on-y, q-to-q, c-to-c), share PDRB, atau nominal Rupiah yang tidak tertera eksplisit pada ringkasan sumber.
3. Setiap klaim fakta atau peristiwa WAJIB mencantumkan nomor sitasi di akhir kalimat dalam format kurung siku, misalnya [1] atau [1][3].
4. Output berupa Markdown bersih berbahasa Indonesia baku (tanpa frontmatter, tanpa HTML, tanpa blok kode pembungkus).`;

  const userPrompt = [
    `Periode Analisis: ${periodLabel}`,
    `Dimensi & Target: ${body.dimension === 'kbli' ? 'Lapangan Usaha' : 'Pengeluaran'} — ${targetLabel}`,
    `Format Gaya Penulisan: ${styleGuideMap[body.style]}`,
    '',
    'BAHAN SUMBER TERVERIFIKASI:',
    ...dossierLines,
  ].join('\n\n');

  let narrativeMarkdown: string | null = null;
  let modelUsed: string | null = null;
  let notice: string | null = null;
  let mode: 'gemini' | 'template' = 'template';

  if (hasValidKey) {
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL] as const;

    for (const candidateModel of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model: candidateModel,
          contents: userPrompt,
          config: {
            systemInstruction,
            maxOutputTokens: 1800,
            temperature: 0.25,
            thinkingConfig: {
              thinkingLevel:
                candidateModel === PRIMARY_GEMINI_MODEL
                  ? ThinkingLevel.LOW
                  : ThinkingLevel.MINIMAL,
            },
            httpOptions: {
              timeout: SYNTHESIS_TIMEOUT_MS,
              retryOptions: { attempts: 1 },
            },
          },
        });
        const text = res.text?.trim();
        if (text && text.length >= 40) {
          narrativeMarkdown = text;
          modelUsed = candidateModel;
          mode = 'gemini';
          notice = null;
          break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        notice = `Gemini Flash sementara tidak dapat dijangkau (${msg.slice(0, 120)}). Draf disusun otomatis dari template analitis BPS berakar data terverifikasi.`;
      }
    }
  } else {
    notice =
      'GEMINI_API_KEY belum terkonfigurasi pada environment server. Draf disusun otomatis dari template BRS deterministik yang terikat pada artikel terpilih.';
  }

  if (!narrativeMarkdown) {
    narrativeMarkdown = buildGroundedBrsFallbackNarrative({
      periodLabel,
      dimension: body.dimension,
      targetCode: body.targetCode,
      style: body.style,
      articles: selectedRows,
    });
    mode = 'template';
  }

  return {
    narrativeMarkdown,
    mode,
    modelUsed,
    notice,
    citations,
    generatedAt: new Date().toISOString(),
    articleCount: selectedRows.length,
  };
});

