/**
 * Search Functionality
 * 
 * Provides search through posts via the command palette
 * and standalone search bar integration
 */

(function() {
  'use strict';

  let posts = [];
  let searchIndex = null;

  /**
   * Initialize search
   */
  function init() {
    loadPosts();
  }

  /**
   * Load posts from search.json
   */
  async function loadPosts() {
    try {
      // Try to load from search.json first
      const response = await fetch('/search.json');
      if (response.ok) {
        posts = await response.json();
        buildIndex();
      }
    } catch (e) {
      // Fall back to embedded data
      const dataEl = document.getElementById('posts-data');
      if (dataEl) {
        try {
          posts = JSON.parse(dataEl.textContent);
          buildIndex();
        } catch (err) {
          console.error('Failed to load posts:', err);
        }
      }
    }
  }

  /**
   * Build search index for faster lookups
   */
  function buildIndex() {
    searchIndex = posts.map(post => ({
      ...post,
      searchText: [
        post.title,
        post.excerpt,
        post.content,
        ...(post.categories || []),
        ...(post.tags || [])
      ].filter(Boolean).join(' ').toLowerCase()
    }));
  }

  /**
   * Search posts
   */
  function search(query) {
    if (!searchIndex || !query) {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const terms = normalizedQuery.split(/\s+/);

    return searchIndex
      .map(post => {
        let score = 0;

        // Title match (highest priority)
        if (post.title.toLowerCase().includes(normalizedQuery)) {
          score += 100;
        }

        // All terms match
        const allTermsMatch = terms.every(term => post.searchText.includes(term));
        if (allTermsMatch) {
          score += 50;
        }

        // Individual term matches
        terms.forEach(term => {
          if (post.searchText.includes(term)) {
            score += 10;
          }
        });

        // Category/tag match
        const cats = (post.categories || []).map(c => c.toLowerCase());
        const tags = (post.tags || []).map(t => t.toLowerCase());
        terms.forEach(term => {
          if (cats.includes(term) || tags.includes(term)) {
            score += 20;
  }
        });

        return { post, score };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(result => result.post);
  }

  /**
   * Highlight search terms in text
   */
  function highlight(text, query) {
    if (!query) return text;
    
    const terms = query.toLowerCase().split(/\s+/);
    let result = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    });
    
    return result;
  }

  /**
   * Escape regex special characters
   */
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Export for external use
  window.Search = {
    search,
    highlight,
    getPosts: () => posts
  };
    
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
