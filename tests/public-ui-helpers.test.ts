// tests/public-ui-helpers.test.ts
import { describe, expect, it } from 'vitest';
import {
  applyKbliSelection,
  applyPdrbGroupSelection,
  hasLegacyTimelineQuery,
  pickLandingSnapshotPeriod,
  resolvePdrbGroupForKbli,
} from '#shared/utils/public-helpers';

describe('public UI landing & routing helpers', () => {
  it('detects legacy public timeline query parameters for / -> /linimasa redirect', () => {
    expect(hasLegacyTimelineQuery({})).toBe(false);
    expect(hasLegacyTimelineQuery({ utm_source: 'share' })).toBe(false);
    expect(hasLegacyTimelineQuery({ year: '2026', quarter: '4' })).toBe(true);
    expect(hasLegacyTimelineQuery({ q: 'sawit' })).toBe(true);
    expect(hasLegacyTimelineQuery({ kbli: 'A' })).toBe(true);
    expect(hasLegacyTimelineQuery({ pdrbGroup: 'G' })).toBe(true);
    expect(hasLegacyTimelineQuery({ expenditure: 'PMTB' })).toBe(true);
    expect(hasLegacyTimelineQuery({ view: 'table' })).toBe(true);
    expect(hasLegacyTimelineQuery({ page: '2' })).toBe(true);
    expect(hasLegacyTimelineQuery({ year: '' })).toBe(false);
  });

  it('picks latest populated period honestly without inventing empty stats', () => {
    expect(pickLandingSnapshotPeriod([])).toBeNull();
    expect(pickLandingSnapshotPeriod(null)).toBeNull();

    const periods = [
      { year: 2026, quarter: 4, label: 'TW IV 2026', count: 0 },
      { year: 2026, quarter: 3, label: 'TW III 2026', count: 18 },
      { year: 2026, quarter: 2, label: 'TW II 2026', count: 12 },
    ];
    expect(pickLandingSnapshotPeriod(periods)).toEqual({
      year: 2026,
      quarter: 3,
      label: 'TW III 2026',
      count: 18,
    });

    const allZero = [
      { year: 2026, quarter: 4, label: 'TW IV 2026', count: 0 },
      { year: 2026, quarter: 3, label: 'TW III 2026', count: 0 },
    ];
    expect(pickLandingSnapshotPeriod(allZero)?.label).toBe('TW IV 2026');
  });

  it('keeps KBLI chart clicks synchronized with 17-sector PDRB dropdown groups', () => {
    expect(resolvePdrbGroupForKbli('ALL')).toBe('ALL');
    expect(resolvePdrbGroupForKbli('')).toBe('ALL');
    expect(resolvePdrbGroupForKbli(null)).toBe('ALL');
    expect(resolvePdrbGroupForKbli('A')).toBe('A');
    expect(resolvePdrbGroupForKbli('J')).toBe('J,K');
    expect(resolvePdrbGroupForKbli('k')).toBe('J,K');
    expect(resolvePdrbGroupForKbli('N')).toBe('N,O');
    expect(resolvePdrbGroupForKbli('U')).toBe('S,T,U,V');
    expect(resolvePdrbGroupForKbli('ZZ')).toBe('ALL');

    expect(applyKbliSelection('J')).toEqual({ kbli: 'J', pdrbGroup: 'J,K' });
    expect(applyKbliSelection('A')).toEqual({ kbli: 'A', pdrbGroup: 'A' });
    expect(applyKbliSelection('ALL')).toEqual({ kbli: 'ALL', pdrbGroup: 'ALL' });

    expect(applyPdrbGroupSelection('J,K')).toEqual({ kbli: 'ALL', pdrbGroup: 'J,K' });
    expect(applyPdrbGroupSelection('A')).toEqual({ kbli: 'ALL', pdrbGroup: 'A' });
    expect(applyPdrbGroupSelection('ALL')).toEqual({ kbli: 'ALL', pdrbGroup: 'ALL' });
  });
});

