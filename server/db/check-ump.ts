// server/db/check-ump.ts
import 'dotenv/config';
import { db, pool } from './index';
import { articles } from './schema';
import { eq, ilike, or, desc, and } from 'drizzle-orm';
import { VerificationStatusEnum } from '../../shared/enums/pdrb';

async function checkUmp() {
  const list = await db
    .select({
      id: articles.id,
      title: articles.title,
      sourcePortal: articles.sourcePortal,
      sourceType: articles.sourceType,
      publishedAt: articles.publishedAt,
      quarter: articles.quarter,
      year: articles.year,
      kbliCategory: articles.kbliCategory,
      expenditureComponent: articles.expenditureComponent,
      verificationStatus: articles.verificationStatus,
      url: articles.url,
      summary: articles.summary,
    })
    .from(articles)
    .where(
      or(
        ilike(articles.title, '%UMP%'),
        ilike(articles.title, '%upah minimum%'),
        ilike(articles.title, '%gaji minimum%')
      )
    )
    .orderBy(desc(articles.publishedAt));

  console.log(`\nTotal UMP/Upah articles found: ${list.length}`);
  console.table(
    list.map((a) => ({
      id: a.id.slice(0, 8),
      status: a.verificationStatus,
      portal: a.sourcePortal,
      date: a.publishedAt ? a.publishedAt.toISOString().slice(0, 10) : '-',
      period: `TW ${a.quarter} ${a.year}`,
      title: a.title.slice(0, 65),
      kbli: a.kbliCategory,
      exp: a.expenditureComponent,
    }))
  );
}

checkUmp()
  .catch(console.error)
  .finally(() => pool.end());
