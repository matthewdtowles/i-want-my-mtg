/**
 * @jest-environment jsdom
 */

var fetchMock;
var observeCallbacks = [];

beforeEach(function () {
    jest.resetModules();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    observeCallbacks = [];

    // Mock IntersectionObserver to trigger immediately
    global.IntersectionObserver = jest.fn(function (callback) {
        observeCallbacks.push(callback);
        return {
            observe: function () {
                // Simulate intersection immediately
                callback([{ isIntersecting: true }]);
            },
            disconnect: jest.fn(),
        };
    });
});

afterEach(function () {
    delete global.fetch;
    delete global.IntersectionObserver;
});

function setupDom(setCode, authenticated) {
    var authAttr = authenticated ? ' data-authenticated="true"' : '';
    document.body.innerHTML =
        '<section id="sealed-products-section" data-set-code="' + (setCode || 'blb') + '"' + authAttr + '>' +
        '<div id="sealed-products-list">Loading...</div>' +
        '</section>';
}

function loadScript() {
    require('../../src/http/public/js/sealedProductsLoader.js');
}

function mockFetchResponse(data, success) {
    fetchMock.mockResolvedValueOnce({
        json: function () {
            return Promise.resolve({
                success: success !== false,
                data: data,
            });
        },
    });
}

describe('sealedProductsLoader', function () {
    test('fetches sealed products for the set code', function () {
        setupDom('blb');
        mockFetchResponse([]);
        loadScript();

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/v1/sets/blb/sealed-products?limit=100',
            { credentials: 'same-origin' }
        );
    });

    test('hides section when no products returned', function () {
        setupDom('blb');
        mockFetchResponse([]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var section = document.getElementById('sealed-products-section');
                expect(section.style.display).toBe('none');
                resolve();
            }, 10);
        });
    });

    test('renders product cards with name and price', function () {
        setupDom('blb');
        mockFetchResponse([
            {
                uuid: 'abc-123',
                name: 'Draft Booster Box',
                setCode: 'blb',
                category: 'booster_box',
                subtype: 'draft',
                contentsSummary: '36x Draft Booster Pack',
                price: { price: 99.99 },
            },
        ]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).toContain('Draft Booster Box');
                expect(list.innerHTML).toContain('$99.99');
                expect(list.innerHTML).toContain('Booster Box');
                expect(list.innerHTML).toContain('Draft');
                expect(list.innerHTML).toContain('36x Draft Booster Pack');
                expect(list.innerHTML).toContain('/sealed-products/abc-123');
                resolve();
            }, 10);
        });
    });

    test('renders multiple products in a grid', function () {
        setupDom('blb');
        mockFetchResponse([
            { uuid: 'a', name: 'Product A', setCode: 'blb' },
            { uuid: 'b', name: 'Product B', setCode: 'blb' },
        ]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).toContain('Product A');
                expect(list.innerHTML).toContain('Product B');
                expect(list.innerHTML).toContain('grid');
                resolve();
            }, 10);
        });
    });

    test('shows error message on fetch failure', function () {
        setupDom('blb');
        fetchMock.mockRejectedValueOnce(new Error('Network error'));
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).toContain('Failed to load sealed products');
                resolve();
            }, 10);
        });
    });

    test('does nothing when container is missing', function () {
        document.body.innerHTML = '';
        loadScript();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('escapes HTML in product names', function () {
        setupDom('blb');
        mockFetchResponse([
            { uuid: 'x', name: '<script>alert("xss")</script>', setCode: 'blb' },
        ]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).not.toContain('<script>');
                expect(list.innerHTML).toContain('&lt;script&gt;');
                resolve();
            }, 10);
        });
    });

    test('formats category with underscores to title case', function () {
        setupDom('blb');
        mockFetchResponse([
            { uuid: 'y', name: 'Test', setCode: 'blb', category: 'booster_box' },
        ]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).toContain('Booster Box');
                resolve();
            }, 10);
        });
    });

    test('renders stepper when authenticated', function () {
        setupDom('blb', true);
        mockFetchResponse([
            { uuid: 'abc-123', name: 'Draft Booster Box', setCode: 'blb' },
        ]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).toContain('sealed-inv-stepper');
                expect(list.innerHTML).toContain('data-sealed-uuid="abc-123"');
                expect(list.innerHTML).toContain('sealed-inv-btn--inc');
                expect(list.innerHTML).toContain('sealed-inv-btn--dec');
                resolve();
            }, 10);
        });
    });

    test('does not render stepper when not authenticated', function () {
        setupDom('blb', false);
        mockFetchResponse([
            { uuid: 'abc-123', name: 'Draft Booster Box', setCode: 'blb' },
        ]);
        loadScript();

        return new Promise(function (resolve) {
            setTimeout(function () {
                var list = document.getElementById('sealed-products-list');
                expect(list.innerHTML).not.toContain('sealed-inv-stepper');
                resolve();
            }, 10);
        });
    });
});
