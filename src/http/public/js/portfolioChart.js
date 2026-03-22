(function () {
    var chart = null;

    function isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }

    function getColors() {
        var dark = isDarkMode();
        return {
            value: dark ? '#2cc8ca' : '#0d9488',
            cost: dark ? '#f59e0b' : '#d97706',
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

    function buildLegend(datasets) {
        var legendEl = document.getElementById('portfolio-legend');
        if (!legendEl) return;
        legendEl.innerHTML = '';

        datasets.forEach(function (ds, i) {
            var item = document.createElement('span');
            item.className =
                'inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 cursor-pointer';
            item.setAttribute('data-dataset-index', i);

            var swatch = document.createElement('span');
            swatch.className = 'inline-block w-3 h-3 rounded-sm flex-shrink-0';
            swatch.style.backgroundColor = ds._fullColor;
            item.appendChild(swatch);

            var label = document.createElement('span');
            label.textContent = ds.label;
            item.appendChild(label);

            item.addEventListener('click', function () {
                if (!chart) return;
                var meta = chart.getDatasetMeta(i);
                meta.hidden = meta.hidden === null ? !ds.hidden : null;
                item.style.opacity = meta.hidden ? '0.4' : '1';
                chart.update('none');
            });

            legendEl.appendChild(item);
        });
    }

    function renderChart(data) {
        var canvas = document.getElementById('portfolio-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var colors = getColors();

        var valuePoints = [];
        var costPoints = [];
        var hasCost = false;

        data.history.forEach(function (p) {
            if (p.totalValue != null) {
                valuePoints.push({ x: p.date, y: p.totalValue });
            }
            if (p.totalCost != null) {
                costPoints.push({ x: p.date, y: p.totalCost });
                hasCost = true;
            }
        });

        var pointRadius = data.history.length > 90 ? 0 : 2;
        var datasets = [
            {
                label: 'Market Value',
                data: valuePoints,
                borderColor: colors.value,
                backgroundColor: colors.value + '20',
                borderWidth: 3,
                pointRadius: pointRadius,
                tension: 0.3,
                fill: true,
                _fullColor: colors.value,
            },
        ];

        if (hasCost) {
            datasets.push({
                label: 'Cost Basis',
                data: costPoints,
                borderColor: colors.cost,
                backgroundColor: colors.cost + '20',
                borderWidth: 2,
                pointRadius: pointRadius,
                tension: 0.3,
                borderDash: [5, 5],
                fill: false,
                _fullColor: colors.cost,
            });
        }

        buildLegend(datasets);

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
                                var ds = context.dataset;
                                var value = context.parsed.y;
                                if (value == null) return ds.label + ': N/A';
                                return ds.label + ': $' + value.toFixed(2);
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
                            unit: data.history.length > 365 ? 'month' : 'day',
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

    function fetchAndRender(days) {
        var url = '/portfolio/history';
        if (days) {
            url += '?days=' + days;
        }

        var container = document.getElementById('portfolio-chart-container');
        if (!container) return;

        fetch(url)
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                if (!data.history || data.history.length === 0) {
                    container.innerHTML =
                        '<p class="text-gray-500 dark:text-gray-400 text-sm">No portfolio history available.</p>';
                    return;
                }
                renderChart(data);
            })
            .catch(function () {
                container.innerHTML =
                    '<p class="text-gray-500 dark:text-gray-400 text-sm">Failed to load portfolio history.</p>';
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var container = document.getElementById('portfolio-chart-container');
        if (!container) return;

        fetchAndRender('7');

        var buttons = document.querySelectorAll('.portfolio-range');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var days = btn.getAttribute('data-days');
                buttons.forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                fetchAndRender(days || undefined);
            });
        });
    });
})();
