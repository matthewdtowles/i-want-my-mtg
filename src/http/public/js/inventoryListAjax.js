document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('inventory-list-ajax');
    if (!container) return;

    var state = AjaxUtils.parseStateFromUrl();

    AjaxUtils.setupFilterInterceptor({ state: state, fetchFn: fetchAndRender });

    AjaxUtils.setupSortInterceptor({
        selector: '#inventory-list-ajax thead a.sort-btn',
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
        selector: '#inventory-list-ajax a[href*="baseOnly"]',
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
        return '/api/v1/inventory?' + params.toString();
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
                    AjaxUtils.showError(resultsEl, json.error || 'Failed to load inventory');
                    AjaxUtils.clearMinHeight(resultsEl);
                    return;
                }
                renderTable(json.data, json.meta);
                renderPagination(json.meta);
                AjaxUtils.updateBaseOnlyToggle({
                    container: container,
                    state: state,
                    basePath: '/inventory',
                });
                if (historyMethod) {
                    window.history[historyMethod](
                        {},
                        '',
                        AjaxUtils.buildBrowserUrl('/inventory', state)
                    );
                }
                AjaxUtils.clearMinHeight(resultsEl);
            })
            .catch(function (err) {
                console.error('Error fetching inventory:', err);
                AjaxUtils.showError(resultsEl, 'Failed to load inventory. Please try again.');
                if (typeof window.showToast === 'function')
                    window.showToast('Failed to load inventory', 'error');
                AjaxUtils.clearMinHeight(resultsEl);
            });
    }

    function renderTable(items, meta) {
        var resultsEl = document.getElementById('filter-results');
        if (!resultsEl) return;

        if (!items || items.length === 0) {
            resultsEl.innerHTML =
                '<div class="text-center py-16">' +
                '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
                '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">No items match your current filters</p>' +
                '<p class="text-gray-400 dark:text-gray-500 mt-2">Try a different search term or adjust your filters.</p>' +
                '<a href="/inventory" class="btn btn-secondary mt-6 inline-block">Clear Filters</a>' +
                '</div>';
            return;
        }

        var html = '<div class="table-wrapper"><table class="table-container w-full">';
        html += '<thead>' + renderTableHeaders() + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < items.length; i++) {
            html += renderInventoryRow(items[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderTableHeaders() {
        var headers = [
            { key: 'inventory.quantity', label: 'Owned' },
            { key: 'card.name', label: 'Card' },
            { key: 'card.setCode', label: 'Set' },
            { key: 'prices.normal', label: 'Price' },
            { key: '', label: '', classes: 'xs-hide' },
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

    function renderInventoryRow(item) {
        var html = '<tr class="table-row">';

        // Owned column
        html += '<td class="table-cell">' + renderCardsOwnedForm(item) + '</td>';

        // Card name with hover preview and tags
        var imgSrc = item.imgSrc || '';
        var url = item.url || '#';
        html +=
            '<td class="table-cell" data-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" data-img-src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '">';
        html +=
            '<a href="' +
            AjaxUtils.escapeHtml(url) +
            '" class="card-name-link">' +
            AjaxUtils.escapeHtml(item.cardName || '') +
            '</a>';
        if (item.tags && item.tags.length > 0) {
            for (var t = 0; t < item.tags.length; t++) {
                html += '<span class="tag">' + AjaxUtils.escapeHtml(item.tags[t]) + '</span>';
            }
        }
        html += '<a href="' + AjaxUtils.escapeHtml(url) + '" class="card-img-link">';
        html +=
            '<img src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '" alt="' +
            AjaxUtils.escapeHtml(item.cardName || '') +
            '" class="card-img-preview" />';
        html += '</a></td>';

        // Set column
        var keyruneCode = item.keyruneCode || item.setCode || '';
        var rarity = item.rarity || '';
        html += '<td class="table-cell">';
        if (item.setCode) {
            html +=
                '<a href="/sets/' +
                AjaxUtils.escapeHtml(item.setCode) +
                '" class="table-link">' +
                '<i class="ss ss-' +
                AjaxUtils.escapeHtml(keyruneCode) +
                ' ss-' +
                AjaxUtils.escapeHtml(rarity) +
                ' ss-fw"></i> ' +
                AjaxUtils.escapeHtml(item.setCode.toUpperCase()) +
                '</a>';
        }
        html += '</td>';

        // Price column
        html += '<td class="table-cell">';
        var priceValue = item.isFoil ? item.priceFoil : item.priceNormal;
        var priceClass = item.isFoil ? 'price-foil' : 'price-normal';
        html += '<span class="' + priceClass + '">' + AjaxUtils.toDollar(priceValue) + '</span>';
        html += '</td>';

        // Delete column
        html += '<td class="table-cell delete-inventory-entry xs-hide">';
        html +=
            '<form class="delete-inventory-form" data-item-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '">';
        html +=
            '<input type="hidden" name="card-id" value="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" />';
        html += '<input type="hidden" name="isFoil" value="' + item.isFoil + '" />';
        html += '<button type="button" class="delete-inventory-button">';
        html += '<i class="fas fa-trash-alt"></i>';
        html += '</button></form></td>';

        html += '</tr>';
        return html;
    }

    function renderCardsOwnedForm(item) {
        var foilClass = item.isFoil ? 'foil' : 'normal';
        var html =
            '<form class="quantity-form quantity-form-' +
            foilClass +
            '"' +
            ' data-item-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" data-foil="' +
            item.isFoil +
            '">';
        html +=
            '<input type="hidden" name="cardId" value="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" />';
        html +=
            '<button type="button" class="increment-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-purple-400 active:text-purple-600">+</button>';
        html +=
            '<input type="number" name="quantity-owned" class="quantity-owned" value="' +
            item.quantity +
            '" data-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" />';
        html += '<input type="hidden" name="isFoil" value="' + item.isFoil + '" />';
        html +=
            '<button type="button" class="decrement-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-red-400 active:text-red-600">-</button>';
        html += '</form>';
        return html;
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
            formAction: '/inventory',
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
        return '/inventory?' + params.toString();
    }
});
