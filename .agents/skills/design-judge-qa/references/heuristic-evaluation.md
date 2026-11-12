# Heuristic Evaluation & Targeted Audits

Use this reference to run an expert UX evaluation without recruiting test participants, pairing Jakob Nielsen's 10 Usability Heuristics (0–4 severity scale) with focused responsive, platform, and user-flow checks.

---

## 1. Nielsen's 10 Usability Heuristics

1. **Visibility of system status** — Users always know what is happening through timely, clear feedback (loading states, progress, active selection, confirmation).
2. **Match between system and the real world** — Uses the user's domain language, logical ordering, and familiar mental models instead of internal system jargon.
3. **User control and freedom** — Easy undo, redo, cancel, and escape hatches without losing context.
4. **Consistency and standards** — Internal visual/interaction consistency across screens and external adherence to platform/web conventions.
5. **Error prevention** — Prevent errors before they occur (constraints, clear defaults, confirmation dialogs on destructive/irreversible actions).
6. **Recognition rather than recall** — Keep visible options, contextual hints, labels, and state indicators instead of forcing memory across steps.
7. **Flexibility and efficiency of use** — Support accelerators (keyboard shortcuts, quick filters, bulk actions) for repeat/expert users while staying clear for novices.
8. **Aesthetic and minimalist design** — Remove irrelevant copy, decorative noise, or competing UI elements that dilute primary tasks.
9. **Help users recognize, diagnose, and recover from errors** — Plain-language error messages stating what happened and a concrete action to recover (no cryptic codes).
10. **Help and documentation** — Concise, searchable, task-oriented guidance surfaced right where friction occurs.

---

## 2. Severity Rating Scale (0–4)

- **0 — Not a usability problem:** Disagree that this is an issue at all.
- **1 — Cosmetic problem only:** Fix only if extra time is available on the project.
- **2 — Minor usability problem:** Low priority to fix; causes slight hesitation or annoyance.
- **3 — Major usability problem:** Important to fix; high priority — blocks or degrades task success.
- **4 — Usability catastrophe:** Imperative to fix before release — breaks critical task completion or risks data loss.

*(Optional prioritization modifiers: **Frequency** of user encounter + **Persistence** across sessions.)*

---

## 3. Evaluation Process

1. **Define scope** — List exact screens, routes, breakpoints, or task flows in scope.
2. **Walk through as a new user** — Check onboarding clarity, terminology, empty states, and discoverability.
3. **Walk through as an experienced user** — Check task speed, keyboard efficiency, defaults, and repetitive friction.
4. **Walk through each critical task flow** — Inspect user-flow branches, edge cases, error recovery, and exit states.
5. **Run accessibility spot-check** — Pair with keyboard navigation, contrast, semantics, and reduced-motion checks (escalate deep HTML/ARIA fixes to `fixing-accessibility` or `wcag-audit-patterns`).
6. **Document & rate each issue** using the format below.
7. **Compile and prioritize** — Rank by severity × frequency, and pair every finding with a concrete solution.

### Issue Documentation Format

For each finding, record:
- **ID / Location:** Screen, component, or selector/file path
- **Heuristic Violated:** e.g., `#5 Error prevention`
- **Severity:** `0–4`
- **Observation:** Objective evidence of what fails during the task flow
- **Recommendation:** Specific, actionable UI/flow fix

---

## 4. Targeted Audit Extensions (When Requested)

### Responsive Audit Angles
When evaluating across screen sizes, inspect each breakpoint (`390px`, `768px`, `1280px`, `1440px`) for:
1. Breakpoint reflow & layout grid integrity (no awkward collapses or clipped containers).
2. Typography scale & readable line length (`45–75ch`).
3. Spacing consistency and preserved visual hierarchy across viewports.
4. Minimum interactive/touch targets (`>= 44×44px` on touch surfaces) and zero unintentional horizontal overflow.

### Platform Convention Audit Angles (Native / Mobile)
When evaluating iOS / Android screens:
1. Navigation conventions (back behavior, tab bars, drawer vs modal expectations, safe/gesture zones).
2. Native control equivalents (toggles, pickers, sheets, dialogs) vs custom overrides.
3. System type/dynamic sizing and orientation changes.
4. Classify gaps into: **platform-mandated patterns**, **intentional brand departures**, and **unintended conflicts**.

## Best Practices
- Evaluate independently against real user tasks rather than edge-case curiosity.
- Critique the interface flow, never personal preference without usability rationale.
- Pair heuristic findings with usability testing or instrumented telemetry when validating ambiguous Severity 2–3 items.

