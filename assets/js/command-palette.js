/**
 * Command Palette - Cmd+K / Ctrl+K Quick Actions
 * 
 * Features:
 * - Opens with Cmd+K (Mac), Ctrl+K (Windows/Linux), or "/" key
 * - Fuzzy search through commands and posts
 * - Arrow key navigation
 * - Recent commands stored in localStorage
 * - Smooth animations
 * - Full keyboard accessibility
 */

(function() {
  'use strict';

  // Modal Stack Manager - coordinates overflow across all modals
  const ModalManager = (function() {
    const openModals = new Set();
    const closeHandlers = new Map();

    return {
      open(id, closeHandler) {
        openModals.add(id);
        if (closeHandler) {
          closeHandlers.set(id, closeHandler);
        }
        document.body.style.overflow = 'hidden';
      },
      close(id) {
        openModals.delete(id);
        closeHandlers.delete(id);
        if (openModals.size === 0) {
          document.body.style.overflow = '';
        }
      },
      hasOpenModals() {
        return openModals.size > 0;
      },
      getTop() {
        // Return the most recently opened modal's close handler
        const ids = Array.from(openModals);
        if (ids.length === 0) return null;
        const topId = ids[ids.length - 1];
        const handler = closeHandlers.get(topId);
        return handler ? { close: handler } : null;
      },
      isOpen(id) {
        return openModals.has(id);
      }
    };
  })();
  window.ModalManager = ModalManager;

  // Global Escape handler - closes topmost modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && ModalManager.hasOpenModals()) {
      e.preventDefault();
      e.stopPropagation();
      const topModal = ModalManager.getTop();
      if (topModal) topModal.close();
    }
  }, true);

  // Constants
  const RECENT_COMMANDS_KEY = 'command-palette-recent';
  const MAX_RECENT = 5;
  
  // State
  let isInitialized = false;
  let isOpen = false;
  let selectedIndex = 0;
  let commands = [];
  let posts = [];
  let filteredResults = [];
  let triggerElement = null;

  // DOM Elements
  let palette, backdrop, modal, input, results;

  // Icons SVG
  const icons = {
    home: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    blog: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    folder: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    tag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    github: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>',
    twitter: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
    linkedin: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
    instagram: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
    substack: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16"></path><path d="M4 8h16"></path><path d="M4 12l8 6 8-6"></path></svg>',
    theme: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    link: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    rss: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>',
    post: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path></svg>'
  };

  /**
   * Initialize the command palette
   */
  function init() {
    if (isInitialized) return;
    isInitialized = true;

    // Get DOM elements
    palette = document.getElementById('command-palette');
    if (!palette) return;

    backdrop = palette.querySelector('.command-palette-backdrop');
    modal = palette.querySelector('.command-palette-modal');
    input = document.getElementById('command-input');
    results = document.getElementById('command-results');

    // Load command data
    loadCommands();
    loadPosts();

    // Set up event listeners
    setupEventListeners();
  }

  /**
   * Load commands from the embedded JSON
   */
  function loadCommands() {
    try {
      const dataEl = document.getElementById('command-data');
      if (dataEl) {
        const data = JSON.parse(dataEl.textContent);
        commands = [
          ...data.navigation.map(c => ({ ...c, section: 'Navigation' })),
          ...data.social.map(c => ({ ...c, section: 'Social' })),
          ...data.actions.map(c => ({ ...c, section: 'Actions' }))
        ];
      }
    } catch (e) {
      console.error('Failed to load command data:', e);
    }
  }

  /**
   * Load posts data for search
   */
  function loadPosts() {
    try {
      const dataEl = document.getElementById('posts-data');
      if (dataEl) {
        posts = JSON.parse(dataEl.textContent).map(p => ({
          ...p,
          section: 'Posts',
          action: 'navigate',
          icon: 'post'
        }));
      }
    } catch (e) {
      console.error('Failed to load posts data:', e);
    }
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
    // Palette navigation keys (capture to override page scrolling)
    document.addEventListener('keydown', handlePaletteKeydown, true);

    // Palette-specific events
    if (backdrop) {
      backdrop.addEventListener('click', close);
    }

    if (input) {
      input.addEventListener('input', handleInput);
      input.addEventListener('keydown', handleInputKeydown);
    }

    // Search trigger button
    const searchTrigger = document.querySelector('.search-trigger');
    if (searchTrigger) {
      searchTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        triggerElement = searchTrigger;
        open();
      });
    }

    // Any element with data-command-palette attribute
    document.querySelectorAll('[data-command-palette]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        triggerElement = el;
        open();
      });
    });
  }

  /**
   * Handle global keyboard shortcuts
   */
  function handleGlobalKeydown(e) {
    // Cmd+K or Ctrl+K to open
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      isOpen ? close() : open();
      return;
    }
    
    // "/" to open (if not already typing in an input)
    if (e.key === '/' && !isTypingInInput(e.target)) {
      e.preventDefault();
      open();
      return;
    }
    
    // Escape to close
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
      return;
    }
  }

  /**
   * Handle palette navigation keys even if input loses focus
   */
  function handlePaletteKeydown(e) {
    if (!isOpen) return;

    const handledKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'];
    if (!handledKeys.includes(e.key)) return;

    // Prevent default to stop page scrolling
    e.preventDefault();
    e.stopPropagation();
    
    // Ensure input has focus for better UX
    if (document.activeElement !== input && input) {
      input.focus({ preventScroll: true });
    }
    
    handleInputKeydown(e);
  }

  /**
   * Check if the user is typing in an input field
   */
  function isTypingInInput(el) {
    const tagName = el.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || el.isContentEditable;
  }

  /**
   * Handle input changes for filtering
   */
  function handleInput() {
    const query = input.value.trim().toLowerCase();
    filterResults(query);
    selectedIndex = 0;
    render();
  }

  /**
   * Handle keyboard navigation in the input
   */
  function handleInputKeydown(e) {
    // Ensure we're in the palette context
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        if (filteredResults.length > 0) {
          selectedIndex = Math.min(selectedIndex + 1, filteredResults.length - 1);
          updateSelection();
          scrollSelectedIntoView();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        if (filteredResults.length > 0) {
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelection();
          scrollSelectedIntoView();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
          console.log('Enter pressed, executing command at index:', selectedIndex, filteredResults[selectedIndex]);
          executeCommand(filteredResults[selectedIndex]);
        } else {
          console.warn('No command to execute. filteredResults:', filteredResults, 'selectedIndex:', selectedIndex);
        }
        break;
        
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
        if (filteredResults.length > 0) {
          if (e.shiftKey) {
            selectedIndex = Math.max(selectedIndex - 1, 0);
          } else {
            selectedIndex = Math.min(selectedIndex + 1, filteredResults.length - 1);
          }
          updateSelection();
          scrollSelectedIntoView();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
    }
  }

  /**
   * Filter commands and posts based on query
   */
  function filterResults(query) {
    if (!query) {
      // Show recent commands first, then all commands
      const recent = getRecentCommands();
      const recentItems = recent
        .map(id => [...commands, ...posts].find(c => getCommandId(c) === id))
        .filter(Boolean)
        .map(c => ({ ...c, isRecent: true }));

      filteredResults = [
        ...recentItems,
        ...commands.filter(c => !recent.includes(getCommandId(c))),
        ...posts.slice(0, 5).filter(p => !recent.includes(getCommandId(p)))
      ];
      return;
    }

    // Check for shortcut match first
    const shortcutMatch = commands.find(c => c.shortcut && c.shortcut.toLowerCase() === query);
    if (shortcutMatch) {
      filteredResults = [shortcutMatch];
      return;
    }

    // Fuzzy search through commands and posts
    const allItems = [...commands, ...posts];
    const scored = allItems.map(item => ({
      item,
      score: fuzzyScore(query, item)
    }));

    filteredResults = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.item);
  }

  /**
   * Calculate fuzzy match score
   */
  function fuzzyScore(query, item) {
    const searchText = [
      item.name || item.title,
      item.shortcut,
      ...(item.categories || []),
      ...(item.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    let score = 0;
    let queryIndex = 0;

    // Exact match bonus
    if (searchText.includes(query)) {
      score += 100;
    }

    // Word start match bonus
    const words = searchText.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(query)) {
        score += 50;
      }
    }

    // Fuzzy character match
    for (let i = 0; i < searchText.length && queryIndex < query.length; i++) {
      if (searchText[i] === query[queryIndex]) {
        score += 1;
        queryIndex++;
      }
    }

    // Only count as match if all query chars were found
    if (queryIndex < query.length) {
      return 0;
    }

    return score;
  }

  /**
   * Get unique ID for a command
   */
  function getCommandId(cmd) {
    return cmd.shortcut || cmd.url || (cmd.name || cmd.title);
  }

  /**
   * Get recent commands from localStorage
   */
  function getRecentCommands() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_COMMANDS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Save command to recent
   */
  function saveRecentCommand(cmd) {
    const id = getCommandId(cmd);
    let recent = getRecentCommands();
    
    // Remove if already exists
    recent = recent.filter(r => r !== id);
    
    // Add to front
    recent.unshift(id);
    
    // Keep only last N
    recent = recent.slice(0, MAX_RECENT);
    
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent));
  }

  /**
   * Execute a command
   */
  function executeCommand(cmd) {
    if (!cmd) {
      console.error('Command is undefined');
      return;
    }
    
    console.log('Executing command:', cmd);
    
    saveRecentCommand(cmd);
    close();

    // Small delay to ensure palette closes before navigation
    setTimeout(() => {
      switch (cmd.action) {
        case 'navigate':
          if (cmd.url) {
            // Ensure URL is properly formatted
            let url = cmd.url;
            // If URL doesn't start with http/https, ensure it starts with /
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
              url = '/' + url;
            }
            console.log('Navigating to:', url);
            window.location.href = url;
          } else {
            console.error('Command missing URL:', cmd);
          }
          break;

        case 'external':
          if (cmd.url) {
            window.open(cmd.url, '_blank', 'noopener,noreferrer');
          } else {
            console.error('Command missing URL:', cmd);
          }
          break;

        case 'toggle-theme':
          if (window.ThemeToggle) {
            window.ThemeToggle.toggle();
          }
          break;

        case 'copy-url':
          copyToClipboard(window.location.href);
          showToast('URL copied to clipboard!');
          break;
          
        default:
          console.error('Unknown command action:', cmd.action);
      }
    }, 100);
  }

  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Show a toast notification
   */
  function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
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

    // Remove after delay
    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Render the results list
   */
  function render() {
    if (!results) return;

    if (filteredResults.length === 0) {
      results.innerHTML = '<div class="command-palette-empty">No results found</div>';
      return;
    }

    // Group by section
    const sections = {};
    filteredResults.forEach((item, index) => {
      const section = item.isRecent ? 'Recent' : item.section;
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push({ ...item, globalIndex: index });
    });

    let html = '';
    for (const [sectionName, items] of Object.entries(sections)) {
      html += `
        <div class="command-section">
          <div class="command-section-title">${sectionName}</div>
          ${items.map(item => renderCommandItem(item)).join('')}
        </div>
      `;
    }

    results.innerHTML = html;

    // Add click handlers
    results.querySelectorAll('.command-item').forEach((el, i) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(el.dataset.index, 10);
        console.log('Click handler triggered, index:', index, 'filteredResults length:', filteredResults.length);
        if (filteredResults[index]) {
          console.log('Command found:', filteredResults[index]);
          executeCommand(filteredResults[index]);
        } else {
          console.error('No command found at index:', index, 'filteredResults:', filteredResults);
        }
      });

      el.addEventListener('mouseenter', () => {
        selectedIndex = parseInt(el.dataset.index, 10);
        updateSelection();
      });
      
      // Make items keyboard accessible
      el.setAttribute('role', 'option');
      el.setAttribute('tabindex', '-1');
    });
  }

  /**
   * Render a single command item
   */
  function renderCommandItem(item) {
    const isSelected = item.globalIndex === selectedIndex;
    const icon = icons[item.icon] || icons.post;
    const name = item.name || item.title;
    const description = item.date || '';

    return `
      <div 
        class="command-item ${isSelected ? 'selected' : ''}" 
        data-index="${item.globalIndex}"
        role="option"
        aria-selected="${isSelected}"
      >
        <div class="command-icon">${icon}</div>
        <div class="command-content">
          <div class="command-name">${escapeHtml(name)}</div>
          ${description ? `<div class="command-description">${escapeHtml(description)}</div>` : ''}
        </div>
        ${item.shortcut ? `
          <div class="command-shortcut">
            <kbd>${item.shortcut}</kbd>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Lightweight selection update without full re-render
   */
  function updateSelection() {
    if (!results) return;
    results.querySelectorAll('.command-item').forEach(el => {
      const index = parseInt(el.dataset.index, 10);
      el.classList.toggle('selected', index === selectedIndex);
      el.setAttribute('aria-selected', index === selectedIndex);
    });
  }

  /**
   * Scroll selected item into view
   */
  function scrollSelectedIntoView() {
    const selected = results.querySelector('.command-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Open the command palette
   */
  function open() {
    if (isOpen) return;
    isOpen = true;

    // Reset state
    input.value = '';
    selectedIndex = 0;
    filterResults('');
    render();

    // Show palette
    palette.classList.add('is-open');

    // Focus input with multiple retry attempts to ensure it works
    const focusInput = () => {
      if (input) {
        input.focus({ preventScroll: true });
        // Verify focus was successful
        if (document.activeElement !== input) {
          // Force focus by temporarily making input visible and focusing
          input.style.opacity = '1';
          input.focus({ preventScroll: true });
        }
      }
    };

    // Immediate focus
    focusInput();
    
    // Retry on next frame
    requestAnimationFrame(focusInput);
    
    // Retry after a short delay
    setTimeout(focusInput, 50);
    setTimeout(focusInput, 100);
    
    // Final retry after modal animation
    setTimeout(focusInput, 200);

    // Prevent body scroll via ModalManager
    ModalManager.open('command-palette', close);

    // Announce to screen readers
    palette.setAttribute('aria-hidden', 'false');
    
    // Add focus trap - prevent tabbing outside palette
    setupFocusTrap();
  }
  
  /**
   * Set up focus trap to keep focus within palette
   */
  function setupFocusTrap() {
    if (!palette || !input) return;

    // Remove existing trap handler first (prevents accumulation)
    removeFocusTrap();

    // Handle Tab key to trap focus
    const trapHandler = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Tab') {
        const focusableElements = palette.querySelectorAll(
          'input, button, [href], [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    palette.addEventListener('keydown', trapHandler);
    
    // Store handler for cleanup
    palette._trapHandler = trapHandler;
  }
  
  /**
   * Remove focus trap
   */
  function removeFocusTrap() {
    if (palette && palette._trapHandler) {
      palette.removeEventListener('keydown', palette._trapHandler);
      delete palette._trapHandler;
    }
  }

  /**
   * Close the command palette
   */
  function close() {
    if (!isOpen) return;
    isOpen = false;

    palette.classList.remove('is-open');
    ModalManager.close('command-palette');
    palette.setAttribute('aria-hidden', 'true');
    
    // Remove focus trap
    removeFocusTrap();

    // Return focus to trigger element
    if (triggerElement) {
      // Small delay to ensure modal is closed
      setTimeout(() => {
        triggerElement.focus();
        triggerElement = null;
      }, 100);
    }
  }

  // Export for external use
  window.CommandPalette = {
    open,
    close,
    toggle: () => isOpen ? close() : open()
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Add toast animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toast-out {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(1rem); }
    }
  `;
  document.head.appendChild(style);
})();
