# LLM Learning — an interactive mental model

> A first-principles mental model of how LLMs work — architecture first, then the levers you can pull.

## Why we're building this

You can use LLMs for years and still not know what's actually happening inside them. Most explanations either punt to math ("it's just matrix multiplies") or stay at glib metaphors ("it predicts the next word"). Neither builds the kind of working intuition that lets you reason about real decisions.

**The goal of this artifact is a functional mental model** — enough understanding of the mechanism to answer questions like:

- *Should I LoRA-fine-tune or full fine-tune for this?*
- *What does 4-bit quantization actually cost me?*
- *Why does context extension break past the trained length?*
- *When a model "forgets" something, is that weights, context, scaffolding, or decoding?*
- *Why is my LLM sometimes random and sometimes deterministic?*

These aren't math questions. They're mechanism questions. This artifact builds the mechanism, analogy-first, then connects it to every lever you'd actually pull.

## What we're building

A self-contained set of HTML/CSS/vanilla-JS files — no build step, no server, no framework. Opens by double-clicking `index.html`.

```
LLM learning/
├── index.html              ← Hub: the whole mental model in one page
├── assets/
│   ├── styles.css          ← Warm-notebook aesthetic
│   ├── shared.js           ← Callout/lens-tag component decoration
│   └── widgets.js          ← 14 interactive widgets
└── deep/
    ├── tokens.html         ← Tokens, embeddings, positional encoding
    ├── attention.html      ← Q/K/V, multi-head, causal autoregressive
    ├── block.html          ← Transformer block, residual stream, depth
    ├── inference.html      ← Forward pass, KV cache, prefill/decode
    ├── training.html       ← Pretraining → SFT → RLHF/DPO
    ├── eval.html           ← How do we know a change helped?
    ├── levers.html         ← Fine-tune, quantize, context, prune, decode
    ├── diagnosis.html      ← Capstone: 10 failure modes → which lens, what to try
    └── glossary.html       ← Alphabetical reference
```

### The hub is the product

`index.html` is a standalone ~30-minute read. You can read it top-to-bottom and walk away with the full mental model without ever opening a deep-dive page. Each of its nine sections ends with a *"→ go deeper"* link for when you want more, but those pages are optional.

The hub covers, in order:

0. **What an LLM really is** — a function called in a loop.
1. **Tokens, embeddings, and position** — how text becomes numbers with order.
2. **Attention** — how tokens look at each other.
3. **The transformer block** — attention + MLP + residual, stacked N times.
4. **The full inference loop** — end-to-end forward pass, KV cache, prefill vs decode.
5. **Four lenses** — weights, context, scaffolding, decoding. The diagnostic frame.
6. **How models get trained** — pretraining → SFT → RLHF.
7. **How we know a change helped** — evaluation.
8. **Knobs you can turn after training** — the five levers.

### The four-lens framework

Everything downstream of the hub is sorted by which of four categories it belongs to:

| Lens | What it is | Example |
|---|---|---|
| 🧠 **Weights** | What the model *knows* because of training | Fine-tuning, quantization, pruning |
| 📜 **Context** | What the model *sees* this turn | Context length, prompt engineering |
| 🛠 **Scaffolding** | The system around the model | RAG, tool use, system prompts, agents |
| 🎲 **Decoding** | How the sampler picks tokens | Temperature, top-k, top-p |

**Runtime state** (KV cache, intermediate activations) is intentionally *not* a fifth lens — it's transient computation state, not knowledge or input. Confusing runtime state with weights/context is one of the most common diagnostic mistakes, which is why the distinction is made explicit.

### The diagnosis page is the acceptance test

`deep/diagnosis.html` is the payoff. It maps ten common LLM failure modes (forgot an earlier turn, hallucinated a citation, worse after quantization, lost-in-the-middle, etc.) to the lens(es) to suspect, how to confirm, and what to try in order.

**If the rest of the artifact doesn't give you the mental model to reason through the diagnosis page, the artifact has a bug — not the diagnosis page.**

## Teaching principles (baked into every page)

