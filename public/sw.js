// Version du cache - incrémenter pour forcer la mise à jour
const CACHE_VERSION = 'v3';
const SHELL_CACHE = 'neolia-shell-v3';

self.addEventListener('install', (event) => {
  console.log('[SW] Install - version', CACHE_VERSION);
  // Pre-cache index.html pour le fallback SPA
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.add('/index.html').catch((err) => {
        console.warn('[SW] Failed to cache index.html:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - clearing old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== SHELL_CACHE)
          .map((cacheName) => {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Gestion des requêtes pour SPA
// Les requêtes de navigation vers des routes non-fichiers doivent retourner index.html
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Seulement pour les requêtes de navigation (pas les assets, API, etc.)
  if (request.mode === 'navigate') {
    // Si c'est une route SPA (pas un fichier avec extension), servir index.html
    const pathname = url.pathname;
    const hasExtension = pathname.includes('.') && !pathname.endsWith('/');

    if (!hasExtension) {
      console.log('[SW] Navigation vers route SPA:', pathname, '-> index.html');
      event.respondWith(
        // Essayer le réseau d'abord, puis fallback sur le cache
        fetch('/index.html')
          .then((response) => {
            // Mettre à jour le cache avec la nouvelle version
            const responseClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put('/index.html', responseClone);
            });
            return response;
          })
          .catch(() => {
            // Réseau indisponible : servir depuis le cache
            console.log('[SW] Network failed, serving index.html from cache');
            return caches.match('/index.html').then((cached) => {
              if (cached) return cached;
              // Dernier fallback : rediriger vers la racine
              return new Response(
                '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/"></head><body>Redirection...</body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          })
      );
      return;
    }
  }

  // Pour tout le reste, fetch normal
  event.respondWith(fetch(request));
});
