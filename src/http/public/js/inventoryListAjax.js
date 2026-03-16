document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('inventory-list-ajax');
    if (!container) return;

    var state = parseStateFromUrl();

    // Override filter.js by cloning the filter form (removes old listeners)
    var filterForm = document.getElementById('filter-form');
    if (filterForm) {
        var newForm = filterForm.cloneNode(true);
        filterForm.parentNode.replaceChild(newForm, filterForm);
        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
        });

        var filterInput = newForm.querySelector('#filter');
        if (filterInput) {
            var debounceTimeout;
            filterInput.addEventListener('input', function () {
                clearTimeout(debounceTimeout);
                var clearBtn = newForm.querySelector('#clear-filter-btn');
                if (clearBtn) clearBtn.style.display = this.value ? 'inline' : 'none';
                debounceTimeout = setTimeout(function () {
                    state.filter = filterInput.value;
                    state.page = 1;
                    fetchAndRender('replaceState');
                }, 300);
            });

            var clearBtn = newForm.querySelector('#clear-filter-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {
                    filterInput.value = '';
                    clearBtn.style.display = 'none';
                    state.filter = '';
                    state.page = 1;
                    fetchAndRender('replaceState');
                });
            }
        }
    }

    // Remove inline onchange from SSR limit select to prevent full-page reload
    var ssrLimitSelect = document.querySelector('.pagination-container select#limit');
    if (ssrLimitSelect) {
        ssrLimitSelect.removeAttribute('onchange');
    }

    // Intercept sort clicks via event delegation on thead
    document.addEventListener('click', function (e) {
        var link = e.target.closest('#inventory-list-ajax thead a.sort-btn');
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
        if (!link || !container.parentElement.contains(link)) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
        state.page = parseInt(params.get('page'), 10) || 1;
        if (params.has('limit')) state.limit = parseInt(params.get('limit'), 10) || 25;
        fetchAndRender('pushState');
    });

    // Intercept limit select change
    document.addEventListener('change', function (e) {
        if (e.target.id !== 'limit') return;
        var paginationParent = e.target.closest('.pagination-container');
        if (!paginationParent || !container.parentElement.contains(paginationParent)) return;
        e.preventDefault();
        state.limit = parseInt(e.target.value, 10) || 25;
        state.page = 1;
        fetchAndRender('pushState');
    });

    // Intercept limit form submit
    document.addEventListener('submit', function (e) {
        var paginationParent = e.target.closest('.pagination-container');
        if (paginationParent && container.parentElement.contains(paginationParent)) {
            e.preventDefault();
        }
    });

    // Intercept baseOnly toggle clicks
    document.addEventListener('click', function (e) {
        var link = e.target.closest('#inventory-list-ajax a[href*="baseOnly"]');
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
        var fi = document.querySelector('#filter');
        if (fi) fi.value = state.filter;
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
        return '/api/v1/inventory?' + params.toString();
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
        return '/inventory' + (qs ? '?' + qs : '');
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
                    showError(resultsEl, json.error || 'Failed to load inventory');
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
                console.error('Error fetching inventory:', err);
                showError(resultsEl, 'Failed to load inventory. Please try again.');
                if (typeof window.showToast === 'function')
                    window.showToast('Failed to load inventory', 'error');
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
                html += renderSortableHeader(h);
            } else {
                var classAttr = 'table-header' + (h.classes ? ' ' + h.classes : '');
                html += '<th class="' + classAttr + '">' + escapeHtml(h.label) + '</th>';
            }
        }
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
        var classAttr = 'table-header' + (header.classes ? ' ' + header.classes : '');

        return (
            '<th class="' +
            classAttr +
            '">' +
            '<a href="?' +
            params.toString() +
            '" class="sort-btn">' +
            escapeHtml(header.label) +
            ' <span class="sort-icon">' +
            arrow +
            '</span>' +
            '</a></th>'
        );
    }

    function renderInventoryRow(item) {
        var html = '<tr class="table-row">';

        // Owned column - cardsOwned form
        html += '<td class="table-cell">' + renderCardsOwnedForm(item) + '</td>';

        // Card name with hover preview and tags
        var imgSrc = item.imgSrc || '';
        var url = item.url || '#';
        html +=
            '<td class="table-cell" data-id="' +
            escapeHtml(item.cardId) +
            '" data-img-src="' +
            escapeHtml(imgSrc) +
            '">';
        html +=
            '<a href="' +
            escapeHtml(url) +
            '" class="card-name-link">' +
            escapeHtml(item.cardName || '') +
            '</a>';
        if (item.tags && item.tags.length > 0) {
            for (var t = 0; t < item.tags.length; t++) {
                html += '<span class="tag">' + escapeHtml(item.tags[t]) + '</span>';
            }
        }
        html += '<a href="' + escapeHtml(url) + '" class="card-img-link">';
        html +=
            '<img src="' +
            escapeHtml(imgSrc) +
            '" alt="' +
            escapeHtml(item.cardName || '') +
            '" class="card-img-preview" />';
        html += '</a></td>';

        // Set column
        var keyruneCode = item.keyruneCode || item.setCode || '';
        var rarity = item.rarity || '';
        html += '<td class="table-cell">';
        if (item.setCode) {
            html +=
                '<a href="/sets/' +
                escapeHtml(item.setCode) +
                '" class="table-link">' +
                '<i class="ss ss-' +
                escapeHtml(keyruneCode) +
                ' ss-' +
                escapeHtml(rarity) +
                ' ss-fw"></i> ' +
                escapeHtml(item.setCode.toUpperCase()) +
                '</a>';
        }
        html += '</td>';

        // Price column
        html += '<td class="table-cell">';
        var priceValue = item.isFoil ? item.priceFoil : item.priceNormal;
        var priceClass = item.isFoil ? 'price-foil' : 'price-normal';
        html += '<span class="' + priceClass + '">' + toDollar(priceValue) + '</span>';
        html += '</td>';

        // Delete column
        html += '<td class="table-cell delete-inventory-entry xs-hide">';
        html +=
            '<form class="delete-inventory-form" data-item-id="' + escapeHtml(item.cardId) + '">';
        html += '<input type="hidden" name="card-id" value="' + escapeHtml(item.cardId) + '" />';
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
            escapeHtml(item.cardId) +
            '" data-foil="' +
            item.isFoil +
            '">';
        html += '<input type="hidden" name="cardId" value="' + escapeHtml(item.cardId) + '" />';
        html +=
            '<button type="button" class="increment-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-purple-400 active:text-purple-600">+</button>';
        html +=
            '<input type="number" name="quantity-owned" class="quantity-owned" value="' +
            item.quantity +
            '" data-id="' +
            escapeHtml(item.cardId) +
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

        var page = meta.page;
        var totalPages = meta.totalPages;

        if (!paginationEl) {
            paginationEl = document.createElement('section');
            paginationEl.className = 'pagination-container';
            container.parentNode.insertBefore(paginationEl, container.nextSibling);
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
        html += '<form method="get" action="/inventory" class="flex items-center gap-2 mb-4 mt-2">';
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
        if (state.limit !== 25) params.set('limit', state.limit);
        if (state.baseOnly) {
            params.set('baseOnly', 'false');
            toggle.setAttribute('href', '/inventory?' + params.toString());
            toggle.textContent = 'Show All Cards';
            toggle.className = toggle.className
                .replace('btn-secondary', 'btn-primary')
                .replace('btn-primary', 'btn-primary');
        } else {
            toggle.setAttribute('href', '/inventory?' + params.toString());
            toggle.textContent = 'Base Set Only';
            toggle.className = toggle.className.replace('btn-primary', 'btn-secondary');
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
        return '/inventory?' + params.toString();
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
