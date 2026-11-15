const { chromium } = require('playwright');
const path = require('path');

const baseDir = 'file:///F:/18%20-%20SIPENA%20KTT/design-lab/03-raycast-obsidian';
const outDir = 'F:/18 - SIPENA KTT/design-lab/screenshots/03-raycast-obsidian';

const jobs = [
  { file: 'index.html', out: 'index-1440.png', w: 1440, h: 1080 },
  { file: 'landing.html', out: 'landing-1440.png', w: 1440, h: 1080 },
  { file: 'dashboard.html', out: 'dashboard-1440.png', w: 1440, h: 1080 },
  { file: 'table.html', out: 'table-1440.png', w: 1440, h: 1080 },
  { file: 'linimasa.html', out: 'linimasa-1440.png', w: 1440, h: 1080 },
  { file: 'charts.html', out: 'charts-1440.png', w: 1440, h: 1080 },
  { file: 'detail.html', out: 'detail-1440.png', w: 1440, h: 1080 },
  { file: 'landing.html', out: 'landing-390.png', w: 390, h: 844 },
  { file: 'dashboard.html', out: 'dashboard-390.png', w: 390, h: 844 },
  { file: 'linimasa.html', out: 'linimasa-390.png', w: 390, h: 844 }
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();

  for (const job of jobs) {
    await page.setViewportSize({ width: job.w, height: job.h });
    await page.goto(`${baseDir}/${job.file}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const outPath = path.join(outDir, job.out);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log('Saved:', outPath);
  }

  // Also capture Command Palette (⌘K) open state on dashboard
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${baseDir}/dashboard.html`, { waitUntil: 'networkidle' });
  await page.click('.cmd-trigger-btn');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'command-palette-1440.png'), fullPage: false });
  console.log('Saved command palette screenshot');

  await browser.close();
})();
