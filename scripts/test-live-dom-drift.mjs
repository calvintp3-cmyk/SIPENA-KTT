// scripts/test-live-dom-drift.mjs
import https from 'node:https';
import http from 'node:http';
import * as cheerio from 'cheerio';

const TARGET_PORTALS = [
  {
    id: 'tribun-kaltara',
    label: 'Tribun Kaltara',
    indexUrl: 'https://kaltara.tribunnews.com/tag/tana-tidung',
    itemSelectors: ['div.mr140', 'ul.lsi li.p1520', 'li.p1520', '.latest-news li', 'article'],
  },
  {
    id: 'koran-kaltara',
    label: 'Koran Kaltara',
    indexUrl: 'https://korankaltara.com/category/tana-tidung',
    itemSelectors: [
      'a[href^="/"]:not([href="/"]):not([href="/epaper"]):not([href*="/category/"]):not([href*="/redaksi"]):not([href*="/kode-etik"]):not([href*="/disclaimer"]):not([href*="/privacy-policy"]):not([href*="/kontak"])',
      'div.max-w-\\[1240px\\] a[href]',
      'article',
      'div.border-b',
    ],
  },
  {
    id: 'benuanta',
    label: 'Benuanta Kaltara',
    indexUrl: 'https://benuanta.co.id/category/tana-tidung/',
    itemSelectors: ['article', '.jeg_post', '.post', '.td_module_wrap'],
  },
  {
    id: 'radar-tarakan',
    label: 'Radar Tarakan JawaPos',
    indexUrl: 'https://radartarakan.jawapos.com/tana-tidung',
    itemSelectors: [
      'div.ui-card a[href]',
      'a[href*="/tana-tidung/"]',
      '.ui-card',
      '.latest__item',
      '.article__item',
    ],
  },
  {
    id: 'pemkab-tana-tidung',
    label: 'Pemkab Tana Tidung',
    indexUrl: 'https://tanatidungkab.go.id/berita',
    itemSelectors: ['.news-item', 'article', '.post', '.card', '.content-item'],
  },
  {
    id: 'pemprov-kaltara',
    label: 'Pemprov Kaltara Diskominfo',
    indexUrl: 'https://kaltaraprov.go.id/berita',
    itemSelectors: ['article', '.post', '.news-item', '.card', '.jeg_post'],
  },
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fetchUrl(targetUrl, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const client = u.protocol === 'https:' ? https : http;
      const t0 = performance.now();

      const req = client.get(
        targetUrl,
        {
          timeout: timeoutMs,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            resolve(fetchUrl(redirectUrl, timeoutMs));
            return;
          }

          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            const elapsed = Math.round(performance.now() - t0);
            resolve({
              ok: res.statusCode === 200,
              statusCode: res.statusCode,
              body,
              elapsed,
              finalUrl: targetUrl,
            });
          });
        },
      );

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message, statusCode: 0, body: '' });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT', statusCode: 504, body: '' });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message, statusCode: 0, body: '' });
    }
  });
}

