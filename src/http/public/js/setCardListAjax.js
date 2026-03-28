document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-card-list-ajax');
    if (!container) return;

    var setCode = container.dataset.setCode;
    var authenticated = container.dataset.authenticated === 'true';
    var hasAnyNormal = true;
    var hasAnyFoil = true;

    // Determine initial view: URL param > localStorage > default
    var urlView = new URLSearchParams(window.location.search).get('view');
    var initialView = urlView || localStorage.getItem('setViewPreference') || 'list';
    if (initialView !== 'binder') initialView = 'list';

    var BINDER_LIMIT = window.matchMedia('(min-width: 640px)').matches ? 9 : 6;

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards',
        basePath: '/sets/' + encodeURIComponent(setCode),
        renderContent: function (resultsEl, cards, meta) {
            if (page.state.view === 'binder') {
                renderBinder(resultsEl, cards, meta);
            } else {
                renderTable(resultsEl, cards);
            }
        },
        errorMessage: 'Failed to load cards',
        onSuccess: function (data, meta, done) {
            if (authenticated && data && data.length > 0) {
                fetchAndRenderInventory(data, done);
            } else {
                done();
            }
        },
    });
    if (!page) return;

    // Set initial view state and apply binder overrides
    page.state.view = initialView;
    if (initialView === 'binder') {
        applyBinderOverrides();
    }

    // Set up view toggle
    var toggleContainer = document.getElementById('view-toggle');
    if (toggleContainer) {
        AjaxUtils.setupViewToggleInterceptor({
            container: toggleContainer,
            state: page.state,
            fetchFn: page.fetchAndRender,
            onToggle: function (newView) {
                if (newView === 'binder') {
                    applyBinderOverrides();
                } else {
                    restoreListDefaults();
                }
                updateUIForView(newView);
            },
        });
        AjaxUtils.updateViewToggle(toggleContainer, page.state.view);
    }

    // Apply initial UI state
    updateUIForView(page.state.view);

    // If starting in binder view, re-fetch with binder params
    if (initialView === 'binder') {
        page.fetchAndRender('replaceState');
    }

    // Sync UI when navigating back/forward
    window.addEventListener('popstate', function () {
        var urlView = new URLSearchParams(window.location.search).get('view') || 'list';
        if (urlView === 'binder') {
            applyBinderOverrides();
        } else {
            restoreListDefaults();
        }
        updateUIForView(urlView);
    });

    // Keyboard navigation for binder pages
    document.addEventListener('keydown', function (e) {
        if (page.state.view !== 'binder') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'ArrowLeft' && page.state.page > 1) {
            e.preventDefault();
            page.state.page--;
            page.fetchAndRender('pushState');
        } else if (e.key === 'ArrowRight') {
            var nav = container.querySelector('.binder-page-nav');
            var totalPages = nav ? parseInt(nav.getAttribute('data-total-pages'), 10) : 1;
            if (page.state.page < totalPages) {
                e.preventDefault();
                page.state.page++;
                page.fetchAndRender('pushState');
            }
        }
    });

    function applyBinderOverrides() {
        BINDER_LIMIT = window.matchMedia('(min-width: 640px)').matches ? 9 : 6;
        page.state.limit = BINDER_LIMIT;
        page.state.sort = 'card.sortNumber';
        page.state.ascend = true;
    }

    function restoreListDefaults() {
        page.state.limit = 25;
    }

    function updateUIForView(view) {
        var filterWrapper = document.getElementById('filter-wrapper');
        var baseOnlyWrapper = document.getElementById('base-only-wrapper');
        var paginationEl = container.parentElement.querySelector('.pagination-container');

        if (view === 'binder') {
            if (filterWrapper) filterWrapper.style.display = 'none';
            if (baseOnlyWrapper) baseOnlyWrapper.style.display = 'none';
            if (paginationEl) paginationEl.style.display = 'none';
        } else {
            if (filterWrapper) filterWrapper.style.display = '';
            if (baseOnlyWrapper) baseOnlyWrapper.style.display = '';
            if (paginationEl) paginationEl.style.display = '';
        }

        if (toggleContainer) {
            AjaxUtils.updateViewToggle(toggleContainer, view);
        }
    }

    // ===== List (Table) View =====

    function renderTable(resultsEl, cards) {
        if (!cards || cards.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No cards match your search',
                clearHref: '/sets/' + AjaxUtils.escapeHtml(setCode),
            });
            return;
        }

        hasAnyNormal = cards.some(function (c) {
            return c.prices && c.prices.normal != null;
        });
        hasAnyFoil = cards.some(function (c) {
            return c.prices && c.prices.foil != null;
        });
        var hasAnyNormalPrice = hasAnyNormal;
        var hasAnyFoilPrice = hasAnyFoil;

        var headers = [
            { key: '', label: 'Owned' },
            { key: 'card.sortNumber', label: 'Card No.' },
            { key: 'card.name', label: 'Card' },
            { key: '', label: 'Mana Cost', classes: 'xs-hide' },
            { key: '', label: 'Rarity', classes: 'xs-hide' },
        ];
        if (hasAnyNormalPrice) {
            headers.push({
                key: 'prices.normal',
                label: 'Normal',
                subtitle: '7d',
                classes: 'xs-hide',
            });
        }
        if (hasAnyFoilPrice) {
            headers.push({ key: 'prices.foil', label: 'Foil', subtitle: '7d', classes: 'xs-hide' });
        }
        if (hasAnyNormalPrice || hasAnyFoilPrice) {
            headers.push({ key: '', label: 'Price', classes: 'xs-show' });
        }

        var html = '<div class="table-wrapper"><table class="table-container">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < cards.length; i++) {
            html += renderCardRow(cards[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
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
        html += '<td class="table-cell">';
        html += AjaxUtils.renderCardLink(url, card.name, imgSrc);
        html += '</td>';

        // Mana Cost (xs-hide)
        html += '<td class="table-cell xs-hide">' + renderManaCost(card.manaCost) + '</td>';

        // Rarity (xs-hide)
        html +=
            '<td class="table-cell xs-hide">' + AjaxUtils.escapeHtml(card.rarity || '') + '</td>';

        // Normal price (xs-hide)
        if (hasAnyNormal) {
            html += '<td class="table-cell xs-hide">';
            if (card.hasNonFoil && card.prices && card.prices.normal != null) {
                html +=
                    '<span class="price-normal">' +
                    AjaxUtils.toDollar(card.prices.normal) +
                    '</span>';
                if (
                    card.prices.normalChangeWeekly != null &&
                    card.prices.normalChangeWeekly !== 0
                ) {
                    html += ' ' + AjaxUtils.renderPriceChange(card.prices.normalChangeWeekly);
                }
            }
            html += '</td>';
        }

        // Foil price (xs-hide)
        if (hasAnyFoil) {
            html += '<td class="table-cell xs-hide">';
            if (card.hasFoil && card.prices && card.prices.foil != null) {
                html +=
                    '<span class="price-foil">' + AjaxUtils.toDollar(card.prices.foil) + '</span>';
                if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                    html += ' ' + AjaxUtils.renderPriceChange(card.prices.foilChangeWeekly);
                }
            }
            html += '</td>';
        }

        // Combined price (xs-show, mobile) — Normal first, then Foil
        if (hasAnyNormal || hasAnyFoil) {
            html += '<td class="table-cell xs-show">';
            if (card.hasNonFoil && card.prices && card.prices.normal != null) {
                html +=
                    '<span class="price-normal">' +
                    AjaxUtils.toDollar(card.prices.normal) +
                    '</span>';
                if (
                    card.prices.normalChangeWeekly != null &&
                    card.prices.normalChangeWeekly !== 0
                ) {
                    html += ' ' + AjaxUtils.renderPriceChange(card.prices.normalChangeWeekly);
                }
            }
            if (card.hasFoil && card.prices && card.prices.foil != null) {
                html +=
                    '<span class="price-foil">' + AjaxUtils.toDollar(card.prices.foil) + '</span>';
                if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                    html += ' ' + AjaxUtils.renderPriceChange(card.prices.foilChangeWeekly);
                }
            }
            html += '</td>';
        }

        html += '</tr>';
        return html;
    }

    function renderManaCost(manaCost) {
        if (!manaCost) return '';
        return manaCost.replace(/\/\/|\{([^}]+)\}/g, function (match, symbol) {
            if (!symbol) return '<span class="mana-sep">' + AjaxUtils.escapeHtml(match) + '</span>';
            var lower = symbol.toLowerCase().replace('/', '');
            var isHalf = lower.startsWith('h');
            return (
                '<i class="ms ms-cost ms-shadow ms-' + lower + (isHalf ? ' ms-half' : '') + '"></i>'
            );
        });
    }

    // ===== Binder View =====

    function renderBinder(resultsEl, cards, meta) {
        if (!cards || cards.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No cards in this set',
            });
            return;
        }

        var totalPages = (meta && meta.totalPages) || 1;
        var currentPage = (meta && meta.page) || 1;

        var html = '<div class="binder-wrapper">';

        // Left side arrow
        if (totalPages > 1) {
            html +=
                '<button type="button" class="binder-side-btn binder-side-btn--left" data-dir="prev"' +
                (currentPage <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' +
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
                '</svg>' +
                '</button>';
        }

        html += '<div class="binder-grid">';
        for (var i = 0; i < cards.length; i++) {
            html += renderBinderCard(cards[i]);
        }
        html += '</div>';

        // Right side arrow
        if (totalPages > 1) {
            html +=
                '<button type="button" class="binder-side-btn binder-side-btn--right" data-dir="next"' +
                (currentPage >= totalPages ? ' disabled' : '') + ' aria-label="Next page">' +
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
                '</svg>' +
                '</button>';
        }

        html += '</div>'; // close binder-wrapper

        // Bottom nav with page input
        html += renderBinderNav(currentPage, totalPages);

        resultsEl.innerHTML = html;
        setupBinderNavHandlers(resultsEl, totalPages);

        // Hide standard pagination when in binder view
        var paginationEl = container.parentElement.querySelector('.pagination-container');
        if (paginationEl) paginationEl.style.display = 'none';

        AjaxUtils.announce('Binder page ' + currentPage + ' of ' + totalPages);
    }

    function setupBinderNavHandlers(resultsEl, totalPages) {
        // Side buttons
        var sideBtns = resultsEl.querySelectorAll('.binder-side-btn');
        for (var i = 0; i < sideBtns.length; i++) {
            sideBtns[i].addEventListener('click', function (e) {
                var btn = e.target.closest('.binder-side-btn');
                if (!btn || btn.disabled) return;
                e.preventDefault();
                var dir = btn.getAttribute('data-dir');
                if (dir === 'prev' && page.state.page > 1) {
                    page.state.page--;
                    page.fetchAndRender('pushState');
                } else if (dir === 'next' && page.state.page < totalPages) {
                    page.state.page++;
                    page.fetchAndRender('pushState');
                }
            });
        }

        // Bottom nav buttons
        var nav = resultsEl.querySelector('.binder-page-nav');
        if (nav) {
            nav.addEventListener('click', function (e) {
                var btn = e.target.closest('.binder-page-btn');
                if (!btn || btn.disabled) return;
                e.preventDefault();
                var dir = btn.getAttribute('data-dir');
                if (dir === 'prev' && page.state.page > 1) {
                    page.state.page--;
                    page.fetchAndRender('pushState');
                } else if (dir === 'next' && page.state.page < totalPages) {
                    page.state.page++;
                    page.fetchAndRender('pushState');
                }
            });

            // Page input
            var pageInput = nav.querySelector('.binder-page-input');
            if (pageInput) {
                pageInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        var val = parseInt(this.value, 10);
                        if (val >= 1 && val <= totalPages && val !== page.state.page) {
                            page.state.page = val;
                            page.fetchAndRender('pushState');
                        } else {
                            this.value = page.state.page;
                        }
                    }
                });
                pageInput.addEventListener('blur', function () {
                    this.value = page.state.page;
                });
            }
        }
    }

    function renderBinderCard(card) {
        var url = '/card/' + encodeURIComponent(setCode) + '/' + encodeURIComponent(card.number);
        var imgSrc = 'https://cards.scryfall.io/normal/front/' + card.imgSrc;
        var escapedName = AjaxUtils.escapeHtml(card.name);
        var escapedNumber = AjaxUtils.escapeHtml(card.number);
        var escapedId = AjaxUtils.escapeHtml(card.id);

        var html =
            '<div class="binder-card"' +
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

        // Hover overlay: name, number, and stepper (if authenticated)
        html +=
            '<div class="binder-card-overlay">' +
            '<span class="binder-card-overlay-name">' + escapedName + '</span>' +
            '<span class="binder-card-overlay-number">#' + escapedNumber + '</span>';

        if (authenticated) {
            html += '<div class="binder-card-stepper">' +
                AjaxUtils.createStepperGroup(card.id, 0, 0, !!card.hasNonFoil, !!card.hasFoil, { compact: true }) +
                '</div>';
        }

        html += '</div>';
        html += '</div>';
        return html;
    }

    function renderBinderNav(currentPage, totalPages) {
        if (totalPages <= 1) return '';

        var prevDisabled = currentPage <= 1 ? ' disabled' : '';
        var nextDisabled = currentPage >= totalPages ? ' disabled' : '';

        return (
            '<nav class="binder-page-nav" data-total-pages="' + totalPages + '" aria-label="Binder page navigation">' +
            '<button type="button" class="binder-page-btn" data-dir="prev"' + prevDisabled + ' aria-label="Previous page">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
            '</svg>' +
            '</button>' +
            '<span class="binder-page-indicator">' +
            '<label class="sr-only" for="set-binder-page-input">Page</label>' +
            '<input id="set-binder-page-input" type="number" class="binder-page-input"' +
            ' value="' + currentPage + '" min="1" max="' + totalPages + '"' +
            ' aria-label="Go to page" />' +
            '<span class="binder-page-total"> / ' + totalPages + '</span>' +
            '</span>' +
            '<button type="button" class="binder-page-btn" data-dir="next"' + nextDisabled + ' aria-label="Next page">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
            '</svg>' +
            '</button>' +
            '</nav>'
        );
    }

    // ===== Inventory =====

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

        fetch('/api/v1/inventory/quantities?cardIds=' + cardIds.join(','), {
            credentials: 'same-origin',
        })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('HTTP ' + res.status);
                }
                return res.json();
            })
            .then(function (json) {
                if (!json.success || !json.data) return;
                var quantityMap = {};
                for (var i = 0; i < json.data.length; i++) {
                    quantityMap[json.data[i].cardId] = json.data[i];
                }

                if (page.state.view === 'binder') {
                    // Binder: update stepper quantities
                    var binderCards = document.querySelectorAll('#set-card-list-ajax .binder-card');
                    for (var j = 0; j < binderCards.length; j++) {
                        var card = binderCards[j];
                        var cardId = card.getAttribute('data-card-id');
                        var qty = quantityMap[cardId] || { foilQuantity: 0, normalQuantity: 0 };
                        updateBinderSteppers(card, qty);
                    }
                } else {
                    // Table: render quantity forms
                    var cells = document.querySelectorAll('#set-card-list-ajax .owned-cell');
                    for (var k = 0; k < cells.length; k++) {
                        var cell = cells[k];
                        var cellCardId = cell.getAttribute('data-card-id');
                        var hasFoil = cell.getAttribute('data-has-foil') === 'true';
                        var hasNonFoil = cell.getAttribute('data-has-non-foil') === 'true';
                        var cellQty = quantityMap[cellCardId] || { foilQuantity: 0, normalQuantity: 0 };
                        cell.innerHTML = renderOwnedForms(cellCardId, cellQty, hasFoil, hasNonFoil);
                    }
                }
            })
            .catch(function (err) {
                console.error('Error fetching inventory quantities:', err);
                if (page.state.view !== 'binder') {
                    var cells = document.querySelectorAll('#set-card-list-ajax .owned-cell');
                    for (var j = 0; j < cells.length; j++) {
                        var cell = cells[j];
                        var cardId = cell.getAttribute('data-card-id');
                        var hasFoil = cell.getAttribute('data-has-foil') === 'true';
                        var hasNonFoil = cell.getAttribute('data-has-non-foil') === 'true';
                        cell.innerHTML = renderOwnedForms(
                            cardId,
                            { foilQuantity: 0, normalQuantity: 0 },
                            hasFoil,
                            hasNonFoil
                        );
                    }
                }
            })
            .finally(function () {
                if (onComplete) onComplete();
            });
    }

    function renderOwnedForms(cardId, qty, hasFoil, hasNonFoil) {
        return AjaxUtils.createStepperGroup(
            cardId, qty.normalQuantity, qty.foilQuantity,
            hasNonFoil, hasFoil, { compact: true }
        );
    }

    function updateBinderSteppers(binderCard, qty) {
        var steppers = binderCard.querySelectorAll('.inv-stepper');
        for (var i = 0; i < steppers.length; i++) {
            var stepper = steppers[i];
            var isFoil = stepper.getAttribute('data-foil') === 'true';
            var q = isFoil ? qty.foilQuantity : qty.normalQuantity;
            var qtyEl = stepper.querySelector('.inv-stepper-qty');
            qtyEl.textContent = q;
            qtyEl.classList.toggle('inv-stepper-qty--zero', q === 0);
            var decBtn = stepper.querySelector('.inv-stepper-btn--dec');
            if (q <= 0) {
                decBtn.setAttribute('disabled', '');
            } else {
                decBtn.removeAttribute('disabled');
            }
        }
    }
});
