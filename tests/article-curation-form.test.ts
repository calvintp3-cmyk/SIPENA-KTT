// tests/article-curation-form.test.ts
import { describe, expect, it } from 'vitest';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  VerificationStatusEnum,
} from '../shared/enums/pdrb';
import { UpdateArticleReviewSchema } from '../shared/schemas/article.schema';
import { KTT_SUBDISTRICTS } from '../app/composables/usePdrbLabels';

describe('Shared Curation Form (Sesi 1B / UX-004)', () => {
  it('exports valid Tana Tidung subdistricts', () => {
    expect(KTT_SUBDISTRICTS).toEqual([
      'Sesayap',
      'Sesayap Hilir',
      'Tana Lia',
      'Betayau',
      'Muruk Rian',
    ]);
  });

  it('validates that UpdateArticleReviewSchema accepts subdistrict, curatorNotes, and secondary fields', () => {
    const payload = {
      title: 'Panen Raya Padi di Sesayap Tingkatkan Produksi Beras',
      summary: 'Panen raya padi di Kecamatan Sesayap meningkatkan produksi beras lokal secara signifikan.',
      subdistrict: 'Sesayap',
      curatorNotes: 'Data dikonfirmasi dengan Dinas Pertanian KTT',
      isEconomicPhenomenon: true,
      verificationStatus: VerificationStatusEnum.VERIFIED,
      kbliCategory: KbliCategoryEnum.A,
      kbliImpact: KbliImpactEnum.INCREASE_NTB,
      expenditureComponent: ExpenditureComponentEnum.PK_RT,
      expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
      secondaryKbliCategory: KbliCategoryEnum.C,
      secondaryKbliImpact: KbliImpactEnum.INCREASE_NTB,
      secondaryExpenditureComponent: ExpenditureComponentEnum.PK_P,
      secondaryExpenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
      quarter: 3,
      year: 2024,
    };

    const parsed = UpdateArticleReviewSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subdistrict).toBe('Sesayap');
      expect(parsed.data.curatorNotes).toBe('Data dikonfirmasi dengan Dinas Pertanian KTT');
      expect(parsed.data.verificationStatus).toBe(VerificationStatusEnum.VERIFIED);
    }
  });

  it('verifies client-side validation logic for curation actions', () => {
    function validateCurationAction(
      form: {
        title: string;
        summary: string;
        kbliCategory: string;
        kbliImpact: string;
        expenditureComponent: string;
        expenditureImpact: string;
      },
      action: 'VERIFIED' | 'IGNORED' | 'DRAFT',
    ): { valid: boolean; error?: string } {
      if (form.title.trim().length < 5) {
        return { valid: false, error: 'Judul berita minimal 5 karakter.' };
      }

      const trimmedSummary = form.summary.trim();
      if (trimmedSummary.length > 0 && trimmedSummary.length < 10) {
        return { valid: false, error: 'Jika diisi, ringkasan minimal 10 karakter (atau kosongkan).' };
      }

      if (action === 'VERIFIED') {
        const missing: string[] = [];
        if (!form.kbliCategory) missing.push('Kategori KBLI');
        if (!form.kbliImpact) missing.push('Dampak KBLI');
        if (!form.expenditureComponent) missing.push('Komponen Pengeluaran');
        if (!form.expenditureImpact) missing.push('Dampak Pengeluaran');

        if (missing.length > 0) {
          return {
            valid: false,
            error: `Field wajib belum lengkap untuk Verifikasi: ${missing.join(', ')}.`,
          };
        }
      }

      return { valid: true };
    }

    // Incomplete form cannot be verified
    const incomplete = {
      title: 'Judul Valid Berita',
      summary: '',
      kbliCategory: 'A',
      kbliImpact: '',
      expenditureComponent: '',
      expenditureImpact: '',
    };
    expect(validateCurationAction(incomplete, 'VERIFIED').valid).toBe(false);
    expect(validateCurationAction(incomplete, 'VERIFIED').error).toContain('Field wajib belum lengkap');

    // Incomplete form can still be saved as DRAFT or IGNORED
    expect(validateCurationAction(incomplete, 'DRAFT').valid).toBe(true);
    expect(validateCurationAction(incomplete, 'IGNORED').valid).toBe(true);

    // Title too short fails in all modes
    const shortTitle = { ...incomplete, title: 'abc' };
    expect(validateCurationAction(shortTitle, 'DRAFT').valid).toBe(false);
    expect(validateCurationAction(shortTitle, 'IGNORED').valid).toBe(false);

    // Complete form succeeds for VERIFIED
    const complete = {
      title: 'Panen Raya Padi',
      summary: 'Ringkasan valid yang panjangnya lebih dari sepuluh karakter',
      kbliCategory: 'A',
      kbliImpact: 'INCREASE_NTB',
      expenditureComponent: 'HOUSEHOLD',
      expenditureImpact: 'EXPANSION',
    };
    expect(validateCurationAction(complete, 'VERIFIED').valid).toBe(true);
  });

  it('validates partial impact updates via UpdateArticleReviewSchema', () => {
    // Only kbliImpact updated
    const partialKbli = UpdateArticleReviewSchema.safeParse({
      kbliImpact: KbliImpactEnum.DECREASE_NTB,
    });
    expect(partialKbli.success).toBe(true);
    if (partialKbli.success) {
      expect(partialKbli.data.kbliImpact).toBe(KbliImpactEnum.DECREASE_NTB);
    }

    // Only expenditureImpact updated
    const partialExp = UpdateArticleReviewSchema.safeParse({
      expenditureImpact: ExpenditureImpactEnum.INCREASE_DEFLATOR,
    });
    expect(partialExp.success).toBe(true);
    if (partialExp.success) {
      expect(partialExp.data.expenditureImpact).toBe(ExpenditureImpactEnum.INCREASE_DEFLATOR);
    }

    // Nulling impacts
    const nullImpacts = UpdateArticleReviewSchema.safeParse({
      kbliImpact: null,
      expenditureImpact: null,
    });
    expect(nullImpacts.success).toBe(true);

    // Summary normalization helper
    const emptySummary = '';
    const validSummary = 'Ringkasan fenomena ekonomi yang valid';
    const normalizeSummary = (s: string) => (s.trim().length >= 10 ? s.trim() : null);
    expect(normalizeSummary(emptySummary)).toBeNull();
    expect(normalizeSummary(validSummary)).toBe(validSummary);
  });
});