async function auditLivePortalDom() {
  console.log('====================================================================');
  console.log('DOM DRIFT & SELECTOR INTEGRITY AUDIT — LIVE PORTAL KALIMANTAN UTARA');
  console.log('====================================================================\n');

  const report = [];

  for (const portal of TARGET_PORTALS) {
    console.log(`[Inspecting] ${portal.label} (${portal.indexUrl})...`);
    const res = await fetchUrl(portal.indexUrl);

    if (!res.ok) {
      console.log(`  ❌ Gagal Fetch Indeks: HTTP ${res.statusCode} (${res.error || 'Non-200 Response'})\n`);
      report.push({
        id: portal.id,
        label: portal.label,
        status: res.statusCode === 403 ? 'BLOCKED_BY_BOT_GATE' : 'HTTP_UNAVAILABLE',
        httpCode: res.statusCode,
        articlesFound: 0,
        sampleTitle: null,
        sampleWordCount: 0,
      });
      continue;
    }

    const $ = cheerio.load(res.body);
    let matchedSelector = null;
    let foundLinks = [];

    for (const selector of portal.itemSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        matchedSelector = selector;
        elements.each((_, el) => {
          const a = $(el).is('a[href]') ? $(el) : $(el).find('a[href]').first();
          const href = a.attr('href') || $(el).attr('href');
          const title = $(el).find('h1, h2, h3, h4, .title').first().text().trim() || a.text().trim();
          if (href) {
            try {
              const resolved = new URL(href, portal.indexUrl).toString();
              if (resolved.startsWith('http') && title.length > 10) {
                foundLinks.push({ url: resolved, title });
              }
            } catch {}
          }
        });
        if (foundLinks.length > 0) break;
      }
    }

    // Fallback pencarian tautan generik jika selector khusus tidak cocok
    if (foundLinks.length === 0) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (
          href &&
          href.startsWith('http') &&
          text.length > 25 &&
          !href.includes('/tag/') &&
          !href.includes('/category/') &&
          !href.includes('/author/')
        ) {
          foundLinks.push({ url: href, title: text });
        }
      });
    }

    console.log(`  ✓ Respons HTTP ${res.statusCode} (${res.elapsed} ms) | Ukuran HTML: ${Math.round(res.body.length / 1024)} KB`);
    console.log(`  ✓ Selektor Cocok: "${matchedSelector || 'Generic <a> Fallback'}"`);
    console.log(`  ✓ Artikel Terdeteksi di Indeks: ${foundLinks.length}`);

    if (foundLinks.length > 0) {
      const sample = foundLinks[0];
      console.log(`  → Uji Sampel Artikel: "${sample.title.slice(0, 60)}..."`);
      console.log(`    URL: ${sample.url}`);

      // Unduh sampel artikel langsung
      const articleRes = await fetchUrl(sample.url);
      if (articleRes.ok) {
        const $art = cheerio.load(articleRes.body);
        $art('script, style, noscript, nav, header, footer, .social-share, .ads').remove();

        const paragraphs = [];
        $art('p').each((_, p) => {
          const t = $art(p).text().trim();
          if (t.length > 20 && !t.includes('Hak Cipta') && !t.includes('WhatsApp')) {
            paragraphs.push(t);
          }
        });

        const snippet = paragraphs.join(' ');
        const wordCount = snippet.split(/\s+/).filter(Boolean).length;
        console.log(`    Konten Berhasil Diurai: ${wordCount} kata (${paragraphs.length} paragraf)`);

        const isHealthy = wordCount >= 30;
        report.push({
          id: portal.id,
          label: portal.label,
          status: isHealthy ? 'HEALTHY (DOM Match)' : 'WARNING (Snippet Short)',
          httpCode: res.statusCode,
          matchedSelector,
          articlesFound: foundLinks.length,
          sampleTitle: sample.title,
          sampleWordCount: wordCount,
        });
      } else {
        report.push({
          id: portal.id,
          label: portal.label,
          status: 'WARNING (Article Detail Unreachable)',
          httpCode: articleRes.statusCode,
          matchedSelector,
          articlesFound: foundLinks.length,
          sampleTitle: sample.title,
          sampleWordCount: 0,
        });
      }
    } else {
      report.push({
        id: portal.id,
        label: portal.label,
        status: 'DOM_DRIFT_SUSPECTED (0 Links Matched)',
        httpCode: res.statusCode,
        matchedSelector: null,
        articlesFound: 0,
        sampleTitle: null,
        sampleWordCount: 0,
      });
    }

    console.log('');
  }

  console.log('====================================================================');
  console.log('RINGKASAN AUDIT INTEGRITAS DOM LIVE PORTAL:');
  console.log('====================================================================');
  console.table(
    report.map((r) => ({
      Portal: r.label,
      Status: r.status,
      HTTP: r.httpCode,
      'Links Found': r.articlesFound,
      'Sample Words': r.sampleWordCount,
    })),
  );
}

auditLivePortalDom();
