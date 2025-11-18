const CACHE_NAME = "clientes-ml-v2"; // <--- CLAVE: Cambiar la versión
const ASSETS = [
  "./",
  "index.html",
  "manifest.json"
  // Se eliminan "style.css" y "app.js" porque ahora están dentro de index.html
];

self.addEventListener("install", (event) => {
  // La instalación forzará la descarga de los archivos actualizados.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  // Esto elimina todas las cachés anteriores (como clientes-ml-v1)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // Cache-First con Network Fallback
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
