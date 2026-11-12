---
name: nuxt-ui-vue-echarts
description: "Build and audit Nuxt 3/4 (Vue 3) interfaces using @nuxt/ui v3 (Reka UI primitives), Tailwind CSS v4, vue-echarts / echarts 6, motion-v, and Nitro H3 server runtime. Covers SSR hydration stability, Reka UI accessibility (USelectMenu, UModal, USlideover, UTable), client-safe ECharts lifecycle and Okabe-Ito colorblind-safe visualization, View Transitions, and Nitro runtimeConfig/PM2 production traps."
---

# Nuxt UI v3, Vue 3 & ECharts Guide

Stack-specific engineering rules for Nuxt 3.21+ (`future.compatibilityVersion: 4`), `@nuxt/ui` v3 (Reka UI + Tailwind CSS v4), `vue-echarts` v8 + `echarts` v6, `motion-v` v2, and Nitro H3 + PM2 single-instance deployments.

## 1. `@nuxt/ui` v3 & Reka UI Primitives

### SSR Hydration Safety & Accessible Naming

Reka UI generates random IDs on mount if none are provided and separates visual triggers from native `<select>` elements:

- **Explicit `<label id>` + `:aria-labelledby` on `USelectMenu`:** Reka UI triggers render `<button role="combobox">`, not `<select>`. Pair an explicit `<label :id="labelId">` (avoid mismatched `<label for>`) with `:aria-labelledby="labelId"` and deterministic `:id` props on inputs/selects inside modals or filter bars to prevent hydration mismatches and WCAG missing-label errors.
- **Native button/link semantics:** Keep interactive triggers as `<button type="button">` or `<NuxtLink>`. Do not attach `@click` to `<div>` or `<tr>` without a nested button/link and focus ring.
- **Single-theme enforcement (`ui.colorMode: false`):** When the project disables dark/light switching in `nuxt.config.ts`, author semantic CSS tokens in `app/assets/css/main.css` directly inside `@theme` instead of scattering `dark:*` variants or assuming `.dark` class toggles exist.
- **Accessible icon-only buttons:** Pass explicit `aria-label` (or `<span class="sr-only">`) to `<UButton icon="..." />` and mark decorative `<UIcon>` elements with `aria-hidden="true"`.

```vue
<script setup lang="ts">
const filterLabelId = 'kbli-filter-label';
const selectedCategory = ref<string | null>(null);
</script>

<template>
  <div>
    <label :id="filterLabelId" class="block text-xs font-medium text-slate-700">
      Kategori KBLI
    </label>
    <USelectMenu
      id="kbli-filter-select"
      v-model="selectedCategory"
      :aria-labelledby="filterLabelId"
      :items="categories"
      value-key="value"
      label-key="label"
    />
  </div>
</template>
```

### Overlays (`UModal`, `USlideover`, `UDropdownMenu`) & `UTable`

- **Wait for overlay animations in runtime checks:** Wait until focus settles and overlay CSS/Motion transitions finish before measuring bounding boxes, focus traps, or capturing automated screenshots.
- **Focus restoration & Escape dismissal:** Verify Escape closes the overlay and returns focus to the triggering element without body scroll leakage (`overscroll-behavior: contain`).
- **Tabular figures & accessible table markup:** Apply `.tabular-nums` (`font-variant-numeric: tabular-nums`) on numeric columns, dates, codes, and counters. Wrap wide tables in horizontally scrollable containers with visible focus/scrollbars and explicit `scope="col"` headers.

## 2. Vue 3 Lifecycle, SSR Boundaries & Data Fetching

- **Browser-only guards:** Never access `window`, `document`, `localStorage`, or start `setInterval`/`ResizeObserver` outside `onMounted` or `import.meta.client`. Always clean up timers and listeners in `onBeforeUnmount`.
- **Route/SSR data loading:** Use `useFetch` or `useAsyncData` with explicit stable keys when query params are reactive (`key: computed(...)` or `watch: [...]`). Keep reactive transforms pure; handle loading, empty, and error UI states explicitly instead of assuming non-null payloads.
- **Safe HTML rendering:** Avoid `v-html` on external or LLM-generated text. Parse markdown/structured spans into typed blocks (or sanitize strictly with an allowlist) before rendering Vue templates.
- **Page & View Transitions (`motion-v` + CSS):** Keep hero/above-the-fold content visible at SSR byte 0 (never start initial hero copy at `opacity: 0` waiting for JS hydration). Honor `@media (prefers-reduced-motion: reduce)` for CSS keyframes and `motion-v` transitions (`prefers-reduced-motion` prop / reduced duration).

## 3. `nuxt-echarts` & `vue-echarts` v8 (`echarts` v6)

### Client-Only Canvas Rendering & Zero CLS

