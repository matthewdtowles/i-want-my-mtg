(function () {
    'use strict';

    var loaded = false;
    var loading = false;
    var queue = [];
    var CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    var ADAPTER_URL =
        'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js';

    var containers = document.querySelectorAll('[data-chart-src]');
    if (!containers.length) return;

    containers.forEach(function (el) {
        var observer = new IntersectionObserver(
            function (entries) {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    var src = el.getAttribute('data-chart-src');
                    var initFn = el.getAttribute('data-chart-init');
                    var entry = { src: src, initFn: initFn };
                    if (loaded) {
                        injectChartScript(entry);
                    } else {
                        queue.push(entry);
                        if (!loading) loadChartLibrary();
                    }
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
    });

    function loadChartLibrary() {
        loading = true;
        injectScript(CHART_JS_URL, function () {
            injectScript(ADAPTER_URL, function () {
                loaded = true;
                loading = false;
                queue.forEach(function (entry) {
                    injectChartScript(entry);
                });
                queue = [];
            });
        });
    }

    function injectChartScript(entry) {
        injectScript(entry.src, function () {
            if (entry.initFn && typeof window[entry.initFn] === 'function') {
                window[entry.initFn]();
            }
        });
    }

    function injectScript(src, onload) {
        var s = document.createElement('script');
        s.src = src;
        if (onload) s.onload = onload;
        document.head.appendChild(s);
    }
})();
