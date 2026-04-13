// LLM Learning — shared JS utilities
// Defines reusable interactive components and small helpers.
// Components are vanilla DOM/SVG; no frameworks.

(function () {
  'use strict';

  // ---- Small DOM helpers ----

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      });
    }
    return node;
  }

  function svg(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  // ---- Component: analogy callout ----
  // <div class="callout-analogy" data-label="🔍 Think of it like…">…</div>
  // The label is a generic default if not specified.

  function decorateAnalogyCallouts() {
    document.querySelectorAll('.callout-analogy').forEach(function (box) {
      if (box.querySelector('.label')) return; // already decorated
      const labelText = box.dataset.label || '🔍 Think of it like…';
      const label = el('span', { class: 'label' }, labelText);
      box.insertBefore(label, box.firstChild);
    });
  }

  // ---- Component: "where this breaks" callout ----

  function decorateBreakCallouts() {
    document.querySelectorAll('.callout-break').forEach(function (box) {
      if (box.querySelector('.label')) return;
      const labelText = box.dataset.label || '⚠️ Where this breaks…';
      const label = el('span', { class: 'label' }, labelText);
      box.insertBefore(label, box.firstChild);
    });
  }

  // ---- Component: invariant box ----
  // For interactives: "what this teaches (and what it doesn't)"

  function decorateInvariantCallouts() {
    document.querySelectorAll('.callout-invariant').forEach(function (box) {
      if (box.querySelector('.label')) return;
      const labelText = box.dataset.label || "📊 What this teaches (and what it doesn't)";
      const label = el('span', { class: 'label' }, labelText);
      box.insertBefore(label, box.firstChild);
    });
  }

  // ---- Component: variant note ----

  function decorateVariantCallouts() {
    document.querySelectorAll('.callout-variant').forEach(function (box) {
      if (box.querySelector('.label')) return;
      const labelText = box.dataset.label || '🌿 Variant note';
      const label = el('span', { class: 'label' }, labelText);
      box.insertBefore(label, box.firstChild);
    });
  }

  // ---- Glossary tooltip support ----
  // Terms with class="glossary-term" data-def="…" already work via CSS hover.
  // The function exists as a placeholder for click-to-pin behavior we may add later.

  function initGlossary() {
    // Future: click to pin tooltip open.
  }

  // ---- Page chrome: breadcrumb / footer wiring ----
  // No-op for now; the markup carries everything statically.

  // ---- Boot ----

  function boot() {
    decorateAnalogyCallouts();
    decorateBreakCallouts();
    decorateInvariantCallouts();
    decorateVariantCallouts();
    initGlossary();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose helpers to page-specific scripts.
  window.LLM = {
    el: el,
    svg: svg,
    decorate: boot
  };
})();
