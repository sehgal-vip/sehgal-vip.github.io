// Keyboard shortcuts for the artifact
//   ← / →   : on the hub, jump to previous/next section (H2)
//             on a deep page, navigate to previous/next deep page
//   ?       : open the shortcuts help modal
//   Esc     : close any open modal
//   Cmd-K / Ctrl-K / `/` : trigger search palette (handled by search.js if loaded)
//
// Suppressed when typing in inputs / textareas / contenteditable.

(function () {
  'use strict';

  function isTyping(e) {
    const tgt = e.target;
    if (!tgt) return false;
    const tag = tgt.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tgt.isContentEditable) return true;
    return false;
  }

  function nextHeading(direction) {
    const headings = Array.from(document.querySelectorAll('h2'));
    if (headings.length === 0) return;
    const scrollY = window.scrollY;
    const margin = 80; // forgiveness for headings near the current scroll
    let currentIdx = -1;
    for (let i = 0; i < headings.length; i++) {
      const top = headings[i].getBoundingClientRect().top + window.scrollY;
      if (top - margin <= scrollY) currentIdx = i;
      else break;
    }
    let target;
    if (direction === 'next') target = headings[Math.min(currentIdx + 1, headings.length - 1)];
    else                      target = headings[Math.max(currentIdx - 1, 0)];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function navigateDeepPage(direction) {
    // Find the page-footer's prev/next links
    const footer = document.querySelector('.page-footer');
    if (!footer) return;
    const links = footer.querySelectorAll('a');
    if (links.length === 0) return;
    // Convention: first link is prev, last link is next
    const target = direction === 'prev' ? links[0] : links[links.length - 1];
    if (target && target.href) location.href = target.href;
  }

  function isHub() {
    return /index\.html$/.test(location.pathname) || location.pathname.endsWith('/') || location.pathname.endsWith('/LLM learning');
  }

  function makeHelpModal() {
    let modal = document.getElementById('shortcut-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'shortcut-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(60,46,31,0.5); display:none; align-items:center; justify-content:center; z-index:2000;';
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg); color:var(--text); max-width:440px; width:90%; padding:24px 28px; border-radius:6px; box-shadow:0 12px 32px rgba(0,0,0,0.3); font-family:Georgia, serif;';
    card.innerHTML = `
      <h3 style="margin-top:0; color:var(--accent);">Keyboard shortcuts</h3>
      <table style="width:100%; border-collapse:collapse; font-size:0.95em; max-width:none;">
        <tr><td style="padding:6px 0;"><kbd>←</kbd> / <kbd>→</kbd></td><td>Previous / next section (hub) or page (deep)</td></tr>
        <tr><td style="padding:6px 0;"><kbd>Cmd</kbd>+<kbd>K</kbd> / <kbd>/</kbd></td><td>Open heading search</td></tr>
        <tr><td style="padding:6px 0;"><kbd>?</kbd></td><td>Show this help</td></tr>
        <tr><td style="padding:6px 0;"><kbd>Esc</kbd></td><td>Close any open modal</td></tr>
      </table>
      <div style="margin-top:16px; text-align:right;">
        <button class="secondary" id="shortcut-close" style="font-size:0.9em;">Close</button>
      </div>
    `;
    modal.appendChild(card);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.body.appendChild(modal);
    document.getElementById('shortcut-close').addEventListener('click', closeModal);
    return modal;
  }

  function openModal() { makeHelpModal().style.display = 'flex'; }
  function closeModal() {
    const m = document.getElementById('shortcut-modal');
    if (m) m.style.display = 'none';
    const sm = document.getElementById('search-modal');
    if (sm) sm.style.display = 'none';
  }

  document.addEventListener('keydown', (e) => {
    // Close modals on Esc regardless
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    // Help modal on ?
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      if (isTyping(e)) return;
      e.preventDefault();
      openModal();
      return;
    }
    if (isTyping(e)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (isHub()) nextHeading('next');
      else navigateDeepPage('next');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (isHub()) nextHeading('prev');
      else navigateDeepPage('prev');
    }
  });
})();
