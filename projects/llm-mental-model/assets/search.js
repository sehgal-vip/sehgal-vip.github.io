// Heading search palette
//   - Cmd-K / Ctrl-K / `/` to open
//   - Esc to close
//   - Arrow keys to navigate, Enter to jump
//   - Fuzzy substring match across all headings in the index

(function () {
  'use strict';

  const INDEX = (window.LLM && window.LLM.searchIndex) || [];

  function fuzzyScore(query, text) {
    // Simple fuzzy: lowercase substring match + character-sequence bonus
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t.indexOf(q) >= 0) return 100 - t.indexOf(q);  // earlier match = better
    // Character-sequence match (in order)
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    if (qi === q.length) return 30;
    return 0;
  }

  function urlFromCurrent(targetUrl) {
    // targetUrl is relative to the artifact root (e.g., "deep/inference.html#kv-cache")
    // Resolve correctly whether we're at the root or in /deep/
    const inDeep = /\/deep\//.test(location.pathname);
    if (inDeep) {
      // We're at /deep/foo.html; need to climb out
      if (targetUrl.startsWith('deep/')) return '../' + targetUrl;
      if (targetUrl.startsWith('index.html')) return '../' + targetUrl;
      return targetUrl;
    } else {
      return targetUrl;
    }
  }

  let modal, input, results, selected = 0;
  let visibleResults = [];

  function openPalette() {
    if (!modal) buildPalette();
    modal.style.display = 'flex';
    input.value = '';
    selected = 0;
    renderResults('');
    setTimeout(() => input.focus(), 10);
  }

  function closePalette() {
    if (modal) modal.style.display = 'none';
  }

  function renderResults(q) {
    let scored;
    if (!q) {
      // Show first 8
      scored = INDEX.slice(0, 8).map(item => ({ item, score: 1 }));
    } else {
      scored = INDEX
        .map(item => ({ item, score: fuzzyScore(q, item.text + ' ' + item.page) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    }
    visibleResults = scored.map(r => r.item);
    if (selected >= visibleResults.length) selected = Math.max(0, visibleResults.length - 1);
    results.innerHTML = '';
    visibleResults.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'search-result' + (i === selected ? ' selected' : '');
      row.innerHTML = '<span class="search-text">' + escapeHtml(item.text) + '</span><span class="search-page">' + escapeHtml(item.page) + '</span>';
      row.addEventListener('mouseenter', () => { selected = i; updateSelected(); });
      row.addEventListener('click', () => { jumpTo(visibleResults[selected]); });
      results.appendChild(row);
    });
    if (visibleResults.length === 0) {
      results.innerHTML = '<div class="search-empty">No matching headings.</div>';
    }
  }

  function updateSelected() {
    const rows = results.querySelectorAll('.search-result');
    rows.forEach((r, i) => r.classList.toggle('selected', i === selected));
  }

  function jumpTo(item) {
    closePalette();
    location.href = urlFromCurrent(item.url);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function buildPalette() {
    modal = document.createElement('div');
    modal.id = 'search-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(60,46,31,0.4); display:none; align-items:flex-start; justify-content:center; padding-top:120px; z-index:2000;';
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg); width:520px; max-width:92vw; border:1px solid var(--rule); border-radius:6px; box-shadow:0 16px 48px rgba(0,0,0,0.3); overflow:hidden;';
    input = document.createElement('input');
    input.type = 'text';
    input.id = 'search-input';
    input.placeholder = 'Search headings…';
    input.style.cssText = 'width:100%; padding:14px 18px; border:none; border-bottom:1px solid var(--rule); background:transparent; color:var(--text); font-size:1em; font-family:Georgia, serif; outline:none;';
    results = document.createElement('div');
    results.id = 'search-results';
    card.appendChild(input);
    card.appendChild(results);
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:8px 18px; font-size:0.78em; color:var(--text-soft); border-top:1px solid var(--rule); background:var(--bg-muted);';
    hint.innerHTML = '<kbd>↑</kbd> <kbd>↓</kbd> navigate &nbsp;·&nbsp; <kbd>↵</kbd> open &nbsp;·&nbsp; <kbd>esc</kbd> close';
    card.appendChild(hint);
    modal.appendChild(card);
    modal.addEventListener('click', (e) => { if (e.target === modal) closePalette(); });
    document.body.appendChild(modal);

    input.addEventListener('input', () => {
      selected = 0;
      renderResults(input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selected < visibleResults.length - 1) selected++;
        updateSelected();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selected > 0) selected--;
        updateSelected();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (visibleResults[selected]) jumpTo(visibleResults[selected]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    const tgt = e.target;
    const isTyping = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);

    // Cmd-K / Ctrl-K from anywhere
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }
    // `/` only when not typing in another input
    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      openPalette();
      return;
    }
  });
})();
