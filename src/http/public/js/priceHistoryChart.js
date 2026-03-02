(function () {
    var chart = null;
    var activeRange = 'all';
    var pinnedTooltip = null;
    var activeDatasetIndex = 0;

    var PRICE_TYPE_TO_LABEL = {
        normal: 'Normal',
        foil: 'Foil',
    };

    var LABEL_TO_PRICE_TYPE = {
        Normal: 'normal',
        Foil: 'foil',
    };

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

    function updateTileStates(activePriceType) {
        var tiles = document.querySelectorAll('.price-info [data-price-type]');
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

    function setActiveCardPriceType(priceTypeOrIndex) {
        if (!chart) return;

        var targetIndex = -1;

        if (typeof priceTypeOrIndex === 'number') {
            targetIndex = priceTypeOrIndex;
        } else {
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
            var legendEl = document.getElementById('card-price-legend');
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
    window.setActiveCardPriceType = setActiveCardPriceType;

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

    function getOrCreateTooltipEl(canvas) {
        var container = canvas.parentElement;
        var el = container.querySelector('.chart-tooltip');
        if (!el) {
            el = document.createElement('div');
            el.className = 'chart-tooltip';
            el.style.opacity = '0';
            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'chart-tooltip-close';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.innerHTML = '&times;';
            el.appendChild(closeBtn);
            container.appendChild(el);
        }
        return el;
    }

    function externalTooltipHandler(context) {
        var tooltip = context.tooltip;
        var canvas = context.chart.canvas;
        var tooltipEl = getOrCreateTooltipEl(canvas);

        if (tooltip.opacity === 0 && !pinnedTooltip) {
            tooltipEl.style.opacity = '0';
            return;
        }

        // Build content
        if (tooltip.body) {
            // Keep close button, clear the rest
            var closeBtn = tooltipEl.querySelector('.chart-tooltip-close');
            tooltipEl.innerHTML = '';
            tooltipEl.appendChild(closeBtn);

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

        tooltipEl.classList.toggle('pinned', !!pinnedTooltip);
        tooltipEl.style.opacity = '1';

        // Position — clamp so tooltip stays within the container
        var containerRect = canvas.parentElement.getBoundingClientRect();
        var canvasRect = canvas.getBoundingClientRect();
        var offsetX = canvasRect.left - containerRect.left;
        var offsetY = canvasRect.top - containerRect.top;
        var caretLeft = offsetX + tooltip.caretX;
        var tooltipWidth = tooltipEl.offsetWidth;
        var containerWidth = canvas.parentElement.offsetWidth;

        // Default: centered above the point
        var left = caretLeft;
        var translateX = '-50%';

        // If tooltip would overflow the right edge, shift left
        if (caretLeft + tooltipWidth / 2 > containerWidth) {
            left = containerWidth - tooltipWidth / 2;
            translateX = '-50%';
        }
        // If tooltip would overflow the left edge, shift right
        if (caretLeft - tooltipWidth / 2 < 0) {
            left = tooltipWidth / 2;
            translateX = '-50%';
        }

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = offsetY + tooltip.caretY + 'px';
        tooltipEl.style.transform = 'translate(' + translateX + ', -110%)';
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

        // Determine active dataset index based on current tile selection
        var activeTile = document.querySelector('.price-info .price-tile-active[data-price-type]');
        var activePriceType = activeTile ? activeTile.getAttribute('data-price-type') : 'normal';
        var activeLabel = PRICE_TYPE_TO_LABEL[activePriceType] || 'Normal';
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

        buildHtmlLegend(datasets);

        if (chart) {
            chart.destroy();
        }

        pinnedTooltip = null;

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
                onClick: function (evt) {
                    var elements = chart.getElementsAtEventForMode(
                        evt,
                        'nearest',
                        { axis: 'x', intersect: false },
                        false
                    );
                    if (elements.length > 0) {
                        var el = elements[0];
                        if (
                            pinnedTooltip &&
                            pinnedTooltip.datasetIndex === el.datasetIndex &&
                            pinnedTooltip.index === el.index
                        ) {
                            pinnedTooltip = null;
                            canvas.classList.remove('chart-tooltip-pinned');
                            chart.setActiveElements([]);
                            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                            chart.update('none');
                        } else {
                            pinnedTooltip = {
                                datasetIndex: el.datasetIndex,
                                index: el.index,
                            };
                            canvas.classList.add('chart-tooltip-pinned');
                            // Immediately show close button
                            var tip = canvas.parentElement.querySelector('.chart-tooltip');
                            if (tip) tip.classList.add('pinned');
                            var activeEls = chart.data.datasets.map(function (ds, i) {
                                return { datasetIndex: i, index: el.index };
                            });
                            chart.setActiveElements(activeEls);
                            chart.tooltip.setActiveElements(activeEls, {
                                x: el.element.x,
                                y: el.element.y,
                            });
                            chart.update('none');
                        }
                    } else {
                        if (pinnedTooltip) {
                            pinnedTooltip = null;
                            canvas.classList.remove('chart-tooltip-pinned');
                            chart.setActiveElements([]);
                            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                            chart.update('none');
                        }
                    }
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

        // Wire up close button on tooltip
        var tooltipEl = getOrCreateTooltipEl(canvas);
        tooltipEl.querySelector('.chart-tooltip-close').addEventListener('click', function (e) {
            e.stopPropagation();
            pinnedTooltip = null;
            canvas.classList.remove('chart-tooltip-pinned');
            tooltipEl.style.opacity = '0';
            tooltipEl.classList.remove('pinned');
            chart.setActiveElements([]);
            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
            chart.update('none');
        });

        // Keep tooltip showing when mouse leaves canvas while pinned
        canvas.addEventListener('mouseleave', function () {
            if (pinnedTooltip && chart) {
                var activeEls = chart.data.datasets.map(function (ds, i) {
                    return { datasetIndex: i, index: pinnedTooltip.index };
                });
                requestAnimationFrame(function () {
                    if (pinnedTooltip && chart) {
                        chart.setActiveElements(activeEls);
                        chart.tooltip.setActiveElements(activeEls, {
                            x: chart.getDatasetMeta(pinnedTooltip.datasetIndex).data[
                                pinnedTooltip.index
                            ].x,
                            y: chart.getDatasetMeta(pinnedTooltip.datasetIndex).data[
                                pinnedTooltip.index
                            ].y,
                        });
                        chart.update('none');
                    }
                });
            }
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
                pinnedTooltip = null;
                var canvas = document.getElementById('price-history-canvas');
                if (canvas) canvas.classList.remove('chart-tooltip-pinned');
                fetchAndRender(cardId, days || undefined);
            });
        });
    }

    // Close pinned tooltip when clicking outside chart
    document.addEventListener('click', function (e) {
        if (!pinnedTooltip || !chart) return;
        var canvas = document.getElementById('price-history-canvas');
        if (!canvas) return;
        var tooltipEl = canvas.parentElement.querySelector('.chart-tooltip');
        if (canvas.contains(e.target) || (tooltipEl && tooltipEl.contains(e.target))) return;
        pinnedTooltip = null;
        canvas.classList.remove('chart-tooltip-pinned');
        if (tooltipEl) {
            tooltipEl.style.opacity = '0';
            tooltipEl.classList.remove('pinned');
        }
        chart.setActiveElements([]);
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        chart.update('none');
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPriceHistory);
    } else {
        initPriceHistory();
    }
})();
