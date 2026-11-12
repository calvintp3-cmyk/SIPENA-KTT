// tests/pdrb-colors.test.ts
import { describe, expect, it } from 'vitest';
import {
  ExpenditureComponentEnum,
  KbliCategoryEnum,
  PDRB_6_EXPENDITURE_LIST,
} from '#shared/enums/pdrb';
import {
  getExpenditureColorTheme,
  getKbliClusterKey,
  getKbliClusterTheme,
} from '#shared/utils/pdrb-colors';

describe('pdrb-colors taxonomy helpers', () => {
  it('maps all 22 official KBLI 2025 A-V codes plus grouped codes into 4 semantic clusters', () => {
    const allCodes = Object.values(KbliCategoryEnum);
    expect(allCodes).toHaveLength(22);

    for (const code of allCodes) {
      const key = getKbliClusterKey(code);
      expect(key).not.toBe('DEFAULT');
      const theme = getKbliClusterTheme(code);
      expect(theme.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.pillClass.length).toBeGreaterThan(0);
    }

    expect(getKbliClusterKey('A')).toBe('PRIMARY_SDA');
    expect(getKbliClusterKey('F')).toBe('INDUSTRY_BUILD');
    expect(getKbliClusterKey('G')).toBe('TRADE_LOGISTICS');
    expect(getKbliClusterKey('K')).toBe('TRADE_LOGISTICS');
    expect(getKbliClusterKey('J,K')).toBe('TRADE_LOGISTICS');
    expect(getKbliClusterKey('L')).toBe('FINANCE_PUBLIC');
    expect(getKbliClusterKey('N,O')).toBe('FINANCE_PUBLIC');
    expect(getKbliClusterKey('S,T,U,V')).toBe('FINANCE_PUBLIC');
    expect(getKbliClusterKey('V')).toBe('FINANCE_PUBLIC');
  });

  it('returns DEFAULT theme cleanly when KBLI code is missing or unknown', () => {
    expect(getKbliClusterKey(null)).toBe('DEFAULT');
    expect(getKbliClusterKey('')).toBe('DEFAULT');
    expect(getKbliClusterKey('Z')).toBe('DEFAULT');
    expect(getKbliClusterTheme(undefined).key).toBe('DEFAULT');
  });

  it('provides distinct multi-chroma hex colors for all 6 PDRB expenditure components', () => {
    const hexSet = new Set<string>();
    for (const item of PDRB_6_EXPENDITURE_LIST) {
      const theme = getExpenditureColorTheme(item.code);
      expect(theme.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.pillClass.length).toBeGreaterThan(0);
      expect(theme.dotClass.length).toBeGreaterThan(0);
      hexSet.add(theme.hex);
    }
    expect(hexSet.size).toBe(6);
    expect(getExpenditureColorTheme(ExpenditureComponentEnum.NET_EXPORT).hex).toBe('#059669');
    expect(getExpenditureColorTheme(null).hex).toBe('#64748B');
  });
});

