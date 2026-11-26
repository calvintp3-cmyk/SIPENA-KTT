// scripts/audit-economic-db.ts
import 'dotenv/config';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, pool } from '../server/db';
import { articles } from '../server/db/schema';
import {
  calibrateClassificationConfidence,
  enrichClassificationLinkages,
  mapClassificationToPersistence,
} from '../server/services/llm/classifier';
import { MultiLlmRouter } from '../server/services/llm/router';
import { extractArticleContent, normalizeToFullPageArticleUrl } from '../server/services/scraper/extractor';
import { detectKttSubdistrict } from '../server/services/scraper/geo-filter';
import { buildScraperPipelineRuntimeOptions } from '../server/utils/llm-config';
import { safeFetchText } from '../server/utils/ssrf';
import { formatDateTimeWita, getQuarterFromDateWita } from '../shared/utils/period';
import { VerificationStatusEnum } from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

const NOISE_LEAK_RE =
  /(?:E-?Paper\s+Koran\s+Kaltara|Baca\s+koran\s+digital|Dilarang\s+keras\s+mengambil\s+konten|first\s+appeared\s+on|Baca\s+juga\s*:|Artikel\s+Terkait|Berita\s+Terkini|<strong|<a\s+href|Advertisement|Scroll\s+to\s+continue)/i;

