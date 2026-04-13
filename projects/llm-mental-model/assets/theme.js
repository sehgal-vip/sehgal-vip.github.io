// Dark mode toggle
//   - Toggle button pinned top-right
//   - Choice persists in localStorage
//   - Respects prefers-color-scheme on first load if no saved choice

(function () {
  'use strict';

  const KEY = 'llm-learning-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
  }

  function readTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  // Apply theme as early as possible to avoid flash
  applyTheme(readTheme());

  function init() {
    let btn = document.getElementById('theme-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'theme-toggle';
      btn.title = 'Toggle dark mode';
      const host = document.getElementById('topbar-right') || document.body;
      host.appendChild(btn);
    }
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(KEY, next);
    });
    applyTheme(readTheme()); // re-apply to ensure button label is correct
  }

  // Run init after nav.js has created the topbar. Use a tiny delay so that
  // even if scripts race, we catch the topbar.
  function run() { setTimeout(init, 0); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
