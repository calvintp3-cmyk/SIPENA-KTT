// server/db/reprocess-ignored-economic.ts
import 'dotenv/config';
import { eq, inArray, desc } from 'drizzle-orm';
import { db, pool } from './index';
import { articles } from './schema';
import { evaluateGeographicRelevance } from '../services/scraper/geo-filter';
import { extractArticle } from '../services/scraper/extractor';
import { MultiLlmRouter } from '../services/llm/router';
import {
  VerificationStatusEnum,
  LlmStatusEnum,
  type KbliCategoryEnum,
  type ExpenditureComponentEnum,
  type PdrbImpactEnum,
} from '../../shared/enums/pdrb';

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
      isEconomicPhenomenon: articles.isEconomicPhenomenon,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(eq(articles.verificationStatus, VerificationStatusEnum.IGNORED))
    .orderBy(desc(articles.publishedAt));

  console.info(`[1/3] Menemukan total ${ignoredArticles.length} artikel berstatus IGNORED.`);

  // 2. Filter kandidat yang sebenarnya relevan menurut evaluasi geo-filter yang telah diperbarui
  //    atau artikel yang memiliki konten ekonomi tetapi disaring pra-LLM
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

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.info(`[Kandidat ${i + 1}/${candidates.length}] ID: ${c.id}`);
    console.info(`  Judul  : ${c.title}`);
    console.info(`  Portal : ${c.sourcePortal} (${c.sourceType})`);
    console.info(`  Alasan Sebelumnya: ${c.llmError || c.llmModel}`);

    if (!applyMode) {
      console.info(`  [DRY-RUN] Melewati ekstraksi & pemanggilan LLM.`);
      continue;
    }

    // 3. Proses ekstraksi teks lengkap & eksekusi LLM Engine jika applyMode aktif
    let fullContent = (c.content || '').trim();
    if (fullContent.length < 200 && c.url.startsWith('http')) {
      console.info(`  Ekstraksi teks lengkap dari URL: ${c.url}...`);
      try {
        const extracted = await extractArticle(c.url);
        if (extracted && extracted.content && extracted.content.trim().length >= 100) {
          fullContent = extracted.content.trim();
          console.info(`  Ekstraksi berhasil: ${fullContent.length} karakter diperoleh.`);
        }
      } catch (extErr: unknown) {
        const msg = extErr instanceof Error ? extErr.message : String(extErr);
        console.warn(`  Ekstraksi gagal (${msg}), menggunakan teks yang ada.`);
      }
    }

    const textForClassification = fullContent.length >= 100 ? fullContent : (c.snippetText || c.title);

    console.info(`  Menjalankan klasifikasi LLM Engine...`);
    try {
      const llmResult = await MultiLlmRouter.getInstance().classifyArticle({
        id: c.id,
        title: c.title,
        content: textForClassification,
        sourceUrl: c.url,
        publishedAt: c.publishedAt || c.createdAt,
      });

      console.info(`  Hasil LLM via ${llmResult.modelUsed}:`);
      console.info(`    Fenomena Ekonomi: ${llmResult.isEconomicPhenomenon ? 'YA' : 'TIDAK'}`);
      console.info(`    Confidence: ${(llmResult.confidence * 100).toFixed(0)}%`);

      if (llmResult.isEconomicPhenomenon) {
        console.info(`    Ringkasan: ${llmResult.summary}`);
        console.info(`    KBLI     : ${llmResult.kbliCategory} (${llmResult.kbliImpact})`);
        console.info(`    Pengeluaran: ${llmResult.expenditureComponent} (${llmResult.expenditureImpact})`);
        console.info(`    STATUS -> DIPINDAHKAN KE 'PENDING' (Perlu Review)`);

        await db
          .update(articles)
          .set({
            isEconomicPhenomenon: true,
            summary: llmResult.summary,
            kbliCategory: llmResult.kbliCategory as KbliCategoryEnum,
            kbliImpact: llmResult.kbliImpact as PdrbImpactEnum,
            expenditureComponent: llmResult.expenditureComponent as ExpenditureComponentEnum,
            expenditureImpact: llmResult.expenditureImpact as PdrbImpactEnum,
            secondaryKbli: (llmResult.secondaryKbli as KbliCategoryEnum) || null,
            secondaryKbliImpact: (llmResult.secondaryKbliImpact as PdrbImpactEnum) || null,
            secondaryExpenditure: (llmResult.secondaryExpenditure as ExpenditureComponentEnum) || null,
            secondaryExpenditureImpact: (llmResult.secondaryExpenditureImpact as PdrbImpactEnum) || null,
            kttSubdistrict: llmResult.kttSubdistrict || null,
            confidence: String(llmResult.confidence),
            llmModel: llmResult.modelUsed,
            llmStatus: LlmStatusEnum.SUCCESS,
            llmError: null,
            content: fullContent.length > (c.content?.length || 0) ? fullContent : c.content,
            snippetText: fullContent.length > (c.snippetText?.length || 0) ? fullContent.slice(0, 500) : c.snippetText,
            verificationStatus: VerificationStatusEnum.PENDING,
          })
          .where(eq(articles.id, c.id));
      } else {
        console.info(`    Alasan Non-Ekonomi: ${llmResult.explanation || 'Bukan fenomena ekonomi'}`);
        await db
          .update(articles)
          .set({
            isEconomicPhenomenon: false,
            llmModel: llmResult.modelUsed,
            llmStatus: LlmStatusEnum.SUCCESS,
            llmError: llmResult.explanation || 'Evaluasi AI: Bukan fenomena ekonomi terkait Tana Tidung / Kaltara.',
            verificationStatus: VerificationStatusEnum.IGNORED,
          })
          .where(eq(articles.id, c.id));
      }
    } catch (llmErr: unknown) {
      const errMessage = llmErr instanceof Error ? llmErr.message : String(llmErr);
      console.error(`  Gagal klasifikasi LLM: ${errMessage}`);
    }

    console.info('');
  }

  console.info(`[3/3] Selesai memproses pemulihan berita.`);
}

main()
  .catch((err) => {
    console.error('Fatal error saat reprocess-ignored:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
