# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

An interactive, self-contained HTML artifact teaching the mental model of how LLMs work. Plain HTML/CSS/vanilla JS — **no build step, no server, no npm**. Opens by double-clicking `index.html`.

The **README.md** is the user-facing description. The **plan/spec** lives at `/Users/apple/.claude/plans/optimized-greeting-dusk.md` — read it before making any non-trivial changes; it captures every design decision the user has approved.

## Preview / "run"

Open `/Users/apple/LLM learning/index.html` in any modern browser. Everything works offline. There is no dev server, no test suite, no linter, no CI. Verification is **manual**: open the page, click through, verify the change.

If you need to vendor an external library (as was done with `gpt-tokenizer`), use `curl` from unpkg to download the UMD bundle into `assets/` — do **not** add a build step.

## Architectural baseline (softened — default frame, not the only one)

The teaching spine of the artifact is fixed. Do **not** deviate without user approval:

1. Tokens + position → 2. Attention → 3. Transformer blocks → 4. Inference loop → 5. **Four lenses** (weights / context / scaffolding / decoding) → 6. Training → 7. Eval → 8. Levers → 9. Diagnosis (capstone) → 10. Landscape (family orientation).

**Dense decoder-only is the default frame.** When a variant *materially* changes the mental model, it gets a full `.variant-branch` sub-section on the relevant page. When a variant leaves the mechanism mostly the same, a one-line inline note or `🌿 Variant note` callout is enough. *Same world, different block.*

The primary first-class variant is **MoE** (Mixture of Experts). It has full branches on `block.html`, `inference.html`, `training.html`, `levers.html`, and `diagnosis.html`, and a pointer + tile on the hub. Other architectures (encoder-decoder, SSM/Mamba, hybrid, RWKV/RetNet, text/media diffusion, multimodal) are covered in `landscape.html` as a family-level orientation.

## Locked component grammar (do not invent new patterns)

Six reusable components are defined once in `assets/styles.css` and decorated by `assets/shared.js`. Every page must reuse them:

