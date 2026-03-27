/**
 * Service worker for I Want My MTG.
 *
 * Strategies:
 * - Static assets (CSS, JS, images, fonts): Cache-first with versioned cache
 * - API GET responses: Network-first with cache fallback
 * - HTML pages: Network-first with offline fallback
 * - Card images (Scryfall): Cache on visit, serve from cache when available
 */
var APP_VERSION = '__APP_VERSION__';
var CACHE_VERSION = 'v1-' + APP_VERSION;
var STATIC_CACHE = 'static-' + CACHE_VERSION;
var API_CACHE = 'api-' + CACHE_VERSION;
var IMAGE_CACHE = 'images-' + CACHE_VERSION;

var PRECACHE_URLS = [
    '/public/css/tailwind.css?v=' + APP_VERSION,
    '/public/css/app.css?v=' + APP_VERSION,
    '/public/css/mana.css?v=' + APP_VERSION,
    '/public/js/ajaxUtils.js?v=' + APP_VERSION,
    '/public/js/toast.js?v=' + APP_VERSION,
    '/public/js/searchSuggest.js?v=' + APP_VERSION,
    '/public/js/prefetch.js?v=' + APP_VERSION,
    '/public/images/logo.webp?v=' + APP_VERSION,
];

var OFFLINE_PAGE = '/offline';

// Install: precache static assets and offline page
// Use cache: 'reload' to bypass the browser HTTP cache so version bumps
// always fetch fresh files even when the HTTP cache has stale copies.
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then(function (cache) {
                // Cache offline page first — this is required for the SW to work
                var offlineRequest = new Request(OFFLINE_PAGE, { cache: 'reload' });
                return cache.add(offlineRequest).then(function () {
                    // Precache static assets individually so one missing optional
                    // asset (e.g., generated mana.css) does not break the install
                    var promises = PRECACHE_URLS.map(function (url) {
                        return cache
                            .add(new Request(url, { cache: 'reload' }))
                            .catch(function (err) {
                                console.warn('SW: failed to precache ' + url, err);
                            });
                    });
                    return Promise.allSettled(promises);
                });
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

// Activate: clean old caches
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches
            .keys()
            .then(function (keys) {
                return Promise.all(
                    keys
                        .filter(function (key) {
                            return key !== STATIC_CACHE && key !== API_CACHE && key !== IMAGE_CACHE;
                        })
                        .map(function (key) {
                            return caches.delete(key);
                        })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip non-http(s) and cross-origin requests (except Scryfall card images)
    var isScryfall = url.hostname === 'cards.scryfall.io';
    if (url.origin !== self.location.origin && !isScryfall) return;

    // Scryfall card images: cache on visit
    if (isScryfall) {
        event.respondWith(cacheFirst(IMAGE_CACHE, event.request));
        return;
    }

    // Static assets: cache-first
    if (url.pathname.startsWith('/public/')) {
        event.respondWith(cacheFirst(STATIC_CACHE, event.request));
        return;
    }

    // API responses: network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(API_CACHE, event.request));
        return;
    }

    // HTML pages: network-first with offline fallback
    if (
        event.request.headers.get('accept') &&
        event.request.headers.get('accept').includes('text/html')
    ) {
        event.respondWith(
            networkFirst(STATIC_CACHE, event.request).catch(function () {
                return caches.match(OFFLINE_PAGE);
            })
        );
        return;
    }
});

function cacheFirst(cacheName, request) {
    return caches.match(request).then(function (cached) {
        if (cached) return cached;
        // Bypass browser HTTP cache on cache miss to avoid serving stale files
        return fetch(request, { cache: 'reload' }).then(function (response) {
            if (response.ok || response.type === 'opaque') {
                var clone = response.clone();
                caches.open(cacheName).then(function (cache) {
                    cache.put(request, clone);
                });
            }
            return response;
        });
    });
}

function networkFirst(cacheName, request) {
    return fetch(request)
        .then(function (response) {
            if (response.ok) {
                var cc = response.headers.get('Cache-Control') || '';
                if (cc.indexOf('no-store') === -1 && cc.indexOf('private') === -1) {
                    var clone = response.clone();
                    caches.open(cacheName).then(function (cache) {
                        cache.put(request, clone);
                    });
                }
            }
            return response;
        })
        .catch(function () {
            return caches.match(request);
        });
}
