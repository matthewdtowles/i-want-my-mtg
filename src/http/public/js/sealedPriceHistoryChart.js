(function () {
    'use strict';

    var chart = null;

    function isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }

    function getColors() {
        var dark = isDarkMode();
        return {
            line: dark ? '#2cc8ca' : '#0d9488',
            grid: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            text: dark ? '#d1d5db' : '#374151',
        };
    }

    function getOrCreateTooltipEl(canvas) {
        var container = canvas.parentElement;
        var el = container.querySelector('.chart-tooltip');
        if (!el) {
            el = document.createElement('div');
            el.className = 'chart-tooltip';
            el.style.opacity = '0';
            container.appendChild(el);
        }
        return el;
    }

    function externalTooltipHandler(context) {
        var tooltip = context.tooltip;
        var canvas = context.chart.canvas;
        var tooltipEl = getOrCreateTooltipEl(canvas);

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = '0';
            return;
        }

        if (tooltip.body) {
            tooltipEl.innerHTML = '';

            if (tooltip.title && tooltip.title.length) {
                var titleEl = document.createElement('div');
                titleEl.className = 'chart-tooltip-title';
                titleEl.textContent = tooltip.title[0];
                tooltipEl.appendChild(titleEl);
            }

            var bodyLines = tooltip.body.map(function (b) {
                return b.lines;
            });
            bodyLines.forEach(function (lines, i) {
                var item = document.createElement('div');
                item.className = 'chart-tooltip-body-item';
                var color = tooltip.labelColors[i] ? tooltip.labelColors[i].borderColor : '#fff';
                var swatch = document.createElement('span');
                swatch.className = 'chart-tooltip-swatch';
                swatch.style.backgroundColor = color;
                item.appendChild(swatch);
                var text = document.createElement('span');
                text.textContent = lines[0];
                text.style.color = tooltip.labelTextColors ? tooltip.labelTextColors[i] : '#fff';
                item.appendChild(text);
                tooltipEl.appendChild(item);
            });
        }

        tooltipEl.style.opacity = '1';

        var canvasRect = canvas.getBoundingClientRect();
        var containerRect = canvas.parentElement.getBoundingClientRect();
        var offsetX = canvasRect.left - containerRect.left;
        var offsetY = canvasRect.top - containerRect.top;
        var caretLeft = offsetX + tooltip.caretX;
        var tooltipWidth = tooltipEl.offsetWidth;
        var containerWidth = canvas.parentElement.offsetWidth;
        var left = caretLeft;
        if (caretLeft + tooltipWidth / 2 > containerWidth) {
            left = containerWidth - tooltipWidth / 2;
        }
        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = offsetY + tooltip.caretY + 'px';
        tooltipEl.style.transform = 'translate(-50%, -110%)';
    }

    function buildLegend() {
        var legendEl = document.getElementById('sealed-price-legend');
        if (!legendEl) return;
        legendEl.innerHTML = '';
        var colors = getColors();

        var item = document.createElement('span');
        item.className = 'inline-flex items-center gap-1 text-gray-700 dark:text-gray-300';
        var swatch = document.createElement('span');
        swatch.className = 'inline-block w-3 h-3 rounded-sm flex-shrink-0';
        swatch.style.backgroundColor = colors.line;
        item.appendChild(swatch);
        var label = document.createElement('span');
        label.textContent = 'Market';
        item.appendChild(label);
        legendEl.appendChild(item);
    }

    function renderChart(points) {
        var canvas = document.getElementById('sealed-price-history-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var colors = getColors();

        var data = [];
        points.forEach(function (p) {
            if (p.price != null) {
                data.push({ x: p.date, y: Number(p.price) });
            }
        });

        var pointRadius = points.length > 90 ? 0 : 2;
        var datasets = [
            {
                label: 'Market',
                data: data,
                borderColor: colors.line,
                backgroundColor: colors.line + '20',
                borderWidth: 3,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.line,
            },
        ];

        buildLegend();

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
                    legend: { display: false },
                    tooltip: {
                        enabled: false,
                        external: externalTooltipHandler,
                        callbacks: {
                            label: function (context) {
                                var value = context.parsed.y;
                                if (value == null) return context.dataset.label + ': N/A';
                                return context.dataset.label + ': $' + value.toFixed(2);
                            },
                            labelTextColor: function (context) {
                                return context.dataset._fullColor;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: points.length > 365 ? 'month' : 'day',
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

    function fetchAndRender(uuid, days) {
        var url = '/api/v1/sealed-products/' + encodeURIComponent(uuid) + '/price-history';
        if (days) {
            url += '?days=' + days;
        }

        var container = document.getElementById('sealed-price-history-chart');
        if (!container) return;

        fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                var points = json && json.success && Array.isArray(json.data) ? json.data : [];
                if (points.length === 0) {
                    container.innerHTML =
                        '<p class="text-gray-500 dark:text-gray-400 text-sm">No price history available.</p>';
                    return;
                }
                renderChart(points);
            })
            .catch(function () {
                container.innerHTML =
                    '<p class="text-gray-500 dark:text-gray-400 text-sm">Failed to load price history.</p>';
            });
    }

    function initSealedPriceHistory() {
        var container = document.getElementById('sealed-price-history-chart');
        if (!container) return;

        var uuid = container.getAttribute('data-sealed-uuid');
        if (!uuid) return;

        fetchAndRender(uuid, '7');

        var buttons = document.querySelectorAll('.sealed-price-history-range');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var days = btn.getAttribute('data-days');
                buttons.forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                fetchAndRender(uuid, days || undefined);
            });
        });
    }

    // chartLoader.js calls window[data-chart-init]() when the script loads
    window.initSealedPriceHistory = initSealedPriceHistory;
})();
