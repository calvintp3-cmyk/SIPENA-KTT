import { describe, it, expect } from 'vitest';
import { detectKttSubdistrict, KTT_GAZETTEER_MAP } from '../server/services/scraper/geo-filter';

describe('Spatial Gazetteer & Micro-Toponymy Resolution for KTT', () => {
  it('memetakan desa dan landmark ke kecamatan yang tepat melalui KTT_GAZETTEER_MAP', () => {
    expect(KTT_GAZETTEER_MAP['tideng pale']).toBe('Sesayap');
    expect(KTT_GAZETTEER_MAP['bebatu']).toBe('Sesayap Hilir');
    expect(KTT_GAZETTEER_MAP['pelabuhan bebatu']).toBe('Sesayap Hilir');
    expect(KTT_GAZETTEER_MAP['tanah merah']).toBe('Tana Lia');
    expect(KTT_GAZETTEER_MAP['buong baru']).toBe('Betayau');
    expect(KTT_GAZETTEER_MAP['kapuak']).toBe('Muruk Rian');
    expect(KTT_GAZETTEER_MAP['puspem ktt']).toBe('Sesayap');
  });

  it('mendeteksi lokus kecamatan secara akurat dari nama desa mikro di judul/snippet', () => {
    // Desa Bebatu di Sesayap Hilir
    expect(detectKttSubdistrict('Panen Bandeng Melimpah di Tambak Bebatu')).toBe('Sesayap Hilir');

    // Buong Baru di Betayau
    expect(detectKttSubdistrict('Banjir Rendam Puluhan Hektare Sawah di Buong Baru')).toBe('Betayau');

    // Tanah Merah di Tana Lia
    expect(detectKttSubdistrict('Distribusi Solar Nelayan di Tanah Merah')).toBe('Tana Lia');

    // Kapuak di Muruk Rian
    expect(detectKttSubdistrict('Jalan Poros Desa Kapuak Ambles')).toBe('Muruk Rian');

    // Tideng Pale di Sesayap
    expect(detectKttSubdistrict('Pasar Imbayud Taka Tideng Pale Padat Pengunjung')).toBe('Sesayap');
  });

  it('mengembalikan null jika berita berskala makro provinsi Kaltara tanpa lokus kecamatan spesifik', () => {
    expect(detectKttSubdistrict('Gubernur Kaltara Tetapkan UMP 2027 Naik 6,5 Persen')).toBeNull();
  });
});
