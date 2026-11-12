---
name: design-judge-qa
description: >-
  Evaluate, score, and judge existing UI designs and implementations using quantitative rubrics
  (0-10 weighted 5-dimension scoring + 6-axis Hallmark vision judge), Nielsen's 10 usability
  heuristics (0-4 severity), design debt & token-drift audits, contextual AI failure-pattern checks,
  design-vs-build QA checklists, and executable browser acceptance testing. Use when asked to
  score, judge, benchmark, audit design debt/tokens, run heuristic evaluation, or QA a rendered UI.
---

# Design Judge & QA

Consolidated framework for evaluating, scoring, auditing, and QA-checking existing interfaces, prototypes, dashboards, and landing pages. Load only the reference file matching the requested evaluation mode.

**Core rule:** Critique and judge the design—not the designer—using observable evidence, concrete principles, and specific numeric/token fixes. Never fabricate metrics or claim browser verification from static code reading alone.

## Evaluation Modes & Routing

| Mode | When to Use | Read Reference |
| :--- | :--- | :--- |
| **1. Design Judge & Scoring** | "Score this UI", "rate/judge this page", comparing design variants, hero/finish review of rendered screenshots | [`references/judge-rubric.md`](references/judge-rubric.md) |
| **2. Heuristic Evaluation** | Solo expert UX review without test participants; scoring usability across Nielsen's 10 heuristics (0–4 severity) | [`references/heuristic-evaluation.md`](references/heuristic-evaluation.md) |
| **3. Design Debt & Token Audit** | Auditing accumulated UI inconsistencies across screens, or measuring CSS/design-token coverage vs hardcoded drift | [`references/debt-and-token-audit.md`](references/debt-and-token-audit.md) |
| **4. Implementation QA & Browser Acceptance** | Design-vs-build verification checklist, OR user explicitly requests browser QA, responsive check, or runtime acceptance | [`references/qa-and-browser-acceptance.md`](references/qa-and-browser-acceptance.md) |
| **5. Contextual AI Failure Patterns** | Checking dashboards, marketing pages, typography, imagery, or motion for recurring AI-default failure modes | [`references/failure-patterns.md`](references/failure-patterns.md) |

## Deterministic Checkers (Optional CLI Companions)

When running on a local codebase or dev server, pair visual/heuristic judgment with deterministic scanners before delivering a final verdict:

1. **AI Slop Code Scanner** (active skill `kill-ai-slop`):
   ```bash
   node .agents/skills/kill-ai-slop/scripts/scan.mjs <root>
   ```
2. **Impeccable Detector** (active skill `impeccable`):
   ```bash
   .agents/skills/impeccable/scripts/impeccable detect --json <target>
   ```
3. **Hallmark Sloplint** (if the full Hallmark bank skill exists at `000 - SKILLS_cleaned/02-ui-ux-design/hallmark`):
   ```bash
   node "000 - SKILLS_cleaned/02-ui-ux-design/hallmark/scripts/sloplint.mjs" <target> --scope app --render
   # Or against a running dev server:
   node "000 - SKILLS_cleaned/02-ui-ux-design/hallmark/scripts/sloplint.mjs" --url http://localhost:3000 --scope app
   ```
4. **WCAG Contrast Checker** (if available at `000 - SKILLS_cleaned/02-ui-ux-design/antislop-human/contrast-check.py`):
   ```bash
   python "000 - SKILLS_cleaned/02-ui-ux-design/antislop-human/contrast-check.py" "#FOREGROUND" "#BACKGROUND"
   ```

## Companion Skills
- For 7-dimension screen critique (`Hierarchy`, `Brand`, `Composition`, `Typography`, `Color`, `Affordance`, `Density`): use `visual-critique`.
- For strict read-only product surface audits and self-contained implementation plans: use `improve-ui`.
- For targeted HTML/ARIA or animation-performance code fixes: use `fixing-accessibility` or `fixing-motion-performance`.

