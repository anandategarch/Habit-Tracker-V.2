const STATIC_CACHE = "rutina-static-v9";
const STATIC_PREFIX = "/_next/static/";
const PUBLIC_ASSET = /^\/(?:icons\/|favicon\.ico$|apple-touch-icon)/;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("rutina-static-") && key !== STATIC_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Keep the app shell, HTML routes, APIs, authentication redirects and private
  // workspace data network-only. Only immutable build assets and public icons
  // are cache-first; the cache cannot bypass Vercel Authentication.
  const isStaticAsset = requestUrl.pathname.startsWith(STATIC_PREFIX) || PUBLIC_ASSET.test(requestUrl.pathname);
  if (!isStaticAsset) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "default")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
