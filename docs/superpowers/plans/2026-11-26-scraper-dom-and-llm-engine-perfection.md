# Scraper DOM Extraction Blueprint & LLM Engine PDRB Perfection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyempurnakan ekstraktor konten berita (pembelajaran profil struktur DOM 11 portal regional KTT, ekstraksi JSON Hydration multi-halaman Jawa Pos/Next.js, algoritma Cheerio 5-lapis bebas iklan/headline berita lain untuk portal nasional, dan penghapusan pembatasan jumlah kata) serta menutup seluruh celah LLM Engine dalam mengenali usulan/rencana aktivitas ekonomi, memetakan Lapangan Usaha KBLI 2025 (A–V), Komponen Pengeluaran SNA 2008, dan arah dampaknya.

**Architecture:** Menerapkan arsitektur ekstraksi hibrida dua jalur di `server/services/scraper/extractor.ts`: (1) **Domain-Learned Portal Blueprint Registry (`PORTAL_EXTRACTION_PROFILES`) & Hydration JSON Parser (`props.article.content` / `__NEXT_DATA__` / `var rawText`)** untuk portal regional dan jaringan media besar, serta (2) **5-Layer National Cheerio Engine** (Post-Content Boundary Guillotine, Leaf-Container Specificity Scoring anti-`<main>` trap, Inline Noise Surgical Stripper, Truncated-Teaser Rejection, dan Content-Diff Pagination Loop Guard). Di sisi LLM (`server/services/llm/classifier.ts` & `router.ts`), seluruh teks bersih dikirim utuh tanpa pemotongan paragraf, berita usulan/rencana program/CSR/Perda ekonomi diterima sebagai *leading indicator* PDRB, dan 6 celah Guardrail KBLI 2025 & SNA 2008 dikalibrasi secara deterministik.

**Tech Stack:** Nuxt 3 / Nitro, TypeScript, Cheerio, Zod v4, Vitest, Drizzle ORM, Multi-LLM Router (Gemini, Groq, Cerebras, Mistral, OpenRouter, NVIDIA NIM).

## Global Constraints

- **Tanpa Pemotongan Kata (Zero Artificial Word Truncation):** Seluruh teks asli berita yang bersih dari iklan/noise wajib disimpan utuh ke database dan dikirim utuh ke prompt LLM tanpa pemotongan paragraf (batas pengaman DoS memori tetap `25_000` kata / `180_000` karakter).
- **Berita Usulan / Rencana / Wacana Ekonomi Diterima:** Berita yang memuat usulan program fisik, rencana penghijauan/infrastruktur, dukungan CSR perusahaan, MoU pembangunan, atau usulan Perda perlindungan aset/ekonomi di KTT wajib diklasifikasikan sebagai `is_economic_phenomenon = true` (gambaran aktivitas ekonomi yang akan terjadi).
- **Standar Klasifikasi:** KBLI 2025 (Peraturan BPS No. 7 Tahun 2025 — 22 Kategori A s.d. V) dan SNA 2008 (6 Komponen Pengeluaran: `PK_RT`, `PK_LNPRT`, `PK_P`, `PMTB`, `INVENTORY_CHANGE`, `NET_EXPORT`).
- **Backward Compatibility Tes:** Seluruh unit test di `tests/` wajib lulus (`npx vitest run`) dan typecheck `npx vue-tsc --noEmit` wajib bersih tanpa error.

---

### File Structure & Responsibilities

1. **`server/services/scraper/portal-profiles.ts` (Create):**
   Registri profil struktur DOM terpelajari (*Learned Portal Extraction Blueprints*) untuk 11 portal regional Kalimantan Utara (`radartarakan.jawapos.com`, `kaltimpost.jawapos.com`, `kaltara.tribunnews.com`, `korankaltara.com`, `benuanta.co.id`, `kaltara.antaranews.com`, `fokusborneo.com`, `headlinews.id`, `niaga.asia`, `metrokaltara.com`, `rri.co.id`) beserta aturan kontainer spesifik, selector yang wajib dibuang, dan pola boilerplate masing-masing portal.
2. **`server/services/scraper/extractor.ts` (Modify):**
   - Ekstraktor Hydration JSON (`findHydrationArticleBodyInScripts`) untuk CMS React/Inertia Jawa Pos (`props.article.content` yang menyatukan seluruh halaman `<p class="page">` tanpa mencampur `props.article.related`) dan Next.js (`__NEXT_DATA__`).
   - Pembersihan tag HTML mentah pada JSON-LD `articleBody`.
   - Algoritma Cheerio 5-lapis untuk portal nasional: *Post-Content Boundary Guillotine* (memenggal semua elemen setelah heading `"Artikel Terkait"`, `"Berita Terkini"`, `<hr>`), *Leaf-Container Specificity Scoring* (melarang `<main>` atau `<article>` mengalahkan kontainer spesifik `.konten`, `.detail__body-text`, `.entry-content`, `.news-content`), *Inline Noise Surgical Stripper* (menghapus `"Baca juga: ..."` di tengah paragraf, footer RSS `"The post ... first appeared on"`, promo `"E-Paper Koran Kaltara"`, disclaimer AI ANTARA), dan *Truncated-Teaser Filter*.
   - Deteksi paginasi multi-halaman vs 1 halaman yang akurat (mengabaikan link `"Halaman"` di `<footer>`, mendukung pendeteksian duplikasi isi halaman saat server mengabaikan `?page=2`).
3. **`server/services/llm/classifier.ts` (Modify):**
   - Menghapus pemotongan kata default pada `buildClassificationPrompt` / `compressArticleTextForLlm` ketika dipanggil tanpa batas kata eksplisit (`COMPRESS_MAX_WORDS_FOR_LLM = 25_000`, `COMPRESS_MAX_CHARS_FOR_LLM = 180_000`) sambil tetap menjaga fungsi `compressArticleTextForLlm(rawText, maxWords, maxChars)` bekerja bila dipanggil dengan argumen `maxWords` spesifik pada unit test.
   - Memperbarui `SIPENA_SYSTEM_INSTRUCTION_FULL` & `COMPACT`: menerima usulan/rencana kebijakan, CSR perusahaan, MoU, dan usulan Perda pembangunan sebagai `is_economic_phenomenon = true`; menambahkan instruksi *Noise-Aware Reading*.
   - Memperbaiki 6 celah Guardrail di `enrichClassificationLinkages`:
     1. Fix bug regex `perusahaan melanggar` pada `GUARDRAIL 3` agar wajib terikat konteks `thr|bhr|upah minimum|umk|pesangon`.
     2. Kalibrasi `GUARDRAIL 8` (*Price Shock vs Volume Shock*) agar tidak menimpa berita produksi/pasokan/ekspor riil yang kebetulan menyebut kata harga.
     3. Penambahan Guardrail spesifik KTT: Program CSR Penghijauan/Fasilitas Kota & Usulan Perda Pembangunan (`F`/`P`/`A`), Proyek Jaringan Listrik SUTT/Gardu Induk PLN (`F` + sekunder `D`, `PMTB`), Perikanan Tambak Udang/Bandeng (`A`, `NET_EXPORT`/`PK_RT`), serta Penyelesaian Lahan HTI/Inhutani Kawasan Pemkab (`P` + sekunder `M`/`A`).
     4. Perbaikan urutan eksekusi `GUARDRAIL 10` (*Konsistensi Lintas-Sumbu Dampak*) agar dijalankan paling akhir setelah seluruh *Inter-Industry Linkage Concordance* selesai.
     5. Perbaikan regex angka kuantitatif di `calibrateClassificationConfidence` agar angka tanggal seperti `Rabu (25/11)` atau tahun `2026` tidak dianggap sebagai data kuantitatif ekonomi, serta menghapus penalti berlebihan pada berita usulan lokal KTT (`KTT_LOCAL`).
