# antislop Core Rules Reference

> Canonical core reference for `.agents/skills/antislop-ui`, `.agents/skills/antislop-human`, and `.agents/skills/antislop-layoutmobile`. Replaces the split core file while preserving original rule numbers (`C-1`..`C-5` and `R-01`..`R-40`) intact.

## 1. Design Read & Three Dials (Pre-Build Calibration)

Before writing UI or copy, record three explicit intent parameters matching the product and surface:

1. **Purpose Test:** State the screen's job and the primary decision or action the user completes there. Any section, metric, badge, or control that does not serve that job is removed or demoted.
2. **Design Read / Brand Identity:** Resolve tokens from `DESIGN.md` or the codebase's existing `@theme` / CSS variables (`Part 3`: one deliberate primary/accent system, whitespace as structure, and authentic identity motifs rather than template defaults).
3. **The Three Dials (1 to 3):**
   - **`RHYTHM` (`1` uniform/dense utility | `2` balanced variation | `3` editorial cadence):** Dictates whether section compositions and spacing scale visibly vary across bands.
   - **`MOTION` (`1` crisp hover/focus states only | `2` purposeful state & route transitions | `3` choreographed narrative entrances):** No endless pulse/float loops under dial `1` or `2`.
   - **`COLOR` (`1` restrained neutral + single accent | `2` dual semantic pairing | `3` rich expressive palette):** Never default to generic purple-cyan gradients (`R-01`, `R-29`).

---

## 2. Core Promises (`C-1` – `C-5`)

| ID | Core Promise | Requirement |
| :--- | :--- | :--- |
| **`C-1`** | **Intentional Identity** | Palette, typography, and iconography follow the product's documented design system (`DESIGN.md` / `@theme`), never default training-data clichés. |
| **`C-2`** | **Clear Visual Hierarchy** | Layout spacing, scale, elevation, and accent restraint guide the eye to the primary task without surface clutter. |
| **`C-3`** | **Purposeful Content Structure** | Every section, card, and chart earns its place from actual content and user decisions — never filler template scaffolding. |
| **`C-4`** | **The UI Holds Up** | Every view remains usable across viewports, zoom levels, themes, keyboard-only navigation, and missing/loading/error data states without color-only cues. |
| **`C-5`** | **Evidence Over Claims** | Metrics, deltas, social proof, logos, and statuses represent verified real data or explicitly labeled prototypes — never fabricated numbers or product costumes. |

---

## 3. Rules Index (`R-01` – `R-40`)

