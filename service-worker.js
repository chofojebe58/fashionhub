const CACHE_NAME = 'fashionhub-static-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/shop.html',
  '/lookbook.html',
  '/style.css',
  '/script.js',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
        return null;
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // For navigation requests, try network first then fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests, respond from cache first
  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});
