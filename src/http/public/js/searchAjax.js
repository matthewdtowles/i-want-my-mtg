document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('filter-results');
    if (!container) return;

    var state = AjaxUtils.parseStateFromUrl(['q']);

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

    AjaxUtils.setupPaginationInterceptors({
        container: container,
        state: state,
        fetchFn: fetchBoth,
        scopeToContainer: true,
    });

    // Back/forward button
    window.addEventListener('popstate', function () {
        AjaxUtils.syncStateFromUrl(state, ['q']);
        var input = document.querySelector('form input[name="q"]');
        if (input) input.value = state.q;
        if (state.q) {
            fetchBoth(null);
        } else {
            renderEmpty();
        }
    });

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

    function updateHistory(historyMethod) {
        if (historyMethod) {
            window.history[historyMethod]({}, '', AjaxUtils.buildBrowserUrl('/search', state));
        }
    }

    function fetchBoth(historyMethod) {
        if (!state.q) {
            renderEmpty();
            updatePagination(null, null);
            updateHistory(historyMethod);
            return;
        }
        AjaxUtils.showSpinner(container);
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
                updatePagination(cardJson.meta, setJson.meta);
                AjaxUtils.clearMinHeight(container);
                updateHistory(historyMethod);
                AjaxUtils.smoothScroll(container, 'start');
            })
            .catch(function (err) {
                console.error('Search error:', err);
                AjaxUtils.showError(container, 'Failed to load search results. Please try again.');
                AjaxUtils.clearMinHeight(container);
            });
    }

    function renderEmpty() {
        container.innerHTML =
            '<div class="text-center py-16">' +
            '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
            '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">Enter a search term to find cards and sets</p>' +
            '</div>';
    }

    function renderResults(cardJson, setJson) {
        var cards = cardJson.success ? cardJson.data || [] : [];
        var sets = setJson.success ? setJson.data || [] : [];

        if (cards.length === 0 && sets.length === 0) {
            container.innerHTML =
                '<div class="text-center py-16">' +
                '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
                '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">No results found for "' +
                AjaxUtils.escapeHtml(state.q) +
                '"</p>' +
                '<p class="text-gray-400 dark:text-gray-500 mt-2">Try a different search term</p>' +
                '</div>';
            return;
        }

        var html = '';
        if (sets.length > 0) {
            html += '<div id="search-sets-section" class="mb-8">';
            html += renderSetSectionHtml(sets, setJson.meta);
            html += '</div>';
        }
        if (cards.length > 0) {
            html += '<div id="search-cards-section" class="mb-8">';
            html += renderCardSectionHtml(cards, cardJson.meta);
            html += '</div>';
        }
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
        var keyruneCode = AjaxUtils.escapeHtml(set.keyruneCode || set.code);
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());
        var tagsHtml = AjaxUtils.renderTags(set.tags);
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
            AjaxUtils.escapeHtml(set.name) +
            '</div>' +
            '<div class="text-xs text-gray-500 dark:text-gray-400">' +
            AjaxUtils.escapeHtml(set.code.toUpperCase()) +
            (set.releaseDate ? ' &middot; ' + AjaxUtils.escapeHtml(set.releaseDate) : '') +
            '</div></div>' +
            tagsHtml +
            '</a>'
        );
    }

    function renderCardItem(card) {
        var imgSrc = 'https://cards.scryfall.io/small/front/' + card.imgSrc;
        var url =
            '/card/' + encodeURIComponent(card.setCode) + '/' + encodeURIComponent(card.number);
        var keyruneCode = AjaxUtils.escapeHtml(card.keyruneCode || card.setCode);
        var rarity = AjaxUtils.escapeHtml(card.rarity || '');

        return (
            '<a href="' +
            url +
            '" ' +
            'class="group flex flex-col items-center p-2 rounded-lg ' +
            'bg-white dark:bg-midnight-800 border border-gray-200 dark:border-midnight-600 ' +
            'hover:border-teal-400 dark:hover:border-teal-500 transition-colors">' +
            '<img src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '" alt="' +
            AjaxUtils.escapeHtml(card.name) +
            '" ' +
            'class="rounded w-full max-w-[146px] mb-2" loading="lazy" />' +
            '<div class="text-center w-full">' +
            '<div class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">' +
            AjaxUtils.escapeHtml(card.name) +
            '</div>' +
            '<div class="text-xs text-gray-500 dark:text-gray-400">' +
            '<i class="ss ss-' +
            keyruneCode +
            ' ss-' +
            rarity +
            ' ss-fw"></i> ' +
            AjaxUtils.escapeHtml(card.setCode.toUpperCase()) +
            ' #' +
            AjaxUtils.escapeHtml(card.number) +
            '</div></div></a>'
        );
    }

    function updatePagination(cardMeta, setMeta) {
        var cardTotal = cardMeta ? cardMeta.total : 0;
        var setTotal = setMeta ? setMeta.total : 0;
        var total = Math.max(cardTotal, setTotal);
        var totalPages = Math.ceil(total / state.limit);

        var hiddenFields = {};
        if (state.q) hiddenFields.q = state.q;

        var html = AjaxUtils.renderPaginationHtml({
            page: state.page,
            totalPages: totalPages,
            limit: state.limit,
            hrefBuilder: paginationHref,
            formAction: '/search',
            hiddenFields: hiddenFields,
        });

        AjaxUtils.updatePaginationEl({
            parentEl: container.parentElement,
            insertAfterEl: container,
            html: html,
        });
    }

    function paginationHref(page) {
        var params = new URLSearchParams();
        if (state.q) params.set('q', state.q);
        params.set('page', String(page));
        params.set('limit', String(state.limit));
        return '/search?' + params.toString();
    }
});
