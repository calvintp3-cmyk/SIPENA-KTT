// tools/ui-codemod/capture-baseline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../.agents/skills/playwright-skill/node_modules/playwright');

// Parse CLI args
const args = process.argv.slice(2);
const phaseArg = args.find((a) => a.startsWith('--phase='));
const phase = phaseArg ? phaseArg.split('=')[1] : 'baseline';
const portArg = args.find((a) => a.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : 3000;
const baseUrl = `http://localhost:${port}`;

const outputDir = path.resolve('tools/ui-codemod/screenshots', phase);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const VIEWPORTS = [
  { name: '1280', width: 1280, height: 800 },
  { name: '768', width: 768, height: 1024 },
  { name: '375', width: 375, height: 812 },
];

const ROUTES = [
  { slug: 'public-index', path: '/' },
  { slug: 'public-linimasa', path: '/linimasa' },
  { slug: 'auth-login', path: '/login' },
  { slug: 'admin-dashboard', path: '/admin' },
  { slug: 'admin-review', path: '/admin/review' },
  { slug: 'admin-articles', path: '/admin/articles' },
  { slug: 'admin-synthesis', path: '/admin/synthesis' },
  { slug: 'admin-trends', path: '/admin/trends' },
  { slug: 'admin-portals', path: '/admin/portals' },
  { slug: 'admin-keywords', path: '/admin/keywords' },
  { slug: 'admin-taxonomy', path: '/admin/taxonomy' },
  { slug: 'admin-kbli', path: '/admin/kbli' },
  { slug: 'admin-scrapers', path: '/admin/scrapers' },
  { slug: 'admin-users', path: '/admin/users' },
];

// Mock API Data
const mockAdminSession = {
  user: {
    id: 'mock-user-1',
    name: 'Operator Nerwilis BPS',
    email: 'nerwilis@bps.go.id',
    role: 'ADMIN',
  },
  pendingCount: 8,
  llmFailedCount: 2,
};

const mockArticles = [
  {
    id: 'mock-art-1',
    title: 'Panen Raya Padi Varietas Unggul di Sesayap Tingkatkan Produksi Beras Lokal',
    sourcePortal: 'Kaltara Prokal',
    sourceType: 'MEDIA_REGIONAL',
    url: 'https://kaltara.prokal.co/read/detail/mock-1',
    publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    excerpt: 'Dinas Pertanian KTT mencatat panen raya padi menghasilkan peningkatan produksi beras.',
    snippetText: 'Panen raya padi di Kecamatan Sesayap menghasilkan 45 ton gabah kering panen.',
    summary: 'Panen raya padi di Kecamatan Sesayap meningkatkan produksi beras lokal.',
    isEconomicPhenomenon: true,
    verificationStatus: 'PENDING',
    llmStatus: 'SUCCESS',
    llmConfidence: 0.94,
    llmModel: 'gemini-2.5-flash',
    kbliCategory: 'A',
    kbliImpact: 'INCREASE_NTB',
    expenditureComponent: 'PK_RT',
    expenditureImpact: 'INCREASE_REAL',
    subdistrict: 'Sesayap',
    quarter: 3,
    year: 2024,
  },
  {
    id: 'mock-art-2',
    title: 'Pembangunan Jembatan Sebuku Hubungkan Sentra Perkebunan Sawit',
    sourcePortal: 'Tribun Kaltara',
    sourceType: 'MEDIA_REGIONAL',
    url: 'https://kaltara.tribunnews.com/mock-2',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    excerpt: 'Proyek infrastruktur konektivitas terus dikebut oleh Pemkab Tana Tidung.',
    snippetText: 'Proyek jembatan Sebuku dengan anggaran Rp 14,8 Miliar mempercepat logistik CPO.',
    summary: 'Pembangunan jembatan konektivitas memperlancar arus distribusi sawit.',
    isEconomicPhenomenon: true,
    verificationStatus: 'VERIFIED',
    llmStatus: 'SUCCESS',
    llmConfidence: 0.88,
    llmModel: 'gemini-2.5-flash',
    kbliCategory: 'F',
    kbliImpact: 'INCREASE_NTB',
    expenditureComponent: 'PMTB',
    expenditureImpact: 'INCREASE_REAL',
    subdistrict: 'Sesayap Hilir',
    quarter: 3,
    year: 2024,
  },
  {
    id: 'mock-art-3',
    title: 'Pelantikan Pejabat Eselon III dan IV di Lingkungan Pemkab Tana Tidung',
    sourcePortal: 'Benuanta',
    sourceType: 'MEDIA_REGIONAL',
    url: 'https://benuanta.co.id/mock-3',
    publishedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    excerpt: 'Bupati melantik pejabat struktural baru.',
    snippetText: 'Pelantikan berlangsung khidmat di Gedung Pendopo.',
    summary: null,
    isEconomicPhenomenon: false,
    verificationStatus: 'IGNORED',
    llmStatus: 'SUCCESS',
    llmConfidence: 0.99,
    llmModel: 'gemini-2.5-flash',
    kbliCategory: null,
    kbliImpact: null,
    expenditureComponent: null,
    expenditureImpact: null,
    subdistrict: 'Sesayap',
    quarter: 3,
    year: 2024,
  },
];

async function setupMockRoutes(page) {
  // Mock Session
  await page.route('**/api/admin/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAdminSession),
    });
  });

  // Mock Admin Articles
  await page.route('**/api/admin/articles*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: mockArticles,
        pagination: { total: 3, page: 1, limit: 15, totalPages: 1 },
        summaryCounts: {
          pendingCount: 8,
          verifiedCount: 42,
          ignoredCount: 15,
          llmFailedCount: 2,
        },
        availablePortals: ['Kaltara Prokal', 'Tribun Kaltara', 'Benuanta'],
      }),
    });
  });

  // Mock Synthesis Drafts
  await page.route('**/api/admin/synthesis/drafts*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'mock-draft-1',
            year: 2024,
            quarter: 3,
            dimension: 'kbli',
            targetCode: 'A',
            targetLabel: 'Kategori A — Pertanian, Kehutanan, dan Perikanan',
            style: 'BRS_FORMAL',
            title: 'Draf Narasi KBLI A TW3 2024',
            narrativeMarkdown: '### Perkembangan Sektor Pertanian\n\nProduksi padi mengalami peningkatan signifikan seiring panen raya...',
            citations: [],
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      }),
    });
  });

  // Mock Overview
  await page.route('**/api/overview*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        year: 2024,
        quarter: 3,
        totalArticles: 65,
        dominantKbli: { code: 'A', count: 18, name: 'Pertanian, Kehutanan, dan Perikanan' },
        dominantExpenditure: { code: 'PK_RT', count: 24, name: 'Konsumsi Rumah Tangga' },
        kbliDistribution: [{ code: 'A', count: 18 }],
        expenditureDistribution: [{ code: 'PK_RT', count: 24 }],
      }),
    });
  });

  // Mock Public Articles Feed
  await page.route('**/api/articles*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: mockArticles.filter((a) => a.verificationStatus === 'VERIFIED'),
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      }),
    });
  });
}

async function main() {
  console.log(`[capture-baseline] Starting capture for phase: "${phase}" at ${baseUrl}`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  let totalCaptured = 0;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await setupMockRoutes(page);

    for (const r of ROUTES) {
      const targetUrl = `${baseUrl}${r.path}`;
      const filename = `${r.slug}-${vp.name}.png`;
      const filepath = path.join(outputDir, filename);

      let captured = false;
      for (let attempt = 1; attempt <= 2 && !captured; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`  Retry [${vp.name}] ${r.slug}...`);
            await page.waitForTimeout(1000);
          } else {
            console.log(`  Capturing [${vp.name}] ${r.slug} (${r.path})...`);
          }
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          // Tunggu rendering settled
          await page.waitForTimeout(1000);
          await page.screenshot({ path: filepath, fullPage: false });
          totalCaptured++;
          captured = true;
        } catch (err) {
          if (attempt === 2) {
            console.warn(`  Warning: Failed to capture ${r.slug} (${vp.name}):`, err.message);
          }
        }
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`[capture-baseline] Successfully captured ${totalCaptured} screenshots in ${outputDir}`);
}

main().catch((err) => {
  console.error('[capture-baseline] Fatal error:', err);
  process.exit(1);
});
