document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('inventory-binder');
    if (!container) return;

    var setCode = container.dataset.setCode;
    var BINDER_LIMIT = window.matchMedia('(min-width: 640px)').matches ? 9 : 6;

    var state = {
        page: 1,
        limit: BINDER_LIMIT,
        ownedOnly: false,
    };

    var binderMinHeight = 0;

    // Page cache for normal mode: { [page]: { cards, meta, quantityMap } }
    var cache = {};

    // Owned-only cache: full filtered list + quantityMap
    var ownedCache = null; // { cards: [], quantityMap: {} }

    // Owned-only toggle
    var ownedOnlyToggle = document.getElementById('owned-only-toggle');
    if (ownedOnlyToggle) {
        ownedOnlyToggle.addEventListener('change', function () {
            state.ownedOnly = this.checked;
            state.page = 1;
            if (state.ownedOnly && !ownedCache) {
                fetchAllOwned();
            } else {
                renderCurrentPage();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'ArrowLeft' && state.page > 1) {
            e.preventDefault();
            navigateTo(state.page - 1, 'left');
        } else if (e.key === 'ArrowRight') {
            var totalPages = getTotalPages();
            if (state.page < totalPages) {
                e.preventDefault();
                navigateTo(state.page + 1, 'right');
            }
        }
    });

    fetchAndRender();

    function getTotalPages() {
        var nav = container.querySelector('.binder-page-nav');
        return nav ? parseInt(nav.getAttribute('data-total-pages'), 10) : 1;
    }

    function navigateTo(targetPage, direction) {
        state.page = targetPage;
        if (state.ownedOnly) {
            renderCurrentPage(direction);
            return;
        }
        var cached = cache[targetPage];
        if (cached) {
            renderBinder(cached.cards, cached.meta, cached.quantityMap, direction);
            prefetchAdjacent(cached.meta);
        } else {
            fetchAndRender(direction);
        }
    }

    // Render current page from appropriate source
    function renderCurrentPage(direction) {
        if (state.ownedOnly && ownedCache) {
            var start = (state.page - 1) * state.limit;
            var pageCards = ownedCache.cards.slice(start, start + state.limit);
            var totalPages = Math.max(1, Math.ceil(ownedCache.cards.length / state.limit));
            var meta = { page: state.page, totalPages: totalPages };
            renderBinder(pageCards, meta, ownedCache.quantityMap, direction);
        } else if (!state.ownedOnly) {
            var cached = cache[state.page];
            if (cached) {
                renderBinder(cached.cards, cached.meta, cached.quantityMap, direction);
            } else {
                fetchAndRender(direction);
            }
        }
    }

    // Normal mode: fetch a single page
    function fetchAndRender(direction) {
        if (!direction) {
            AjaxUtils.showSpinner(container);
        } else {
            // Pin height before fetch to keep container stable during network request
            container.style.minHeight = (binderMinHeight || container.offsetHeight) + 'px';
        }

        fetchPage(state.page, state.limit, function (cards, meta, quantityMap) {
            cache[state.page] = { cards: cards, meta: meta, quantityMap: quantityMap };
            renderBinder(cards, meta, quantityMap, direction);
            prefetchAdjacent(meta);
        });
    }

    // Owned-only mode: fetch all cards then filter
    function fetchAllOwned() {
        AjaxUtils.showSpinner(container);

        // Fetch all cards (large limit to get everything in one request)
        fetchPage(1, 1000, function (cards, meta, quantityMap) {
            // If there are more pages, fetch them too
            var allCards = cards.slice();
            var allQtyMap = {};
            for (var k in quantityMap) allQtyMap[k] = quantityMap[k];

            var totalPages = meta.totalPages || 1;
            if (totalPages <= 1) {
                buildOwnedCache(allCards, allQtyMap);
                return;
            }

            // Fetch remaining pages
            var remaining = totalPages - 1;
            var done = 0;
            for (var p = 2; p <= totalPages; p++) {
                fetchPage(p, 1000, function (moreCards, moreMeta, moreQtyMap) {
                    allCards = allCards.concat(moreCards);
                    for (var k in moreQtyMap) allQtyMap[k] = moreQtyMap[k];
                    done++;
                    if (done === remaining) {
                        buildOwnedCache(allCards, allQtyMap);
                    }
                });
            }
        });
    }

    function buildOwnedCache(allCards, quantityMap) {
        var owned = allCards.filter(function (card) {
            var qty = quantityMap[card.id];
            return qty && (qty.normalQuantity > 0 || qty.foilQuantity > 0);
        });
        ownedCache = { cards: owned, quantityMap: quantityMap };
        state.page = 1;
        renderCurrentPage();
    }

    function fetchPage(pageNum, limit, callback) {
        var params = new URLSearchParams();
        params.set('page', pageNum);
        params.set('limit', limit);
        params.set('sort', 'card.sortNumber');
        params.set('ascend', 'true');

        var apiUrl = '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards?' + params.toString();

        fetch(apiUrl, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                var cards = (json.success && json.data) ? json.data : [];
                var meta = json.meta || {};
                fetchInventory(cards, meta, callback);
            })
            .catch(function (err) {
                console.error('Error loading cards:', err);
                AjaxUtils.showError(container, 'Failed to load cards');
                callback([], { page: pageNum, totalPages: 0 }, {});
            });
    }

    function fetchInventory(cards, meta, callback) {
        var cardIds = cards.map(function (c) { return c.id; }).filter(Boolean);

        if (cardIds.length === 0) {
            callback(cards, meta, {});
            return;
        }

        // Batch into chunks of 200 (API limit)
        var BATCH_SIZE = 200;
        var chunks = [];
        for (var i = 0; i < cardIds.length; i += BATCH_SIZE) {
            chunks.push(cardIds.slice(i, i + BATCH_SIZE));
        }

        var quantityMap = {};
        var done = 0;

        chunks.forEach(function (chunk) {
            fetch('/api/v1/inventory/quantities?cardIds=' + chunk.join(','), {
                credentials: 'same-origin',
            })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function (json) {
                    if (json.success && json.data) {
                        for (var j = 0; j < json.data.length; j++) {
                            quantityMap[json.data[j].cardId] = json.data[j];
                        }
                    }
                })
                .catch(function () {
                    // silently continue — partial data is better than none
                })
                .then(function () {
                    done++;
                    if (done === chunks.length) {
                        callback(cards, meta, quantityMap);
                    }
                });
        });
    }

    function prefetchAdjacent(meta) {
        if (state.ownedOnly) return; // owned mode is fully client-side
        var totalPages = meta.totalPages || 1;
        var nextPage = state.page + 1;
        var prevPage = state.page - 1;

        if (nextPage <= totalPages && !cache[nextPage]) {
            fetchPage(nextPage, state.limit, function (cards, m, qm) {
                cache[nextPage] = { cards: cards, meta: m, quantityMap: qm };
            });
        }
        if (prevPage >= 1 && !cache[prevPage]) {
            fetchPage(prevPage, state.limit, function (cards, m, qm) {
                cache[prevPage] = { cards: cards, meta: m, quantityMap: qm };
            });
        }
    }

    function renderBinder(cards, meta, quantityMap, direction) {
        var totalPages = meta.totalPages || 1;
        var currentPage = meta.page || 1;

        if (!cards || cards.length === 0) {
            var msg = state.ownedOnly ? 'No owned cards in this set' : 'No cards in this set';
            AjaxUtils.renderEmptyState(container, { message: msg });
            return;
        }

        // Build the binder wrapper with side arrows + grid + bottom nav
        var html = '<div class="binder-wrapper">';

        // Left side arrow
        if (totalPages > 1) {
            var prevDisabled = currentPage <= 1 ? ' disabled' : '';
            html +=
                '<button type="button" class="binder-side-btn binder-side-btn--left" data-dir="prev"' +
                prevDisabled + ' aria-label="Previous page">' +
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
                '</svg>' +
                '</button>';
        }

        // Card grid with animation class
        var animClass = '';
        if (direction === 'right') animClass = ' binder-grid--enter-right';
        else if (direction === 'left') animClass = ' binder-grid--enter-left';

        html += '<div class="binder-grid' + animClass + '">';
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var qty = quantityMap[card.id] || { normalQuantity: 0, foilQuantity: 0 };
            html += renderCard(card, qty);
        }
        html += '</div>';

        // Right side arrow
        if (totalPages > 1) {
            var nextDisabled = currentPage >= totalPages ? ' disabled' : '';
            html +=
                '<button type="button" class="binder-side-btn binder-side-btn--right" data-dir="next"' +
                nextDisabled + ' aria-label="Next page">' +
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
                '</svg>' +
                '</button>';
        }

        html += '</div>'; // close binder-wrapper

        // Bottom nav with page input
        if (totalPages > 1) {
            html += renderBottomNav(currentPage, totalPages);
        }

        // Hold container at established binder height during content swap
        container.style.minHeight = (binderMinHeight || container.offsetHeight) + 'px';
        container.innerHTML = html;
        setupNavHandlers();

        // Establish permanent binder height — never shrinks
        var contentHeight = container.scrollHeight;
        if (contentHeight > binderMinHeight) {
            binderMinHeight = contentHeight;
        }
        container.style.minHeight = binderMinHeight + 'px';

        // Keep binder at top of viewport on page navigation
        if (direction) {
            requestAnimationFrame(function() {
                var rect = container.getBoundingClientRect();
                window.scrollTo({ top: window.scrollY + rect.top, left: 0, behavior: 'auto' });
            });
        }

        AjaxUtils.announce('Binder page ' + currentPage + ' of ' + totalPages);
    }

    function renderCard(card, qty) {
        var url = '/card/' + encodeURIComponent(setCode) + '/' + encodeURIComponent(card.number);
        var imgSrc = 'https://cards.scryfall.io/normal/front/' + card.imgSrc;
        var escapedName = AjaxUtils.escapeHtml(card.name);
        var escapedNumber = AjaxUtils.escapeHtml(card.number);
        var escapedId = AjaxUtils.escapeHtml(card.id);

        var isOwned = qty.normalQuantity > 0 || qty.foilQuantity > 0;
        var ownerClass = isOwned ? 'binder-card-owned' : 'binder-card-unowned';

        var html =
            '<div class="binder-card ' + ownerClass + '"' +
            ' data-card-id="' + escapedId + '"' +
            ' data-has-foil="' + !!card.hasFoil + '"' +
            ' data-has-non-foil="' + !!card.hasNonFoil + '">';

        html +=
            '<a href="' + AjaxUtils.escapeHtml(url) + '" title="' + escapedName + '">' +
            '<img src="' + AjaxUtils.escapeHtml(imgSrc) + '"' +
            ' alt="' + escapedName + '"' +
            ' loading="lazy" width="488" height="680"' +
            ' class="binder-card-img" />' +
            '</a>';

        // Number overlay for unowned cards
        html += '<span class="binder-card-number">#' + escapedNumber + '</span>';

        // Hover overlay with info + stepper
        html +=
            '<div class="binder-card-overlay">' +
            '<span class="binder-card-overlay-name">' + escapedName + '</span>' +
            '<span class="binder-card-overlay-number">#' + escapedNumber + '</span>' +
            '<div class="binder-card-stepper">' +
            AjaxUtils.createStepperGroup(
                card.id, qty.normalQuantity, qty.foilQuantity,
                !!card.hasNonFoil, !!card.hasFoil, { compact: true }
            ) +
            '</div>' +
            '</div>';

        html += '</div>';
        return html;
    }

    function renderBottomNav(currentPage, totalPages) {
        return (
            '<nav class="binder-page-nav" data-total-pages="' + totalPages + '" aria-label="Binder page navigation">' +
            '<button type="button" class="binder-page-btn" data-dir="prev"' +
            (currentPage <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
            '</svg>' +
            '</button>' +
            '<span class="binder-page-indicator">' +
            '<label class="sr-only" for="binder-page-input">Page</label>' +
            '<input id="binder-page-input" type="number" class="binder-page-input"' +
            ' value="' + currentPage + '" min="1" max="' + totalPages + '"' +
            ' aria-label="Go to page" />' +
            '<span class="binder-page-total"> / ' + totalPages + '</span>' +
            '</span>' +
            '<button type="button" class="binder-page-btn" data-dir="next"' +
            (currentPage >= totalPages ? ' disabled' : '') + ' aria-label="Next page">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
            '</svg>' +
            '</button>' +
            '</nav>'
        );
    }

    function setupNavHandlers() {
        // Side buttons
        var sideBtns = container.querySelectorAll('.binder-side-btn');
        for (var i = 0; i < sideBtns.length; i++) {
            sideBtns[i].addEventListener('click', handleNavClick);
        }

        // Bottom nav buttons
        var nav = container.querySelector('.binder-page-nav');
        if (!nav) return;
        nav.addEventListener('click', function (e) {
            var btn = e.target.closest('.binder-page-btn');
            if (!btn || btn.disabled) return;
            e.preventDefault();
            var dir = btn.getAttribute('data-dir');
            var totalPages = parseInt(nav.getAttribute('data-total-pages'), 10);
            if (dir === 'prev' && state.page > 1) {
                navigateTo(state.page - 1, 'left');
            } else if (dir === 'next' && state.page < totalPages) {
                navigateTo(state.page + 1, 'right');
            }
        });

        // Page input
        var pageInput = document.getElementById('binder-page-input');
        if (pageInput) {
            pageInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var totalPages = parseInt(nav.getAttribute('data-total-pages'), 10);
                    var val = parseInt(this.value, 10);
                    if (val >= 1 && val <= totalPages && val !== state.page) {
                        var direction = val > state.page ? 'right' : 'left';
                        navigateTo(val, direction);
                    } else {
                        this.value = state.page;
                    }
                }
            });

            pageInput.addEventListener('blur', function () {
                this.value = state.page;
            });
        }
    }

    function handleNavClick(e) {
        var btn = e.target.closest('.binder-side-btn');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        var dir = btn.getAttribute('data-dir');
        var totalPages = getTotalPages();
        if (dir === 'prev' && state.page > 1) {
            navigateTo(state.page - 1, 'left');
        } else if (dir === 'next' && state.page < totalPages) {
            navigateTo(state.page + 1, 'right');
        }
    }
});
