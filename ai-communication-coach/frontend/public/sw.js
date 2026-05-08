const CACHE_NAME = 'ai-communication-coach-v1';
const RUNTIME_CACHE = 'ai-communication-coach-runtime-v1';

const APP_SHELL = [
  '/',
  '/auth',
  '/dashboard',
  '/room',
  '/analytics',
  '/leaderboard',
  '/team',
  '/profile',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
          return caches.delete(key);
        }
        return null;
      }),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseClone)).catch(() => null);
          return networkResponse;
        })
        .catch(() => caches.match('/dashboard'));
    }),
  );
});
