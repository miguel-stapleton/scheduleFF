const CACHE = 'app-v4';
const STATIC_ASSETS = [
  // Do NOT cache the manifest to avoid stale metadata in DevTools
  // '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(STATIC_ASSETS))
      .catch((err) => console.warn('[SW] install cache error:', err))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Always fetch the manifest fresh to let DevTools show current icons/screenshots
  try {
    const url = new URL(req.url);
    if (url.pathname === '/manifest.json') {
      e.respondWith(fetch(req));
      return;
    }
  } catch (_) {}

  // Handle navigations with network-first, cache-fallback strategy
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          // Cache the last good page for offline use
          cache.put(new Request('/'), res.clone());
          return res;
        } catch (err) {
          const cached = (await caches.match(req)) || (await caches.match('/'));
          if (cached) return cached;
          return new Response(
            `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Offline</title><style>html,body{height:100%;margin:0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:grid;place-items:center;background:#111;color:#eee} .box{max-width:520px;text-align:center;padding:24px;border:1px solid #333;border-radius:12px;background:#1a1a1a}</style></head><body><div class="box"><h1>You're offline</h1><p>The app couldn't load a cached version of this page.</p><p>Reconnect and reload once to make it available offline next time.</p></div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Cache-first for static files
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req))
  );
});
