/**
 * Main JavaScript Utilities
 * 
 * General functionality for the blog
 */

(function() {
  'use strict';

  /**
   * Initialize when DOM is ready
   */
  function init() {
    // Landing page: start scrolled at top (and keep at top on back navigation)
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const isLandingPage = path === '' || path === '/' || path.endsWith('/index') || path.endsWith('index.html');
    if (isLandingPage) {
      window.scrollTo(0, 0);
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      window.addEventListener('pageshow', function onLandingPageShow(event) {
        if (event.persisted) {
          window.scrollTo(0, 0);
        }
      }, { once: false });
    }

    setupSidebar();
    setupMobileMenu();
    setupSmoothScroll();
    setupExternalLinks();
    setupReadingTime();
    setupShareButtons();
    setupLazyLoading();
    setupScrollReveal();
    setupScrollIndicator();
    setupHeroScrollAnimation();
  }

  /**
   * Sidebar toggle functionality
   */
  function setupSidebar() {
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    const closeBtn = document.querySelector('.sidebar-close-btn');
    const backdrop = document.querySelector('.sidebar-backdrop');
    const sidebar = document.querySelector('.sidebar');

    if (!toggleBtn || !sidebar) return;

    function openSidebar() {
      document.body.classList.add('sidebar-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      // Use ModalManager if available, fallback to direct style
      if (window.ModalManager) {
        window.ModalManager.open('sidebar', closeSidebar);
      } else {
        document.body.style.overflow = 'hidden';
      }
      if (backdrop) backdrop.style.display = 'block';
      sidebar.style.transform = 'translateX(0)';
    }

    function closeSidebar() {
      document.body.classList.remove('sidebar-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      // Use ModalManager if available, fallback to direct style
      if (window.ModalManager) {
        window.ModalManager.close('sidebar');
      } else {
        document.body.style.overflow = '';
      }
      if (backdrop) backdrop.style.display = 'none';
      sidebar.style.transform = 'translateX(-100%)';
    }

    toggleBtn.addEventListener('click', () => {
      const isOpen = document.body.classList.contains('sidebar-open');
      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeSidebar);
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Note: Escape key handling is now managed by global ModalManager in command-palette.js

    // Close sidebar when clicking a link inside it
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeSidebar);
    });
  }

  /**
   * Mobile menu toggle
   */
  function setupMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');

    if (!menuBtn || !mobileNav) return;

    function closeMobileMenu() {
      mobileNav.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      // Use ModalManager if available, fallback to direct style
      if (window.ModalManager) {
        window.ModalManager.close('mobile-menu');
      } else {
        document.body.style.overflow = '';
      }
      // Reset hamburger icon
      const icon = menuBtn.querySelector('svg');
      if (icon) {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>';
      }
    }

    menuBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', isOpen);

      // Toggle hamburger icon
      const icon = menuBtn.querySelector('svg');
      if (icon) {
        if (isOpen) {
          icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>';
        } else {
          icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>';
        }
      }

      // Prevent body scroll when menu is open via ModalManager
      if (window.ModalManager) {
        if (isOpen) {
          window.ModalManager.open('mobile-menu', closeMobileMenu);
        } else {
          window.ModalManager.close('mobile-menu');
        }
      } else {
        document.body.style.overflow = isOpen ? 'hidden' : '';
      }
    });

    // Close menu on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Note: Escape key handling is now managed by global ModalManager in command-palette.js
  }

  /**
   * Smooth scroll for anchor links
   */
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          // Update URL
          history.pushState(null, null, href);
        }
      });
    });
  }

  /**
   * Add rel attributes to external links
   */
  function setupExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      if (!link.hostname.includes(window.location.hostname)) {
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('target', '_blank');
      }
    });
  }

  /**
   * Calculate and display reading time
   */
  function setupReadingTime() {
    const content = document.querySelector('.post-content');
    const readTimeEl = document.querySelector('.reading-time');

    if (!content || !readTimeEl) return;

    const text = content.textContent || content.innerText;
    const words = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200); // Average 200 words per minute

    readTimeEl.textContent = `${readingTime} min read`;
  }

  /**
   * Share buttons functionality
   */
  function setupShareButtons() {
    // Twitter share
    document.querySelectorAll('.share-twitter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const title = document.title;
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=450');
      });
    });

    // LinkedIn share
    document.querySelectorAll('.share-linkedin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = window.location.href;
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(linkedinUrl, '_blank', 'width=550,height=450');
      });
    });

    // Copy URL
    document.querySelectorAll('.share-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast('Link copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });
  }

  /**
   * Show toast notification
   */
  function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.75rem 1.5rem;
      background: var(--color-primary);
      color: white;
      border-radius: 8px;
      font-size: 0.875rem;
      z-index: 10000;
      animation: toast-in 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Lazy load images and Giscus comments
   */
  function setupLazyLoading() {
    // Lazy load images
    if ('loading' in HTMLImageElement.prototype) {
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
    } else {
      // Fallback for browsers without native lazy loading
      const lazyImages = document.querySelectorAll('img[data-src]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            observer.unobserve(img);
          }
        });
      });

      lazyImages.forEach(img => observer.observe(img));
    }

    // Lazy load Giscus comments
    const commentsSection = document.querySelector('.giscus-container');
    if (commentsSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadGiscus(commentsSection);
            observer.unobserve(commentsSection);
          }
        });
      }, { rootMargin: '100px' });

      observer.observe(commentsSection);
    }
  }

  /**
   * Load Giscus comments widget
   */
  function loadGiscus(container) {
    const config = window.giscusConfig;
    if (!config) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', config.repo);
    script.setAttribute('data-repo-id', config.repoId);
    script.setAttribute('data-category', config.category);
    script.setAttribute('data-category-id', config.categoryId);
    script.setAttribute('data-mapping', config.mapping);
    script.setAttribute('data-reactions-enabled', config.reactionsEnabled);
    script.setAttribute('data-emit-metadata', config.emitMetadata);
    script.setAttribute('data-input-position', config.inputPosition);
    script.setAttribute('data-theme', getGiscusTheme());
    script.setAttribute('data-lang', config.lang);
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);
  }

  /**
   * Get Giscus theme based on current theme
   */
  function getGiscusTheme() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? 'dark' : 'light';
  }

  /**
   * Scroll reveal animations using IntersectionObserver
   */
  function setupScrollReveal() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    if (!revealElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Add staggered delay for grid items
          const delay = entry.target.classList.contains('post-card')
            ? index * 100
            : 0;

          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, delay);

          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => observer.observe(el));

    // Also observe post cards within scroll-reveal sections
    document.querySelectorAll('.scroll-reveal .post-card').forEach(card => {
      card.classList.add('scroll-reveal');
      observer.observe(card);
    });
  }

  /**
   * Hide scroll indicator after user scrolls
   */
  function setupScrollIndicator() {
    const indicator = document.querySelector('.scroll-indicator');
    if (!indicator) return;

    let hasScrolled = false;

    function handleScroll() {
      if (!hasScrolled && window.scrollY > 100) {
        hasScrolled = true;
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateX(-50%) translateY(20px)';
        window.removeEventListener('scroll', handleScroll);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * Hero scroll animation - text scales up, background fades out
   */
  function setupHeroScrollAnimation() {
    const heroBg = document.querySelector('.hero-bg-fixed');
    const heroTitle = document.querySelector('.hero-title');
    const heroContent = document.querySelector('.hero-content');

    if (!heroBg || !heroTitle) return;

    let ticking = false;

    function updateHeroOnScroll() {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollPercent = Math.min(scrollY / viewportHeight, 1);

      // Scale text: 1x at top → 1.15x at bottom of first fold
      const scale = 1 + (scrollPercent * 0.15);
      heroTitle.style.transform = `scale(${scale})`;

      // Fade out hero background: full opacity → 0 at second fold
      heroBg.style.opacity = 1 - scrollPercent;

      // Hide completely when past first fold
      if (scrollPercent >= 1) {
        heroBg.classList.add('hidden');
      } else {
        heroBg.classList.remove('hidden');
      }

      // Slight parallax on content (optional)
      if (heroContent) {
        heroContent.style.transform = `translateY(${scrollPercent * -30}px)`;
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateHeroOnScroll);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial state
    updateHeroOnScroll();
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export toast for external use
  window.showToast = showToast;
})();
