// tests/kbli-concordance.test.ts
import { describe, expect, it } from 'vitest';
import {
  convertKbliVersion,
  getEntryCodeByVersion,
  getEntryTitleByVersion,
  getKbliConcordanceByCode2025,
  getKbliFourGenerations,
  KBLI_CONCORDANCE_ENTRIES,
} from '#shared/utils/kbli-concordance';

describe('KBLI 4-Generation Concordance Matrix (2009 ↔ 2015 ↔ 2020 ↔ 2025)', () => {
  it('memiliki 22 kategori lengkap untuk KBLI 2025 (A sampai V)', () => {
    expect(KBLI_CONCORDANCE_ENTRIES).toHaveLength(22);
    const codes = KBLI_CONCORDANCE_ENTRIES.map((e) => e.code_2025);
    expect(codes).toEqual([
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
      'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
      'U', 'V',
    ]);
  });

  it('mengonversi Kategori K baru (Telekomunikasi, Cloud & AI) pada 2025 kembali ke J pada 2020/2015/2009', () => {
    const k2025 = getKbliFourGenerations('K');
    expect(k2025).not.toBeNull();
    expect(k2025?.code2025).toBe('K');
    expect(k2025?.code2020).toBe('J');
    expect(k2025?.code2015).toBe('J');
    expect(k2025?.code2009).toBe('J');
    expect(k2025?.pdrbSector).toContain('Informasi dan Komunikasi');
    expect(k2025?.changeNotes).toContain('Cloud Computing');
  });

  it('mengonversi pergeseran domino huruf: Jasa Keuangan (2025: L, 2020: K) dan Administrasi Pemerintahan (2025: P, 2020: O)', () => {
    // Keuangan
    const keuangan = getKbliFourGenerations('L');
    expect(keuangan?.code2025).toBe('L');
    expect(keuangan?.code2020).toBe('K');
    expect(keuangan?.code2015).toBe('K');
    expect(keuangan?.code2009).toBe('K');
    expect(keuangan?.title2025).toContain('Keuangan');

    // Administrasi Pemerintahan
    const pemda = getKbliFourGenerations('P');
    expect(pemda?.code2025).toBe('P');
    expect(pemda?.code2020).toBe('O');
    expect(pemda?.code2015).toBe('O');
    expect(pemda?.code2009).toBe('O');
  });

  it('mengonversi relokasi bengkel kendaraan bermotor dari G (2020) ke T (2025)', () => {
    const jasaLainnya = getKbliFourGenerations('T');
    expect(jasaLainnya?.code2025).toBe('T');
    expect(jasaLainnya?.code2020).toContain('S + G');
    expect(jasaLainnya?.changeNotes).toContain('reparasi/perawatan mobil dan motor yang dikeluarkan dari Kategori G');
  });

  it('convertKbliVersion mengonversi dua arah secara akurat', () => {
    const result2025to2020 = convertKbliVersion('P', '2025', '2020');
    expect(result2025to2020?.code).toBe('O');

    const result2020to2025 = convertKbliVersion('K', '2020', '2025');
    expect(result2020to2025?.code).toBe('L');
  });

  it('getEntryCodeByVersion dan getEntryTitleByVersion mengambil nilai yang tepat', () => {
    const entryA = getKbliConcordanceByCode2025('A');
    expect(entryA).toBeDefined();
    if (!entryA) return;

    expect(getEntryCodeByVersion(entryA, '2025')).toBe('A');
    expect(getEntryCodeByVersion(entryA, '2020')).toBe('A');
    expect(getEntryTitleByVersion(entryA, '2025')).toContain('Pertanian');
  });
});
