import { describe, it, expect } from 'vitest';
import { resolvePhenomenonQuarterAndYear } from '../server/services/llm/temporal-resolver';

describe('Temporal Disambiguation Matrix for PDRB', () => {
  it('menggunakan default quarter dan year jika tidak ada penyebutan periode retrospektif/spesifik di teks', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-11-25T10:00:00+08:00',
      title: 'Harga Cabai di Tideng Pale Naik Menjelang Akhir Tahun',
      snippetText: 'Pedagang di Pasar Imbayud Taka mengeluhkan kenaikan harga cabai rawit pekan ini.',
      defaultQuarter: 4,
      defaultYear: 2026,
    });
    expect(res.quarter).toBe(4);
    expect(res.year).toBe(2026);
    expect(res.isRetroactive).toBe(false);
  });

  it('mendeteksi rilis data retrospektif BPS (misal rilis TW III pada bulan November)', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-11-05T10:00:00+08:00',
      title: 'BPS Rilis Pertumbuhan Ekonomi Kaltara Triwulan III-2026 Tumbuh 5,12 Persen',
      snippetText: 'Badan Pusat Statistik Provinsi Kalimantan Utara mencatat pertumbuhan ekonomi Triwulan III tahun 2026 secara y-on-y tumbuh impresif.',
      defaultQuarter: 4,
      defaultYear: 2026,
    });
    expect(res.quarter).toBe(3);
    expect(res.year).toBe(2026);
    expect(res.isRetroactive).toBe(true);
  });

  it('mendeteksi penetapan UMP untuk tahun depan sebagai kebijakan yang berlaku tahun depan jika merujuk operasional', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-11-25T10:00:00+08:00',
      title: 'Gubernur Kaltara Tetapkan UMP 2027 Sebesar Rp 4.027.901 Berlaku Mulai 1 Januari 2027',
      snippetText: 'Surat Keputusan Gubernur Kalimantan Utara menetapkan Upah Minimum Provinsi untuk tahun 2027 mulai berlaku 1 Januari 2027.',
      defaultQuarter: 4,
      defaultYear: 2026,
    });
    // Sesuai kaidah Nerwilis: penetapan regulasi terjadi pada TW IV 2026 sebagai fenomena kebijakan pembentukan ekspektasi & biaya
    expect(res.quarter).toBe(4);
    expect(res.year).toBe(2026);
    expect(res.isRetroactive).toBe(false);
  });

  it('mendeteksi penyebutan realisasi triwulan masa lampau tahun sebelumnya', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-03-10T10:00:00+08:00',
      title: 'Realisasi Investasi PMTB KTT Triwulan IV 2025 Capai Target',
      snippetText: 'Dinas Penanaman Modal mencatat capaian triwulan 4 tahun 2025 meningkat signifikan.',
      defaultQuarter: 1,
      defaultYear: 2026,
    });
    expect(res.quarter).toBe(4);
    expect(res.year).toBe(2025);
    expect(res.isRetroactive).toBe(true);
  });
});
