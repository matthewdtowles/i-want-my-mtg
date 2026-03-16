document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('search-ajax');
    if (!container) return;

    var state = parseStateFromUrl();

    // Intercept search form submit
    var searchForm = document.querySelector('form[action="/search"]');
    if (searchForm) {
        var newForm = searchForm.cloneNode(true);
        searchForm.parentNode.replaceChild(newForm, searchForm);
        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var input = newForm.querySelector('input[name="q"]');
            state.q = input ? input.value.trim() : '';
            state.page = 1;
            fetchBoth('replaceState');
        });
    }

    // Remove inline onchange from SSR limit select to prevent full-page reload
    var ssrLimitSelect = container.querySelector('.pagination-container select#limit');
    if (ssrLimitSelect) {
        ssrLimitSelect.removeAttribute('onchange');
    }

    // Intercept limit select change
    document.addEventListener('change', function (e) {
        if (e.target.id !== 'limit') return;
        var paginationParent = e.target.closest('.pagination-container');
        if (!paginationParent || !container.contains(paginationParent)) return;
        e.preventDefault();
        state.limit = parseInt(e.target.value, 10) || 25;
        state.page = 1;
        fetchBoth('pushState');
    });

    // Intercept limit form submit
    document.addEventListener('submit', function (e) {
        var paginationParent = e.target.closest('.pagination-container');
        if (paginationParent && container.contains(paginationParent)) {
            e.preventDefault();
        }
    });

    // Intercept pagination clicks
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.pagination-container a');
        if (!link || !container.contains(link)) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
        state.page = parseInt(params.get('page'), 10) || 1;
        if (params.has('limit')) state.limit = parseInt(params.get('limit'), 10) || 25;
        fetchBoth('pushState');
    });

    // Back/forward button
    window.addEventListener('popstate', function () {
        state = parseStateFromUrl();
        var input = document.querySelector('form input[name="q"]');
        if (input) input.value = state.q;
        if (state.q) {
            fetchBoth(null);
        } else {
            renderEmpty();
        }
    });

    function parseStateFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return {
            q: params.get('q') || '',
            page: parseInt(params.get('page'), 10) || 1,
            limit: parseInt(params.get('limit'), 10) || 25,
        };
    }

    function buildCardApiUrl() {
        var params = new URLSearchParams();
        params.set('q', state.q);
        params.set('page', state.page);
        params.set('limit', state.limit);
        return '/api/v1/cards?' + params.toString();
    }

    function buildSetApiUrl() {
        var params = new URLSearchParams();
        params.set('q', state.q);
        params.set('page', state.page);
        params.set('limit', state.limit);
        return '/api/v1/sets?' + params.toString();
    }

    function buildBrowserUrl() {
        var params = new URLSearchParams();
        if (state.q) params.set('q', state.q);
        if (state.page > 1) params.set('page', state.page);
        if (state.limit !== 25) params.set('limit', state.limit);
        var qs = params.toString();
        return '/search' + (qs ? '?' + qs : '');
    }

    function updateHistory(historyMethod) {
        if (historyMethod) {
            window.history[historyMethod]({}, '', buildBrowserUrl());
        }
    }

    function fetchBoth(historyMethod) {
        if (!state.q) {
            renderEmpty();
            updateHistory(historyMethod);
            return;
        }
        var scrollY = window.scrollY;
        pinHeight(container);
        showLoading();
        Promise.all([
            fetch(buildCardApiUrl()).then(function (r) {
                return r.json();
            }),
            fetch(buildSetApiUrl()).then(function (r) {
                return r.json();
            }),
        ])
            .then(function (results) {
                var cardJson = results[0];
                var setJson = results[1];
                renderResults(cardJson, setJson);
                unpinHeight(container);
                updateHistory(historyMethod);
                window.scrollTo(0, scrollY);
            })
            .catch(function (err) {
                console.error('Search error:', err);
                container.innerHTML = renderError(
                    'Failed to load search results. Please try again.'
                );
                unpinHeight(container);
                window.scrollTo(0, scrollY);
            });
    }

    function showLoading() {
        container.innerHTML =
            '<div class="text-center py-16"><i class="fas fa-spinner fa-spin text-4xl text-teal-500"></i></div>';
    }

    function renderEmpty() {
        container.innerHTML =
            '<div class="text-center py-12">' +
            '<p class="text-gray-500 dark:text-gray-400 text-lg">Enter a search term to find cards and sets</p>' +
            '</div>';
    }

    function renderError(message) {
        return (
            '<div class="text-center py-16">' +
            '<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>' +
            '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">' +
            escapeHtml(message) +
            '</p>' +
            '</div>'
        );
    }

    function renderResults(cardJson, setJson) {
        var cards = cardJson.success ? cardJson.data || [] : [];
        var sets = setJson.success ? setJson.data || [] : [];
        var cardMeta = cardJson.meta;
        var setMeta = setJson.meta;

        if (cards.length === 0 && sets.length === 0) {
            container.innerHTML =
                '<div class="text-center py-12">' +
                '<p class="text-gray-500 dark:text-gray-400 text-lg">No results found for "' +
                escapeHtml(state.q) +
                '"</p>' +
                '<p class="text-gray-400 dark:text-gray-500 text-sm mt-2">Try a different search term</p>' +
                '</div>';
            return;
        }

        var html = '';
        if (sets.length > 0) {
            html += '<div id="search-sets-section" class="mb-8">';
            html += renderSetSectionHtml(sets, setMeta);
            html += '</div>';
        }
        if (cards.length > 0) {
            html += '<div id="search-cards-section" class="mb-8">';
            html += renderCardSectionHtml(cards, cardMeta);
            html += '</div>';
        }
        html += renderPagination(cardMeta, setMeta);
        container.innerHTML = html;
    }

    function renderSetSectionHtml(sets, meta) {
        var total = meta ? meta.total : sets.length;
        var html =
            '<h4 class="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-3">' +
            'Sets <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(' +
            total +
            ' found)</span></h4>';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">';
        for (var i = 0; i < sets.length; i++) {
            html += renderSetCard(sets[i]);
        }
        html += '</div>';
        return html;
    }

    function renderCardSectionHtml(cards, meta) {
        var total = meta ? meta.total : cards.length;
        var html =
            '<h4 class="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-3">' +
            'Cards <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(' +
            total +
            ' found)</span></h4>';
        html += '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">';
        for (var i = 0; i < cards.length; i++) {
            html += renderCardItem(cards[i]);
        }
        html += '</div>';
        return html;
    }

    function renderSetCard(set) {
        var keyruneCode = escapeHtml(set.keyruneCode || set.code);
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());
        var tagsHtml = '';
        if (set.tags) {
            for (var t = 0; t < set.tags.length; t++) {
                tagsHtml += '<span class="tag">' + escapeHtml(set.tags[t]) + '</span>';
            }
        }
        return (
            '<a href="' +
            url +
            '" ' +
            'class="flex items-center gap-3 p-3 rounded-lg ' +
            'bg-white dark:bg-midnight-800 border border-gray-200 dark:border-midnight-600 ' +
            'hover:border-teal-400 dark:hover:border-teal-500 transition-colors">' +
            '<i class="ss ss-' +
            keyruneCode +
            ' ss-2x ss-foil text-gray-700 dark:text-gray-300"></i>' +
            '<div class="flex-1 min-w-0">' +
            '<div class="font-medium text-gray-900 dark:text-gray-100 truncate">' +
            escapeHtml(set.name) +
            '</div>' +
            '<div class="text-xs text-gray-500 dark:text-gray-400">' +
            escapeHtml(set.code.toUpperCase()) +
            (set.releaseDate ? ' &middot; ' + escapeHtml(set.releaseDate) : '') +
            '</div></div>' +
            tagsHtml +
            '</a>'
        );
    }

    function renderCardItem(card) {
        var imgSrc = 'https://cards.scryfall.io/small/front/' + card.imgSrc;
        var url =
            '/card/' + encodeURIComponent(card.setCode) + '/' + encodeURIComponent(card.number);
        var keyruneCode = escapeHtml(card.keyruneCode || card.setCode);
        var rarity = escapeHtml(card.rarity || '');

        return (
            '<a href="' +
            url +
            '" ' +
            'class="group flex flex-col items-center p-2 rounded-lg ' +
            'bg-white dark:bg-midnight-800 border border-gray-200 dark:border-midnight-600 ' +
            'hover:border-teal-400 dark:hover:border-teal-500 transition-colors">' +
            '<img src="' +
            escapeHtml(imgSrc) +
            '" alt="' +
            escapeHtml(card.name) +
            '" ' +
            'class="rounded w-full max-w-[146px] mb-2" loading="lazy" />' +
            '<div class="text-center w-full">' +
            '<div class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">' +
            escapeHtml(card.name) +
            '</div>' +
            '<div class="text-xs text-gray-500 dark:text-gray-400">' +
            '<i class="ss ss-' +
            keyruneCode +
            ' ss-' +
            rarity +
            ' ss-fw"></i> ' +
            escapeHtml(card.setCode.toUpperCase()) +
            ' #' +
            escapeHtml(card.number) +
            '</div></div></a>'
        );
    }

    function renderPagination(cardMeta, setMeta) {
        var cardTotal = cardMeta ? cardMeta.total : 0;
        var setTotal = setMeta ? setMeta.total : 0;
        var total = Math.max(cardTotal, setTotal);
        var totalPages = Math.ceil(total / state.limit);

        if (totalPages <= 1) return '';

        var page = state.page;
        var html = '<section class="pagination-container">';

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
        html += '<form method="get" action="/search" class="flex items-center gap-2 mb-4 mt-2">';
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

        html += '</section>';
        return html;
    }

    function paginationHref(page) {
        var params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(state.limit));
        return '/search?' + params.toString();
    }

    function pinHeight(el) {
        el.style.minHeight = el.offsetHeight + 'px';
    }

    function unpinHeight(el) {
        el.style.minHeight = '';
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
