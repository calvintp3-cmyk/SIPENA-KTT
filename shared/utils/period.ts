// shared/utils/period.ts

export const WITA_TIMEZONE = 'Asia/Makassar';
export const WITA_UTC_OFFSET = '+08:00';

export type PdrbQuarter = 1 | 2 | 3 | 4;

export interface WitaDateParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
}

const witaPartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: WITA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const ROMAN_QUARTERS: Record<PdrbQuarter, 'I' | 'II' | 'III' | 'IV'> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Mengekstrak komponen tanggal/jam suatu Date dalam zona waktu WITA (Asia/Makassar, UTC+8).
 */
export function getWitaDateParts(date: Date | string | number): WitaDateParts {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError('[period] Invalid date supplied to getWitaDateParts');
  }

  const parts = witaPartsFormatter.formatToParts(d);
  const lookup = new Map<string, string>();
  for (const part of parts) {
    lookup.set(part.type, part.value);
  }

  const year = Number(lookup.get('year'));
  const month = Number(lookup.get('month'));
  const day = Number(lookup.get('day'));
  let hour = Number(lookup.get('hour'));
  const minute = Number(lookup.get('minute'));

  // Beberapa engine Intl mengembalikan '24' pada tepat tengah malam
  if (hour === 24) {
    hour = 0;
  }

  return { year, month, day, hour, minute };
}

export function getQuarterFromMonth(month: number): PdrbQuarter {
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  if (month >= 10 && month <= 12) return 4;
  throw new RangeError(`[period] Month out of range (1..12): ${month}`);
}

/**
 * Menghitung periode Triwulan PDRB (1-4) dan Tahun berdasarkan tanggal di zona WITA.
 */
export function getQuarterFromDateWita(date: Date | string | number): {
  quarter: PdrbQuarter;
  year: number;
} {
  const { year, month } = getWitaDateParts(date);
  return {
    quarter: getQuarterFromMonth(month),
    year,
  };
}

export function getCurrentQuarterYearWita(now: Date = new Date()): {
  quarter: PdrbQuarter;
  year: number;
} {
  return getQuarterFromDateWita(now);
}

export function getPreviousQuarterYear(
  quarter: PdrbQuarter,
  year: number,
): { quarter: PdrbQuarter; year: number } {
  if (quarter === 1) {
    return { quarter: 4, year: year - 1 };
  }
  return { quarter: (quarter - 1) as PdrbQuarter, year };
}

export function toRomanQuarter(quarter: number): 'I' | 'II' | 'III' | 'IV' {
  if (quarter === 1 || quarter === 2 || quarter === 3 || quarter === 4) {
    return ROMAN_QUARTERS[quarter];
  }
  throw new RangeError(`[period] Quarter out of range (1..4): ${quarter}`);
}

/**
 * Format tanggal rilis resmi Nerwilis & Excel: `dd/mm/yyyy` (WITA).
 */
export function formatDateId(date: Date | string | number): string {
  const { day, month, year } = getWitaDateParts(date);
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

/**
 * Format stempel waktu lengkap WITA untuk drawer review & log: `dd/mm/yyyy HH:mm WITA`.
 */
export function formatDateTimeWita(date: Date | string | number): string {
  const { day, month, year, hour, minute } = getWitaDateParts(date);
  return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)} WITA`;
}

/**
 * Format label periode kolom 9 Excel & badge UI: `Triwulan I 2026`.
 */
export function formatPeriodLabel(quarter: number, year: number): string {
  return `Triwulan ${toRomanQuarter(quarter)} ${year}`;
}

/**
 * Mengonversi string tanggal kalender `YYYY-MM-DD` ke batas awal/akhir hari di zona WITA (`+08:00`).
 */
export function parseWitaDateBoundary(dateStr: string, boundary: 'start' | 'end'): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new RangeError(`[period] Format tanggal harus YYYY-MM-DD: "${dateStr}"`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Validasi tanggal kalender nyata (mencegah 2026-02-31 lolos roll-over)
  const checkUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    checkUtc.getUTCFullYear() !== year ||
    checkUtc.getUTCMonth() + 1 !== month ||
    checkUtc.getUTCDate() !== day
  ) {
    throw new RangeError(`[period] Tanggal kalender tidak valid: "${dateStr}"`);
  }

  const timePart = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${timePart}${WITA_UTC_OFFSET}`);
}

