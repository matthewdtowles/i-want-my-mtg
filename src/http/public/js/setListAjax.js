document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('set-list-ajax');
    if (!container) return;

    const authenticated = container.dataset.authenticated === 'true';

    // State
    let state = parseStateFromUrl();

    // Clone the filter form to remove old listeners from filter.js, then re-bind
    var filterForm = document.getElementById('filter-form');
    if (filterForm) {
        var newForm = filterForm.cloneNode(true);
        filterForm.parentNode.replaceChild(newForm, filterForm);
        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
        });
        // Re-bind filter input after form clone
        var reFilter = newForm.querySelector('#filter');
        if (reFilter) {
            var debounceTimeout2;
            reFilter.addEventListener('input', function () {
                clearTimeout(debounceTimeout2);
                var cb = newForm.querySelector('#clear-filter-btn');
                if (cb) cb.style.display = this.value ? 'inline' : 'none';
                debounceTimeout2 = setTimeout(function () {
                    state.filter = reFilter.value;
                    state.page = 1;
                    fetchAndRender('replaceState');
                }, 300);
            });
            var cb2 = newForm.querySelector('#clear-filter-btn');
            if (cb2) {
                cb2.addEventListener('click', function () {
                    reFilter.value = '';
                    cb2.style.display = 'none';
                    state.filter = '';
                    state.page = 1;
                    fetchAndRender('replaceState');
                });
            }
        }
    }

    // Intercept sort clicks via event delegation on thead
    document.addEventListener('click', function (e) {
        var link = e.target.closest('thead a.sort-btn');
        if (!link) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^\?/, ''));
        state.sort = params.get('sort') || '';
        state.ascend = params.get('ascend') === 'true';
        state.page = 1;
        fetchAndRender('pushState');
    });

    // Intercept pagination clicks
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.pagination-container a');
        if (!link) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
        state.page = parseInt(params.get('page'), 10) || 1;
        if (params.has('limit')) state.limit = parseInt(params.get('limit'), 10) || 25;
        fetchAndRender('pushState');
    });

    // Intercept limit select change
    document.addEventListener('change', function (e) {
        if (e.target.id !== 'limit') return;
        e.preventDefault();
        state.limit = parseInt(e.target.value, 10) || 25;
        state.page = 1;
        fetchAndRender('pushState');
    });

    // Intercept limit form submit
    document.addEventListener('submit', function (e) {
        if (e.target.closest('.pagination-container')) {
            e.preventDefault();
        }
    });

    // Intercept baseOnly toggle clicks
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href*="baseOnly"]');
        if (!link) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
        state.baseOnly = params.has('baseOnly') ? params.get('baseOnly') !== 'false' : true;
        state.page = 1;
        fetchAndRender('pushState');
    });

    // Back/forward button
    window.addEventListener('popstate', function () {
        state = parseStateFromUrl();
        fetchAndRender(null);
    });

    function parseStateFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return {
            page: parseInt(params.get('page'), 10) || 1,
            limit: parseInt(params.get('limit'), 10) || 25,
            sort: params.get('sort') || '',
            ascend: params.get('ascend') === 'true',
            filter: params.get('filter') || '',
            baseOnly: params.has('baseOnly') ? params.get('baseOnly') !== 'false' : true,
        };
    }

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

    function buildBrowserUrl() {
        var params = new URLSearchParams();
        if (state.page > 1) params.set('page', state.page);
        if (state.limit !== 25) params.set('limit', state.limit);
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', state.ascend);
        }
        if (state.filter) params.set('filter', state.filter);
        if (!state.baseOnly) params.set('baseOnly', 'false');
        var qs = params.toString();
        return '/sets' + (qs ? '?' + qs : '');
    }

    function fetchAndRender(historyMethod) {
        var resultsEl = document.getElementById('filter-results');
        if (resultsEl) {
            resultsEl.style.minHeight = resultsEl.offsetHeight + 'px';
            resultsEl.innerHTML =
                '<div class="text-center py-16"><i class="fas fa-spinner fa-spin text-4xl text-teal-500"></i></div>';
        }

        fetch(buildApiUrl())
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                if (!json.success) {
                    showError(resultsEl, json.error || 'Failed to load sets');
                    if (resultsEl) resultsEl.style.minHeight = '';
                    return;
                }
                renderTable(json.data, json.meta);
                renderPagination(json.meta);
                updateBaseOnlyToggle();
                if (historyMethod) {
                    window.history[historyMethod]({}, '', buildBrowserUrl());
                }
                if (resultsEl) resultsEl.style.minHeight = '';
            })
            .catch(function (err) {
                console.error('Error fetching sets:', err);
                showError(resultsEl, 'Failed to load sets. Please try again.');
                if (resultsEl) resultsEl.style.minHeight = '';
            });
    }

    function showError(el, message) {
        if (!el) return;
        el.innerHTML =
            '<div class="text-center py-16">' +
            '<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>' +
            '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">' +
            escapeHtml(message) +
            '</p>' +
            '</div>';
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
            html += renderSortableHeader(headers[i]);
        }
        if (authenticated) {
            html += '<th class="table-header">Owned Value</th>';
        }
        html += renderSortableHeader({
            key: 'set.releaseDate',
            label: 'Release Date',
            classes: 'xs-hide pr-2',
        });
        html += '</tr>';
        return html;
    }

    function renderSortableHeader(header) {
        var isActive = state.sort === header.key;
        var nextAscend = isActive ? !state.ascend : true;
        var params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', String(state.limit));
        params.set('sort', header.key);
        params.set('ascend', String(nextAscend));
        if (state.filter) params.set('filter', state.filter);
        if (!state.baseOnly) params.set('baseOnly', 'false');

        var arrow = isActive ? (state.ascend ? '&#9650;' : '&#9660;') : '';
        var subtitleHtml = header.subtitle
            ? ' <span class="header-subtitle">(' + escapeHtml(header.subtitle) + '\u25B3)</span>'
            : '';
        var classAttr =
            'table-header' +
            (header.classes ? ' ' + header.classes : '') +
            (header.key === 'set.name' ? ' pl-2' : '');

        return (
            '<th class="' +
            classAttr +
            '">' +
            '<a href="?' +
            params.toString() +
            '" class="sort-btn">' +
            escapeHtml(header.label) +
            subtitleHtml +
            ' <span class="sort-icon">' +
            arrow +
            '</span>' +
            '</a></th>'
        );
    }

    function renderSetRow(set) {
        var keyruneCode = escapeHtml(set.keyruneCode || set.code);
        var name = escapeHtml(set.name);
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());

        var tagsHtml = '';
        if (set.tags) {
            for (var t = 0; t < set.tags.length; t++) {
                tagsHtml += '<span class="tag">' + escapeHtml(set.tags[t]) + '</span>';
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
                    toDollar(set.ownedValue) +
                    '</span>';
                html +=
                    '<div class="mt-0.5">' +
                    renderCompletionBar(set.completionRate || 0) +
                    '</div>';
            }
            html += '</td>';
        }

        html += '<td class="table-cell xs-hide">' + escapeHtml(set.releaseDate || '') + '</td>';
        html += '</tr>';
        return html;
    }

    function formatPrice(prices) {
        if (!prices) return '-';
        var val = prices.basePrice;
        if (val == null || val <= 0) {
            val = prices.basePriceAll;
        }
        if (val == null || val <= 0) {
            val = prices.totalPrice;
        }
        if (val == null || val <= 0) {
            val = prices.totalPriceAll;
        }
        if (val == null || val <= 0) return '-';
        return toDollar(val);
    }

    function formatWeeklyChange(prices) {
        if (!prices) return '';
        var change = prices.basePriceChangeWeekly;
        if (change == null || change === 0) {
            change = prices.totalPriceChangeWeekly;
        }
        if (change == null || change === 0) return '';
        var abs = Math.abs(Math.round(change * 100) / 100);
        var formatted = toDollar(abs);
        if (change > 0) {
            return '<span class="price-change price-change-positive">+' + formatted + '</span>';
        } else {
            return '<span class="price-change price-change-negative">-' + formatted + '</span>';
        }
    }

    function renderCompletionBar(rate) {
        return (
            '<div class="completion-bar-container flex items-center relative">' +
            '<div class="completion-bar absolute top-0 left-0 h-full" style="width: ' +
            rate +
            '%;"></div>' +
            '<span class="w-full text-center z-10 font-bold relative">' +
            rate +
            '%</span>' +
            '</div>'
        );
    }

    function renderPagination(meta) {
        var paginationEl = document.querySelector('.pagination-container');
        if (!meta || meta.totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        var page = meta.page;
        var totalPages = meta.totalPages;

        if (!paginationEl) {
            paginationEl = document.createElement('section');
            paginationEl.className = 'pagination-container';
            var filterResults = document.getElementById('filter-results');
            if (filterResults && filterResults.parentNode) {
                filterResults.parentNode.insertBefore(paginationEl, filterResults.nextSibling);
            }
        }

        var html = '';

        if (page > 1) {
            html +=
                '<a href="' +
                paginationHref(page - 1) +
                '" class="pagination-btn pagination-btn-primary">&lt;</a>';
            html +=
                '<a href="' +
                paginationHref(1) +
                '" class="pagination-btn pagination-btn-tertiary">1</a>';
        }

        var skipBack = page - Math.floor(totalPages / 3);
        if (skipBack > 1 && skipBack < page) {
            html +=
                '<a href="' +
                paginationHref(skipBack) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                skipBack +
                '</a>';
            html += '<span class="text-gray-400 dark:text-gray-500">...</span>';
        }

        html +=
            '<span class="pagination-btn pagination-btn-current" aria-current="page">' +
            page +
            '</span>';

        var skipForward = page + Math.floor(totalPages / 3);
        if (skipForward < totalPages && skipForward > page) {
            html += '<span class="text-gray-400 dark:text-gray-500">...</span>';
            html +=
                '<a href="' +
                paginationHref(skipForward) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                skipForward +
                '</a>';
        }

        if (page < totalPages) {
            html +=
                '<a href="' +
                paginationHref(totalPages) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                totalPages +
                '</a>';
            html +=
                '<a href="' +
                paginationHref(page + 1) +
                '" class="pagination-btn pagination-btn-primary">&gt;</a>';
        }

        // Limit selector
        html += '<form method="get" action="/sets" class="flex items-center gap-2 mb-4 mt-2">';
        html +=
            '<select id="limit" name="limit" class="input-field w-20 text-center py-1 pl-0 pr-2 text-xs sm:text-sm bg-white dark:bg-midnight-800 border border-teal-300 dark:border-teal-600 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none text-gray-900 dark:text-gray-100">';
        [25, 50, 100].forEach(function (val) {
            html +=
                '<option value="' +
                val +
                '"' +
                (state.limit === val ? ' selected' : '') +
                '>' +
                val +
                '</option>';
        });
        html += '</select>';
        html +=
            '<label for="limit" class="text-sm font-medium text-teal-700 dark:text-teal-300">per page</label>';
        html += '</form>';

        paginationEl.innerHTML = html;
    }

    function updateBaseOnlyToggle() {
        var toggle = container.querySelector('a[href*="baseOnly"]');
        if (!toggle) return;
        var params = new URLSearchParams();
        if (state.filter) params.set('filter', state.filter);
        if (state.limit !== 25) params.set('limit', String(state.limit));
        if (state.baseOnly) {
            params.set('baseOnly', 'false');
            toggle.setAttribute('href', '/sets?' + params.toString());
            toggle.textContent = 'Show All';
            toggle.className = toggle.className.replace('btn-primary', 'btn-secondary');
        } else {
            params.set('baseOnly', 'true');
            toggle.setAttribute('href', '/sets?' + params.toString());
            toggle.textContent = 'Main Only';
            toggle.className = toggle.className.replace('btn-secondary', 'btn-primary');
        }
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

    function toDollar(amount) {
        if (amount == null || amount === 0) return '-';
        var rounded = Math.round(amount * 100) / 100;
        var str = rounded.toFixed(2);
        str = '$' + str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return str;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
