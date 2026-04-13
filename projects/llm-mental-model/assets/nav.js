// Top bar with hamburger menu
//   - Injected on every page at the top
//   - Hamburger (left) opens a slide-out panel from the left listing all pages
//   - Current page highlighted; click any item to navigate
//   - Theme toggle stays where it is (top-right, owned by theme.js)

(function () {
  'use strict';

  const PAGES = [
    { label: 'Hub — the mental model',     href: 'index.html',       kind: 'hub'  },
    { label: '§1  Tokens & embeddings',    href: 'deep/tokens.html', kind: 'deep' },
    { label: '§2  Attention',              href: 'deep/attention.html', kind: 'deep' },
    { label: '§3  Transformer block',      href: 'deep/block.html',  kind: 'deep' },
    { label: '§4  Inference loop',         href: 'deep/inference.html', kind: 'deep' },
    { label: '§5  Training',               href: 'deep/training.html', kind: 'deep' },
    { label: '§6  Evaluation',             href: 'deep/eval.html',   kind: 'deep' },
    { label: '§7  Levers',                 href: 'deep/levers.html', kind: 'deep' },
    { label: '§8  Diagnosis (capstone)',   href: 'deep/diagnosis.html', kind: 'deep' },
    { label: 'Glossary',                   href: 'deep/glossary.html', kind: 'deep' },
  ];

  function resolveHref(target) {
    const inDeep = /\/deep\//.test(location.pathname);
    if (inDeep) {
      if (target === 'index.html')         return '../index.html';
      if (target.startsWith('deep/'))      return target.slice(5); // drop 'deep/'
      return target;
    } else {
      return target; // already relative to root
    }
  }

  function isCurrent(target) {
    const here = location.pathname.split('/').pop() || 'index.html';
    const t = target.split('/').pop();
    return here === t;
  }

  function init() {
    // Top bar — three flex regions for true title centering
    const bar = document.createElement('div');
    bar.id = 'topbar';
    document.body.appendChild(bar);

    const left = document.createElement('div');
    left.id = 'topbar-left';
    bar.appendChild(left);

    const hamburger = document.createElement('button');
    hamburger.id = 'nav-toggle';
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    left.appendChild(hamburger);

    // Brand title — the static middle; equal flex left+right ensure true centering
    const title = document.createElement('a');
    title.id = 'topbar-title';
    title.href = resolveHref('index.html');
    title.textContent = 'How LLMs Work';
    bar.appendChild(title);

    // Right region — theme.js mounts its toggle here
    const right = document.createElement('div');
    right.id = 'topbar-right';
    bar.appendChild(right);

    // Panel (slide-out from left)
    const panel = document.createElement('nav');
    panel.id = 'nav-panel';
    panel.setAttribute('aria-label', 'Pages');

    const panelHead = document.createElement('div');
    panelHead.id = 'nav-panel-head';
    panelHead.textContent = 'LLM Learning';
    panel.appendChild(panelHead);

    const rule = document.createElement('hr');
    rule.className = 'nav-panel-rule';
    panel.appendChild(rule);

    const ul = document.createElement('ul');
    PAGES.forEach(p => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = resolveHref(p.href);
      a.textContent = p.label;
      if (p.kind === 'hub') li.classList.add('nav-hub');
      if (isCurrent(p.href)) li.classList.add('nav-current');
      li.appendChild(a);
      ul.appendChild(li);
    });
    panel.appendChild(ul);

    document.body.appendChild(panel);

    // Backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.id = 'nav-backdrop';
    document.body.appendChild(backdrop);

    function open()  { panel.classList.add('open'); backdrop.classList.add('open'); hamburger.classList.add('active'); }
    function close() { panel.classList.remove('open'); backdrop.classList.remove('open'); hamburger.classList.remove('active'); }

    hamburger.addEventListener('click', () => {
      if (panel.classList.contains('open')) close(); else open();
    });
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
