// Glossary page only: assigns ids to every <dt>, then on load and on hashchange
// resolves the URL hash to the closest matching <dt> (exact → starts-with → contains)
// and scrolls to it with a brief highlight.

(function () {
  'use strict';
  if (!/\/glossary\.html$/.test(location.pathname)) return;

  function slug(s) {
    return (s || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function init() {
    const dts = [...document.querySelectorAll('dt')];
    const records = dts.map(dt => {
      const strong = dt.querySelector('strong');
      const text = strong ? strong.textContent : dt.textContent;
      const s = slug(text);
      if (s && !dt.id) dt.id = s;
      return { dt, slug: s, text: (text || '').toLowerCase().trim() };
    });

    function resolve(hash) {
      if (!hash || hash === '#') return null;
      const raw = decodeURIComponent(hash.slice(1)).toLowerCase();
      // Try the hash as-is, then a de-pluralized form (handles "tokens" → "token")
      const tries = [raw];
      if (raw.endsWith('s') && raw.length > 2) tries.push(raw.slice(0, -1));
      for (const target of tries) {
        // 1) exact slug match
        const exact = records.find(r => r.slug === target);
        if (exact) return exact.dt;
        // 2) starts-with — slug starts with target, e.g. "stop-token" matches "stop"
        const starts = records.find(r => r.slug.startsWith(target + '-') || r.slug.startsWith(target));
        if (starts) return starts.dt;
        // 3) substring in either direction (slug contains target OR target contains slug)
        const contains = records.find(r => r.slug.includes(target) || target.includes(r.slug));
        if (contains) return contains.dt;
      }
      return null;
    }

    function highlight(dt) {
      if (!dt) return;
      dt.classList.add('flash-target');
      setTimeout(() => dt.classList.remove('flash-target'), 1800);
    }

    function go() {
      const dt = resolve(location.hash);
      if (!dt) return;
      // Scroll with topbar offset (CSS handles it via scroll-margin-top, but
      // for the initial load we still nudge in case scroll-margin isn't honored).
      dt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlight(dt);
    }

    if (location.hash) {
      // Defer one frame so layout settles before scrolling
      requestAnimationFrame(go);
    }
    window.addEventListener('hashchange', go);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
