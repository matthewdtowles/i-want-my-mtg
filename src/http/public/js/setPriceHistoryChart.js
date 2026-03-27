(function () {
    var chart = null;
    var activeDatasetIndex = 0;

    // Maps data-price-type values to dataset labels
    var PRICE_TYPE_TO_LABEL = {
        'base-normal': 'Base Set',
        'total-normal': 'All Cards',
        'base-foil': 'Base + Foils',
        'total-foil': 'All + Foils',
    };

    var LABEL_TO_PRICE_TYPE = {};
    Object.keys(PRICE_TYPE_TO_LABEL).forEach(function (key) {
        LABEL_TO_PRICE_TYPE[PRICE_TYPE_TO_LABEL[key]] = key;
    });

    var TOOLTIP_TYPES = {
        'Base Set': function (baseSize) {
            return 'First ' + baseSize + ' cards in the set. Non-foil only.';
        },
        'All Cards': function (baseSize, totalSize) {
            return 'All ' + totalSize + ' cards (main + bonus). Non-foil only.';
        },
        'Base + Foils': function (baseSize) {
            return 'First ' + baseSize + ' cards and their foil versions.';
        },
        'All + Foils': function (baseSize, totalSize) {
            return 'All ' + totalSize + ' cards and their foil versions.';
        },
    };

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

    function readContainerData() {
        var container = document.getElementById('set-price-history-chart');
        if (!container) return {};
        return {
            baseSize: container.getAttribute('data-base-size'),
            totalSize: container.getAttribute('data-total-size'),
        };
    }

    function updateTileStates(activePriceType) {
        var tiles = document.querySelectorAll('[data-price-type]');
        tiles.forEach(function (tile) {
            var type = tile.getAttribute('data-price-type');
            if (type === activePriceType) {
                tile.classList.remove('price-tile-inactive');
                tile.classList.add('price-tile-active');
            } else {
                tile.classList.remove('price-tile-active');
                tile.classList.add('price-tile-inactive');
            }
        });
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
        var legendEl = document.getElementById('set-price-legend');
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

    function setActivePriceType(priceTypeOrIndex) {
        if (!chart) return;

        var targetIndex = -1;

        if (typeof priceTypeOrIndex === 'number') {
            targetIndex = priceTypeOrIndex;
        } else {
            // It's a price-type string like 'base-normal'
            var targetLabel = PRICE_TYPE_TO_LABEL[priceTypeOrIndex];
            if (!targetLabel) return;
            chart.data.datasets.forEach(function (ds, i) {
                if (ds.label === targetLabel) targetIndex = i;
            });
        }

        if (targetIndex < 0 || targetIndex >= chart.data.datasets.length) return;

        // Make sure the dataset is visible
        var meta = chart.getDatasetMeta(targetIndex);
        if (meta.hidden) {
            meta.hidden = null;
            var legendEl = document.getElementById('set-price-legend');
            if (legendEl) {
                var item = legendEl.querySelector('[data-dataset-index="' + targetIndex + '"]');
                if (item) item.style.opacity = '1';
            }
        }

        activeDatasetIndex = targetIndex;
        applyActiveDatasetStyles();
        chart.update('none');
        updateLegendActiveState();

        // Sync tile states
        var activeLabel = chart.data.datasets[targetIndex].label;
        var activePriceType = LABEL_TO_PRICE_TYPE[activeLabel];
        if (activePriceType) {
            updateTileStates(activePriceType);
        }
    }

    // Expose globally for tile onclick
    window.setActivePriceType = setActivePriceType;

    function buildHtmlLegend(datasets, containerData) {
        var legendEl = document.getElementById('set-price-legend');
        if (!legendEl) return;
        legendEl.innerHTML = '';

        var baseSize = containerData.baseSize || '?';
        var totalSize = containerData.totalSize || '?';

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

            // Info icon
            var infoDesc = TOOLTIP_TYPES[ds.label];
            if (infoDesc) {
                var infoBtn = document.createElement('button');
                infoBtn.type = 'button';
                infoBtn.className =
                    'legend-info-btn text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors relative';
                infoBtn.setAttribute('aria-label', 'Info about ' + ds.label);
                infoBtn.innerHTML =
                    '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';

                var tooltip = document.createElement('span');
                tooltip.className =
                    'legend-info-tooltip hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-midnight-800 dark:bg-midnight-700 text-white text-xs rounded p-2 pr-5 shadow-lg z-20 w-44 text-center whitespace-normal';
                tooltip.textContent = infoDesc(baseSize, totalSize);

                // X close button
                var closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'legend-tooltip-close';
                closeBtn.setAttribute('aria-label', 'Close');
                closeBtn.innerHTML = '&times;';
                closeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    tooltip.classList.add('hidden');
                });
                tooltip.appendChild(closeBtn);

                infoBtn.appendChild(tooltip);

                infoBtn.addEventListener('mouseenter', function () {
                    tooltip.classList.remove('hidden');
                });
                infoBtn.addEventListener('mouseleave', function () {
                    // Only hide on mouseleave if not "pinned" via click
                    if (!tooltip.dataset.pinned) {
                        tooltip.classList.add('hidden');
                    }
                });
                infoBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (tooltip.classList.contains('hidden')) {
                        tooltip.classList.remove('hidden');
                        tooltip.dataset.pinned = 'true';
                    } else {
                        tooltip.classList.add('hidden');
                        delete tooltip.dataset.pinned;
                    }
                });

                item.appendChild(infoBtn);
            }

            // Legend click to set active dataset (not on info button)
            item.addEventListener('click', function (e) {
                // Don't toggle visibility if clicking the info button
                if (e.target.closest('.legend-info-btn')) return;
                if (!chart) return;

                var meta = chart.getDatasetMeta(i);
                if (i === activeDatasetIndex) {
                    // Clicking the active item toggles its visibility
                    meta.hidden = meta.hidden === null ? !ds.hidden : null;
                    item.style.opacity = meta.hidden ? '0.4' : '1';
                    if (meta.hidden) {
                        // Active was hidden, fall back
                        activeDatasetIndex = getFirstVisibleIndex();
                    }
                } else {
                    // Make this the active dataset
                    activeDatasetIndex = i;
                    // Make sure it's visible
                    if (meta.hidden) {
                        meta.hidden = null;
                        item.style.opacity = '1';
                    }
                }

                applyActiveDatasetStyles();
                chart.update('none');
                updateLegendActiveState();

                // Sync tile states
                var activeLabel = chart.data.datasets[activeDatasetIndex].label;
                var activePriceType = LABEL_TO_PRICE_TYPE[activeLabel];
                if (activePriceType) {
                    updateTileStates(activePriceType);
                }
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
        var canvas = document.getElementById('set-price-history-canvas');
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
        var canvas = document.getElementById('set-price-history-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var colors = getColors();
        var containerData = readContainerData();

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
                borderWidth: 3,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.basePrice,
            });
        }
        if (hasTotalPrice && pointsDiffer(totalPricePoints, basePricePoints)) {
            datasets.push({
                label: 'All Cards',
                data: totalPricePoints,
                borderColor: colors.totalPrice + '80',
                backgroundColor: colors.totalPrice + '20',
                borderWidth: 1.5,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.totalPrice,
            });
        }
        if (hasBasePriceAll && pointsDiffer(basePriceAllPoints, basePricePoints)) {
            datasets.push({
                label: 'Base + Foils',
                data: basePriceAllPoints,
                borderColor: colors.basePriceAll + '80',
                backgroundColor: colors.basePriceAll + '20',
                borderWidth: 1.5,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.basePriceAll,
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
                borderColor: colors.totalPriceAll + '80',
                backgroundColor: colors.totalPriceAll + '20',
                borderWidth: 1.5,
                pointRadius: pointRadius,
                tension: 0.3,
                _fullColor: colors.totalPriceAll,
            });
        }

        // Determine active dataset index based on current tile selection
        var activeTile = document.querySelector('.price-tile-active[data-price-type]');
        var activePriceType = activeTile
            ? activeTile.getAttribute('data-price-type')
            : 'base-normal';
        var activeLabel = PRICE_TYPE_TO_LABEL[activePriceType] || 'Base Set';
        activeDatasetIndex = 0;
        datasets.forEach(function (ds, i) {
            if (ds.label === activeLabel) activeDatasetIndex = i;
        });

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

        buildHtmlLegend(datasets, containerData);

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
                                var ds = context.dataset;
                                return ds._fullColor;
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

    function getCanvasWrapper() {
        return document.getElementById('set-price-history-canvas-wrapper');
    }

    function showChartOverlay(msg) {
        var wrapper = getCanvasWrapper();
        if (!wrapper) return;
        hideChartOverlay();
        var overlay = document.createElement('div');
        overlay.id = 'set-price-history-overlay';
        overlay.className =
            'absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-midnight-900/80 z-10';
        overlay.innerHTML =
            '<p class="text-gray-500 dark:text-gray-400 text-sm">' + msg + '</p>';
        wrapper.appendChild(overlay);
    }

    function hideChartOverlay() {
        var existing = document.getElementById('set-price-history-overlay');
        if (existing) existing.remove();
    }

    function fetchAndRender(setCode, days, isRetry) {
        var url = '/sets/' + setCode + '/price-history';
        if (days) {
            url += '?days=' + days;
        }

        var container = document.getElementById('set-price-history-chart');
        if (!container) return;

        hideChartOverlay();

        fetch(url)
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                if (!data.prices || data.prices.length === 0) {
                    if (!isRetry && days) {
                        // Retry with all-time data before showing empty state
                        fetchAndRender(setCode, undefined, true);
                        return;
                    }
                    showChartOverlay('No price history available.');
                    return;
                }
                renderChart(data);
            })
            .catch(function () {
                showChartOverlay('Failed to load price history.');
            });
    }

    var initialized = false;

    function initSetPriceHistory() {
        if (initialized) return;
        var container = document.getElementById('set-price-history-chart');
        if (!container) return;

        var setCode = container.getAttribute('data-set-code');
        if (!setCode) return;

        initialized = true;
        fetchAndRender(setCode, '7');

        var buttons = document.querySelectorAll('.set-price-history-range');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var days = btn.getAttribute('data-days');
                buttons.forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                hideTooltip();
                fetchAndRender(setCode, days || undefined);
            });
        });
    }

    window.initSetPriceHistory = initSetPriceHistory;
})();