4. **`server/services/llm/router.ts`, `server/services/scraper/pipeline.ts`, `server/api/admin/articles/[id]/reclassify.post.ts`, `server/api/admin/articles/extract-url.post.ts`, `server/db/reprocess-ignored-economic.ts` (Modify):**
   - Menghapus pemotongan kata `slotMaxWords` di `router.ts` dan `.slice(0, 1500)` di `reprocess-ignored-economic.ts`.
   - Menambahkan penjaga anti-duplikasi halaman pada loop paginasi di `pipeline.ts` dan `extract-url.post.ts`.
   - Meneruskan parameter ke-4 `context` (`title`, `publishedAtWita`, `sourcePortal`, `sourceType`, `articleInput`) secara lengkap ke `mapClassificationToPersistence`.

---

### Task 1: Domain-Learned Portal Blueprint Registry & Multi-Page Hydration JSON Extractor

**Files:**
- Create: `server/services/scraper/portal-profiles.ts`
- Modify: `server/services/scraper/extractor.ts:45-230,645-715,825-970`
- Test: `tests/portal-learned-extractor.test.ts`

**Interfaces:**
- Produces:
  - `PortalExtractionProfile` interface & ` matchPortalExtractionProfile(url?: string | null, hostname?: string | null): PortalExtractionProfile | null` in `server/services/scraper/portal-profiles.ts`
  - `findHydrationArticleBodyInScripts($: CheerioAPI): { text: string; isMultiPageHydrated: boolean } | null` in `server/services/scraper/extractor.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/portal-learned-extractor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { extractArticleContent } from '../server/services/scraper/extractor';
import { matchPortalExtractionProfile } from '../server/services/scraper/portal-profiles';

describe('Learned Portal Extraction Profiles & Multi-Page Hydration Extractor', () => {
  it('mencocokkan profil ekstraksi spesifik untuk 11 portal regional KTT', () => {
    const radar = matchPortalExtractionProfile('https://radartarakan.jawapos.com/tana-tidung/2611250027/jalan-protokol');
    expect(radar?.id).toBe('jawapos-network');
    expect(radar?.contentSelectors).toContain('div.konten div.artikel div.ui-text');

    const koran = matchPortalExtractionProfile('https://korankaltara.com/wabup-sabri-tutup-turnamen');
    expect(koran?.id).toBe('koran-kaltara');
    expect(koran?.contentSelectors).toContain('div.news-content.prose');

    const antara = matchPortalExtractionProfile('https://kaltara.antaranews.com/berita/513302/contoh');
    expect(antara?.id).toBe('antara-network');
  });

  it('mengekstrak seluruh halaman 1 & 2 dari JSON Hydration Jawa Pos (Radar Tarakan) dan membuang 100% teaser Artikel Terkait', () => {
    const radarHtml = `
      <!doctype html>
      <html>
        <head>
          <meta property="og:title" content="Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman - Radar Tarakan" />
          <link rel="canonical" href="https://radartarakan.jawapos.com/tana-tidung/2611250027/jalan-protokol-tana-tidung-akan-dihijaukan-pohon-peneduh-perda-sebagai-pengaman" />
        </head>
        <body>
          <main>
            <div class="konten">
              <div class="artikel">
                <div class="ui-r-my w-full min-w-0">
                  <div class="ui-text">
                    <div id="home-ad-rectangle1" data-ad-slot="rectangle1"><span>Advertisement</span></div>
                    <p><strong>TIDENG PALE</strong> – Pemerintah Kabupaten (Pemkab) Tana Tidung berencana memperluas program penghijauan di sepanjang jalan protokol untuk mewujudkan lingkungan yang lebih asri dan tertata.</p>
                  </div>
                  <div class="ui-text">
                    <p>Bupati Tana Tidung, Ibrahim Ali, mengusulkan agar pohon-pohon yang ditanam nantinya mendapat perlindungan melalui peraturan daerah (perda).</p>
                  </div>
                  <div class="ui-text">
                    <p>Menurut Ibrahim, sejumlah perusahaan telah membantu penyediaan tanaman untuk penghijauan, di antaranya MIP dan JOB Medco Pertamina.</p>
                  </div>
                  <div>
                    <button>1</button><button>2</button><button>Show All</button>
                  </div>
                </div>
              </div>
            </div>
            <hr class="my-8" />
            <div>
              <h3>Artikel Terkait</h3>
              <div class="ui-r-mb group">
                <div class="ui-r-display">
                  <div class="ui-r-fg">
                    <p>Pemerintah Kabupaten (Pemkab) Tana Tidung terus memperkuat komitmen dalam meningkatkan kualitas pendidikan anak usia dini (PAUD).</p>
                  </div>
                </div>
              </div>
              <div class="ui-r-mb group">
                <div class="ui-r-display">
                  <div class="ui-r-fg">
                    <p>Persoalan pengalihan aset lahan yang berkaitan dengan PT Inhutani hingga kini masih menjadi pekerjaan rumah Pemerintah Kabupaten (Pemkab) Ta</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <footer>
            <div class="ui-r-mb"><p>Halaman</p></div>
            <a href="/indeks-berita">Indeks Berita</a>
          </footer>
          <script type="application/json">
            ${JSON.stringify({
              component: 'news/IndexNews',
              props: {
                article: {
                  title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
                  timestamp: '2026-11-25T22:42:29+08:00',
                  content:
                    '<figure><figcaption>MONEV: Bupati Ibrahim Ali meninjau jalan. FOTO: SOPIAN/RADAR TARAKAN</figcaption></figure>' +
                    '<p><strong>TIDENG PALE</strong> – Pemerintah Kabupaten (Pemkab) Tana Tidung berencana memperluas program penghijauan di sepanjang jalan protokol untuk mewujudkan lingkungan yang lebih asri dan tertata.</p>' +
                    '<p>Bupati Tana Tidung, Ibrahim Ali, mengusulkan agar pohon-pohon yang ditanam nantinya mendapat perlindungan melalui peraturan daerah (perda).</p>' +
                    '<p>Menurut Ibrahim, sejumlah perusahaan telah membantu penyediaan tanaman untuk penghijauan, di antaranya MIP dan JOB Medco Pertamina.</p>' +
                    '<p class="page"></p>' +
                    '<p>Jenis tanaman yang disiapkan antara lain ketapang, trembesi, dan beberapa jenis pohon lainnya.</p>' +
                    '<p>“Dari mana sumber pembiayaan tadi kita sepakat, kita akan meminta kepada perusahaan-perusahaan melalui CSR-nya,” ungkapnya.</p>' +
                    '<p>Melalui program penghijauan tersebut, Pemkab Tana Tidung berharap jalan protokol menjadi kawasan yang lebih nyaman, teduh, dan indah bagi masyarakat.(*)</p>',
                  related: [
                    {
                      title: 'Bupati Ibrahim Ali Perkuat Sinergi Pengembangan PAUD',
                      description: 'Pemerintah Kabupaten (Pemkab) Tana Tidung terus memperkuat komitmen dalam meningkatkan kualitas pendidikan anak usia dini (PAUD).',
                    },
                  ],
                },
              },
            })}
          </script>
        </body>
      </html>
    `;

    const res = extractArticleContent(
      radarHtml,
      null,
      'https://radartarakan.jawapos.com/tana-tidung/2611250027/jalan-protokol-tana-tidung-akan-dihijaukan-pohon-peneduh-perda-sebagai-pengaman',
    );

    expect(res.isValidContent).toBe(true);
    // Wajib memuat paragraf halaman 1
    expect(res.snippetText).toContain('memperluas program penghijauan di sepanjang jalan protokol');
    expect(res.snippetText).toContain('MIP dan JOB Medco Pertamina');
    // Wajib memuat paragraf halaman 2 yang tersembunyi di balik <p class="page"></p>
    expect(res.snippetText).toContain('Jenis tanaman yang disiapkan antara lain ketapang, trembesi');
    expect(res.snippetText).toContain('meminta kepada perusahaan-perusahaan melalui CSR-nya');
    // DILARANG memuat cuplikan berita terkait (PAUD / Inhutani) maupun caption foto
    expect(res.snippetText).not.toContain('pendidikan anak usia dini (PAUD)');
    expect(res.snippetText).not.toContain('PT Inhutani');
    expect(res.snippetText).not.toContain('FOTO: SOPIAN/RADAR TARAKAN');
  });

  it('membersihkan tag HTML mentah dari JSON-LD articleBody (Fokus Borneo & Headlinews) serta membuang disclaimer AI Antara dan promo E-Paper Koran Kaltara', () => {
    const fokusHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Pembangunan Puspem Dikebut - Fokus Borneo</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "articleBody": "<strong>TANA TIDUNG, <a href=\\"https://fokusborneo.com/\\">Fokusborneo.com</a></strong> – Bupati Tana Tidung, Ibrahim Ali, melakukan monitoring dan evaluasi pembangunan kawasan Pusat Pemerintahan Kabupaten Tana Tidung.\\n\\nSelain pembangunan gedung, pemerintah daerah menyiapkan peningkatan jalan protokol dengan skema multiyears senilai Rp 45 miliar. Baca juga: Kantor Biro Antara di Kaltara Diresmikan di Bulungan\\n\\nDilarang keras mengambil konten, melakukan crawling atau pengindeksan otomatis untuk AI di situs web ini tanpa izin tertulis dari Kantor Berita ANTARA.\\n\\nE-Paper Koran Kaltara\\n\\nBaca koran digital kapan saja, di mana saja.\\n\\nThe post Pembangunan Puspem Dikebut first appeared on Benuanta."
            }
          </script>
        </head>
        <body><article><p>Fallback</p></article></body>
      </html>
    `;

    const res = extractArticleContent(
      fokusHtml,
      null,
      'https://fokusborneo.com/daerah/2026/11/25/pembangunan-puspem-dikebut',
    );

    expect(res.isValidContent).toBe(true);
    expect(res.snippetText).not.toContain('<strong>');
    expect(res.snippetText).not.toContain('<a href');
    expect(res.snippetText).not.toContain('Kantor Biro Antara di Kaltara Diresmikan');
    expect(res.snippetText).not.toContain('Dilarang keras mengambil konten');
    expect(res.snippetText).not.toContain('E-Paper Koran Kaltara');
    expect(res.snippetText).not.toContain('Baca koran digital kapan saja');
    expect(res.snippetText).not.toContain('first appeared on');
    expect(res.snippetText).toContain('skema multiyears senilai Rp 45 miliar.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/portal-learned-extractor.test.ts`
Expected: FAIL (`Cannot find module '../server/services/scraper/portal-profiles'`).

- [ ] **Step 3: Create `server/services/scraper/portal-profiles.ts` and enhance `server/services/scraper/extractor.ts`**

Create `server/services/scraper/portal-profiles.ts`:
```typescript
// server/services/scraper/portal-profiles.ts

export interface PortalExtractionProfile {
  id: string;
  hostPatterns: ReadonlyArray<RegExp>;
  /** Selector kontainer isi berita spesifik dari yang paling presisi */
  contentSelectors: ReadonlyArray<string>;
  /** Selector elemen di dalam/sekitar kontainer yang wajib dibuang sebelum ekstraksi paragraf */
  removeSelectors: ReadonlyArray<string>;
}

export const PORTAL_EXTRACTION_PROFILES: ReadonlyArray<PortalExtractionProfile> = [
  {
    id: 'jawapos-network',
    hostPatterns: [/(?:^|\.)jawapos\.com$/i],
    contentSelectors: [
      'div.konten div.artikel div.ui-r-my',
      'div.konten div.artikel',
      'div.konten',
      '.read__content',
    ],
    removeSelectors: [
      '[data-ad-slot]',
      '[id^="home-ad-"]',
      'figure',
      'figcaption',
      '.artikel-lead',
      '.ui-r-mb.group',
      'button',
      '.tagging',
    ],
  },
  {
    id: 'tribun-network',
    hostPatterns: [/(?:^|\.)tribunnews\.com$/i],
    contentSelectors: [
      'div.side-article.txt-article.multi-fontsize',
      'div.side-article.txt-article',
      '.txt-article',
    ],
    removeSelectors: [
      '.baca-juga',
      '.bacajuga',
      '.tribcomment-form',
      '.tribcomment-overlay',
      '.separator.apps',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'koran-kaltara',
    hostPatterns: [/(?:^|\.)korankaltara\.com$/i],
    contentSelectors: [
      'div.news-content.prose',
      '.news-content',
    ],
    removeSelectors: [
      'figure',
      'figcaption',
      '.share-buttons',
    ],
  },
  {
    id: 'benuanta',
    hostPatterns: [/(?:^|\.)benuanta\.co\.id$/i],
    contentSelectors: [
      'div.entry-content.entry-content-single',
      'div.entry-content',
    ],
    removeSelectors: [
      '.jeg_post_tags',
      '.jeg_share_button',
      '.related-posts',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'antara-network',
    hostPatterns: [/(?:^|\.)antaranews\.com$/i],
    contentSelectors: [
      'div.wrap__article-detail-content.post-content',
      'div.post-content',
      '.wrap__article-detail-content',
    ],
    removeSelectors: [
      '.baca-juga',
      '.tags',
      '.share-wrapper',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'jnews-regional',
    hostPatterns: [/(?:^|\.)(?:fokusborneo\.com|focusborneo\.com|headlinews\.id)$/i],
    contentSelectors: [
      'div.entry-content div.content-inner',
      'div.content-inner',
      'div.entry-content.no-share',
    ],
    removeSelectors: [
      '.jeg_featured',
      '.jeg_post_tags',
      '.jeg_share_button',
      '.jeg_ad',
      '.jeg_postblock',
      '.footer_widget',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'niaga-asia',
    hostPatterns: [/(?:^|\.)niaga\.asia$/i],
    contentSelectors: [
      'article.post div.entry-content',
      'div.entry-content',
    ],
    removeSelectors: [
      '.sharedaddy',
      '.jp-relatedposts',
      '.post-tags',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'metrokaltara',
    hostPatterns: [/(?:^|\.)metrokaltara\.com$/i],
    contentSelectors: [
      'div.inner-post-entry.entry-content',
      'div.post-entry',
    ],
    removeSelectors: [
      '.post-comments',
      '.comment-form',
      '.penci-single-link-pages',
      '.penci-post-box-meta',
      '.theiaStickySidebar .widget',
      '.footer-widget-wrapper',
      'figure',
      'figcaption',
    ],
  },
  {
    id: 'rri-portal',
    hostPatterns: [/(?:^|\.)rri\.co\.id$/i],
    contentSelectors: [
      'div.post_details_block',
      '.details_block3',
    ],
    removeSelectors: [
      'figure',
      'figcaption',
      '.share-box',
    ],
  },
  {
    id: 'national-major-portals',
    hostPatterns: [
      /(?:^|\.)(?:detik\.com|kompas\.com|cnbcindonesia\.com|cnnindonesia\.com|kontan\.co\.id|bisnis\.com|tempo\.co|sindonews\.com|republika\.co\.id|mediaindonesia\.com|liputan6\.com|okezone\.com|kumparan\.com|suara\.com|idntimes\.com|katadata\.co\.id|bloombergtechnoz\.com|investor\.id|wartaekonomi\.co\.id|infosawit\.com)$/i,
    ],
    contentSelectors: [
      '.detail__body-text',
      '.read__content',
      '.txt-detail',
      '.detail-konten',
      '.article-content-body__item-content',
      '.read__article',
      '.detail-text',
      '.article__content',
      'div[itemprop="articleBody"]',
      '.entry-content',
      '.post-content',
    ],
    removeSelectors: [
      '.detail__body-tag',
      '.paradetail',
      '.sisip_embed_sosmed',
      '.linksisip',
      '.baca-juga',
      '.bacajuga',
      '.inner-link-baca-juga',
      '.comp-baca-juga',
      '.box-terkait',
      '.artikel-terkait',
      '.berita-terkait',
      '[data-ad-slot]',
      'figure',
      'figcaption',
    ],
  },
];

export function matchPortalExtractionProfile(
  rawUrl?: string | null,
  explicitHostname?: string | null,
): PortalExtractionProfile | null {
  let host = (explicitHostname ?? '').trim().toLowerCase();
  if (!host && rawUrl) {
    try {
      host = new URL(rawUrl).hostname.toLowerCase();
    } catch {
      host = '';
    }
  }
  if (!host) return null;
  const cleanHost = host.replace(/^www\./, '');

  for (const profile of PORTAL_EXTRACTION_PROFILES) {
    if (profile.hostPatterns.some((re) => re.test(cleanHost) || re.test(host))) {
      return profile;
    }
  }
  return null;
}
```

Update `server/services/scraper/extractor.ts` to:
1. Import `matchPortalExtractionProfile` from `./portal-profiles`.
2. Add `stripInlineAndHtmlNoise(rawParagraph: string)` that:
   - Strips residual HTML tags if any (`<[^>]+>`) and decodes `&nbsp;`.
   - Removes inline `"Baca juga: ..."` or `"Simak juga: ..."` trailed at the end/middle of a paragraph (`/\s+(?:baca|simak|lihat)\s+juga\s*:\s*[^\n]+$/i`).
   - Removes trailing editor/reporter markers like `\(\*+\)$` or `\([a-z0-9/]{2,10}\)$`.
3. Add patterns to `NOISE_PARAGRAPH_PATTERNS`:
   - `/^dilarang\s+keras\s+mengambil\s+konten.*\bantara\b/i`
   - `/^e-?paper\s+koran\s+kaltara$/i`
   - `/^baca\s+koran\s+digital\s+kapan\s+saja/i`
   - `/^the\s+post\s+.*\s+first\s+appeared\s+on\s+/i`
   - `/^jadilah\s+pembaca\s+setia,\s+gabung\s+sekarang\s+juga/i`
   - `/^sertifikat\s+nomor\s+\d+\/dp-terverifikasi/i`
   - `/^isi\s+komentar\s+sepenuhnya\s+adalah\s+tanggung\s+jawab/i`
   - `/^situs\s+ini\s+menggunakan\s+akismet\s+untuk\s+mengurangi\s+spam/i`
   - `/^download\s+tribunx\s+untuk/i`
   - `/^(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)\s*,\s*\d{1,2}\s+[a-z]+\s+\d{4}(?:\s*[|-]\s*\d{1,2}[:.]\d{2}\s*(?:wib|wita|wit)?)?$/i`
   - `/^.*\(\s*(?:ist|dok\.?\s*[^)]*|foto\s*:[^)]*)\s*\)$/i` (when paragraph is a standalone photo credit caption under 35 words without quotes).
4. Add `findHydrationArticleBodyInScripts($: CheerioAPI)`:
   - Checks `<script type="application/json">`, `<script id="__NEXT_DATA__">`, and `[data-page]` attributes.
   - Extracts `props.article.content` (Jawa Pos Group / Radar Tarakan / Kaltim Post) or `props.pageProps.article.content` / `body`.
   - Parses that HTML fragment with Cheerio, removes `figure, figcaption, script, style, .baca-juga, [data-ad-slot]`, converts `<p class="page">` into paragraph boundaries, and extracts clean `<p>` texts.
5. Upgrade `findArticleBodyInJsonLd($: CheerioAPI)` so that if `record.articleBody` contains HTML tags (`<p>`, `<strong>`, `<a ...>`), it parses via Cheerio to strip tags cleanly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/portal-learned-extractor.test.ts`
Expected: PASS (all 3 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add server/services/scraper/portal-profiles.ts server/services/scraper/extractor.ts tests/portal-learned-extractor.test.ts
git commit -m "feat(scraper): add learned portal DOM profiles and multi-page hydration JSON extractor"
```

---

### Task 2: 5-Layer National Cheerio Engine (Post-Content Guillotine, Leaf Specificity, & Anti-Loop Pagination)

**Files:**
- Modify: `server/services/scraper/extractor.ts:760-970`
- Modify: `server/services/scraper/pipeline.ts:792-853`
- Modify: `server/api/admin/articles/extract-url.post.ts:69-108`
- Test: `tests/national-cheerio-5layer.test.ts`

**Interfaces:**
- Produces:
  - `prunePostArticleBoundary($: CheerioAPI, root: Cheerio<any>): void`
  - `isTruncatedRelatedTeaserParagraph(text: string, isInsideLinkOrCard: boolean): boolean`
  - Updated `extractNextFullPageUrl($: CheerioAPI, baseUrl?: string | null, canonicalUrl?: string | null): string | null` that ignores links inside `footer, nav, aside, .related, .terkait` and detects pagination accurately.

- [ ] **Step 1: Write the failing test**

Create `tests/national-cheerio-5layer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { extractArticleContent } from '../server/services/scraper/extractor';

describe('5-Layer National Cheerio Extraction Engine', () => {
  it('Layer 2 & 3: mencegah <main> mengalahkan kontainer spesifik dan memenggal seluruh elemen setelah heading Artikel Terkait / Berita Terkini', () => {
    const html = `
      <!doctype html>
      <html>
        <head><title>Ekspor CPO Kalimantan Utara Tumbuh Positif</title></head>
        <body>
          <main>
            <div class="detail__body-text">
              <p>TANJUNG SELOR - Volume ekspor Crude Palm Oil (CPO) dari wilayah Kalimantan Utara termasuk pasokan kebun kelapa sawit Kabupaten Tana Tidung mengalami kenaikan 14 persen pada triwulan keempat tahun ini.</p>
              <p>Peningkatan permintaan pasar ekspor didorong oleh membaiknya harga komoditas minyak nabati global serta kelancaran distribusi tongkang di alur Sungai Sesayap menuju pelabuhan muat.</p>
              <h3>Artikel Terkait</h3>
              <div class="card-related">
                <p>Pemkab Tana Tidung terus memperkuat komitmen dalam meningkatkan kualitas pendidikan anak usia dini (PAUD) bersama bunda PAUD desa.</p>
                <p>Persoalan pengalihan aset lahan yang berkaitan dengan PT Inhutani hingga kini masih menjadi pekerjaan rumah Pemerintah Kabupaten (Pemkab) Ta</p>
              </div>
            </div>
            <section class="berita-terkini">
              <h3>Berita Terkini</h3>
              <p>Jadwal pertandingan timnas sepak bola Indonesia pekan depan di stadion utama bersama pendukung.</p>
              <p>Ramalan cuaca hari ini di wilayah pesisir pulau Kalimantan diperkirakan cerah berawan sepanjang hari.</p>
              <p>Daftar harga tiket pesawat rute domestik menjelang libur akhir tahun di bandara nasional.</p>
            </section>
          </main>
        </body>
      </html>
    `;

    const res = extractArticleContent(html, null, 'https://ekonomi.bisnis.com/read/20261125/ekspor-cpo-kaltara');
    expect(res.isValidContent).toBe(true);
    expect(res.snippetText).toContain('Volume ekspor Crude Palm Oil (CPO)');
    expect(res.snippetText).toContain('alur Sungai Sesayap');
    expect(res.snippetText).not.toContain('pendidikan anak usia dini (PAUD)');
    expect(res.snippetText).not.toContain('PT Inhutani');
    expect(res.snippetText).not.toContain('timnas sepak bola');
    expect(res.snippetText).not.toContain('Ramalan cuaca');
  });

  it('Layer 5: tidak terjebak link "Halaman" di footer dan membedakan berita 1 halaman vs berita dengan link paginasi asli di body', () => {
    const singlePageHtml = `
      <!doctype html>
      <html>
        <head><title>Berita Satu Halaman Utuh</title></head>
        <body>
          <article>
            <div class="entry-content">
              <p>Pemerintah Kabupaten Tana Tidung menyalurkan bantuan benih padi unggul kepada kelompok tani di Kecamatan Betayau dan Kecamatan Tana Lia guna memperluas luas tanam sawah lokal.</p>
              <p>Kepala Dinas Pertanian menyampaikan bahwa program cetak sawah dan distribusi pupuk bersubsidi ini ditargetkan meningkatkan produksi beras daerah hingga 20 persen pada musim panen mendatang.</p>
            </div>
          </article>
          <footer>
            <p>Halaman</p>
            <a href="https://example.com/berita-satu-halaman?page=2">Selanjutnya</a>
          </footer>
        </body>
      </html>
    `;

    const singleRes = extractArticleContent(singlePageHtml, null, 'https://example.com/berita-satu-halaman');
    expect(singleRes.nextFullPageUrl).toBeNull();

    const multiPageHtml = `
      <!doctype html>
      <html>
        <head><title>Berita Multi Halaman</title></head>
        <body>
          <article>
            <div class="entry-content">
              <p>Pemerintah Kabupaten Tana Tidung menyalurkan bantuan benih padi unggul kepada kelompok tani di Kecamatan Betayau dan Kecamatan Tana Lia guna memperluas luas tanam sawah lokal.</p>
              <p>Kepala Dinas Pertanian menyampaikan bahwa program cetak sawah dan distribusi pupuk bersubsidi ini ditargetkan meningkatkan produksi beras daerah hingga 20 persen pada musim panen mendatang.</p>
              <div class="pagination">
                <a href="https://example.com/berita-multi-halaman?page=all">Tampilkan Semua</a>
              </div>
            </div>
          </article>
        </body>
      </html>
    `;

    const multiRes = extractArticleContent(multiPageHtml, null, 'https://example.com/berita-multi-halaman');
    expect(multiRes.nextFullPageUrl).toBe('https://example.com/berita-multi-halaman?page=all');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/national-cheerio-5layer.test.ts`
Expected: FAIL (Artikel Terkait and footer pagination link still leak).

- [ ] **Step 3: Implement 5-Layer National Cheerio Engine & Pagination Safeguards**

In `server/services/scraper/extractor.ts`:
1. Update `extractNextFullPageUrl`:
   - Clone or ignore anchors inside `footer, nav, aside, header, .footer, .sidebar, .related, .related-posts, .berita-terkait`.
   - When `findHydrationArticleBodyInScripts` or `findTribunRawTextInScripts` already extracted a complete multi-page body (`isMultiPageHydrated === true`), set `nextFullPageUrl = null` so the pipeline does not waste HTTP requests fetching `?page=2`.
2. Implement `prunePostArticleBoundary($: CheerioAPI, container: Cheerio<any>)`:
   - Scans headings (`h1, h2, h3, h4, h5, h6, strong, b, .title, .widget-title, .section-title`) and `<hr>` inside `container`.
   - When a heading matches `/^(?:artikel\s+terkait|berita\s+terkait|baca\s+juga|berita\s+terkini|berita\s+lainnya|pilihan\s+redaksi|pilihan\s+editor|rekomendasi(?:\s+untuk\s+anda)?|terpopuler|populer|komentar|topik\s+terkait|tag\s+terkait)$/i`, remove that heading/wrapper and all following siblings (`nextAll().remove()`).
3. Implement Leaf-Container Specificity Scoring:
   - Separate `SPECIFIC_CONTENT_SELECTORS` (all class/attribute selectors like `.detail__body-text`, `.read__content`, `.entry-content`, `.post-content`, `.news-content`, `.konten`, `[itemprop="articleBody"]`) from generic wrapper tags (`article`, `main`).
   - Only fall back to `article` or `main` if no `SPECIFIC_CONTENT_SELECTORS` matched `>= EXTRACTOR_MIN_VALID_WORDS` (`30` words).
   - Disqualify any `<p>` whose ancestor (up to `container`) has class matching `/\b(?:related|terkait|terkini|populer|trending|komentar|comment|footer|sidebar|widget|banner|iklan|ads|group|ui-card|card-related)\b/i` or whose text ends mid-word without terminal punctuation (`.!?'"”’`) while preceded by sibling card links.
4. In `server/services/scraper/pipeline.ts` and `server/api/admin/articles/extract-url.post.ts`:
   - Inside the `while (currentPageUrl ...)` pagination loop, compare `fullExtracted.snippetText.trim()` with `extracted.snippetText.trim()`. If `fullExtracted.snippetText.trim() === extracted.snippetText.trim()` or `extracted.snippetText.includes(fullExtracted.snippetText.trim())`, break immediately instead of duplicating page 1 text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/national-cheerio-5layer.test.ts tests/extractor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add server/services/scraper/extractor.ts server/services/scraper/pipeline.ts server/api/admin/articles/extract-url.post.ts tests/national-cheerio-5layer.test.ts
git commit -m "feat(scraper): implement 5-layer Cheerio boundary guillotine and anti-duplicate pagination guard"
```

---

### Task 3: Full-Text Preservation (Zero Word Truncation) & Proposal/Planned Economic Activity Recognition

**Files:**
- Modify: `server/services/llm/classifier.ts:24-78,166-250,980-1035`
- Modify: `server/services/llm/router.ts:1080-1105`
- Modify: `server/db/reprocess-ignored-economic.ts:170-180,208-216`
- Modify: `server/services/scraper/pipeline.ts:1215-1225`
- Modify: `server/api/admin/articles/[id]/reclassify.post.ts:75-85`
- Test: `tests/fulltext-and-proposal-phenomena.test.ts`

**Interfaces:**
- Updates:
  - `COMPRESS_MAX_WORDS_FOR_LLM = 25_000` and `COMPRESS_MAX_CHARS_FOR_LLM = 180_000` in `server/services/llm/classifier.ts` (so default calls preserve 100% of clean article text, while explicit `compressArticleTextForLlm(text, 60)` calls in unit tests still honor explicit `maxWords`).
  - `MultiLlmRouter.classifyArticle` in `server/services/llm/router.ts` passes the full `basePrompt` without artificial `750` or `1400` word truncation.

- [ ] **Step 1: Write the failing test**

Create `tests/fulltext-and-proposal-phenomena.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  buildClassificationPrompt,
  calibrateClassificationConfidence,
  COMPRESS_MAX_WORDS_FOR_LLM,
  enrichClassificationLinkages,
  SIPENA_SYSTEM_INSTRUCTION_FULL,
} from '../server/services/llm/classifier';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Full-Text Preservation & Proposal/Planned Economic Phenomenon Support', () => {
  it('tidak memotong teks berita asli yang panjang pada buildClassificationPrompt', () => {
    expect(COMPRESS_MAX_WORDS_FOR_LLM).toBeGreaterThanOrEqual(25_000);

    const paragraphs = Array.from(
      { length: 25 },
      (_, i) =>
        `Paragraf ke-${i + 1} menjelaskan progres penataan jalan protokol dan dukungan CSR pohon peneduh di Tideng Pale Kabupaten Tana Tidung secara lengkap.`,
    );
    const fullText = paragraphs.join('\n\n');

    const prompt = buildClassificationPrompt({
      title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
      sourcePortal: 'radartarakan.jawapos.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T22:42:29+08:00',
      defaultQuarter: 4,
      defaultYear: 2026,
      snippetText: fullText,
    });

    expect(prompt).toContain('Paragraf ke-1 ');
    expect(prompt).toContain('Paragraf ke-15 ');
    expect(prompt).toContain('Paragraf ke-25 ');
  });

  it('menginstruksikan penerimaan berita usulan/rencana pembangunan, CSR, dan Perda ekonomi di System Prompt serta tidak memberi penalti confidence pada berita lokal KTT', () => {
    expect(SIPENA_SYSTEM_INSTRUCTION_FULL).toMatch(/usulan|rencana|wacana|csr|perda/i);

    const proposalClassification: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Pemkab Tana Tidung merencanakan perluasan penghijauan jalan protokol di Tideng Pale dengan dukungan CSR PT MIP dan JOB Medco Pertamina serta mengusulkan Perda perlindungan tanaman.',
      kbli_category: KbliCategoryEnum.F,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PMTB,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: KbliCategoryEnum.P,
      secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
      secondary_expenditure_component: ExpenditureComponentEnum.PK_P,
      secondary_expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      quarter: 4,
      year: 2026,
      confidence: 0.85,
    };

    const calibrated = calibrateClassificationConfidence(0.85, proposalClassification, {
      title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
      sourcePortal: 'radartarakan.jawapos.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T22:42:29+08:00',
      defaultQuarter: 4,
      defaultYear: 2026,
      snippetText:
        'Pemkab Tana Tidung berencana memperluas program penghijauan di sepanjang jalan protokol bersama DPRD dan Dinas PUPRPKP pada Rabu (25/11) dengan dukungan CSR MIP dan JOB Medco Pertamina.',
    });

    expect(calibrated).toBeGreaterThanOrEqual(0.8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fulltext-and-proposal-phenomena.test.ts`
Expected: FAIL (`COMPRESS_MAX_WORDS_FOR_LLM` is 3500 instead of 25000).

- [ ] **Step 3: Remove Word Truncation and Update Proposal/Planned Activity Rules**

1. In `server/services/llm/classifier.ts`:
   - Set `export const COMPRESS_MAX_WORDS_FOR_LLM = 25_000;` and `export const COMPRESS_MAX_CHARS_FOR_LLM = 180_000;`.
   - In `compressArticleTextForLlm(rawText, maxWords = COMPRESS_MAX_WORDS_FOR_LLM, maxChars = COMPRESS_MAX_CHARS_FOR_LLM)`:
     - Check total words and chars of `rawText` **first**: if `totalWords <= maxWords && rawText.length <= maxChars`, return the cleaned multi-paragraph text directly without dropping any paragraphs via `extractSalientEconomicParagraphs`! Only run `extractSalientEconomicParagraphs` when `totalWords > maxWords || rawText.length > maxChars`.
   - In `SIPENA_SYSTEM_INSTRUCTION_FULL` and `SIPENA_SYSTEM_INSTRUCTION_COMPACT`:
     - Under `TIPOLOGI 4 - Kebijakan Fiskal, DAK, Proyek Fisik Pemda, CSR, & Usulan/Rencana Program Ekonomi`, explicitly state:
       > *"Berita yang masih berupa USULAN, RENCANA PROGRAM, WACANA PEMBANGUNAN, MoU, MONEV LAPANGAN, PENATAAN KAWASAN/PENGHIJAUAN JALAN PROTOKOL, DUKUNGAN CSR PERUSAHAAN (mis. PT MIP, JOB Medco Pertamina), maupun USULAN PERDA/REGULASI EKONOMI di Kab. Tana Tidung WAJIB diklasifikasikan sebagai `is_economic_phenomenon = true` karena memberikan gambaran/sinyal awal aktivitas ekonomi yang akan terjadi."*
     - Add rule for Noise-Aware Reading:
       > *"ATURAN FILTER KEBISINGAN TEKS: Fokuskan analisis HANYA pada paragraf yang koheren dengan JUDUL BERITA. Abaikan kalimat di akhir teks apabila tampak sebagai sisipan judul/cuplikan berita lain yang tidak berhubungan dengan judul utama."*
   - In `calibrateClassificationConfidence`:
     - Fix `hasQuantitativeData` regex so date numbers like `(25/11)` or year `2026` do not falsely count as economic quantities: require explicit economic units or currency (`/(?:\b(?:rp|rupiah)\s*\d|\b\d+(?:[.,]\d+)?\s*(?:persen|%|miliar|juta|triliun|ribu|ton|kg|kilogram|hektare|ha|sak|liter|unit|paket|mw|kv|kubik|batang|pohon|kamar)\b)/i`).
     - Only apply the `-0.15` discourse penalty when `classification.geographic_scope !== 'KTT_LOCAL'` (so macro rumors without numbers are calibrated down as tested in `tests/confidence-calibration.test.ts`, while local KTT proposals/plans maintain high confidence `>= 0.80`).
2. In `server/services/llm/router.ts`:
   - Remove the `750` / `1400` word limit override (`slotMaxWords` / `slotMaxChars`) so `slotBasePrompt` always uses the full `basePrompt`.
3. In `server/db/reprocess-ignored-economic.ts`:
   - Change `updatedSnippet = textForClassification.slice(0, 1500)` to `updatedSnippet = textForClassification` (no truncation).
4. Pass full `context` object (`{ publishedAtWita, title, sourcePortal, sourceType, articleInput }`) to `mapClassificationToPersistence` in `server/services/scraper/pipeline.ts`, `server/api/admin/articles/[id]/reclassify.post.ts`, and `server/db/reprocess-ignored-economic.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/fulltext-and-proposal-phenomena.test.ts tests/salient-extractor.test.ts tests/confidence-calibration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add server/services/llm/classifier.ts server/services/llm/router.ts server/db/reprocess-ignored-economic.ts server/services/scraper/pipeline.ts "server/api/admin/articles/[id]/reclassify.post.ts" tests/fulltext-and-proposal-phenomena.test.ts
git commit -m "feat(llm): preserve full article text without truncation and support planned/proposal economic phenomena"
```

---

### Task 4: Fix the 6 PDRB Classification Guardrail Gaps (KBLI 2025, Expenditure SNA 2008, & Impact Axes)

**Files:**
- Modify: `server/services/llm/classifier.ts:365-385,555-963`
- Test: `tests/llm-pdrb-guardrails-audit.test.ts`

**Interfaces:**
- Refines `enrichClassificationLinkages(classification: LlmClassificationOutput, snippetText?: string | null): LlmClassificationOutput` and `PDRB_PHENOMENON_RESCUE_KEYWORDS_RE` in `server/services/llm/classifier.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/llm-pdrb-guardrails-audit.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  enrichClassificationLinkages,
  shouldRunPhenomenonRescuePass,
} from '../server/services/llm/classifier';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Audit & Perfection of LLM PDRB Classification Guardrails (KBLI 2025 & SNA 2008)', () => {
  it('Celah 1: tidak salah mengubah berita "perusahaan melanggar aturan lingkungan/tambang" menjadi PK_RT (THR/UMK)', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Dinas Lingkungan Hidup Kabupaten Tana Tidung menegur perusahaan melanggar batas konsesi lahan tambang batubara di Sesayap Hilir.',
      kbli_category: KbliCategoryEnum.B,
      kbli_impact: KbliImpactEnum.DECREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
      expenditure_impact: ExpenditureImpactEnum.DECREASE_REAL,
      secondary_kbli_category: KbliCategoryEnum.P,
      secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.88,
    };

    const enriched = enrichClassificationLinkages(
      raw,
      'Dinas Lingkungan Hidup menegur perusahaan melanggar aturan izin lingkungan tambang batubara',
    );
    // Wajib tetap NET_EXPORT (DECREASE_REAL), BUKAN diubah menjadi PK_RT (INCREASE_REAL)!
    expect(enriched.expenditure_component).toBe(ExpenditureComponentEnum.NET_EXPORT);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.DECREASE_REAL);
  });

  it('Celah 2: GUARDRAIL 8 tidak menimpa lonjakan volume produksi/ekspor riil menjadi INCREASE_PRICE hanya karena teks menyebut kata harga', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Volume produksi dan pengapalan ekspor CPO serta TBS sawit dari Sesayap Hilir meningkat 15 persen seiring kenaikan harga sawit global.',
      kbli_category: KbliCategoryEnum.A,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.92,
    };

    const enriched = enrichClassificationLinkages(
      raw,
      'Volume produksi dan pengapalan ekspor TBS sawit naik 15 persen di tengah kenaikan harga sawit',
    );
    expect(enriched.kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.INCREASE_REAL);
  });

  it('Celah 3: memetakan proyek infrastruktur ketenagalistrikan SUTT 150 kV / Gardu Induk PLN ke F (sekunder D) dan PMTB', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'GM PLN UIP KLT meninjau progres pembangunan jaringan transmisi SUTT 150 kV Tideng Pale-Malinau dan Gardu Induk GI Tideng Pale.',
      kbli_category: KbliCategoryEnum.P, // Keliru: harusnya F (Konstruksi) atau D (Ketenagalistrikan)
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PK_P, // Keliru: harusnya PMTB
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(
      raw,
      'Pembangunan Saluran Udara Tegangan Tinggi SUTT 150 kV dan Gardu Induk GI Tideng Pale oleh PLN',
    );
    expect(enriched.kbli_category).toBe(KbliCategoryEnum.F);
    expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.D);
    expect(enriched.expenditure_component).toBe(ExpenditureComponentEnum.PMTB);
  });

  it('Celah 4: memetakan usulan penghijauan jalan protokol & dukungan CSR pohon peneduh + Perda dengan keterkaitan sektoral yang tepat', () => {
    const article = {
      title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
      sourcePortal: 'radartarakan.jawapos.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T22:42:29+08:00',
      defaultQuarter: 4 as const,
      defaultYear: 2026,
      snippetText:
        'Pemkab Tana Tidung berencana memperluas program penghijauan di sepanjang jalur pedestrian jalan protokol bersama Dinas PUPRPKP dan DPRD dengan dukungan CSR tanaman dari PT MIP dan JOB Medco Pertamina serta menyusun Perda perlindungan.',
    };

    const wronglyRejected: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: false,
      rejection_reason: 'Masih berupa rencana penghijauan dan usulan perda.',
      summary: 'Pemkab Tana Tidung mengusulkan penghijauan jalan protokol dan perda pengaman.',
      kbli_category: null,
      kbli_impact: null,
      expenditure_component: null,
      expenditure_impact: null,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.7,
    };

    // Rescue pass wajib terpancing untuk berita jalan protokol / perda / csr / pedestrian
    expect(shouldRunPhenomenonRescuePass(wronglyRejected, article)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/llm-pdrb-guardrails-audit.test.ts`
Expected: FAIL (Celah 1 turns `NET_EXPORT` into `PK_RT`, Celah 2 turns `INCREASE_NTB` into `INCREASE_PRICE`, Celah 3 stays `P`/`PK_P`, Celah 4 rescue regex misses `jalan protokol`/`csr`/`perda`).

- [ ] **Step 3: Implement the 6 Guardrail Fixes in `server/services/llm/classifier.ts`**

1. Expand `PDRB_PHENOMENON_RESCUE_KEYWORDS_RE` to include:
   `jalan protokol|pedestrian|penghijauan|csr|perda|sutt|gardu induk|pln|tambak|udang|bandeng|nelayan|inhutani|lahan hti|mou|multiyears|irigasi|cetak sawah|umkm|koperasi|pajak daerah|retribusi`
2. Fix `GUARDRAIL 3` (baris 562):
   Replace `perusahaan melanggar` with `(?:posko\s+pengaduan\s+thr|thr\s+dan\s+bhr|pembayaran\s+thr|perusahaan\s+melanggar\s+(?:aturan\s+)?(?:thr|umk|upah))` so environmental or mining violations are never misclassified as `PK_RT` THR!
3. Refine `GUARDRAIL 8` (*Decision Matrix BPS: Price Shock vs Real Volume Shock*):
   Exclude texts that explicitly describe real volume/output/supply/export changes (`/\b(?:pembangunan\s+fisik|panen\s+raya|gagal\s+panen|banjir\s+rendam|penambahan\s+armada|buka\s+rute|lelang\s+tender|kontrak\s+kerja|volume\s+(?:produksi|ekspor|pengapalan|panen|distribusi)|produksi\s+(?:meningkat|naik|turun|merosot|melonjak)|pengapalan\s+(?:meningkat|melonjak|naik|turun)|ekspor\s+(?:meningkat|melonjak|naik|turun|tumbuh))\b/i`).
4. Add Guardrail for Electrical Grid & Power Infrastructure (`SUTT 150 kV`, `Gardu Induk`, `GI Tideng Pale`, `PLTD`, `PLTS`, `transmisi listrik`):
   - When text describes physical construction (`pembangunan`, `proyek`, `konstruksi`, `peninjauan pembangunan`) of `sutt|saluran udara tegangan tinggi|gardu induk|\bgi\s+tideng\s+pale|jaringan\s+transmisi\s+listrik|plts|pltd`:
     - If `priKbli === 'P'` or `priKbli === 'D'`, set `priKbli = KbliCategoryEnum.F`, `secKbli = KbliCategoryEnum.D`, `secKbliImpact = priKbliImpact`, and `priExp = ExpenditureComponentEnum.PMTB`.
5. Add Guardrail for Urban Corridor / Road Beautification / Pedestrian & Corporate CSR Infrastructure (`jalan protokol`, `jalur pedestrian`, `penghijauan`, `pohon peneduh`, `csr`):
   - Ensure `secondary_kbli_category` links `F` (Konstruksi/Penataan Jalan) <-> `P` (Administrasi Pemerintahan/Perda) or `A` (Pengadaan Tanaman/Bibit).
6. Move `GUARDRAIL 10` (*Konsistensi Lintas-Sumbu Dampak*) to the very end of `enrichClassificationLinkages` (right before the symmetrical duplicate check and `return`), so all sector/expenditure changes made by earlier guardrails are guaranteed to have consistent impact axes.

- [ ] **Step 4: Run full test suite to verify all tests pass**

Run: `npx vitest run`
Expected: PASS across all test files.

- [ ] **Step 5: Commit changes**

```bash
git add server/services/llm/classifier.ts tests/llm-pdrb-guardrails-audit.test.ts
git commit -m "fix(llm): close 6 PDRB KBLI 2025 and SNA 2008 guardrail classification gaps"
```

---

### Task 5: End-to-End Live Verification on Target Article & Typecheck Gate

**Files:**
- Modify: `docs/superpowers/plans/2026-11-26-scraper-dom-and-llm-engine-perfection.md`

- [ ] **Step 1: Run TypeScript compiler check and full Vitest suite**

Run:
```bash
npx vue-tsc --noEmit && npx vitest run
```
Expected: `0 errors` from `vue-tsc` and `100% PASS` from `vitest`.

- [ ] **Step 2: Run live verification on "Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman" and active regional portals**

Run:
```bash
npx tsx -e "import { safeFetchText } from './server/utils/ssrf'; import { extractArticleContent } from './server/services/scraper/extractor'; async function main() { const url = 'https://radartarakan.jawapos.com/tana-tidung/2611250027/jalan-protokol-tana-tidung-akan-dihijaukan-pohon-peneduh-perda-sebagai-pengaman'; const res = await safeFetchText(url, { timeoutMs: 12000 }); const ext = extractArticleContent(res.body, null, res.finalUrl); console.log(JSON.stringify(ext, null, 2)); } main();"
```
Expected:
- `snippetText` contains all 14 paragraphs across Page 1 and Page 2 (starting from `TIDENG PALE – Pemerintah Kabupaten (Pemkab) Tana Tidung berencana memperluas program penghijauan...` through `Jenis tanaman yang disiapkan antara lain ketapang, trembesi...` down to `...menjadi kawasan yang lebih nyaman, teduh, dan indah bagi masyarakat.`).
- `snippetText` contains **zero** unrelated teaser paragraphs (`PAUD` or `PT Inhutani`) and **zero** ad labels (`Advertisement`).
