/**
 * @jest-environment jsdom
 *
 * Regression for #510: on the set page both updateInventory.js (card steppers)
 * and updateSealedInventory.js (sealed steppers) attach body click handlers, and
 * sealed stepper buttons reuse the generic .inv-stepper-btn classes. The card
 * handler must ignore sealed steppers so it never POSTs an empty cardId to
 * /inventory ("Invalid initialization: cardId is required").
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

// Mirrors the production sealed stepper markup (sealed-list.hbs): buttons carry
// BOTH sealed-inv-btn and inv-stepper-btn classes, nested in .inv-stepper inside
// .sealed-inv-stepper.
function setupSealedDom(uuid, qty) {
    document.body.innerHTML =
        '<div class="sealed-inv-stepper" data-sealed-uuid="' + uuid + '">' +
        '<div class="inv-stepper inv-stepper--sm">' +
        '<button type="button" class="sealed-inv-btn sealed-inv-btn--dec inv-stepper-btn inv-stepper-btn--dec"' +
        (qty <= 0 ? ' disabled' : '') + '>-</button>' +
        '<span class="sealed-inv-qty inv-stepper-qty' + (qty <= 0 ? ' sealed-inv-qty--zero inv-stepper-qty--zero' : '') + '">' + qty + '</span>' +
        '<button type="button" class="sealed-inv-btn sealed-inv-btn--inc inv-stepper-btn inv-stepper-btn--inc">+</button>' +
        '</div></div>';
}

// Load both scripts in the same order set.hbs does: card handler first.
function loadBothScripts() {
    require('../../src/http/public/js/updateInventory.js');
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

describe('sealed stepper / card stepper collision (#510)', function () {
    test('clicking a sealed stepper hits the sealed endpoint, never /inventory', function () {
        setupSealedDom('test-uuid', 0);
        mockApiResponse({ sealedProductUuid: 'test-uuid', quantity: 1 });
        loadBothScripts();

        document.querySelector('.sealed-inv-btn--inc').click();

        return new Promise(function (resolve) {
            setTimeout(function () {
                expect(fetchMock).toHaveBeenCalledTimes(1);
                expect(fetchMock).toHaveBeenCalledWith(
                    '/api/v1/inventory/sealed',
                    expect.objectContaining({ method: 'POST' })
                );
                var urls = fetchMock.mock.calls.map(function (c) {
                    return c[0];
                });
                expect(urls).not.toContain('/inventory');
                resolve();
            }, 10);
        });
    });
});
