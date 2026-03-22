const CACHE_NAME = 'singularity-v13';
const urlsToCache = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install: cache all core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activate: delete all old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open tabs
  );
});

// Fetch: network-first for index.html (always get latest), cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for the main HTML file so updates are always received
  if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Update cache with fresh response
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for fonts, Chart.js and other static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          // Cache any new assets we fetched
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
  );
});