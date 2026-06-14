/**
 * @jest-environment jsdom
 */

function setupDom(defaultBonus) {
    document.body.innerHTML =
        '<section id="optimizer-root" data-default-bonus="' + defaultBonus + '">' +
        '<input id="bonus-input" type="number" />' +
        '<div id="store-credit"></div>' +
        '<div id="store-credit-sub"></div>' +
        '<div id="cash-oop"></div>' +
        '<div id="credit-oop"></div>' +
        '<div id="credit-advantage"></div>' +
        '<div id="locked-credit"></div>' +
        '<div id="recommendation"></div>' +
        '<a id="export-link" href="/optimizer/export.csv?bonus=0.3"></a>' +
        '</section>';
}

// The jsdom document persists across tests, so each require would stack another
// DOMContentLoaded listener. Capture them instead of registering on document and
// run only the freshly-required one.
var domReadyHandlers = [];

function loadScript() {
    jest.resetModules();
    domReadyHandlers = [];
    require('../../src/http/public/js/optimizer.js');
    domReadyHandlers.forEach(function (cb) { cb(); });
}

function jsonResponse(data) {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ success: true, data: data }); } });
}

// Flush several microtask ticks (the fetch chain resolves over a few hops).
function flushPromises() {
    var p = Promise.resolve();
    for (var i = 0; i < 5; i++) p = p.then(function () {});
    return p;
}

describe('optimizer.js', function () {
    var realAddEventListener;

    beforeEach(function () {
        jest.useFakeTimers();
        global.fetch = jest.fn();
        realAddEventListener = document.addEventListener.bind(document);
        jest.spyOn(document, 'addEventListener').mockImplementation(function (type, cb, opts) {
            if (type === 'DOMContentLoaded') domReadyHandlers.push(cb);
            else realAddEventListener(type, cb, opts);
        });
    });

    afterEach(function () {
        document.addEventListener.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
        delete global.fetch;
    });

    it('seeds the input from the default bonus and does not fetch on load', function () {
        setupDom(0.3);
        loadScript();
        expect(document.getElementById('bonus-input').value).toBe('30');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('debounces and fetches the API with the bonus as a fraction on change', function () {
        setupDom(0.3);
        global.fetch.mockReturnValue(jsonResponse({}));
        loadScript();

        var input = document.getElementById('bonus-input');
        input.value = '50';
        input.dispatchEvent(new Event('input'));
        input.value = '60';
        input.dispatchEvent(new Event('input'));

        // Debounced: nothing fired yet, and only one call after the window.
        expect(global.fetch).not.toHaveBeenCalled();
        jest.advanceTimersByTime(250);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toBe('/api/v1/optimizer?bonus=0.6');
        expect(global.fetch.mock.calls[0][1].credentials).toBe('same-origin');
    });

    it('renders the recommendation and tiles from the API response', async function () {
        setupDom(0.3);
        global.fetch.mockReturnValue(
            jsonResponse({
                cashValue: 14,
                storeCredit: 18.2,
                buyListRetail: 40,
                cashOutOfPocket: 26,
                creditOutOfPocket: 21.8,
                creditAdvantage: 4.2,
                cashLeftover: 0,
                lockedCredit: 0,
                recommendCredit: true,
            })
        );
        loadScript();

        var input = document.getElementById('bonus-input');
        input.value = '30';
        input.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(250);
        await flushPromises();

        expect(document.getElementById('store-credit').textContent).toBe('$18.20');
        expect(document.getElementById('store-credit-sub').textContent).toBe('+$4.20 vs cash');
        expect(document.getElementById('credit-advantage').textContent).toBe('$4.20');
        expect(document.getElementById('recommendation').innerHTML).toContain('Take store credit');
    });

    it('clamps an over-cap bonus to 200% (2.0) for fetch and export', function () {
        setupDom(0.3);
        global.fetch.mockReturnValue(jsonResponse({}));
        loadScript();

        var input = document.getElementById('bonus-input');
        input.value = '300';
        input.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(250);

        expect(global.fetch.mock.calls[0][0]).toBe('/api/v1/optimizer?bonus=2');
        expect(document.getElementById('export-link').getAttribute('href')).toBe(
            '/optimizer/export.csv?bonus=2'
        );
    });

    it('updates the export link immediately, independent of the fetch', function () {
        setupDom(0.3);
        global.fetch.mockReturnValue(jsonResponse({}));
        loadScript();

        var input = document.getElementById('bonus-input');
        input.value = '50';
        input.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(250);

        expect(document.getElementById('export-link').getAttribute('href')).toBe(
            '/optimizer/export.csv?bonus=0.5'
        );
    });

    it('ignores a stale response when a newer request has been made', async function () {
        setupDom(0.3);
        var resolveFirst;
        // Request #1 stays pending until we release it; request #2 resolves now.
        var firstGate = new Promise(function (r) { resolveFirst = r; });
        global.fetch
            .mockReturnValueOnce(
                firstGate.then(function () {
                    return { ok: true, json: function () { return Promise.resolve({ data: { storeCredit: 1, cashValue: 0 } }); } };
                })
            )
            .mockReturnValueOnce(jsonResponse({ storeCredit: 99, cashValue: 0 }));

        loadScript();
        var input = document.getElementById('bonus-input');

        input.value = '10';
        input.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(250); // fires request #1 (pending on the gate)
        input.value = '20';
        input.dispatchEvent(new Event('input'));
        jest.advanceTimersByTime(250); // fires request #2 (resolves immediately)
        await flushPromises();

        expect(document.getElementById('store-credit').textContent).toBe('$99.00');

        resolveFirst(); // let the now-stale request #1 resolve
        await flushPromises();

        // The stale response must not overwrite the newer one.
        expect(document.getElementById('store-credit').textContent).toBe('$99.00');
    });
});
