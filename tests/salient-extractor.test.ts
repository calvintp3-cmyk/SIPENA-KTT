import { describe, it, expect } from 'vitest';
import { extractSalientEconomicParagraphs } from '../server/services/scraper/extractor';
import { compressArticleTextForLlm } from '../server/services/llm/classifier';

describe('Adaptive Salient Economic Paragraph Extractor', () => {
  it('memprioritaskan paragraf berkepadatan data ekonomi dan nama toponym KTT daripada pembuka basa-basi', () => {
    const paragraphs = [
      'Pagi yang cerah menyelimuti langit Kalimantan Utara pada hari Rabu yang damai ini saat warga beraktivitas seperti biasa.',
      'Berdasarkan data Dinas Perindustrian dan Perdagangan, harga beras SPHP di Pasar Imbayud Taka Sesayap melonjak Rp 15.000 per kg akibat pasokan terhambat.',
      'Demikian disampaikan oleh salah seorang warga yang enggan disebutkan namanya saat ditemui wartawan di sebuah warung kopi.',
      'Kepala Disperindagkop KTT menyatakan pihaknya menyiapkan operasi pasar murah sebanyak 5 ton beras dengan alokasi anggaran tanggap darurat APBD sebesar Rp 250 juta.',
    ];

    const result = extractSalientEconomicParagraphs(paragraphs, { maxWords: 60 });
    // Wajib menyertakan paragraf kedua (data beras di Pasar Imbayud Taka) dan paragraf keempat (operasi pasar 5 ton Rp 250 juta)
    expect(result).toContain('harga beras SPHP di Pasar Imbayud Taka');
    expect(result).toContain('operasi pasar murah sebanyak 5 ton');
    expect(result).not.toContain('warung kopi');
  });

  it('mempertahankan paragraf lead (paragraf 1) jika mengandung fakta berita inti', () => {
    const paragraphs = [
      'Bupati Tana Tidung meninjau langsung progres pembangunan Gedung Pusat Pemerintahan (Puspem) KTT di Tideng Pale senilai Rp 45 miliar.',
      'Dalam kesempatan tersebut, beliau mengimbau seluruh jajaran kontraktor bekerja tepat waktu.',
    ];

    const result = extractSalientEconomicParagraphs(paragraphs, { maxWords: 50 });
    expect(result).toContain('Gedung Pusat Pemerintahan (Puspem) KTT');
  });

  it('compressArticleTextForLlm memanfaatkan paragraph-level salience saat teks memiliki pemisah paragraf ganda', () => {
    const multiParagraph = [
      'Pagi yang cerah menyelimuti langit Kalimantan Utara pada hari Rabu yang damai ini saat warga beraktivitas seperti biasa.',
      'Berdasarkan data Dinas Perindustrian dan Perdagangan, harga beras SPHP di Pasar Imbayud Taka Sesayap melonjak Rp 15.000 per kg akibat pasokan terhambat.',
      'Demikian disampaikan oleh salah seorang warga yang enggan disebutkan namanya saat ditemui wartawan di sebuah warung kopi.',
      'Kepala Disperindagkop KTT menyatakan pihaknya menyiapkan operasi pasar murah sebanyak 5 ton beras dengan alokasi anggaran tanggap darurat APBD sebesar Rp 250 juta.',
    ].join('\n\n');

    const result = compressArticleTextForLlm(multiParagraph, 60);
    expect(result).toContain('harga beras SPHP di Pasar Imbayud Taka');
    expect(result).toContain('operasi pasar murah sebanyak 5 ton');
    expect(result).not.toContain('warung kopi');
  });
});

