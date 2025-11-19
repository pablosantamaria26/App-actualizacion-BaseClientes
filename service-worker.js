const CACHE_NAME = "clientes-ml-v4";

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "service-worker.js",
  "icon-192.png",
  "icon-512.png",
  "favicon.ico"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Cacheando assets...");
      return cache.addAll(ASSETS);
    })
  );
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log("[SW] Borrando cache antiguo:", k);
            return caches.delete(k);
          }
        })
      )
    )
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  // Solo recursos del mismo dominio
  if (!req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          // Cachea en segundo plano lo nuevo
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, res.clone());
          });
          return res;
        })
      );
    })
  );
});
