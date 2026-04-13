// Glossary hover tooltips
// Wraps first 1–2 occurrences of each term in prose with a hover-tooltip span.
// Hover behavior already styled in styles.css via .glossary-term.
//
// Skip rules:
//   - Skip on glossary.html itself (would create self-loops).
//   - Skip inside headings (h1–h4), code/pre, SVG diagrams, callouts, widgets, links.
//   - Each term wrapped at most 2 times per page.

(function () {
  'use strict';

  // term → short definition. Sorted longest-first at use to prefer "transformer block" over "transformer".
  const TERMS = {
    // Four lenses
    'weights':            'What the model knows because of training. The learned numbers; frozen at inference.',
    'context':            'What the model sees in this turn — the input window, history, retrieved docs.',
    'scaffolding':        'The system around the model: prompts, retrieval, tools, agent loops. Not the model itself.',
    'decoding':           'How the sampler turns the model\'s probability output into a single chosen token.',
    'four lenses':        'Weights, context, scaffolding, decoding — the diagnostic frame for any LLM behavior.',
    'runtime state':      'Transient computation state (KV cache, activations) that lives one forward pass and disappears.',
    // Architecture
    'token':              'A small piece of text mapped to an integer ID. Often sub-word.',
    'tokens':             'Small pieces of text mapped to integer IDs. Often sub-word.',
    'tokenization':       'Splitting text into tokens — sub-word pieces with integer IDs.',
    'embedding':          'A vector representing a token\'s location in "meaning space."',
    'embeddings':         'Vectors representing tokens\' locations in "meaning space."',
    'positional encoding':'How the model knows which token came first. Modern models use RoPE.',
    'RoPE':               'Rotary Position Embedding. Rotates Q/K vectors by an angle proportional to position.',
    'attention':          'The mechanism by which each token looks at every other token and updates itself.',
    'self-attention':     'Attention applied within a single sequence — every token attends to every other token.',
    'multi-head attention':'Running attention several times in parallel with different Q/K/V projections.',
    'attention head':     'One parallel attention computation. Modern models run dozens.',
    'Q, K, V':            'Query / Key / Value vectors used in attention.',
    'causal mask':        'Implementation detail enforcing causal autoregressive structure during parallel training.',
    'transformer block':  'One unit of attention + MLP + residual + normalization. Stacked 30–80 times in modern LLMs.',
    'transformer':        'The architecture family this artifact teaches: stacked blocks of attention + MLP.',
    'MLP':                'Per-token feed-forward neural network inside each transformer block.',
    'feed-forward':       'Per-token network applied independently at each position. Synonymous with MLP here.',
    'residual stream':    'The vector flowing up through all transformer blocks; each block adds rather than replaces.',
    'residual connection':'The "bypass" path that lets each block add to the running representation.',
    'LayerNorm':          'Normalization step. Modern models often use the slightly cheaper RMSNorm.',
    'layer norm':         'Normalization step applied inside every transformer block. Keeps activation scales stable across layers.',
    'layer normalization':'Normalization step applied inside every transformer block. Keeps activation scales stable across layers.',
    'RMSNorm':            'A lightweight variant of LayerNorm favored by modern transformers. Same role; slightly cheaper.',
    'context mixing':     'What self-attention does: each token\'s representation absorbs information from other tokens. The "mixing" of context across positions.',
    'knowledge recall':   'What the MLP/FFN does: each token, independently, uses its current representation to recall factual associations stored in the feed-forward weights.',
    'logits':             'Raw scores the model outputs for every possible next token, before softmax.',
    'softmax':            'Function converting logits into a probability distribution that sums to 1.',
    'hidden state':       'The vector at any given layer/position in the residual stream.',
    // Inference
    'forward pass':       'One run of the model from input through all layers to logits.',
    'autoregressive':     'Producing tokens one at a time, each conditioned on all previous tokens.',
    'inference':          'Running the model to produce output. Distinguished from training.',
    'KV cache':           'Cached K and V vectors for past tokens, so decode doesn\'t recompute them.',
    'prefill':            'First forward pass over the whole prompt, processed in parallel. Sets up the KV cache.',
    'decode':             'Generating tokens one at a time after prefill, sequentially.',
    'TTFT':               'Time to first token — latency from request to the first generated token. Dominated by prefill.',
    'time to first token':'Latency from request to first generated token. Dominated by prefill.',
    'TPOT':               'Time per output token — latency between successive generated tokens during decode.',
    'batching':           'Combining multiple users\' requests into one forward pass for GPU efficiency.',
    'continuous batching':'Dynamically adding/removing requests from a batch mid-flight.',
    'speculative decoding':'A small "draft" model proposes several tokens; the big model verifies in one pass.',
    // Training
    'pretraining':        'First training stage: predict-the-next-token on trillions of tokens.',
    'SFT':                'Supervised Fine-Tuning. Train on curated (prompt, ideal-response) pairs.',
    'supervised fine-tuning':'Train on curated (prompt, ideal-response) pairs to give assistant-shaped behavior.',
    'fine-tuning':        'Updating model weights on a specific dataset to teach new behavior.',
    'RLHF':               'Reinforcement Learning from Human Feedback. Train a reward model, then RL.',
    'DPO':                'Direct Preference Optimization. Simpler RLHF alternative — no separate reward model.',
    'reward model':       'A model trained to predict which of two outputs a human would prefer.',
    'catastrophic forgetting':'When fine-tuning damages capability the model previously had.',
    'alignment tax':      'Capability loss that often comes alongside RLHF/DPO training.',
    // Levers
    'LoRA':               'Low-Rank Adaptation. Fine-tune via a small low-rank delta attached to weight matrices.',
    'low-rank adaptation':'LoRA: fine-tune via a small low-rank delta (A·B) attached to weight matrices.',
    'QLoRA':              'LoRA with the base model quantized to 4 bits during training. Lets you fine-tune big models cheaply.',
    'quantization':       'Storing weights in fewer bits (16 → 4) to save memory. Coarser numerical resolution.',
    'GPTQ':               'Quantization method that adjusts for errors per column. Better quality at 4-bit than naive RTN.',
    'AWQ':                'Activation-aware Weight Quantization. Protects activation-important weights when quantizing.',
    'pruning':            'Removing weights, heads, or layers from a trained model.',
    'context extension':  'Making a model handle longer inputs than it was trained for.',
    'sliding window':     'Each token attends only to the last k tokens. Reduces attention cost; loses long-range coherence.',
    'temperature':        'Divides logits before softmax. T<1 sharpens (deterministic); T>1 flattens (random); T=0 is greedy.',
    'top-k':              'Keep only the top K most-likely tokens before sampling.',
    'top-p':              'Nucleus sampling. Keep the smallest set whose cumulative probability ≥ p.',
    'nucleus':            'Top-p sampling: keep the smallest set of tokens whose cumulative probability is at least p.',
    'repetition penalty': 'Multiplicative penalty applied to recently-generated tokens to prevent loops.',
    'greedy decoding':    'Always pick the highest-probability token. Equivalent to temperature = 0.',
    // Eval
    'perplexity':         'Intrinsic eval: how well the model predicts held-out text.',
    'MMLU':               'Multiple-choice benchmark across 57 academic subjects. Easy to score, prone to contamination.',
    'contamination':      'When benchmark questions leak into training data, inflating scores without true capability.',
    'MT-Bench':           'LLM-as-judge benchmark: a strong model grades pairs of model outputs.',
    'LMSYS':              'LMSYS Chatbot Arena: humans vote on pairs of anonymous model outputs.',
    'arena':              'LMSYS Chatbot Arena: humans vote on pairs of anonymous model outputs. Aggregates into Elo scores.',
    'Needle-in-a-Haystack':'Long-context probe: insert a unique fact at varying depths and test retrieval accuracy.',
    // Variants
    'decoder-only':       'The standard modern LLM architecture (GPT family). One stack, causal attention, autoregressive.',
    'encoder-decoder':    'Two-stack architecture (T5, BART). Encoder reads bidirectionally; decoder generates autoregressively.',
    'Mixture-of-Experts': 'MoE: replaces single MLP per block with many "expert" MLPs and a router.',
    'MoE':                'Mixture-of-Experts: replaces single MLP per block with many "expert" MLPs and a router.',
    'multi-query attention':'MQA: one K/V shared across all heads. Smaller cache, slight quality cost.',
    'MQA':                'Multi-Query Attention: one K/V shared across all heads.',
    'grouped-query attention':'GQA: heads grouped to share K/V. Used by most modern open models.',
    'GQA':                'Grouped-Query Attention: heads grouped to share K/V.',
    'multimodal':         'Models that accept images, audio, etc. as input — typically encoded into vectors first.',
    // Scaffolding
    'system prompt':      'A special prompt prefix instructing the model how to behave for the rest of the conversation.',
    'RAG':                'Retrieval-Augmented Generation: fetch documents and inject them into the model\'s context.',
    'tool use':           'The model emits structured output indicating an external function should be called.',
    'function calling':   'Tool use via a structured JSON-schema interface for invoking external functions.',
    'agent':              'Multi-step scaffolding: model thinks → acts → observes → thinks again.',
    'chain-of-thought':   'Prompting the model to explain its reasoning step-by-step before answering.',
  };

  // Decide where to point each term. By default, wrap-clicks navigate to glossary.
  const GLOSSARY_HREF = (function () {
    const inDeep = /\/deep\//.test(location.pathname);
    return inDeep ? 'glossary.html' : 'deep/glossary.html';
  })();

  const MAX_PER_TERM = 2;

  // Skip these elements (and everything inside)
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'A', 'BUTTON', 'INPUT', 'TEXTAREA', 'LABEL', 'SVG', 'NOSCRIPT']);
  const SKIP_CLASSES = ['callout-invariant', 'callout-analogy', 'callout-break', 'callout-variant', 'tie-back', 'lens-tag', 'lens-block', 'changes-where', 'widget', 'tokenizer-out', 'attn-tokens', 'kv-table', 'glossary-term'];

  function shouldSkip(node) {
    let cur = node;
    while (cur && cur.nodeType === 1) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      const cls = cur.className;
      if (cls && typeof cls === 'string') {
        for (const skip of SKIP_CLASSES) {
          if (cls.indexOf(skip) >= 0) return true;
        }
      }
      cur = cur.parentNode;
    }
    return false;
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function wrap() {
    if (/\/glossary\.html$/.test(location.pathname)) return;

    // Sorted longest-first so multi-word terms match before sub-words
    const sortedTerms = Object.keys(TERMS).sort((a, b) => b.length - a.length);
    const counts = {};
    sortedTerms.forEach(t => { counts[t] = 0; });

    // Single regex with alternation, case-insensitive, word-boundary
    const pattern = new RegExp('\\b(' + sortedTerms.map(escapeRegex).join('|') + ')\\b', 'i');

    // Walk all text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const candidates = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue.trim()) continue;
      if (shouldSkip(node.parentNode)) continue;
      candidates.push(node);
    }

    candidates.forEach(textNode => {
      let workText = textNode.nodeValue;
      const fragments = []; // alternating text / span
      let cursor = 0;

      while (cursor < workText.length) {
        const slice = workText.slice(cursor);
        const m = slice.match(pattern);
        if (!m) {
          fragments.push({ type: 'text', value: workText.slice(cursor) });
          break;
        }
        const matchedText = m[0];
        const matchedKey = matchedText.toLowerCase();
        // Find which term it matched (case-insensitive)
        const term = sortedTerms.find(t => t.toLowerCase() === matchedKey);
        const matchPos = cursor + m.index;
        // Push text before
        if (m.index > 0) fragments.push({ type: 'text', value: slice.slice(0, m.index) });

        if (term && counts[term] < MAX_PER_TERM) {
          fragments.push({ type: 'span', value: matchedText, def: TERMS[term] });
          counts[term]++;
        } else {
          // Already at limit — leave as plain text
          fragments.push({ type: 'text', value: matchedText });
        }
        cursor = matchPos + matchedText.length;
      }

      if (fragments.length === 1 && fragments[0].type === 'text') return; // no match

      // Replace text node with a fragment of nodes
      const frag = document.createDocumentFragment();
      fragments.forEach(f => {
        if (f.type === 'text') frag.appendChild(document.createTextNode(f.value));
        else {
          const a = document.createElement('a');
          a.className = 'glossary-term';
          a.dataset.def = f.def;
          a.href = GLOSSARY_HREF;
          a.textContent = f.value;
          frag.appendChild(a);
        }
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrap);
  } else {
    wrap();
  }

  window.LLM = window.LLM || {};
  window.LLM.glossaryTerms = TERMS;
})();
