/* Network-only service worker: do not cache private workspace or auth responses. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Always send requests to the network. Vercel Authentication and Turso data
  // must not be bypassed by an offline or stale cache.
  event.respondWith(fetch(event.request));
});
