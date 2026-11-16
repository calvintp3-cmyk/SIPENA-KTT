// scripts/remediate-audit-findings.ts
/**
 * Skrip Remediasi Data Audit Produksi SIPENA
 *
 * Menuntaskan dua temuan kritikal pada database:
 * 1. Membersihkan artikel terkontaminasi loop paginasi WordPress pada Benuanta (word_count > 450)
 *    dengan memangkasnya ke teks artikel awal yang valid (<= 450 kata).
 * 2. Menormalkan artikel synthetic fallback snippet yang terklasifikasi sebagai fenomena ekonomi
 *    menjadi non-ekonomi (IGNORED) tanpa halusinasi.
 */

import { and, eq, like, or, sql } from 'drizzle-orm';
import { db, pool } from '../server/db';
import { articles } from '../server/db/schema';
import {
  countWords,
  trimToWordAndCharBudget,
  EXTRACTOR_MAX_CHARS,
  EXTRACTOR_MAX_WORDS,
  EXTRACTOR_MIN_WORDS,
} from '../server/services/scraper/extractor';
import { isSyntheticMetadataSnippet } from '../server/services/scraper/national';
import { LlmStatusEnum, VerificationStatusEnum } from '../shared/enums/pdrb';

async function runRemediation() {
  console.log('=== MEMULAI REMEDIASI DATA AUDIT SIPENA ===\n');

  // ---------------------------------------------------------------------------
  // 1. Remediasi Artikel Halusinasi Synthetic Fallback
  // ---------------------------------------------------------------------------
  console.log('1. Menemukan artikel dengan cuplikan sintetis fallback...');

  const syntheticCandidates = await db
    .select({
      id: articles.id,
      title: articles.title,
      snippetText: articles.snippetText,
      isEconomic: articles.isEconomicPhenomenon,
    })
    .from(articles)
    .where(
      or(
        like(articles.snippetText, '%terjaring oleh pemantauan kata kunci%'),
        like(articles.snippetText, '%tanpa isi artikel penuh%'),
      ),
    );

  console.log(`Ditemukan ${syntheticCandidates.length} artikel berisi cuplikan sintetis.`);

  let remediatedSyntheticCount = 0;
  for (const item of syntheticCandidates) {
    if (isSyntheticMetadataSnippet(item.snippetText)) {
      await db
        .update(articles)
        .set({
          isEconomicPhenomenon: false,
          summary: null,
          kbliCategory: null,
          kbliImpact: null,
          expenditureComponent: null,
          expenditureImpact: null,
          secondaryKbliCategory: null,
          secondaryKbliImpact: null,
          secondaryExpenditureComponent: null,
          secondaryExpenditureImpact: null,
          llmModel: 'system-insufficient-content',
          llmStatus: LlmStatusEnum.SUCCESS,
          llmError: 'Diremediasi pasca-audit: Berita metadata sintetis tanpa isi artikel penuh.',
          llmConfidence: 1,
          verificationStatus: VerificationStatusEnum.IGNORED,
        })
        .where(eq(articles.id, item.id));

      remediatedSyntheticCount += 1;
    }
  }

  console.log(
    `Berhasil meremediasi ${remediatedSyntheticCount} artikel sintetis menjadi non-ekonomi (IGNORED).\n`,
  );

  // ---------------------------------------------------------------------------
  // 2. Remediasi Artikel Kontaminasi Paginasi Benuanta (> 450 kata)
  // ---------------------------------------------------------------------------
  console.log('2. Menemukan artikel terkontaminasi paginasi Benuanta (> 450 kata)...');

  const contaminatedBenuanta = await db
    .select({
      id: articles.id,
      title: articles.title,
      snippetText: articles.snippetText,
      wordCount: articles.wordCount,
    })
    .from(articles)
    .where(
      and(
        eq(articles.sourcePortal, 'benuanta.co.id'),
        sql`${articles.wordCount} > 450`,
      ),
    );

  console.log(`Ditemukan ${contaminatedBenuanta.length} artikel Benuanta dengan kata > 450.`);

  let remediatedBenuantaCount = 0;
  for (const item of contaminatedBenuanta) {
    const trimmedSnippet = trimToWordAndCharBudget(
      item.snippetText,
      EXTRACTOR_MAX_WORDS,
      EXTRACTOR_MAX_CHARS,
      EXTRACTOR_MIN_WORDS,
    );
    const newWordCount = countWords(trimmedSnippet);

    await db
      .update(articles)
      .set({
        snippetText: trimmedSnippet,
        wordCount: newWordCount,
      })
      .where(eq(articles.id, item.id));

    remediatedBenuantaCount += 1;
  }

  console.log(
    `Berhasil memangkas & menormalkan ${remediatedBenuantaCount} artikel Benuanta ke panjang baku (<= 450 kata).\n`,
  );

  console.log('=== REMEDIASI DATABASE SELESAI DENGAN SUKSES ===');
  await pool.end();
}

void runRemediation().catch((err) => {
  console.error('Fatal error saat remediasi data:', err);
  process.exit(1);
});
