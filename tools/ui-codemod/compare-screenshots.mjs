// tools/ui-codemod/compare-screenshots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../.agents/skills/playwright-skill/node_modules/playwright');

const args = process.argv.slice(2);
const basePhase = args[0] || 'baseline';
const targetPhase = args[1] || 'wave1';
const threshold = 0.05; // 5% tolerance

const baseDir = path.resolve('tools/ui-codemod/screenshots', basePhase);
const targetDir = path.resolve('tools/ui-codemod/screenshots', targetPhase);

if (!fs.existsSync(baseDir)) {
  console.error(`Base directory not found: ${baseDir}`);
  process.exit(1);
}
if (!fs.existsSync(targetDir)) {
  console.error(`Target directory not found: ${targetDir}`);
  process.exit(1);
}

const baseFiles = fs.readdirSync(baseDir).filter((f) => f.endsWith('.png'));

async function main() {
  console.log(`[compare-screenshots] Comparing "${basePhase}" vs "${targetPhase}" (threshold=${threshold})...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const page = await browser.newPage();

  const results = [];

  for (const file of baseFiles) {
    const baseImgPath = path.join(baseDir, file);
    const targetImgPath = path.join(targetDir, file);

    if (!fs.existsSync(targetImgPath)) {
      results.push({ file, status: 'MISSING_IN_TARGET', diffPercent: 100 });
      continue;
    }

    const baseDataUrl = `data:image/png;base64,${fs.readFileSync(baseImgPath).toString('base64')}`;
    const targetDataUrl = `data:image/png;base64,${fs.readFileSync(targetImgPath).toString('base64')}`;

    const diffResult = await page.evaluate(
      async ({ baseSrc, targetSrc, tolerance }) => {
        const loadImage = (src) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

        const [img1, img2] = await Promise.all([loadImage(baseSrc), loadImage(targetSrc)]);
        const width = Math.min(img1.width, img2.width);
        const height = Math.min(img1.height, img2.height);

        const canvas1 = document.createElement('canvas');
        canvas1.width = width;
        canvas1.height = height;
        const ctx1 = canvas1.getContext('2d');
        ctx1.drawImage(img1, 0, 0);
        const d1 = ctx1.getImageData(0, 0, width, height).data;

        const canvas2 = document.createElement('canvas');
        canvas2.width = width;
        canvas2.height = height;
        const ctx2 = canvas2.getContext('2d');
        ctx2.drawImage(img2, 0, 0);
        const d2 = ctx2.getImageData(0, 0, width, height).data;

        let diffPixels = 0;
        const totalPixels = width * height;

        for (let i = 0; i < d1.length; i += 4) {
          const dr = Math.abs(d1[i] - d2[i]) / 255;
          const dg = Math.abs(d1[i + 1] - d2[i + 1]) / 255;
          const db = Math.abs(d1[i + 2] - d2[i + 2]) / 255;
          const delta = (dr + dg + db) / 3;

          if (delta > tolerance) {
            diffPixels++;
          }
        }

        const diffPercent = (diffPixels / totalPixels) * 100;
        return {
          diffPixels,
          totalPixels,
          diffPercent: Number(diffPercent.toFixed(2)),
        };
      },
      { baseSrc: baseDataUrl, targetSrc: targetDataUrl, tolerance: threshold },
    );

    results.push({
      file,
      status: diffResult.diffPercent > 0 ? 'CHANGED' : 'IDENTICAL',
      diffPercent: diffResult.diffPercent,
      diffPixels: diffResult.diffPixels,
    });
  }

  await browser.close();

  console.log('\n[compare-screenshots] Summary Report:');
  console.table(results);

  const changedCount = results.filter((r) => r.status === 'CHANGED').length;
  console.log(`\nTotal Compared: ${results.length} | Changed: ${changedCount} | Identical: ${results.length - changedCount}`);

  fs.writeFileSync(
    path.resolve(`tools/ui-codemod/diff-${basePhase}-vs-${targetPhase}.json`),
    JSON.stringify(results, null, 2),
    'utf8',
  );
}

main().catch((err) => {
  console.error('[compare-screenshots] Fatal error:', err);
  process.exit(1);
});
