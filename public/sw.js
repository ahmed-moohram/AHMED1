const CACHE_NAME = 'moharam-pwa-v3';
const CORE_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(CORE_ASSETS))
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
            ),
            self.clients.claim(),
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle GET
    if (req.method !== 'GET') return;

    // Never intercept APK downloads
    if (url.origin === self.location.origin && url.pathname.endsWith('.apk')) {
        return;
    }

    // For navigation requests, try network first then fallback to cache
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                return res;
            })
            .catch(() => caches.match(req) || caches.match('/index.html'))
        );
        return;
    }

    // For other requests: cache-first, then network
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((res) => {
                    // Cache same-origin responses
                    try {
                        if (url.origin === self.location.origin && res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                        }
                    } catch {
                        // ignore
                    }
                    return res;
                })
                .catch(() => cached);
        })
    );
});