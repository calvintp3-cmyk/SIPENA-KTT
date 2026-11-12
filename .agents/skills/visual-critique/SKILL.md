---
name: visual-critique
description: >-
  Critique rendered screens, screenshots, mockups, or UI code across seven visual and UX dimensions:
  visual hierarchy, composition/gestalt, typography, color/contrast, information density, affordances,
  and brand consistency. Supports full 7-axis visual critique, focused 3-axis functional UX critique,
  or single-dimension critique. Use when reviewing or evaluating an existing screen, layout, or UI build.
---

# Visual Critique

Structured screen-level visual and UX critique consolidated across seven core dimensions. Read only the reference files needed for the requested critique mode.

## Modes & Workflows

### 1. Full Screen Critique (7 Dimensions)
Use when asked for a full visual/UX review of an existing screen, screenshot, Figma frame, or rendered route.
Evaluate in order, reading the corresponding reference file on demand:

1. **Visual Hierarchy** — Entry point, eye flow, weight distribution, emphasis → [`references/visual-hierarchy.md`](references/visual-hierarchy.md)
2. **Brand Consistency** — Alignment against `mood.md`, `voice.md`, `tokens.md`, or `DESIGN.md` (skip any missing file; never invent brand rules) → [`references/brand-consistency.md`](references/brand-consistency.md)
3. **Composition** — Balance, macro/micro whitespace, rhythm, and Gestalt grouping → [`references/composition.md`](references/composition.md)
4. **Typography** — Scale usage, readability, consistency, and token compliance → [`references/typography.md`](references/typography.md)
5. **Color** — WCAG AA contrast ratios, palette coherence, semantic color meaning, CVD safety → [`references/color.md`](references/color.md)
6. **Affordance** — Clickability signals, state visibility, CTA clarity, action discoverability → [`references/affordance.md`](references/affordance.md)
7. **Information Density** — Cognitive load, content priority, scanning patterns, progressive disclosure → [`references/information-density.md`](references/information-density.md)

### 2. Focused UX Critique (3 Dimensions)
Use for fast functional reviews or PM/product checks when full aesthetic critique is unnecessary:
1. **Visual Hierarchy** (`references/visual-hierarchy.md`)
2. **Affordance** (`references/affordance.md`)
3. **Information Density** (`references/information-density.md`)

Conclude with a single sentence summarizing the biggest functional risk on the screen.

### 3. Single-Dimension Critique
When the user asks specifically about type, color, hierarchy, layout balance, density, affordance, or brand compliance, load only that single reference file.

## Output Format

### Per-Dimension Rating & Notes
For each evaluated dimension, rate **`pass`**, **`minor issue`**, or **`major issue`**, and structure findings as:
1. **Observation** — neutral, factual description of what is rendered
2. **Problem** (or **Divergence**) — what is broken and why it matters
3. **Fix** — concrete, actionable change (exact token, sizing, ratio, or wording)

### Prioritised Fix List
Collect all flagged issues and rank by severity:
- **P1 — Critical**: Breaks usability, accessibility, task completion, or brand compliance; fix before shipping.
- **P2 — Important**: Degrades experience, slows scanning, or creates inconsistency; fix in current cycle.
- **P3 — Polish**: Minor visual refinement; address when capacity allows.

Each item includes:
- **Issue** (with file/element location when inspecting code)
- **Dimension** (`Hierarchy` / `Brand` / `Composition` / `Typography` / `Color` / `Affordance` / `Density`)
- **Fix** (concrete change)

End Full Screen Critique with a short overall assessment naming the strongest and weakest dimension.

## Companion Skills
- Need evidence-backed code plans with zero unverified claims? Use `improve-ui`.
- Need quantitative 0–10 judging, Nielsen heuristics, design debt/token audits, or browser QA? Use `design-judge-qa`.
- Need deterministic code-level AI-slop scanning? Use `kill-ai-slop` or `impeccable` (`critique` / `audit`).

