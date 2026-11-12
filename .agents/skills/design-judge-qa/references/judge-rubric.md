# Design Judge & Scoring Rubrics

Use this reference when judging, scoring, or reviewing rendered UI artifacts or screenshots. Combines two complementary scoring systems:

1. **5-Dimension Quantitative Rubric (0–10)** — Best for dashboards, SaaS product UI, landing pages, slides, prototypes, and actionable critique reports.
2. **Hallmark 6-Axis Vision Judge & Review Lenses (1–5 + 1–10)** — Best for strict visual/screenshot judging against AI-slop templates, hero posture, and before/after redesign comparisons.

---

## Part 1: 5-Dimension Quantitative Rubric (0–10)

### 1. Philosophy Alignment
How well does every detail trace back to the chosen design direction or product identity?

| Score | Standard |
|---|---|
| 9–10 | Every detail embodies the chosen philosophy; nothing reads as "borrowed from elsewhere" |
| 7–8 | Direction is correct, signature traits land, 1–2 minor drift moments |
| 5–6 | Intent visible, but mixed-in foreign elements dilute purity (e.g., "minimalism" with 6 cards per row) |
| 3–4 | Surface mimicry only; underlying values aren't understood |
| 1–2 | No discernible relationship to any stated direction |

Check: Do color, type, layout, and motion agree on the same philosophy? Are there self-contradicting elements?

### 2. Visual Hierarchy
Does the eye flow where intended?

| Score | Standard |
|---|---|
| 9–10 | Eye flows naturally along the intended path; zero friction reading the information |
| 7–8 | Primary/secondary clear; 1–2 spots where hierarchy is muddy |
| 5–6 | Title vs. body distinguishable, but middle layers (subtitles, captions) collapse together |
| 3–4 | Information sits flat with no clear entry point |
| 1–2 | Chaotic — viewer doesn't know where to look first |

Check: Title/body size ratio >= 2.5x (4–6x for hero), 3–4 clear levels via weight/color/size, whitespace guiding the eye, passes the **squint test**.

### 3. Craft Quality
Pixel-level execution: alignment, spacing, color discipline.

| Score | Standard |
|---|---|
| 9–10 | Pixel-perfect; alignment, spacing, color all flawless |
| 7–8 | Refined overall; 1–2 minor alignment or spacing issues |
| 5–6 | Basically aligned, but spacing is inconsistent and color use is unsystematic |
| 3–4 | Obvious alignment errors, chaotic spacing, too many colors |
| 1–2 | Sloppy — looks like a draft |

Check: Consistent spacing scale (e.g., 8pt/4pt grid), identical spacing for same-class elements, controlled color count (<= 4 semantic roles + neutral scale), font families <= 2 (plus optional mono for data/code), precise edge alignment.

### 4. Functionality
Does each element earn its place?

| Score | Standard |
|---|---|
| 9–10 | Every element serves a goal; zero redundancy |
| 7–8 | Function-led overall, with minor decoration that could be cut |
| 5–6 | Usable, but obvious decorative elements compete for attention |
| 3–4 | Form > function; users have to work to find information |
| 1–2 | Decoration drowns the content's ability to communicate |

Check: **Deletion test** ("If I delete this element, does the design get worse?" If no → delete), CTA/primary data in most prominent spot, density appropriate for medium.

### 5. Originality
Avoids clichés while staying coherent within the philosophy.

| Score | Standard |
|---|---|
| 9–10 | Refreshing; finds a unique expression *within* the chosen philosophy |
| 7–8 | Has its own ideas; not template-by-numbers |
| 5–6 | Average; reads as a template execution |
| 3–4 | Heavy use of clichés (gradient orbs for "AI", chat bubbles, generic stat-card rows) |
| 1–2 | Pure template / stock-asset assembly |

### Per-Output-Type Weighting

| Output type | Most important | Secondary | Can relax |
|---|---|---|---|
| Landing page / marketing site | Functionality, Visual hierarchy | Originality | — (must be all-around) |
| Dashboard / data product | Functionality, Craft quality | Visual hierarchy | Originality (clarity wins) |
| HTML slide deck | Visual hierarchy, Functionality | Craft | Originality (legibility wins) |
| Mobile app prototype | Functionality, Craft | Visual hierarchy | Philosophy alignment (usability wins) |
| Brand launch animation / hero film | Originality, Visual hierarchy | Philosophy | Functionality (moment over form) |
| Editorial / portfolio | Originality, Philosophy | Visual hierarchy | Functionality (vibe matters most) |
| Documentation site | Functionality, Visual hierarchy | Craft | Originality (find-the-answer wins) |
| Interactive prototype for user testing | Functionality, Visual hierarchy | Craft | Originality (testing flow, not look) |

