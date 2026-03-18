document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-list-ajax');
    if (!container) return;

    var authenticated = container.dataset.authenticated === 'true';
    var state = AjaxUtils.parseStateFromUrl();

    AjaxUtils.setupFilterInterceptor({ state: state, fetchFn: fetchAndRender });

    AjaxUtils.setupSortInterceptor({
        selector: '#set-list-ajax thead a.sort-btn',
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
        selector: '#set-list-ajax a[href*="baseOnly"]',
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
        return '/api/v1/sets?' + params.toString();
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
                    AjaxUtils.showError(resultsEl, json.error || 'Failed to load sets');
                    AjaxUtils.clearMinHeight(resultsEl);
                    return;
                }
                renderTable(json.data, json.meta);
                renderPagination(json.meta);
                AjaxUtils.updateBaseOnlyToggle({
                    container: container,
                    state: state,
                    basePath: '/sets',
                });
                if (historyMethod) {
                    window.history[historyMethod](
                        {},
                        '',
                        AjaxUtils.buildBrowserUrl('/sets', state)
                    );
                }
                AjaxUtils.clearMinHeight(resultsEl);
            })
            .catch(function (err) {
                console.error('Error fetching sets:', err);
                AjaxUtils.showError(resultsEl, 'Failed to load sets. Please try again.');
                AjaxUtils.clearMinHeight(resultsEl);
            });
    }

    function renderTable(sets, meta) {
        var resultsEl = document.getElementById('filter-results');
        if (!resultsEl) return;

        if (!sets || sets.length === 0) {
            resultsEl.innerHTML =
                '<div class="text-center py-16">' +
                '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
                '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">No sets match your search</p>' +
                '<p class="text-gray-400 dark:text-gray-500 mt-2">Try a different search term or clear your filter.</p>' +
                '<a href="/sets" class="btn btn-secondary mt-6 inline-block">Clear Filter</a>' +
                '</div>';
            return;
        }

        var html = '<div class="table-wrapper"><table class="min-w-full table-container">';
        html += '<thead>' + renderTableHeaders() + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < sets.length; i++) {
            html += renderSetRow(sets[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderTableHeaders() {
        var headers = [
            { key: 'set.name', label: 'Set' },
            { key: 'setPrice.basePrice', label: 'Set Value', subtitle: '7d' },
        ];

        var html = '<tr class="table-header-row">';
        for (var i = 0; i < headers.length; i++) {
            html += AjaxUtils.renderSortableHeader(headers[i], state);
        }
        if (authenticated) {
            html += AjaxUtils.renderStaticHeader({ label: 'Owned Value' });
        }
        html += AjaxUtils.renderSortableHeader(
            { key: 'set.releaseDate', label: 'Release Date', classes: 'xs-hide pr-2' },
            state
        );
        html += '</tr>';
        return html;
    }

    function renderSetRow(set) {
        var keyruneCode = AjaxUtils.escapeHtml(set.keyruneCode || set.code);
        var name = AjaxUtils.escapeHtml(set.name);
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());

        var tagsHtml = '';
        if (set.tags) {
            for (var t = 0; t < set.tags.length; t++) {
                tagsHtml += '<span class="tag">' + AjaxUtils.escapeHtml(set.tags[t]) + '</span>';
            }
        }

        var priceHtml = formatPrice(set.prices);
        var changeHtml = formatWeeklyChange(set.prices);

        var html = '<tr class="table-row">';
        html += '<td class="table-cell"><i class="ss ss-' + keyruneCode + ' ss-fw"></i> ';
        html += '<a href="' + url + '" class="table-link">' + name + '</a> ' + tagsHtml + '</td>';
        html += '<td class="table-cell">' + priceHtml + ' ' + changeHtml + '</td>';

        if (authenticated) {
            html += '<td class="table-cell">';
            if (set.ownedValue !== undefined && set.ownedValue !== null) {
                html +=
                    '<span class="text-sm font-medium text-gray-800 dark:text-gray-200">' +
                    AjaxUtils.toDollar(set.ownedValue) +
                    '</span>';
                html +=
                    '<div class="mt-0.5">' +
                    AjaxUtils.renderCompletionBar(set.completionRate || 0) +
                    '</div>';
            }
            html += '</td>';
        }

        html +=
            '<td class="table-cell xs-hide">' +
            AjaxUtils.escapeHtml(set.releaseDate || '') +
            '</td>';
        html += '</tr>';
        return html;
    }

    function formatPrice(prices) {
        if (!prices) return '-';
        var val = prices.basePrice;
        if (val == null || val <= 0) val = prices.basePriceAll;
        if (val == null || val <= 0) val = prices.totalPrice;
        if (val == null || val <= 0) val = prices.totalPriceAll;
        if (val == null || val <= 0) return '-';
        return AjaxUtils.toDollar(val);
    }

    function formatWeeklyChange(prices) {
        if (!prices) return '';
        var change = prices.basePriceChangeWeekly;
        if (change == null || change === 0) change = prices.totalPriceChangeWeekly;
        if (change == null || change === 0) return '';
        return AjaxUtils.renderPriceChange(change);
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
            formAction: '/sets',
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
        return '/sets?' + params.toString();
    }
});
