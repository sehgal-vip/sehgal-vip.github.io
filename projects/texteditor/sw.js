// Service Worker for TextConvert - Offline support (works at any base path)
const CACHE_NAME = 'textconvert-v1';
const BASE = new URL('.', self.location.href).pathname.replace(/\/?$/, '/');
const STATIC_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'css/style.css',
  BASE + 'js/app.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// CDN assets to cache
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js',
  'https://cdn.jsdelivr.net/npm/turndown-plugin-gfm/dist/turndown-plugin-gfm.js',
  'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Try to cache CDN assets (may fail due to CORS, that's ok)
        return caches.open(CACHE_NAME + '-cdn')
          .then((cdnCache) => {
            return Promise.allSettled(
              CDN_ASSETS.map((url) => 
                fetch(url, { mode: 'no-cors' })
                  .then((response) => cdnCache.put(url, response))
                  .catch((err) => console.log('Failed to cache CDN asset:', url, err))
              )
            );
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== CACHE_NAME + '-cdn')
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // For HTML pages - network first, cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // For static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          fetch(request)
            .then((response) => {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            })
            .catch(() => {}); // Ignore network errors for background update
          return cachedResponse;
        }
        
        // Not in cache - fetch from network
        return fetch(request)
          .then((response) => {
            // Cache the new response
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          });
      })
  );
});
