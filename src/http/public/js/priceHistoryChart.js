(function () {
    var chart = null;
    var activeDatasetIndex = 0;

    function isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }

    function getColors() {
        var dark = isDarkMode();
        return {
            normal: dark ? '#2cc8ca' : '#0d9488',
            foil: dark ? '#a95de0' : '#7c3aed',
            grid: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            text: dark ? '#d1d5db' : '#374151',
        };
    }

    function applyActiveDatasetStyles() {
        if (!chart) return;
        chart.data.datasets.forEach(function (d, j) {
            if (j === activeDatasetIndex) {
                d.borderColor = d._fullColor;
                d.borderWidth = 3;
            } else {
                d.borderColor = d._fullColor + '80';
                d.borderWidth = 1.5;
            }
        });
    }

    function updateLegendActiveState() {
        var legendEl = document.getElementById('card-price-legend');
        if (!legendEl) return;
        var items = legendEl.querySelectorAll('[data-dataset-index]');
        items.forEach(function (item) {
            var idx = parseInt(item.getAttribute('data-dataset-index'), 10);
            if (idx === activeDatasetIndex) {
                item.classList.add('legend-item-active');
            } else {
                item.classList.remove('legend-item-active');
            }
        });
    }

    function getFirstVisibleIndex() {
        if (!chart) return 0;
        for (var i = 0; i < chart.data.datasets.length; i++) {
            var meta = chart.getDatasetMeta(i);
            if (!meta.hidden) return i;
        }
        return 0;
    }

    function buildHtmlLegend(datasets) {
        var legendEl = document.getElementById('card-price-legend');
        if (!legendEl) return;
        legendEl.innerHTML = '';

        datasets.forEach(function (ds, i) {
            var item = document.createElement('span');
            item.className =
                'inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 cursor-pointer';
            item.setAttribute('data-dataset-index', i);

            if (i === activeDatasetIndex) {
                item.classList.add('legend-item-active');
            }

            var swatch = document.createElement('span');
            swatch.className = 'inline-block w-3 h-3 rounded-sm flex-shrink-0';
            swatch.style.backgroundColor = ds._fullColor;
            item.appendChild(swatch);

            var label = document.createElement('span');
            label.textContent = ds.label;
            item.appendChild(label);

            // Legend click to set active dataset
            item.addEventListener('click', function () {
                if (!chart) return;

                var meta = chart.getDatasetMeta(i);
                if (i === activeDatasetIndex) {
                    // Clicking the active item toggles its visibility
                    meta.hidden = meta.hidden === null ? !ds.hidden : null;
                    item.style.opacity = meta.hidden ? '0.4' : '1';
                    if (meta.hidden) {
                        activeDatasetIndex = getFirstVisibleIndex();
                    }
                } else {
                    // Make this the active dataset
                    activeDatasetIndex = i;
                    if (meta.hidden) {
                        meta.hidden = null;
                        item.style.opacity = '1';
                    }
                }

                applyActiveDatasetStyles();
                chart.update('none');
                updateLegendActiveState();
            });

            // Legend hover to highlight dataset
            item.addEventListener('mouseenter', function () {
                if (!chart) return;
                chart.data.datasets.forEach(function (d, j) {
                    if (j === i) {
                        d.borderColor = d._fullColor;
                        d.borderWidth = 3;
                    } else {
                        d.borderColor = d._fullColor + '80';
                        d.borderWidth = 1.5;
                    }
                });
                chart.update('none');
            });
            item.addEventListener('mouseleave', function () {
                if (!chart) return;
                applyActiveDatasetStyles();
                chart.update('none');
            });

            legendEl.appendChild(item);
        });
    }

    function hideTooltip() {
        var canvas = document.getElementById('price-history-canvas');
        if (canvas) {
            var tip = canvas.parentElement.querySelector('.chart-tooltip');
            if (tip) {
                tip.style.opacity = '0';
            }
        }
        if (chart) {
            chart.setActiveElements([]);
            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
            chart.update('none');
        }
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

        // Build content
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

        // Position tooltip above the hovered point
        var canvasRect = canvas.getBoundingClientRect();
        var containerRect = canvas.parentElement.getBoundingClientRect();
        var offsetX = canvasRect.left - containerRect.left;
        var offsetY = canvasRect.top - containerRect.top;
        var caretLeft = offsetX + tooltip.caretX;
        var tooltipWidth = tooltipEl.offsetWidth;
        var containerWidth = canvas.parentElement.offsetWidth;

        // Center above the point, but shift left if it would overflow the right edge
        var left = caretLeft;
        if (caretLeft + tooltipWidth / 2 > containerWidth) {
            left = containerWidth - tooltipWidth / 2;
        }

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = offsetY + tooltip.caretY + 'px';
        tooltipEl.style.transform = 'translate(-50%, -110%)';
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

        var pointRadius = data.prices.length > 90 ? 0 : 2;
        var datasets = [];
        if (hasNormal) {
            datasets.push({
                label: 'Normal',
                data: normalPoints,
                borderColor: colors.normal,
                backgroundColor: colors.normal + '20',
                borderWidth: 3,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.normal,
            });
        }
        if (hasFoil) {
            datasets.push({
                label: 'Foil',
                data: foilPoints,
                borderColor: colors.foil + '80',
                backgroundColor: colors.foil + '20',
                borderWidth: 1.5,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.foil,
            });
        }

        activeDatasetIndex = 0;

        // Apply initial active styles
        datasets.forEach(function (ds, i) {
            if (i === activeDatasetIndex) {
                ds.borderColor = ds._fullColor;
                ds.borderWidth = 3;
            } else {
                ds.borderColor = ds._fullColor + '80';
                ds.borderWidth = 1.5;
            }
        });

        buildHtmlLegend(datasets);

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
                buttons.forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                hideTooltip();
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
