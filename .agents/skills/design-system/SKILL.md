---
name: design-system
description: Token architecture, component specifications, and slide generation. Three-layer tokens (primitive→semantic→component), CSS variables, spacing/typography scales, component specs, strategic slide creation. Use for design tokens, systematic design, brand-compliant presentations.
argument-hint: "[component or token]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# Design System

Token architecture, component specifications, systematic design, slide generation.

## When to Use

- Design token creation
- Component state definitions
- CSS variable systems
- Spacing/typography scales
- Design-to-code handoff
- Tailwind theme configuration
- **Slide/presentation generation**

## Token Architecture

Load: `references/token-architecture.md`

### Three-Layer Structure

```
Primitive (raw values)
       ↓
Semantic (purpose aliases)
       ↓
Component (component-specific)
```

**Example:**
```css
/* Primitive */
--color-blue-600: #2563EB;

/* Semantic */
--color-primary: var(--color-blue-600);

/* Component */
--button-bg: var(--color-primary);
```

## Script Paths

Script and template paths below live inside this skill directory (`.agents/skills/design-system/scripts/...`, `.agents/skills/design-system/templates/...`, `.agents/skills/design-system/data/...`). Keep the working directory at the project root (or set `DESIGN_SYSTEM_PROJECT_ROOT` to your app root) so generated files write into your target project rather than polluting the skill folder.

## Quick Start

**Generate CSS/token outputs into your project:**
```bash
node .agents/skills/design-system/scripts/generate-tokens.cjs --config tokens.json -o app/assets/css/design-tokens.css
```

**Validate token usage against project source:**
```bash
node .agents/skills/design-system/scripts/validate-tokens.cjs --dir app/
```

## References

| Topic | File |
|-------|------|
| Token Architecture | [`references/token-architecture.md`](references/token-architecture.md) |
| Primitive Tokens | [`references/primitive-tokens.md`](references/primitive-tokens.md) |
| Semantic Tokens | [`references/semantic-tokens.md`](references/semantic-tokens.md) |
| Component Tokens | [`references/component-tokens.md`](references/component-tokens.md) |
| Component Specs | [`references/component-specs.md`](references/component-specs.md) |
| States & Variants | [`references/states-and-variants.md`](references/states-and-variants.md) |
| Tailwind Integration | [`references/tailwind-integration.md`](references/tailwind-integration.md) |

## Component Spec Pattern

| Property | Default | Hover | Active | Disabled |
|----------|---------|-------|--------|----------|
| Background | primary | primary-dark | primary-darker | muted |
| Text | white | white | white | muted-fg |
| Border | none | none | none | muted-border |
| Shadow | sm | md | none | none |

## Scripts & Tests

| Script | Purpose |
|--------|---------|
| [`scripts/generate-tokens.cjs`](scripts/generate-tokens.cjs) | Generate CSS variables from JSON token config |
| [`scripts/validate-tokens.cjs`](scripts/validate-tokens.cjs) | Check source directories for raw hardcoded visual values |
| [`scripts/embed-tokens.cjs`](scripts/embed-tokens.cjs) | Embed resolved CSS tokens into HTML artifacts |
| [`scripts/search-slides.py`](scripts/search-slides.py) | BM25 search + contextual slide deck recommendations |
| [`scripts/slide_search_core.py`](scripts/slide_search_core.py) | Core BM25 ranking & CSV index utilities used by `search-slides.py` |
| [`scripts/generate-slide.py`](scripts/generate-slide.py) | Render HTML slide decks using tokens + templates |
| [`scripts/slide-token-validator.py`](scripts/slide-token-validator.py) | Validate slide HTML token compliance |
| [`scripts/html-token-validator.py`](scripts/html-token-validator.py) | General HTML token compliance checker |
| [`scripts/fetch-background.py`](scripts/fetch-background.py) | Fetch background images from Pexels/Unsplash |
| `scripts/tests/` | Automated unit tests (`test_utf8_io.py`, `test_validate_tokens.py`) |

## Templates

| Template | Purpose |
|----------|---------|
| [`templates/design-tokens-starter.json`](templates/design-tokens-starter.json) | Starter JSON with three-layer primitive/semantic/component structure |

## Integration

- **Token sourcing:** Extract primitive/brand tokens from [`ui-ux-pro-max`](../ui-ux-pro-max/SKILL.md) (or optional bank skill `brand-identity` / `ui-styling`).
- **Tailwind v4 / Nuxt UI v3:** Map semantic/component tokens directly into `@theme` / `:root` CSS variables via [`tailwind-patterns`](../tailwind-patterns/SKILL.md) and [`nuxt-ui-vue-echarts`](../nuxt-ui-vue-echarts/SKILL.md).

## Slide System

Optional HTML deck generation system pairing design tokens + Chart.js + contextual CSV decision tables.

### Expected Project Artifacts (Created When Generating Slides)

