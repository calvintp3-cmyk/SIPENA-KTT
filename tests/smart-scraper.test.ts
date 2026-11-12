// tests/smart-scraper.test.ts
import { describe, expect, it } from 'vitest';
import { ArticleSourceTypeEnum } from '#shared/enums/pdrb';
import {
  computeTitleSimilarity,
  deduplicateCandidatesByTitle,
} from '#server/services/scraper/dedup';
import { evaluateGeographicRelevance } from '#server/services/scraper/geo-filter';
import {
  buildFbv4jeFormBody,
  decodeGoogleNewsUrlFromHtml,
  extractGoogleNewsDecodeParams,
  parseGarturlFromBatchexecuteBody,
} from '#server/services/scraper/google-news-decoder';
import {
  buildNationalFallbackSnippet,
  parseBingNewsRss,
} from '#server/services/scraper/national';
import {
  parseRegionalPortalIndex,
  parseRegionalRssFeed,
  type DiscoveredArticleCandidate,
  type RegionalPortalConfig,
} from '#server/services/scraper/portals';
import { isHardNoiseTitleForNational } from '#server/services/scraper/title-filter';

const BENUANTA_PORTAL: RegionalPortalConfig = {
  id: 'benuanta',
  label: 'Benuanta (Tana Tidung)',
  sourcePortal: 'benuanta.co.id',
  indexUrl: 'https://benuanta.co.id/?s=tana+tidung',
  feedUrls: ['https://benuanta.co.id/topic/berita-ktt/feed/'],
  allowedHosts: ['benuanta.co.id', 'www.benuanta.co.id'],
  itemSelectors: ['article', '.jeg_post'],
};

function makeCandidate(
  overrides: Partial<DiscoveredArticleCandidate>,
): DiscoveredArticleCandidate {
  const url = overrides.url ?? 'https://korankaltara.com/berita-ktt-default';
  return {
    url,
    normalizedUrl: overrides.normalizedUrl ?? url,
    urlHash: overrides.urlHash ?? `hash-${Math.random().toString(36).slice(2)}`,
    title: overrides.title ?? 'Judul Berita Ekonomi Kabupaten Tana Tidung',
    sourcePortal: overrides.sourcePortal ?? 'korankaltara.com',
    sourceType: overrides.sourceType ?? ArticleSourceTypeEnum.REGIONAL,
    publishedHint: overrides.publishedHint ?? new Date('2026-10-14T08:00:00Z'),
    keywordId: null,
    matchedKeyword: null,
    fallbackDescription: null,
    ...overrides,
  };
}

