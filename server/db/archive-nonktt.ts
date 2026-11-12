// server/db/archive-nonktt.ts
import 'dotenv/config';
import { desc, inArray } from 'drizzle-orm';
import {
  ArticleSourceTypeEnum,
  VerificationStatusEnum,
} from '../../shared/enums/pdrb';
import { db, pool } from './index';
import { articles } from './schema';
import { evaluateGeographicRelevance } from '../services/scraper/geo-filter';

interface ArchiveCandidate {
  id: string;
  title: string;
  sourcePortal: string;
  sourceType: ArticleSourceTypeEnum;
  verificationStatus: VerificationStatusEnum;
  reason: string;
}

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');

  console.info(
    `[archive-nonktt] Mode: ${applyMode ? 'APPLY (menulis perubahan ke DB)' : 'DRY-RUN (pratinjau tanpa mengubah DB)'}`,
  );

  const candidates = await db
    .select({
      id: articles.id,
      title: articles.title,
      snippetText: articles.snippetText,
      url: articles.url,
      sourceType: articles.sourceType,
      sourcePortal: articles.sourcePortal,
      verificationStatus: articles.verificationStatus,
    })
    .from(articles)
    .where(
      inArray(articles.sourceType, [
        ArticleSourceTypeEnum.NATIONAL,
        ArticleSourceTypeEnum.REGIONAL,
      ]),
    )
    .orderBy(desc(articles.publishedAt));

  const toArchive: ArchiveCandidate[] = [];

  for (const row of candidates) {
    if (
      row.verificationStatus !== VerificationStatusEnum.PENDING &&
      row.verificationStatus !== VerificationStatusEnum.VERIFIED
    ) {
      continue;
    }

    const geo = evaluateGeographicRelevance({
      title: row.title,
      snippetText: row.snippetText,
      url: row.url,
      sourceType: row.sourceType,
    });

    if (geo.decision === 'DROP_OTHER_REGENCY_LOCAL' || geo.decision === 'DROP_STATIC_NOISE') {
      toArchive.push({
        id: row.id,
        title: row.title,
        sourcePortal: row.sourcePortal,
        sourceType: row.sourceType,
        verificationStatus: row.verificationStatus,
        reason: `[Arsip Non-KTT/Non-Fenomena] ${geo.reason}`,
      });
    }
  }

  console.info(
    `[archive-nonktt] Memindai ${candidates.length} baris REGIONAL/NATIONAL; ditemukan ${toArchive.length} artikel non-KTT/noise statis (0 baris MANUAL tersentuh).`,
  );

  if (toArchive.length > 0) {
    console.table(
      toArchive.map((item) => ({
        status: item.verificationStatus,
        sourceType: item.sourceType,
        portal: item.sourcePortal,
        title: item.title.length > 65 ? `${item.title.slice(0, 62)}...` : item.title,
        reason: item.reason.slice(0, 58),
      })),
    );
  }

  if (!applyMode) {
    console.info(
      '[archive-nonktt] Selesai dalam mode DRY-RUN. Jalankan `npm run db:archive-nonktt -- --apply` untuk mengarsipkan baris di atas menjadi IGNORED (tanpa menghapus url_hash).',
    );
    return;
  }

  if (toArchive.length === 0) {
    console.info('[archive-nonktt] Tidak ada baris yang perlu diarsipkan.');
    return;
  }

  await db.transaction(async (tx) => {
    for (const item of toArchive) {
      await tx
        .update(articles)
        .set({
          verificationStatus: VerificationStatusEnum.IGNORED,
          isEconomicPhenomenon: false,
          kbliCategory: null,
          kbliImpact: null,
          expenditureComponent: null,
          expenditureImpact: null,
          llmError: item.reason,
        })
        .where(inArray(articles.id, [item.id]));
    }
  });

  console.info(
    `[archive-nonktt] SUKSES mengarsipkan ${toArchive.length} artikel menjadi IGNORED dengan url_hash tetap terjaga.`,
  );
}

main()
  .catch((err) => {
    console.error('[archive-nonktt] Gagal mengeksekusi arsip:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });

