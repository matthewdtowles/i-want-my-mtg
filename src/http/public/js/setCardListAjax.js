document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-card-list-ajax');
    if (!container) return;

    var setCode = container.dataset.setCode;
    var authenticated = container.dataset.authenticated === 'true';
    var state = AjaxUtils.parseStateFromUrl();

    AjaxUtils.setupFilterInterceptor({ state: state, fetchFn: fetchAndRender });

    AjaxUtils.setupSortInterceptor({
        selector: '#set-card-list-ajax thead a.sort-btn',
        state: state,
        fetchFn: fetchAndRender,
    });

    AjaxUtils.setupPaginationInterceptors({
        container: container,
        state: state,
        fetchFn: fetchAndRender,
        scopeToContainer: true,
    });

    AjaxUtils.setupBaseOnlyInterceptor({
        selector: '#set-card-list-ajax a[href*="baseOnly"]',
        state: state,
        fetchFn: fetchAndRender,
    });

    window.addEventListener('popstate', function () {
        AjaxUtils.syncStateFromUrl(state);
        var fi = document.querySelector('#filter');
        if (fi) fi.value = state.filter;
        fetchAndRender(null);
    });

    function buildApiUrl() {
        var params = new URLSearchParams();
        params.set('page', state.page);
        params.set('limit', state.limit);
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', state.ascend);
        }
        if (state.filter) params.set('filter', state.filter);
        if (!state.baseOnly) params.set('baseOnly', 'false');
        return '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards?' + params.toString();
    }

    function buildBrowserUrl() {
        var params = new URLSearchParams();
        if (state.page > 1) params.set('page', state.page);
        if (state.limit !== 25) params.set('limit', state.limit);
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', String(state.ascend));
        }
        if (state.filter) params.set('filter', state.filter);
        if (!state.baseOnly) params.set('baseOnly', 'false');
        var qs = params.toString();
        return '/sets/' + encodeURIComponent(setCode) + (qs ? '?' + qs : '');
    }

    function fetchAndRender(historyMethod) {
        var resultsEl = document.getElementById('filter-results');
        AjaxUtils.showSpinner(resultsEl);

        fetch(buildApiUrl())
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                if (!json.success) {
                    AjaxUtils.showError(resultsEl, json.error || 'Failed to load cards');
                    AjaxUtils.clearMinHeight(resultsEl);
                    return;
                }
                renderTable(json.data, json.meta);
                renderPagination(json.meta);
                AjaxUtils.updateBaseOnlyToggle({
                    container: container,
                    state: state,
                    basePath: '/sets/' + setCode,
                });
                if (historyMethod) {
                    window.history[historyMethod]({}, '', buildBrowserUrl());
                }
                if (authenticated && json.data && json.data.length > 0) {
                    fetchAndRenderInventory(json.data, function () {
                        AjaxUtils.clearMinHeight(resultsEl);
                    });
                } else {
                    AjaxUtils.clearMinHeight(resultsEl);
                }
            })
            .catch(function (err) {
                console.error('Error fetching cards:', err);
                AjaxUtils.showError(resultsEl, 'Failed to load cards. Please try again.');
                AjaxUtils.clearMinHeight(resultsEl);
            });
    }

    function renderTable(cards, meta) {
        var resultsEl = document.getElementById('filter-results');
        if (!resultsEl) return;

        if (!cards || cards.length === 0) {
            resultsEl.innerHTML =
                '<div class="text-center py-16">' +
                '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
                '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">No cards match your search</p>' +
                '<p class="text-gray-400 dark:text-gray-500 mt-2">Try a different search term or clear your filter.</p>' +
                '<a href="/sets/' +
                AjaxUtils.escapeHtml(setCode) +
                '" class="btn btn-secondary mt-6 inline-block">Clear Filter</a>' +
                '</div>';
            return;
        }

        var html = '<div class="table-wrapper"><table class="table-container">';
        html += '<thead>' + renderTableHeaders() + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < cards.length; i++) {
            html += renderCardRow(cards[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderTableHeaders() {
        var headers = [
            { key: '', label: 'Owned' },
            { key: 'card.number', label: 'Card No.' },
            { key: 'card.name', label: 'Card' },
            { key: 'card.manaCost', label: 'Mana Cost', classes: 'xs-hide' },
            { key: 'card.rarity', label: 'Rarity', classes: 'xs-hide' },
            { key: 'price.normal', label: 'Normal', subtitle: '7d', classes: 'xs-hide' },
            { key: 'price.foil', label: 'Foil', subtitle: '7d', classes: 'xs-hide' },
            { key: '', label: 'Price', classes: 'xs-show' },
        ];

        var html = '<tr class="table-header-row">';
        for (var i = 0; i < headers.length; i++) {
            var h = headers[i];
            if (h.key) {
                html += AjaxUtils.renderSortableHeader(h, state);
            } else {
                html += AjaxUtils.renderStaticHeader(h);
            }
        }
        html += '</tr>';
        return html;
    }

    function renderCardRow(card) {
        var url = '/card/' + encodeURIComponent(setCode) + '/' + encodeURIComponent(card.number);
        var imgSrc = 'https://cards.scryfall.io/normal/front/' + card.imgSrc;

        var html = '<tr class="table-row">';

        // Owned column — placeholder, replaced by fetchAndRenderInventory if authenticated
        html +=
            '<td class="table-cell owned-cell" data-card-id="' +
            AjaxUtils.escapeHtml(card.id) +
            '"' +
            ' data-has-foil="' +
            !!card.hasFoil +
            '"' +
            ' data-has-non-foil="' +
            !!card.hasNonFoil +
            '">&mdash;</td>';

        // Card No.
        html += '<td class="table-cell">' + AjaxUtils.escapeHtml(card.number) + '</td>';

        // Card name with hover preview
        html += '<td data-img-src="' + AjaxUtils.escapeHtml(card.imgSrc) + '" class="table-cell">';
        html +=
            '<a href="' +
            url +
            '" class="card-name-link">' +
            AjaxUtils.escapeHtml(card.name) +
            '</a>';
        html += '<a href="' + url + '" class="card-img-link">';
        html +=
            '<img src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '" alt="' +
            AjaxUtils.escapeHtml(card.name) +
            '" class="card-img-preview" />';
        html += '</a></td>';

        // Mana Cost (xs-hide)
        html += '<td class="table-cell xs-hide">' + renderManaCost(card.manaCost) + '</td>';

        // Rarity (xs-hide)
        html +=
            '<td class="table-cell xs-hide">' + AjaxUtils.escapeHtml(card.rarity || '') + '</td>';

        // Normal price (xs-hide)
        html += '<td class="table-cell xs-hide">';
        if (card.hasNonFoil && card.prices && card.prices.normal != null) {
            html +=
                '<span class="price-normal">' + AjaxUtils.toDollar(card.prices.normal) + '</span>';
            if (card.prices.normalChangeWeekly != null && card.prices.normalChangeWeekly !== 0) {
                html += ' ' + AjaxUtils.renderPriceChange(card.prices.normalChangeWeekly);
            }
        }
        html += '</td>';

        // Foil price (xs-hide)
        html += '<td class="table-cell xs-hide">';
        if (card.hasFoil && card.prices && card.prices.foil != null) {
            html += '<span class="price-foil">' + AjaxUtils.toDollar(card.prices.foil) + '</span>';
            if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                html += ' ' + AjaxUtils.renderPriceChange(card.prices.foilChangeWeekly);
            }
        }
        html += '</td>';

        // Combined price (xs-show, mobile)
        html += '<td class="table-cell xs-show">';
        if (card.hasFoil && card.prices && card.prices.foil != null) {
            html += '<span class="price-foil">' + AjaxUtils.toDollar(card.prices.foil) + '</span>';
            if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                html += ' ' + AjaxUtils.renderPriceChange(card.prices.foilChangeWeekly);
            }
        }
        if (card.hasNonFoil && card.prices && card.prices.normal != null) {
            html +=
                '<span class="price-normal">' + AjaxUtils.toDollar(card.prices.normal) + '</span>';
        }
        if (
            card.prices &&
            card.prices.normalChangeWeekly != null &&
            card.prices.normalChangeWeekly !== 0
        ) {
            html += ' ' + AjaxUtils.renderPriceChange(card.prices.normalChangeWeekly);
        }
        html += '</td>';

        html += '</tr>';
        return html;
    }

    function renderManaCost(manaCost) {
        if (!manaCost) return '';
        return manaCost.replace(/\{([^}]+)\}/g, function (match, symbol) {
            var cssClass = 'ms ms-' + symbol.toLowerCase().replace('/', '');
            return '<i class="' + cssClass + ' ms-cost"></i>';
        });
    }

    function renderPagination(meta) {
        var paginationEl = container.parentElement.querySelector('.pagination-container');

        if (!meta || meta.totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        var html = AjaxUtils.renderPaginationHtml({
            page: meta.page,
            totalPages: meta.totalPages,
            limit: state.limit,
            hrefBuilder: paginationHref,
            formAction: '/sets/' + AjaxUtils.escapeHtml(setCode),
        });

        AjaxUtils.updatePaginationEl({
            paginationEl: paginationEl,
            parentEl: container.parentElement,
            insertAfterEl: container,
            html: html,
            scrollTargetEl: document.getElementById('filter-results'),
        });
    }

    function paginationHref(page) {
        var params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(state.limit));
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', String(state.ascend));
        }
        if (state.filter) params.set('filter', state.filter);
        if (!state.baseOnly) params.set('baseOnly', 'false');
        return '/sets/' + encodeURIComponent(setCode) + '?' + params.toString();
    }

    function fetchAndRenderInventory(cards, onComplete) {
        var cardIds = cards
            .map(function (c) {
                return c.id;
            })
            .filter(Boolean);
        if (cardIds.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        fetch('/api/v1/inventory/quantities?cardIds=' + cardIds.join(','))
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                if (!json.success || !json.data) return;
                var quantityMap = {};
                for (var i = 0; i < json.data.length; i++) {
                    quantityMap[json.data[i].cardId] = json.data[i];
                }
                var cells = document.querySelectorAll('#set-card-list-ajax .owned-cell');
                for (var j = 0; j < cells.length; j++) {
                    var cell = cells[j];
                    var cardId = cell.getAttribute('data-card-id');
                    var hasFoil = cell.getAttribute('data-has-foil') === 'true';
                    var hasNonFoil = cell.getAttribute('data-has-non-foil') === 'true';
                    var qty = quantityMap[cardId] || { foilQuantity: 0, normalQuantity: 0 };
                    cell.innerHTML = renderOwnedForms(cardId, qty, hasFoil, hasNonFoil);
                }
            })
            .catch(function (err) {
                console.error('Error fetching inventory quantities:', err);
            })
            .finally(function () {
                if (onComplete) onComplete();
            });
    }

    function renderOwnedForms(cardId, qty, hasFoil, hasNonFoil) {
        var html = '';
        if (hasNonFoil) {
            html += renderOwnedForm(cardId, qty.normalQuantity, false);
        }
        if (hasFoil) {
            html += renderOwnedForm(cardId, qty.foilQuantity, true);
        }
        return html;
    }

    function renderOwnedForm(cardId, quantity, isFoil) {
        var foilClass = isFoil ? 'foil' : 'normal';
        var html =
            '<form class="quantity-form quantity-form-' +
            foilClass +
            '"' +
            ' data-item-id="' +
            AjaxUtils.escapeHtml(cardId) +
            '" data-foil="' +
            isFoil +
            '">';
        html +=
            '<input type="hidden" name="cardId" value="' + AjaxUtils.escapeHtml(cardId) + '" />';
        html +=
            '<button type="button" class="increment-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-purple-400 active:text-purple-600">+</button>';
        html +=
            '<input type="number" name="quantity-owned" class="quantity-owned" value="' +
            quantity +
            '" data-id="' +
            AjaxUtils.escapeHtml(cardId) +
            '" />';
        html += '<input type="hidden" name="isFoil" value="' + isFoil + '" />';
        html +=
            '<button type="button" class="decrement-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-red-400 active:text-red-600">-</button>';
        html += '</form>';
        return html;
    }
});
