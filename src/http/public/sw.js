/**
 * Service worker for I Want My MTG.
 *
 * Strategies:
 * - Static assets (CSS, JS, images, fonts): Cache-first with versioned cache
 * - API GET responses: Network-first with cache fallback
 * - HTML pages: Network-first with offline fallback
 * - Card images (Scryfall): Cache on visit, serve from cache when available
 */
var APP_VERSION = '1.12.0';
var CACHE_VERSION = 'v1-' + APP_VERSION;
var STATIC_CACHE = 'static-' + CACHE_VERSION;
var API_CACHE = 'api-' + CACHE_VERSION;
var IMAGE_CACHE = 'images-' + CACHE_VERSION;

var PRECACHE_URLS = [
    '/public/css/tailwind.css',
    '/public/css/app.css',
    '/public/js/ajaxUtils.js',
    '/public/js/toast.js',
    '/public/js/searchSuggest.js',
    '/public/js/prefetch.js',
    '/public/images/logo.webp',
];

var OFFLINE_PAGE = '/offline';

// Install: precache static assets and offline page
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then(function (cache) {
                return cache.addAll(PRECACHE_URLS.concat([OFFLINE_PAGE]));
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
    var url = new URL(request.url);
    url.search = '';
    var normalizedRequest = new Request(url.toString(), { headers: request.headers });
    return caches.match(normalizedRequest).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
            if (response.ok) {
                var clone = response.clone();
                caches.open(cacheName).then(function (cache) {
                    cache.put(normalizedRequest, clone);
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
