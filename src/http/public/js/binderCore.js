(function () {
    'use strict';

    var BATCH_SIZE = 200;

    function create(config) {
        var containerEl = config.containerEl;
        var resultsEl = config.resultsEl;
        var setCode = config.setCode;
        var authenticated = config.authenticated;
        var apiPath = config.apiPath;
        var limit = config.limit;
        var fetchInventory = config.fetchInventory !== false;
        var showOwnedState = config.showOwnedState !== false && authenticated;
        var onIdle = config.onIdle || null;
        var historyConfig = config.history || null;

        var store = AppState.create({
            page: 1,
            totalPages: 0,
            cards: [],
            quantityMap: {},
            direction: null,
            ownedOnly: false,
            setCode: setCode,
        });

        var active = true;
        var cache = {};
        var ownedCache = null;
        var pinnedHeight = 0;
        var navInputId = config.navInputId || 'binder-page-input';

        function getPhase() {
            return store.getPhase();
        }

        function getState() {
            var s = store.get();
            return s;
        }

        function navigate(targetPage, direction) {
            if (!active) return false;
            if (store.getPhase() !== 'idle') return false;

            store.set({ page: targetPage, direction: direction || null });

            // Check cache (normal mode only)
            if (!store.get().ownedOnly && cache[targetPage]) {
                var cached = cache[targetPage];
                store.set({
                    cards: cached.cards,
                    totalPages: cached.meta.totalPages || 0,
                    quantityMap: cached.quantityMap,
                });
                store.setPhase('rendering');
                renderAndSettle();
                prefetchAdjacent();
                return true;
            }

            // Check owned-only client-side pagination
            if (store.get().ownedOnly && ownedCache) {
                store.setPhase('rendering');
                renderOwnedPage();
                return true;
            }

            store.setPhase('loading');

            if (!direction) {
                AjaxUtils.showSpinner(resultsEl);
            } else {
                resultsEl.style.minHeight = (pinnedHeight || resultsEl.offsetHeight) + 'px';
            }

            fetchPage(targetPage, limit, function (err, cards, meta, quantityMap) {
                if (err) {
                    if (typeof AjaxUtils !== 'undefined' && AjaxUtils.showError) {
                        AjaxUtils.showError(resultsEl, 'Failed to load cards');
                    } else {
                        resultsEl.innerHTML =
                            '<div class="text-center py-16 text-red-500">Failed to load cards</div>';
                    }
                    store.setPhase('idle');
                    return;
                }
                cache[targetPage] = { cards: cards, meta: meta, quantityMap: quantityMap };
                store.set({
                    cards: cards,
                    totalPages: meta.totalPages || 0,
                    quantityMap: quantityMap,
                });
                store.setPhase('rendering');
                renderAndSettle();
                prefetchAdjacent();
            });

            return true;
        }

        function renderAndSettle() {
            var state = store.get();
            var options = {
                authenticated: authenticated,
                showOwnedState: showOwnedState,
                navInputId: navInputId,
            };

            if (!state.cards || state.cards.length === 0) {
                var msg = state.ownedOnly ? 'No owned cards in this set' : 'No cards in this set';
                AjaxUtils.renderEmptyState(resultsEl, { message: msg });
                settleAndIdle(false);
                return;
            }

            var html = BinderRenderer.render(state, options);

            AppState.renderInto(resultsEl, html, {
                pinnedHeight: pinnedHeight,
                onSettled: function () {
                    var contentHeight = resultsEl.scrollHeight;
                    if (contentHeight > pinnedHeight) {
                        pinnedHeight = contentHeight;
                    }
                    resultsEl.style.minHeight = pinnedHeight + 'px';
                    settleAndIdle(!!state.direction);
                },
            });

            setupNavHandlers();
        }

        function settleAndIdle(shouldScroll) {
            var state = store.get();

            if (shouldScroll) {
                window.scrollTo({
                    top: containerEl.offsetTop,
                    left: 0,
                    behavior: 'auto',
                });
            }

            store.setPhase('idle');
            if (state.totalPages > 0) {
                AppState.announce('Binder page ' + state.page + ' of ' + state.totalPages);
            }

            if (historyConfig && state.direction) {
                var url = buildHistoryUrl(state.page);
                if (url) {
                    window.history.pushState({}, '', url);
                }
            }

            if (onIdle) onIdle();
        }

        function buildHistoryUrl(page) {
            if (!historyConfig || !historyConfig.basePath) return null;
            var params = new URLSearchParams(window.location.search);
            params.set('page', page);
            params.set('view', 'binder');
            return historyConfig.basePath + '?' + params.toString();
        }

        // --- Fetch ---

        function fetchPage(pageNum, pageLimit, callback) {
            var params = new URLSearchParams();
            params.set('page', pageNum);
            params.set('limit', pageLimit);
            params.set('sort', 'card.sortNumber');
            params.set('ascend', 'true');

            var url = apiPath + '?' + params.toString();

            fetch(url, { credentials: 'same-origin' })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function (json) {
                    var cards = json.success && json.data ? json.data : [];
                    var meta = json.meta || {};

                    if (fetchInventory && authenticated && cards.length > 0) {
                        fetchInventoryQuantities(cards, meta, callback);
                    } else {
                        callback(null, cards, meta, {});
                    }
                })
                .catch(function (err) {
                    console.error('Error loading cards:', err);
                    callback(err);
                });
        }

        function fetchInventoryQuantities(cards, meta, callback) {
            var cardIds = cards
                .map(function (c) {
                    return c.id;
                })
                .filter(Boolean);
            if (cardIds.length === 0) {
                callback(null, cards, meta, {});
                return;
            }

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
                    .catch(function () {})
                    .then(function () {
                        done++;
                        if (done === chunks.length) {
                            callback(null, cards, meta, quantityMap);
                        }
                    });
            });
        }

        // --- Prefetch ---

        function prefetchAdjacent() {
            if (store.get().ownedOnly) return;
            var state = store.get();
            var totalPages = state.totalPages || 0;
            var nextPage = state.page + 1;
            var prevPage = state.page - 1;

            if (nextPage <= totalPages && !cache[nextPage]) {
                fetchPage(nextPage, limit, function (err, cards, m, qm) {
                    if (!err) cache[nextPage] = { cards: cards, meta: m, quantityMap: qm };
                });
            }
            if (prevPage >= 1 && !cache[prevPage]) {
                fetchPage(prevPage, limit, function (err, cards, m, qm) {
                    if (!err) cache[prevPage] = { cards: cards, meta: m, quantityMap: qm };
                });
            }
        }

        // --- Owned-only mode ---

        function setOwnedOnly(enabled) {
            store.set({ ownedOnly: enabled, page: 1 });

            if (enabled && !ownedCache) {
                fetchAllOwned();
            } else if (enabled && ownedCache) {
                renderOwnedPage();
            } else {
                // Switching back to normal mode
                var cached = cache[1];
                if (cached) {
                    store.set({
                        cards: cached.cards,
                        totalPages: cached.meta.totalPages || 0,
                        quantityMap: cached.quantityMap,
                    });
                    renderAndSettle();
                } else {
                    navigate(1, null);
                }
            }
        }

        function fetchAllOwned() {
            store.setPhase('loading');
            AjaxUtils.showSpinner(resultsEl);

            fetchPage(1, 1000, function (err, cards, meta, quantityMap) {
                if (err) {
                    if (typeof AjaxUtils !== 'undefined' && AjaxUtils.showError) {
                        AjaxUtils.showError(resultsEl, 'Failed to load cards');
                    }
                    store.setPhase('idle');
                    return;
                }
                var allCards = cards.slice();
                var allQtyMap = {};
                for (var k in quantityMap) {
                    if (quantityMap.hasOwnProperty(k)) allQtyMap[k] = quantityMap[k];
                }

                var totalPages = meta.totalPages || 1;
                if (totalPages <= 1) {
                    buildOwnedCache(allCards, allQtyMap);
                    return;
                }

                var remaining = totalPages - 1;
                var done = 0;
                for (var p = 2; p <= totalPages; p++) {
                    fetchPage(p, 1000, function (pageErr, moreCards, moreMeta, moreQtyMap) {
                        if (!pageErr) {
                            allCards = allCards.concat(moreCards);
                            for (var k in moreQtyMap) {
                                if (moreQtyMap.hasOwnProperty(k)) allQtyMap[k] = moreQtyMap[k];
                            }
                        }
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
            store.set({ page: 1 });
            store.setPhase('rendering');
            renderOwnedPage();
        }

        function renderOwnedPage() {
            var state = store.get();
            var start = (state.page - 1) * limit;
            var pageCards = ownedCache.cards.slice(start, start + limit);
            var totalPages = Math.max(1, Math.ceil(ownedCache.cards.length / limit));

            store.set({
                cards: pageCards,
                totalPages: totalPages,
                quantityMap: ownedCache.quantityMap,
            });

            renderAndSettle();
        }

        // --- Cache patching ---

        function patchQuantity(cardId, isFoil, quantity) {
            // Build updated entry
            var state = store.get();
            var oldEntry = state.quantityMap[cardId] || {
                cardId: cardId,
                normalQuantity: 0,
                foilQuantity: 0,
            };
            var newEntry = {
                cardId: cardId,
                normalQuantity: isFoil ? oldEntry.normalQuantity : quantity,
                foilQuantity: isFoil ? quantity : oldEntry.foilQuantity,
            };

            // Update current state with new quantityMap
            var newQm = {};
            for (var k in state.quantityMap) {
                if (state.quantityMap.hasOwnProperty(k)) {
                    newQm[k] = state.quantityMap[k];
                }
            }
            newQm[cardId] = newEntry;
            store.set({ quantityMap: newQm });

            // Update all cached pages
            for (var pg in cache) {
                if (cache.hasOwnProperty(pg) && cache[pg].quantityMap[cardId]) {
                    cache[pg].quantityMap[cardId] = {
                        cardId: cardId,
                        normalQuantity: newEntry.normalQuantity,
                        foilQuantity: newEntry.foilQuantity,
                    };
                }
            }

            // Update owned cache
            if (ownedCache) {
                if (ownedCache.quantityMap[cardId]) {
                    ownedCache.quantityMap[cardId] = {
                        cardId: cardId,
                        normalQuantity: newEntry.normalQuantity,
                        foilQuantity: newEntry.foilQuantity,
                    };
                }

                // Update owned card membership if ownedOnly is active
                if (store.get().ownedOnly) {
                    var isNowOwned = newEntry.normalQuantity > 0 || newEntry.foilQuantity > 0;
                    var idx = -1;
                    for (var i = 0; i < ownedCache.cards.length; i++) {
                        if (ownedCache.cards[i].id === cardId) {
                            idx = i;
                            break;
                        }
                    }
                    if (!isNowOwned && idx !== -1) {
                        ownedCache.cards.splice(idx, 1);
                        store.setPhase('rendering');
                        renderOwnedPage();
                    } else if (isNowOwned && idx === -1) {
                        // Card not in owned list — find it in normal cache
                        for (var cp in cache) {
                            if (cache.hasOwnProperty(cp)) {
                                for (var ci = 0; ci < cache[cp].cards.length; ci++) {
                                    if (cache[cp].cards[ci].id === cardId) {
                                        ownedCache.cards.push(cache[cp].cards[ci]);
                                        store.setPhase('rendering');
                                        renderOwnedPage();
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // --- Navigation handlers ---

        function setupNavHandlers() {
            var sideBtns = resultsEl.querySelectorAll('.binder-side-btn');
            for (var i = 0; i < sideBtns.length; i++) {
                sideBtns[i].addEventListener('click', handleSideBtn);
            }

            var nav = resultsEl.querySelector('.binder-page-nav');
            if (!nav) return;

            nav.addEventListener('click', function (e) {
                var btn = e.target.closest('.binder-page-btn');
                if (!btn || btn.disabled) return;
                e.preventDefault();
                handleNavDir(btn.getAttribute('data-dir'));
            });

            var pageInput = nav.querySelector('.binder-page-input');
            if (pageInput) {
                pageInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        var state = store.get();
                        var val = parseInt(this.value, 10);
                        if (val >= 1 && val <= state.totalPages && val !== state.page) {
                            var direction = val > state.page ? 'right' : 'left';
                            navigate(val, direction);
                        } else {
                            this.value = state.page;
                        }
                    }
                });
                pageInput.addEventListener('blur', function () {
                    this.value = store.get().page;
                });
            }
        }

        function handleSideBtn(e) {
            var btn = e.target.closest('.binder-side-btn');
            if (!btn || btn.disabled) return;
            e.preventDefault();
            handleNavDir(btn.getAttribute('data-dir'));
        }

        function handleNavDir(dir) {
            var state = store.get();
            if (dir === 'prev' && state.page > 1) {
                navigate(state.page - 1, 'left');
            } else if (dir === 'next' && state.page < state.totalPages) {
                navigate(state.page + 1, 'right');
            }
        }

        // --- Lifecycle ---

        function activate() {
            active = true;
        }

        function deactivate() {
            active = false;
        }

        function invalidateCache() {
            cache = {};
            ownedCache = null;
        }

        function destroy() {
            active = false;
        }

        return {
            navigate: navigate,
            getPhase: getPhase,
            getState: getState,
            patchQuantity: patchQuantity,
            setOwnedOnly: setOwnedOnly,
            activate: activate,
            deactivate: deactivate,
            invalidateCache: invalidateCache,
            destroy: destroy,
        };
    }

    window.BinderCore = {
        create: create,
    };
})();
