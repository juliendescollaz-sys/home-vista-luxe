// Version du cache - incrémenter pour forcer la mise à jour
const CACHE_VERSION = 'v2';

self.addEventListener('install', (event) => {
  console.log('[SW] Install - version', CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - clearing old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Ne pas mettre en cache - toujours servir le réseau
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
