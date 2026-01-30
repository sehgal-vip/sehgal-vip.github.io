/**
 * Table of Contents Generator
 * Automatically generates a sticky TOC sidebar for blog posts
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    contentSelector: '.post-content',
    tocListSelector: '#toc-list',
    tocSidebarSelector: '#toc-sidebar',
    tocNavSelector: '.toc-nav',
    headingSelectors: 'h2, h3',
    minHeadingsForTOC: 3,
    scrollOffset: 80, // Offset for header height
  };

  // State management
  let isScrollingProgrammatically = false;

  /**
   * Generate a unique ID from heading text
   */
  function generateId(text, index) {
    const baseId = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-');      // Collapse multiple hyphens

    return baseId ? `${baseId}-${index}` : `heading-${index}`;
  }

  /**
   * Extract all H2 and H3 headings from post content
   * Ensures each heading has a unique ID
   */
  function extractHeadings() {
    const content = document.querySelector(CONFIG.contentSelector);
    if (!content) return [];

    const headings = content.querySelectorAll(CONFIG.headingSelectors);
    const headingData = [];

    headings.forEach((heading, index) => {
      // Ensure heading has an ID
      if (!heading.id) {
        heading.id = generateId(heading.textContent, index);
      }

      headingData.push({
        id: heading.id,
        text: heading.textContent.trim(),
        level: parseInt(heading.tagName.charAt(1)), // Extract 2 from H2, 3 from H3
        element: heading
      });
    });

    return headingData;
  }

  /**
   * Build the TOC HTML structure
   */
  function buildTOC(headings) {
    const tocList = document.querySelector(CONFIG.tocListSelector);
    if (!tocList) return;

    // Clear existing content
    tocList.innerHTML = '';

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    headings.forEach((heading) => {
      const li = document.createElement('li');
      li.className = `toc-item toc-level-${heading.level}`;

      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = 'toc-link';
      link.textContent = heading.text;
      link.setAttribute('data-heading-id', heading.id);

      li.appendChild(link);
      fragment.appendChild(li);
    });

    tocList.appendChild(fragment);
  }

  /**
   * Setup smooth scrolling for TOC links
   */
  function setupSmoothScrolling() {
    const tocLinks = document.querySelectorAll('.toc-link');

    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          // Disable observer during programmatic scrolling
          isScrollingProgrammatically = true;

          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - CONFIG.scrollOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Update URL without triggering scroll
          history.pushState(null, null, `#${targetId}`);

          // Manually set active state immediately
          updateActiveLink(targetId);

          // Re-enable observer after scroll completes
          setTimeout(() => {
            isScrollingProgrammatically = false;
          }, 1000);
        }
      });
    });
  }

  /**
   * Manually update active link (used during programmatic scrolling)
   */
  function updateActiveLink(targetId) {
    const tocLinks = document.querySelectorAll('.toc-link');
    tocLinks.forEach(link => {
      if (link.getAttribute('data-heading-id') === targetId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Create the progress indicator elements
   */
  function createProgressIndicator() {
    const tocNav = document.querySelector(CONFIG.tocNavSelector);
    if (!tocNav) return;

    // Check if indicator already exists
    if (tocNav.querySelector('.toc-progress-track')) return;

    const track = document.createElement('div');
    track.className = 'toc-progress-track';

    const indicator = document.createElement('div');
    indicator.className = 'toc-progress-indicator';

    tocNav.appendChild(track);
    tocNav.appendChild(indicator);
  }

  /**
   * Update the progress indicator position to match active link
   */
  function updateProgressIndicator() {
    const indicator = document.querySelector('.toc-progress-indicator');
    const activeLink = document.querySelector('.toc-link.active');
    const tocNav = document.querySelector(CONFIG.tocNavSelector);

    if (!indicator || !tocNav) return;

    if (!activeLink) {
      indicator.style.opacity = '0';
      return;
    }

    const linkRect = activeLink.getBoundingClientRect();
    const navRect = tocNav.getBoundingClientRect();

    indicator.style.opacity = '1';
    indicator.style.top = (linkRect.top - navRect.top) + 'px';
    indicator.style.height = linkRect.height + 'px';
  }

  /**
   * Auto-scroll TOC to keep active item visible
   */
  function scrollTocToActive() {
    const tocSidebar = document.querySelector(CONFIG.tocSidebarSelector);
    const activeLink = document.querySelector('.toc-link.active');

    if (!tocSidebar || !activeLink) return;

    const tocRect = tocSidebar.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    // Check if active link is outside visible area of TOC
    if (linkRect.top < tocRect.top || linkRect.bottom > tocRect.bottom) {
      activeLink.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    }
  }

  /**
   * Setup active section tracking using scroll position
   */
  function setupActiveTracking(headings) {
    // Create progress indicator
    createProgressIndicator();

    function updateActiveOnScroll() {
      if (isScrollingProgrammatically) return;

      const scrollPosition = window.scrollY + CONFIG.scrollOffset + 20;
      let activeHeading = null;

      // Find the last heading that's above the scroll position
      for (const heading of headings) {
        if (heading.element.offsetTop <= scrollPosition) {
          activeHeading = heading.id;
        } else {
          break;
        }
      }

      // Update active state
      updateActiveLink(activeHeading);

      // Update progress indicator
      updateProgressIndicator();

      // Auto-scroll TOC to keep active item visible
      scrollTocToActive();
    }

    // Throttled scroll listener using requestAnimationFrame
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveOnScroll();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Initial update
    updateActiveOnScroll();
  }

  /**
   * Initialize TOC
   */
  function initTOC() {
    const tocSidebar = document.querySelector(CONFIG.tocSidebarSelector);
    if (!tocSidebar) return;

    // Extract headings
    const headings = extractHeadings();

    // Hide TOC if too few headings
    if (headings.length < CONFIG.minHeadingsForTOC) {
      tocSidebar.style.display = 'none';
      return;
    }

    // Build and setup TOC
    buildTOC(headings);
    setupSmoothScrolling();
    setupActiveTracking(headings);

    // Handle initial hash in URL
    if (window.location.hash) {
      setTimeout(() => {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          isScrollingProgrammatically = true;

          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - CONFIG.scrollOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Manually set active state
          updateActiveLink(targetId);

          // Re-enable observer after scroll completes
          setTimeout(() => {
            isScrollingProgrammatically = false;
          }, 1000);
        }
      }, 100);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTOC);
  } else {
    initTOC();
  }
})();
