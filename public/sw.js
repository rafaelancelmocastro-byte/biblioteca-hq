const CACHE = 'biblioteca-hq-shell-v4';
const SHELL = ['/', '/site.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];
const ASSETS = __ASSETS__;
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const previousCaches = (await caches.keys()).filter((key) => key.startsWith('biblioteca-hq-shell-') && key !== CACHE);
  for (const key of previousCaches) await caches.delete(key);
  await self.clients.claim();
  if (previousCaches.length) {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.allSettled(windows.filter((client) => !/^\/(ler|admin|configuracoes|login)(\/|$)/.test(new URL(client.url).pathname)).map((client) => client.navigate(client.url)));
  }
})()));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE)).match('/')));
    return;
  }
  if (!url.pathname.startsWith('/assets/') && !SHELL.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