When generating slide decks inside a target project, place outputs under the project's configured design/output paths (none of these project-output files are pre-bundled in the skill folder):
- **Brand doc (optional input):** project brand guidelines markdown (e.g., `DESIGN.md`)
- **Generated token artifacts:** project token JSON & stylesheet passed via `--config` / `-o`
- **CSS animations (project-defined):** animation utility sheet referenced by generated slides

### Slide Search (BM25)

```bash
# Basic search (auto-detect domain)
python .agents/skills/design-system/scripts/search-slides.py "executive briefing"

# Domain-specific search
python .agents/skills/design-system/scripts/search-slides.py "data trend" -d copy
python .agents/skills/design-system/scripts/search-slides.py "regional comparison" -d chart

# Contextual search
python .agents/skills/design-system/scripts/search-slides.py "summary slide" --context --position 2 --total 9
python .agents/skills/design-system/scripts/search-slides.py "cta" --context --position 9 --prev-emotion frustration
```

### Decision System CSVs

| File | Purpose |
|------|---------|
| [`data/slide-strategies.csv`](data/slide-strategies.csv) | 15 deck structures + emotion arcs + sparkline beats |
| [`data/slide-layouts.csv`](data/slide-layouts.csv) | 25 layouts + component variants + animations |
| [`data/slide-layout-logic.csv`](data/slide-layout-logic.csv) | Goal → Layout + break_pattern flag |
| [`data/slide-typography.csv`](data/slide-typography.csv) | Content type → Typography scale |
| [`data/slide-color-logic.csv`](data/slide-color-logic.csv) | Emotion → Color treatment |
| [`data/slide-backgrounds.csv`](data/slide-backgrounds.csv) | Slide type → Image category (Pexels/Unsplash) |
| [`data/slide-copy.csv`](data/slide-copy.csv) | 25 copywriting formulas (PAS, AIDA, FAB) |
| [`data/slide-charts.csv`](data/slide-charts.csv) | 25 chart types with Chart.js config |

### Contextual Decision Flow

```
1. Parse goal/context
        ↓
2. Query data/slide-strategies.csv → Strategy + emotion beats
        ↓
3. For each slide:
   a. Query data/slide-layout-logic.csv → layout + break_pattern
   b. Query data/slide-typography.csv → type scale
   c. Query data/slide-color-logic.csv → color treatment
   d. Query data/slide-backgrounds.csv → image if needed
   e. Apply animation utility classes defined by your theme
        ↓
4. Generate HTML with design tokens (generate-slide.py / embed-tokens.cjs)
        ↓
5. Validate with slide-token-validator.py / html-token-validator.py
```

### Pattern Breaking (Duarte Sparkline)

Decks alternate tension and resolution for engagement:
```
"What Is" (frustration) ↔ "What Could Be" (hope)
```

### Slide Requirements

**ALL slides MUST:**
1. Import your generated token stylesheet as the single source of truth
2. Use CSS variables: `var(--color-primary)`, `var(--slide-bg)`, etc.
3. Use Chart.js for HTML slide charts (or ECharts in Nuxt app views)
4. Include keyboard/click navigation + progress indicator
5. Maintain clean visual alignment and avoid unverified metrics

### Chart.js Integration

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<canvas id="revenueChart"></canvas>
<script>
new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
        labels: ['Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            data: [5, 12, 28, 45],
            borderColor: '#FF6B6B',  // Use brand coral
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            fill: true,
            tension: 0.4
        }]
    }
});
</script>
```

### Token Compliance

```css
/* CORRECT - uses token */
background: var(--slide-bg);
color: var(--color-primary);
font-family: var(--typography-font-heading);

/* WRONG - hardcoded */
background: #0D0D0D;
color: #FF6B6B;
font-family: 'Space Grotesk';
```

### Token & Slide Verification Summary

1. Author tokens in `tokens.json` (three-layer primitive → semantic → component hierarchy) and generate CSS via [`scripts/generate-tokens.cjs`](scripts/generate-tokens.cjs).
2. Audit component styles with [`scripts/validate-tokens.cjs`](scripts/validate-tokens.cjs) to catch raw hex values or spacing drift before delivery.
3. For standalone HTML briefings generated with [`scripts/generate-slide.py`](scripts/generate-slide.py), verify token compliance using [`scripts/slide-token-validator.py`](scripts/slide-token-validator.py) and [`scripts/html-token-validator.py`](scripts/html-token-validator.py). In live Nuxt UI views, map generated CSS variables into `@theme` and render charts via [`nuxt-ui-vue-echarts`](../nuxt-ui-vue-echarts/SKILL.md).

## Best Practices

1. Never use raw hex in components - always reference tokens
2. Semantic layer enables theme switching (light/dark)
3. Component tokens enable per-component customization
4. Use HSL format for opacity control
5. Document every token's purpose
6. **Slides must import design-tokens.css and use var() exclusively**
