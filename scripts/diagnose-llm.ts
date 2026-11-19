// scripts/diagnose-llm.ts
import 'dotenv/config';
import { MultiLlmRouter, getConfiguredProviderHealthSummary } from '../server/services/llm/router';
import { ArticleSourceTypeEnum } from '../shared/enums/pdrb';

async function main() {
  const health = getConfiguredProviderHealthSummary();
  console.log('Health summary:', JSON.stringify(health, null, 2));

  const router = new MultiLlmRouter({ task: 'classify', maxCallsPerRun: 100 });
  console.log('Slots count:', router.configuredSlotCount);

  const res = await router.classifyArticle({
    title: 'Pembangunan RSUD Akhmad Berahim KTT Digenjot',
    sourcePortal: 'benuanta.co.id',
    sourceType: ArticleSourceTypeEnum.REGIONAL,
    publishedAtWita: '15/08/2026 10:00 WITA',
    defaultQuarter: 3,
    defaultYear: 2026,
    snippetText: 'Pemerintah Kabupaten Tana Tidung terus mempercepat pembangunan fisik RSUD Akhmad Berahim di Tideng Pale agar dapat segera melayani warga.',
  });

  console.log('Classify result:');
  console.log('  ok:', res.ok);
  console.log('  modelUsed:', res.modelUsed);
  console.log('  providerUsed:', res.providerUsed);
  if (!res.ok) {
    console.log('  errorCode:', res.errorCode);
    console.log('  errorMessage:', res.errorMessage);
  } else {
    console.log('  classification:', JSON.stringify(res.classification, null, 2));
  }
}

main().catch(console.error);
