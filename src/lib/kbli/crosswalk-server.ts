import lampiran5Data from "./lampiran5-2020-2025.json";
import { getSectorWeightPercent } from "../constants/taxonomy";

export interface Lampiran5RawRecord {
  c20: string;
  t20: string;
  c25: string;
  t25: string;
  pdrb: string;
  k25: string;
  type: "1_to_1" | "split_1_to_n" | "merge_n_to_1" | "many_to_many";
}

const RECORDS = lampiran5Data as Lampiran5RawRecord[];

const BY_CODE_2020 = new Map<string, Lampiran5RawRecord[]>();
for (const rec of RECORDS) {
  const arr = BY_CODE_2020.get(rec.c20);
  if (arr) {
    arr.push(rec);
  } else {
    BY_CODE_2020.set(rec.c20, [rec]);
  }
}

export function getAllLampiran5Records(): Lampiran5RawRecord[] {
  return RECORDS;
}

export function lookupFullKbliConversion(
  query: string,
  limit = 60
): Lampiran5RawRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return RECORDS.slice(0, limit);
  }

  const results: Lampiran5RawRecord[] = [];
  for (const r of RECORDS) {
    if (
      r.c20.includes(q) ||
      r.c25.includes(q) ||
      r.t20.toLowerCase().includes(q) ||
      r.t25.toLowerCase().includes(q) ||
      r.pdrb.toLowerCase() === q ||
      r.k25.toLowerCase() === q
    ) {
      results.push(r);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function resolveFullKbli2020To2025(code2020: string): {
  code2020: string;
  title2020: string;
  code2025: string;
  title2025: string;
  pdrbCategory: string;
  category2025: string;
  conversionType: Lampiran5RawRecord["type"] | "unknown";
  pdrbWeightPercent: number;
  matchesCount: number;
} | null {
  const normalized = code2020.trim();
  const matches = BY_CODE_2020.get(normalized);
  if (!matches || matches.length === 0) {
    return null;
  }
  const primary = matches[0];
  return {
    code2020: primary.c20,
    title2020: primary.t20,
    code2025: primary.c25,
    title2025: primary.t25,
    pdrbCategory: primary.pdrb,
    category2025: primary.k25,
    conversionType: primary.type,
    pdrbWeightPercent: getSectorWeightPercent(primary.pdrb),
    matchesCount: matches.length,
  };
}
