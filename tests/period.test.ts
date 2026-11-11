// tests/period.test.ts
import { describe, expect, it } from 'vitest';
import {
  formatDateId,
  formatDateTimeWita,
  formatPeriodLabel,
  getPreviousQuarterYear,
  getQuarterFromDateWita,
  getQuarterFromMonth,
  getWitaDateParts,
  parseWitaDateBoundary,
  toRomanQuarter,
} from '#shared/utils/period';

describe('shared/utils/period (Zona Waktu WITA / Asia/Makassar)', () => {
  it('menangani pergantian bulan & triwulan tepat pada batas UTC -> WITA (UTC+8)', () => {
    // 2026-03-31 15:59 UTC == 2026-03-31 23:59 WITA -> masih Triwulan I 2026
    const beforeRollover = new Date('2026-03-31T15:59:59.000Z');
    expect(getQuarterFromDateWita(beforeRollover)).toEqual({ quarter: 1, year: 2026 });
    expect(formatDateId(beforeRollover)).toBe('31/03/2026');

    // 2026-03-31 17:30 UTC == 2026-04-01 01:30 WITA -> sudah Triwulan II 2026
    const afterRollover = new Date('2026-03-31T17:30:00.000Z');
    expect(getQuarterFromDateWita(afterRollover)).toEqual({ quarter: 2, year: 2026 });
    expect(formatDateId(afterRollover)).toBe('01/04/2026');

    // 2026-12-31 16:00 UTC == 2027-01-01 00:00 WITA -> Tahun Baru Triwulan I 2027
    const newYearRollover = new Date('2026-12-31T16:00:00.000Z');
    expect(getQuarterFromDateWita(newYearRollover)).toEqual({ quarter: 1, year: 2027 });
    expect(formatDateId(newYearRollover)).toBe('01/01/2027');
    expect(formatDateTimeWita(newYearRollover)).toBe('01/01/2027 00:00 WITA');
  });

  it('memetakan bulan 1..12 ke Triwulan 1..4 dengan benar dan menolak di luar rentang', () => {
    expect(getQuarterFromMonth(1)).toBe(1);
    expect(getQuarterFromMonth(3)).toBe(1);
    expect(getQuarterFromMonth(4)).toBe(2);
    expect(getQuarterFromMonth(6)).toBe(2);
    expect(getQuarterFromMonth(7)).toBe(3);
    expect(getQuarterFromMonth(9)).toBe(3);
    expect(getQuarterFromMonth(10)).toBe(4);
    expect(getQuarterFromMonth(12)).toBe(4);

    expect(() => getQuarterFromMonth(0)).toThrow(RangeError);
    expect(() => getQuarterFromMonth(13)).toThrow(RangeError);
  });

  it('menghitung triwulan sebelumnya lintas pergantian tahun dengan akurat', () => {
    expect(getPreviousQuarterYear(1, 2026)).toEqual({ quarter: 4, year: 2025 });
    expect(getPreviousQuarterYear(2, 2026)).toEqual({ quarter: 1, year: 2026 });
    expect(getPreviousQuarterYear(4, 2026)).toEqual({ quarter: 3, year: 2026 });
  });

  it('memformat angka Romawi dan label Periode Berita kolom 9', () => {
    expect(toRomanQuarter(1)).toBe('I');
    expect(toRomanQuarter(2)).toBe('II');
    expect(toRomanQuarter(3)).toBe('III');
    expect(toRomanQuarter(4)).toBe('IV');
    expect(formatPeriodLabel(4, 2026)).toBe('Triwulan IV 2026');
    expect(() => toRomanQuarter(5)).toThrow(RangeError);
  });

  it('mengonversi batas tanggal kalender YYYY-MM-DD ke WITA start/end dan menolak tanggal palsu', () => {
    const start = parseWitaDateBoundary('2026-10-14', 'start');
    const end = parseWitaDateBoundary('2026-10-14', 'end');

    expect(start.toISOString()).toBe('2026-10-13T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-14T15:59:59.999Z');
    expect(getWitaDateParts(start)).toMatchObject({ year: 2026, month: 10, day: 14, hour: 0, minute: 0 });

    // 2026 bukan tahun kabisat; 30 Februari tidak pernah valid
    expect(() => parseWitaDateBoundary('2026-02-29', 'start')).toThrow(RangeError);
    expect(() => parseWitaDateBoundary('2026-02-30', 'end')).toThrow(RangeError);
    // 2024 adalah tahun kabisat valid
    expect(formatDateId(parseWitaDateBoundary('2024-02-29', 'start'))).toBe('29/02/2024');
  });
});

