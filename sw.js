const VERSION = 'v1.6.0-r1';
// Include scope so another app on the same GitHub Pages origin keeps its caches.
const PREFIX = `n-scent:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const IMAGE_CACHE = PREFIX + 'product-images-v1';
const PRODUCT_IMAGE_HOSTS = new Set(['www.dior.com', 'www.chanel.cn', 'www.chloe.com', 'www.louisvuitton.cn', 'www.giorgioarmanibeauty.com.hk']);
const FILES = ['./', './index.html', './styles.css', './manifest.webmanifest', './src/app.js', './src/scent-notes.js', './src/updates.js', './src/catalog.js', './src/catalog-data.js', './src/data.js', './src/core.js', './src/shopping.js', './src/weather.js', './src/wearing.js', './assets/favicon.svg', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png', './assets/maskable-512.png', './assets/cedrus.png', './assets/gaiac10.jpg', './assets/another13.jpg', './assets/lazy-sunday-morning.jpg', './assets/imagination.avif', './assets/sycomore.jpg'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try { await cache.addAll(FILES); } catch (error) { await caches.delete(CACHE); throw error; }
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE && key !== IMAGE_CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && event.request.destination === 'image' && url.protocol === 'https:' && PRODUCT_IMAGE_HOSTS.has(url.hostname)) {
    event.respondWith((async () => {
      const images = await caches.open(IMAGE_CACHE);
      const cached = await images.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok || response.type === 'opaque') {
        try { await images.put(event.request, response.clone()); } catch { /* Online image remains usable if storage is full. */ }
      }
      return response;
    })());
    return;
  }
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return cache.match('./index.html');
      throw error;
    }
  })());
});
