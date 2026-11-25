// server/db/examine-ump-niches.ts
import 'dotenv/config';
import { db, pool } from './index';
import { articles } from './schema';
import { eq, ilike, or, desc, and } from 'drizzle-orm';
import { VerificationStatusEnum } from '../../shared/enums/pdrb';

async function main() {
  const list = await db
    .select({
      id: articles.id,
      title: articles.title,
      sourcePortal: articles.sourcePortal,
      publishedAt: articles.publishedAt,
      kbliCategory: articles.kbliCategory,
      kbliImpact: articles.kbliImpact,
      expenditureComponent: articles.expenditureComponent,
      expenditureImpact: articles.expenditureImpact,
      summary: articles.summary,
      snippetText: articles.snippetText,
    })
    .from(articles)
    .where(
      and(
        eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
        or(
          ilike(articles.title, '%UMP%'),
          ilike(articles.title, '%upah minimum%'),
        )
      )
    )
    .orderBy(desc(articles.publishedAt));

  for (let i = 0; i < list.length; i++) {
    const a = list[i]!;
    console.log(`============================================================`);
    console.log(`[${i + 1}] ID: ${a.id}`);
    console.log(`Judul  : ${a.title}`);
    console.log(`Portal : ${a.sourcePortal} | Tgl: ${a.publishedAt?.toISOString().slice(0, 10)}`);
    console.log(`PDRB   : KBLI ${a.kbliCategory} (${a.kbliImpact}) | Exp ${a.expenditureComponent} (${a.expenditureImpact})`);
    console.log(`Ringkasan:\n${a.summary}\n`);
    console.log(`Cuplikan Snippet:\n${a.snippetText?.slice(0, 250)}...\n`);
  }
}

main().catch(console.error).finally(() => pool.end());
