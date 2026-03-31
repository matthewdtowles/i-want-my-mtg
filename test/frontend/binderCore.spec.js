/**
 * @jest-environment jsdom
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

// Mock AjaxUtils
window.AjaxUtils = {
    createStepperGroup: function () { return '<div class="inv-stepper-group"></div>'; },
    showSpinner: function (el) { el.innerHTML = '<div class="spinner"></div>'; },
    renderEmptyState: function (el, opts) { el.innerHTML = '<div>' + (opts.message || 'Empty') + '</div>'; },
};

// Load dependencies
require('../../src/http/public/js/appState.js');
require('../../src/http/public/js/binderRenderer.js');

// Track fetch calls
var fetchCalls = [];
var fetchResponses = {};

function mockFetch(url) {
    fetchCalls.push(url);
    var response = fetchResponses[url] || fetchResponses['*'] || { success: true, data: [], meta: {} };
    return Promise.resolve({
        ok: true,
        json: function () { return Promise.resolve(response); },
    });
}

beforeEach(function () {
    fetchCalls = [];
    fetchResponses = {};
    window.fetch = mockFetch;
    delete window.BinderCore;
    document.body.innerHTML = '';
    jest.resetModules();
});

function loadBinderCore() {
    require('../../src/http/public/js/binderCore.js');
    return window.BinderCore;
}

function createContainer() {
    var el = document.createElement('div');
    el.id = 'test-binder';
    document.body.appendChild(el);
    return el;
}

function makeCardData(count) {
    var cards = [];
    for (var i = 1; i <= count; i++) {
        cards.push({
            id: 'card-' + i,
            name: 'Card ' + i,
            number: String(i),
            imgSrc: 'a/b/' + i + '.jpg',
            hasFoil: true,
            hasNonFoil: true,
        });
    }
    return cards;
}

function makeQuantityData(cards, quantities) {
    return cards.map(function (c, i) {
        return {
            cardId: c.id,
            normalQuantity: (quantities && quantities[i]) || 0,
            foilQuantity: 0,
        };
    });
}

function setupFetchResponses(cards, totalPages, inventoryData) {
    totalPages = totalPages || 1;
    // Cards endpoint
    fetchResponses['*'] = {
        success: true,
        data: cards,
        meta: { page: 1, totalPages: totalPages, totalItems: cards.length * totalPages },
    };
    // Inventory endpoint - match any quantities URL
    if (inventoryData) {
        var origFetch = window.fetch;
        window.fetch = function (url) {
            fetchCalls.push(url);
            if (url.indexOf('/inventory/quantities') !== -1) {
                return Promise.resolve({
                    ok: true,
                    json: function () {
                        return Promise.resolve({ success: true, data: inventoryData });
                    },
                });
            }
            return origFetch(url);
        };
    }
}

describe('BinderCore', function () {

    describe('create', function () {
        it('should create a machine instance with expected methods', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: true,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });
            expect(typeof machine.navigate).toBe('function');
            expect(typeof machine.getPhase).toBe('function');
            expect(typeof machine.getState).toBe('function');
            expect(typeof machine.patchQuantity).toBe('function');
            expect(typeof machine.setOwnedOnly).toBe('function');
            expect(typeof machine.activate).toBe('function');
            expect(typeof machine.deactivate).toBe('function');
            expect(typeof machine.destroy).toBe('function');
        });

        it('should start in idle phase', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });
            expect(machine.getPhase()).toBe('idle');
        });
    });

    describe('navigate', function () {
        it('should transition to loading phase on navigate', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            setupFetchResponses(cards, 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.navigate(1, null);
            expect(machine.getPhase()).toBe('loading');
        });

        it('should reject navigation during non-idle phase', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            setupFetchResponses(cards, 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.navigate(1, null);
            expect(machine.getPhase()).toBe('loading');
            // Second navigate should be rejected
            var result = machine.navigate(2, 'right');
            expect(result).toBe(false);
        });

        it('should fetch cards from API', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            setupFetchResponses(makeCardData(3), 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.navigate(1, null);
            var cardsUrl = fetchCalls.find(function (u) { return u.indexOf('/sets/mkm/cards') !== -1; });
            expect(cardsUrl).toBeTruthy();
            expect(cardsUrl).toContain('page=1');
            expect(cardsUrl).toContain('limit=9');
        });

        it('should return to idle after fetch and render complete', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            setupFetchResponses(cards, 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                onIdle: function () {
                    expect(machine.getPhase()).toBe('idle');
                    expect(container.innerHTML).toContain('binder-wrapper');
                    done();
                },
            });

            machine.navigate(1, null);
        });

        it('should use cache on second visit to same page', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            setupFetchResponses(cards, 3);

            var idleCount = 0;
            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                onIdle: function () {
                    idleCount++;
                    if (idleCount === 1) {
                        var fetchCountAfterFirst = fetchCalls.length;
                        // Navigate to page 1 again - should use cache
                        machine.navigate(1, null);
                        // Cache hit renders synchronously, so still same fetch count
                        setTimeout(function () {
                            expect(fetchCalls.length).toBe(fetchCountAfterFirst);
                            done();
                        }, 50);
                    }
                },
            });

            machine.navigate(1, null);
        });

        it('should set phase to rendering on cache hit to prevent interleaved navigations', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            setupFetchResponses(cards, 3);

            var idleCount = 0;
            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                onIdle: function () {
                    idleCount++;
                    if (idleCount === 1) {
                        // Navigate again (cache hit) - phase should be rendering
                        machine.navigate(1, 'right');
                        expect(machine.getPhase()).toBe('rendering');
                        // Second navigate during rendering should be rejected
                        var result = machine.navigate(1, 'right');
                        expect(result).toBe(false);
                        done();
                    }
                },
            });

            machine.navigate(1, null);
        });
    });

    describe('error handling', function () {
        it('should show error state and return to idle on fetch failure', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();

            // Make fetch fail
            window.fetch = function (url) {
                fetchCalls.push(url);
                return Promise.reject(new Error('Network error'));
            };

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.navigate(1, null);

            setTimeout(function () {
                expect(machine.getPhase()).toBe('idle');
                expect(container.innerHTML).toContain('Failed to load cards');
                done();
            }, 50);
        });
    });

    describe('patchQuantity', function () {
        it('should update cached quantityMap for a card', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            var inventoryData = makeQuantityData(cards, [0, 0, 0]);
            setupFetchResponses(cards, 1, inventoryData);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: true,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                fetchInventory: true,
                onIdle: function () {
                    // Patch card-1 quantity
                    machine.patchQuantity('card-1', false, 3);
                    var state = machine.getState();
                    expect(state.quantityMap['card-1'].normalQuantity).toBe(3);
                    done();
                },
            });

            machine.navigate(1, null);
        });

        it('should update foil quantity when isFoil is true', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(2);
            var inventoryData = makeQuantityData(cards, [0, 0]);
            setupFetchResponses(cards, 1, inventoryData);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: true,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                fetchInventory: true,
                onIdle: function () {
                    machine.patchQuantity('card-1', true, 2);
                    var state = machine.getState();
                    expect(state.quantityMap['card-1'].foilQuantity).toBe(2);
                    done();
                },
            });

            machine.navigate(1, null);
        });

        it('should create new quantityMap object instead of mutating existing state', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(2);
            var inventoryData = makeQuantityData(cards, [1, 0]);
            setupFetchResponses(cards, 1, inventoryData);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: true,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                fetchInventory: true,
                onIdle: function () {
                    var stateBefore = machine.getState();
                    var qmBefore = stateBefore.quantityMap;
                    machine.patchQuantity('card-1', false, 5);
                    var stateAfter = machine.getState();
                    // The quantityMap reference should be a new object
                    expect(stateAfter.quantityMap).not.toBe(qmBefore);
                    expect(stateAfter.quantityMap['card-1'].normalQuantity).toBe(5);
                    done();
                },
            });

            machine.navigate(1, null);
        });
    });

    describe('activate / deactivate', function () {
        it('should reject navigation when deactivated', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            setupFetchResponses(makeCardData(3), 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.deactivate();
            var result = machine.navigate(1, null);
            expect(result).toBe(false);
        });

        it('should allow navigation after reactivation', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            setupFetchResponses(makeCardData(3), 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.deactivate();
            machine.activate();
            var result = machine.navigate(1, null);
            expect(result).not.toBe(false);
        });
    });

    describe('setOwnedOnly', function () {
        it('should fetch all cards when owned-only is enabled', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            var inventoryData = [
                { cardId: 'card-1', normalQuantity: 2, foilQuantity: 0 },
                { cardId: 'card-2', normalQuantity: 0, foilQuantity: 0 },
                { cardId: 'card-3', normalQuantity: 1, foilQuantity: 0 },
            ];
            setupFetchResponses(cards, 1, inventoryData);

            var idleCount = 0;
            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: true,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                fetchInventory: true,
                hasOwnedOnly: true,
                onIdle: function () {
                    idleCount++;
                    if (idleCount === 1) {
                        // Enable owned-only mode
                        machine.setOwnedOnly(true);
                    } else if (idleCount === 2) {
                        // Should only show owned cards
                        var state = machine.getState();
                        expect(state.ownedOnly).toBe(true);
                        done();
                    }
                },
            });

            machine.navigate(1, null);
        });
    });

    describe('patchQuantity for previously-unowned card', function () {
        it('should create a new quantityMap entry for a card not yet in the map', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(2);
            var inventoryData = makeQuantityData(cards, [0, 0]);
            setupFetchResponses(cards, 1, inventoryData);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: true,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                fetchInventory: true,
                onIdle: function () {
                    // Simulate inventory update event
                    machine.patchQuantity('card-1', false, 5);
                    var state = machine.getState();
                    expect(state.quantityMap['card-1'].normalQuantity).toBe(5);
                    done();
                },
            });

            machine.navigate(1, null);
        });
    });

    describe('scroll behavior', function () {
        it('should not scroll on initial load (no direction)', function (done) {
            var BC = loadBinderCore();
            var container = createContainer();
            var cards = makeCardData(3);
            setupFetchResponses(cards, 3);
            var scrollCalled = false;
            window.scrollTo = function () { scrollCalled = true; };

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
                onIdle: function () {
                    expect(scrollCalled).toBe(false);
                    done();
                },
            });

            machine.navigate(1, null);
        });
    });

    describe('showSpinner on initial load', function () {
        it('should show spinner on first load (no direction)', function () {
            var BC = loadBinderCore();
            var container = createContainer();
            setupFetchResponses(makeCardData(3), 3);

            var machine = BC.create({
                containerEl: container,
                resultsEl: container,
                setCode: 'mkm',
                authenticated: false,
                apiPath: '/api/v1/sets/mkm/cards',
                limit: 9,
            });

            machine.navigate(1, null);
            expect(container.innerHTML).toContain('spinner');
        });
    });
});
