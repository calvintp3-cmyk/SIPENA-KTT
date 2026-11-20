// tests/fluid-craft-and-motion.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Fluid Motion, Frosted Glass & Apple-Style Segmented Control Suite', () => {
  it('verifies AppSegmentedControl component exists and implements full accessibility & keyboard navigation', () => {
    const compPath = path.resolve(__dirname, '../app/components/shared/AppSegmentedControl.vue');
    expect(fs.existsSync(compPath)).toBe(true);

    const compContent = fs.readFileSync(compPath, 'utf8');
    expect(compContent).toContain('role="group"');
    expect(compContent).toContain(':aria-label="ariaLabel"');
    expect(compContent).toContain(':aria-pressed="modelValue === item.value"');
    expect(compContent).toContain('handleKeydown');
    expect(compContent).toContain('ArrowRight');
    expect(compContent).toContain('ArrowLeft');
    expect(compContent).toContain('ResizeObserver');
  });

  it('verifies main.css includes tactile press, frosted glass tokens, and reduced-motion protection', () => {
    const cssPath = path.resolve(__dirname, '../app/assets/css/main.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    expect(cssContent).toContain('.tactile-press');
    expect(cssContent).toContain('.frosted-sidebar');
    expect(cssContent).toContain('.frosted-header');
    expect(cssContent).toContain('.contextual-actions');
    expect(cssContent).toContain('prefers-reduced-motion: reduce');
    expect(cssContent).toContain('backdrop-filter: blur(16px)');
  });

  it('verifies default layout and linimasa adopt frosted header and segmented control', () => {
    const defaultLayout = fs.readFileSync(path.resolve(__dirname, '../app/layouts/default.vue'), 'utf8');
    expect(defaultLayout).toContain('frosted-header');
    expect(defaultLayout).toContain('tactile-press');

    const linimasaPage = fs.readFileSync(path.resolve(__dirname, '../app/pages/linimasa.vue'), 'utf8');
    expect(linimasaPage).toContain('AppSegmentedControl');
    expect(linimasaPage).toContain('viewModeItems');
    expect(linimasaPage).toContain('quarterButtons');
  });

  it('verifies admin layout, review toolbar, and trends page integrate AppSegmentedControl and fluid tokens', () => {
    const adminLayout = fs.readFileSync(path.resolve(__dirname, '../app/layouts/admin.vue'), 'utf8');
    expect(adminLayout).toContain('frosted-sidebar');
    expect(adminLayout).toContain('frosted-header');
    expect(adminLayout).toContain('AppSegmentedControl');

    const reviewToolbar = fs.readFileSync(path.resolve(__dirname, '../app/components/admin/review/ReviewHeaderToolbar.vue'), 'utf8');
    expect(reviewToolbar).toContain('AppSegmentedControl');
    expect(reviewToolbar).toContain('scopeItems');
    expect(reviewToolbar).toContain('statusSegmentItems');

    const trendsPage = fs.readFileSync(path.resolve(__dirname, '../app/pages/admin/trends.vue'), 'utf8');
    expect(trendsPage).toContain('AppSegmentedControl');
    expect(trendsPage).toContain('modeItems');
    expect(trendsPage).toContain('dimensionItems');
    expect(trendsPage).toContain('metricItems');
    expect(trendsPage).toContain('tableFilterItems');
  });

  it('verifies ArticleTableList implements contextual row actions', () => {
    const tableList = fs.readFileSync(path.resolve(__dirname, '../app/components/admin/articles/ArticleTableList.vue'), 'utf8');
    expect(tableList).toContain('contextual-actions');
    expect(tableList).toContain('tactile-press');
  });
});
