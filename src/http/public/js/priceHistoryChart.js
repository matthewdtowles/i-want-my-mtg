(function () {
    let chart = null;
    let activeRange = 'all';

    function isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }

    function getColors() {
        const dark = isDarkMode();
        return {
            normal: dark ? '#2cc8ca' : '#0d9488',
            foil: dark ? '#a95de0' : '#7c3aed',
            grid: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            text: dark ? '#d1d5db' : '#374151',
        };
    }

    function renderChart(data) {
        var canvas = document.getElementById('price-history-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var colors = getColors();

        var normalPoints = [];
        var foilPoints = [];
        var hasNormal = false;
        var hasFoil = false;

        data.prices.forEach(function (p) {
            if (p.normal != null) {
                normalPoints.push({ x: p.date, y: p.normal });
                hasNormal = true;
            }
            if (p.foil != null) {
                foilPoints.push({ x: p.date, y: p.foil });
                hasFoil = true;
            }
        });

        var datasets = [];
        if (hasNormal) {
            datasets.push({
                label: 'Normal',
                data: normalPoints,
                borderColor: colors.normal,
                backgroundColor: colors.normal + '20',
                borderWidth: 2,
                pointRadius: data.prices.length > 90 ? 0 : 2,
                tension: 0.3,
            });
        }
        if (hasFoil) {
            datasets.push({
                label: 'Foil',
                data: foilPoints,
                borderColor: colors.foil,
                backgroundColor: colors.foil + '20',
                borderWidth: 2,
                pointRadius: data.prices.length > 90 ? 0 : 2,
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

    function fetchAndRender(cardId, days) {
        var url = '/card/' + cardId + '/price-history';
        if (days) {
            url += '?days=' + days;
        }

        var container = document.getElementById('price-history-chart');
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

    function initPriceHistory() {
        var container = document.getElementById('price-history-chart');
        if (!container) return;

        var cardId = container.getAttribute('data-card-id');
        if (!cardId) return;

        fetchAndRender(cardId, '7');

        var buttons = document.querySelectorAll('.price-history-range');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var days = btn.getAttribute('data-days');
                activeRange = days || 'all';
                buttons.forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                fetchAndRender(cardId, days || undefined);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPriceHistory);
    } else {
        initPriceHistory();
    }
})();
