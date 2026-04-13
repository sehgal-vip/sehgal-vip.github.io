// Scroll-synced "On this page" side index
//   - Fixed-position card on the right
//   - Lists every H2 on the page; current one highlighted as you scroll
//   - Hidden on narrow viewports via CSS

(function () {
  'use strict';

  function cleanHeadingText(h) {
    let text = '';
    for (const node of h.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
      else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('heading-anchor')) {
        text += node.textContent || '';
      }
    }
    return text.replace(/^\s*\d+\.\s*/, '').trim();
  }

  function init() {
    const headings = Array.from(document.querySelectorAll('h2'));
    if (headings.length < 2) return;

    const toc = document.createElement('nav');
    toc.id = 'toc';

    const title = document.createElement('div');
    title.id = 'toc-title';
    title.textContent = 'On this page';
    toc.appendChild(title);

    const rule = document.createElement('hr');
    rule.id = 'toc-rule';
    toc.appendChild(rule);

    const ul = document.createElement('ul');
    const liByHeading = new Map();
    headings.forEach(h => {
      if (!h.id) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = cleanHeadingText(h);
      li.appendChild(a);
      ul.appendChild(li);
      liByHeading.set(h, li);
    });
    toc.appendChild(ul);
    document.body.appendChild(toc);

    function update() {
      const scrollY = window.scrollY + 140;
      let activeHeading = headings[0];
      for (const h of headings) {
        if (h.offsetTop <= scrollY) activeHeading = h;
        else break;
      }
      liByHeading.forEach((li, h) => {
        li.classList.toggle('active', h === activeHeading);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  } else {
    setTimeout(init, 0);
  }
})();
