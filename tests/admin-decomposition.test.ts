// tests/admin-decomposition.test.ts
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Admin Monolith Decomposition & Polish (Sesi Fase 2)', () => {
  const root = path.resolve(__dirname, '..');

  it('asserts all three admin monoliths are <= 550 lines', () => {
    const reviewLines = fs.readFileSync(path.join(root, 'app/pages/admin/review.vue'), 'utf-8').split('\n').length;
    const articlesLines = fs.readFileSync(path.join(root, 'app/pages/admin/articles.vue'), 'utf-8').split('\n').length;
    const synthesisLines = fs.readFileSync(path.join(root, 'app/pages/admin/synthesis.vue'), 'utf-8').split('\n').length;

    expect(reviewLines).toBeLessThanOrEqual(550);
    expect(articlesLines).toBeLessThanOrEqual(550);
    expect(synthesisLines).toBeLessThanOrEqual(550);
  });

  it('asserts HighlightedSnippetBox.vue exists and is imported in review', () => {
    const boxPath = path.join(root, 'app/components/admin/HighlightedSnippetBox.vue');
    expect(fs.existsSync(boxPath)).toBe(true);

    const reviewContent = fs.readFileSync(path.join(root, 'app/pages/admin/review.vue'), 'utf-8');
    const slideoverContent = fs.readFileSync(path.join(root, 'app/components/admin/ReviewSlideover.vue'), 'utf-8');

    expect(reviewContent).toContain('HighlightedSnippetBox');
    expect(slideoverContent).toContain('HighlightedSnippetBox');
  });

  it('asserts Undo toast in review preserves isEconomicPhenomenon and verificationStatus (Amendment 2)', () => {
    const queueContent = fs.readFileSync(path.join(root, 'app/composables/useReviewQueue.ts'), 'utf-8');
    expect(queueContent).toContain('isEconomicPhenomenon: preSnapshot.isEconomicPhenomenon');
    expect(queueContent).toContain('verificationStatus: preSnapshot.verificationStatus');
  });

  it('asserts draft history drawer has draft deletion confirmation modal (UX-011)', () => {
    const drawerPath = path.join(root, 'app/components/admin/synthesis/SynthesisDraftHistoryDrawer.vue');
    expect(fs.existsSync(drawerPath)).toBe(true);

    const content = fs.readFileSync(drawerPath, 'utf-8');
    expect(content).toContain('deleteConfirmOpen');
    expect(content).toContain('Hapus Draf Sintesis?');
    expect(content).toContain('askDelete');
    expect(content).toContain('confirmDelete');
  });

  it('asserts admin layout provides global period context badge for period-agnostic routes (UX-012)', () => {
    const layoutContent = fs.readFileSync(path.join(root, 'app/layouts/admin.vue'), 'utf-8');
    expect(layoutContent).toContain('isPeriodAgnosticRoute');
    expect(layoutContent).toContain('Pengaturan Global');
    expect(layoutContent).toContain('Lintas Periode');
  });

  it('asserts narrative editor provides official BRS print letterhead (UX-013)', () => {
    const editorPath = path.join(root, 'app/components/admin/synthesis/SynthesisNarrativeEditor.vue');
    expect(fs.existsSync(editorPath)).toBe(true);

    const content = fs.readFileSync(editorPath, 'utf-8');
    expect(content).toContain('hidden print:block');
    expect(content).toContain('Badan Pusat Statistik Kabupaten Tana Tidung • Fungsi Nerwilis');
    expect(content).toContain('Berita Resmi Statistik — Fenomena PDRB:');
  });
});
