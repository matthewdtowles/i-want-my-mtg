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

    // Prefetch cache: { [page]: { cards, meta, quantityMap } }
    var cache = {};

    // Owned-only toggle
    var ownedOnlyToggle = document.getElementById('owned-only-toggle');
    if (ownedOnlyToggle) {
        ownedOnlyToggle.addEventListener('change', function () {
            state.ownedOnly = this.checked;
            state.page = 1;
            cache = {};
            fetchAndRender();
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

    function navigateTo(page, direction) {
        state.page = page;
        var cached = cache[page];
        if (cached) {
            renderBinder(cached.cards, cached.meta, cached.quantityMap, direction);
            prefetchAdjacent(cached.meta);
        } else {
            fetchAndRender(direction);
        }
    }

    function fetchAndRender(direction) {
        if (!direction) {
            AjaxUtils.showSpinner(container);
        }

        fetchPage(state.page, function (cards, meta, quantityMap) {
            cache[state.page] = { cards: cards, meta: meta, quantityMap: quantityMap };
            renderBinder(cards, meta, quantityMap, direction);
            prefetchAdjacent(meta);
        });
    }

    function fetchPage(page, callback) {
        var params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', state.limit);
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
            });
    }

    function fetchInventory(cards, meta, callback) {
        var cardIds = cards.map(function (c) { return c.id; }).filter(Boolean);

        if (cardIds.length === 0) {
            callback(cards, meta, {});
            return;
        }

        fetch('/api/v1/inventory/quantities?cardIds=' + cardIds.join(','), {
            credentials: 'same-origin',
        })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                var quantityMap = {};
                if (json.success && json.data) {
                    for (var i = 0; i < json.data.length; i++) {
                        quantityMap[json.data[i].cardId] = json.data[i];
                    }
                }
                callback(cards, meta, quantityMap);
            })
            .catch(function () {
                callback(cards, meta, {});
            });
    }

    function prefetchAdjacent(meta) {
        var totalPages = meta.totalPages || 1;
        var nextPage = state.page + 1;
        var prevPage = state.page - 1;

        if (nextPage <= totalPages && !cache[nextPage]) {
            fetchPage(nextPage, function (cards, m, qm) {
                cache[nextPage] = { cards: cards, meta: m, quantityMap: qm };
            });
        }
        if (prevPage >= 1 && !cache[prevPage]) {
            fetchPage(prevPage, function (cards, m, qm) {
                cache[prevPage] = { cards: cards, meta: m, quantityMap: qm };
            });
        }
    }

    function renderBinder(cards, meta, quantityMap, direction) {
        var totalPages = meta.totalPages || 1;
        var currentPage = meta.page || 1;

        var displayCards = cards;
        if (state.ownedOnly) {
            displayCards = cards.filter(function (card) {
                var qty = quantityMap[card.id];
                return qty && (qty.normalQuantity > 0 || qty.foilQuantity > 0);
            });
        }

        if (displayCards.length === 0) {
            var msg = state.ownedOnly ? 'No owned cards on this page' : 'No cards in this set';
            AjaxUtils.renderEmptyState(container, { message: msg });
            if (totalPages > 1) {
                container.innerHTML += renderBottomNav(currentPage, totalPages);
                setupNavHandlers();
            }
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
        for (var i = 0; i < displayCards.length; i++) {
            var card = displayCards[i];
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

        container.innerHTML = html;
        setupNavHandlers();

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