describe('Smart Scraper Filters, Dedup, Google News Decoder & Geo-Gate', () => {
  it('dedup.ts menghitung kemiripan judul lintas media dan mencegah false positive beda angka besaran', () => {
    const simSameEvent = computeTitleSimilarity(
      'Harga TBS Sawit Kalimantan Utara Naik Menjadi Rp 2.980 per Kilogram - Bisnis.com',
      'Harga TBS Sawit Kalimantan Utara Naik Menjadi Rp 2.980 per Kilogram - Kompas.com',
    );
    expect(simSameEvent).toBeGreaterThanOrEqual(0.72);

    const simDifferentPrice = computeTitleSimilarity(
      'Harga TBS Sawit Kalimantan Utara Ditetapkan Rp 2.980 Periode Februari 2026',
      'Harga TBS Sawit Kalimantan Utara Ditetapkan Rp 2.650 Periode Februari 2026',
    );
    expect(simDifferentPrice).toBe(0);

    const wrapperFirst = makeCandidate({
      url: 'https://news.google.com/rss/articles/CBMiWrapperFirst',
      urlHash: 'h-wrapper',
      sourceType: ArticleSourceTypeEnum.NATIONAL,
      sourcePortal: 'kompas.com',
      title: 'Pemkab Tana Tidung Bangun Jembatan Sesayap Tahun 2026 Senilai Rp 45 Miliar',
    });
    const directSecond = makeCandidate({
      url: 'https://ekonomi.bisnis.com/read/20261014/pemkab-tana-tidung-bangun-jembatan-sesayap',
      urlHash: 'h-direct',
      sourceType: ArticleSourceTypeEnum.NATIONAL,
      sourcePortal: 'ekonomi.bisnis.com',
      title: 'Pemkab Tana Tidung Bangun Jembatan Sesayap Tahun 2026 Senilai Rp 45 Miliar',
    });
    const regionalThird = makeCandidate({
      url: 'https://korankaltara.com/pemkab-tana-tidung-bangun-jembatan-sesayap-45-miliar',
      urlHash: 'h-regional',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      sourcePortal: 'korankaltara.com',
      title: 'Pemkab Tana Tidung Bangun Jembatan Sesayap Tahun 2026 Senilai Rp 45 Miliar',
    });
    const historicalMatch = makeCandidate({
      url: 'https://korankaltara.com/rsud-akhmad-berahim-resmikan-igd',
      urlHash: 'h-hist',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      title: 'RSUD Akhmad Berahim Tideng Pale Resmikan Gedung Layanan IGD Baru',
    });

    const deduped = deduplicateCandidatesByTitle(
      [wrapperFirst, directSecond, regionalThird, historicalMatch],
      ['RSUD Akhmad Berahim Tideng Pale Resmikan Gedung Layanan IGD Baru Tahun Ini'],
    );

    expect(deduped.deduplicatedCount).toBe(3);
    expect(deduped.uniqueCandidates).toHaveLength(1);
    expect(deduped.uniqueCandidates[0]?.sourceType).toBe(ArticleSourceTypeEnum.REGIONAL);
    expect(deduped.uniqueCandidates[0]?.url).toContain('korankaltara.com');

    // Antara NATIONAL direct vs Google wrapper, NATIONAL direct harus menang
    const nationalDedup = deduplicateCandidatesByTitle([wrapperFirst, directSecond]);
    expect(nationalDedup.uniqueCandidates).toHaveLength(1);
    expect(nationalDedup.uniqueCandidates[0]?.url).toBe(directSecond.url);
  });

  it('google-news-decoder mengekstrak parameter data-n-a-*, menyusun payload Fbv4je, dan mendekode URL penerbit aman', async () => {
    const sampleWrapperHtml = `
      <html><body>
        <c-wiz data-n-a-id="CBMiSampleArticle123" data-n-a-ts="1760430000" data-n-a-sg="ABcDefSignature"></c-wiz>
      </body></html>
    `;

    const params = extractGoogleNewsDecodeParams(sampleWrapperHtml);
    expect(params).toEqual({
      id: 'CBMiSampleArticle123',
      ts: '1760430000',
      sg: 'ABcDefSignature',
    });

    const formBody = buildFbv4jeFormBody(params!);
    expect(formBody).toContain('f.req=');
    expect(decodeURIComponent(formBody)).toContain('Fbv4je');
    expect(decodeURIComponent(formBody)).toContain('CBMiSampleArticle123');

    const unescapedResp = `)]}'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://ekonomi.bisnis.com/read/20261014/hba-batubara\\",1]",null]]`;
    expect(parseGarturlFromBatchexecuteBody(unescapedResp)).toBe(
      'https://ekonomi.bisnis.com/read/20261014/hba-batubara',
    );
    expect(
      parseGarturlFromBatchexecuteBody('["garturlres","javascript:alert(1)",1]'),
    ).toBeNull();

    const validatedHosts: string[] = [];
    const decoded = await decodeGoogleNewsUrlFromHtml(sampleWrapperHtml, {
      validateUrlFn: async (rawUrl) => {
        const parsed = new URL(rawUrl);
        validatedHosts.push(parsed.hostname);
        return parsed;
      },
      fetchFn: async () =>
        new Response(
          `)]}'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.antaranews.com/berita/999999/kaltara-ekspor\\",1]"]]`,
          { status: 200 },
        ),
    });

    expect(decoded).toBe('https://www.antaranews.com/berita/999999/kaltara-ekspor');
    expect(validatedHosts).toEqual(['news.google.com', 'www.antaranews.com']);

    // Jika hasil decode masih domain Google, wajib ditolak
    const blockedGoogleSelf = await decodeGoogleNewsUrlFromHtml(sampleWrapperHtml, {
      validateUrlFn: async (rawUrl) => new URL(rawUrl),
      fetchFn: async () =>
        new Response(
          `)]}'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://news.google.com/articles/still-google\\",1]"]]`,
          { status: 200 },
        ),
    });
    expect(blockedGoogleSelf).toBeNull();
  });

  it('geo-filter membedakan KTT_LOCAL, kabupaten tetangga (Nunukan/Tarakan/Riau), makro Kaltara/nasional, dan tarif statis', () => {
    expect(
      evaluateGeographicRelevance({
        title: 'PDAM Tirta Taka Salurkan Sambungan Air Bersih Baru di Tideng Pale',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      }).decision,
    ).toBe('ALLOW_KTT_ANCHOR');

    expect(
      evaluateGeographicRelevance({
        title: 'Pemkab Nunukan Salurkan Subsidi Ongkos Angkut Udara Krayan Rp 912 Juta',
        snippetText: 'Program subsidi angkutan barang di Kecamatan Krayan Kabupaten Nunukan resmi bergulir.',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      }).decision,
    ).toBe('DROP_OTHER_REGENCY_LOCAL');

    expect(
      evaluateGeographicRelevance({
        title: 'Harga CPO Pekanbaru Menguat, Disbun Riau Tetapkan Indeks K 92 Persen',
        sourceType: ArticleSourceTypeEnum.NATIONAL,
      }).decision,
    ).toBe('DROP_OTHER_REGENCY_LOCAL');

    expect(
      evaluateGeographicRelevance({
        title: 'Normalisasi Sungai dan Pembangunan Drainase Berjalan Lancar',
        url: 'https://korankaltara.com/tarakan/normalisasi-sungai-drainase',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      }).decision,
    ).toBe('DROP_OTHER_REGENCY_LOCAL');

    expect(
      evaluateGeographicRelevance({
        title: 'Disbun Kaltara Tetapkan Harga TBS Kelapa Sawit Provinsi Kalimantan Utara Februari 2026',
        sourceType: ArticleSourceTypeEnum.NATIONAL,
      }).decision,
    ).toBe('ALLOW_FOR_LLM_REVIEW');

    expect(
      evaluateGeographicRelevance({
        title: 'Kemenkeu Salurkan Dana Bagi Hasil Migas dan Batubara untuk Daerah Penghasil',
        sourceType: ArticleSourceTypeEnum.NATIONAL,
      }).decision,
    ).toBe('ALLOW_FOR_LLM_REVIEW');

    expect(
      evaluateGeographicRelevance({
        title: 'PLN Pastikan Tarif Listrik Nonsubsidi Bulan Ini Tetap Tidak Berubah',
        sourceType: ArticleSourceTypeEnum.NATIONAL,
      }).decision,
    ).toBe('DROP_STATIC_NOISE');
  });

  it('title-filter, Bing News parser, dan buildNationalFallbackSnippet menjaga netralitas lokus serta menyaring noise statis', () => {
    expect(isHardNoiseTitleForNational('Cek Harga BBM Pertamina Terbaru Hari Ini Seluruh Indonesia')).toBe(true);
    expect(isHardNoiseTitleForNational('Grafik Data Historis Harga Emas Antam Tahun 2020-2025')).toBe(true);
    expect(isHardNoiseTitleForNational('Kementerian ESDM Tetapkan HBA Batubara Februari 2026')).toBe(false);

    const bingXml = `<?xml version="1.0" encoding="utf-8" ?>
      <rss version="2.0" xmlns:News="https://www.bing.com/schema/news">
        <channel>
          <item>
            <title>Kementerian ESDM Tetapkan HBA Batubara Periode Oktober 2026</title>
            <link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fkontan.co.id%2fnews%2fhba-batubara-oktober-2026</link>
            <description>Kementerian ESDM menetapkan Harga Batubara Acuan terbaru untuk ekspor tambang nasional.</description>
            <pubDate>Wed, 14 Oct 2026 06:00:00 GMT</pubDate>
            <News:Source>Kontan.co.id</News:Source>
          </item>
        </channel>
      </rss>`;

    const bingCandidates = parseBingNewsRss(
      bingXml,
      { id: 'kw-hba', keyword: 'harga batubara acuan KTT' },
      { now: new Date('2026-10-14T12:00:00Z') },
    );
    expect(bingCandidates).toHaveLength(1);
    expect(bingCandidates[0]?.url).toBe('https://kontan.co.id/news/hba-batubara-oktober-2026');
    expect(bingCandidates[0]?.sourcePortal).toBe('kontan.co.id');

    const fallback = buildNationalFallbackSnippet(bingCandidates[0]!);
    expect(fallback.snippetText).toContain('kontan.co.id');
    expect(fallback.snippetText).toContain('tanpa isi artikel penuh');
    expect(fallback.snippetText).not.toMatch(/terjadi di Kabupaten Tana Tidung/i);
  });

  it('parseRegionalRssFeed mengekstrak CDATA content:encoded (>30 kata) & parseRegionalPortalIndex membuang widget sidebar', () => {
    const longParagraph = Array.from({ length: 42 }, (_, idx) => `tanaTidungKata${idx + 1}`).join(' ');
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <item>
            <title>Proyek Infrastruktur Jalan Poros Tana Tidung Capai Progres 75 Persen</title>
            <link>https://benuanta.co.id/berita/proyek-jalan-tana-tidung-2026/</link>
            <pubDate>Wed, 14 Oct 2026 08:30:00 +0800</pubDate>
            <content:encoded><![CDATA[<p>Pemerintah Kabupaten Tana Tidung mempercepat proyek di Tideng Pale.</p><p>${longParagraph}.</p>]]></content:encoded>
          </item>
          <item>
            <title>Peresmian Pasar Induk Kecamatan Perbatasan yang Maju</title>
            <link>https://benuanta.co.id/nunukan/peresmian-pasar-induk-perbatasan/</link>
            <pubDate>Wed, 14 Oct 2026 07:30:00 +0800</pubDate>
            <description><![CDATA[<p>Berita di wilayah perbatasan.</p>]]></description>
          </item>
        </channel>
      </rss>`;

    const feedItems = parseRegionalRssFeed(rssXml, BENUANTA_PORTAL, {
      now: new Date('2026-10-14T12:00:00Z'),
      feedUrl: 'https://benuanta.co.id/feed/?s=tana+tidung',
    });

    expect(feedItems).toHaveLength(1);
    expect(feedItems[0]?.title).toContain('Proyek Infrastruktur Jalan Poros Tana Tidung');
    expect(feedItems[0]?.prefetchedWordCount).toBeGreaterThanOrEqual(30);
    expect(feedItems[0]?.prefetchedSnippetText).toContain('Tideng Pale');

    const htmlWithSidebar = `
      <html><body>
        <main>
          <article>
            <h2><a href="https://benuanta.co.id/read/investasi-pks-sesayap-hilir-ktt">Investasi Pabrik Kelapa Sawit Sesayap Hilir KTT Rampung</a></h2>
            <time datetime="2026-10-14T09:00:00+08:00"></time>
          </article>
        </main>
        <aside class="sidebar">
          <div class="terpopuler">
            <article>
              <h2><a href="https://benuanta.co.id/read/berita-populer-tarakan-salah-masuk">Berita Terpopuler Tarakan Tidak Terkait KTT</a></h2>
            </article>
          </div>
        </aside>
      </body></html>
    `;

    const indexItems = parseRegionalPortalIndex(htmlWithSidebar, BENUANTA_PORTAL, {
      now: new Date('2026-10-14T12:00:00Z'),
    });
    expect(indexItems).toHaveLength(1);
    expect(indexItems[0]?.url).toContain('investasi-pks-sesayap-hilir-ktt');
  });
});

