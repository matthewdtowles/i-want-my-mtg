document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-card-list-ajax');
    if (!container) return;

    var setCode = container.dataset.setCode;
    var authenticated = container.dataset.authenticated === 'true';

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

    // Intercept sort clicks via event delegation on thead
    document.addEventListener('click', function (e) {
        var link = e.target.closest('#set-card-list-ajax thead a.sort-btn');
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
        var link = e.target.closest(
            '#set-card-list-ajax .pagination-container a, #set-card-list-ajax ~ .pagination-container a'
        );
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
        if (!e.target.closest('#set-card-list-ajax, #set-card-list-ajax ~ .pagination-container'))
            return;
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
        var link = e.target.closest('#set-card-list-ajax a[href*="baseOnly"]');
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
        // Sync filter input
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
        if (resultsEl) {
            resultsEl.innerHTML =
                '<div class="text-center py-16"><i class="fas fa-spinner fa-spin text-4xl text-teal-500"></i></div>';
        }

        fetch(buildApiUrl())
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                if (!json.success) {
                    showError(resultsEl, json.error || 'Failed to load cards');
                    return;
                }
                renderTable(json.data, json.meta);
                renderPagination(json.meta);
                updateBaseOnlyToggle();
                if (historyMethod) {
                    window.history[historyMethod]({}, '', buildBrowserUrl());
                }
            })
            .catch(function (err) {
                console.error('Error fetching cards:', err);
                showError(resultsEl, 'Failed to load cards. Please try again.');
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
                escapeHtml(setCode) +
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
        var subtitleHtml = header.subtitle
            ? ' <span class="header-subtitle">(' + escapeHtml(header.subtitle) + '\u25B3)</span>'
            : '';
        var classAttr = 'table-header' + (header.classes ? ' ' + header.classes : '');

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

    function renderCardRow(card) {
        var url = '/card/' + encodeURIComponent(setCode) + '/' + encodeURIComponent(card.number);
        var imgSrc = 'https://cards.scryfall.io/normal/front/' + card.imgSrc;

        var html = '<tr class="table-row">';

        // Owned column
        html += '<td class="table-cell">&mdash;</td>';

        // Card No.
        html += '<td class="table-cell">' + escapeHtml(card.number) + '</td>';

        // Card name with hover preview
        html += '<td data-img-src="' + escapeHtml(card.imgSrc) + '" class="table-cell">';
        html += '<a href="' + url + '" class="card-name-link">' + escapeHtml(card.name) + '</a>';
        html += '<a href="' + url + '" class="card-img-link">';
        html +=
            '<img src="' +
            escapeHtml(imgSrc) +
            '" alt="' +
            escapeHtml(card.name) +
            '" class="card-img-preview" />';
        html += '</a></td>';

        // Mana Cost (xs-hide)
        html += '<td class="table-cell xs-hide">' + renderManaCost(card.manaCost) + '</td>';

        // Rarity (xs-hide)
        html += '<td class="table-cell xs-hide">' + escapeHtml(card.rarity || '') + '</td>';

        // Normal price (xs-hide)
        html += '<td class="table-cell xs-hide">';
        if (card.hasNonFoil && card.prices && card.prices.normal != null) {
            html += '<span class="price-normal">' + toDollar(card.prices.normal) + '</span>';
            if (card.prices.normalChangeWeekly != null && card.prices.normalChangeWeekly !== 0) {
                html += ' ' + renderPriceChange(card.prices.normalChangeWeekly);
            }
        }
        html += '</td>';

        // Foil price (xs-hide)
        html += '<td class="table-cell xs-hide">';
        if (card.hasFoil && card.prices && card.prices.foil != null) {
            html += '<span class="price-foil">' + toDollar(card.prices.foil) + '</span>';
            if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                html += ' ' + renderPriceChange(card.prices.foilChangeWeekly);
            }
        }
        html += '</td>';

        // Combined price (xs-show, mobile)
        html += '<td class="table-cell xs-show">';
        if (card.hasFoil && card.prices && card.prices.foil != null) {
            html += '<span class="price-foil">' + toDollar(card.prices.foil) + '</span>';
            if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                html += ' ' + renderPriceChange(card.prices.foilChangeWeekly);
            }
        }
        if (card.hasNonFoil && card.prices && card.prices.normal != null) {
            html += '<span class="price-normal">' + toDollar(card.prices.normal) + '</span>';
        }
        if (
            card.prices &&
            card.prices.normalChangeWeekly != null &&
            card.prices.normalChangeWeekly !== 0
        ) {
            html += ' ' + renderPriceChange(card.prices.normalChangeWeekly);
        }
        html += '</td>';

        html += '</tr>';
        return html;
    }

    function renderManaCost(manaCost) {
        if (!manaCost) return '';
        // Parse mana symbols like {W}, {U}, {B}, {R}, {G}, {1}, {2}, etc.
        return manaCost.replace(/\{([^}]+)\}/g, function (match, symbol) {
            var cssClass = 'ms ms-' + symbol.toLowerCase().replace('/', '');
            return '<i class="' + cssClass + ' ms-cost"></i>';
        });
    }

    function renderPriceChange(change) {
        if (change == null || change === 0) return '';
        var abs = Math.abs(Math.round(change * 100) / 100);
        var formatted = toDollar(abs);
        if (change > 0) {
            return '<span class="price-change price-change-positive">+' + formatted + '</span>';
        } else {
            return '<span class="price-change price-change-negative">-' + formatted + '</span>';
        }
    }

    function renderPagination(meta) {
        // Find the pagination container that follows the set-card-list-ajax container
        var paginationEl =
            container.parentElement.querySelector('.pagination-container') ||
            document.querySelector('#set-card-list-ajax ~ .pagination-container');

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
        html +=
            '<form method="get" action="/sets/' +
            escapeHtml(setCode) +
            '" class="flex items-center gap-2 mb-4 mt-2">';
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
        // Update the toggle URL and appearance
        var params = new URLSearchParams();
        if (state.filter) params.set('filter', state.filter);
        if (state.limit !== 25) params.set('limit', state.limit);
        if (state.baseOnly) {
            params.set('baseOnly', 'false');
            toggle.setAttribute('href', '/sets/' + setCode + '?' + params.toString());
            toggle.textContent = 'Show All Cards';
            toggle.className = toggle.className
                .replace('btn-secondary', 'btn-primary')
                .replace('btn-primary', 'btn-primary');
        } else {
            toggle.setAttribute('href', '/sets/' + setCode + '?' + params.toString());
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
        return '/sets/' + encodeURIComponent(setCode) + '?' + params.toString();
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
