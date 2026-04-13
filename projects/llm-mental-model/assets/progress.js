// Reading progress bar + section anchors + back-to-top
//   - Thin progress bar pinned to top, fills as you scroll
//   - Every H2 gets an id (slug from text), and a tiny # link on hover
//   - Clicking the # copies the URL to clipboard
//   - Back-to-top button appears after 2 screens of scrolling

(function () {
  'use strict';

  function slugify(text) {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function makeProgressBar() {
    const bar = document.createElement('div');
    bar.id = 'progress-bar';
    bar.style.cssText = 'position:fixed; top:54px; left:0; height:2px; width:0; background:var(--accent); z-index:901; transition:width 0.1s ease;';
    document.body.appendChild(bar);
    return bar;
  }

  function makeBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.title = 'Back to top';
    btn.style.cssText = 'position:fixed; bottom:24px; right:24px; width:42px; height:42px; border-radius:50%; background:var(--accent); color:var(--bg); border:none; font-size:20px; cursor:pointer; display:none; z-index:999; box-shadow:0 4px 12px rgba(0,0,0,0.18); opacity:0.7; transition:opacity 0.2s ease;';
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '0.7');
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    return btn;
  }

  function addAnchorsToHeadings() {
    const headings = document.querySelectorAll('h2');
    const used = {};
    headings.forEach(h => {
      let id = h.id;
      if (!id) {
        // Strip leading numbers like "1." from hub headings, then slug
        const text = h.textContent.replace(/^\s*\d+\.\s*/, '').trim();
        id = slugify(text) || 'section';
        // Ensure unique
        let candidate = id, n = 1;
        while (used[candidate] || document.getElementById(candidate)) {
          candidate = id + '-' + (++n);
        }
        h.id = candidate;
        used[candidate] = true;
      } else {
        used[id] = true;
      }
      // Append a hover-shown # link
      const link = document.createElement('a');
      link.href = '#' + h.id;
      link.className = 'heading-anchor';
      link.textContent = ' #';
      link.title = 'Copy link to this section';
      link.style.cssText = 'opacity:0; margin-left:6px; color:var(--text-soft); font-size:0.7em; text-decoration:none; transition:opacity 0.15s ease;';
      link.addEventListener('mouseenter', () => link.style.opacity = '1');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = location.href.split('#')[0] + '#' + h.id;
        history.replaceState(null, '', '#' + h.id);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            const oldText = link.textContent;
            link.textContent = ' ✓';
            setTimeout(() => { link.textContent = oldText; }, 1200);
          });
        }
      });
      h.appendChild(link);
      h.addEventListener('mouseenter', () => link.style.opacity = '0.6');
      h.addEventListener('mouseleave', () => link.style.opacity = '0');
    });
  }

  function init() {
    addAnchorsToHeadings();
    const bar = makeProgressBar();
    const back = makeBackToTop();

    function update() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0;
      bar.style.width = pct + '%';
      // Show back-to-top after 2 viewport heights
      back.style.display = scrolled > window.innerHeight * 2 ? 'block' : 'none';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    // Smooth-scroll any in-page anchor click
    document.body.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
