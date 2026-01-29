/**
 * Force TOC sticky positioning with JavaScript fallback
 * This ensures the TOC sticks even if CSS sticky fails
 */

(function() {
  'use strict';

  const TOP_OFFSET = 96; // 64px header + 32px spacing

  function initStickyTOC() {
    const tocSidebar = document.getElementById('toc-sidebar');
    if (!tocSidebar) return;

    // Only apply on desktop
    function checkAndApply() {
      if (window.innerWidth < 1024) {
        // Remove fixed positioning on mobile
        tocSidebar.style.position = '';
        tocSidebar.style.top = '';
        tocSidebar.style.width = '';
        tocSidebar.style.maxHeight = '';
        return;
      }

      // Get the sidebar's natural position
      const container = tocSidebar.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const initialTop = containerRect.top + window.pageYOffset;
      const sidebarWidth = window.innerWidth >= 1280 ? 300 : 280;

      function updatePosition() {
        if (window.innerWidth < 1024) return;

        const scrollTop = window.pageYOffset;
        const containerTop = container.getBoundingClientRect().top + scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        if (scrollTop + TOP_OFFSET >= containerTop) {
          // Calculate right position to align with flex layout
          const containerLeft = container.getBoundingClientRect().left;
          const articleWidth = window.innerWidth >= 1280 ? 750 : 700;
          const gap = window.innerWidth >= 1280 ? 64 : 48; // 4rem or 3rem in pixels
          const sidebarLeft = containerLeft + articleWidth + gap;

          tocSidebar.style.position = 'fixed';
          tocSidebar.style.top = TOP_OFFSET + 'px';
          tocSidebar.style.left = sidebarLeft + 'px';
          tocSidebar.style.width = sidebarWidth + 'px';
          tocSidebar.style.maxHeight = `calc(100vh - ${TOP_OFFSET + 32}px)`;
        } else {
          // Not scrolled enough, use static positioning
          tocSidebar.style.position = '';
          tocSidebar.style.top = '';
          tocSidebar.style.left = '';
          tocSidebar.style.width = '';
          tocSidebar.style.maxHeight = '';
        }
      }

      // Update on scroll with requestAnimationFrame for performance
      let ticking = false;
      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(function() {
            updatePosition();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      // Update on resize
      let resizeTimeout;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(checkAndApply, 100);
      });

      // Initial update
      updatePosition();
    }

    checkAndApply();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickyTOC);
  } else {
    initStickyTOC();
  }
})();
