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
                    if (loaded) {
                        injectScript(src);
                    } else {
                        queue.push(src);
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
                queue.forEach(function (src) {
                    injectScript(src);
                });
                queue = [];
            });
        });
    }

    function injectScript(src, onload) {
        var s = document.createElement('script');
        s.src = src;
        if (onload) s.onload = onload;
        document.head.appendChild(s);
    }
})();
