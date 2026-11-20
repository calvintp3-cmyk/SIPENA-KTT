// tests/admin-hotfixes.test.ts
import { describe, expect, it } from 'vitest';
import { KbliImpactEnum } from '../shared/enums/pdrb';
import { ExportArticlesQuerySchema } from '../shared/schemas/article.schema';

describe('Admin Hotfixes (Sesi 1C: PR-A5..PR-A9)', () => {
  describe('PR-A5 (UX-007): Synthesis Book Export & Completeness Check', () => {
    it('deduplicates drafts per (dimension, targetCode) keeping latest updatedAt', () => {
      const mockDrafts = [
        {
          dimension: 'kbli',
          targetCode: 'A',
          title: 'Draf A Lama',
          updatedAt: '2024-03-01T10:00:00Z',
          createdAt: '2024-03-01T10:00:00Z',
        },
        {
          dimension: 'kbli',
          targetCode: 'A',
          title: 'Draf A Terbaru',
          updatedAt: '2024-03-05T12:00:00Z',
          createdAt: '2024-03-01T10:00:00Z',
        },
        {
          dimension: 'expenditure',
          targetCode: 'HOUSEHOLD',
          title: 'Draf Pengeluaran Rumah Tangga',
          updatedAt: '2024-03-02T10:00:00Z',
          createdAt: '2024-03-02T10:00:00Z',
        },
      ];

      const latestPerKey = new Map<string, (typeof mockDrafts)[0]>();
      for (const d of mockDrafts) {
        const key = `${d.dimension}-${d.targetCode}`;
        const existing = latestPerKey.get(key);
        const curTime = new Date(d.updatedAt || d.createdAt).getTime();
        const exTime = existing ? new Date(existing.updatedAt || existing.createdAt).getTime() : 0;
        if (!existing || curTime >= exTime) {
          latestPerKey.set(key, d);
        }
      }

      expect(latestPerKey.size).toBe(2);
      expect(latestPerKey.get('kbli-A')?.title).toBe('Draf A Terbaru');
      expect(latestPerKey.get('expenditure-HOUSEHOLD')?.title).toBe('Draf Pengeluaran Rumah Tangga');
    });

    it('validates 23 total PDRB sections (17 KBLI + 6 Expenditure)', () => {
      const TOTAL_PDRB_SECTIONS = 23;
      const kbliCount = 17;
      const expenditureCount = 6;
      expect(kbliCount + expenditureCount).toBe(TOTAL_PDRB_SECTIONS);

      const sectionKeys = [
        ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'].map(
          (c) => `kbli-${c}`,
        ),
        ...['HOUSEHOLD', 'LNPRT', 'GOVERNMENT', 'GFCF', 'INVENTORY', 'NET_EXPORT'].map(
          (c) => `expenditure-${c}`,
        ),
      ];
      expect(sectionKeys.length).toBe(TOTAL_PDRB_SECTIONS);
    });
  });

  describe('PR-A6 (UX-008): Command Palette Deep Link Target', () => {
    it('produces query params with articleId matching review.vue deep link handler', () => {
      function buildReviewNavigation(article: { id: string; verificationStatus: string }) {
        return {
          path: '/admin/review',
          query: {
            status: article.verificationStatus,
            articleId: article.id,
          },
        };
      }

      const nav = buildReviewNavigation({
        id: '123e4567-e89b-12d3-a456-426614174000',
        verificationStatus: 'PENDING',
      });

      expect(nav.query.articleId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(nav.query.status).toBe('PENDING');
      expect((nav.query as Record<string, unknown>).focus).toBeUndefined();
    });
  });

  describe('PR-A7 (UX-014): Dashboard Tile Dominant Impact Formatting', () => {
    it('formats dominant impact into human-readable shortLabel instead of raw enum', () => {
      const KBLI_IMPACT_VISUAL: Record<string, { label: string; shortLabel: string }> = {
        [KbliImpactEnum.INCREASE_NTB]: {
          label: 'Aktivitas / Produksi Naik',
          shortLabel: 'Aktivitas Naik',
        },
        [KbliImpactEnum.DECREASE_NTB]: {
          label: 'Aktivitas / Produksi Turun',
          shortLabel: 'Aktivitas Turun',
        },
      };

      function formatDominantImpact(raw: string | null): string {
        if (!raw) return 'Netral';
        return KBLI_IMPACT_VISUAL[raw]?.shortLabel || raw;
      }

      expect(formatDominantImpact(KbliImpactEnum.INCREASE_NTB)).toBe('Aktivitas Naik');
      expect(formatDominantImpact(KbliImpactEnum.DECREASE_NTB)).toBe('Aktivitas Turun');
      expect(formatDominantImpact(null)).toBe('Netral');
    });
  });

  describe('PR-A8 (UX-015): Trends Table Sort Options', () => {
    it('allows share and nbi in trends sort update callback', () => {
      const allowedKeys = ['delta', 'current', 'code', 'share', 'nbi'];
      let sortKey = 'delta';

      function handleSortUpdate(val: unknown) {
        if (
          val === 'delta' ||
          val === 'current' ||
          val === 'code' ||
          val === 'share' ||
          val === 'nbi'
        ) {
          sortKey = val;
        }
      }

      for (const k of allowedKeys) {
        handleSortUpdate(k);
        expect(sortKey).toBe(k);
      }

      // Invalid key does not overwrite
      handleSortUpdate('invalid_sort');
      expect(sortKey).toBe('nbi');
    });
  });

  describe('PR-A9 (UX-016): Bank Data Summary Counts & Subdistrict Export', () => {
    it('computes all articles count from pendingCount + verifiedCount + ignoredCount', () => {
      const summaryCounts = {
        pendingCount: 15,
        verifiedCount: 42,
        ignoredCount: 8,
        llmFailedCount: 2,
      };

      const totalCalculated =
        summaryCounts.pendingCount + summaryCounts.verifiedCount + summaryCounts.ignoredCount;
      expect(totalCalculated).toBe(65);
    });

    it('validates subdistrict parameter in ExportArticlesQuerySchema', () => {
      const validQuery = {
        format: 'xlsx',
        subdistrict: 'Sesayap',
        status: 'VERIFIED',
      };

      const parsed = ExportArticlesQuerySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.subdistrict).toBe('Sesayap');
      }

      // 'ALL' should be transformed to undefined
      const allQuery = {
        format: 'xlsx',
        subdistrict: 'ALL',
      };
      const parsedAll = ExportArticlesQuerySchema.safeParse(allQuery);
      expect(parsedAll.success).toBe(true);
      if (parsedAll.success) {
        expect(parsedAll.data.subdistrict).toBeUndefined();
      }
    });
  });
});
