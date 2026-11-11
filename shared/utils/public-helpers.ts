// shared/utils/public-helpers.ts

export const LEGACY_LINIMASA_QUERY_KEYS = [
  'year',
  'quarter',
  'q',
  'kbli',
  'pdrbGroup',
  'expenditure',
  'impactMacro',
  'sourceType',
  'view',
  'page',
] as const;

export function hasLegacyTimelineQuery(query: Record<string, unknown>): boolean {
  for (const key of LEGACY_LINIMASA_QUERY_KEYS) {
    const raw = query[key];
    if (Array.isArray(raw)) {
      if (raw.some((v) => typeof v === 'string' && v.trim().length > 0)) {
        return true;
      }
    } else if (typeof raw === 'string' && raw.trim().length > 0) {
      return true;
    }
  }
  return false;
}

export interface AvailablePeriodSummary {
  year: number;
  quarter: number;
  label: string;
  count: number;
}

export function pickLandingSnapshotPeriod(
  periods: AvailablePeriodSummary[] | null | undefined,
): AvailablePeriodSummary | null {
  if (!periods || periods.length === 0) return null;
  return periods.find((p) => p.count > 0) ?? periods[0] ?? null;
}

