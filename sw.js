const CACHE_NAME = "siabu-shell-v4";
const APP_SHELL_FILES = [
    "./",
    "./index.html",
    "./css/styles.css?v=20261103-pull-refresh",
    "./js/script.js?v=20261103-pull-refresh",
    "./js/mock_data.js",
    "./manifest.webmanifest",
    "./apple-touch-icon.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];
const APP_SHELL_URLS = APP_SHELL_FILES.map(path => new URL(path, self.registration.scope).href);
const INDEX_URL = new URL("./index.html", self.registration.scope).href;

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames
                    .filter(cacheName => cacheName.startsWith("siabu-shell-") && cacheName !== CACHE_NAME)
                    .map(cacheName => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => caches.match(INDEX_URL))
        );
        return;
    }

    if (!APP_SHELL_URLS.includes(request.url)) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(request, { cache: "no-cache" });
            if (response.ok) await cache.put(request, response.clone());
            return response;
        } catch (error) {
            const cachedResponse = await cache.match(request);
            if (cachedResponse) return cachedResponse;
            throw error;
        }
    })());
});
