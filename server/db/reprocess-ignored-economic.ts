// server/db/reprocess-ignored-economic.ts
import 'dotenv/config';
import { eq, desc } from 'drizzle-orm';
import { db, pool } from './index';
import { articles } from './schema';
import { evaluateGeographicRelevance, detectKttSubdistrict } from '../services/scraper/geo-filter';
import { extractArticleContent } from '../services/scraper/extractor';
import { safeFetchText } from '../utils/ssrf';
import { MultiLlmRouter } from '../services/llm/router';
import { mapClassificationToPersistence } from '../services/llm/classifier';
import { formatDateTimeWita, getQuarterFromDateWita } from '../../shared/utils/period';
import { VerificationStatusEnum } from '../../shared/enums/pdrb';

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  console.info(`================================================================`);
  console.info(`[reprocess-ignored] SIPENA KTT - Pemulihan Berita Ekonomi Diabaikan`);
  console.info(`Mode: ${applyMode ? 'APPLY (Tulis langsung ke Database)' : 'DRY-RUN (Hanya analisa)'}`);
  console.info(`Batas pemrosesan kandidat: ${limit}`);
  console.info(`================================================================\n`);

  const router = new MultiLlmRouter({ task: 'classify' });
  console.info(`Slot LLM terkonfigurasi: ${router.configuredSlotCount}`);

  // 1. Ambil artikel yang statusnya IGNORED
  const ignoredArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      snippetText: articles.snippetText,
      content: articles.content,
      url: articles.url,
      sourceType: articles.sourceType,
      sourcePortal: articles.sourcePortal,
      llmModel: articles.llmModel,
      llmStatus: articles.llmStatus,
      llmError: articles.llmError,
      subdistrict: articles.subdistrict,
      isEconomicPhenomenon: articles.isEconomicPhenomenon,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(eq(articles.verificationStatus, VerificationStatusEnum.IGNORED))
    .orderBy(desc(articles.publishedAt));

  console.info(`[1/3] Menemukan total ${ignoredArticles.length} artikel berstatus IGNORED.`);

  // 2. Filter kandidat yang sebenarnya relevan menurut evaluasi geo-filter yang telah diperbarui
  const candidates: typeof ignoredArticles = [];

  for (const item of ignoredArticles) {
    const geo = evaluateGeographicRelevance({
      title: item.title,
      snippetText: item.snippetText || '',
      url: item.url,
      sourceType: item.sourceType,
    });

    // Jika geo-filter terbaru memutuskan ALLOW_FOR_LLM_REVIEW,
    // berarti artikel ini layak dievaluasi oleh LLM Engine!
    if (geo.decision === 'ALLOW_FOR_LLM_REVIEW') {
      candidates.push(item);
      if (candidates.length >= limit) break;
    }
  }

  console.info(
    `[2/3] Teridentifikasi ${candidates.length} artikel kandidat ekonomi yang perlu diuji ulang dengan LLM Engine.\n`,
  );

  if (candidates.length === 0) {
    console.info('Tidak ada artikel IGNORED yang memenuhi syarat pemulihan.');
    return;
  }

  let recoveredCount = 0;
  let stillIgnoredCount = 0;
  let failedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.info(`----------------------------------------------------------------`);
    console.info(`[Kandidat ${i + 1}/${candidates.length}] ID: ${c.id}`);
    console.info(`  Judul  : ${c.title}`);
    console.info(`  Portal : ${c.sourcePortal} (${c.sourceType})`);
    console.info(`  Model Sebelumnya: ${c.llmModel} | Alasan: ${c.llmError || '-'}`);

    if (!applyMode) {
      console.info(`  [DRY-RUN] Melewati ekstraksi & pemanggilan LLM.`);
      continue;
    }

    // 3. Proses ekstraksi teks jika snippetText / content masih terlalu pendek
    let textForClassification = (c.content && c.content.trim().length >= 100)
      ? c.content.trim()
      : (c.snippetText && c.snippetText.trim().length >= 100)
        ? c.snippetText.trim()
        : '';

    let updatedContent: string | null = null;
    let updatedSnippet: string | null = null;

    if (textForClassification.length < 150 && c.url.startsWith('http')) {
      console.info(`  Cuplikan singkat (${textForClassification.length} chars). Mengambil HTML dari ${c.url}...`);
      try {
        const fetched = await safeFetchText(c.url, { timeoutMs: 12_000 });
        if (fetched && fetched.body) {
          const extracted = extractArticleContent(fetched.body, c.publishedAt, fetched.finalUrl || c.url);
          if (extracted && extracted.body && extracted.body.trim().length >= 100) {
            textForClassification = extracted.body.trim();
            updatedContent = textForClassification;
            updatedSnippet = extracted.snippet || textForClassification.slice(0, 500);
            console.info(`  Ekstraksi berhasil: ${textForClassification.length} karakter diperoleh.`);
          }
        }
      } catch (extErr: unknown) {
        const msg = extErr instanceof Error ? extErr.message : String(extErr);
        console.warn(`  Ekstraksi HTTP gagal (${msg}), menggunakan teks yang tersedia.`);
      }
    }

    if (!textForClassification) {
      textForClassification = c.title;
    }

    console.info(`  Menjalankan klasifikasi LLM Engine...`);
    const defaultPeriod = getQuarterFromDateWita(c.publishedAt);

    try {
      const aiResult = await router.classifyArticle({
        title: c.title,
        sourcePortal: c.sourcePortal,
        sourceType: c.sourceType,
        publishedAtWita: formatDateTimeWita(c.publishedAt),
        defaultQuarter: defaultPeriod.quarter,
        defaultYear: defaultPeriod.year,
        snippetText: textForClassification,
      });

      if (!aiResult.ok) {
        console.error(`  Gagal LLM (${aiResult.errorCode}): ${aiResult.errorMessage}`);
        failedCount++;
        continue;
      }

      const mapped = mapClassificationToPersistence(
        aiResult.classification,
        aiResult.modelUsed,
        textForClassification,
      );

      console.info(`  Hasil LLM via ${aiResult.modelUsed} (${aiResult.providerUsed}, ${aiResult.responseTimeMs}ms):`);
      console.info(`    Fenomena Ekonomi : ${mapped.isEconomicPhenomenon ? 'YA' : 'TIDAK'}`);
      console.info(`    Confidence       : ${mapped.llmConfidence}`);

      if (mapped.isEconomicPhenomenon) {
        console.info(`    Ringkasan        : ${mapped.summary}`);
        console.info(`    KBLI             : ${mapped.kbliCategory} (${mapped.kbliImpact})`);
        console.info(`    Pengeluaran      : ${mapped.expenditureComponent} (${mapped.expenditureImpact})`);
        console.info(`    STATUS -> DIPINDAHKAN KE 'PENDING' (Perlu Review)`);

        const detectedSubdistrict = c.subdistrict || detectKttSubdistrict(c.title, textForClassification);

        await db
          .update(articles)
          .set({
            geographicScope: mapped.geographicScope,
            subdistrict: detectedSubdistrict,
            isEconomicPhenomenon: true,
            summary: mapped.summary,
            kbliCategory: mapped.kbliCategory,
            kbliImpact: mapped.kbliImpact,
            expenditureComponent: mapped.expenditureComponent,
            expenditureImpact: mapped.expenditureImpact,
            secondaryKbliCategory: mapped.secondaryKbliCategory,
            secondaryKbliImpact: mapped.secondaryKbliImpact,
            secondaryExpenditureComponent: mapped.secondaryExpenditureComponent,
            secondaryExpenditureImpact: mapped.secondaryExpenditureImpact,
            quarter: mapped.quarter,
            year: mapped.year,
            confidence: String(mapped.llmConfidence),
            llmConfidence: mapped.llmConfidence,
            llmModel: mapped.llmModel,
            llmStatus: mapped.llmStatus,
            llmError: null,
            verificationStatus: VerificationStatusEnum.PENDING,
            ...(updatedContent ? { content: updatedContent } : {}),
            ...(updatedSnippet ? { snippetText: updatedSnippet } : {}),
          })
          .where(eq(articles.id, c.id));

        recoveredCount++;
      } else {
        console.info(`    Evaluasi Non-Ekonomi: ${mapped.llmError || 'Bukan fenomena ekonomi'}`);
        await db
          .update(articles)
          .set({
            geographicScope: mapped.geographicScope,
            isEconomicPhenomenon: false,
            llmModel: mapped.llmModel,
            llmStatus: mapped.llmStatus,
            llmError: mapped.llmError || 'Evaluasi AI: Bukan fenomena ekonomi terkait Tana Tidung / Kaltara.',
            verificationStatus: VerificationStatusEnum.IGNORED,
          })
          .where(eq(articles.id, c.id));

        stillIgnoredCount++;
      }
    } catch (llmErr: unknown) {
      const errMessage = llmErr instanceof Error ? llmErr.message : String(llmErr);
      console.error(`  Exception saat memproses LLM: ${errMessage}`);
      failedCount++;
    }

    // Beri jeda kecil agar mematuhi rate limit jika ada banyak artikel
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.info(`\n================================================================`);
  console.info(`[3/3] Selesai memproses pemulihan berita.`);
  if (applyMode) {
    console.info(`Hasil:`);
    console.info(`  - Berhasil dipulihkan ke 'Perlu Review' (PENDING) : ${recoveredCount}`);
    console.info(`  - Dikonfirmasi AI sebagai Non-Ekonomi (IGNORED)   : ${stillIgnoredCount}`);
    console.info(`  - Gagal pemrosesan                                : ${failedCount}`);
  }
  console.info(`================================================================`);
}

main()
  .catch((err) => {
    console.error('Fatal error saat reprocess-ignored:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
