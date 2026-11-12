# Adaptive Extraction & Parsing Patterns (`D4Vinci/Scrapling`)

Extraction concepts from **`D4Vinci/Scrapling`**, translated into language-agnostic / TypeScript (`cheerio`) survival techniques for brittle news sites — plus guidance on when to bring in Scrapling's Python tooling or official Agent Skill.

---

## 1. Core Problem Scrapling Solves: Brittle DOM Selectors

News portals routinely rotate theme classes (`.td_module_wrap` → `.jeg_post`, `.read__content` → `.detail__body-text`). Hardcoding one brittle selector breaks ingestion silently.

Scrapling's design teaches **three levels of extraction resilience**:

### Layer 1: Semantic Structured Metadata First (Zero DOM Drift)
Always extract from standards that rarely change across theme redesigns:
1. **RSS / WordPress Feeds** (`/category/.../feed/`, `<content:encoded>`, `<pubDate>`).
2. **JSON-LD (`script[type="application/ld+json"]`)** — `headline`, `datePublished`, `articleBody`, traversing `@graph` arrays safely inside `try/catch`.
3. **OpenGraph & Microdata** — `meta[property="og:title"]`, `meta[property="article:published_time"]`, `meta[itemprop="articleBody"]`, `link[rel="canonical"]`.

### Layer 2: Scored Multi-Selector Content Discovery (TypeScript/`cheerio` Adaptation)
Instead of stopping at the first `.article` match (which might be a header card or sidebar), score candidate containers in priority order:

```typescript
const CONTENT_CANDIDATES = [
  'article .entry-content',
  '.entry-content',
  '.post-content',
  '.read__content',
  '.detail__body-text',
  '[itemprop="articleBody"]',
  'article',
  'main',
];

// Strip chrome & related widgets BEFORE scoring containers
$(NOISE_SELECTORS).remove();

let bestContainer = $('body');
let bestWords = 0;
for (const selector of CONTENT_CANDIDATES) {
  const candidate = $(selector).first();
  const words = countCleanWords(candidate.text());
  if (candidate.length > 0 && words >= 30) {
    bestContainer = candidate;
    bestWords = words;
    break;
  }
}
```

If container `<p>` extraction falls below threshold (`< 30` words, common on portals using `<br>` or bare `<div>` blocks), fall back to line-by-line container text splitting with minimum line length filters (`>= 25 chars`), stripping boilerplate lines (`^Baca juga:`, `^Editor:`, short uppercase datelines).

### Layer 3: Element Similarity Fingerprinting (`auto_save` / `adaptive` Concept)
When monitoring a recurring page whose CSS classes keep mutating, Scrapling's adaptive algorithm scores DOM nodes by structural traits rather than class names alone:
- Tag hierarchy + parent/sibling neighborhood
- Semantic attributes (`itemprop`, `role`, `data-*`, ARIA landmarks)
- Text density ratio (prose characters vs link/button chrome characters)

*(Useful upgrade idea for TypeScript extractors: if explicit `CONTENT_CANDIDATES` all fail on a redesigned portal, implement a lightweight Readability-style sibling `<p>`-density scorer that picks the `<div>`/`<section>` containing the highest aggregate non-link `<p>` word count.)*

---

## 2. Budgeted Text Truncation for LLM Classification

Long multi-page news articles waste LLM context & TPM limits:
- Store `300–450` clean words (`~2,800 chars`) in DB for human operator inspection.
- Trim input sent to LLM prompts down to `~280–300` words (`~1,900 chars`) **on sentence boundaries** (searching backward in the final 40% of the candidate buffer for `.`, `!`, or `?`), preserving lead facts, entities, numbers, and location while saving ~30% tokens.

---

## 3. Optional Python Integration (`D4Vinci/Scrapling` Skill & MCP)

Only introduce Scrapling directly if your project runs Python workers or needs a dedicated external browser/stealth sidecar for heavily JS-rendered sites where static HTTP + `cheerio` genuinely yields empty DOM payloads:

- **Official Agent Skill (for writing Python Scrapling code):**
  ```bash
  npx skills add D4Vinci/Scrapling --skill scrapling-official
  ```
- **Local MCP Server (on-demand agent fetching):**
  ```bash
  pip install "scrapling[ai]" && scrapling install
  # Run via uvx scrapling mcp
  ```
- Keep **Tier-1 HTTP + Cheerio** as the default for Node/Nuxt backends; escalate to Python/Playwright only when SSR HTML actually lacks content.