| Rule | Category | Mandate |
| :--- | :--- | :--- |
| **`R-01`** | Color & Gradients | Gradients and colored edge stripes require a written hierarchy/status purpose; default indigo-purple-pink glows and decorative stripes are forbidden. |
| **`R-02`** | Natural Prose | Copy reads in a specific, human voice rather than stiff boilerplate or templated AI cadences. |
| **`R-03`** | Responsive & Mobile Reflow | Layouts reflow intentionally across breakpoints with zero horizontal scroll leakage, clipped forms, or under-sized (< 44x44px) touch targets. |
| **`R-04`** | Iconography & Emoji Discipline | Strip decorative emoji from UI prose/headers/buttons; choose icons for content relevance with consistent stroke weight. |
| **`R-05`** | Layout Rhythm & Anti-Template | Section sequence and grids (including bento/multi-column cards and footer columns) follow real content structure and the `RHYTHM` dial. |
| **`R-06`** | Typography Choice | Choose sans/mono faces for brand character and readability, not default monospace-as-costume or wide-tracked uppercase filler. |
| **`R-07`** | Texture & Motif | Background grids, dots, or noise patterns require a documented identity motif reason; skip stock graph-paper textures. |
| **`R-08`** | Button Ornament | Keep directional arrows (`->` / `↗`) only on actions where direction adds clarity, never stamped blindly on every button. |
| **`R-09`** | Badge Restraint | Use pills/badges strictly for real taxonomy or functional status — cut redundant eyebrow pills and "AI Powered / Beta / New" spam above `<h1>`. |
| **`R-10`** | Glassmorphism Dose Cap | Limit `backdrop-filter` glass surfaces to at most 1–2 focal layers so foreground hierarchy stays sharp. |
| **`R-11`** | Border Radius System | Use a deliberate small radius scale matching component roles instead of pill-rounding every card, input, and container uniformly. |
| **`R-12`** | Elevation Discipline | Keep most surfaces flat on the canvas plane; reserve shadows as documented elevation markers for dialogs, popovers, or elevated controls. |
| **`R-13`** | Glow Restraint | Reserve glow effects for at most 1–2 focus/primary accents; keep normal cards, icons, and badges matte. |
| **`R-14`** | Card & Feature Hierarchy | Vary card footprint and presentation to mirror real feature weight instead of copy-pasted identical icon cards. |
| **`R-15`** | Specific CTAs | Button and link copy names the concrete user action ("Export Excel PDRB", "Verify Article"), never generic filler templates. |
| **`R-16`** | Anti-Buzzword Copy | Eliminate vague slogans ("Let's build something", inflated claims) from headings, empty columns, and onboarding copy. |
| **`R-17`** | Real Quantitative Metrics | Display only computed, live, or explicitly sourced metrics and comparison periods — never invented stat rows or "+12%" badges without backing series. |
| **`R-18`** | Authentic Social Proof & Feeds | Show real customer logos, real events, and real timestamps; ship honest empty states rather than synthetic activity feeds. |
| **`R-19`** | Purposeful Motion & No Loops | Match motion to the `MOTION` dial and UX intent; forbid endless bouncing, floating, or decorative pulsing loops on static indicators. |
| **`R-20`** | Decision-Centered App Shells | Structure admin/app screens around the primary operator workflow rather than defaulting to 4 KPI cards + chart + table blindly. |
| **`R-21`** | Theme Purpose | Choose fixed light, fixed dark, or working light/dark toggle from audience and reading ergonomics, not arbitrary "tech dark" default. |
| **`R-22`** | Meaningful Illustration | Include illustrations only with clear product/domain connection; otherwise use real UI previews or clean typography. |
| **`R-23`** | Honest Form Placeholders | Leave empty fields blank or use clear format hints (`email@example.com`), never fake persona data (`John Doe`) disguised as real input. |
| **`R-24`** | Real Navigation | Every navbar, sidebar, and footer link resolves to an active route/section or is clearly marked and disabled if unshipped. |
| **`R-25`** | WCAG AA Contrast & Charts | Meet >= 4.5:1 normal text contrast, >= 3:1 large text (18px+), and >= 3:1 non-text/chart/control boundary contrast across all states and overlays (compute, never guess). |
| **`R-26`** | Functional Interactive Controls | Every rendered button, select, tab, and row action executes real behavior (including Escape-closable dialogs) or is omitted/marked unshipped. |
| **`R-27`** | Complete UI States | Every async/data view handles **loading** (what is loading), **empty** (why empty + next action), and **error** (what failed + recovery step) across first-run, filtered, and forbidden cases. |
| **`R-28`** | *(Reserved core slot)* | Keeps numbering parity across companion `antislop-*` domain modules. |
| **`R-29`** | Palette Cap | Restrict active palette to 2–3 core neutrals/brand colors + 1 accent so emphasis stays unambiguous. |
| **`R-30`** | *(Reserved core slot)* | Keeps numbering parity across companion `antislop-*` domain modules. |
| **`R-31`** | Signal Over Ornament | Status dots, left bars, and highlight badges must denote real live/warning/active state; remove purely ornamental dots and stripes. |
| **`R-32`** | Full Keyboard Operability | Preserve logical DOM focus order, `Tab`/`Enter`/`Space`/`Escape` operability, modal focus trapping, and never suppress focus outlines (`outline: none`) without a visible `:focus-visible` replacement. |
| **`R-33`** | *(Reserved core slot)* | Keeps numbering parity across companion `antislop-*` domain modules. |
| **`R-34`** | Multi-State Focus Visibility | Focus rings must remain visible at >= 3:1 contrast on every interactive control across all themes and hover/selected states. |
| **`R-35`** | Responsive & Zoom Verification | Verify layout and reflow across narrow phones (320–390px), tablet widths (600–1024px), desktop, 200% text zoom, and runtime zero-console-error checks. |
| **`R-36`** | Measured Claims Only | Never report unmeasured Lighthouse/CWV numbers (`LCP`, `INP`, `CLS`), fake benchmarks, or fabricated claims — state `"not measured"` when lacking telemetry. |
| **`R-37`** | Conflict Protocol (Owner Override) | If a user brief, writing sample, or brand spec intentionally specifies a rule-restricted pattern (e.g., em dashes or fixed dark world), name the rule, confirm explicitly with the user, and follow the owner's confirmed decision without silently altering copy. |
| **`R-38`** | Prototype Honesty | Distinguish working product features from mocks/placeholders transparently; ship real legal/auth pages whenever signup or payments exist. |
| **`R-39`** | Interaction Affordances & Page Basics | Native semantic elements (`<button type>`, `<a href>`, `<label for>`), `cursor: pointer` on enabled controls, `disabled`/`aria-disabled`, `prefers-reduced-motion`, `<html lang>`, `<meta viewport ... initial-scale=1>` (zoom enabled). |
| **`R-40`** | Code-Level Rendering & Media Performance | Size all media (`width`/`height` or `aspect-ratio`), keep LCP hero `<img>` non-lazy (`fetchpriority="high"`), reserve async/embed heights against CLS, and avoid render-blocking head scripts. Field thresholds live in [CORE-WEB-VITALS.md](CORE-WEB-VITALS.md). |

---

## 4. Delivery Gate (Run Before Declaring UI Done)

1. Verify every active **`antislop-ui`**, **`antislop-human`**, and **`antislop-layoutmobile`** checklist item in the real DOM / rendered viewport.
2. Run programmatic contrast checks (`python .agents/skills/antislop-human/contrast-check.py <fg> <bg>`) on muted text, badge pills, gradients, and chart series.
3. Confirm `0` runtime console errors, working keyboard navigation, and complete Loading / Empty / Error / Permission UI states (`R-27`, `R-32`, `R-35`).
