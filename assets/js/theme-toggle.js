/**
 * Theme Toggle - Light/Dark Mode Switcher
 * 
 * Features:
 * - Detects system preference on first visit
 * - Persists preference in localStorage
 * - Updates Giscus theme when switching
 * - Smooth transitions between themes
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'theme-preference';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  /**
   * Get the user's theme preference
   * Priority: localStorage > system preference > light (default)
   */
  function getThemePreference() {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK_THEME;
    }
    
    // Default to light
    return LIGHT_THEME;
  }

  /**
   * Apply the theme to the document
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    // Sync Quire (embedded PDF app): same document, so .dark class and quire-theme must match
    document.documentElement.classList.toggle('dark', theme === DARK_THEME);
    try { localStorage.setItem('quire-theme', theme); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('site-theme-change', { detail: { theme } })); } catch (e) {}
    
    // Update Giscus theme if it's loaded
    updateGiscusTheme(theme);
    
    // Update aria-label for accessibility
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      const label = theme === DARK_THEME ? 'Switch to light mode' : 'Switch to dark mode';
      toggleBtn.setAttribute('aria-label', label);
      toggleBtn.setAttribute('title', label);
    }
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
    const next = current === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(next);
    return next;
  }

  /**
   * Update Giscus comment widget theme
   */
  function updateGiscusTheme(theme) {
    const giscusFrame = document.querySelector('iframe.giscus-frame');
    if (giscusFrame) {
      const giscusTheme = theme === DARK_THEME ? 'dark' : 'light';
      giscusFrame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: giscusTheme } } },
        'https://giscus.app'
      );
    }
  }

  /**
   * Initialize theme toggle functionality
   */
  function init() {
    // Apply initial theme immediately (before DOM is fully loaded)
    const initialTheme = getThemePreference();
    setTheme(initialTheme);

    // Set up toggle button when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupToggle);
    } else {
      setupToggle();
    }

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't explicitly set a preference
        if (!localStorage.getItem(STORAGE_KEY)) {
          setTheme(e.matches ? DARK_THEME : LIGHT_THEME);
        }
      });
    }
  }

  /**
   * Set up the toggle button event listener
   */
  function setupToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        toggleTheme();
      });
    }
  }

  // Export for use by command palette
  window.ThemeToggle = {
    toggle: toggleTheme,
    set: setTheme,
    get: () => document.documentElement.getAttribute('data-theme') || LIGHT_THEME
  };

  // Initialize
  init();
})();