### Top 10 Common Issues Checklist
1. **AI-tech cliché** (gradient orbs, digital rain, robot faces) → replace with real product evidence or domain metaphors.
2. **Insufficient type-size hierarchy** (title/body < 2.5x) → enforce >= 3x ratio for major headings.
3. **Too many colors** (5+ uncoordinated hues) → limit to 1 primary + 1 secondary/accent + neutral scale.
4. **Inconsistent spacing** (ad-hoc padding/gaps) → snap to spacing scale (`{8, 16, 24, 32, 48, 64, 96}`).
5. **Insufficient whitespace** (every region stuffed) → target >= 40% breathing space (60%+ for minimalist).
6. **Too many fonts** (3+ families) → cap at <= 2 families (+ optional mono for tabular data/code).
7. **Inconsistent alignment** (random mixing of left/center/right) → pick one primary alignment (usually left).
8. **Decoration eclipses content** (heavy backgrounds/shadows/gradients) → apply deletion test.
9. **Cyber-neon overuse** (`#0D1117` + neon-glow defaults) → pick a grounded neutral/tinted palette.
10. **Density mismatch to medium** (wall of text on slides; excessive whitespace on dense ops dashboards).

### Critique Output Template

```markdown
## Design Critique

**Overall: X.X / 10** [Excellent (8+) / Good (6–7.9) / Needs work (4–5.9) / Failing (<4)]

**By dimension**:
- Philosophy alignment: X / 10 — [one-sentence reason]
- Visual hierarchy: X / 10 — [one-sentence reason]
- Craft quality: X / 10 — [one-sentence reason]
- Functionality: X / 10 — [one-sentence reason]
- Originality: X / 10 — [one-sentence reason]

### Keep
- [Specific strengths in design language]

### Fix (sorted by severity)
**1. [Issue name]** — ⚠️ Critical / ⚡ Important / 💡 Polish
- Current: [observed state]
- Why: [impact anchored in design principle]
- Fix: [concrete change with exact values/tokens]

### Quick Wins (top 3 if you only have 5 minutes)
- [ ] [Highest-impact, lowest-effort change]
- [ ] [Second]
- [ ] [Third]
```

**Critique Anti-Patterns:** No vague taste claims ("colors are off"), no empty praise ("looks great!"), never mix severity tiers, cap Fix items at <= 7 (group repetitive issues), always cite the underlying principle, and critique the design rather than the designer.

---

## Part 2: Hallmark 6-Axis Vision Judge & Review Lenses

Use this stricter vision-judge lens when scoring rendered desktop (1280x800 / 1440x900) and mobile (375px) screenshots for AI-slop tells and structural distinctiveness.

### 6-Axis Score (1–5 Integers) + Overall (1–10)
- **Philosophy (1–5)**: Does the page commit to one coherent aesthetic point of view, or is it a generic template?
- **Hierarchy (1–5)**: Clear reading order with decisive size/weight/spacing contrast; survives the squint test?
- **Execution (1–5)**: Craft quality of type, spacing, alignment, color; absence of broken, clipped, or overflowing layout?
- **Specificity (1–5)**: Does content and imagery belong to THIS product, or could an unrelated product use it unchanged?
- **Restraint (1–5)**: Does every decorative element earn its place, or is there noise (gradient soup, glow spam, icon confetti, eyebrow pill spam)?
- **Variety (1–5)**: Does layout structure feel distinct from the default AI page shape (hero, three cards, stats, CTA)?

### Judged Visual Gates (`pass` / `fail` / `unclear` — `fail` means defect is present)
- **Gate 6 (Centred-everything hero)**: Headline, subhead, CTAs all centre-stacked with no compositional asymmetry (where unmotivated).
- **Gate 9 (Undifferentiated rhythm)**: Every section has the same width, same padding, same centred layout, no tempo change.
- **Gate 42 (AI-default nav)**: Generic logo-left, links-center/right, pill-CTA nav indistinguishable from stock templates.
- **Gate 43 (AI-default footer)**: Four-column link farm plus social icons with filler links.
- **Gate 81 (Empty or counterfeit picture)**: A gradient box, wash, or hand-drawn SVG illustration standing where a photograph or real product UI belongs.

### Review Lenses by Surface & Stage

1. **First-Screen / Hero Review** (answer `ship` or `fix`, max 5 findings worst-first):
   - Does the headline say something specific to this product in <= 7 words?
   - Are headline, 1-sentence value prop, primary action, and focal visual all visible at 1280x800 without scrolling?
   - Is there template clutter: pill/eyebrow above H1, gradient blob, empty box, or two competing filled buttons?
   - Delete the picture mentally: if the screen still communicates the exact same thing, the visual is too weak or too small.

2. **Full-Page Finish Review** (answer `recapture` / `rebuild` / `fix` / `ship`, max 8 findings ranked by cost):
   - Scroll the 1440px view one screen at a time before ranking: a screen with no structural anchor (adrift headline, tiny `h2` under 40px, narrow column beside empty half) outranks minor detail tweaks.
   - Check copy specificity: flag any heading that would pass unchanged on a competitor's page.
   - **App screens (`shape: app screen`)**: Skip marketing hero/fold rules. Evaluate at 1440px and 375px: Is the primary decision hierarchy clear? Is density even? Do all controls and tables work on mobile? Are loading, empty, error, and disabled states present?
   - **Redesign / Before-vs-After comparison**: Check what the old page did better—name anything a user could do, read, or find before that became harder after the redesign.
   - Close with one line naming **what must not be diluted** while fixing.

