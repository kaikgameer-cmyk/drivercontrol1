const CACHE_NAME = "ng-static-v3"; // <- sempre aumente quando mudar assets
const URLS_TO_CACHE = [
  "/",
  "/manifest.json",

  // Ícones v2
  "/favicon-v2.png",
  "/apple-touch-icon-v2.png",
  "/icon-192-v2.png",
  "/icon-512-v2.png",
  "/maskable-icon-512-v2.png",

  // opcional (se ainda existir e você usa)
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );

  self.skipWaiting?.();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );

  self.clients?.claim?.();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ✅ Para manifest e ícones: NETWORK-FIRST (sempre tenta pegar atualizado)
  const isIconOrManifest =
    url.pathname === "/manifest.json" ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico");

  if (isIconOrManifest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ✅ Para o resto: CACHE-FIRST
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => caches.match("/")))
  );
});
