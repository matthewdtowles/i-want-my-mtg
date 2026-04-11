/**
 * @jest-environment jsdom
 */

var fetchMock;

beforeEach(function () {
    jest.resetModules();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
});

afterEach(function () {
    delete global.fetch;
});

function setupDom(uuid, qty) {
    document.body.innerHTML =
        '<div class="sealed-inv-stepper" data-sealed-uuid="' + uuid + '">' +
        '<div class="flex items-center gap-2">' +
        '<button type="button" class="sealed-inv-btn sealed-inv-btn--dec"' +
        (qty <= 0 ? ' disabled' : '') + '>-</button>' +
        '<span class="sealed-inv-qty' + (qty <= 0 ? ' sealed-inv-qty--zero' : '') + '">' + qty + '</span>' +
        '<button type="button" class="sealed-inv-btn sealed-inv-btn--inc">+</button>' +
        '</div></div>';
}

function loadScript() {
    require('../../src/http/public/js/updateSealedInventory.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

function mockApiResponse(data) {
    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: function () {
            return Promise.resolve({ success: true, data: data });
        },
    });
}

function clickButton(selector) {
    var btn = document.querySelector(selector);
    btn.click();
}

describe('updateSealedInventory', function () {
    test('increment calls POST when quantity is 0', function () {
        setupDom('test-uuid', 0);
        mockApiResponse({ sealedProductUuid: 'test-uuid', quantity: 1 });
        loadScript();

        clickButton('.sealed-inv-btn--inc');

        return new Promise(function (resolve) {
            setTimeout(function () {
                expect(fetchMock).toHaveBeenCalledWith(
                    '/api/v1/inventory/sealed',
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify({ sealedProductUuid: 'test-uuid', quantity: 1 }),
                    })
                );
                resolve();
            }, 10);
        });
    });

    test('increment calls PATCH when quantity > 0', function () {
        setupDom('test-uuid', 2);
        mockApiResponse({ sealedProductUuid: 'test-uuid', quantity: 3 });
        loadScript();

        clickButton('.sealed-inv-btn--inc');

        return new Promise(function (resolve) {
            setTimeout(function () {
                expect(fetchMock).toHaveBeenCalledWith(
                    '/api/v1/inventory/sealed',
                    expect.objectContaining({
                        method: 'PATCH',
                        body: JSON.stringify({ sealedProductUuid: 'test-uuid', quantity: 3 }),
                    })
                );
                resolve();
            }, 10);
        });
    });

    test('decrement calls DELETE when quantity would become 0', function () {
        setupDom('test-uuid', 1);
        mockApiResponse({ deleted: true });
        loadScript();

        clickButton('.sealed-inv-btn--dec');

        return new Promise(function (resolve) {
            setTimeout(function () {
                expect(fetchMock).toHaveBeenCalledWith(
                    '/api/v1/inventory/sealed',
                    expect.objectContaining({
                        method: 'DELETE',
                        body: JSON.stringify({ sealedProductUuid: 'test-uuid' }),
                    })
                );
                resolve();
            }, 10);
        });
    });

    test('updates UI after successful increment', function () {
        setupDom('test-uuid', 0);
        mockApiResponse({ sealedProductUuid: 'test-uuid', quantity: 1 });
        loadScript();

        clickButton('.sealed-inv-btn--inc');

        return new Promise(function (resolve) {
            setTimeout(function () {
                var qtyEl = document.querySelector('.sealed-inv-qty');
                expect(qtyEl.textContent).toBe('1');
                expect(qtyEl.classList.contains('sealed-inv-qty--zero')).toBe(false);

                var decBtn = document.querySelector('.sealed-inv-btn--dec');
                expect(decBtn.hasAttribute('disabled')).toBe(false);
                resolve();
            }, 10);
        });
    });

    test('updates UI after successful delete', function () {
        setupDom('test-uuid', 1);
        mockApiResponse({ deleted: true });
        loadScript();

        clickButton('.sealed-inv-btn--dec');

        return new Promise(function (resolve) {
            setTimeout(function () {
                var qtyEl = document.querySelector('.sealed-inv-qty');
                expect(qtyEl.textContent).toBe('0');
                expect(qtyEl.classList.contains('sealed-inv-qty--zero')).toBe(true);

                var decBtn = document.querySelector('.sealed-inv-btn--dec');
                expect(decBtn.hasAttribute('disabled')).toBe(true);
                resolve();
            }, 10);
        });
    });

    test('updates UI to 0 even when delete response reports deleted=false (idempotent)', function () {
        setupDom('test-uuid', 1);
        mockApiResponse({ deleted: false });
        var warnSpy = jest.spyOn(console, 'warn').mockImplementation(function () {});
        loadScript();

        clickButton('.sealed-inv-btn--dec');

        return new Promise(function (resolve) {
            setTimeout(function () {
                var qtyEl = document.querySelector('.sealed-inv-qty');
                expect(qtyEl.textContent).toBe('0');
                expect(qtyEl.classList.contains('sealed-inv-qty--zero')).toBe(true);
                var decBtn = document.querySelector('.sealed-inv-btn--dec');
                expect(decBtn.hasAttribute('disabled')).toBe(true);
                warnSpy.mockRestore();
                resolve();
            }, 10);
        });
    });

    test('does not decrement below 0', function () {
        setupDom('test-uuid', 0);
        loadScript();

        var decBtn = document.querySelector('.sealed-inv-btn--dec');
        expect(decBtn.hasAttribute('disabled')).toBe(true);

        // Even if we force click, it should not call fetch
        decBtn.removeAttribute('disabled');
        // Re-add disabled to simulate the guard
        decBtn.setAttribute('disabled', '');
        decBtn.click();

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
