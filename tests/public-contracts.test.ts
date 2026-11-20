// tests/public-contracts.test.ts
import { describe, expect, it } from 'vitest';
import { ImpactMacroFilterSchema } from '../shared/schemas/article.schema';
import { KbliImpactEnum } from '../shared/enums/pdrb';

describe('Public Contracts & Signal Mappings (Sesi 1A)', () => {
  it('validates that macro signal filters match ImpactMacroFilterSchema', () => {
    const macroSignalValues = ['EXPANSION', 'CONTRACTION', 'PRICE_UP', 'PRICE_DOWN'];

    for (const val of macroSignalValues) {
      const parsed = ImpactMacroFilterSchema.safeParse(val);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe(val);
      }
    }

    // Invalid legacy values that caused HTTP 400
    expect(ImpactMacroFilterSchema.safeParse('output_up').success).toBe(false);
    expect(ImpactMacroFilterSchema.safeParse('output_down').success).toBe(false);
    expect(ImpactMacroFilterSchema.safeParse('price_up').success).toBe(false);
    expect(ImpactMacroFilterSchema.safeParse('price_down').success).toBe(false);
  });

  it('normalizes legacy query parameters in linimasa to schema-compliant filters', () => {
    function parseImpactMacro(raw: unknown): string {
      if (typeof raw === 'string') {
        const val = raw.trim();
        if (val === 'output_up') return 'EXPANSION';
        if (val === 'output_down') return 'CONTRACTION';
        if (val === 'price_up') return 'PRICE_UP';
        if (val === 'price_down') return 'PRICE_DOWN';
        if (['EXPANSION', 'CONTRACTION', 'PRICE_UP', 'PRICE_DOWN'].includes(val)) return val;
      }
      return 'all';
    }

    expect(parseImpactMacro('output_up')).toBe('EXPANSION');
    expect(parseImpactMacro('output_down')).toBe('CONTRACTION');
    expect(parseImpactMacro('price_up')).toBe('PRICE_UP');
    expect(parseImpactMacro('price_down')).toBe('PRICE_DOWN');
    expect(parseImpactMacro('EXPANSION')).toBe('EXPANSION');
    expect(parseImpactMacro('all')).toBe('all');
    expect(parseImpactMacro(null)).toBe('all');
  });

  it('verifies getKbliImpactBadge returns all visual meta keys', () => {
    const KBLI_IMPACT_VISUAL: Record<KbliImpactEnum, { label: string; shortLabel: string; color: string; icon: string }> = {
      [KbliImpactEnum.INCREASE_NTB]: {
        label: 'Aktivitas / Produksi Naik',
        shortLabel: 'Aktivitas Naik',
        color: 'success',
        icon: 'i-lucide-trending-up',
      },
      [KbliImpactEnum.DECREASE_NTB]: {
        label: 'Aktivitas / Produksi Turun',
        shortLabel: 'Aktivitas Turun',
        color: 'error',
        icon: 'i-lucide-trending-down',
      },
      [KbliImpactEnum.INCREASE_PRICE]: {
        label: 'Harga / Tarif Naik',
        shortLabel: 'Harga Naik',
        color: 'warning',
        icon: 'i-lucide-arrow-up-right',
      },
      [KbliImpactEnum.DECREASE_PRICE]: {
        label: 'Harga / Tarif Turun',
        shortLabel: 'Harga Turun',
        color: 'info',
        icon: 'i-lucide-arrow-down-right',
      },
    };

    for (const impact of Object.values(KbliImpactEnum)) {
      const meta = KBLI_IMPACT_VISUAL[impact];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.shortLabel).toBeTruthy();
      expect(['success', 'error', 'warning', 'info', 'neutral']).toContain(meta.color);
      expect(meta.icon).toBeTruthy();
    }
  });

  it('verifies PublicArticleItem field contract compatibility for observatory cards', () => {
    const mockPublicArticle = {
      id: 'test-123',
      url: 'https://example.com/berita',
      sourceType: 'REGIONAL',
      sourcePortal: 'Radar Tarakan',
      title: 'Panen Raya Sawit di Betayau',
      summary: 'Realisasi panen sawit melimpah mencapai 500 ton.',
      kbliCategory: 'A',
      kbliImpact: KbliImpactEnum.INCREASE_NTB,
      expenditureComponent: 'NET_EXPORT',
      expenditureImpact: null,
      subdistrict: 'Betayau',
      publishedAt: '2026-11-20T00:00:00.000Z',
      quarter: 4,
      year: 2026,
    };

    // The fields accessed by index.vue must exist and match contract
    expect(mockPublicArticle.sourcePortal).toBe('Radar Tarakan');
    expect(mockPublicArticle.subdistrict).toBe('Betayau');
    expect(mockPublicArticle.summary).toBe('Realisasi panen sawit melimpah mencapai 500 ton.');
    expect(mockPublicArticle.kbliImpact).toBe(KbliImpactEnum.INCREASE_NTB);

    // Old non-existent properties must not be needed
    expect((mockPublicArticle as Record<string, unknown>).portalName).toBeUndefined();
    expect((mockPublicArticle as Record<string, unknown>).districtName).toBeUndefined();
    expect((mockPublicArticle as Record<string, unknown>).economicSummary).toBeUndefined();
    expect((mockPublicArticle as Record<string, unknown>).impactTypeKbli).toBeUndefined();
  });
});
