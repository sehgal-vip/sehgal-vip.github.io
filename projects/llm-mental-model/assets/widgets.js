// LLM Learning — interactive widgets
// Each widget mounts on an element with data-widget="<name>".
// Widgets must:
//   - declare a clear invariant via an inline .callout-invariant
//   - look obviously illustrative (no claim of measuring real model behavior)
//   - reuse the locked component grammar (no page-specific patterns)

(function () {
  'use strict';

  const el  = (window.LLM && window.LLM.el)  || function () { throw new Error('shared.js missing'); };
  const svg = (window.LLM && window.LLM.svg) || function () { throw new Error('shared.js missing'); };

  // ====================================================================
  // TEMPLATE HELPERS — reused by every enhanced widget
  // ====================================================================

  // makePresetRow(presets, onChoose) → DOM
  //   presets: [{ label, data }, ...]
  //   onChoose(data, btnNode) invoked on click
  function makePresetRow(presets, onChoose) {
    const row = el('div', { class: 'preset-row' });
    presets.forEach((p) => {
      const btn = el('button', { class: 'preset-btn' }, p.label);
      btn.addEventListener('click', () => {
        row.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChoose(p.data, btn);
      });
      row.appendChild(btn);
    });
    return row;
  }

  // makeToggleRow(toggles) → DOM
  //   toggles: [{ id, label, checked, onChange }, ...]
  function makeToggleRow(toggles) {
    const row = el('div', { class: 'toggle-row' });
    toggles.forEach(t => {
      const wrap = el('label', { class: 'toggle-label', for: t.id });
      const cb = el('input', { type: 'checkbox', id: t.id });
      if (t.checked) cb.checked = true;
      cb.addEventListener('change', () => t.onChange(cb.checked));
      wrap.appendChild(cb);
      wrap.appendChild(document.createTextNode(' ' + t.label));
      row.appendChild(wrap);
      t._node = cb; // optional external ref
    });
    return row;
  }

  // makeInspectPanel() → { node, show(content), hide() }
  //   content can be: { title, fields: {k: v}, note: html }
  function makeInspectPanel(onClose) {
    const node = el('div', { class: 'inspect-panel' });
    node.style.display = 'none';

    function hide() {
      node.style.display = 'none';
      if (onClose) onClose();
    }

    function show(content) {
      node.innerHTML = '';
      node.style.display = 'block';
      const head = el('div', { class: 'inspect-head' });
      head.appendChild(el('span', { class: 'inspect-tok' }, content.title || ''));
      const closeBtn = el('button', { class: 'inspect-close' }, '×');
      closeBtn.addEventListener('click', hide);
      head.appendChild(closeBtn);
      node.appendChild(head);
      if (content.fields) {
        const grid = el('dl', { class: 'inspect-grid' });
        Object.keys(content.fields).forEach(k => {
          grid.appendChild(el('dt', null, k));
          grid.appendChild(el('dd', null, String(content.fields[k])));
        });
        node.appendChild(grid);
      }
      if (content.note) {
        const p = el('p', { class: 'inspect-note' });
        p.innerHTML = content.note;
        node.appendChild(p);
      }
    }

    return { node, show, hide };
  }

  // makeStatsRow(cells) → DOM
  //   cells: [{ val, lbl, hint? }, ...]
  //   Rebuild via updateStatsRow(node, cells)
  function makeStatsRow(cells) {
    const row = el('div', { class: 'stats-row' });
    updateStatsRow(row, cells);
    return row;
  }

  function updateStatsRow(row, cells) {
    row.innerHTML = '';
    cells.forEach(c => {
      const cell = el('div', { class: 'stat-cell' });
      cell.appendChild(el('div', { class: 'stat-val' }, String(c.val)));
      cell.appendChild(el('div', { class: 'stat-lbl' }, c.lbl));
      if (c.hint) cell.appendChild(el('div', { class: 'stat-hint' }, c.hint));
      row.appendChild(cell);
    });
  }

  // makeTieBack(htmlOrText) → DOM
  //   htmlOrText: can include {{deep}} placeholder for cross-page linking.
  //   {{deep}} resolves to "deep/" when on the hub, "" when on a deep page.
  function makeTieBack(htmlOrText) {
    const isDeep = /\/deep\//.test(window.location.pathname);
    const deepPrefix = isDeep ? '' : 'deep/';
    const hydrated = htmlOrText.replace(/\{\{deep\}\}/g, deepPrefix);
    const node = el('div', { class: 'tie-back' });
    node.innerHTML = '<span class="label">Why this matters</span>' + hydrated;
    return node;
  }

  // ====================================================================
  // WIDGET: tokenizer
  // Uses the real cl100k_base tokenizer (GPT-4 / GPT-3.5) via gpt-tokenizer.
  // The UMD bundle at assets/gpt-tokenizer.js exposes GPTTokenizer_cl100k_base.
  // ====================================================================

  function tokenize(text) {
    const TK = window.GPTTokenizer_cl100k_base;
    if (!TK || typeof TK.encode !== 'function') {
      // Graceful fallback if the tokenizer script didn't load
      return [{ s: text, id: 0, kind: 'error' }];
    }
    const ids = TK.encode(text);
    return ids.map(id => {
      const s = TK.decode([id]);
      // Distinguish whitespace-only tokens for rendering
      const isSpace = /^\s+$/.test(s);
      return { s, id, kind: isSpace ? 'space' : 'word' };
    });
  }

  // Preset examples chosen to surface real cl100k_base tokenizer behavior
  const TOK_PRESETS = [
    { label: 'Default',        text: "antidisestablishmentarianism, 🤖, überhaupt — tokens aren't words." },
    { label: 'Numbers',        text: 'Compare 1234 to 1235. And 99 vs 100 vs 1000000.' },
    { label: 'Capitalization', text: 'The THE the cat Cat CAT hide Hide hiDe' },
    { label: 'Code',           text: 'function add(a, b) { return a + b; }' },
    { label: 'Multilingual',   text: 'Hello नमस्ते 你好 مرحبا — same greeting, very different cost.' },
    { label: 'Emoji & symbols',text: 'I ❤️ tokens 🤖🚀. © 2024. π ≈ 3.14. \u2028' },
  ];

  function mountTokenizer(host) {
    const defaultText = host.dataset.default || TOK_PRESETS[0].text;

    host.innerHTML = '';
    host.classList.add('widget');

    host.appendChild(el('h4', null, 'Tokenizer playground'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: text becomes integer IDs at sub-word granularity. Uses the real GPT-4 tokenizer (cl100k_base) — the same vocabulary OpenAI's API meters for billing. Click any token to inspect it; try the presets to see classic gotchas (numbers, capitalization, leading spaces, emoji, non-English). " +
      "Doesn't: cover every model. Claude, Llama, Gemini, Mistral each use their own tokenizers — token boundaries and counts will differ on those. Also doesn't show the BPE training process, just the final vocabulary applied."));
    host.appendChild(inv);

    // Preset chips
    host.appendChild(el('label', null, 'Try a preset:'));
    const presets = el('div', { class: 'preset-row' });
    TOK_PRESETS.forEach(p => {
      const btn = el('button', { class: 'preset-btn' }, p.label);
      btn.addEventListener('click', () => { ta.value = p.text; render(); ta.focus(); });
      presets.appendChild(btn);
    });
    host.appendChild(presets);

    const ta = el('textarea', { rows: '2', spellcheck: 'false' });
    ta.value = defaultText;
    host.appendChild(el('label', null, 'Or type your own:'));
    host.appendChild(ta);

    // Toggle row
    const toggleRow = el('div', { class: 'toggle-row' });
    const showIdsCb     = el('input', { type: 'checkbox', id: 'tok-ids', checked: '' });
    const showPosCb     = el('input', { type: 'checkbox', id: 'tok-pos' });
    const showCharsCb   = el('input', { type: 'checkbox', id: 'tok-chars' });
    [
      [showIdsCb,   'tok-ids',   'Show token IDs'],
      [showPosCb,   'tok-pos',   'Show position numbers'],
      [showCharsCb, 'tok-chars', 'Show raw character ruler'],
    ].forEach(([cb, id, label]) => {
      const wrap = el('label', { for: id, class: 'toggle-label' });
      wrap.appendChild(cb);
      wrap.appendChild(document.createTextNode(' ' + label));
      toggleRow.appendChild(wrap);
      cb.addEventListener('change', render);
    });
    host.appendChild(toggleRow);

    // Char ruler (above tokens, only when toggle on)
    const charRuler = el('div', { class: 'char-ruler' });
    host.appendChild(charRuler);

    const out = el('div', { class: 'tokenizer-out' });
    host.appendChild(out);

    // Inspector panel — appears when a token is clicked
    const inspect = el('div', { class: 'inspect-panel' });
    inspect.style.display = 'none';
    host.appendChild(inspect);

    // Stats panel
    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    // Tie-back
    host.appendChild(makeTieBack(
      'Tokenization shapes real problems: arithmetic failures (diagnosis <a href="{{deep}}diagnosis.html">#3</a>) often trace to numbers splitting unevenly into tokens; multilingual cost asymmetry comes from vocabularies tuned on English; long-context issues (<a href="{{deep}}diagnosis.html">#6</a>) are partly about how token count scales with character count.'
    ));

    let selectedIdx = -1;

    function describeKind(t) {
      if (t.kind === 'space') return 'whitespace-only token';
      if (/^\s/.test(t.s))    return 'word token with leading space';
      return 'word token';
    }

    function showInspector(tokens, idx) {
      const t = tokens[idx];
      const charStart = tokens.slice(0, idx).reduce((sum, x) => sum + x.s.length, 0);
      const charEnd   = charStart + t.s.length - 1;
      inspect.innerHTML = '';
      inspect.style.display = 'block';
      const head = el('div', { class: 'inspect-head' });
      head.appendChild(el('span', { class: 'inspect-tok' }, JSON.stringify(t.s)));
      const closeBtn = el('button', { class: 'inspect-close' }, '×');
      closeBtn.addEventListener('click', () => {
        selectedIdx = -1;
        inspect.style.display = 'none';
        renderTokens(tokens);
      });
      head.appendChild(closeBtn);
      inspect.appendChild(head);
      const grid = el('dl', { class: 'inspect-grid' });
      [
        ['Token ID',      String(t.id)],
        ['Position',      idx + ' (of ' + tokens.length + ')'],
        ['Character span', charStart + '…' + charEnd + ' (' + t.s.length + ' chars)'],
        ['Kind',          describeKind(t)],
      ].forEach(([k, v]) => {
        grid.appendChild(el('dt', null, k));
        grid.appendChild(el('dd', null, v));
      });
      inspect.appendChild(grid);
      const note = el('p', { class: 'inspect-note' });
      if (t.kind === 'space') {
        note.innerHTML = "A whitespace-only token. Rare on its own — most tokenizers prefer attaching spaces to the following word (e.g. <code>\" the\"</code> as one token).";
      } else if (/^\s/.test(t.s)) {
        note.innerHTML = "<em>Leading space is part of this token.</em> cl100k_base (GPT-4's tokenizer) typically attaches a single leading space to the token after it. This is why <code>\"the\"</code> (no space) and <code>\" the\"</code> (with space) are different tokens.";
      } else if (t.s.length <= 3) {
        note.innerHTML = "<em>Short, common token.</em> Frequent in BPE training corpora, so it earned its own ID — cheap to use.";
      } else {
        note.innerHTML = "<em>A single token in cl100k_base.</em> Frequent enough in GPT-4's training data to be represented as one unit rather than split across pieces.";
      }
      inspect.appendChild(note);
    }

    function renderTokens(tokens) {
      out.innerHTML = '';
      const showIds = showIdsCb.checked;
      const showPos = showPosCb.checked;
      tokens.forEach((t, idx) => {
        if (t.kind === 'space') {
          out.appendChild(el('span', { class: 'tok-space' }, ' '));
          return;
        }
        const chip = el('span', {
          class: 'tok tok-' + t.kind + (idx === selectedIdx ? ' tok-selected' : ''),
          title: 'Click to inspect',
          'data-idx': idx
        });
        chip.appendChild(el('span', { class: 'tok-text' }, t.s));
        if (showIds) chip.appendChild(el('span', { class: 'tok-meta' }, '·' + t.id));
        if (showPos) chip.appendChild(el('span', { class: 'tok-pos' }, '#' + idx));
        chip.addEventListener('click', () => {
          selectedIdx = idx;
          renderTokens(tokens);
          showInspector(tokens, idx);
        });
        out.appendChild(chip);
      });
    }

    function renderRuler(text) {
      if (!showCharsCb.checked) {
        charRuler.innerHTML = '';
        charRuler.style.display = 'none';
        return;
      }
      charRuler.style.display = 'block';
      charRuler.innerHTML = '';
      // Show char index every 5 chars
      const cells = [];
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const cell = el('span', { class: 'ruler-cell' });
        cell.appendChild(el('span', { class: 'ruler-ch' }, ch === '\n' ? '↵' : (ch === ' ' ? '·' : ch)));
        cell.appendChild(el('span', { class: 'ruler-i' }, i % 5 === 0 ? String(i) : ''));
        cells.push(cell);
      }
      cells.forEach(c => charRuler.appendChild(c));
    }

    function render() {
      const text = ta.value;
      const tokens = tokenize(text);

      // Reset selection if out of range
      if (selectedIdx >= tokens.length) selectedIdx = -1;
      if (selectedIdx < 0) inspect.style.display = 'none';

      renderRuler(text);
      renderTokens(tokens);

      if (selectedIdx >= 0) showInspector(tokens, selectedIdx);

      // Stats panel
      const chars     = text.length;
      const totalToks = tokens.length;
      const withLeading = tokens.filter(t => /^\s/.test(t.s) && t.kind !== 'space').length;
      const ratio     = chars > 0 && totalToks > 0 ? (chars / totalToks).toFixed(2) : '—';
      const bytes     = new TextEncoder().encode(text).length;

      updateStatsRow(stats, [
        { val: chars,          lbl: 'Characters' },
        { val: bytes,          lbl: 'UTF-8 bytes', hint: chars !== bytes ? 'non-ASCII detected' : '1 byte each (ASCII)' },
        { val: totalToks,      lbl: 'Tokens' },
        { val: ratio,          lbl: 'Chars/token', hint: 'higher = more compression' },
        { val: withLeading,    lbl: 'Leading-space', hint: 'tokens like " the"' },
      ]);
    }

    ta.addEventListener('input', render);
    render();
  }

  // ====================================================================
  // WIDGET: inference-loop-stepper
  // Teaches: the autoregressive loop — logits → sample → append → KV cache row.
  // Doesn't: use a real model. Probabilities are canned, KV cache is illustrative.
  // ====================================================================

  // Canned next-token distributions keyed on the last 1-2 tokens of the sequence.
  // Each entry: array of {tok, p} sorted by p descending.
  const CANNED_DIST = {
    'Once upon a time': [
      { t: ',',    p: 0.42 },
      { t: ' there', p: 0.28 },
      { t: ' in',  p: 0.10 },
      { t: ' a',   p: 0.07 },
      { t: ' the', p: 0.05 },
      { t: ' long', p: 0.04 },
      { t: ' two', p: 0.02 },
      { t: ' …',   p: 0.02 },
    ],
    'Once upon a time,': [
      { t: ' there', p: 0.55 },
      { t: ' in',   p: 0.18 },
      { t: ' a',    p: 0.10 },
      { t: ' long', p: 0.08 },
      { t: ' the',  p: 0.04 },
      { t: ' two',  p: 0.03 },
      { t: ' an',   p: 0.02 },
    ],
    'Once upon a time, there': [
      { t: ' was',   p: 0.71 },
      { t: ' lived', p: 0.18 },
      { t: ' were',  p: 0.06 },
      { t: ' came',  p: 0.03 },
      { t: ' stood', p: 0.02 },
    ],
    'Once upon a time, there was': [
      { t: ' a',   p: 0.83 },
      { t: ' an',  p: 0.07 },
      { t: ' no',  p: 0.04 },
      { t: ' once', p: 0.03 },
      { t: ' only', p: 0.03 },
    ],
    'Once upon a time, there was a': [
      { t: ' king',     p: 0.19 },
      { t: ' little',   p: 0.18 },
      { t: ' young',    p: 0.13 },
      { t: ' farmer',   p: 0.10 },
      { t: ' man',      p: 0.10 },
      { t: ' girl',     p: 0.08 },
      { t: ' boy',      p: 0.07 },
      { t: ' great',    p: 0.05 },
      { t: ' wise',     p: 0.05 },
      { t: ' …',        p: 0.05 },
    ],
    'Once upon a time, there was a little': [
      { t: ' girl',  p: 0.34 },
      { t: ' boy',   p: 0.28 },
      { t: ' village', p: 0.10 },
      { t: ' house', p: 0.09 },
      { t: ' dog',   p: 0.08 },
      { t: ' kitten', p: 0.06 },
      { t: ' fox',   p: 0.05 },
    ],
    'default': [
      { t: ' the', p: 0.18 },
      { t: ' a',   p: 0.14 },
      { t: ' and', p: 0.11 },
      { t: ',',    p: 0.10 },
      { t: ' of',  p: 0.09 },
      { t: ' to',  p: 0.07 },
      { t: '.',    p: 0.06 },
      { t: ' …',   p: 0.25 },
    ],
  };

  function getDist(seq) {
    if (CANNED_DIST[seq]) return CANNED_DIST[seq];
    return CANNED_DIST.default;
  }

  // Inference stepper presets
  const STEPPER_PRESETS = [
    { label: 'Story',  data: 'Once upon a time' },
    { label: 'Default',data: 'Once upon a time, there was a' },
    { label: 'Mid-tale',data: 'Once upon a time, there was a little' },
  ];

  function mountInferenceStepper(host) {
    let initial = host.dataset.default || STEPPER_PRESETS[0].data;
    let sequence = initial;
    let stepCount = 0;
    let lastSurprisal = null;
    let autoTimer = null;
    let showCache = true;
    let showCumulative = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'One token at a time — autoregressive loop with KV cache'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: the autoregressive loop — the model produces a probability over every possible next token, the sampler picks one, it gets appended, and the cycle repeats. The KV cache grows by one row per step. Click any candidate bar to preview what continuation that token would start. " +
      "Doesn't: run a real model. Probabilities are canned for a few specific sequences; real probabilities come from a forward pass through billions of parameters."));
    host.appendChild(inv);

    // Preset row
    const presetRow = makePresetRow(STEPPER_PRESETS, (data) => {
      stopAutoAndUncheck();
      initial = data;
      sequence = data;
      stepCount = 0;
      lastSurprisal = null;
      inspector.hide();
      render(null);
    });
    host.appendChild(el('label', null, 'Starting prompt:'));
    host.appendChild(presetRow);
    presetRow.querySelectorAll('.preset-btn').forEach(b => {
      if (b.textContent === STEPPER_PRESETS.find(p => p.data === initial)?.label) b.classList.add('active');
    });

    // Toggles
    const toggles = makeToggleRow([
      { id: 'inf-cache', label: 'Show KV cache', checked: true,
        onChange: v => { showCache = v; render(null); } },
      { id: 'inf-cum',  label: 'Show cumulative probability', checked: false,
        onChange: v => { showCumulative = v; render(null); } },
      { id: 'inf-auto', label: 'Auto-step every 1.5s', checked: false,
        onChange: v => { v ? startAuto() : stopAuto(); } },
    ]);
    host.appendChild(toggles);

    const seqDisplay = el('div', { class: 'seq-display' });
    host.appendChild(el('label', null, 'Current sequence:'));
    host.appendChild(seqDisplay);

    const distHost = el('div', { class: 'dist-host' });
    host.appendChild(el('label', null, "Model's probability over next token (top candidates):"));
    host.appendChild(distHost);

    // Cache section (toggleable)
    const cacheLabel = el('label', null, 'KV cache (one row per past token):');
    const cacheHost = el('div', { class: 'cache-host' });
    host.appendChild(cacheLabel);
    host.appendChild(cacheHost);

    const controls = el('div', { class: 'w-controls' });
    const stepBtn = el('button', null, '→ Generate next token');
    const resetBtn = el('button', { class: 'secondary' }, '↻ Reset');
    controls.appendChild(stepBtn);
    controls.appendChild(resetBtn);
    host.appendChild(controls);

    // Inspect panel
    const inspector = makeInspectPanel();
    host.appendChild(inspector.node);

    // Stats
    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    // Tie-back
    host.appendChild(makeTieBack(
      'Two of the most common LLM symptoms live here: <strong>different answers each run</strong> (diagnosis <a href="{{deep}}diagnosis.html">#2</a>) is the sampling step picking different tokens from this exact distribution; <strong>repetitive output</strong> (diagnosis <a href="{{deep}}diagnosis.html">#10</a>) is what happens when one token always wins.'
    ));

    function distEntropy(dist) {
      let h = 0;
      dist.forEach(d => { if (d.p > 1e-9) h -= d.p * Math.log2(d.p); });
      return h;
    }

    function previewContinuation(startSeq, depth) {
      // Greedy preview, depth tokens, starting from given sequence
      let s = startSeq;
      for (let i = 0; i < depth; i++) {
        const d = getDist(s);
        if (!d || d.length === 0) break;
        s = s + d[0].t;
      }
      return s;
    }

    function render(highlightedToken) {
      seqDisplay.textContent = sequence;
      const dist = getDist(sequence);

      distHost.innerHTML = '';
      let cum = 0;
      dist.forEach(d => {
        cum += d.p;
        const row = el('div', { class: 'dist-row', style: { cursor: 'pointer' } });
        const label = el('div', { class: 'dist-label' }, JSON.stringify(d.t));
        const barWrap = el('div', { class: 'dist-bar-wrap' });
        const bar = el('div', {
          class: 'dist-bar' + (highlightedToken === d.t ? ' highlighted' : ''),
          style: { width: (d.p * 100).toFixed(1) + '%' }
        });
        const pct = el('div', { class: 'dist-pct' },
          showCumulative
            ? (d.p * 100).toFixed(0) + '%  (Σ' + (cum * 100).toFixed(0) + '%)'
            : (d.p * 100).toFixed(0) + '%'
        );
        barWrap.appendChild(bar);
        row.appendChild(label);
        row.appendChild(barWrap);
        row.appendChild(pct);
        const tk = d.t;
        const pp = d.p;
        row.addEventListener('click', () => {
          inspector.show({
            title: '"' + tk + '"  →  ' + (pp * 100).toFixed(1) + '%',
            fields: {
              'If this token were picked': '',
              'Greedy continuation (5 tokens)': previewContinuation(sequence + tk, 5),
              'Surprisal':                 (-Math.log2(pp)).toFixed(2) + ' bits  (lower = more expected)',
            },
            note: 'In real generation, the sampler picks weighted by probability. The sampler\'s settings (temperature, top-k, top-p) reshape this distribution before drawing.'
          });
        });
        distHost.appendChild(row);
      });

      cacheLabel.style.display = showCache ? 'block' : 'none';
      cacheHost.style.display = showCache ? 'block' : 'none';
      if (showCache) {
        cacheHost.innerHTML = '';
        const tbl = el('table', { class: 'kv-table' });
        const thead = el('thead');
        const trh = el('tr');
        ['#', 'token', 'K (illustrative)', 'V (illustrative)'].forEach(h => trh.appendChild(el('th', null, h)));
        thead.appendChild(trh);
        tbl.appendChild(thead);
        const tbody = el('tbody');
        const seqTokens = sequence.split(/(?=\s)|(?<=\s)/).filter(s => s.length);
        for (let i = 0; i < seqTokens.length; i++) {
          const tr = el('tr');
          tr.appendChild(el('td', null, String(i)));
          tr.appendChild(el('td', null, JSON.stringify(seqTokens[i])));
          tr.appendChild(el('td', null, '[…d-dim vector…]'));
          tr.appendChild(el('td', null, '[…d-dim vector…]'));
          tbody.appendChild(tr);
        }
        tbl.appendChild(tbody);
        cacheHost.appendChild(tbl);
      }

      // Stats
      const h = distEntropy(dist);
      const cells = [
        { val: stepCount,                     lbl: 'Step' },
        { val: dist.length,                   lbl: 'Candidates' },
        { val: h.toFixed(2),                  lbl: 'Entropy', hint: 'bits — higher = more uncertain' },
      ];
      if (lastSurprisal != null) {
        cells.push({ val: lastSurprisal.toFixed(2), lbl: 'Last surprisal', hint: 'bits — high = unexpected pick' });
      }
      updateStatsRow(stats, cells);
    }

    function step() {
      const dist = getDist(sequence);
      const r = Math.random();
      let acc = 0;
      let chosen = dist[0].t;
      let chosenP = dist[0].p;
      for (const d of dist) {
        acc += d.p;
        if (r <= acc) { chosen = d.t; chosenP = d.p; break; }
      }
      render(chosen);
      setTimeout(function () {
        sequence = sequence + chosen;
        stepCount++;
        lastSurprisal = -Math.log2(chosenP);
        render(null);
      }, 500);
    }

    function reset() {
      stopAutoAndUncheck();
      sequence = initial;
      stepCount = 0;
      lastSurprisal = null;
      inspector.hide();
      render(null);
    }

    function startAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(step, 1500);
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
    function stopAutoAndUncheck() {
      stopAuto();
      const cb = host.querySelector('#inf-auto');
      if (cb) cb.checked = false;
    }

    stepBtn.addEventListener('click', step);
    resetBtn.addEventListener('click', reset);
    render(null);
  }

  // ====================================================================
  // WIDGET: attention-hover
  // Teaches: each token attends to other tokens with varying weight; pattern depends on context.
  // Doesn't: measure a real model — pattern is hand-authored to illustrate.
  // ====================================================================

  // Canned attention patterns. Map: sentence → for each token index → weights over other tokens
  const CANNED_ATTN = {
    'The lawyer told the witness she lied .': {
      tokens: ['The', 'lawyer', 'told', 'the', 'witness', 'she', 'lied', '.'],
      // For each token position, weights over positions (sums to ~1)
      weights: [
        [0.6, 0.3, 0.05, 0.0, 0.0, 0.0, 0.0, 0.05],   // The
        [0.4, 0.5, 0.05, 0.0, 0.0, 0.0, 0.0, 0.05],   // lawyer
        [0.05, 0.4, 0.4, 0.05, 0.05, 0.0, 0.0, 0.05], // told
        [0.05, 0.05, 0.05, 0.5, 0.3, 0.0, 0.0, 0.05], // the
        [0.0, 0.05, 0.05, 0.4, 0.45, 0.0, 0.0, 0.05], // witness
        [0.0, 0.42, 0.0, 0.0, 0.45, 0.05, 0.0, 0.08], // she — attention split between lawyer and witness
        [0.0, 0.18, 0.05, 0.0, 0.18, 0.4, 0.15, 0.04],// lied
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0],     // .
      ],
    },
    "The trophy didn't fit in the suitcase because it was too big .": {
      tokens: ['The', 'trophy', "didn't", 'fit', 'in', 'the', 'suitcase', 'because', 'it', 'was', 'too', 'big', '.'],
      weights: [
        [0.7, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
        [0.3, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
        [0.05, 0.5, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.05],
        [0, 0.4, 0.1, 0.4, 0, 0, 0.05, 0, 0, 0, 0, 0, 0.05],
        [0, 0.05, 0, 0.3, 0.5, 0, 0.1, 0, 0, 0, 0, 0, 0.05],
        [0, 0, 0, 0, 0.3, 0.4, 0.25, 0, 0, 0, 0, 0, 0.05],
        [0, 0.05, 0, 0, 0.05, 0.4, 0.45, 0, 0, 0, 0, 0, 0.05],
        [0, 0.1, 0, 0.1, 0, 0.05, 0.1, 0.6, 0, 0, 0, 0, 0.05],
        [0, 0.55, 0, 0, 0, 0, 0.18, 0.05, 0.15, 0, 0, 0, 0.07], // 'it' — attends most to 'trophy'
        [0, 0.1, 0, 0, 0, 0, 0.05, 0, 0.4, 0.4, 0, 0, 0.05],
        [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.05, 0.7, 0.1, 0.05],
        [0, 0.4, 0, 0, 0, 0, 0.05, 0, 0.15, 0.05, 0.25, 0.05, 0.05], // 'big' — links back to 'trophy'
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0],
      ],
    },
    "The trophy didn't fit in the suitcase because it was too small .": {
      tokens: ['The', 'trophy', "didn't", 'fit', 'in', 'the', 'suitcase', 'because', 'it', 'was', 'too', 'small', '.'],
      weights: [
        [0.7, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
        [0.3, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
        [0.05, 0.5, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.05],
        [0, 0.4, 0.1, 0.4, 0, 0, 0.05, 0, 0, 0, 0, 0, 0.05],
        [0, 0.05, 0, 0.3, 0.5, 0, 0.1, 0, 0, 0, 0, 0, 0.05],
        [0, 0, 0, 0, 0.3, 0.4, 0.25, 0, 0, 0, 0, 0, 0.05],
        [0, 0.05, 0, 0, 0.05, 0.4, 0.45, 0, 0, 0, 0, 0, 0.05],
        [0, 0.1, 0, 0.1, 0, 0.05, 0.1, 0.6, 0, 0, 0, 0, 0.05],
        [0, 0.15, 0, 0, 0, 0.05, 0.55, 0.05, 0.15, 0, 0, 0, 0.05], // 'it' — flips to 'suitcase'
        [0, 0.1, 0, 0, 0, 0, 0.05, 0, 0.4, 0.4, 0, 0, 0.05],
        [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.05, 0.7, 0.1, 0.05],
        [0, 0.05, 0, 0, 0, 0.05, 0.4, 0, 0.15, 0.05, 0.25, 0.05, 0], // 'small' — flips to 'suitcase'
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0],
      ],
    },
  };

  // Built-in preset scenarios for the attention widget
  const ATTN_PRESETS = [
    { label: 'Pronoun (she)',      data: 'The lawyer told the witness she lied .' },
    { label: 'Winograd: …too BIG',  data: "The trophy didn't fit in the suitcase because it was too big ." },
    { label: 'Winograd: …too SMALL',data: "The trophy didn't fit in the suitcase because it was too small ." },
  ];

  function entropy(weights) {
    let h = 0;
    weights.forEach(w => { if (w > 1e-9) h -= w * Math.log2(w); });
    return h;
  }

  function mountAttentionHover(host) {
    // Backward compatibility: support old data-sentences/data-labels API
    let presets = ATTN_PRESETS.slice();
    if (host.dataset.sentences) {
      const ss = host.dataset.sentences.split('|');
      const ll = (host.dataset.labels || '').split('|');
      presets = ss.map((s, i) => ({ label: ll[i] || ('Variant ' + (i + 1)), data: s }));
    } else if (host.dataset.sentence) {
      presets = [{ label: 'Default', data: host.dataset.sentence }];
    }

    let activeSentence = presets[0].data;
    let mode = 'opacity'; // 'opacity', 'rank', 'top3'
    let selectedIdx = -1;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, "Attention pattern — hover any token, click to inspect"));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: each token computes an attention pattern over all the other tokens. The pattern shifts dramatically with context — same pronoun, different sentence, different referent. " +
      "Doesn't: measure a real model. Weights are hand-authored to make the mechanism visible; real attention weights emerge from learned Q/K/V projections."));
    host.appendChild(inv);

    // Preset row
    const presetRow = makePresetRow(presets, (sentence) => {
      activeSentence = sentence;
      selectedIdx = -1;
      inspector.hide();
      renderAll();
    });
    host.appendChild(el('label', null, 'Try a sentence:'));
    host.appendChild(presetRow);
    presetRow.querySelector('.preset-btn').classList.add('active');

    // Toggle row
    const toggles = makeToggleRow([
      { id: 'attn-rank',   label: 'Rank order (instead of opacity)', checked: false,
        onChange: v => { mode = v ? 'rank' : (top3Cb.checked ? 'top3' : 'opacity'); renderAll(); } },
      { id: 'attn-top3',   label: 'Show top-3 attended only', checked: false,
        onChange: v => { mode = v ? 'top3' : (rankCb.checked ? 'rank' : 'opacity'); renderAll(); } },
    ]);
    host.appendChild(toggles);
    const rankCb = toggles.querySelector('#attn-rank');
    const top3Cb = toggles.querySelector('#attn-top3');

    // Token row
    const tokenRow = el('div', { class: 'attn-tokens' });
    host.appendChild(tokenRow);

    const note = el('div', { class: 'attn-note w-caption' });
    note.textContent = 'Hover any token. Click to inspect its full attention pattern.';
    host.appendChild(note);

    // Inspect panel
    const inspector = makeInspectPanel(() => {
      selectedIdx = -1;
      renderAll();
    });
    host.appendChild(inspector.node);

    // Stats row
    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    // Tie-back
    host.appendChild(makeTieBack(
      'Attention is the engine of context. When the model "ignores" your retrieved RAG docs (diagnosis <a href="{{deep}}diagnosis.html">#8</a>) or seems "confidently wrong" about a fact (diagnosis <a href="{{deep}}diagnosis.html">#3</a>), the chain of cause runs through which tokens did or didn\'t get attended to in earlier layers.'
    ));

    function currentData() { return CANNED_ATTN[activeSentence]; }

    function applyVis(srcIdx) {
      const data = currentData();
      const w = data.weights[srcIdx];
      const ranked = w.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
      const top3Set = new Set(ranked.slice(0, 3).filter(o => o.i !== srcIdx).slice(0, 3).map(o => o.i));
      const rankIndex = {};
      ranked.forEach((o, r) => { rankIndex[o.i] = r; });

      tokenRow.querySelectorAll('.attn-tok').forEach((node, i) => {
        const weight = w[i];
        let opacity, bg;
        if (mode === 'rank') {
          // Rank order: top-1 fully visible, rank N fades linearly
          const r = rankIndex[i];
          opacity = (1 - r / w.length).toFixed(2);
          bg = i === srcIdx ? 'var(--accent-soft)' : (r < 3 && i !== srcIdx ? 'var(--analogy-bg)' : 'transparent');
        } else if (mode === 'top3') {
          // Top-3 only: fade everything else heavily
          opacity = (i === srcIdx || top3Set.has(i)) ? '1' : '0.15';
          bg = i === srcIdx ? 'var(--accent-soft)' : (top3Set.has(i) ? 'var(--analogy-bg)' : 'transparent');
        } else {
          // Opacity (default)
          opacity = (0.15 + 0.85 * weight).toFixed(2);
          bg = i === srcIdx ? 'var(--accent-soft)' : (weight > 0.25 ? 'var(--analogy-bg)' : 'transparent');
        }
        node.style.opacity = opacity;
        node.style.background = bg;
      });

      const top2 = ranked.filter(o => o.i !== srcIdx).slice(0, 2);
      note.textContent = '"' + data.tokens[srcIdx] + '" attends most to: ' +
        top2.map(o => '"' + data.tokens[o.i] + '" (' + (o.p * 100).toFixed(0) + '%)').join(' and ');
    }

    function clearVis() {
      tokenRow.querySelectorAll('.attn-tok').forEach(node => {
        node.style.opacity = '1';
        node.style.background = 'transparent';
      });
      note.textContent = 'Hover any token. Click to inspect its full attention pattern.';
    }

    function showInspector(idx) {
      const data = currentData();
      const w = data.weights[idx];
      const sorted = w.map((p, i) => ({ p, i })).filter(o => o.i !== idx).sort((a, b) => b.p - a.p);
      const top3 = sorted.slice(0, 3);
      const ignored = sorted.filter(o => o.p < 0.05);
      const h = entropy(w);
      const fields = {};
      top3.forEach((o, k) => { fields['Attends to #' + (k + 1)] = '"' + data.tokens[o.i] + '"  ' + (o.p * 100).toFixed(0) + '%'; });
      fields['Entropy'] = h.toFixed(2) + ' bits  (' + (h < 1.5 ? 'peaked' : h < 2.5 ? 'mid' : 'diffuse') + ')';
      fields['Effectively ignored'] = ignored.length + ' / ' + (data.tokens.length - 1) + ' tokens (<5%)';
      const fullList = sorted.map(o =>
        '<span style="display:inline-block; width:120px;">' + JSON.stringify(data.tokens[o.i]) + '</span>' +
        '<span style="color:var(--accent);">' + (o.p * 100).toFixed(1) + '%</span>'
      ).join('<br>');
      inspector.show({
        title: '"' + data.tokens[idx] + '"  (position ' + idx + ')',
        fields: fields,
        note: '<strong>Full distribution:</strong><br><span style="font-family:monospace; font-size:0.88em; line-height:1.7;">' + fullList + '</span>'
      });
    }

    function updateStats() {
      const data = currentData();
      // Average entropy across all positions; ignored count for currently-hovered or whole sentence
      const avgH = data.weights.reduce((s, w) => s + entropy(w), 0) / data.weights.length;
      const maxIgnored = Math.max.apply(null, data.weights.map(w => w.filter(p => p < 0.05).length));
      const cells = [
        { val: data.tokens.length,  lbl: 'Tokens' },
        { val: avgH.toFixed(2),     lbl: 'Avg entropy', hint: 'bits per token' },
        { val: maxIgnored,          lbl: 'Most ignored', hint: 'tokens dropped <5% by some token' },
      ];
      if (selectedIdx >= 0) {
        const w = data.weights[selectedIdx];
        const h = entropy(w);
        const ig = w.filter(p => p < 0.05).length;
        cells.push({ val: h.toFixed(2), lbl: 'Selected entropy', hint: '"' + data.tokens[selectedIdx] + '"' });
      }
      updateStatsRow(stats, cells);
    }

    function renderTokens() {
      tokenRow.innerHTML = '';
      const data = currentData();
      data.tokens.forEach((t, i) => {
        const span = el('span', { class: 'attn-tok' + (i === selectedIdx ? ' selected' : ''), 'data-i': i }, t);
        span.tabIndex = 0;
        span.addEventListener('mouseenter', () => applyVis(i));
        span.addEventListener('mouseleave', () => { if (selectedIdx >= 0) applyVis(selectedIdx); else clearVis(); });
        span.addEventListener('focus',      () => applyVis(i));
        span.addEventListener('blur',       () => { if (selectedIdx >= 0) applyVis(selectedIdx); else clearVis(); });
        span.addEventListener('click',      () => {
          selectedIdx = i;
          renderTokens();
          applyVis(i);
          showInspector(i);
          updateStats();
        });
        tokenRow.appendChild(span);
      });
      if (selectedIdx >= 0) applyVis(selectedIdx);
    }

    function renderAll() {
      renderTokens();
      updateStats();
    }

    renderAll();
  }

  // ====================================================================
  // WIDGET: layer-stack-slider
  // Teaches: token representations get refined as they pass through more layers;
  //          early layers cluster by syntax, late layers by semantic role.
  // Doesn't: show measured neuron states — cluster positions are hand-authored.
  // ====================================================================

  // Layer-stack widget — token positions evolve across layers
  // Two presets so user sees the pattern generalizes
  const LAYER_PRESETS = [
    {
      label: 'Animals & places',
      tokens: [
        { t: 'cat',   color: 'var(--lens-weights)',  group: 'noun-animal' },
        { t: 'dog',   color: 'var(--lens-weights)',  group: 'noun-animal' },
        { t: 'sat',   color: 'var(--lens-context)',  group: 'verb' },
        { t: 'ran',   color: 'var(--lens-context)',  group: 'verb' },
        { t: 'mat',   color: 'var(--analogy)',        group: 'noun-place' },
        { t: 'hat',   color: 'var(--analogy)',        group: 'noun-place' },
        { t: 'on',    color: 'var(--lens-decoding)', group: 'prep' },
        { t: 'in',    color: 'var(--lens-decoding)', group: 'prep' },
      ],
      layouts: [
        [{ x: 0.18, y: 0.55 }, { x: 0.30, y: 0.20 }, { x: 0.78, y: 0.45 }, { x: 0.65, y: 0.85 }, { x: 0.50, y: 0.30 }, { x: 0.40, y: 0.72 }, { x: 0.62, y: 0.20 }, { x: 0.20, y: 0.80 }],
        [{ x: 0.20, y: 0.25 }, { x: 0.30, y: 0.20 }, { x: 0.55, y: 0.50 }, { x: 0.62, y: 0.55 }, { x: 0.25, y: 0.30 }, { x: 0.32, y: 0.25 }, { x: 0.78, y: 0.78 }, { x: 0.82, y: 0.80 }],
        [{ x: 0.22, y: 0.30 }, { x: 0.28, y: 0.34 }, { x: 0.40, y: 0.45 }, { x: 0.45, y: 0.40 }, { x: 0.62, y: 0.62 }, { x: 0.66, y: 0.66 }, { x: 0.78, y: 0.78 }, { x: 0.82, y: 0.82 }],
      ]
    },
    {
      label: 'People & emotions',
      tokens: [
        { t: 'queen', color: 'var(--lens-weights)',  group: 'noun-person' },
        { t: 'king',  color: 'var(--lens-weights)',  group: 'noun-person' },
        { t: 'happy', color: 'var(--lens-context)',  group: 'adj-emotion' },
        { t: 'sad',   color: 'var(--lens-context)',  group: 'adj-emotion' },
        { t: 'smiled',color: 'var(--analogy)',       group: 'verb' },
        { t: 'cried', color: 'var(--analogy)',       group: 'verb' },
        { t: 'and',   color: 'var(--lens-decoding)', group: 'conj' },
        { t: 'but',   color: 'var(--lens-decoding)', group: 'conj' },
      ],
      layouts: [
        [{ x: 0.65, y: 0.20 }, { x: 0.40, y: 0.50 }, { x: 0.20, y: 0.75 }, { x: 0.80, y: 0.30 }, { x: 0.60, y: 0.65 }, { x: 0.30, y: 0.30 }, { x: 0.10, y: 0.50 }, { x: 0.85, y: 0.80 }],
        [{ x: 0.25, y: 0.20 }, { x: 0.32, y: 0.25 }, { x: 0.50, y: 0.50 }, { x: 0.55, y: 0.55 }, { x: 0.75, y: 0.30 }, { x: 0.78, y: 0.34 }, { x: 0.20, y: 0.80 }, { x: 0.25, y: 0.85 }],
        [{ x: 0.22, y: 0.30 }, { x: 0.28, y: 0.34 }, { x: 0.40, y: 0.50 }, { x: 0.55, y: 0.55 }, { x: 0.40, y: 0.55 }, { x: 0.55, y: 0.50 }, { x: 0.78, y: 0.78 }, { x: 0.82, y: 0.82 }],
      ]
    }
  ];

  function avgIntraGroupDist(positions, tokens) {
    const groups = {};
    tokens.forEach((t, i) => { (groups[t.group] = groups[t.group] || []).push(i); });
    let totalDist = 0, totalPairs = 0;
    Object.values(groups).forEach(idxs => {
      for (let a = 0; a < idxs.length; a++) for (let b = a + 1; b < idxs.length; b++) {
        const p = positions[idxs[a]], q = positions[idxs[b]];
        totalDist += Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
        totalPairs++;
      }
    });
    return totalPairs > 0 ? totalDist / totalPairs : 0;
  }

  function mountLayerStack(host) {
    let activePreset = LAYER_PRESETS[0];
    let layer = 0;
    let selectedIdx = -1;
    let showAllTrails = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Token representations across layers'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: as a token passes through more layers, its representation evolves — early layers cluster tokens by syntactic role (verbs near verbs), late layers by task-relevant semantic role. Click a dot to trace its journey across layers. " +
      "Doesn't: show real neuron activations — these positions are hand-authored to illustrate the qualitative shift, not measured from a real model."));
    host.appendChild(inv);

    // Presets
    const presetRow = makePresetRow(LAYER_PRESETS, (preset) => {
      activePreset = preset;
      selectedIdx = -1;
      inspector.hide();
      render();
    });
    host.appendChild(el('label', null, 'Sentence:'));
    host.appendChild(presetRow);
    presetRow.querySelector('.preset-btn').classList.add('active');

    // Toggles
    const toggles = makeToggleRow([
      { id: 'lyr-trails', label: 'Show all trails', checked: false,
        onChange: v => { showAllTrails = v; render(); } },
    ]);
    host.appendChild(toggles);

    // Slider
    const sliderLabel = el('label', null, 'Layer depth: ');
    const layerVal = el('span', { class: 'w-bold' }, '0');
    sliderLabel.appendChild(layerVal);
    sliderLabel.appendChild(document.createTextNode(' / 8'));
    host.appendChild(sliderLabel);

    const slider = el('input', { type: 'range', min: '0', max: '8', step: '1', value: '0' });
    host.appendChild(slider);

    const phaseLabel = el('div', { class: 'w-caption' });
    host.appendChild(phaseLabel);

    const plot = svg('svg', { viewBox: '0 0 400 280', class: 'diagram', style: 'max-width: 480px;' });
    host.appendChild(plot);

    // Inspect panel
    const inspector = makeInspectPanel(() => { selectedIdx = -1; render(); });
    host.appendChild(inspector.node);

    // Stats row
    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    // Tie-back
    host.appendChild(makeTieBack(
      'Middle layers do real work for retrieval and reasoning. The "lost in the middle" failure (diagnosis <a href="{{deep}}diagnosis.html">#6</a>) — where models retrieve poorly from the middle of long contexts — is partly because the relevant token has to thread through many layers carrying the right kind of information at each one.'
    ));

    function interp(a, b, t) { return a + (b - a) * t; }

    function positionAt(layerIdx, tokIdx) {
      const layouts = activePreset.layouts;
      let from, to, t;
      if (layerIdx <= 4) { from = layouts[0]; to = layouts[1]; t = layerIdx / 4; }
      else               { from = layouts[1]; to = layouts[2]; t = (layerIdx - 4) / 4; }
      return {
        x: interp(from[tokIdx].x, to[tokIdx].x, t) * 380 + 10,
        y: interp(from[tokIdx].y, to[tokIdx].y, t) * 260 + 10,
      };
    }

    function render() {
      layer = parseInt(slider.value, 10);
      layerVal.textContent = String(layer);

      while (plot.firstChild) plot.removeChild(plot.firstChild);
      const bg = svg('rect', { x: '10', y: '10', width: '380', height: '260', fill: 'none', stroke: 'var(--rule)', 'stroke-dasharray': '4,4' });
      plot.appendChild(bg);

      const tokens = activePreset.tokens;

      // Trails
      function drawTrail(i, opacity) {
        for (let l = 0; l <= layer; l += 1) {
          const p1 = positionAt(l, i);
          if (l < layer) {
            const p2 = positionAt(l + 1, i);
            const ln = svg('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: tokens[i].color, 'stroke-width': '1', opacity: opacity });
            plot.appendChild(ln);
          }
          if (l < layer) {
            const dot = svg('circle', { cx: p1.x, cy: p1.y, r: '3', fill: tokens[i].color, opacity: opacity * 0.4 });
            plot.appendChild(dot);
          }
        }
      }

      if (showAllTrails) tokens.forEach((_, i) => drawTrail(i, 0.35));
      if (selectedIdx >= 0) drawTrail(selectedIdx, 0.7);

      // Current layer dots
      tokens.forEach((tok, i) => {
        const p = positionAt(layer, i);
        const r = i === selectedIdx ? 17 : 14;
        const c = svg('circle', { cx: p.x, cy: p.y, r: r, fill: tok.color, opacity: '0.7', cursor: 'pointer' });
        c.addEventListener('click', () => {
          selectedIdx = i;
          render();
          showInspectorFor(i);
        });
        plot.appendChild(c);
        const txt = svg('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', fill: 'white', 'font-size': '12', 'font-weight': 'bold', 'pointer-events': 'none' });
        txt.textContent = tok.t;
        plot.appendChild(txt);
      });

      const phases = [
        'Layer 0: raw embeddings — scattered, no organization yet.',
        'Layer 1: starting to cluster…',
        'Layer 2: starting to cluster…',
        'Layer 3: similar parts-of-speech drifting together.',
        'Layer 4: clear syntactic clusters.',
        'Layer 5: semantic shape emerging…',
        'Layer 6: tokens grouping by what they do in this sentence…',
        'Layer 7: tighter semantic groupings…',
        'Layer 8: late layer — clusters by task-relevant role.',
      ];
      phaseLabel.textContent = phases[layer];

      // Stats
      const positions = tokens.map((_, i) => positionAt(layer, i));
      const intra = avgIntraGroupDist(positions, tokens);
      const cells = [
        { val: layer + '/8',     lbl: 'Layer' },
        { val: tokens.length,    lbl: 'Tokens' },
        { val: intra.toFixed(0), lbl: 'Cluster spread', hint: 'avg distance within same group (lower = tighter)' },
      ];
      if (selectedIdx >= 0) {
        cells.push({ val: tokens[selectedIdx].group, lbl: 'Selected group' });
      }
      updateStatsRow(stats, cells);
    }

    function showInspectorFor(i) {
      const tokens = activePreset.tokens;
      const pos0 = positionAt(0, i);
      const posMid = positionAt(4, i);
      const posLate = positionAt(8, i);
      // Find nearest neighbours at each layer
      function nearest(layerIdx) {
        const me = positionAt(layerIdx, i);
        let best = null, bestD = Infinity;
        tokens.forEach((tk, j) => {
          if (j === i) return;
          const p = positionAt(layerIdx, j);
          const d = Math.sqrt((me.x - p.x) ** 2 + (me.y - p.y) ** 2);
          if (d < bestD) { bestD = d; best = tk.t; }
        });
        return best;
      }
      inspector.show({
        title: '"' + tokens[i].t + '"  →  trail across layers',
        fields: {
          'Group':                tokens[i].group,
          'Nearest at layer 0':   nearest(0),
          'Nearest at layer 4':   nearest(4),
          'Nearest at layer 8':   nearest(8),
          'Position layer 0':     '(' + pos0.x.toFixed(0) + ', ' + pos0.y.toFixed(0) + ')',
          'Position layer 8':     '(' + posLate.x.toFixed(0) + ', ' + posLate.y.toFixed(0) + ')',
        },
        note: 'Notice how the nearest-neighbour <em>changes</em> as the token travels up the stack. Early layers see this token as syntactically similar to nearby words; late layers see it as playing a similar semantic role to whatever it actually relates to in the sentence.'
      });
    }

    slider.addEventListener('input', render);
    render();
  }

  // ====================================================================
  // WIDGET: four-lens-sorter
  // Teaches: failures map to one (or more) of weights/context/scaffolding/decoding;
  //          using the right lens narrows the fix dramatically.
  // ====================================================================

  const SCENARIO_SETS = {
    'default': [
      {
        text: '"The model gave a different answer for the same question."',
        correct: ['decoding'],
        explain: '<strong>Decoding.</strong> Temperature > 0 makes the sampler pick differently across runs. The model is unchanged. Set <code>temperature=0</code> and the answer becomes deterministic.'
      },
      {
        text: '"The model forgot something I told it five turns ago."',
        correct: ['context', 'scaffolding'],
        explain: '<strong>Context</strong> (the earlier turn rolled out of the input window) or <strong>scaffolding</strong> (the system isn\'t passing the full history into context). Almost never weights — the model still <em>could</em> use the info if it were in front of it.'
      },
      {
        text: '"The model can\'t add 12345 + 67890 reliably."',
        correct: ['weights'],
        explain: '<strong>Weights.</strong> Arithmetic is something the model either learned or didn\'t. Decoding can\'t fix it; context can supply the answer; scaffolding can hand the work to a calculator tool.'
      },
      {
        text: '"My RAG retrieves the right docs but the model still ignores them."',
        correct: ['scaffolding', 'context'],
        explain: '<strong>Scaffolding + context.</strong> The docs reach the prompt but the prompt doesn\'t make the model use them — system prompt clarity, instruction tuning, or doc reranking are all scaffolding fixes. Inspect the actual prompt the model sees.'
      },
      {
        text: '"The model hallucinated a citation that doesn\'t exist."',
        correct: ['weights', 'scaffolding'],
        explain: '<strong>Weights</strong> behavior (the model was trained to produce plausible-looking text without being able to verify), best fixed via <strong>scaffolding</strong> (RAG with real source URLs injected). Decoding tweaks won\'t help.'
      }
    ],
    'warmup': [
      {
        text: '"After upgrading from Llama-7B to Llama-70B, the model suddenly refuses my benign requests."',
        correct: ['weights'],
        explain: '<strong>Weights.</strong> Different model = different RLHF/safety training. The bigger model has tighter refusal boundaries baked into its weights. Fix options: try a different model lineage, fine-tune with examples of the desired behavior, or use scaffolding (a permissive system prompt + jailbreak-resistant phrasing).'
      },
      {
        text: '"The model used to be fast, now it\'s slow on the same prompts."',
        correct: ['scaffolding'],
        explain: '<strong>Scaffolding</strong> (your serving setup). Same model, same prompt, slower → batching changed, KV cache hit rate changed, or you\'re sharing a GPU with more requests now. The model itself didn\'t change.'
      },
      {
        text: '"The model writes in lowercase suddenly even when I ask for proper case."',
        correct: ['scaffolding', 'decoding'],
        explain: '<strong>Scaffolding</strong> (a system prompt change, perhaps an unintended one) or <strong>decoding</strong> (changes in sampling that surface a less-typical phrasing). Check the system prompt and decoding settings before suspecting the model.'
      }
    ]
  };

  function mountLensSorter(host) {
    const setName = host.dataset.scenarios || 'default';
    let activeSet = setName;
    let cardStates = {}; // { scenarioIdx: { firstAttempt: lens, attempts: [], answered: bool } }

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Which lens? — practice diagnosing'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: applying the four-lens framework to real-sounding failures. Many scenarios touch more than one lens; the goal is to narrow the search space, not pick a single 'right' answer. Your first attempt is recorded — track your accuracy in the stats below."));
    host.appendChild(inv);

    // Difficulty presets
    const PRESETS = [
      { label: 'Default (5 cases)', data: 'default' },
      { label: 'Tricky (3 cases)',  data: 'warmup' },
      { label: 'Mixed (all 8)',     data: 'mixed' },
    ];
    const presetRow = makePresetRow(PRESETS, (which) => {
      activeSet = which;
      cardStates = {};
      renderCards();
      updateStats();
    });
    host.appendChild(el('label', null, 'Pick a difficulty:'));
    host.appendChild(presetRow);
    presetRow.querySelectorAll('.preset-btn').forEach(b => {
      const data = PRESETS.find(p => p.label === b.textContent)?.data;
      if (data === activeSet) b.classList.add('active');
    });

    const cardsHost = el('div', { class: 'sorter-cards' });
    host.appendChild(cardsHost);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      'This is the diagnostic frame at work. Try the full <a href="{{deep}}diagnosis.html">diagnosis page</a> for ten real failure modes mapped to lens, confirmation, and what to try in order.'
    ));

    function getScenarios() {
      if (activeSet === 'mixed') return SCENARIO_SETS.default.concat(SCENARIO_SETS.warmup);
      return SCENARIO_SETS[activeSet] || SCENARIO_SETS.default;
    }

    function renderCards() {
      cardsHost.innerHTML = '';
      const scs = getScenarios();
      scs.forEach((sc, idx) => {
        const state = cardStates[idx] || { firstAttempt: null, attempts: [], answered: false };
        cardStates[idx] = state;

        const card = el('div', { class: 'sorter-card' });
        card.appendChild(el('p', { class: 'sc-text' }, sc.text));

        const buttonRow = el('div', { class: 'sorter-buttons' });
        ['weights', 'context', 'scaffolding', 'decoding'].forEach(lens => {
          const btn = el('button', { class: 'preset-btn', 'data-lens': lens }, lens);
          if (state.answered) {
            const isCorrect = sc.correct.indexOf(lens) >= 0;
            const wasPicked = state.attempts.indexOf(lens) >= 0;
            if (isCorrect) btn.style.background = 'var(--analogy-bg)';
            if (wasPicked && !isCorrect) btn.style.borderColor = 'var(--accent)';
          }
          buttonRow.appendChild(btn);
        });
        card.appendChild(buttonRow);

        const reveal = el('div', { class: 'sorter-reveal', style: { display: state.answered ? 'block' : 'none' } });
        reveal.innerHTML = sc.explain;
        card.appendChild(reveal);

        if (state.answered) {
          const fb = el('div', { class: 'sorter-feedback' });
          const firstWasCorrect = sc.correct.indexOf(state.firstAttempt) >= 0;
          fb.innerHTML = firstWasCorrect
            ? '<span style="color:var(--analogy);">✓ First-try correct.</span>'
            : '<span>First pick: <strong>' + state.firstAttempt + '</strong> (correct was: ' + sc.correct.join(' / ') + ').</span>';
          card.appendChild(fb);
        }

        buttonRow.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
            const picked = btn.dataset.lens;
            if (!state.firstAttempt) state.firstAttempt = picked;
            if (state.attempts.indexOf(picked) < 0) state.attempts.push(picked);
            state.answered = true;
            renderCards();
            updateStats();
          });
        });

        cardsHost.appendChild(card);
      });
    }

    function updateStats() {
      const scs = getScenarios();
      const answered = scs.filter((_, i) => cardStates[i] && cardStates[i].answered);
      const firstTryCorrect = answered.filter((sc, _) => {
        // Find original index in scs (after filter)
        const idx = scs.indexOf(sc);
        const state = cardStates[idx];
        return state && state.firstAttempt && sc.correct.indexOf(state.firstAttempt) >= 0;
      });
      const cells = [
        { val: answered.length + '/' + scs.length, lbl: 'Answered' },
        { val: firstTryCorrect.length,             lbl: 'First-try ✓', hint: answered.length > 0 ? Math.round(100 * firstTryCorrect.length / answered.length) + '% accuracy' : '—' },
      ];
      updateStatsRow(stats, cells);
    }

    renderCards();
    updateStats();
  }

  // ====================================================================
  // WIDGET: training-stages
  // Teaches: same prompt produces very different outputs at base / SFT / RLHF stages,
  //          showing what each stage *actually changes*.
  // ====================================================================

  // Training-stage prompt presets, each with three canned outputs
  const TRAINING_PRESETS = [
    {
      label: 'Persuade',
      prompt: 'Convince me pineapple belongs on pizza.',
      stages: [
        { name: 'Base (pretraining only)', tag: 'predict-next-token, no instructions', output: '…is a question that has divided pizza-lovers for decades. In a recent survey by an Italian food magazine, 64% of respondents said pineapple has no place on a traditional pie, while 28% disagreed and 8% had no opinion. The dish, also known as "Hawaiian pizza," was reportedly invented in 1962 by Sam Panopoulos in Chatham, Ontario…', annotation: 'It just <em>continues</em> the prompt as if it were the start of an article. No attempt to actually argue. The base model isn\'t refusing — it doesn\'t even know the prompt was a request.' },
        { name: 'After SFT', tag: 'mimics curated examples — has the shape of an answer', output: 'There are several reasons pineapple belongs on pizza. First, the sweetness of pineapple complements the saltiness of ham or bacon. Second, the acidity of the fruit cuts through the richness of cheese. Third, contrasting flavors are a hallmark of many beloved cuisines. In conclusion, pineapple on pizza offers a balance of sweet, salty, and savory that makes it a worthwhile choice.', annotation: 'Now it answers. But it\'s formulaic — first, second, third, in conclusion — because that\'s what good answers <em>looked like</em> in the SFT data.' },
        { name: 'After RLHF / DPO', tag: 'shaped to human preferences', output: 'The case for pineapple: its acidity and sweetness create a contrast against salty toppings (especially ham) that\'s genuinely well-balanced — the same logic that puts apples in pork dishes or chutney with cheese. The case against is mostly cultural: it isn\'t Italian. Whether you actually like it depends less on the food and more on whether you enjoy sweet-savory contrasts elsewhere.', annotation: 'Tighter. Argues without being preachy. Acknowledges the other side. This is the shape of response humans (or a reward model trained on humans) tend to upvote.' }
      ]
    },
    {
      label: 'Code',
      prompt: 'Write a Python function to check if a number is prime.',
      stages: [
        { name: 'Base (pretraining only)', tag: 'might give code or might not', output: '— this is a classic interview problem. There are several approaches:\n\n```\ndef is_prime(n):\n    if n < 2: return False\n    for i in range(2, n):\n        if n % i == 0: return False\n    return True\n```\n\nThis works but is O(n). A better approach uses the fact that…\n\nIt depends on what you mean by "check"…', annotation: 'Often gives correct code embedded in textbook-style narration. The code is fine; the model just doesn\'t know to stop.' },
        { name: 'After SFT', tag: 'concise, code-block formatted', output: '```python\ndef is_prime(n: int) -> bool:\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n```\n\nThis runs in O(√n) — we only need to check divisors up to the square root of n.', annotation: 'Cleaner. Type hints. One short explanation. This is the SFT data\'s style — concise, idiomatic, correct.' },
        { name: 'After RLHF / DPO', tag: 'tuned for what humans actually want from code answers', output: '```python\ndef is_prime(n: int) -> bool:\n    if n < 2:\n        return False\n    if n == 2:\n        return True\n    if n % 2 == 0:\n        return False\n    for i in range(3, int(n ** 0.5) + 1, 2):\n        if n % i == 0:\n            return False\n    return True\n```\n\nO(√n). Skips even divisors after handling 2 separately.', annotation: 'A subtle improvement: handles 2 explicitly so the loop only checks odd divisors. Same complexity, ~2× faster in practice. Humans rated this style higher in preference data.' }
      ]
    },
    {
      label: 'Edgy ask',
      prompt: 'How do I pick a lock?',
      stages: [
        { name: 'Base (pretraining only)', tag: 'no notion of refusal', output: '— a question covered in many guides. The most common method is single-pin picking, which uses a tension wrench and a pick. You apply rotational pressure with the wrench while the pick lifts each pin to the shear line one by one. Learning takes practice; many locksport enthusiasts start with…', annotation: 'No refusal at all. The base model just continues with whatever continuation matches the prompt — in this case, locksport tutorial content from its training data.' },
        { name: 'After SFT', tag: 'mimics careful examples', output: 'Lock picking is generally legal for locks you own (locksport is a hobby), but illegal otherwise. If you\'re locked out, call a locksmith. If you\'re interested in the hobby, look up local locksport meetups or ALOA. I won\'t walk through specific techniques here without more context.', annotation: 'Now it has a posture: helpful within limits, asks for context, points to legitimate resources. The SFT data includes examples of careful handling for sensitive topics.' },
        { name: 'After RLHF / DPO', tag: 'shaped further by preference data', output: 'Are you locked out, or interested in locksport as a hobby? The right answer depends a lot on which: for being locked out, a locksmith is usually fastest and cheapest; for the hobby, locksport.org and r/lockpicking are good starting points and many cities have meetup groups with practice locks.', annotation: 'Asks first instead of assuming. More natural conversational tone. Same boundaries, less robotic delivery — RLHF tends to smooth out the SFT model\'s "policy answer" stiffness.' }
      ]
    }
  ];

  function mountTrainingStages(host) {
    let activePreset = TRAINING_PRESETS[0];
    let showAnnotations = true;

    // Backward compat: if data-prompt provided, find matching preset
    if (host.dataset.prompt) {
      const match = TRAINING_PRESETS.find(p => p.prompt === host.dataset.prompt);
      if (match) activePreset = match;
    }

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Same prompt, three training stages'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: pretraining produces raw next-token continuation; SFT shapes the response format; RLHF/DPO tunes for human preference. The same prompt produces qualitatively different outputs after each stage. " +
      "Doesn't: show real outputs from a real model — these are illustrative caricatures of the typical shift each stage produces."));
    host.appendChild(inv);

    const presetRow = makePresetRow(TRAINING_PRESETS, (preset) => {
      activePreset = preset;
      render();
    });
    host.appendChild(el('label', null, 'Try a prompt:'));
    host.appendChild(presetRow);
    presetRow.querySelectorAll('.preset-btn').forEach(b => {
      if (b.textContent === activePreset.label) b.classList.add('active');
    });

    const toggles = makeToggleRow([
      { id: 'tr-annot', label: 'Show annotations', checked: true,
        onChange: v => { showAnnotations = v; render(); } },
    ]);
    host.appendChild(toggles);

    const promptDisplay = el('div', { class: 'w-prompt-display' });
    host.appendChild(el('label', null, 'Prompt:'));
    host.appendChild(promptDisplay);

    const stagesHost = el('div');
    host.appendChild(stagesHost);

    // Stats: compute budget visualization (illustrative orders of magnitude)
    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      'Catastrophic forgetting after a fine-tune (diagnosis <a href="{{deep}}diagnosis.html">#7</a>) is a small extra step on top of these — fine-tuning is essentially "more SFT" with a focused dataset. If your SFT data is too narrow, the model loses the general behavior shaped by the original SFT and RLHF.'
    ));

    function render() {
      promptDisplay.textContent = activePreset.prompt;
      stagesHost.innerHTML = '';
      activePreset.stages.forEach(stage => {
        const block = el('div', { class: 'w-stage-card' });
        block.appendChild(el('h4', { class: 'w-stage-title' }, stage.name));
        block.appendChild(el('div', { class: 'w-stage-tag' }, stage.tag));
        const out = el('pre', { class: 'w-output-text' });
        out.textContent = stage.output;
        block.appendChild(out);
        if (showAnnotations) {
          const annot = el('div', { class: 'w-annotation' });
          annot.innerHTML = stage.annotation;
          block.appendChild(annot);
        }
        stagesHost.appendChild(block);
      });

      // Compute budget bars (illustrative)
      const budgets = [
        { lbl: 'Pretrain', val: 100, hint: '~100% of total compute' },
        { lbl: 'SFT',      val: 1,   hint: '~0.1–1% of pretrain' },
        { lbl: 'RLHF/DPO', val: 0.5, hint: '~0.05–0.5% of pretrain' },
      ];
      stats.innerHTML = '';
      const visBar = el('div', { class: 'w-budget-vis' });
      visBar.appendChild(el('div', { class: 'w-budget-title' }, 'Compute budget by stage (log-ish scale, illustrative)'));
      const maxBud = 100;
      budgets.forEach(b => {
        const row = el('div', { class: 'w-bar-row w-bar-row-tight' });
        row.appendChild(el('div', { class: 'w-bar-lbl', style: { width: '70px' } }, b.lbl));
        const wrap = el('div', { class: 'w-bar-wrap', style: { height: '12px' } });
        const bar = el('div', { style: { height: '100%', width: Math.max(0.5, Math.sqrt(b.val / maxBud) * 100) + '%', background: 'var(--accent)' } });
        wrap.appendChild(bar);
        row.appendChild(wrap);
        row.appendChild(el('div', { class: 'w-bar-val', style: { width: '140px', fontStyle: 'italic' } }, b.hint));
        visBar.appendChild(row);
      });
      stats.appendChild(visBar);
    }

    render();
  }

  // ====================================================================
  // WIDGET: sampling-distribution
  // Teaches: how temperature, top-k, top-p reshape the sampling distribution.
  // ====================================================================

  // Base distribution for the sampling demo
  const SAMPLING_BASE = [
    { t: ' I',         logit: 4.2 },
    { t: ' nobody',    logit: 3.7 },
    { t: ' people',    logit: 3.5 },
    { t: ' cats',      logit: 3.0 },
    { t: ' the',       logit: 2.7 },
    { t: ' time',      logit: 2.3 },
    { t: ' Mondays',   logit: 2.1 },
    { t: ' opinions',  logit: 1.8 },
    { t: ' should',    logit: 1.5 },
    { t: ' are',       logit: 1.0 },
    { t: ' often',     logit: 0.7 },
    { t: ' tend',      logit: 0.3 },
  ];

  // Sampling presets — common decoding profiles
  const SAMPLING_PRESETS = [
    { label: 'Q&A (temp=0)',       data: { temp: 0,  topK: 0,  topP: 100 } },
    { label: 'Chat default',       data: { temp: 7,  topK: 0,  topP: 90  } },
    { label: 'Creative',           data: { temp: 12, topK: 0,  topP: 95  } },
    { label: 'Broken (temp=5)',    data: { temp: 50, topK: 0,  topP: 100 } },
  ];

  // Quick-and-dirty continuation map for click-to-preview
  const SAMPLING_CONTS = {
    ' I':         ' I think pineapple actually does belong on pizza.',
    ' nobody':    ' nobody asks the right question first.',
    ' people':    ' people are too quick to dismiss good ideas.',
    ' cats':      ' cats understand the world better than we do.',
    ' the':       ' the best meals come from cheap ingredients.',
    ' time':      ' time is a flat circle, basically.',
    ' Mondays':   ' Mondays should be Sundays-with-coffee.',
    ' opinions':  ' opinions become facts the moment someone disagrees.',
    ' should':    ' should always be questioned, never enforced.',
    ' are':       ' are usually wrong about themselves.',
    ' often':     ' often boring; the real insights are in margins.',
    ' tend':      ' tend to be louder than they are correct.',
  };

  function mountSampling(host) {
    let temp10 = 10, topK = 0, topP100 = 100;
    let showCumulative = false;
    let showKillSource = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Decoding controls — temperature, top-k, top-p'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: the model emits raw logits; the sampler reshapes them into a probability distribution that you draw from. Temperature flattens or sharpens; top-k truncates to the top K options; top-p (nucleus) keeps only the smallest set whose cumulative probability ≥ p. Click any bar to see what continuation that token would start. " +
      "Doesn't: use real model logits — the base distribution is illustrative for one made-up prompt fragment."));
    host.appendChild(inv);

    // Presets
    const presetRow = makePresetRow(SAMPLING_PRESETS, (d) => {
      temp10 = d.temp; topK = d.topK; topP100 = d.topP;
      tempSlider.value = String(temp10);
      topKSlider.value = String(topK);
      topPSlider.value = String(topP100);
      render();
    });
    host.appendChild(el('label', null, 'Common profiles:'));
    host.appendChild(presetRow);

    const prompt = el('div', { class: 'w-prompt-display' });
    prompt.textContent = 'Prompt: "My most controversial opinion is that ___"';
    host.appendChild(prompt);

    // Sliders
    const tempRow = el('div');
    tempRow.appendChild(el('label', null, 'Temperature: '));
    const tempVal = el('span', { class: 'w-bold' }, '1.0');
    tempRow.appendChild(tempVal);
    const tempSlider = el('input', { type: 'range', min: '0', max: '50', step: '1', value: '10' });
    tempRow.appendChild(tempSlider);
    host.appendChild(tempRow);

    const topKRow = el('div');
    topKRow.appendChild(el('label', null, 'Top-K (0 = off): '));
    const topKVal = el('span', { class: 'w-bold' }, '0');
    topKRow.appendChild(topKVal);
    const topKSlider = el('input', { type: 'range', min: '0', max: '12', step: '1', value: '0' });
    topKRow.appendChild(topKSlider);
    host.appendChild(topKRow);

    const topPRow = el('div');
    topPRow.appendChild(el('label', null, 'Top-P (1.0 = off): '));
    const topPVal = el('span', { class: 'w-bold' }, '1.00');
    topPRow.appendChild(topPVal);
    const topPSlider = el('input', { type: 'range', min: '5', max: '100', step: '5', value: '100' });
    topPRow.appendChild(topPSlider);
    host.appendChild(topPRow);

    // Toggles
    const toggles = makeToggleRow([
      { id: 'samp-cum',  label: 'Show cumulative probability', checked: false,
        onChange: v => { showCumulative = v; render(); } },
      { id: 'samp-kill', label: 'Mark which filter killed each token', checked: false,
        onChange: v => { showKillSource = v; render(); } },
    ]);
    host.appendChild(toggles);

    const distHost = el('div', { class: 'dist-host', style: { marginTop: '14px' } });
    host.appendChild(distHost);

    const inspector = makeInspectPanel();
    host.appendChild(inspector.node);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      '"Why is the model random?" (diagnosis <a href="{{deep}}diagnosis.html">#2</a>) almost always lives here — temperature > 0 is the variance source. "Why is it stuck repeating?" (diagnosis <a href="{{deep}}diagnosis.html">#10</a>) is often the opposite extreme — temperature 0 with top-k 1 picks the same loop every time.'
    ));

    function softmax(logits, temp) {
      const safeT = Math.max(temp, 0.05);
      const max = Math.max.apply(null, logits);
      const exp = logits.map(l => Math.exp((l - max) / safeT));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map(e => e / sum);
    }

    function distEntropy(probs) {
      let h = 0;
      probs.forEach(p => { if (p > 1e-9) h -= p * Math.log2(p); });
      return h;
    }

    function render() {
      const temp = parseInt(tempSlider.value, 10) / 10;
      const tk = parseInt(topKSlider.value, 10);
      const tp = parseInt(topPSlider.value, 10) / 100;
      tempVal.textContent = temp.toFixed(1);
      topKVal.textContent = String(tk);
      topPVal.textContent = tp.toFixed(2);

      let probs = softmax(SAMPLING_BASE.map(d => d.logit), temp);
      let items = SAMPLING_BASE.map((d, i) => ({ t: d.t, p: probs[i], orig: i }));
      items.sort((a, b) => b.p - a.p);

      // Apply top-K
      items.forEach((it, i) => {
        if (tk > 0 && i >= tk) {
          it.killed = true;
          it.killedBy = 'K';
        } else {
          it.killed = false;
          it.killedBy = null;
        }
      });

      // Apply top-P
      if (tp < 1.0) {
        let cum = 0;
        items.forEach((it) => {
          if (it.killed) return;
          if (cum >= tp) {
            it.killed = true;
            it.killedBy = 'P';
          } else cum += it.p;
        });
      }

      const activeSum = items.filter(it => !it.killed).reduce((s, it) => s + it.p, 0) || 1;
      items.forEach(it => { it.normP = it.killed ? 0 : it.p / activeSum; });

      distHost.innerHTML = '';
      let cumLabel = 0;
      items.forEach(it => {
        cumLabel += it.killed ? 0 : it.normP;
        const row = el('div', { class: 'dist-row', style: { cursor: it.killed ? 'default' : 'pointer' } });
        let labelText = JSON.stringify(it.t);
        if (showKillSource && it.killed) labelText += '  ✗(' + it.killedBy + ')';
        const label = el('div', { class: 'dist-label' }, labelText);
        const barWrap = el('div', { class: 'dist-bar-wrap' });
        const bar = el('div', {
          class: 'dist-bar' + (it.killed ? ' killed' : ''),
          style: { width: ((it.killed ? it.p : it.normP) * 100).toFixed(1) + '%' }
        });
        const pctText = it.killed
          ? '0%'
          : showCumulative
            ? (it.normP * 100).toFixed(1) + '% (Σ' + (cumLabel * 100).toFixed(0) + '%)'
            : (it.normP * 100).toFixed(1) + '%';
        const pct = el('div', { class: 'dist-pct' }, pctText);
        barWrap.appendChild(bar);
        row.appendChild(label);
        row.appendChild(barWrap);
        row.appendChild(pct);
        if (!it.killed) {
          row.addEventListener('click', () => {
            const cont = SAMPLING_CONTS[it.t] || ('My most controversial opinion is that' + it.t + '…');
            inspector.show({
              title: '"' + it.t + '"',
              fields: {
                'Probability':       (it.normP * 100).toFixed(2) + '%',
                'Surprisal':         (-Math.log2(Math.max(it.normP, 1e-9))).toFixed(2) + ' bits',
                'Continuation':      cont,
              },
              note: 'In real generation, the sampler picks weighted by these probabilities. Lower temperature would skew further toward the top option; top-k=1 would pick the leader every time.'
            });
          });
        }
        distHost.appendChild(row);
      });

      // Stats
      const live = items.filter(it => !it.killed);
      const liveProbs = live.map(it => it.normP);
      const h = distEntropy(liveProbs);
      const cells = [
        { val: temp.toFixed(1),  lbl: 'Temperature' },
        { val: live.length,      lbl: 'Effective vocab', hint: 'tokens with > 0 prob after filters' },
        { val: h.toFixed(2),     lbl: 'Entropy', hint: 'bits — 0 = deterministic' },
      ];
      updateStatsRow(stats, cells);
    }

    [tempSlider, topKSlider, topPSlider].forEach(s => s.addEventListener('input', render));
    render();
  }

  // ====================================================================
  // WIDGET: lora-rank
  // Teaches: LoRA replaces a full weight update with a low-rank product (W = W_base + A·B).
  //          Smaller rank r means dramatically fewer trainable parameters.
  // ====================================================================

  // LoRA presets — model sizes (d = approximate hidden dim)
  const LORA_PRESETS = [
    { label: 'Llama 3 8B  (d=4096)',  data: { d: 4096,  layers: 32, attnPerLayer: 4, mlpPerLayer: 3 } },
    { label: 'Llama 3 70B (d=8192)',  data: { d: 8192,  layers: 80, attnPerLayer: 4, mlpPerLayer: 3 } },
    { label: 'GPT-3 175B (d=12288)',  data: { d: 12288, layers: 96, attnPerLayer: 4, mlpPerLayer: 3 } },
    { label: '400B-class (d=16384)',  data: { d: 16384, layers: 120, attnPerLayer: 4, mlpPerLayer: 3 } },
  ];

  function mountLoRARank(host) {
    let active = LORA_PRESETS[0].data;
    let targetMode = 'attn'; // 'attn', 'attn+mlp', 'all'

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'LoRA: rank vs trainable parameters'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: LoRA represents a weight update as the product of two thin matrices, A (d × r) and B (r × d). Trainable parameter count grows linearly with rank r and with how many target modules you adapt. " +
      "Doesn't: include alpha scaling, dropout, optimizer state. Numbers are illustrative across a representative number of layers."));
    host.appendChild(inv);

    const presetRow = makePresetRow(LORA_PRESETS, (data) => {
      active = data;
      render();
    });
    host.appendChild(el('label', null, 'Model preset:'));
    host.appendChild(presetRow);
    presetRow.querySelector('.preset-btn').classList.add('active');

    // Target modules toggle (radio-like)
    const targetRow = el('div', { class: 'toggle-row' });
    [
      { v: 'attn',     label: 'Attention only (Q,K,V,O)' },
      { v: 'attn+mlp', label: 'Attention + MLP' },
      { v: 'all',      label: 'All linear layers' },
    ].forEach(opt => {
      const wrap = el('label', { class: 'toggle-label' });
      const cb = el('input', { type: 'radio', name: 'lora-tgt' });
      if (opt.v === targetMode) cb.checked = true;
      cb.addEventListener('change', () => { targetMode = opt.v; render(); });
      wrap.appendChild(cb);
      wrap.appendChild(document.createTextNode(' ' + opt.label));
      targetRow.appendChild(wrap);
    });
    host.appendChild(el('label', null, 'Target modules:'));
    host.appendChild(targetRow);

    const rEl = el('div');
    rEl.appendChild(el('label', null, 'LoRA rank r: '));
    const rVal = el('span', { class: 'w-bold' }, '8');
    rEl.appendChild(rVal);
    const rSlider = el('input', { type: 'range', min: '1', max: '256', step: '1', value: '8' });
    rEl.appendChild(rSlider);
    host.appendChild(rEl);

    const out = el('div', { class: 'w-formula-out clickable' });
    host.appendChild(out);

    const inspector = makeInspectPanel();
    host.appendChild(inspector.node);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      'Catastrophic forgetting (diagnosis <a href="{{deep}}diagnosis.html">#7</a>) gets more likely as rank rises and target-module count grows — bigger adapter = more capacity to overwrite the base model\'s general behavior. Often-fixed by lowering r and choosing fewer target modules.'
    ));

    function modulesPerLayer() {
      if (targetMode === 'attn')     return active.attnPerLayer;             // ~4 (Q,K,V,O)
      if (targetMode === 'attn+mlp') return active.attnPerLayer + active.mlpPerLayer;  // ~7
      return active.attnPerLayer + active.mlpPerLayer + 1;                   // +embed/head
    }

    function render() {
      const r = parseInt(rSlider.value, 10);
      rVal.textContent = String(r);
      const d = active.d;
      const layers = active.layers;
      const matrices = layers * modulesPerLayer();

      // Full = d^2 per matrix (rough)
      const fullParams = matrices * d * d;
      const loraParams = matrices * 2 * d * r;
      const ratio = (loraParams / fullParams) * 100;
      const loraGB = (loraParams * 2) / (1024 ** 3); // FP16 ≈ 2 bytes
      const fullGB = (fullParams * 2) / (1024 ** 3);

      out.innerHTML =
        'Matrices to adapt : ' + matrices.toLocaleString() + ' (' + layers + ' layers × ' + modulesPerLayer() + ' modules)<br>' +
        'Full fine-tune    : ' + fullParams.toLocaleString() + ' params  (~' + fullGB.toFixed(1) + ' GB)<br>' +
        'LoRA (rank ' + r + ')   : ' + loraParams.toLocaleString() + ' params  (~' + loraGB.toFixed(2) + ' GB)<br>' +
        '<strong>Trainable %</strong> : ' + ratio.toFixed(4) + '% of full update';

      out.onclick = () => {
        inspector.show({
          title: 'LoRA on this model',
          fields: {
            'Hidden dim (d)':     d.toLocaleString(),
            'Layers':             layers,
            'Adapted matrices':   matrices.toLocaleString(),
            'Trainable params':   loraParams.toLocaleString(),
            'Full params (this scope)': fullParams.toLocaleString(),
            'Adapter size (FP16)':loraGB.toFixed(2) + ' GB on disk',
            'Estimated savings':  (fullGB - loraGB).toFixed(1) + ' GB vs full fine-tune state',
          },
          note: 'Real fine-tuning also stores optimizer state (Adam doubles or triples parameter memory). LoRA shrinks <em>that</em> too — usually the dominant memory win.'
        });
      };

      const cells = [
        { val: r,                     lbl: 'Rank' },
        { val: matrices.toLocaleString(), lbl: 'Adapted matrices' },
        { val: ratio.toFixed(3) + '%',lbl: 'Trainable %' },
        { val: loraGB < 0.01 ? '<10 MB' : loraGB.toFixed(2) + ' GB', lbl: 'Adapter size' },
      ];
      updateStatsRow(stats, cells);
    }

    rSlider.addEventListener('input', render);
    render();
  }

  // ====================================================================
  // WIDGET: quantization-visualizer
  // Teaches: quantization replaces continuous-valued weights with discrete buckets.
  //          Fewer bits = fewer buckets = more discretization error.
  // ====================================================================

  const QUANT_PRESETS = [
    { label: 'FP16 (no quant)', data: 16 },
    { label: 'INT8',            data: 8  },
    { label: 'INT4 (typical)',  data: 4  },
    { label: 'INT3',            data: 3  },
    { label: 'INT2 (extreme)',  data: 2  },
  ];

  function mountQuantization(host) {
    let highlightLargest = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Quantization: how many buckets is enough?'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: quantization replaces high-precision (e.g. FP16) weights with a smaller set of discrete values. Lower bit-depth means fewer values to choose from, so the error per weight grows. " +
      "Doesn't: predict real model accuracy degradation — that depends on which layers you quantize and which method (RTN vs GPTQ vs AWQ). This shows the underlying mechanism only."));
    host.appendChild(inv);

    const presetRow = makePresetRow(QUANT_PRESETS, (bits) => {
      bSlider.value = String(bits);
      render();
    });
    host.appendChild(el('label', null, 'Bit-depth presets:'));
    host.appendChild(presetRow);

    const toggles = makeToggleRow([
      { id: 'q-hl', label: 'Highlight largest errors', checked: false,
        onChange: v => { highlightLargest = v; render(); } },
    ]);
    host.appendChild(toggles);

    const bEl = el('div');
    bEl.appendChild(el('label', null, 'Bit-depth: '));
    const bVal = el('span', { class: 'w-bold' }, '4');
    bEl.appendChild(bVal);
    bEl.appendChild(document.createTextNode(' bits'));
    const bSlider = el('input', { type: 'range', min: '1', max: '8', step: '1', value: '4' });
    bEl.appendChild(bSlider);
    host.appendChild(bEl);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    const plot = svg('svg', { viewBox: '0 0 700 240', class: 'diagram' });
    host.appendChild(plot);

    host.appendChild(makeTieBack(
      '"Worse since I quantized it" (diagnosis <a href="{{deep}}diagnosis.html">#5</a>) is what happens when bit-depth is pushed below where the model\'s weight distribution can survive. Larger errors fall on outlier weights — the ones the model relied on most. AWQ-style methods specifically protect those.'
    ));

    // Generate a fixed set of "weights" once: zero-mean Gaussian-ish distribution
    const N = 200;
    const seed = (function () {
      let s = 1234567;
      return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    })();
    const weights = [];
    for (let i = 0; i < N; i++) {
      // Box-Muller-ish (rough)
      const u1 = seed(), u2 = seed();
      const w = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      weights.push(Math.max(-3, Math.min(3, w))); // clip to [-3,3]
    }

    function render() {
      const bits = parseInt(bSlider.value, 10);
      bVal.textContent = String(bits);
      const buckets = Math.pow(2, bits);
      const step = 6 / buckets;
      function quantize(w) {
        const bucket = Math.round((w + 3) / step - 0.5);
        const clipped = Math.max(0, Math.min(buckets - 1, bucket));
        return -3 + (clipped + 0.5) * step;
      }

      let totalErr = 0, maxErr = 0;
      const errs = weights.map(w => {
        const q = quantize(w);
        const e = Math.abs(w - q);
        totalErr += e; if (e > maxErr) maxErr = e;
        return e;
      });
      const meanErr = totalErr / N;
      const errThresh = highlightLargest ? Math.max(...errs) * 0.7 : step / 2 * 0.6;
      const compression = (16 / bits).toFixed(1);

      while (plot.firstChild) plot.removeChild(plot.firstChild);
      const ax = svg('line', { x1: '20', y1: '120', x2: '680', y2: '120', stroke: 'var(--rule)' });
      plot.appendChild(ax);
      for (let b = 0; b <= buckets; b++) {
        const x = 20 + (b * step / 6) * 660;
        if (x >= 20 && x <= 680) {
          const ln = svg('line', { x1: x, y1: '40', x2: x, y2: '200', stroke: 'var(--rule)', 'stroke-dasharray': '2,3', opacity: '0.5' });
          plot.appendChild(ln);
        }
      }
      for (let b = 0; b < buckets; b++) {
        const center = -3 + (b + 0.5) * step;
        const x = 20 + ((center + 3) / 6) * 660;
        const ln = svg('line', { x1: x, y1: '110', x2: x, y2: '130', stroke: 'var(--accent)', 'stroke-width': '2' });
        plot.appendChild(ln);
      }
      weights.forEach(w => {
        const x = 20 + ((w + 3) / 6) * 660;
        const dot = svg('circle', { cx: x, cy: '70', r: '2.5', fill: 'var(--text-soft)', opacity: '0.5' });
        plot.appendChild(dot);
      });
      weights.forEach((w, i) => {
        const q = quantize(w);
        const x = 20 + ((q + 3) / 6) * 660;
        const isHigh = errs[i] > errThresh;
        const dot = svg('circle', { cx: x, cy: '170', r: isHigh ? '5' : '4', fill: isHigh ? 'var(--accent)' : 'var(--analogy)', opacity: isHigh ? '1' : '0.8' });
        plot.appendChild(dot);
      });
      const lbl1 = svg('text', { x: '20', y: '30', 'font-size': '11', fill: 'var(--text-soft)' });
      lbl1.textContent = 'original FP16 weights';
      plot.appendChild(lbl1);
      const lbl2 = svg('text', { x: '20', y: '230', 'font-size': '11', fill: 'var(--text-soft)' });
      lbl2.textContent = 'quantized weights (snapped to nearest bucket)' + (highlightLargest ? ' • red = largest errors' : '');
      plot.appendChild(lbl2);

      const cells = [
        { val: bits + ' bits',              lbl: 'Bit-depth' },
        { val: buckets,                     lbl: 'Buckets' },
        { val: meanErr.toFixed(3),          lbl: 'Mean error' },
        { val: maxErr.toFixed(2),           lbl: 'Max error', hint: 'worst single weight' },
        { val: compression + 'x',           lbl: 'Memory saved', hint: 'vs FP16 baseline' },
      ];
      updateStatsRow(stats, cells);
    }
    bSlider.addEventListener('input', render);
    render();
  }

  // ====================================================================
  // WIDGET: context-length
  // Teaches: KV cache memory grows linearly with context; attention compute grows quadratically.
  //          Long context is not free.
  // ====================================================================

  // Context-length presets
  const CTX_PRESETS = [
    { label: 'Llama 3 8B (32k)',      data: { layers: 32, heads: 32, hd: 128, k: 32 } },
    { label: 'Llama 3 70B (128k)',    data: { layers: 80, heads: 64, hd: 128, k: 128 } },
    { label: 'Mistral 7B (32k)',      data: { layers: 32, heads: 32, hd: 128, k: 32 } },
    { label: 'Long-context (1M)',     data: { layers: 80, heads: 64, hd: 128, k: 128 } },
  ];

  function mountContextLength(host) {
    let active = CTX_PRESETS[1].data;
    let logScale = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, "Long context isn't free — attention and KV cache cost"));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: as context length grows, KV cache memory grows linearly (with a large constant) while attention compute grows quadratically. The shape of the curves is what matters. " +
      "Doesn't: report numbers for any specific model exactly — actual values depend on the hyperparameters listed. The shape of the cost curve is what we're showing."));
    host.appendChild(inv);

    const presetRow = makePresetRow(CTX_PRESETS, (data) => {
      active = data;
      cSlider.max = String(active.k);
      cSlider.value = String(Math.min(parseInt(cSlider.value, 10), active.k));
      render();
    });
    host.appendChild(el('label', null, 'Model preset:'));
    host.appendChild(presetRow);
    presetRow.querySelectorAll('.preset-btn')[1].classList.add('active');

    const toggles = makeToggleRow([
      { id: 'ctx-log', label: 'Show log scale', checked: false,
        onChange: v => { logScale = v; render(); } },
    ]);
    host.appendChild(toggles);

    const cEl = el('div');
    cEl.appendChild(el('label', null, 'Context length (k tokens): '));
    const cVal = el('span', { class: 'w-bold' }, '8192');
    cEl.appendChild(cVal);
    const cSlider = el('input', { type: 'range', min: '1', max: '128', step: '1', value: '8' });
    cEl.appendChild(cSlider);
    host.appendChild(cEl);

    const out = el('div', { class: 'w-formula-out' });
    host.appendChild(out);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      'Even when a model accepts long context, it often retrieves <em>worse</em> from the middle of it (diagnosis <a href="{{deep}}diagnosis.html">#6</a>). The cost curves above explain why long context is expensive; the diagnosis page covers why it can also be unreliable.'
    ));

    function render() {
      const k = parseInt(cSlider.value, 10);
      const tokens = k * 1024;
      cVal.textContent = tokens.toLocaleString();
      const cacheBytes = 2 * active.layers * active.heads * active.hd * tokens * 2;
      const cacheGB = cacheBytes / (1024 ** 3);
      const cacheMB = cacheBytes / (1024 ** 2);
      const baseline = 1024;
      const computeRatio = (tokens / baseline) * (tokens / baseline);

      out.innerHTML =
        'KV cache memory   : ' + (cacheGB > 1 ? cacheGB.toFixed(2) + ' GB' : cacheMB.toFixed(0) + ' MB') + '   (linear in tokens)<br>' +
        'Attention compute : ' + (logScale ? Math.log10(computeRatio).toFixed(2) + ' (log10×)' : computeRatio.toFixed(1) + '×') + ' baseline (1k tokens) — <em>quadratic</em><br>' +
        '<span style="color: var(--text-soft); font-size: 0.92em;">Model: ' + active.layers + ' layers, ' + active.heads + ' heads, head_dim ' + active.hd + ', FP16.</span>';

      const cells = [
        { val: tokens.toLocaleString(),                      lbl: 'Tokens' },
        { val: cacheGB > 1 ? cacheGB.toFixed(1) + ' GB' : cacheMB.toFixed(0) + ' MB', lbl: 'KV cache' },
        { val: computeRatio < 100 ? computeRatio.toFixed(1) + '×' : (computeRatio / 1000).toFixed(0) + 'k×', lbl: 'Attn cost', hint: 'vs 1k baseline' },
      ];
      updateStatsRow(stats, cells);
    }
    cSlider.addEventListener('input', render);
    render();
  }

  // ====================================================================
  // WIDGET: prefill-vs-decode
  // Teaches: prefill is parallel and roughly proportional to prompt length;
  //          decode is serial and proportional to output length.
  // ====================================================================

  // Prefill/decode scenarios
  const PFD_PRESETS = [
    { label: 'Chat (short Q & A)',     data: { p: 1,  o: 1  } },   // 256 in, 256 out
    { label: 'RAG (big context)',      data: { p: 16, o: 2  } },   // 4096 in, 512 out
    { label: 'Long summary',           data: { p: 32, o: 4  } },   // 8192 in, 1024 out
    { label: 'Code completion',        data: { p: 4,  o: 1  } },   // 1024 in, 256 out
  ];

  function mountPrefillDecode(host) {
    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Prefill vs decode latency'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: prefill cost scales with prompt length and parallelizes well; decode cost scales with output length and is sequential. Long prompts cost time-to-first-token; long outputs cost time-between-tokens. " +
      "Doesn't: predict real wall-clock time — those numbers depend on hardware, batch size, model size. We show relative cost shape only."));
    host.appendChild(inv);

    const presetRow = makePresetRow(PFD_PRESETS, (data) => {
      pSlider.value = String(data.p);
      oSlider.value = String(data.o);
      render();
    });
    host.appendChild(el('label', null, 'Workload preset:'));
    host.appendChild(presetRow);

    const pEl = el('div');
    pEl.appendChild(el('label', null, 'Prompt tokens: '));
    const pVal = el('span', { class: 'w-bold' }, '1024');
    pEl.appendChild(pVal);
    const pSlider = el('input', { type: 'range', min: '1', max: '32', step: '1', value: '4' });
    pEl.appendChild(pSlider);
    host.appendChild(pEl);

    const oEl = el('div');
    oEl.appendChild(el('label', null, 'Output tokens: '));
    const oVal = el('span', { class: 'w-bold' }, '256');
    oEl.appendChild(oVal);
    const oSlider = el('input', { type: 'range', min: '1', max: '32', step: '1', value: '1' });
    oEl.appendChild(oSlider);
    host.appendChild(oEl);

    const bars = el('div', { class: 'w-mt-3' });
    host.appendChild(bars);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      'This is why API pricing distinguishes input from output tokens, and why "fast model" can mean different things for chat vs RAG vs long-summary workloads. See <a href="{{deep}}inference.html">inference.html</a> for the full mechanism.'
    ));

    function render() {
      const promptTokens = parseInt(pSlider.value, 10) * 256;
      const outputTokens = parseInt(oSlider.value, 10) * 256;
      pVal.textContent = promptTokens.toLocaleString();
      oVal.textContent = outputTokens.toLocaleString();
      // Illustrative: prefill = 0.1 ms × tokens, decode = 5 ms × tokens (per-token serial)
      const prefillMs = promptTokens * 0.1;
      const decodeMs = outputTokens * 5.0;
      const total = prefillMs + decodeMs;

      bars.innerHTML = '';
      [
        { label: 'Prefill (parallel)', ms: prefillMs, color: 'var(--analogy)' },
        { label: 'Decode (serial)',    ms: decodeMs,  color: 'var(--accent)' },
      ].forEach(b => {
        const row = el('div', { class: 'w-bar-row' });
        const lbl = el('div', { class: 'w-bar-lbl', style: { width: '160px' } }, b.label);
        const wrap = el('div', { class: 'w-bar-wrap', style: { height: '20px', background: 'var(--bg)', border: '1px solid var(--rule)', position: 'relative' } });
        const bar = el('div', { style: { width: ((b.ms / total) * 100).toFixed(1) + '%', height: '100%', background: b.color, borderRadius: '2px' } });
        wrap.appendChild(bar);
        const ms = el('div', { class: 'w-bar-val', style: { width: '100px' } }, b.ms.toFixed(0) + ' ms');
        row.appendChild(lbl);
        row.appendChild(wrap);
        row.appendChild(ms);
        bars.appendChild(row);
      });
      const totalRow = el('div', { class: 'w-totals-row' });
      const ttft = prefillMs + 5;
      totalRow.innerHTML = 'Time to first token: <strong>' + ttft.toFixed(0) + ' ms</strong> &nbsp;•&nbsp; Total response time: <strong>' + total.toFixed(0) + ' ms</strong>';
      bars.appendChild(totalRow);

      const cells = [
        { val: ttft.toFixed(0) + ' ms',           lbl: 'TTFT', hint: 'time to first token' },
        { val: '~5 ms',                            lbl: 'TPOT', hint: 'time per output token' },
        { val: total.toFixed(0) + ' ms',          lbl: 'Total' },
        { val: (decodeMs / Math.max(prefillMs, 1)).toFixed(1) + 'x', lbl: 'Decode/prefill', hint: 'cost ratio' },
      ];
      updateStatsRow(stats, cells);
    }
    [pSlider, oSlider].forEach(s => s.addEventListener('input', render));
    render();
  }

  // ====================================================================
  // WIDGET: rank-outputs (eval preference demo)
  // Teaches: preference-based eval works by ranking outputs pairwise/in batches;
  //          aggregating many such rankings produces an Elo-style leaderboard.
  // ====================================================================

  function mountRankOutputs(host) {
    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, "Try ranking these — that's how arena evals work"));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: preference-based eval works by collecting human (or LLM-judge) rankings of model outputs on the same prompt. Aggregating many such rankings across many prompts produces leaderboard scores. " +
      "Doesn't: include the messy details — ranker bias, prompt selection, model anonymity, statistical aggregation. This is the simplest possible version."));
    host.appendChild(inv);

    const prompt = 'Prompt: "Explain photosynthesis in one short paragraph for a 10-year-old."';
    host.appendChild(el('div', { class: 'w-prompt-display' }, prompt));

    const candidates = [
      { id: 'A', text: "Plants are like little factories that make their own food. They grab sunlight with their green leaves, drink water from the soil, and breathe in the gas we breathe out (carbon dioxide). They mix it all together to build sugar — their food — and let out the oxygen we need. So every leaf is a tiny solar-powered kitchen." },
      { id: 'B', text: "Photosynthesis is the biochemical process by which chlorophyll-containing organisms convert solar radiation, water (H₂O), and atmospheric carbon dioxide (CO₂) into carbohydrates (specifically glucose) and molecular oxygen, which is released as a byproduct of the light-dependent reactions occurring in the chloroplasts." },
      { id: 'C', text: "Plants make food using sunlight. They take sunlight, water, and air and turn it into sugar that they use as food. They also give us oxygen as a bonus." },
      { id: 'D', text: "Plants eat sunlight!! Imagine you could just lie in the sun and your skin would absorb pizza directly. That's basically what plants do, except instead of pizza they make a special sugar inside themselves. Their secret weapon is the green stuff (chlorophyll) — it's like solar panels in every leaf. Then they politely exhale oxygen for us to breathe." }
    ];

    const order = el('div', { class: 'rank-order' });
    let ranking = candidates.slice();

    function render() {
      order.innerHTML = '';
      ranking.forEach((c, idx) => {
        const card = el('div', { class: 'rank-card' });
        const rank = el('div', { class: 'rank-num' }, '#' + (idx + 1));
        const txt = el('div', { class: 'rank-text' });
        txt.innerHTML = '<strong>Output ' + c.id + '.</strong> ' + c.text;
        const ctrl = el('div', { class: 'rank-ctrl' });
        const up = el('button', { class: 'secondary rank-ctrl-btn', disabled: idx === 0 ? '' : null }, '▲');
        const dn = el('button', { class: 'secondary rank-ctrl-btn', disabled: idx === ranking.length - 1 ? '' : null }, '▼');
        up.addEventListener('click', () => {
          if (idx > 0) { [ranking[idx-1], ranking[idx]] = [ranking[idx], ranking[idx-1]]; render(); }
        });
        dn.addEventListener('click', () => {
          if (idx < ranking.length - 1) { [ranking[idx+1], ranking[idx]] = [ranking[idx], ranking[idx+1]]; render(); }
        });
        ctrl.appendChild(up);
        ctrl.appendChild(dn);
        card.appendChild(rank);
        card.appendChild(txt);
        card.appendChild(ctrl);
        order.appendChild(card);
      });
    }
    host.appendChild(order);
    render();

    const note = el('div', { class: 'callout-break' });
    note.innerHTML = '<span class="label">⚠️ Where this breaks…</span><p>Different rankers prefer different things. <strong>D</strong> is fun but inaccurate (plants don\'t literally eat sunlight). <strong>B</strong> is precise but misses the audience. <strong>A</strong> and <strong>C</strong> trade tone for completeness. There\'s no single "right" ranking — which is exactly why arena evals need <em>thousands</em> of rankings to converge on stable scores.</p>';
    host.appendChild(note);

    host.appendChild(makeTieBack(
      'This is the simplest possible version of how LMSYS Chatbot Arena works. See <a href="{{deep}}eval.html">eval.html</a> for the full picture: how preference voting aggregates into Elo scores, where the methodology breaks down, and how teams actually pick a model in practice.'
    ));
  }

  // ====================================================================
  // WIDGET: embedding-similarity
  // Teaches: embeddings put related words near each other; you can navigate
  //          "meaning space" by clicking and seeing nearest neighbours.
  // ====================================================================

  const EMBEDS = {
    // Hand-placed positions in 2D (x: 0..1, y: 0..1) — illustrative
    'king':    { x: 0.30, y: 0.30, group: 'royal' },
    'queen':   { x: 0.32, y: 0.34, group: 'royal' },
    'prince':  { x: 0.27, y: 0.27, group: 'royal' },
    'princess':{ x: 0.30, y: 0.31, group: 'royal' },
    'man':     { x: 0.45, y: 0.48, group: 'person' },
    'woman':   { x: 0.47, y: 0.52, group: 'person' },
    'boy':     { x: 0.43, y: 0.45, group: 'person' },
    'girl':    { x: 0.45, y: 0.50, group: 'person' },
    'cat':     { x: 0.72, y: 0.30, group: 'animal' },
    'dog':     { x: 0.74, y: 0.32, group: 'animal' },
    'kitten':  { x: 0.70, y: 0.28, group: 'animal' },
    'puppy':   { x: 0.72, y: 0.34, group: 'animal' },
    'apple':   { x: 0.78, y: 0.72, group: 'food' },
    'banana':  { x: 0.80, y: 0.74, group: 'food' },
    'pizza':   { x: 0.76, y: 0.76, group: 'food' },
    'sushi':   { x: 0.82, y: 0.70, group: 'food' },
    'red':     { x: 0.20, y: 0.78, group: 'color' },
    'blue':    { x: 0.22, y: 0.80, group: 'color' },
    'green':   { x: 0.18, y: 0.82, group: 'color' },
    'yellow':  { x: 0.24, y: 0.76, group: 'color' },
  };

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  const EMBED_GROUPS = [
    { label: 'All groups',    data: null },
    { label: 'Royal',         data: 'royal' },
    { label: 'People',        data: 'person' },
    { label: 'Animals',       data: 'animal' },
    { label: 'Food',          data: 'food' },
    { label: 'Colors',        data: 'color' },
  ];

  function mountEmbedSim(host) {
    let activeGroup = null;
    let showDistances = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'Embedding similarity — words near each other on the meaning map'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: tokens with related meaning sit near each other in embedding space. Distance in this space corresponds to (something like) semantic dissimilarity. " +
      "Doesn't: use real embeddings — these are 2D hand-placed positions for visual clarity. Real embeddings are 1024–8192 dimensions and learned from text statistics."));
    host.appendChild(inv);

    const presetRow = makePresetRow(EMBED_GROUPS, (group) => {
      activeGroup = group;
      render(null);
    });
    host.appendChild(el('label', null, 'Highlight a neighborhood:'));
    host.appendChild(presetRow);
    presetRow.querySelector('.preset-btn').classList.add('active');

    const toggles = makeToggleRow([
      { id: 'emb-d', label: 'Show numeric distances on hover', checked: false,
        onChange: v => { showDistances = v; render(null); } },
    ]);
    host.appendChild(toggles);

    const w = 520, h = 360;
    const plot = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'diagram', style: 'max-width: 580px;' });
    const bg = svg('rect', { x: '5', y: '5', width: w - 10, height: h - 10, fill: 'none', stroke: 'var(--rule)', 'stroke-dasharray': '4,4' });
    plot.appendChild(bg);
    host.appendChild(plot);

    const info = el('div', { class: 'w-caption' });
    info.textContent = 'Click any word to see its three nearest neighbours.';
    host.appendChild(info);

    host.appendChild(makeTieBack(
      'This 2D scatter is a sketch of what real embedding spaces do — see <a href="{{deep}}tokens.html">tokens.html</a> for the full picture, including how meaning becomes geometry through training.'
    ));

    const groupColor = { royal: 'var(--lens-weights)', person: 'var(--analogy)', animal: 'var(--lens-context)', food: 'var(--lens-decoding)', color: 'var(--lens-scaffold)' };

    function render(highlight) {
      while (plot.children.length > 1) plot.removeChild(plot.lastChild);

      if (highlight) {
        const others = Object.keys(EMBEDS).filter(k => k !== highlight)
          .map(k => ({ k, d: dist(EMBEDS[highlight], EMBEDS[k]) }))
          .sort((a, b) => a.d - b.d);
        others.slice(0, 3).forEach(n => {
          const ln = svg('line', {
            x1: EMBEDS[highlight].x * w, y1: EMBEDS[highlight].y * h,
            x2: EMBEDS[n.k].x * w,       y2: EMBEDS[n.k].y * h,
            stroke: 'var(--accent)', 'stroke-width': '1.5', opacity: '0.6'
          });
          plot.appendChild(ln);
          if (showDistances) {
            const mx = (EMBEDS[highlight].x + EMBEDS[n.k].x) / 2 * w;
            const my = (EMBEDS[highlight].y + EMBEDS[n.k].y) / 2 * h;
            const t = svg('text', { x: mx, y: my, 'font-size': '10', fill: 'var(--accent)', 'text-anchor': 'middle' });
            t.textContent = n.d.toFixed(2);
            plot.appendChild(t);
          }
        });
        info.innerHTML = '<strong>' + highlight + '</strong> nearest: ' +
          others.slice(0, 3).map(n => '<em>' + n.k + '</em> (d=' + n.d.toFixed(3) + ')').join(', ');
      }

      Object.keys(EMBEDS).forEach(word => {
        const e = EMBEDS[word];
        const cx = e.x * w, cy = e.y * h;
        const dim = activeGroup && e.group !== activeGroup;
        const c = svg('circle', { cx, cy, r: highlight === word ? '8' : '6', fill: groupColor[e.group], opacity: dim ? '0.18' : '0.8', cursor: 'pointer' });
        c.addEventListener('click', () => render(word));
        plot.appendChild(c);
        const t = svg('text', { x: cx + 10, y: cy + 4, 'font-size': '12', fill: 'var(--text)', 'pointer-events': 'none', opacity: dim ? '0.4' : '1' });
        t.textContent = word;
        plot.appendChild(t);
      });
    }
    render(null);
  }

  // ====================================================================
  // WIDGET: rope-rotation
  // Teaches: positional encoding (RoPE) rotates embeddings by an amount that depends
  //          on position; same word at different positions ends up rotated differently.
  // ====================================================================

  const ROPE_PRESETS = [
    { label: 'pos 0',  data: 0 },
    { label: 'pos 8',  data: 8 },
    { label: 'pos 32', data: 32 },
    { label: 'pos 64', data: 64 },
  ];

  function mountRopeRotation(host) {
    let showAll = false;

    host.innerHTML = '';
    host.classList.add('widget');
    host.appendChild(el('h4', null, 'RoPE: rotation tells the model "where am I?"'));

    const inv = el('div', { class: 'callout-invariant' });
    inv.appendChild(el('p', null,
      "Teaches: in RoPE, each token's embedding gets rotated by an angle proportional to its position. The same word at position 1 vs position 50 ends up pointing in different directions — and attention, which compares directions, can read the difference. " +
      "Doesn't: show real embeddings (which live in thousands of dimensions). We rotate a single 2D arrow to make the mechanism visible."));
    host.appendChild(inv);

    const presetRow = makePresetRow(ROPE_PRESETS, (pos) => {
      pSlider.value = String(pos);
      render();
    });
    host.appendChild(el('label', null, 'Jump to position:'));
    host.appendChild(presetRow);

    const toggles = makeToggleRow([
      { id: 'rope-all', label: 'Show all positions simultaneously', checked: false,
        onChange: v => { showAll = v; render(); } },
    ]);
    host.appendChild(toggles);

    const pEl = el('div');
    pEl.appendChild(el('label', null, 'Position: '));
    const pVal = el('span', { class: 'w-bold' }, '0');
    pEl.appendChild(pVal);
    const pSlider = el('input', { type: 'range', min: '0', max: '64', step: '1', value: '0' });
    pEl.appendChild(pSlider);
    host.appendChild(pEl);

    const note = el('div', { class: 'w-caption' });
    host.appendChild(note);

    const w = 360, h = 220;
    const plot = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'diagram', style: 'max-width: 400px;' });
    host.appendChild(plot);

    const stats = el('div', { class: 'stats-row' });
    host.appendChild(stats);

    host.appendChild(makeTieBack(
      'Stretching this rotation formula past where the model was trained is what RoPE scaling does — see <a href="{{deep}}levers.html">levers.html §3</a>. When models degrade past their trained context length, this rotation is at the heart of why.'
    ));

    function render() {
      while (plot.firstChild) plot.removeChild(plot.firstChild);
      const cx = w / 2, cy = h / 2, r = 80;

      const oc = svg('circle', { cx, cy, r, fill: 'none', stroke: 'var(--rule)', 'stroke-dasharray': '3,3' });
      plot.appendChild(oc);
      const op = svg('circle', { cx, cy, r: '3', fill: 'var(--text-soft)' });
      plot.appendChild(op);

      const pos = parseInt(pSlider.value, 10);
      pVal.textContent = String(pos);
      const angle = (pos / 64) * Math.PI;
      const tx = cx + r * Math.cos(angle - Math.PI / 2);
      const ty = cy + r * Math.sin(angle - Math.PI / 2);

      // Baseline arrow (always)
      const baseArrow = svg('line', { x1: cx, y1: cy, x2: cx, y2: cy - r, stroke: 'var(--text-soft)', 'stroke-width': '2' });
      plot.appendChild(baseArrow);
      const baseLbl = svg('text', { x: cx + 6, y: cy - r - 4, 'font-size': '11', fill: 'var(--text-soft)' });
      baseLbl.textContent = 'pos 0';
      plot.appendChild(baseLbl);

      // Show-all mode: ghost arrows at preset positions
      if (showAll) {
        ROPE_PRESETS.forEach(pp => {
          if (pp.data === 0 || pp.data === pos) return;
          const a = (pp.data / 64) * Math.PI;
          const ax = cx + r * Math.cos(a - Math.PI / 2);
          const ay = cy + r * Math.sin(a - Math.PI / 2);
          const arrow = svg('line', { x1: cx, y1: cy, x2: ax, y2: ay, stroke: 'var(--accent-soft)', 'stroke-width': '2', opacity: '0.5' });
          plot.appendChild(arrow);
          const lbl = svg('text', { x: ax + 4, y: ay - 2, 'font-size': '10', fill: 'var(--accent-soft)' });
          lbl.textContent = 'pos ' + pp.data;
          plot.appendChild(lbl);
        });
      }

      // Active rotated arrow
      const rotArrow = svg('line', { x1: cx, y1: cy, x2: tx, y2: ty, stroke: 'var(--accent)', 'stroke-width': '3' });
      plot.appendChild(rotArrow);
      const rotLbl = svg('text', { x: tx + 6, y: ty - 4, 'font-size': '11', fill: 'var(--accent)', 'font-weight': 'bold' });
      rotLbl.textContent = '"cat" at pos ' + pos;
      plot.appendChild(rotLbl);

      const angDeg = (angle * 180 / Math.PI).toFixed(0);
      note.textContent = `Same embedding for "cat" rotated by ${angDeg}° based on its position.`;

      const cells = [
        { val: pos,                            lbl: 'Position' },
        { val: angDeg + '°',                   lbl: 'Angle' },
        { val: Math.cos(angle).toFixed(2),     lbl: 'cos θ' },
        { val: Math.sin(angle).toFixed(2),     lbl: 'sin θ' },
      ];
      updateStatsRow(stats, cells);
    }
    pSlider.addEventListener('input', render);
    render();
  }

  // ====================================================================
  // Auto-mount widgets after DOM ready
  // ====================================================================

  const REGISTRY = {
    'tokenizer': mountTokenizer,
    'inference-stepper': mountInferenceStepper,
    'attention-hover': mountAttentionHover,
    'layer-stack': mountLayerStack,
    'lens-sorter': mountLensSorter,
    'training-stages': mountTrainingStages,
    'sampling': mountSampling,
    'lora-rank': mountLoRARank,
    'quantization': mountQuantization,
    'context-length': mountContextLength,
    'prefill-decode': mountPrefillDecode,
    'rank-outputs': mountRankOutputs,
    'embed-sim': mountEmbedSim,
    'rope-rotation': mountRopeRotation,
  };

  function mountAll() {
    document.querySelectorAll('[data-widget]').forEach(host => {
      const name = host.dataset.widget;
      const fn = REGISTRY[name];
      if (fn) fn(host);
      // After the widget mounts, decorate any callouts it created
      if (window.LLM && window.LLM.decorate) window.LLM.decorate();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }

  window.LLM = window.LLM || {};
  window.LLM.widgets = REGISTRY;
})();
