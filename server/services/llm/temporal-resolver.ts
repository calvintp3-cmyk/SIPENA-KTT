// server/services/llm/temporal-resolver.ts

export interface TemporalResolverInput {
  publishedAtWita: string;
  title: string;
  snippetText?: string | null;
  defaultQuarter: 1 | 2 | 3 | 4;
  defaultYear: number;
}

export interface TemporalResolverOutput {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  isRetroactive: boolean;
  reasoning: string;
}

function parseQuarterString(raw: string): 1 | 2 | 3 | 4 | null {
  const norm = raw.trim().toLowerCase();
  if (norm === '1' || norm === 'i') return 1;
  if (norm === '2' || norm === 'ii') return 2;
  if (norm === '3' || norm === 'iii') return 3;
  if (norm === '4' || norm === 'iv') return 4;
  return null;
}

/**
 * Matriks Disambiguasi Temporal untuk Periode PDRB (Triwulan & Tahun).
 * Menentukan apakah berita merupakan rilis retrospektif capaian statistik masa lampau
 * (misal data TW III dirilis pada bulan November di TW IV) atau mengikuti tanggal rilis default.
 */
export function resolvePhenomenonQuarterAndYear(
  input: TemporalResolverInput,
): TemporalResolverOutput {
  const text = `${input.title} ${input.snippetText ?? ''}`.toLowerCase();

  // 1. Pola eksplisit: "Triwulan I/II/III/IV 202x", "TW 1/2/3/4 202x", "Triwulan 4 tahun 2025"
  const RETRO_TW_YEAR_RE =
    /\b(?:triwulan|tw|kuartal|q)\s*[-–/]?\s*([1-4]|i{1,3}|iv)\s*(?:[-–/]|tahun\s+|thn\s+)?\s*(202[0-9]|203[0-9])\b/i;
  
  // 2. Pola tahun mendahului triwulan: "2025 Triwulan IV"
  const RETRO_YEAR_TW_RE =
    /\b(?:tahun|thn)?\s*(202[0-9]|203[0-9])\s*(?:triwulan|tw|kuartal|q)\s*[-–/]?\s*([1-4]|i{1,3}|iv)\b/i;

  let parsedQuarter: 1 | 2 | 3 | 4 | null = null;
  let parsedYear: number | null = null;

  const match1 = RETRO_TW_YEAR_RE.exec(text);
  if (match1 && match1[1] && match1[2]) {
    parsedQuarter = parseQuarterString(match1[1]);
    parsedYear = parseInt(match1[2], 10);
  } else {
    const match2 = RETRO_YEAR_TW_RE.exec(text);
    if (match2 && match2[1] && match2[2]) {
      parsedYear = parseInt(match2[1], 10);
      parsedQuarter = parseQuarterString(match2[2]);
    }
  }

  if (parsedQuarter !== null && parsedYear !== null) {
    // Periksa apakah ada sinyal rilis data atau capaian statistik retrospektif
    const isRetroactiveSignal =
      /\b(?:rilis|catat|mencatat|tercatat|tumbuh|pertumbuhan|realisasi|laporan|kinerja|survei|data|capaian|mencapai)\b/i.test(
        text,
      );

    const isOlderThanDefault =
      parsedYear < input.defaultYear ||
      (parsedYear === input.defaultYear && parsedQuarter < input.defaultQuarter);

    if (isRetroactiveSignal && isOlderThanDefault) {
      return {
        quarter: parsedQuarter,
        year: parsedYear,
        isRetroactive: true,
        reasoning: `Terdeteksi rilis data retrospektif untuk Triwulan ${parsedQuarter} Tahun ${parsedYear}.`,
      };
    }
  }

  return {
    quarter: input.defaultQuarter,
    year: input.defaultYear,
    isRetroactive: false,
    reasoning: `Mengikuti periode tanggal publikasi rilis (Triwulan ${input.defaultQuarter} Tahun ${input.defaultYear}).`,
  };
}
