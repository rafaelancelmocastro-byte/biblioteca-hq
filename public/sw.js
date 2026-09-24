const CACHE = 'biblioteca-hq-shell-v6';
const SHELL = ['/', '/mobile-upload.html', '/site.webmanifest', '/brand-icon.svg', '/brand-logo.svg', '/favicon-32.png', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];
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
})()));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/share-pdf') {
    event.respondWith((async () => {
      try {
        const form = await request.formData();
        const files = form.getAll('pdfs').filter((item) => item instanceof File && /\.(pdf|cbr|cbz|epub|azw3)$/i.test(item.name));
        if (!files.length) return Response.redirect(new URL('/configuracoes?share_error=1', self.location.origin).href, 303);
        const db = await new Promise((resolve, reject) => {
          const open = indexedDB.open('biblioteca-hq-shared-import-v1', 1);
          open.onupgradeneeded = () => open.result.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        await new Promise((resolve, reject) => {
          const tx = db.transaction('files', 'readwrite');
          for (const file of files) tx.objectStore('files').add({ file, addedAt: Date.now() });
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
        return Response.redirect(new URL('/configuracoes?shared=1', self.location.origin).href, 303);
      } catch { return Response.redirect(new URL('/configuracoes?share_error=1', self.location.origin).href, 303); }
    })());
    return;
  }
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
