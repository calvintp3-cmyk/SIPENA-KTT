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

    const res = extractArticleContent(
      html,
      null,
      'https://ekonomi.bisnis.com/read/20261125/ekspor-cpo-kaltara',
    );
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

    const singleRes = extractArticleContent(
      singlePageHtml,
      null,
      'https://example.com/berita-satu-halaman',
    );
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

    const multiRes = extractArticleContent(
      multiPageHtml,
      null,
      'https://example.com/berita-multi-halaman',
    );
    expect(multiRes.nextFullPageUrl).toBe('https://example.com/berita-multi-halaman?page=all');
  });
});
