// server/db/verify-status.ts
import 'dotenv/config';
import { db, pool } from './index';
import { articles } from './schema';
import { eq, desc } from 'drizzle-orm';
import { VerificationStatusEnum } from '../../shared/enums/pdrb';

async function main() {
  const pending = await db
    .select({
      id: articles.id,
      title: articles.title,
      summary: articles.summary,
      kbli: articles.kbliCategory,
      kbliImpact: articles.kbliImpact,
      expenditure: articles.expenditureComponent,
      expImpact: articles.expenditureImpact,
      llmModel: articles.llmModel,
      llmStatus: articles.llmStatus,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(eq(articles.verificationStatus, VerificationStatusEnum.PENDING))
    .orderBy(desc(articles.publishedAt));

  console.log(`\n============================================================`);
  console.log(`VERIFIKASI STATUS ANTREAN: ${pending.length} ARTIKEL PERLU REVIEW (PENDING)`);
  console.log(`============================================================\n`);

  for (let i = 0; i < pending.length; i++) {
    const p = pending[i]!;
    console.log(`[${i + 1}] ID: ${p.id}`);
    console.log(`    Judul      : ${p.title}`);
    console.log(`    Model/AI   : ${p.llmModel} (${p.llmStatus})`);
    console.log(`    KBLI       : ${p.kbli} (${p.kbliImpact})`);
    console.log(`    Pengeluaran: ${p.expenditure} (${p.expImpact})`);
    console.log(`    Ringkasan  : ${p.summary}`);
    console.log(``);
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
