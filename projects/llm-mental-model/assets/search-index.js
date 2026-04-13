// Static heading index — built by hand from H2 headings on every page.
// Each entry: { url (relative to root), text, page (display name) }

window.LLM = window.LLM || {};
window.LLM.searchIndex = [
  // Hub
  { url: 'index.html#so-what-is-an-llm-really', text: 'So what is an LLM, really?', page: 'Hub §0' },
  { url: 'index.html#words-dont-fit-in-math-so-we-cheat-tokens-embeddings-and-position', text: "Words don't fit in math: tokens, embeddings, and position", page: 'Hub §1' },
  { url: 'index.html#tokens-have-a-group-chat-attention', text: 'Tokens have a group chat: attention', page: 'Hub §2' },
  { url: 'index.html#same-conversation-sixty-times-in-a-row-the-transformer-block', text: 'Same conversation, sixty times in a row: the transformer block', page: 'Hub §3' },
  { url: 'index.html#from-hidden-state-to-next-token-the-full-inference-loop', text: 'From hidden state to next token: the full inference loop', page: 'Hub §4' },
  { url: 'index.html#four-lenses-for-thinking-about-llms', text: 'Four lenses for thinking about LLMs', page: 'Hub §5' },
  { url: 'index.html#how-a-model-goes-from-predicts-the-internet-to-answers-your-email', text: 'How a model goes from "predicts the internet" to "answers your email"', page: 'Hub §6' },
  { url: 'index.html#how-do-we-know-a-change-helped', text: 'How do we know a change helped?', page: 'Hub §7' },
  { url: 'index.html#knobs-you-can-turn-after-the-model-is-trained', text: 'Knobs you can turn after the model is trained', page: 'Hub §8' },

  // tokens.html
  { url: 'deep/tokens.html#tokens-chopping-text-into-reusable-pieces', text: 'Tokens — chopping text into reusable pieces', page: 'tokens.html' },
  { url: 'deep/tokens.html#the-tokenizer-playground', text: 'The tokenizer playground', page: 'tokens.html' },
  { url: 'deep/tokens.html#why-tokenization-is-more-interesting-than-it-sounds', text: 'Why tokenization is more interesting than it sounds', page: 'tokens.html' },
  { url: 'deep/tokens.html#embeddings-turning-ids-into-geometry', text: 'Embeddings — turning IDs into geometry', page: 'tokens.html' },
  { url: 'deep/tokens.html#position-how-the-model-knows-what-came-first', text: 'Position — how the model knows what came first', page: 'tokens.html' },

  // attention.html
  { url: 'deep/attention.html#the-problem-attention-solves', text: 'The problem attention solves', page: 'attention.html' },
  { url: 'deep/attention.html#step-by-step-on-a-4-token-toy-example', text: 'Step by step on a 4-token toy example', page: 'attention.html' },
  { url: 'deep/attention.html#the-pattern-is-context-sensitive-try-it', text: 'The pattern is context-sensitive — try it', page: 'attention.html' },
  { url: 'deep/attention.html#multi-head-attention', text: 'Multi-head attention', page: 'attention.html' },
  { url: 'deep/attention.html#the-causal-autoregressive-property', text: 'The causal autoregressive property', page: 'attention.html' },
  { url: 'deep/attention.html#why-attention-is-on-and-what-that-costs', text: 'Why attention is O(n²) — and what that costs', page: 'attention.html' },

  // block.html
  { url: 'deep/block.html#anatomy-of-a-single-block', text: 'Anatomy of a single block', page: 'block.html' },
  { url: 'deep/block.html#what-the-mlp-actually-does', text: 'What the MLP actually does', page: 'block.html' },
  { url: 'deep/block.html#the-residual-stream-the-highway-through-the-model', text: 'The residual stream — the highway through the model', page: 'block.html' },
  { url: 'deep/block.html#what-depth-buys-you-the-layer-slider', text: 'What depth buys you — the layer slider', page: 'block.html' },
  { url: 'deep/block.html#why-deeper-isnt-always-better', text: "Why deeper isn't always better", page: 'block.html' },

  // inference.html
  { url: 'deep/inference.html#one-token-end-to-end', text: 'One token, end to end', page: 'inference.html' },
  { url: 'deep/inference.html#prefill-vs-decode-two-very-different-cost-shapes', text: 'Prefill vs decode — two very different cost shapes', page: 'inference.html' },
  { url: 'deep/inference.html#the-kv-cache-what-it-is-what-it-does-how-big-it-gets', text: 'The KV cache — what it is, what it does, how big it gets', page: 'inference.html' },
  { url: 'deep/inference.html#try-the-loop-yourself', text: 'Try the loop yourself', page: 'inference.html' },
  { url: 'deep/inference.html#batching-sharing-the-gpu-across-users', text: 'Batching — sharing the GPU across users', page: 'inference.html' },
  { url: 'deep/inference.html#speculative-decoding-letting-a-small-model-do-the-typing', text: 'Speculative decoding — letting a small model do the typing', page: 'inference.html' },

  // training.html
  { url: 'deep/training.html#the-big-picture-three-stages', text: 'The big picture: three stages', page: 'training.html' },
  { url: 'deep/training.html#stage-1-pretraining', text: 'Stage 1: Pretraining', page: 'training.html' },
  { url: 'deep/training.html#stage-2-supervised-fine-tuning-sft', text: 'Stage 2: Supervised fine-tuning (SFT)', page: 'training.html' },
  { url: 'deep/training.html#stage-3-rlhf-or-dpo', text: 'Stage 3: RLHF or DPO', page: 'training.html' },
  { url: 'deep/training.html#see-it-on-a-single-prompt', text: 'See it on a single prompt', page: 'training.html' },
  { url: 'deep/training.html#what-about-rlaif-constitutional-ai-and-the-rest', text: 'What about RLAIF, constitutional AI, and the rest?', page: 'training.html' },

  // eval.html
  { url: 'deep/eval.html#the-framing', text: 'The framing', page: 'eval.html' },
  { url: 'deep/eval.html#four-families-of-evaluation', text: 'Four families of evaluation', page: 'eval.html' },
  { url: 'deep/eval.html#match-the-eval-to-the-lever', text: 'Match the eval to the lever', page: 'eval.html' },
  { url: 'deep/eval.html#how-teams-actually-pick-a-model', text: 'How teams actually pick a model', page: 'eval.html' },
  { url: 'deep/eval.html#the-honest-summary', text: 'The honest summary', page: 'eval.html' },

  // levers.html
  { url: 'deep/levers.html#fine-tuning', text: 'Fine-tuning', page: 'levers.html §1' },
  { url: 'deep/levers.html#quantization', text: 'Quantization', page: 'levers.html §2' },
  { url: 'deep/levers.html#context-extension', text: 'Context extension', page: 'levers.html §3' },
  { url: 'deep/levers.html#pruning', text: 'Pruning', page: 'levers.html §4' },
  { url: 'deep/levers.html#decoding-controls', text: 'Decoding controls', page: 'levers.html §5' },
  { url: 'deep/levers.html#putting-it-together-diagnosis-preview', text: 'Putting it together — diagnosis preview', page: 'levers.html' },

  // diagnosis.html
  { url: 'deep/diagnosis.html#warm-up-practice-the-four-lens-diagnosis', text: 'Warm-up — practice the four-lens diagnosis', page: 'diagnosis.html' },
  { url: 'deep/diagnosis.html#the-ten-failure-modes', text: 'The ten failure modes', page: 'diagnosis.html' },
  { url: 'deep/diagnosis.html#the-diagnostic-moves-summarized', text: 'The diagnostic moves, summarized', page: 'diagnosis.html' },
  { url: 'deep/diagnosis.html#if-none-of-these-match-your-symptom', text: 'If none of these match your symptom', page: 'diagnosis.html' },

  // glossary.html
  { url: 'deep/glossary.html#the-four-lenses', text: 'The four lenses', page: 'glossary.html' },
  { url: 'deep/glossary.html#architecture', text: 'Architecture', page: 'glossary.html' },
  { url: 'deep/glossary.html#inference', text: 'Inference', page: 'glossary.html' },
  { url: 'deep/glossary.html#training', text: 'Training', page: 'glossary.html' },
  { url: 'deep/glossary.html#levers', text: 'Levers', page: 'glossary.html' },
  { url: 'deep/glossary.html#evaluation', text: 'Evaluation', page: 'glossary.html' },
  { url: 'deep/glossary.html#architecture-variants', text: 'Architecture variants', page: 'glossary.html' },
  { url: 'deep/glossary.html#scaffolding', text: 'Scaffolding', page: 'glossary.html' },
];
