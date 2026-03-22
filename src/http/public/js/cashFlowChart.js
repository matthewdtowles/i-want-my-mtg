(function () {
    'use strict';

    var canvas = document.getElementById('cashflow-canvas');
    if (!canvas) return;

    fetch('/portfolio/cash-flow')
        .then(function (res) {
            return res.json();
        })
        .then(function (data) {
            if (!data.cashFlow || data.cashFlow.length === 0) {
                var container = document.getElementById('cashflow-chart-container');
                if (container) container.style.display = 'none';
                return;
            }

            var labels = data.cashFlow.map(function (d) {
                return d.period;
            });
            var bought = data.cashFlow.map(function (d) {
                return d.totalBought;
            });
            var sold = data.cashFlow.map(function (d) {
                return d.totalSold;
            });
            var net = data.cashFlow.map(function (d) {
                return d.net;
            });

            var isDark = document.documentElement.classList.contains('dark');
            var gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            var textColor = isDark ? '#9ca3af' : '#6b7280';

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Buys',
                            data: bought,
                            backgroundColor: isDark ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.5)',
                            borderRadius: 3,
                            order: 2,
                        },
                        {
                            label: 'Sells',
                            data: sold,
                            backgroundColor: isDark
                                ? 'rgba(45,212,191,0.6)'
                                : 'rgba(13,148,136,0.5)',
                            borderRadius: 3,
                            order: 2,
                        },
                        {
                            label: 'Net',
                            data: net,
                            type: 'line',
                            borderColor: isDark ? '#818cf8' : '#6366f1',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            pointRadius: 3,
                            tension: 0.3,
                            order: 1,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: textColor, font: { size: 11 } },
                        },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    var v = ctx.parsed.y;
                                    var abs = Math.abs(v).toFixed(2);
                                    var formatted = v < 0 ? '-$' + abs : '$' + abs;
                                    return ctx.dataset.label + ': ' + formatted;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { size: 10 } },
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: {
                                color: textColor,
                                font: { size: 10 },
                                callback: function (v) {
                                    return v < 0 ? '-$' + Math.abs(v) : '$' + v;
                                },
                            },
                        },
                    },
                },
            });
        })
        .catch(function (err) {
            console.error('Error loading cash flow data:', err);
        });
})();