function parseLimitArg(args: string[]): number | null {
  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (!limitArg) return null;
  const val = Number(limitArg.split('=')[1]);
  return Number.isFinite(val) && val > 0 ? Math.floor(val) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const verifiedOnly = args.includes('--verified-only');
  const refetchHtml = args.includes('--refetch-html');
  const reclassifyLlm = args.includes('--reclassify-llm');
  const smartLlm = args.includes('--smart-llm');
  const limit = parseLimitArg(args);

  console.log('='.repeat(78));
  console.log('SIPENA KTT — AUDIT & UJI ULANG DATABASE BERITA EKONOMI');
  console.log(`Mode          : ${applyMode ? 'APPLY (Update Database)' : 'DRY-RUN (Hanya Audit & Simulasi)'}`);
  console.log(`Target Status : ${verifiedOnly ? 'VERIFIED saja' : 'VERIFIED + PENDING (Semua Ekonomi)'}`);
  console.log(`Refetch HTML  : ${refetchHtml ? 'YA (Unduh ulang naskah asli)' : 'TIDAK (Gunakan teks DB)'}`);
  console.log(
    `Reklasifikasi : ${
      reclassifyLlm
        ? 'YA (Semua artikel via LLM Router)'
        : smartLlm
          ? 'SMART SELECTIVE (LLM hanya untuk PENDING / teks kotor / terpotong / berubah signifikan)'
          : 'TIDAK (Audit Guardrails Deterministik saja)'
    }`,
  );
  console.log(`Limit         : ${limit ?? 'Semua artikel'}`);
  console.log('='.repeat(78));

  const targetStatuses = verifiedOnly
    ? [VerificationStatusEnum.VERIFIED]
    : [VerificationStatusEnum.VERIFIED, VerificationStatusEnum.PENDING];

  const baseQuery = db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.isEconomicPhenomenon, true),
        inArray(articles.verificationStatus, targetStatuses),
      ),
    )
    .orderBy(desc(articles.publishedAt));

  const rows = limit ? await baseQuery.limit(limit) : await baseQuery;
  console.log(`\nDitemukan ${rows.length} artikel ekonomi untuk diaudit.\n`);

  if (rows.length === 0) return;

  const llmRouter =
    reclassifyLlm || smartLlm
      ? (() => {
          const runtimeOpts = buildScraperPipelineRuntimeOptions();
          return new MultiLlmRouter({
            task: 'classify',
            maxCallsPerRun: rows.length * 2 + 50,
            transientRetryDelayMs: 3000,
            rateLimitCooldownMs: 12000,
            ...(runtimeOpts.routerOptions ?? {}),
          });
        })()
      : null;

  let textIssueCount = 0;
  let refetchedCleanCount = 0;
  let classificationChangedCount = 0;
  let rejectedNonEconCount = 0;
  let subdistrictFixedCount = 0;
  let updatedDbCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    let cleanSnippet = (row.snippetText ?? '').trim();
    let cleanWordCount = row.wordCount ?? 0;

    const hadNoiseLeak = NOISE_LEAK_RE.test(cleanSnippet);
    const endsMidWord =
      cleanSnippet.length > 50 &&
      !/[.!?'"”’)\]]$/.test(cleanSnippet) &&
      /\s[A-Za-z]{1,4}$/.test(cleanSnippet);

    if (hadNoiseLeak || endsMidWord) {
      textIssueCount += 1;
      console.log(
        `[TEKS BERMASALAH] [${row.verificationStatus}] ${row.sourcePortal} — "${row.title.slice(0, 65)}"` +
          ` (noise=${hadNoiseLeak}, terpotong=${endsMidWord}, kata=${cleanWordCount})`,
      );
    }

    if (refetchHtml && row.url.startsWith('http')) {
      try {
        const targetUrl = normalizeToFullPageArticleUrl(row.url);
        const fetched = await safeFetchText(targetUrl, { timeoutMs: 12_000 });
        const extracted = extractArticleContent(fetched.body, row.publishedAt, fetched.finalUrl);
        if (extracted.isValidContent && !extracted.isSoftBlocked) {
          if (extracted.snippetText.trim() !== cleanSnippet) {
            cleanSnippet = extracted.snippetText.trim();
            cleanWordCount = extracted.wordCount;
            refetchedCleanCount += 1;
            console.log(
              `  -> [REFETCH BERSIH] Kata: ${row.wordCount} -> ${cleanWordCount} ("${row.title.slice(0, 50)}")`,
            );
          }
        }
      } catch (err) {
        console.warn(
          `  -> [REFETCH GAGAL] ${row.url}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const period = getQuarterFromDateWita(row.publishedAt);
    const publishedAtWita = formatDateTimeWita(row.publishedAt);
    const detectedSubdistrict = detectKttSubdistrict(row.title, cleanSnippet);
    if (detectedSubdistrict && detectedSubdistrict !== row.subdistrict) {
      subdistrictFixedCount += 1;
    }

    let nextMapped: ReturnType<typeof mapClassificationToPersistence> | null = null;

    const wordDelta = Math.abs(cleanWordCount - (row.wordCount ?? 0));
    const shouldCallLlmForRow =
      Boolean(llmRouter) &&
      (reclassifyLlm ||
        (smartLlm &&
          (row.verificationStatus === VerificationStatusEnum.PENDING ||
            hadNoiseLeak ||
            endsMidWord ||
            wordDelta >= 20)));

    if (shouldCallLlmForRow && llmRouter) {
      const aiRes = await llmRouter.classifyArticle({
        title: row.title,
        sourcePortal: row.sourcePortal,
        sourceType: row.sourceType,
        publishedAtWita,
        defaultQuarter: period.quarter,
        defaultYear: period.year,
        snippetText: cleanSnippet,
      });

      if (aiRes.ok) {
        nextMapped = mapClassificationToPersistence(aiRes.classification, aiRes.modelUsed, cleanSnippet, {
          publishedAtWita,
          title: row.title,
          sourcePortal: row.sourcePortal,
          sourceType: row.sourceType,
        });
      } else {
        console.warn(`  -> [LLM GAGAL] ${row.id}: [${aiRes.errorCode}] ${aiRes.errorMessage}`);
      }
    } else if (
      row.kbliCategory &&
      row.kbliImpact &&
      row.expenditureComponent &&
      row.expenditureImpact
    ) {
      const currentAsRaw: LlmClassificationOutput = {
        geographic_scope: (row.geographicScope as LlmClassificationOutput['geographic_scope']) || 'KTT_LOCAL',
        is_economic_phenomenon: true,
        rejection_reason: null,
        summary: row.summary || row.title,
        kbli_category: row.kbliCategory,
        kbli_impact: row.kbliImpact,
        expenditure_component: row.expenditureComponent,
        expenditure_impact: row.expenditureImpact,
        secondary_kbli_category: row.secondaryKbliCategory,
        secondary_kbli_impact: row.secondaryKbliImpact,
        secondary_expenditure_component: row.secondaryExpenditureComponent,
        secondary_expenditure_impact: row.secondaryExpenditureImpact,
        quarter: row.quarter,
        year: row.year,
        confidence: row.llmConfidence ?? 0.85,
      };
      const guarded = enrichClassificationLinkages(currentAsRaw, `${row.title} ${cleanSnippet}`);
      const calibratedConf = calibrateClassificationConfidence(guarded.confidence, guarded, {
        title: row.title,
        sourcePortal: row.sourcePortal,
        sourceType: row.sourceType,
        publishedAtWita,
        defaultQuarter: period.quarter,
        defaultYear: period.year,
        snippetText: cleanSnippet,
      });
      nextMapped = mapClassificationToPersistence(
        { ...guarded, confidence: calibratedConf },
        row.llmModel ?? 'guardrail-audit',
        cleanSnippet,
        {
          publishedAtWita,
          title: row.title,
          sourcePortal: row.sourcePortal,
          sourceType: row.sourceType,
        },
      );
    }

    if (nextMapped) {
      const isDiff =
        nextMapped.isEconomicPhenomenon !== row.isEconomicPhenomenon ||
        nextMapped.kbliCategory !== row.kbliCategory ||
        nextMapped.kbliImpact !== row.kbliImpact ||
        nextMapped.expenditureComponent !== row.expenditureComponent ||
        nextMapped.expenditureImpact !== row.expenditureImpact ||
        nextMapped.secondaryKbliCategory !== row.secondaryKbliCategory;

      if (isDiff) {
        classificationChangedCount += 1;
        if (!nextMapped.isEconomicPhenomenon) {
          rejectedNonEconCount += 1;
        }
        console.log(
          `[PERUBAHAN KLASIFIKASI] [${row.verificationStatus}] "${row.title.slice(0, 60)}"\n` +
            `  Lama : ${row.kbliCategory}(${row.kbliImpact}) | ${row.expenditureComponent}(${row.expenditureImpact}) | sec=${row.secondaryKbliCategory ?? '-'}\n` +
            `  Baru : ${
              nextMapped.isEconomicPhenomenon
                ? `${nextMapped.kbliCategory}(${nextMapped.kbliImpact}) | ${nextMapped.expenditureComponent}(${nextMapped.expenditureImpact}) | sec=${nextMapped.secondaryKbliCategory ?? '-'}`
                : `NON-EKONOMI (${nextMapped.llmError ?? '-'})`
            }`,
        );
      }

      if (applyMode && (isDiff || cleanSnippet !== (row.snippetText ?? '').trim() || detectedSubdistrict !== row.subdistrict)) {
        // Pertahankan status VERIFIED kecuali ditolak menjadi non-ekonomi (atau tetap VERIFIED jika admin ingin review manual)
        const nextStatus =
          !nextMapped.isEconomicPhenomenon
            ? VerificationStatusEnum.IGNORED
            : row.verificationStatus === VerificationStatusEnum.VERIFIED
              ? VerificationStatusEnum.VERIFIED
              : VerificationStatusEnum.PENDING;

        await db
          .update(articles)
          .set({
            snippetText: cleanSnippet,
            wordCount: cleanWordCount,
            subdistrict: detectedSubdistrict ?? row.subdistrict,
            geographicScope: nextMapped.geographicScope,
            isEconomicPhenomenon: nextMapped.isEconomicPhenomenon,
            summary: nextMapped.summary,
            kbliCategory: nextMapped.kbliCategory,
            kbliImpact: nextMapped.kbliImpact,
            expenditureComponent: nextMapped.expenditureComponent,
            expenditureImpact: nextMapped.expenditureImpact,
            secondaryKbliCategory: nextMapped.secondaryKbliCategory,
            secondaryKbliImpact: nextMapped.secondaryKbliImpact,
            secondaryExpenditureComponent: nextMapped.secondaryExpenditureComponent,
            secondaryExpenditureImpact: nextMapped.secondaryExpenditureImpact,
            quarter: nextMapped.quarter,
            year: nextMapped.year,
            llmConfidence: nextMapped.llmConfidence,
            llmModel: nextMapped.llmModel,
            llmError: nextMapped.llmError,
            verificationStatus: nextStatus,
            updatedAt: new Date(),
          })
          .where(eq(articles.id, row.id));

        updatedDbCount += 1;
      }
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log('RINGKASAN AUDIT:');
  console.log(`- Total artikel diaudit                : ${rows.length}`);
  console.log(`- Artikel terdeteksi noise/terpotong   : ${textIssueCount}`);
  console.log(`- Artikel berhasil di-refetch bersih   : ${refetchedCleanCount}`);
  console.log(`- Kecamatan berhasil dilengkapi/koreksi: ${subdistrictFixedCount}`);
  console.log(`- Perubahan KBLI/Pengeluaran/Dampak    : ${classificationChangedCount} (${rejectedNonEconCount} menjadi non-ekonomi)`);
  if (applyMode) {
    console.log(`- Total baris database diperbarui      : ${updatedDbCount}`);
  } else {
    console.log(`- Mode DRY-RUN: Tidak ada baris database yang diubah.`);
  }
  console.log('='.repeat(78));
}

main()
  .catch((err) => {
    console.error('Fatal error saat audit-economic-db:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
