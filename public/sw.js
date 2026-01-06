// Version du cache - incrémenter pour forcer la mise à jour
const CACHE_VERSION = 'v4';
const SHELL_CACHE = 'neolia-shell-v4';

// Liste des routes SPA connues (préfixes)
const SPA_ROUTE_PREFIXES = [
  '/media-player/',
  '/rooms/',
  '/sonos-zones',
  '/favorites',
  '/scenes',
  '/routines',
  '/smart',
  '/groupes',
  '/settings',
  '/admin',
  '/dev',
  '/floor-plan-editor',
  '/intercom-test',
];

// Extensions de fichiers statiques
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', 
  '.woff', '.woff2', '.ttf', '.eot', '.json', '.webp', '.mp3', '.mp4',
  '.webmanifest', '.map'
];

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
  // Force le nouveau SW à prendre le contrôle immédiatement
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - version', CACHE_VERSION, '- clearing old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== SHELL_CACHE)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Prendre le contrôle de tous les clients immédiatement
      return self.clients.claim();
    })
  );
});

/**
 * Détermine si une URL correspond à une route SPA (pas un fichier statique)
 */
function isSPARoute(url) {
  const pathname = url.pathname;
  
  // Si c'est la racine, c'est une route SPA
  if (pathname === '/' || pathname === '') {
    return true;
  }
  
  // Si l'URL a une extension de fichier statique, ce n'est pas une route SPA
  const hasStaticExtension = STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
  if (hasStaticExtension) {
    return false;
  }
  
  // Si c'est un préfixe de route SPA connu
  const isKnownRoute = SPA_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (isKnownRoute) {
    return true;
  }
  
  // Si le chemin ne contient pas de point (pas d'extension), c'est probablement une route SPA
  // Exception: les chemins comme /api/ ne sont pas des routes SPA
  if (!pathname.includes('.') && !pathname.startsWith('/api')) {
    return true;
  }
  
  return false;
}

/**
 * Récupère index.html (réseau puis cache)
 */
async function getIndexHtml() {
  try {
    // Essayer le réseau d'abord
    const networkResponse = await fetch('/index.html', {
      cache: 'no-cache', // Force une requête fraîche
    });
    
    if (networkResponse.ok) {
      // Mettre à jour le cache
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/index.html', networkResponse.clone());
      return networkResponse;
    }
  } catch (e) {
    console.log('[SW] Network failed for index.html, using cache');
  }
  
  // Fallback sur le cache
  const cachedResponse = await caches.match('/index.html');
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Dernier recours : HTML de redirection
  console.warn('[SW] No cached index.html, returning redirect');
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=/">
  <title>Chargement...</title>
  <style>
    body { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      margin: 0;
      background: #1a1a2e;
      color: white;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <p>Chargement...</p>
</body>
</html>`,
    { 
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    }
  );
}

// Gestion des requêtes
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorer les requêtes vers d'autres origines
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Pour les requêtes de navigation OU les requêtes GET vers des routes SPA
  // Note: iOS Safari peut parfois ne pas définir request.mode correctement
  const isNavigation = request.mode === 'navigate';
  const isGetRequest = request.method === 'GET';
  const isSPA = isSPARoute(url);
  
  if ((isNavigation || isGetRequest) && isSPA) {
    console.log('[SW] SPA route detected:', url.pathname, '-> serving index.html');
    event.respondWith(getIndexHtml());
    return;
  }
  
  // Pour les assets statiques, essayer le cache d'abord pour les performances
  if (isGetRequest && STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Mettre à jour le cache en arrière-plan
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(SHELL_CACHE).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Pour tout le reste, fetch normal
});
