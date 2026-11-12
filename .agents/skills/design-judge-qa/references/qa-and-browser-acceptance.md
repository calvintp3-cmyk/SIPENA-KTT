# Implementation QA Checklist & Browser Acceptance

Use **Part 1** for any design-vs-implementation review checklist. Use **Part 2** only when browser execution / runtime QA / responsive inspection is explicitly requested or clearly required.

---

## Part 1: Design QA Checklist

Verify rendered builds against actual design specs (not memory) using real data and browser inspection tools.

### 1. Visual Accuracy
- Colors match semantic design tokens (no unintended hex overrides).
- Typography matches specified family, scale steps, weights, tracking, and line heights.
- Spacing, padding, gaps, and sizing match specs cleanly.
- Border radius, borders, shadows, and opacity follow defined tokens.
- Icons use consistent weight/sizing/color; images maintain intended aspect ratio, crop, and sharpness.

### 2. Layout & Reflow
- Grid alignment and visual edges line up across columns/rows.
- Responsive behavior holds at each target breakpoint.
- Text reflows properly without unexpected clipping, collision, or horizontal scrollbars.
- Minimum and maximum content widths (including readable measure) are respected.

### 3. Interaction & States
- All states render cleanly: `default`, `hover`, `focus`, `active`, `disabled`.
- Transitions and animations feel intentional and match timing specs.
- Click/touch targets meet minimum usable area (`>= 44×44px` on touch).
- Keyboard navigation works in logical DOM/visual order; visible focus rings on every interactive control.

### 4. Content & Edge States
- Real content fits without layout breakage (zero `lorem ipsum` or placeholder debug text).
- Text truncation/wrapping works as intended on long strings.
- Empty states, validation/error states, and loading skeletons display as designed.

### 5. Accessibility & Reduced Motion
- Screen reader roles/labels and semantic landmarks are accurate.
- Contrast meets WCAG AA (`>= 4.5:1` body text, `>= 3:1` large text & UI controls).
- Focus trapping and restoration work in dialogs/menus/drawers.
- `prefers-reduced-motion` is respected.

### 6. Cross-Platform & Environment
- Tested across target browsers and screen densities.
- Supports OS/browser text-size scaling without overlapping UI.

---

## Part 2: Executable Browser Acceptance Harness

### 1. Trigger Gate
Run executable browser acceptance **only** when the user explicitly asks for acceptance / browser QA / runtime testing / responsive verification across viewports / cross-browser inspection / visual regression / interaction testing.
- Do **not** run a heavy headless-browser harness merely for "review the code" or "critique this screenshot" — inspect supplied renders with [`references/judge-rubric.md`](judge-rubric.md) instead.

### 2. Resolve the Acceptance Contract
Infer from the project before asking questions:
- Entry URL or local start command (`package.json`)
- Critical routes / screens and primary interaction paths
- Required viewport(s) and target browser(s)
- Whether output is **report-only QA** or **QA + targeted repairs**

Use the project's existing dev/test tooling (`playwright-skill`, `browser-testing-with-devtools`, etc.) — never replace the stack or install new frameworks without consent.

Default viewports when responsive checks are requested without custom widths:

| Name | Viewport |
|---|---|
| Small mobile | 390 × 844 |
| Tablet | 768 × 1024 |
| Small laptop | 1280 × 720 |
| Desktop | 1440 × 900 |

### 3. Start Safely
1. Inspect `package.json` and project docs for the dev command.
2. Reuse an already-running local server when available.
3. Start only the minimum required local process and verify readiness; never modify production services or external data.

### 4. Automated Runtime Pass
- **Runtime:** Page loads cleanly; no new actionable console errors or hydration/framework mismatches; local assets, fonts, images, and primary requests succeed.
- **Layout:** Zero unintended horizontal overflow (`scrollWidth <= innerWidth`); primary CTA, navigation, and modals stay reachable; text does not clip or collapse; images hold aspect ratio.
- **Interaction:** Links/buttons complete primary flows; keyboard Tab order & visible focus hold; forms expose labels, validation, and error feedback; overlays open/close cleanly without focus traps; reachable loading/empty/error/disabled states verified.
- **Motion & Preferences:** Animations finish without blocking input; `prefers-reduced-motion` preserves readability and task completion.

### 5. Visual Pass
Inspect rendered screenshots at each target viewport for:
- Hierarchy and focal order; spacing rhythm and vertical/horizontal alignment.
- Design-token drift or repeated layout formulas.
- Contrast, legibility, awkward above-the-fold cuts, orphaned controls, or empty dead zones.
- *(Only call a comparison "visual regression" when a formal baseline image exists; otherwise call it "visual acceptance".)*

### 6. Repair Loop (If Authorized)
1. Record failure and exact viewport/state reproduction condition.
2. Apply the smallest causal fix (do not edit files if requested report-only QA).
3. Re-run the failed check at the same viewport/state plus a nearby smoke check.

### 7. Acceptance Report Format

```text
Acceptance scope:
Environment / URL:
Viewports / browsers:
Paths exercised:
Passed:
Repaired:
Remaining issues:
Evidence:
```

**Honesty rule:** Never claim browser acceptance from static code reading alone. State explicitly what ran in a real browser vs what was only statically inspected.

