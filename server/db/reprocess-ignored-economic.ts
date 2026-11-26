// server/db/reprocess-ignored-economic.ts
import 'dotenv/config';
import { eq, desc, sql } from 'drizzle-orm';
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
  const onlyPreFilter = args.includes('--only-prefilter');
  const idArg = args.find((a) => a.startsWith('--id='));
  const targetId = idArg ? idArg.split('=')[1]?.trim() : null;
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '500', 10) : 500;

  console.info(`================================================================`);
  console.info(`[reprocess-ignored] SIPENA KTT - Pemulihan Berita Ekonomi Diabaikan`);
  console.info(`Mode: ${applyMode ? 'APPLY (Tulis langsung ke Database)' : 'DRY-RUN (Hanya analisa)'}`);
  console.info(`Filter: ${onlyPreFilter ? 'Khusus geo-filter / title-geo-filter' : 'Semua kandidat lolos geo-filter'}`);
  console.info(`Batas pemrosesan kandidat: ${limit}`);
  console.info(`================================================================\n`);

  const router = new MultiLlmRouter({ task: 'classify' });
  console.info(`Slot LLM terkonfigurasi: ${router.configuredSlotCount}`);

  // 1. Ambil breakdown llmModel dari artikel yang statusnya IGNORED
  const modelBreakdown = await db
    .select({
      llmModel: articles.llmModel,
      count: sql<number>`count(*)::int`,
    })
    .from(articles)
    .where(eq(articles.verificationStatus, VerificationStatusEnum.IGNORED))
    .groupBy(articles.llmModel);

  console.info('\nBreakdown artikel IGNORED berdasarkan llmModel:');
  console.table(modelBreakdown);

  // 2. Ambil artikel yang statusnya IGNORED
  const ignoredArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      snippetText: articles.snippetText,
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

  console.info(`\nMenemukan total ${ignoredArticles.length} artikel berstatus IGNORED.`);

  // 3. Filter kandidat
  const candidates: typeof ignoredArticles = [];

  if (targetId) {
    const [single] = await db
      .select({
        id: articles.id,
        title: articles.title,
        snippetText: articles.snippetText,
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
      .where(eq(articles.id, targetId));

    if (single) {
      candidates.push(single);
    } else {
      console.error(`Artikel dengan ID ${targetId} tidak ditemukan.`);
      return;
    }
  } else {
    for (const item of ignoredArticles) {
      const isPreFiltered =
        item.llmModel === 'geo-filter' ||
        item.llmModel === 'title-geo-filter' ||
        item.llmModel === 'system-insufficient-content' ||
        item.llmStatus === 'FAILED';

      if (onlyPreFilter && !isPreFiltered) {
        continue;
      }

      const geo = evaluateGeographicRelevance({
        title: item.title,
        snippetText: item.snippetText || '',
        url: item.url,
        sourceType: item.sourceType,
      });

      // Jika geo-filter terbaru memutuskan ALLOW_FOR_LLM_REVIEW
      if (geo.decision === 'ALLOW_FOR_LLM_REVIEW') {
        candidates.push(item);
        if (candidates.length >= limit) break;
      }
    }

    // Urutkan kandidat agar yang disaring pra-LLM (geo-filter) diproses duluan
    candidates.sort((a, b) => {
      const aPre = a.llmModel === 'geo-filter' || a.llmModel === 'title-geo-filter' ? 0 : 1;
      const bPre = b.llmModel === 'geo-filter' || b.llmModel === 'title-geo-filter' ? 0 : 1;
      return aPre - bPre;
    });
  }

  console.info(
    `Teridentifikasi ${candidates.length} artikel kandidat ekonomi yang perlu diproses/diuji ulang dengan LLM Engine.\n`,
  );

  if (candidates.length === 0) {
    console.info('Tidak ada artikel IGNORED yang memenuhi syarat pemulihan.');
    return;
  }

  let recoveredCount = 0;
  let stillIgnoredCount = 0;
  let failedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    console.info(`----------------------------------------------------------------`);
    console.info(`[Kandidat ${i + 1}/${candidates.length}] ID: ${c.id}`);
    console.info(`  Judul  : ${c.title}`);
    console.info(`  Portal : ${c.sourcePortal} (${c.sourceType})`);
    console.info(`  Model Sebelumnya: ${c.llmModel} | Alasan: ${c.llmError || '-'}`);

    if (!applyMode) {
      console.info(`  [DRY-RUN] Melewati ekstraksi & pemanggilan LLM.`);
      continue;
    }

    // Ekstraksi teks jika cuplikan singkat
    let textForClassification = (c.snippetText && c.snippetText.trim().length >= 100)
      ? c.snippetText.trim()
      : '';

    let updatedSnippet: string | null = null;
    let updatedWordCount: number | null = null;

    if (textForClassification.length < 200 && c.url.startsWith('http')) {
      console.info(`  Cuplikan singkat (${textForClassification.length} chars). Mengambil HTML dari ${c.url}...`);
      try {
        const fetched = await safeFetchText(c.url, { timeoutMs: 12_000 });
        if (fetched && fetched.body) {
          const extracted = extractArticleContent(fetched.body, c.publishedAt, fetched.finalUrl || c.url);
          if (extracted && extracted.snippetText && extracted.snippetText.trim().length >= 100) {
            textForClassification = extracted.snippetText.trim();
            updatedSnippet = textForClassification;
            updatedWordCount = extracted.wordCount;
            console.info(`  Ekstraksi berhasil: ${textForClassification.length} karakter (${extracted.wordCount} kata).`);
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
        {
          publishedAtWita: formatDateTimeWita(c.publishedAt),
          title: c.title,
          sourcePortal: c.sourcePortal,
          sourceType: c.sourceType,
        },
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
            llmConfidence: mapped.llmConfidence,
            llmModel: mapped.llmModel,
            llmStatus: mapped.llmStatus,
            llmError: null,
            verificationStatus: VerificationStatusEnum.PENDING,
            ...(updatedSnippet ? { snippetText: updatedSnippet } : {}),
            ...(updatedWordCount ? { wordCount: updatedWordCount } : {}),
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

    // Jeda 500ms antar panggilan
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.info(`\n================================================================`);
  console.info(`Selesai memproses.`);
  if (applyMode) {
    console.info(`Hasil Pemulihan:`);
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
