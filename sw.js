/* DTR service worker — caches the app shell only. API calls (script.google.com)
 * are never cached: they always go to the network so punches are never stale.
 * Bump CACHE_VERSION whenever you deploy a new index.html.
 */
const CACHE_VERSION = 'dtr-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let API + third-party requests hit the network

  // Stale-while-revalidate: instant load from cache, refresh in the background.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async cache => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
      const network = fetch(req)
        .then(res => {
          if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});