1. **Decoder-only transformer as the baseline.** Variants (MoE, GQA/MQA, encoder-decoder, multimodal, RAG, reasoning scaffolds) appear as brief 🌿 *variant notes* on the deep pages where they naturally attach — never in the main line.
2. **Analogy first, precision second.** Every mechanical concept leads with an everyday-life analogy (🔍 *"Think of it like…"*) before the technical explanation. Where the analogy imperfectly maps, the imperfection is called out (⚠️ *"Where this breaks…"*).
3. **Interactives declare their invariants.** Every widget opens with a 📐 *"What this teaches (and what it doesn't)"* box. Nothing here pretends to be live model behavior — canned and illustrative is the rule, honestly labeled.
4. **Four lenses are an active diagnostic frame, not decoration.** Every lever and concept gets tagged with the lens it touches. The diagnosis page applies the frame for real.
5. **Locked component grammar.** Five reusable components (analogy, break, invariant, variant, lens-tag) are defined once in CSS/JS and reused everywhere. No page-specific patterns.

## How to use it

1. Open `index.html` in any modern browser (Chrome/Safari/Firefox). No server needed.
2. Read the hub top-to-bottom (~30 minutes).
3. Click into deep pages only when a section sparks curiosity.
4. Bookmark `deep/diagnosis.html` — that's what you open when something actually breaks in your work.
5. Use `deep/glossary.html` as a reference.

## What's interactive

Every widget lives in `assets/widgets.js` and follows the same enhancement pattern (preset buttons, click-to-inspect, toggles, stats panel, tie-back to diagnosis entries). Key widgets:

| Widget | Teaches | Lives on |
|---|---|---|
| Tokenizer playground | Text → integer IDs at sub-word granularity | hub §1, tokens.html |
| Attention hover | How attention routes between tokens | hub §2, attention.html |
| Layer-stack slider | How representations evolve across depth | hub §3, block.html |
| Inference stepper | The autoregressive loop with growing KV cache | hub §4, inference.html |
| Four-lens sorter | Diagnosing failures to a lens | hub §5, diagnosis.html |
| Training stages | Base vs SFT vs RLHF on one prompt | hub §6, training.html |
| Sampling sliders | Temperature, top-k, top-p in action | hub §8, levers.html |
| LoRA rank | Trainable parameters vs full fine-tune | levers.html |
| Quantization | Discretization error vs bit-depth | levers.html |
| Context-length | KV + attention cost scaling | levers.html |
| Prefill vs decode | Latency shape for different workloads | inference.html |
| Output ranking | How preference evals work | eval.html |
| Embedding similarity | Meaning as geometry | tokens.html |
| RoPE rotation | How position becomes angle | tokens.html |

## Planning artifacts

- **`/Users/apple/.claude/plans/optimized-greeting-dusk.md`** — the full design spec for this artifact. Decisions, scope, architecture, teaching principles, every widget, every deep page, plus the ongoing enhancement pass.

## Status

The v1 build is complete: hub + all 9 deep pages + 14 interactive widgets + glossary.

An **enhancement pass** is in progress at the time of this README:

- ✅ Tokenizer widget has the full enhancement template (preset buttons, click-to-inspect, toggles, character ruler, stats panel).
- 🚧 Other 13 widgets to get the same template.
- 🚧 Artifact-level enhancements planned: glossary hover tooltips on every page, reading progress bar, keyboard shortcuts (arrows/space/?/esc), dark mode, ToC sidebar on deep pages, heading search palette (Cmd-K / `/`).

## Non-goals

- Not a math-first explainer. Nothing here proves anything; we build mechanism.
- Not a research survey. Variants are acknowledged in brief; not catalogued exhaustively.
- Not a benchmark catalog. Eval is framed around *"how do I tell if my change helped?"*, not *"here's a list of benchmarks."*
- Not live. Widgets are precomputed/illustrative — they teach the shape of behavior, not real-model measurements.

## Who this is for

Anyone who wants to reason mechanically about LLMs without first getting a PhD in machine learning. You should already know *what* tokens and attention and fine-tuning are as words; this artifact fills in what they actually do and how they connect.