- `callout-analogy` — 🔍 *Think of it like…* (analogy before the precise explanation)
- `callout-break` — ⚠️ *Where this breaks…* (when the analogy is imperfect)
- `callout-invariant` — 📐 *What this teaches (and what it doesn't)* (on every interactive widget)
- `callout-variant` — 🌿 *Variant note* (inline one-liners for minor variants)
- `variant-branch` (`.variant-branch` with `data-variant-label="🌿 …"`) — full sub-sections for variants that materially change the mental model (e.g. MoE inside `block.html`)
- `lens-tag` / `lens-box` — 🔭 *Which lens?* (tags concepts with one of the four lenses)

**Rule for variants:** one-liner when the mechanism is mostly the same; `variant-branch` when the mental model changes materially.

If a piece of content doesn't fit one of these, it's probably in the wrong place.

## Widget system

Every interactive widget lives in `assets/widgets.js` inside the IIFE. Contract:

- Mount point: `<div data-widget="<name>"></div>` in HTML.
- Registry: the `REGISTRY` map near the bottom of `widgets.js` maps widget names → mount functions.
- Each mount function **must**:
  - Declare an invariant via `callout-invariant` (what the widget teaches AND what it doesn't).
  - Look obviously illustrative — never pretend to be live model behavior. Probabilities / attention weights / positions are canned.
  - Follow the enhancement template: `makePresetRow()`, `makeToggleRow()`, `makeInspectPanel()`, `makeStatsRow()` + `updateStatsRow()`, `makeTieBack()` (all defined at the top of `widgets.js`).
  - Tie-back footer uses `{{deep}}` placeholder → `deep/` on the hub, `""` on deep pages.
- Cross-page widgets (e.g. tokenizer appears on hub and tokens.html) should accept config via `data-*` attributes.
- Use `var(--…)` for all colors — never hardcoded hex. This ensures dark mode works.

Current widgets: `tokenizer`, `inference-stepper`, `attention-hover`, `layer-stack`, `lens-sorter`, `training-stages`, `sampling`, `lora-rank`, `quantization`, `context-length`, `prefill-decode`, `rank-outputs`, `embed-sim`, `rope-rotation`, plus the five MoE widgets: `moe-router`, `moe-capacity`, `moe-active-total`, `moe-load-heatmap`, `moe-cost-compare`.

**Widget tiering (locked):** richness scales with conceptual leverage, not interface symmetry. Core-mechanism widgets (tokenizer, inference-stepper, attention-hover, sampling, moe-router, moe-capacity) earn the full template (presets + click-inspect + toggles + stats + tie-back). Peripheral widgets (rope-rotation, embed-sim, moe-cost-compare) stay tighter.

## File layout

```
index.html              — the hub (the whole mental model, ~30 min read, standalone)
deep/*.html             — one deep page per teaching-spine topic
README.md               — user-facing description
CLAUDE.md               — this file

assets/
  styles.css            — design tokens + all component styles (~2000 lines)
  widgets.js            — all 14 widgets + helpers (~2500 lines)
  shared.js             — el() / svg() helpers; callout decoration
  glossary.js           — hover-tooltip auto-wrap for glossary terms
  progress.js           — reading progress bar + heading anchors + back-to-top
  shortcuts.js          — keyboard shortcuts (← →, ?, Esc) + help modal
  theme.js              — dark/light toggle with localStorage
  nav.js                — top-bar hamburger menu (all pages)
  toc.js                — "On this page" side index (scroll-synced)
  search.js             — heading search palette (Cmd-K / /)
  search-index.js       — hand-maintained manifest of all H2s
  gpt-tokenizer.js      — vendored cl100k_base UMD bundle (~2 MB, DO NOT EDIT)
```

**Script-load order on every page** (order matters — some depend on DOM already containing glossary terms, etc.):

```html
<script src="assets/gpt-tokenizer.js"></script>  <!-- only on pages with the tokenizer widget -->
<script src="assets/shared.js"></script>
<script src="assets/widgets.js"></script>
<script src="assets/glossary.js"></script>
<script src="assets/progress.js"></script>
<script src="assets/shortcuts.js"></script>
<script src="assets/theme.js"></script>
<script src="assets/nav.js"></script>
<script src="assets/search-index.js"></script>
<script src="assets/search.js"></script>
<script src="assets/toc.js"></script>              <!-- only if multiple H2s -->
```

Deep pages prefix `../assets/`. Glossary page skips `glossary.js` (would self-loop).

## Design tokens (top of styles.css)

All spacing, font sizes, radii, shadows, and colors go through CSS variables declared in `:root` and overridden in `html[data-theme="dark"]`. **Never add a hardcoded color** — pick the closest token or propose a new one.

Key token prefixes: `--space-N` (4–64px), `--fs-{xs,sm,md,base,lg,xl,2xl}`, `--radius-{sm,md,lg}`, `--shadow-{sm,md,lg}`, `--lens-{weights,context,scaffold,decoding}(-brd)`, plus the palette (`--bg`, `--text`, `--accent`, `--analogy`, `--rule`, etc.).

Utility classes for widgets: `.w-row`, `.w-col`, `.w-caption`, `.w-panel`, `.w-stage-card`, `.w-prompt-display`, `.w-bar-row`, `.w-formula-out`, `.sorter-card`, `.rank-card`. Prefer these over inline `style: {…}` in widgets.js — dynamic values (computed widths, state colors) are the only legitimate reason to use inline styles.

## Teaching principles (treat as non-negotiable)

From durable user guidance:

- **The hub is the product, not a preface.** `index.html` must stand alone; deep pages are optional bonus. Don't make deep pages load-bearing for the mental model.
- **Decoder-only baseline. Variants are footnotes**, never part of the main line.
- **Four lenses are an active diagnostic frame, not decorative labels.** Tag concepts with them; use them to debug failures on the diagnosis page.
- **Runtime state (KV cache, activations) is NOT a fifth lens.** Keep it distinct from weights/context/scaffolding/decoding whenever the distinction could blur.
- **Diagnosis is the acceptance test.** If a real failure mode can't be reasoned about using this artifact, the artifact — not the diagnosis page — needs work.
- **Analogy first, precision second, "where it breaks" third** when a concept gets mechanical.
- **Every interactive must declare its invariant.** Obvious-illustrative > pretend-realistic.
- **Clarity, mechanism, transfer > polish, cleverness, extra detail.** Cut when in doubt.

## Common change patterns

- **Adding a new glossary term**: update `TERMS` in `assets/glossary.js` **and** add an entry to `deep/glossary.html`. Auto-wrap picks up the first 1–2 occurrences per page.
- **Adding a new heading-search entry**: update `assets/search-index.js` by hand (the index is static; there's no scanner).
- **Changing a widget**: edit `assets/widgets.js`. If the change affects multiple widgets' shared look, change the utility class in `styles.css`, not the widget code. Re-verify the widget appears correctly on every page that mounts it.
- **Adding a page**: add it to `deep/`, include the same `<script>` block at the bottom, add an entry to `nav.js` `PAGES` list, and add its H2s to `search-index.js`.
- **Adjusting visuals**: change the token in `:root` (and the dark-mode override). Widespread visual changes should almost never require editing multiple selectors.

## Non-goals (user has rejected these)

- No frameworks (React, Vue, htmx, Tailwind, anything with a build step).
- No mock/stub tokenizers — use the real `gpt-tokenizer` (cl100k_base).
- No CDN loading at runtime — vendor bundles locally.
- No body-text search (heading search only).
- No click-to-pin tooltips in this generation (hover only).
- No print stylesheet.
- No real-model inference (widgets stay illustrative).

## Do not skip

- **Ask before pre-deciding.** User has explicitly requested this twice — surface every non-trivial decision (heading wording, example choices, palette shifts, scope inclusions, tone) as an AskUserQuestion rather than making the call silently. "Deferred decisions" sections in plans are a red flag.
- **Stepwise approval.** User prefers to review each step before moving on. Complete one step, mark the task, report, then continue.
- **Keep the component grammar locked.** Do not introduce new callout types, new lens variants, new widget template patterns without discussion.

When in doubt, read the plan file at `/Users/apple/.claude/plans/optimized-greeting-dusk.md`.
