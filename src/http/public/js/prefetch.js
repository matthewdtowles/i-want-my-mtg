/**
 * Lightweight link prefetching for navigation performance.
 *
 * - On idle: prefetches visible nav links via IntersectionObserver
 * - On hover/touchstart: prefetches any internal <a> link
 * - Respects Save-Data
 * - Deduplicates requests; skips already-visited pages (in-memory set)
 */
(function () {
    'use strict';

    // Bail out if the user has Save-Data enabled
    if (navigator.connection && navigator.connection.saveData) return;

    var prefetched = new Set();
    var hoverTimer = null;

    function shouldPrefetch(url) {
        if (!url) return false;
        // Only same-origin, HTTP(S) links
        try {
            var parsed = new URL(url, location.origin);
            if (parsed.origin !== location.origin) return false;
            if (parsed.pathname === location.pathname) return false;
            if (parsed.hash && parsed.pathname === location.pathname) return false;
            // Skip auth actions (logout, login POST targets)
            if (parsed.pathname.indexOf('/auth/logout') === 0) return false;
            return !prefetched.has(parsed.pathname);
        } catch (e) {
            return false;
        }
    }

    function prefetchUrl(url) {
        try {
            var parsed = new URL(url, location.origin);
            if (prefetched.has(parsed.pathname)) return;
            prefetched.add(parsed.pathname);

            var link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = parsed.pathname + parsed.search;
            link.as = 'document';
            document.head.appendChild(link);
        } catch (e) {
            // Ignore invalid URLs
        }
    }

    // Prefetch nav links when browser is idle
    function prefetchNavLinks() {
        var navLinks = document.querySelectorAll('nav a[href]');
        navLinks.forEach(function (a) {
            if (shouldPrefetch(a.href)) {
                prefetchUrl(a.href);
            }
        });
    }

    // Hover/touch prefetching for any internal link
    function onPointerEnter(e) {
        var anchor = e.target.closest('a[href]');
        if (!anchor || !shouldPrefetch(anchor.href)) return;

        hoverTimer = setTimeout(function () {
            prefetchUrl(anchor.href);
        }, 65);
    }

    function onPointerLeave() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }

    // Use requestIdleCallback for nav links, fallback to setTimeout
    var scheduleIdle =
        window.requestIdleCallback ||
        function (cb) {
            setTimeout(cb, 200);
        };

    scheduleIdle(function () {
        prefetchNavLinks();

        // Delegate hover/touch on document for all links
        document.addEventListener('pointerenter', onPointerEnter, true);
        document.addEventListener('pointerleave', onPointerLeave, true);
        document.addEventListener(
            'touchstart',
            function (e) {
                var anchor = e.target.closest('a[href]');
                if (anchor && shouldPrefetch(anchor.href)) {
                    prefetchUrl(anchor.href);
                }
            },
            { passive: true, capture: true }
        );
    });
})();
