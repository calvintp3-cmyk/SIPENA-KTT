# Design Debt & Token Audit

Use this reference when auditing accumulated UI inconsistencies across screens, triaging legacy patterns before a redesign, or measuring design-token coverage vs hardcoded CSS/style drift.

---

## Part 1: Design Debt Audit

Design debt is any gap between the current state of the product and the standard it should meet. Separate **auditing** (inventory & triage) from **remediation** (fixing).

### Categories of Design Debt

1. **Visual Inconsistency Debt**
   - Product components deviating from the design system (off-scale color, spacing, radius, or type).
   - Multiple visual treatments for the exact same interaction (e.g., three button styles or modal wrappers doing the same job).
   - Legacy UI predating the current design system.
2. **Structural Debt**
   - Patterns built for an earlier product scope that no longer scale to current complexity.
   - Navigation patched with ad-hoc items that broke the underlying Information Architecture (IA).
   - Features shipped in silos without holistic integration, creating UX islands.
3. **Accessibility Debt**
   - Known WCAG violations, components that look okay visually but fail with keyboard or screen readers, missing focus management.
4. **Documentation Debt**
   - Components live in production but undocumented in the design system; design specs out of sync with code.
5. **Technical / Implementation Debt (Design-Relevant)**
   - Hardcoded CSS/utility values instead of semantic tokens.
   - Divergent cross-platform implementations with no documented rationale.

### 5-Step Audit & Prioritization Process

1. **Scope and Inventory:** Define scope (full app, feature area, or surface), capture every screen/state in scope, catalog by screen or component type.
2. **Classify Debt:** Tag each item with:
   - **Severity:** `Critical` (accessibility barrier, major structural break) / `Moderate` (visual inconsistency, legacy pattern) / `Minor` (polish, edge case)
   - **Category:** `Visual` / `Structural` / `Accessibility` / `Documentation` / `Implementation`
   - **Frequency:** Instance count across the codebase/screens
   - **Effort to fix:** `Low` / `Medium` / `High`
3. **Quantify Impact:** Count total instances per issue, estimated user reach, and compliance/trust risk.
4. **Prioritize:** Rank using:
   `Priority Score = (Severity × Frequency) / Effort`
5. **Remediation Plan:**
   - **Quick wins:** Low-effort, high-frequency cleanups (token replacements, duplicate button normalization, label fixes).
   - **Accessibility backlog:** Fix Critical WCAG blockers first, schedule Moderate rolling fixes.
   - **Structural projects:** Larger IA/navigation/component overhauls requiring dedicated roadmap milestones.
   - **Deferred / Write-off:** Low-traffic debt soon replaced by a scheduled redesign — document explicitly and defer.

### Debt Register Fields
Track findings in a living register with: **Issue description**, **Category & severity**, **Affected screens/components/files**, **Status** (`open`, `in progress`, `resolved`, `deferred`), **Owner**, and **Target resolution**.

---

## Part 2: Design Token & Design System Audit

Audit how design tokens and system primitives are actually used in code and design specs, surfacing hardcoded drift, tier misuse, and missing token steps.

### Audit Dimensions

1. **Token Coverage**
   - What percentage of visual properties (`color`, `spacing`, `typography`, `radius`, `elevation`) reference tokens vs raw hex/px/rem literals?
   - Which properties are most frequently hardcoded?
   - Are tokens applied at the right tier (**primitive/global** vs **semantic** vs **component**)? (Screens should consume semantic tokens, rarely raw palette primitives.)
2. **Token Consistency**
   - Are the same semantic tokens applied to the same intent across views?
   - Are there redundant tokens (different names resolving to identical values)?
   - Are deprecated tokens still referenced?
3. **Token Gaps & Scaling Drift**
   - Which recurring hardcoded values should be promoted to tokens?
   - Do ad-hoc spacing/font overrides expose missing scale steps or uncontrolled overrides?
4. **System Completeness & Theming** *(when auditing a component library)*
   - Consistent naming conventions across components/tokens.
   - All interactive & feedback states covered (`default`, `hover`, `focus`, `active`, `disabled`, `loading`, `empty`, `error`).
   - Theme / dark-mode token parity (no light-mode-only hardcoded colors).

### 6-Step Token Audit Workflow

1. **Inventory:** Extract visual values and token definitions across CSS, Tailwind config/theme variables, and component files.
2. **Categorize:** Group findings by `Color`, `Spacing`, `Typography`, `Radius`, `Elevation/Border`, `Motion`.
3. **Map:** Match raw hardcoded values to existing semantic tokens.
4. **Flag:** Identify bypasses, raw-primitive leaks, redundant aliases, and token gaps.
5. **Prioritize:** Focus on high-impact visual drift first (**Color** and **Spacing** before edge tokens), ranked by frequency × surface visibility.
6. **Recommend:** Provide exact token replacements (`hardcoded -> token`), deprecated cleanups, and missing scale additions.

### Report Format
- **Executive Summary:** Estimated token adoption %, top drift categories, high-level system health.
- **Findings by Category:** Visual Debt vs Token Drift vs System Gaps.
- **Hardcoded Value Inventory:** Exact file/line, current hardcoded literal, and suggested semantic token replacement.
- **Prioritized Remediation Roadmap:** Quick wins vs structural cleanup.

