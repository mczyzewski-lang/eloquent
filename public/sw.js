/* Elofik — service worker (PWA). Cache statyki; audio i API zawsze z sieci (prywatne, podpisane URL-e). */
const CACHE = "elofik-static-v2";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/icons/icon-192.png"])).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/app") || url.pathname.startsWith("/konto") || url.pathname.startsWith("/admin")) return;
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })));
  }
});
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : { title: "Elofik", body: "Nowa bajka już czeka!" };
  e.waitUntil(self.registration.showNotification(data.title || "Elofik", { body: data.body, icon: "/icons/icon-192.png", data: { url: "/app" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow((e.notification.data && e.notification.data.url) || "/app"));
});
