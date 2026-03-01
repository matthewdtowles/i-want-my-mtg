(function () {
    var chart = null;
    var activeRange = 'all';

    function isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }

    function getColors() {
        var dark = isDarkMode();
        return {
            basePrice: dark ? '#2cc8ca' : '#0d9488',
            totalPrice: dark ? '#60a5fa' : '#2563eb',
            basePriceAll: dark ? '#a95de0' : '#7c3aed',
            totalPriceAll: dark ? '#f472b6' : '#db2777',
            grid: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            text: dark ? '#d1d5db' : '#374151',
        };
    }

    function renderChart(data) {
        var canvas = document.getElementById('set-price-history-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var colors = getColors();

        var basePricePoints = [];
        var totalPricePoints = [];
        var basePriceAllPoints = [];
        var totalPriceAllPoints = [];
        var hasBasePrice = false;
        var hasTotalPrice = false;
        var hasBasePriceAll = false;
        var hasTotalPriceAll = false;

        data.prices.forEach(function (p) {
            if (p.basePrice != null) {
                basePricePoints.push({ x: p.date, y: p.basePrice });
                hasBasePrice = true;
            }
            if (p.totalPrice != null) {
                totalPricePoints.push({ x: p.date, y: p.totalPrice });
                hasTotalPrice = true;
            }
            if (p.basePriceAll != null) {
                basePriceAllPoints.push({ x: p.date, y: p.basePriceAll });
                hasBasePriceAll = true;
            }
            if (p.totalPriceAll != null) {
                totalPriceAllPoints.push({ x: p.date, y: p.totalPriceAll });
                hasTotalPriceAll = true;
            }
        });

        // Check if datasets differ from basePrice to avoid showing duplicate lines
        function pointsDiffer(a, b) {
            if (a.length !== b.length) return true;
            for (var i = 0; i < a.length; i++) {
                if (a[i].x !== b[i].x || a[i].y !== b[i].y) return true;
            }
            return false;
        }

        var pointRadius = data.prices.length > 90 ? 0 : 2;
        var datasets = [];

        if (hasBasePrice) {
            datasets.push({
                label: 'Base Set',
                data: basePricePoints,
                borderColor: colors.basePrice,
                backgroundColor: colors.basePrice + '20',
                borderWidth: 2,
                pointRadius: pointRadius,
                tension: 0.3,
            });
        }
        if (hasTotalPrice && pointsDiffer(totalPricePoints, basePricePoints)) {
            datasets.push({
                label: 'All Cards',
                data: totalPricePoints,
                borderColor: colors.totalPrice,
                backgroundColor: colors.totalPrice + '20',
                borderWidth: 2,
                pointRadius: pointRadius,
                tension: 0.3,
            });
        }
        if (hasBasePriceAll && pointsDiffer(basePriceAllPoints, basePricePoints)) {
            datasets.push({
                label: 'Base + Foils',
                data: basePriceAllPoints,
                borderColor: colors.basePriceAll,
                backgroundColor: colors.basePriceAll + '20',
                borderWidth: 2,
                pointRadius: pointRadius,
                tension: 0.3,
            });
        }
        if (
            hasTotalPriceAll &&
            pointsDiffer(totalPriceAllPoints, basePricePoints) &&
            pointsDiffer(totalPriceAllPoints, totalPricePoints)
        ) {
            datasets.push({
                label: 'All + Foils',
                data: totalPriceAllPoints,
                borderColor: colors.totalPriceAll,
                backgroundColor: colors.totalPriceAll + '20',
                borderWidth: 2,
                pointRadius: pointRadius,
                tension: 0.3,
            });
        }

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: { color: colors.text },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                var value = context.parsed.y;
                                if (value == null) return context.dataset.label + ': N/A';
                                return context.dataset.label + ': $' + value.toFixed(2);
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: data.prices.length > 365 ? 'month' : 'day',
                            tooltipFormat: 'MMM d, yyyy',
                            displayFormats: {
                                day: 'MMM d',
                                month: 'MMM yyyy',
                            },
                        },
                        ticks: {
                            color: colors.text,
                            maxTicksLimit: 12,
                        },
                        grid: { color: colors.grid },
                    },
                    y: {
                        ticks: {
                            color: colors.text,
                            callback: function (value) {
                                return '$' + value.toFixed(2);
                            },
                        },
                        grid: { color: colors.grid },
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    function fetchAndRender(setCode, days) {
        var url = '/sets/' + setCode + '/price-history';
        if (days) {
            url += '?days=' + days;
        }

        var container = document.getElementById('set-price-history-chart');
        if (!container) return;

        fetch(url)
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                if (!data.prices || data.prices.length === 0) {
                    container.innerHTML =
                        '<p class="text-gray-500 dark:text-gray-400 text-sm">No price history available.</p>';
                    return;
                }
                renderChart(data);
            })
            .catch(function () {
                container.innerHTML =
                    '<p class="text-gray-500 dark:text-gray-400 text-sm">Failed to load price history.</p>';
            });
    }

    function initSetPriceHistory() {
        var container = document.getElementById('set-price-history-chart');
        if (!container) return;

        var setCode = container.getAttribute('data-set-code');
        if (!setCode) return;

        fetchAndRender(setCode, '7');

        var buttons = document.querySelectorAll('.set-price-history-range');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var days = btn.getAttribute('data-days');
                activeRange = days || 'all';
                buttons.forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                fetchAndRender(setCode, days || undefined);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSetPriceHistory);
    } else {
        initSetPriceHistory();
    }
})();
