// scripts/reclassify-existing-articles.ts
import 'dotenv/config';
import { pool } from '../server/db';
import { MultiLlmRouter } from '../server/services/llm/router';
import {
  mapClassificationToPersistence,
  SIPENA_SYSTEM_INSTRUCTION,
} from '../server/services/llm/classifier';
import { buildScraperPipelineRuntimeOptions } from '../server/utils/llm-config';
import { safeFetchText } from '../server/utils/ssrf';
import { extractArticleContent } from '../server/services/scraper/extractor';
import { getQuarterFromDateWita } from '../shared/utils/period';
import { VerificationStatusEnum } from '../shared/enums/pdrb';

interface ArticleRow {
  id: string;
  url: string;
  source_portal: string;
  source_type: string;
  title: string;
  snippet_text: string;
  word_count: number;
  published_at: Date;
  updated_at: Date;
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

async function asyncPool<T, R>(
  concurrency: number,
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
  const filterArg = args.find((a) => a.startsWith('--filter='));
  const dryRun = args.includes('--dry-run');
  const forceAll = args.includes('--force');
  const unclassifiedOnly = args.includes('--unclassified-only');

  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  const concurrency = concurrencyArg ? Math.max(1, Math.min(6, Number(concurrencyArg.split('=')[1]))) : 3;
  const filterKeyword = filterArg ? filterArg.split('=')[1] : null;

  console.log('='.repeat(75));
  console.log('SIPENA KTT - RE-KLASIFIKASI & PENYELARASAN PDRB EFISIEN & CEPAT');
  console.log('='.repeat(75));
  console.log(`Mode               : ${dryRun ? 'DRY RUN (Hanya Preview)' : 'LIVE UPDATE DATABASE'}`);
  console.log(`Paralelisme / Worker: ${concurrency} concurrent worker(s)`);
  console.log(`Strategi Resume    : ${unclassifiedOnly ? 'HANYA ARTIKEL BELUM TERKLASIFIKASI (NULL)' : forceAll ? 'FORCE ALL (Proses ulang semua)' : 'SMART RESUME (Lewati artikel yang baru selesai < 2 jam)'}`);
  if (filterKeyword) console.log(`Filter Kata Kunci  : "${filterKeyword}"`);
  if (limit) console.log(`Limit Artikel      : ${limit}`);
  console.log(`Waktu Mulai        : ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(75));

  const runtimeOpts = buildScraperPipelineRuntimeOptions();
  // Set maxCallsPerRun tinggi agar tidak terbentur batas 150 panggilan per sesi
  const llmRouter = new MultiLlmRouter({
    task: 'classify',
    maxCallsPerRun: 5000,
    ...(runtimeOpts.routerOptions ?? {}),
  });

  // Ambil artikel target
  let query = `
    SELECT 
      id, url, source_portal, source_type, title, snippet_text, word_count,
      published_at, updated_at, quarter, year, is_economic_phenomenon,
      kbli_category, kbli_impact, expenditure_component, expenditure_impact,
      verification_status
    FROM articles 
  `;
  const queryParams: any[] = [];
  const whereClauses: string[] = [];

  if (unclassifiedOnly) {
    whereClauses.push(`is_economic_phenomenon IS NULL`);
  }

  if (filterKeyword) {
    queryParams.push(`%${filterKeyword}%`);
    whereClauses.push(`(title ILIKE $${queryParams.length} OR snippet_text ILIKE $${queryParams.length})`);
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ` + whereClauses.join(' AND ');
  }

  query += ` ORDER BY published_at DESC `;
  if (limit) {
    queryParams.push(limit);
    query += ` LIMIT $${queryParams.length}`;
  }

  const { rows } = await pool.query<ArticleRow>(query, queryParams);
  console.log(`Total artikel ditemukan di database: ${rows.length}\n`);

  const twoHoursAgo = Date.now() - 2 * 3600_000;
  let countSkipped = 0;
  let countSuccess = 0;
  let countFailed = 0;
  let countChangedEcon = 0;
  let countChangedNonEcon = 0;
  let countChangedKbli = 0;
  let countChangedExp = 0;
  let countRefetched = 0;

  // Filter daftar artikel jika smart resume
  const targetRows: Array<{ row: ArticleRow; originalIndex: number }> = [];
  rows.forEach((row, i) => {
    const isRecentlyUpdated = row.updated_at && row.updated_at.getTime() > twoHoursAgo;
    // Jika baru diupdate < 2 jam dan bukan forceAll, lewati
    if (!forceAll && isRecentlyUpdated && row.is_economic_phenomenon !== null) {
      countSkipped += 1;
    } else {
      targetRows.push({ row, originalIndex: i });
    }
  });

  console.log(`Artikel yang dilewati (sudah diproses baru saja): ${countSkipped}`);
  console.log(`Artikel yang dieksekusi sekarang               : ${targetRows.length}\n`);

  if (targetRows.length === 0) {
    console.log('Semua artikel sudah termutakhirkan dengan kalibrasi terbaru. Tidak ada yang perlu diproses.');
    await pool.end();
    return;
  }

  await asyncPool(concurrency, targetRows, async ({ row, originalIndex }) => {
    const idxStr = `[${originalIndex + 1}/${rows.length}]`;
    let snippet = row.snippet_text;

    // Hanya refetch jika snippet kosong atau sangat pendek (< 30 kata)
    if (row.word_count < 30 && row.source_portal.toLowerCase().includes('tribun')) {
      try {
        const fetchRes = await safeFetchText(row.url, { timeoutMs: 8_000 });
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
      } catch {
        // Fallback gunakan snippet eksisting
      }
    }

    const pubWita = new Date(row.published_at.getTime() + 8 * 3600_000);
    const publishedAtWitaStr = pubWita.toISOString().replace('T', ' ').slice(0, 19) + ' WITA';
    const period = getQuarterFromDateWita(row.published_at);

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
        attempts += 1;
        const errMsg = aiResult.errorMessage ?? aiResult.error ?? 'Unknown error';
        if (attempts < 3) {
          await delay(1500 * attempts);
        } else {
          console.warn(`    ⚠️ ${idxStr} Percobaan terakhir gagal: ${errMsg}`);
        }
      } catch (err: any) {
        attempts += 1;
        if (attempts < 3) {
          await delay(2000 * attempts);
        } else {
          console.warn(`    ⚠️ ${idxStr} Exception: ${err.message}`);
        }
      }
    }

    if (!aiResult || !aiResult.ok) {
      countFailed += 1;
      const failReason = aiResult?.errorMessage ?? 'AI Timeout/Exhausted';
      console.log(`${idxStr} ❌ GAGAL: "${row.title.slice(0, 45)}..." (${failReason})`);
      return;
    }

    countSuccess += 1;
    const mapped = mapClassificationToPersistence(aiResult.classification, aiResult.modelUsed);

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
      ? `ECON [${mapped.kbliCategory} | ${mapped.expenditureComponent}]`
      : `NON-ECON (${mapped.geographicScope})`;

    console.log(
      `${idxStr} ${econLabel} | "${shortTitle}" (${aiResult.modelUsed}, ${aiResult.responseTimeMs}ms)${changeTag}`,
    );

    // Sedikit jeda 200ms per worker agar mulus
    await delay(200);
  });

  console.log('\n' + '='.repeat(75));
  console.log('REKAPITULASI HASIL RE-KLASIFIKASI:');
  console.log('='.repeat(75));
  console.log(`Total Artikel di Database  : ${rows.length}`);
  console.log(`Dilewati (Sudah Termutakhir): ${countSkipped}`);
  console.log(`Dieksekusi                 : ${targetRows.length}`);
  console.log(`Berhasil                   : ${countSuccess}`);
  console.log(`Gagal                      : ${countFailed}`);
  if (countRefetched > 0) console.log(`Snippet Direfetch           : ${countRefetched}`);
  console.log(`Berubah Menjadi Fenomena   : ${countChangedEcon}`);
  console.log(`Berubah Menjadi Non-Ekonomi: ${countChangedNonEcon}`);
  console.log(`KBLI Bergeser/Terkoreksi   : ${countChangedKbli}`);
  console.log(`Pengeluaran Terkoreksi     : ${countChangedExp}`);
  console.log('='.repeat(75));

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
