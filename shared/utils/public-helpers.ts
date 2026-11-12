// shared/utils/public-helpers.ts
import { KBLI_CATEGORY_META, KbliCategoryEnum } from '#shared/enums/pdrb';

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

export function resolvePdrbGroupForKbli(kbliCode: string | null | undefined): string {
  const normalized = kbliCode?.trim().toUpperCase();
  if (!normalized || normalized === 'ALL') return 'ALL';
  if (normalized in KbliCategoryEnum) {
    return KBLI_CATEGORY_META[normalized as KbliCategoryEnum].pdrb17GroupCode;
  }
  return 'ALL';
}

export function applyKbliSelection(kbliCode: string | null | undefined): {
  kbli: string;
  pdrbGroup: string;
} {
  const normalized = kbliCode?.trim().toUpperCase();
  if (!normalized || normalized === 'ALL' || !(normalized in KbliCategoryEnum)) {
    return { kbli: 'ALL', pdrbGroup: 'ALL' };
  }
  return {
    kbli: normalized,
    pdrbGroup: resolvePdrbGroupForKbli(normalized),
  };
}

export function applyPdrbGroupSelection(groupCode: string | null | undefined): {
  kbli: string;
  pdrbGroup: string;
} {
  const normalized = groupCode?.trim().toUpperCase();
  if (!normalized || normalized === 'ALL') {
    return { kbli: 'ALL', pdrbGroup: 'ALL' };
  }
  return {
    kbli: 'ALL',
    pdrbGroup: normalized,
  };
}

