/**
 * SHUB LOTO — Service Worker
 * Cache-first for assets, network-first for data
 * Version: 2.0.0
 */

const CACHE_NAME    = 'shubloto-v2';
const DATA_CACHE    = 'shubloto-data-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/resultados.js',
  '/js/estatisticas.js',
  '/js/gerador.js',
  '/js/ia.js',
  '/manifest.json',
];

const DATA_HOSTS = [
  'raw.githubusercontent.com',
];

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Data requests → network first, fallback to cache
  if (DATA_HOSTS.includes(url.hostname)) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Static assets → cache first
  event.respondWith(cacheFirst(event.request, CACHE_NAME));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
