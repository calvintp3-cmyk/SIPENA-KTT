// scripts/reclassify-existing-articles.ts
import 'dotenv/config';
import { pool } from '../server/db';
import { MultiLlmRouter } from '../server/services/llm/router';
import {
  mapClassificationToPersistence,
  SIPENA_SYSTEM_INSTRUCTION,
} from '../server/services/llm/classifier';
import { buildScraperPipelineRuntimeOptions } from '../server/utils/llm-config';
import { safeFetchText } from '../server/services/scraper/fetcher';
import { extractArticleContent } from '../server/services/scraper/extractor';
import { determineQuarterAndYearFromWita } from '../shared/utils/period';
import { VerificationStatusEnum } from '../shared/enums/pdrb';

interface ArticleRow {
  id: string;
  url: string;
  source_portal: string;
  source_type: string;
  title: string;
  snippet_text: string;
  published_at: Date;
  quarter: number;
  year: number;
  is_economic_phenomenon: boolean | null;
  kbli_category: string | null;
  kbli_impact: string | null;
  expenditure_component: string | null;
  expenditure_impact: string | null;
  verification_status: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const delayArg = args.find((a) => a.startsWith('--delay='));
  const refetchTribun = args.includes('--refetch-tribun');
  const dryRun = args.includes('--dry-run');

  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  const callDelayMs = delayArg ? Number(delayArg.split('=')[1]) : 800;

