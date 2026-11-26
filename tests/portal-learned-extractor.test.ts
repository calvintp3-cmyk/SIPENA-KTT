import { describe, it, expect } from 'vitest';
import { extractArticleContent } from '../server/services/scraper/extractor';
import { matchPortalExtractionProfile } from '../server/services/scraper/portal-profiles';

describe('Learned Portal Extraction Profiles & Multi-Page Hydration Extractor', () => {
  it('mencocokkan profil ekstraksi spesifik untuk 11 portal regional KTT', () => {
    const radar = matchPortalExtractionProfile(
      'https://radartarakan.jawapos.com/tana-tidung/2611250027/jalan-protokol',
    );
    expect(radar?.id).toBe('jawapos-network');
    expect(radar?.contentSelectors).toContain('div.konten div.artikel div.ui-r-my');

    const koran = matchPortalExtractionProfile(
      'https://korankaltara.com/wabup-sabri-tutup-turnamen',
    );
    expect(koran?.id).toBe('koran-kaltara');
    expect(koran?.contentSelectors).toContain('div.news-content.prose');

    const antara = matchPortalExtractionProfile(
      'https://kaltara.antaranews.com/berita/513302/contoh',
    );
    expect(antara?.id).toBe('antara-network');
  });

  it('mengekstrak seluruh halaman 1 & 2 dari JSON Hydration Jawa Pos (Radar Tarakan) dan membuang 100% teaser Artikel Terkait', () => {
    const hydrationJson = JSON.stringify({
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
              description:
                'Pemerintah Kabupaten (Pemkab) Tana Tidung terus memperkuat komitmen dalam meningkatkan kualitas pendidikan anak usia dini (PAUD).',
            },
          ],
        },
      },
    });

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
          <script type="application/json">${hydrationJson}</script>
        </body>
      </html>
    `;

    const res = extractArticleContent(
      radarHtml,
      null,
      'https://radartarakan.jawapos.com/tana-tidung/2611250027/jalan-protokol-tana-tidung-akan-dihijaukan-pohon-peneduh-perda-sebagai-pengaman',
    );

    expect(res.isValidContent).toBe(true);
    expect(res.snippetText).toContain('memperluas program penghijauan di sepanjang jalan protokol');
    expect(res.snippetText).toContain('MIP dan JOB Medco Pertamina');
    expect(res.snippetText).toContain('Jenis tanaman yang disiapkan antara lain ketapang, trembesi');
    expect(res.snippetText).toContain('meminta kepada perusahaan-perusahaan melalui CSR-nya');
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