- Always wrap `<VChart>` in `<ClientOnly>` with a fallback skeleton matching the final **explicit `min-height`** so SSR produces zero hydration mismatch and zero Cumulative Layout Shift (`CLS`).
- Use `autoresize` (or throttled `ResizeObserver`) only inside a container with deterministic height (`class="h-72 w-full"` or `min-h-[300px]`), never an unsized flex child without `min-w-0`.
- When configuring `echarts` tree-shaking in `nuxt.config.ts` (`echarts: { renderer: ['canvas'], charts: [...], components: [...], features: [...] }`), register every component and feature actually referenced in chart options (e.g., `GridComponent`, `TooltipComponent`, `LegendComponent`, `DataZoomComponent` if used) — unregistered components fail silently at runtime.

```vue
<ClientOnly>
  <VChart class="h-72 w-full" :option="chartOption" autoresize />
  <template #fallback>
    <div class="h-72 w-full rounded-xl bg-slate-100 animate-pulse" role="status" aria-label="Memuat grafik" />
  </template>
</ClientOnly>
```

### Accessibility, Contrast & Visualization Craft

- **Colorblind-safe series & >= 3:1 non-text contrast:** Prefer perceptually distinct palettes such as Okabe-Ito (`#0072B2`, `#009E73`, `#D55E00`, `#E69F00`, `#CC79A7`, `#56B4E9`, `#0F172A`) for multi-series distinction rather than relying on red-vs-green alone. Ensure adjacent bars/lines/sectors meet >= 3:1 contrast against the plot background (WCAG 1.4.11).
- **Empty/filtered states inside chart cards:** If series sums are all zero or filtered out, replace or overlay the canvas with an actionable empty state message (`aria-live="polite"`) explaining why no points appear and offering a reset action — never render blank white space under a chart header.
- **Decision-oriented tooltips & labels:** Format numbers via `Intl.NumberFormat('id-ID')`, state units explicitly in axis/tooltip formatters, and avoid rotated/overlapping axis labels on `< 390px` viewports.

## 4. Tailwind CSS v4 + Design Tokens

- **CSS-first configuration (`@import "tailwindcss"; @import "@nuxt/ui";`):** Define semantic tokens inside `@theme` (`--color-canvas`, `--color-surface`, `--color-ink-primary`, `--font-sans`) rather than legacy `tailwind.config.js` unless plugins require JS config.
- **Base layer interactivity:** Guarantee visible `:focus-visible` outlines (`outline: 2px solid ...; outline-offset: 2px`) and `cursor: pointer` on enabled native buttons/interactive controls without stripping focus indicators.

## 5. Nitro H3 Server & PM2 Production Traps

### `runtimeConfig` & `NUXT_*` Environment Override Trap

- Nitro maps `runtimeConfig.<camelKey>` automatically from `NUXT_<SNAKE_CASE>` environment variables at **runtime startup** (for `runtimeConfig.cronSecret` -> `NUXT_CRON_SECRET`; `runtimeConfig.databaseUrl` -> `NUXT_DATABASE_URL`).
- If `ecosystem.config.cjs` reads `.env` and sets `env: { CRON_SECRET, ... }` directly without aliasing missing `NUXT_*` keys (or if stale `NUXT_*` vars exist in the shell), `useRuntimeConfig()` can read stale or empty values! Always keep `NUXT_*` aligned in PM2 `env` and use `useRuntimeConfig()` inside event handlers/tasks (reading lazily, not assuming build-time `.env` baking).

### Validation, Scheduled Tasks & Streaming

- **Zod v4 validation in H3:** Use `getValidatedQuery(event, (q) => QuerySchema.parse(q))` and `readValidatedBody(event, (b) => BodySchema.parse(b))` for strict server boundaries; return safe error structures without stack traces.
- **PM2 fork mode for Nitro `scheduledTasks`:** If `nitro.experimental.tasks` runs scheduled crons in-process (`0 20 * * *`, etc.), deploy PM2 with `exec_mode: 'fork'` and `instances: 1` (or coordinate distributed locks in PostgreSQL) so crons do not execute twice concurrently.
- **SSE behind reverse proxies:** When returning Server-Sent Events or streaming progress logs from Nitro, set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `X-Accel-Buffering: no` so Nginx does not buffer progress frames until completion.

## Companion Skills

- [`kpi-dashboard-design`](../kpi-dashboard-design/SKILL.md) — Metric hierarchy, timeframe comparison, and anti-vanity rules.
- [`antislop-ui`](../antislop-ui/SKILL.md), [`antislop-human`](../antislop-human/SKILL.md), [`antislop-layoutmobile`](../antislop-layoutmobile/SKILL.md) — Visual/contrast/responsive delivery gates.
- [`zod-validation-expert`](../zod-validation-expert/SKILL.md) — Zod v4 schemas and `safeParse` error formatting.
- [`drizzle-orm-expert`](../drizzle-orm-expert/SKILL.md) — Lazy Proxy `pg.Pool` singleton and schema queries in Nitro.

