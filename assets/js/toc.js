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
    headingSelectors: 'h2, h3',
    minHeadingsForTOC: 3,
    scrollOffset: 80, // Offset for header height
    observerRootMargin: '-80px 0px -80% 0px', // Intersection observer margins
    debounceDelay: 100, // Debounce delay for active state updates
  };

  // State management
  let isScrollingProgrammatically = false;
  let debounceTimer = null;

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
   * Setup active section tracking using Intersection Observer
   */
  function setupActiveTracking(headings) {
    const tocLinks = document.querySelectorAll('.toc-link');
    const headingElements = headings.map(h => h.element);

    // Create a map for quick lookup
    const linkMap = new Map();
    tocLinks.forEach(link => {
      const headingId = link.getAttribute('data-heading-id');
      linkMap.set(headingId, link);
    });

    // Track which headings are currently visible
    const visibleHeadings = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip updates during programmatic scrolling
        if (isScrollingProgrammatically) {
          return;
        }

        entries.forEach(entry => {
          const headingId = entry.target.id;

          if (entry.isIntersecting) {
            visibleHeadings.add(headingId);
          } else {
            visibleHeadings.delete(headingId);
          }
        });

        // Debounce the active state updates
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          updateActiveStates(linkMap, visibleHeadings, headingElements);
        }, CONFIG.debounceDelay);
      },
      {
        rootMargin: CONFIG.observerRootMargin,
        threshold: [0, 0.5, 1]
      }
    );

    // Observe all heading elements
    headingElements.forEach(heading => observer.observe(heading));
  }

  /**
   * Update active states for TOC links
   */
  function updateActiveStates(linkMap, visibleHeadings, headingElements) {
    // Remove all active classes first
    linkMap.forEach(link => link.classList.remove('active'));

    // If no headings are visible, don't highlight anything
    if (visibleHeadings.size === 0) return;

    // Find the topmost visible heading
    let activeHeading = null;
    for (const heading of headingElements) {
      if (visibleHeadings.has(heading.id)) {
        activeHeading = heading.id;
        break;
      }
    }

    // Highlight the active heading
    if (activeHeading && linkMap.has(activeHeading)) {
      linkMap.get(activeHeading).classList.add('active');
    }
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
