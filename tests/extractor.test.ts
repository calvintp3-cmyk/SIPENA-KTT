// tests/extractor.test.ts
import { describe, expect, it } from 'vitest';
import {
  accumulateParagraphsToThreshold,
  countWords,
  EXTRACTOR_MAX_CHARS,
  EXTRACTOR_MAX_WORDS,
  EXTRACTOR_MIN_WORDS,
  extractArticleContent,
  parseIndonesianDateTime,
} from '#server/services/scraper/extractor';
import {
  buildBingNewsRssUrl,
  buildGoogleNewsRssUrl,
  extractBingTargetUrl,
  extractRedirectTargetFromGoogleHtml,
  parseBingNewsRss,
  parseGoogleNewsRss,
} from '#server/services/scraper/national';
import { ExpenditureComponentEnum, KbliCategoryEnum } from '#shared/enums/pdrb';
import { parseRegionalPortalIndex, REGIONAL_PORTALS } from '#server/services/scraper/portals';
import { isHardNoiseTitleForNational } from '#server/services/scraper/title-filter';

function generateWords(n: number, prefix = 'ekonomi'): string {
  return Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`).join(' ');
}

describe('Scraper Extractor & Portal/RSS Parsers', () => {
  it('mengakumulasi paragraf pendek menjadi 300-450 kata dan maksimal 2.800 karakter', () => {
    const paragraphs = [
      'TANJUNG SELOR --', // dateline noise -> dibuang
      'Baca juga: Daftar wisata terbaru di Kalimantan Utara', // baca juga noise -> dibuang
      `${generateWords(110, 'sawit')}.`,
      `${generateWords(110, 'tana')}.`,
      `${generateWords(120, 'ekspor')}.`, // total bersih = 340 kata -> berhenti di sini
      `${generateWords(110, 'tambahan')}.`,
    ];

    const result = accumulateParagraphsToThreshold(paragraphs);
    expect(result.isValidContent).toBe(true);
    expect(result.wordCount).toBeGreaterThanOrEqual(EXTRACTOR_MIN_WORDS);
    expect(result.wordCount).toBeLessThanOrEqual(EXTRACTOR_MAX_WORDS);
    expect(result.snippetText.length).toBeLessThanOrEqual(EXTRACTOR_MAX_CHARS);
    expect(result.snippetText).not.toContain('Baca juga');
    expect(result.snippetText).not.toContain('tambahan1');
  });

  it('memangkas artikel paragraf panjang tunggal secara rapi <= 450 kata dan <= 2.800 karakter', () => {
    const giantParagraph = `${generateWords(280, 'pdrb')}. ${generateWords(250, 'investasi')}.`;
    const result = accumulateParagraphsToThreshold([giantParagraph]);

    expect(result.isValidContent).toBe(true);
    expect(result.wordCount).toBeLessThanOrEqual(EXTRACTOR_MAX_WORDS);
    expect(result.snippetText.length).toBeLessThanOrEqual(EXTRACTOR_MAX_CHARS);
  });

  it('tetap menerima artikel singkat valid (30-299 kata) dan menolak cuplikan < 30 kata', () => {
    const shortValid = accumulateParagraphsToThreshold([
      'Pemerintah Kabupaten Tana Tidung resmi menyalurkan subsidi ongkos angkut barang kebutuhan pokok menuju Kecamatan Muruk Rian dan Sesayap Hilir guna menekan disparitas harga eceran antarwilayah menjelang akhir tahun berjalan di pasar desa setempat.',
    ]);
    expect(shortValid.wordCount).toBeGreaterThanOrEqual(30);
    expect(shortValid.isValidContent).toBe(true);

    const tooShort = accumulateParagraphsToThreshold(['Halaman berita tidak ditemukan atau berlangganan.']);
    expect(tooShort.wordCount).toBeLessThan(30);
    expect(tooShort.isValidContent).toBe(false);
  });

  it('membersihkan elemen script, iklan, baca-juga, caption, dan mengekstrak JSON-LD/meta date', () => {
    const body1 = generateWords(160, 'sawit');
    const body2 = generateWords(160, 'karet');
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Produksi Batubara KTT Meningkat - Koran Kaltara</title>
          <meta property="og:title" content="Produksi Batubara KTT Meningkat" />
          <link rel="canonical" href="https://korankaltara.com/produksi-batubara-ktt-meningkat/" />
          <script type="application/ld+json">
            { "@context": "https://schema.org", "@type": "NewsArticle", "datePublished": "2026-10-14T09:15:00+08:00" }
          </script>
        </head>
        <body>
          <nav>Menu Navigasi Utama Daerah</nav>
          <article>
            <h1>Produksi Batubara KTT Meningkat</h1>
            <div class="baca-juga"><p>Baca juga: Link berita lainnya</p></div>
            <div class="entry-content">
              <script>window.__AD_TRACKER__ = "jangan masuk teks";</script>
              <p>${body1}.</p>
              <div class="iklan"><p>Promo diskon toko online terbesar bulan ini</p></div>
              <p>${body2}.</p>
              <p>Penulis: Pewarta KTT</p>
            </div>
          </article>
        </body>
      </html>
    `;

    const extracted = extractArticleContent(html);
    expect(extracted.title).toBe('Produksi Batubara KTT Meningkat');
    expect(extracted.canonicalUrl).toBe('https://korankaltara.com/produksi-batubara-ktt-meningkat/');
    expect(extracted.publishedAt?.toISOString()).toBe('2026-10-14T01:15:00.000Z');
    expect(extracted.isValidContent).toBe(true);
    expect(countWords(extracted.snippetText)).toBeGreaterThanOrEqual(150);
    expect(extracted.snippetText).not.toContain('__AD_TRACKER__');
    expect(extracted.snippetText).not.toContain('Promo diskon');
    expect(extracted.snippetText).not.toContain('Penulis:');
  });

  it('mem-parsing tanggal bahasa Indonesia (WIB/WITA/WIT), numerik, & relatif dengan tepat', () => {
    const witaDate = parseIndonesianDateTime('Senin, 14 Oktober 2026 | 09:15 WITA');
    expect(witaDate?.toISOString()).toBe('2026-10-14T01:15:00.000Z');

    const wibDate = parseIndonesianDateTime('14 Okt 2026 pukul 09.15 WIB');
    expect(wibDate?.toISOString()).toBe('2026-10-14T02:15:00.000Z');

    const numericId = parseIndonesianDateTime('14/10/2026 10:30 WITA');
    expect(numericId?.toISOString()).toBe('2026-10-14T02:30:00.000Z');

    const refNow = new Date('2026-10-14T10:00:00.000Z');
    const rel = parseIndonesianDateTime('3 jam yang lalu', refNow);
    expect(rel?.toISOString()).toBe('2026-10-14T07:00:00.000Z');
  });

  it('memanen link portal regional sesuai jendela toleransi H-3 dan membuang kategori/arsip lama', () => {
    const now = new Date('2026-10-14T20:00:00.000Z'); // 15 Okt 2026 04:00 WITA
    const koranKaltara = REGIONAL_PORTALS.find((p) => p.sourcePortal === 'korankaltara.com')!;

    const html = `
      <html>
        <body>
          <article>
            <h2 class="entry-title">
              <a href="https://korankaltara.com/harga-tbs-sawit-tana-tidung-menguat?utm_source=fb">Harga TBS Sawit Tana Tidung Menguat di Awal Triwulan IV</a>
            </h2>
            <time datetime="2026-10-14T11:00:00+08:00">14 Oktober 2026</time>
          </article>
          <article>
            <h2 class="entry-title">
              <a href="https://korankaltara.com/arsip-festival-budaya-2024">Arsip Berita Lama Tahun Lalu</a>
            </h2>
            <time datetime="2025-08-10T10:00:00+08:00">10 Agustus 2025</time>
          </article>
          <article>
            <h2 class="entry-title">
              <a href="https://korankaltara.com/category/tana-tidung">Kategori Tana Tidung</a>
            </h2>
          </article>
        </body>
      </html>
    `;

    const candidates = parseRegionalPortalIndex(html, koranKaltara, { now, lookbackDays: 3 });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.url).toBe('https://korankaltara.com/harga-tbs-sawit-tana-tidung-menguat');
    expect(candidates[0]?.sourcePortal).toBe('korankaltara.com');
  });

  it('mem-parsing Google News RSS XML dan menyaring hard-noise title hanya untuk portal nasional', () => {
    const now = new Date('2026-10-14T20:00:00.000Z');
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Harga Batubara Acuan Oktober Ditetapkan Naik - Bisnis.com</title>
            <link>https://ekonomi.bisnis.com/read/20261014/harga-batubara-acuan-naik</link>
            <pubDate>Wed, 14 Oct 2026 04:30:00 GMT</pubDate>
            <source url="https://ekonomi.bisnis.com">Bisnis.com</source>
          </item>
          <item>
            <title>Berita Lama Sekali Tahun 2024 - Media</title>
            <link>https://example.com/berita-lama-sekali</link>
            <pubDate>Mon, 01 Jan 2024 04:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    const items = parseGoogleNewsRss(rssXml, { id: 'kw-1', keyword: 'harga batubara acuan' }, { now, lookbackDays: 3 });
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Harga Batubara Acuan Oktober Ditetapkan Naik');
    expect(items[0]?.sourcePortal).toBe('ekonomi.bisnis.com');
    expect(items[0]?.keywordId).toBe('kw-1');

    expect(isHardNoiseTitleForNational('Hasil Pertandingan Liga 1 Semalam Skor Akhir 2-1')).toBe(true);
    expect(isHardNoiseTitleForNational('Jadwal Sholat dan Imsakiyah Kabupaten Tana Tidung')).toBe(true);
    expect(isHardNoiseTitleForNational('Harga Batubara Acuan Oktober 2026 Naik 4 Persen')).toBe(false);

    const rssUrl = buildGoogleNewsRssUrl('harga TBS kelapa sawit');
    expect(rssUrl).toContain('news.google.com/rss/search');
    expect(rssUrl).toContain('when%3A7d');
    expect(rssUrl).toContain('hl=id');
    expect(rssUrl).toContain('ceid=ID%3Aid');

    const bingUrl = buildBingNewsRssUrl('harga TBS kelapa sawit');
    expect(bingUrl).toContain('bing.com/news/search');
    expect(bingUrl).toContain('format=rss');

    const unwrapped = extractBingTargetUrl(
      'http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&tid=abc&url=https%3a%2f%2fwww.infosawit.com%2f2026%2f10%2f14%2fharga-tbs-sawit-kaltara-naik%2f&c=123',
    );
    expect(unwrapped).toBe('https://www.infosawit.com/2026/10/14/harga-tbs-sawit-kaltara-naik/');

    const bingXml = `<?xml version="1.0" encoding="utf-8" ?>
      <rss version="2.0" xmlns:News="https://www.bing.com/schema/news">
        <channel>
          <item>
            <title>Harga TBS Sawit Kaltara Periode Oktober Menguat Signifikan</title>
            <link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fwww.infosawit.com%2f2026%2f10%2f14%2fharga-tbs-sawit-kaltara-naik%2f</link>
            <description>Dinas Perkebunan menetapkan kenaikan harga TBS kelapa sawit di Kalimantan Utara termasuk Kabupaten Tana Tidung sebesar Rp 85 per kilogram.</description>
            <pubDate>Wed, 14 Oct 2026 05:00:00 GMT</pubDate>
            <News:Source>InfoSAWIT</News:Source>
          </item>
        </channel>
      </rss>
    `;
    const bingItems = parseBingNewsRss(
      bingXml,
      {
        id: 'kw-sawit',
        keyword: 'harga TBS kelapa sawit Kaltara',
        defaultKbliCategory: KbliCategoryEnum.A,
        defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
      },
      { now, lookbackDays: 7 },
    );
    expect(bingItems).toHaveLength(1);
    expect(bingItems[0]?.url).toBe('https://www.infosawit.com/2026/10/14/harga-tbs-sawit-kaltara-naik');
    expect(bingItems[0]?.sourcePortal).toBe('infosawit.com');
    expect(bingItems[0]?.defaultKbliCategory).toBe(KbliCategoryEnum.A);
    expect(bingItems[0]?.defaultExpenditureComponent).toBe(ExpenditureComponentEnum.NET_EXPORT);
    expect(bingItems[0]?.fallbackDescription).toContain('Dinas Perkebunan menetapkan kenaikan harga TBS');

    const redirectHtml =
      '<html><head><meta property="og:url" content="https://ekonomi.bisnis.com/read/2026/tbs-sawit" /></head><body><a href="https://news.google.com/about">Google</a></body></html>';
    expect(extractRedirectTargetFromGoogleHtml(redirectHtml)).toBe(
      'https://ekonomi.bisnis.com/read/2026/tbs-sawit',
    );
  });

  it('memanen kandidat dari seluruh 4 portal regional KTT (Tribun, Koran Kaltara, Benuanta, Radar Tarakan)', () => {
    const now = new Date('2026-10-14T20:00:00.000Z');
    const [tribun, koran, benuanta, radar] = REGIONAL_PORTALS;

    expect(
      parseRegionalPortalIndex(
        `<ul class="lsi"><li class="p1520"><h3><a href="https://kaltara.tribunnews.com/2026/10/14/proyek-pusat-pemerintahan-ktt">Proyek Pusat Pemerintahan KTT Masuk Tahap Konstruksi</a></h3><span class="grey">14 Oktober 2026 10:00 WITA</span></li></ul>`,
        tribun!,
        { now },
      ),
    ).toHaveLength(1);

    expect(
      parseRegionalPortalIndex(
        `<article><h2 class="entry-title"><a href="https://korankaltara.com/panen-raya-padi-tana-tidung-meningkat">Panen Raya Padi Kabupaten Tana Tidung Meningkat</a></h2><time datetime="2026-10-14T09:00:00+08:00"></time></article>`,
        koran!,
        { now },
      ),
    ).toHaveLength(1);

    expect(
      parseRegionalPortalIndex(
        `<div class="jeg_post"><h3><a href="https://benuanta.co.id/pemda-ktt-kucurkan-subsidi-ongkos-angkut/">Pemda KTT Kucurkan Subsidi Ongkos Angkut Pedalaman</a></h3><div class="entry-date">14 Oktober 2026</div></div>`,
        benuanta!,
        { now },
      ),
    ).toHaveLength(1);

    expect(
      parseRegionalPortalIndex(
        `<div class="latest__item"><h2><a class="latest__link" href="https://radartarakan.jawapos.com/tana-tidung/14/10/2026/tambak-udang-ktt-siap-ekspor">Tambak Udang Kabupaten Tana Tidung Siap Ekspor</a></h2><span class="latest__date">14 Oktober 2026</span></div>`,
        radar!,
        { now },
      ),
    ).toHaveLength(1);
  });

  it('menghindari link topik Tribun, mendukung a>h3 relatif Koran Kaltara, .ui-r-fg Radar, serta mencegah bocor sidebar', () => {
    const now = new Date('2026-10-14T20:00:00.000Z');
    const [tribun, koran, benuanta, radar] = REGIONAL_PORTALS;

    // Tribun: <h4><a href="/topic/..."> muncul SEBELUM <h3><a href="/kaltara/125113/...">
    const tribunHtml = `
      <div class="mr140">
        <h4 class="fbo2 f14 red"><a href="https://kaltara.tribunnews.com/topic/berita-tana-tidung-terkini">Berita Tana Tidung Terkini</a></h4>
        <h3><a href="https://kaltara.tribunnews.com/kaltara/125113/investasi-pelabuhan-tana-tidung-naik">Investasi Pelabuhan Tana Tidung Meningkat Pesat</a></h3>
        <div class="grey pt5"><time class="timeago" title="2026-10-14 14:20:00">14 Oktober 2026</time></div>
      </div>
    `;
    const tribunItems = parseRegionalPortalIndex(tribunHtml, tribun!, { now, lookbackDays: 3 });
    expect(tribunItems).toHaveLength(1);
    expect(tribunItems[0]?.url).toContain('/kaltara/125113/');

    // Koran Kaltara: relative link membungkus <h3> dan date di <time class="time-xs">
    const koranHtml = `
      <div class="border-b">
        <div class="w-3/12"><a href="/ekspor-cpo-tana-tidung-menguat"><img alt="x"></a></div>
        <div class="w-10/12">
          <a href="/ekspor-cpo-tana-tidung-menguat"><h3>Ekspor CPO Kabupaten Tana Tidung Menguat</h3></a>
          <time class="time-xs">Rabu, 14 Okt 2026</time>
        </div>
      </div>
    `;
    const koranItems = parseRegionalPortalIndex(koranHtml, koran!, { now, lookbackDays: 3 });
    expect(koranItems).toHaveLength(1);
    expect(koranItems[0]?.url).toBe('https://korankaltara.com/ekspor-cpo-tana-tidung-menguat');

    // Radar Tarakan: kategori <a href="/tana-tidung"> sebelum <h3 class="ui-heading"><a> & tanggal di .ui-text
    const radarHtml = `
      <div class="ui-r-fg">
        <a href="/tana-tidung"><button>Tana Tidung</button></a>
        <h3 class="ui-heading"><a href="/tana-tidung/2610140009/cek-pajak-kendaraan-bpkpd-ktt">BPKPD Tana Tidung Intensifkan Pajak Kendaraan Dinas</a></h3>
        <span class="ui-text">Rabu, 14 Okt 2026 | 11:44 WIB</span>
      </div>
    `;
    const radarItems = parseRegionalPortalIndex(radarHtml, radar!, { now, lookbackDays: 3 });
    expect(radarItems).toHaveLength(1);
    expect(radarItems[0]?.url).toContain('/tana-tidung/2610140009/');

    // Benuanta: jika seluruh 3 container <article> terstruktur berisi berita lama 2025, Strategi 2 TIDAK boleh memanen sidebar
    const benuantaOldHtml = `
      <article><h2 class="entry-title"><a href="https://benuanta.co.id/pemkab-tana-tidung/1/berita-lama-satu/">Berita Lama Satu Dari Tahun Lalu</a></h2><time datetime="2025-03-01T10:00:00+08:00">1 Maret 2025</time></article>
      <article><h2 class="entry-title"><a href="https://benuanta.co.id/pemkab-tana-tidung/2/berita-lama-dua/">Berita Lama Dua Dari Tahun Lalu</a></h2><time datetime="2025-02-01T10:00:00+08:00">1 Februari 2025</time></article>
      <article><h2 class="entry-title"><a href="https://benuanta.co.id/pemkab-tana-tidung/3/berita-lama-tiga/">Berita Lama Tiga Dari Tahun Lalu</a></h2><time datetime="2025-01-01T10:00:00+08:00">1 Januari 2025</time></article>
      <aside class="sidebar"><h2><a href="https://benuanta.co.id/uncategorized/iklan-sidebar-bukan-ktt/">Iklan Sidebar Bukan Artikel KTT</a></h2></aside>
    `;
    const benuantaItems = parseRegionalPortalIndex(benuantaOldHtml, benuanta!, { now, lookbackDays: 3 });
    expect(benuantaItems).toHaveLength(0);
  });
});

