import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseEconomicSnippetSegments } from '../app/utils/snippetHighlight';

describe('Sesi Fase 1 & 3: Responsive, Public Polish & Foundation', () => {
  it('parses snippet segments with locations and metrics for PublicArticleDetailModal', () => {
    const text = 'Pemerintah Kabupaten Tana Tidung mengalokasikan Rp 45,5 miliar untuk infrastruktur di Sesayap Hilir dengan pertumbuhan 5,2%.';
    const segments = parseEconomicSnippetSegments(text);

    const locations = segments.filter((s) => s.kind === 'location').map((s) => s.text);
    const metrics = segments.filter((s) => s.kind === 'metric').map((s) => s.text);

    expect(locations).toContain('Kabupaten Tana Tidung');
    expect(locations).toContain('Sesayap Hilir');
    expect(metrics).toContain('Rp 45,5 miliar');
    expect(metrics).toContain('5,2%');
  });

  it('prunes fonts to strictly used weights in nuxt.config.ts', () => {
    const configContent = fs.readFileSync(path.resolve(__dirname, '../nuxt.config.ts'), 'utf8');
    expect(configContent).toContain("name: 'Bricolage Grotesque', provider: 'google', weights: [600, 700, 800]");
    expect(configContent).toContain("name: 'Manrope', provider: 'google', weights: [400, 500, 600, 700]");
    expect(configContent).toContain("name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600, 700]");
  });

  it('verifies default layout removed duplicate search bar and links to filter-dock-search', () => {
    const defaultLayout = fs.readFileSync(path.resolve(__dirname, '../app/layouts/default.vue'), 'utf8');
    // Ensure the old duplicate input is removed
    expect(defaultLayout).not.toContain('id="public-header-search"');
    // Ensure keyboard shortcuts target filter-dock-search
    expect(defaultLayout).toContain("document.getElementById('filter-dock-search')");
  });

  it('verifies PublicFilterDock has filter-dock-search and accessible label', () => {
    const dockContent = fs.readFileSync(path.resolve(__dirname, '../app/components/public/PublicFilterDock.vue'), 'utf8');
    expect(dockContent).toContain('id="filter-dock-search"');
    expect(dockContent).toContain('for="filter-dock-search"');
  });

  it('verifies admin sidebar collapsed state is persisted with useCookie', () => {
    const adminLayout = fs.readFileSync(path.resolve(__dirname, '../app/layouts/admin.vue'), 'utf8');
    expect(adminLayout).toContain("useCookie<boolean>('sipena_sidebar_collapsed'");
  });
});
