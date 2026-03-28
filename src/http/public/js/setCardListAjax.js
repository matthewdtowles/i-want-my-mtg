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

    // Lazy-created binder state machine
    var binderMachine = null;

    function getOrCreateBinder() {
        if (!binderMachine) {
            var resultsEl = document.getElementById('filter-results');
            binderMachine = BinderCore.create({
                containerEl: container,
                resultsEl: resultsEl,
                setCode: setCode,
                authenticated: authenticated,
                apiPath: '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards',
                limit: BINDER_LIMIT,
                fetchInventory: authenticated,
                showOwnedState: false,
                navInputId: 'set-binder-page-input',
                history: {
                    basePath: '/sets/' + encodeURIComponent(setCode),
                },
            });

            // Listen for inventory updates
            AppState.on('inventory:updated', function (e) {
                var d = e.detail;
                binderMachine.patchQuantity(d.cardId, d.isFoil, d.quantity);
            });
        }
        return binderMachine;
    }

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards',
        basePath: '/sets/' + encodeURIComponent(setCode),
        renderContent: function (resultsEl, cards, meta) {
            if (page.state.view === 'binder') {
                // Delegate to binder state machine — it does its own fetch + render
                var machine = getOrCreateBinder();
                machine.activate();
                var targetPage = page.state.page || 1;
                machine.navigate(targetPage, null);
                return;
            }
            // List view — render table as before
            if (binderMachine) binderMachine.deactivate();
            renderTable(resultsEl, cards);
        },
        errorMessage: 'Failed to load cards',
        onSuccess: function (data, meta, done) {
            if (page.state.view === 'binder') {
                // Binder handles its own inventory fetch
                done();
                return;
            }
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

    // Fetch wrapper: short-circuit for binder mode to avoid double fetch
    function fetchForView(historyMode) {
        if (page.state.view === 'binder') {
            var machine = getOrCreateBinder();
            machine.activate();
            machine.navigate(page.state.page || 1, null);
            updateUIForView('binder');
            return;
        }
        page.fetchAndRender(historyMode);
    }

    // Set up view toggle
    var toggleContainer = document.getElementById('view-toggle');
    if (toggleContainer) {
        AjaxUtils.setupViewToggleInterceptor({
            container: toggleContainer,
            state: page.state,
            fetchFn: fetchForView,
            onToggle: function (newView) {
                if (newView === 'binder') {
                    applyBinderOverrides();
                } else {
                    restoreListDefaults();
                    if (binderMachine) binderMachine.deactivate();
                }
                updateUIForView(newView);
            },
        });
        AjaxUtils.updateViewToggle(toggleContainer, page.state.view);
    }

    // Apply initial UI state
    updateUIForView(page.state.view);

    // If starting in binder view, go directly to binder (no initListPage fetch)
    if (initialView === 'binder') {
        var machine = getOrCreateBinder();
        machine.navigate(1, null);
    }

    // Sync UI when navigating back/forward
    window.addEventListener('popstate', function () {
        var urlView = new URLSearchParams(window.location.search).get('view') || 'list';
        if (urlView === 'binder') {
            applyBinderOverrides();
            var urlPage =
                parseInt(new URLSearchParams(window.location.search).get('page'), 10) || 1;
            page.state.page = urlPage;
            var machine = getOrCreateBinder();
            machine.activate();
            machine.navigate(urlPage, null);
        } else {
            restoreListDefaults();
            if (binderMachine) binderMachine.deactivate();
        }
        updateUIForView(urlView);
    });

    // Keyboard navigation for binder pages
    document.addEventListener('keydown', function (e) {
        if (page.state.view !== 'binder' || !binderMachine) return;
        if (
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT'
        )
            return;
        var state = binderMachine.getState();
        if (e.key === 'ArrowLeft' && state.page > 1) {
            e.preventDefault();
            binderMachine.navigate(state.page - 1, 'left');
        } else if (e.key === 'ArrowRight' && state.page < state.totalPages) {
            e.preventDefault();
            binderMachine.navigate(state.page + 1, 'right');
        }
    });

    function applyBinderOverrides() {
        BINDER_LIMIT = window.matchMedia('(min-width: 640px)').matches ? 9 : 6;
        page.state.limit = BINDER_LIMIT;
        page.state.sort = 'card.sortNumber';
        page.state.ascend = true;
        page.state.filter = '';
        page.state.baseOnly = true;
        page.state.page = 1;
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

    // ===== Inventory (Table View Only) =====

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
            })
            .catch(function (err) {
                console.error('Error fetching inventory quantities:', err);
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
            })
            .finally(function () {
                if (onComplete) onComplete();
            });
    }

    function renderOwnedForms(cardId, qty, hasFoil, hasNonFoil) {
        return AjaxUtils.createStepperGroup(
            cardId,
            qty.normalQuantity,
            qty.foilQuantity,
            hasNonFoil,
            hasFoil,
            { compact: true }
        );
    }
});