  console.log('='.repeat(75));
  console.log('SIPENA KTT - RE-KLASIFIKASI & PENYELARASAN PDRB ARTIKEL LOKAL');
  console.log('='.repeat(75));
  console.log(`Mode               : ${dryRun ? 'DRY RUN (Hanya Preview)' : 'LIVE UPDATE DATABASE'}`);
  console.log(`Re-fetch Tribun    : ${refetchTribun ? 'AKTIF (Ekstrak ulang multipage inline text)' : 'NON-AKTIF'}`);
  console.log(`Jeda Antar-Panggilan: ${callDelayMs} ms`);
  if (limit) console.log(`Limit Artikel      : ${limit}`);
  console.log(`Waktu Mulai        : ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(75));

  const runtimeOpts = buildScraperPipelineRuntimeOptions();
  const llmRouter = new MultiLlmRouter({
    task: 'classify',
    ...(runtimeOpts.routerOptions ?? {}),
  });

  // Ambil semua artikel
  let query = `
    SELECT 
      id, url, source_portal, source_type, title, snippet_text, 
      published_at, quarter, year, is_economic_phenomenon,
      kbli_category, kbli_impact, expenditure_component, expenditure_impact,
      verification_status
    FROM articles 
    ORDER BY published_at DESC
  `;
  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  const { rows } = await pool.query<ArticleRow>(query);
  console.log(`Total artikel yang akan diproses: ${rows.length}\n`);

  let countSuccess = 0;
  let countFailed = 0;
  let countChangedEcon = 0;
  let countChangedNonEcon = 0;
  let countChangedKbli = 0;
  let countChangedExp = 0;
  let countRefetched = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const idxStr = `[${i + 1}/${rows.length}]`;
    let snippet = row.snippet_text;

    // Jika --refetch-tribun dan portalnya tribun, coba re-fetch untuk menangkap full script text
    if (refetchTribun && row.source_portal.toLowerCase().includes('tribun')) {
      try {
        const fetchRes = await safeFetchText(row.url, { timeoutMs: 10_000 });
        if (fetchRes.ok && fetchRes.html) {
          const extracted = extractArticleContent(fetchRes.html, row.source_portal);
          if (extracted.snippetText && extracted.snippetText.length > snippet.length) {
            snippet = extracted.snippetText;
            countRefetched += 1;
            if (!dryRun) {
              await pool.query(
                `UPDATE articles SET snippet_text = $1, word_count = $2 WHERE id = $3`,
                [extracted.snippetText, extracted.wordCount, row.id],
              );
            }
          }
        }
      } catch (err) {
        // Abaikan fetch error, tetap gunakan snippet lama
      }
    }

    const pubWita = new Date(row.published_at.getTime() + 8 * 3600_000);
    const publishedAtWitaStr = pubWita.toISOString().replace('T', ' ').slice(0, 19) + ' WITA';
    const period = determineQuarterAndYearFromWita(row.published_at);

    const classificationInput = {
      title: row.title,
      sourcePortal: row.source_portal,
      sourceType: row.source_type as any,
      publishedAtWita: publishedAtWitaStr,
      defaultQuarter: (period.quarter as 1 | 2 | 3 | 4) || 3,
      defaultYear: period.year || 2026,
      snippetText: snippet,
    };

    let attempts = 0;
    let aiResult: any = null;

    while (attempts < 3) {
      try {
        aiResult = await llmRouter.classifyArticle(classificationInput, {
          systemInstruction: SIPENA_SYSTEM_INSTRUCTION,
        });
        if (aiResult.ok) break;
        // Jika 429 atau error sementara, beri jeda lebih lama
        attempts += 1;
        console.warn(`    ⚠️ ${idxStr} Percobaan ${attempts} gagal: ${aiResult.error ?? 'Unknown error'}. Menunggu 2.5s...`);
        await delay(2500);
      } catch (err: any) {
        attempts += 1;
        console.warn(`    ⚠️ ${idxStr} Exception ${attempts}: ${err.message}. Menunggu 3s...`);
        await delay(3000);
      }
    }

    if (!aiResult || !aiResult.ok) {
      countFailed += 1;
      console.log(`${idxStr} ❌ GAGAL: "${row.title.slice(0, 45)}..." | Model: ${aiResult?.modelUsed ?? 'None'}`);
      continue;
    }

    countSuccess += 1;
    const mapped = mapClassificationToPersistence(aiResult.classification, aiResult.modelUsed);

    // Deteksi perbedaan dengan nilai lama
    const wasEcon = row.is_economic_phenomenon === true;
    const isEcon = mapped.isEconomicPhenomenon === true;
    let changeTag = '';

    if (!wasEcon && isEcon) {
      countChangedEcon += 1;
      changeTag = ' [⚡ Non-Econ -> ECON]';
    } else if (wasEcon && !isEcon) {
      countChangedNonEcon += 1;
      changeTag = ' [🚫 Econ -> NON-ECON]';
    }

    if (row.kbli_category !== mapped.kbliCategory && isEcon) {
      countChangedKbli += 1;
      changeTag += ` [KBLI: ${row.kbli_category ?? '-'} -> ${mapped.kbliCategory}]`;
    }

    if (row.expenditure_component !== mapped.expenditureComponent && isEcon) {
      countChangedExp += 1;
      changeTag += ` [Pengeluaran: ${row.expenditure_component ?? '-'} -> ${mapped.expenditureComponent}]`;
    }

    // Tentukan status verifikasi
    // Jika non-ekonomi -> IGNORED
    // Jika ekonomi: jika sebelumnya sudah VERIFIED oleh user manual, pertahankan VERIFIED; jika PENDING/IGNORED, set PENDING.
    let targetVerifStatus = mapped.verificationStatus;
    if (row.verification_status === VerificationStatusEnum.VERIFIED && isEcon) {
      targetVerifStatus = VerificationStatusEnum.VERIFIED;
    }

    if (!dryRun) {
      await pool.query(
        `
        UPDATE articles SET
          geographic_scope = $1,
          is_economic_phenomenon = $2,
          summary = $3,
          kbli_category = $4,
          kbli_impact = $5,
          expenditure_component = $6,
          expenditure_impact = $7,
          secondary_kbli_category = $8,
          secondary_kbli_impact = $9,
          secondary_expenditure_component = $10,
          secondary_expenditure_impact = $11,
          quarter = $12,
          year = $13,
          llm_model = $14,
          llm_status = $15,
          llm_error = $16,
          llm_confidence = $17,
          verification_status = $18,
          updated_at = NOW()
        WHERE id = $19
      `,
        [
          mapped.geographicScope,
          mapped.isEconomicPhenomenon,
          mapped.summary,
          mapped.kbliCategory,
          mapped.kbliImpact,
          mapped.expenditureComponent,
          mapped.expenditureImpact,
          mapped.secondaryKbliCategory,
          mapped.secondaryKbliImpact,
          mapped.secondaryExpenditureComponent,
          mapped.secondaryExpenditureImpact,
          mapped.quarter,
          mapped.year,
          mapped.llmModel,
          mapped.llmStatus,
          mapped.llmError,
          mapped.llmConfidence,
          targetVerifStatus,
          row.id,
        ],
      );
    }

    const shortTitle = row.title.length > 40 ? row.title.slice(0, 37) + '...' : row.title;
    const econLabel = isEcon
      ? `ECON [KBLI: ${mapped.kbliCategory} | Pengeluaran: ${mapped.expenditureComponent}]`
      : `NON-ECON (${mapped.geographicScope})`;

    console.log(
      `${idxStr} ${econLabel} | "${shortTitle}" (${aiResult.modelUsed}, ${aiResult.responseTimeMs}ms)${changeTag}`,
    );

    // Beri jeda antar-panggilan agar santai pada rate limit free tier
    if (i < rows.length - 1) {
      await delay(callDelayMs);
    }
  }

  console.log('\n' + '='.repeat(75));
  console.log('REKAPITULASI HASIL RE-KLASIFIKASI:');
  console.log('='.repeat(75));
  console.log(`Total Diproses             : ${rows.length}`);
  console.log(`Berhasil                   : ${countSuccess}`);
  console.log(`Gagal                      : ${countFailed}`);
  if (refetchTribun) console.log(`Artikel Tribun Direfetch   : ${countRefetched}`);
  console.log(`Berubah Menjadi Fenomena   : ${countChangedEcon}`);
  console.log(`Berubah Menjadi Non-Ekonomi: ${countChangedNonEcon}`);
  console.log(`KBLI Bergeser/Terkoreksi   : ${countChangedKbli}`);
  console.log(`Pengeluaran Terkoreksi     : ${countChangedExp}`);
  console.log('='.repeat(75));

  // Query hasil distribusi akhir di DB jika tidak dry run
  if (!dryRun) {
    const finalStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_economic_phenomenon = true THEN 1 END) as econ,
        COUNT(CASE WHEN is_economic_phenomenon = false THEN 1 END) as non_econ
      FROM articles
    `);
    console.log('\nDistribusi Status Akhir di Database:');
    console.table(finalStats.rows);

    const finalKbli = await pool.query(`
      SELECT kbli_category, COUNT(*) as jumlah
      FROM articles
      WHERE is_economic_phenomenon = true
      GROUP BY kbli_category
      ORDER BY jumlah DESC
    `);
    console.log('\nDistribusi KBLI 2025 Terkini:');
    console.table(finalKbli.rows);

    const finalExp = await pool.query(`
      SELECT expenditure_component, COUNT(*) as jumlah
      FROM articles
      WHERE is_economic_phenomenon = true
      GROUP BY expenditure_component
      ORDER BY jumlah DESC
    `);
    console.log('\nDistribusi Komponen Pengeluaran Terkini:');
    console.table(finalExp.rows);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal Reclassification Error:', err);
  await pool.end();
  process.exit(1);
});
