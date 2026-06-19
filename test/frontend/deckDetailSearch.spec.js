/**
 * @jest-environment jsdom
 *
 * Frontend unit tests for the deck-page in-page card search (#536):
 * grouped query, inline add to main/sideboard, in-place DOM insertion +
 * total recompute, and quantity increment on re-add.
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

function escapeHtml(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// Per-test routing for fetchWithGate. Tests push handlers keyed by a URL match.
var fetchHandler = null;
var fetchCalls = [];

window.AjaxUtils = {
    escapeHtml: escapeHtml,
    fetchWithGate: function (url, options) {
        fetchCalls.push({ url: url, options: options || {} });
        return Promise.resolve(fetchHandler(url, options || {}));
    },
};

function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function flush() {
    return new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });
}

function setupDom(format) {
    document.body.innerHTML =
        '<div class="content-wrapper" data-deck-id="7" data-deck-format="' +
        (format || '') +
        '">' +
        '  <p><span id="deck-main-count">0</span> maindeck' +
        '     <span id="deck-side-wrap" class="hidden"><span>·</span><span id="deck-side-count">0</span> sideboard</span>' +
        '     <span id="deck-est-value">$0.00</span></p>' +
        '  <p id="deck-illegal-notice" class="hidden"><span id="deck-illegal-count">0</span></p>' +
        '  <input id="deck-card-search" type="text" aria-expanded="false" />' +
        '  <div id="deck-search-results" class="hidden"></div>' +
        '  <p id="deck-search-status" class="hidden"></p>' +
        '  <div id="deck-cards"><div id="deck-empty-state"></div></div>' +
        '</div>';
}

function loadScript() {
    jest.resetModules();
    require('../../src/http/public/js/deckDetail.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

// Mirrors the real grouped card API response shape: setCode + number, but NO
// `url` field (the client builds the detail path from setCode/number).
function card(overrides) {
    return Object.assign(
        {
            id: 'c1',
            name: 'Grizzly Bears',
            type: 'Creature',
            setCode: 'LEA',
            number: '1',
            imgSrc: 'bears.jpg',
            prices: { normal: 0.25, foil: null },
            legal: true,
        },
        overrides || {}
    );
}

beforeEach(function () {
    fetchHandler = null;
    fetchCalls = [];
});

describe('deck-page in-page search', function () {
    it('queries the grouped endpoint with the deck format and renders one result per name', async function () {
        setupDom('modern');
        loadScript();
        fetchHandler = function () {
            return { ok: true, gated: false, body: { data: [card()] } };
        };

        var input = document.getElementById('deck-card-search');
        input.value = 'bears';
        input.dispatchEvent(new Event('input'));
        await wait(300);
        await flush();

        var searchCall = fetchCalls.find(function (c) {
            return c.url.indexOf('groupBy=name') !== -1;
        });
        expect(searchCall).toBeDefined();
        expect(searchCall.url).toContain('q=bears');
        expect(searchCall.url).toContain('format=modern');

        var results = document.querySelectorAll('#deck-search-results .deck-result');
        expect(results.length).toBe(1);
        var link = results[0].querySelector('.card-name-link');
        expect(link.textContent).toBe('Grizzly Bears');
        expect(link.getAttribute('data-card-img')).toBe('bears.jpg');
        // URL is built client-side from setCode (lowercased) + number, not sent.
        expect(link.getAttribute('href')).toBe('/card/lea/1');
        expect(results[0].querySelectorAll('.deck-result-add').length).toBe(2);
        expect(document.getElementById('deck-search-results').classList.contains('hidden')).toBe(
            false
        );
    });

    it('does not query below the minimum character threshold', async function () {
        setupDom('');
        loadScript();
        fetchHandler = function () {
            return { ok: true, gated: false, body: { data: [] } };
        };

        var input = document.getElementById('deck-card-search');
        input.value = 'b';
        input.dispatchEvent(new Event('input'));
        await wait(300);
        await flush();

        expect(fetchCalls.length).toBe(0);
    });

    it('adds a card to the maindeck: creates the type group, inserts a row, updates totals', async function () {
        setupDom('modern');
        loadScript();
        fetchHandler = function (url, options) {
            if (url.indexOf('groupBy=name') !== -1) {
                return { ok: true, gated: false, body: { data: [card()] } };
            }
            // POST add
            return { ok: true, gated: false, body: { data: { added: true } } };
        };

        var input = document.getElementById('deck-card-search');
        input.value = 'bears';
        input.dispatchEvent(new Event('input'));
        await wait(300);
        await flush();

        var addBtn = document.querySelector('#deck-search-results .deck-result-add');
        addBtn.click();
        await flush();

        var postCall = fetchCalls.find(function (c) {
            return c.options.method === 'POST';
        });
        expect(postCall).toBeDefined();
        expect(JSON.parse(postCall.options.body)).toEqual({
            cardId: 'c1',
            isSideboard: false,
            quantity: 1,
        });

        var group = document.querySelector('#deck-cards .deck-group[data-group-type="Creature"]');
        expect(group).not.toBeNull();
        var rows = group.querySelectorAll('[data-card-id="c1"]');
        expect(rows.length).toBe(1);
        expect(rows[0].getAttribute('data-sideboard')).toBe('false');
        expect(rows[0].querySelector('.deck-qty-val').textContent).toBe('1');
        expect(rows[0].querySelector('.card-name-link').getAttribute('href')).toBe('/card/lea/1');

        expect(document.getElementById('deck-main-count').textContent).toBe('1');
        expect(document.getElementById('deck-est-value').textContent).toBe('$0.25');
        expect(document.getElementById('deck-empty-state').classList.contains('hidden')).toBe(true);
    });

    it('increments quantity when the same card is added again', async function () {
        setupDom('modern');
        loadScript();
        fetchHandler = function (url) {
            if (url.indexOf('groupBy=name') !== -1) {
                return { ok: true, gated: false, body: { data: [card()] } };
            }
            return { ok: true, gated: false, body: { data: { added: true } } };
        };

        var input = document.getElementById('deck-card-search');
        input.value = 'bears';
        input.dispatchEvent(new Event('input'));
        await wait(300);
        await flush();

        var addBtn = document.querySelector('#deck-search-results .deck-result-add');
        addBtn.click();
        await flush();
        addBtn.click();
        await flush();

        var rows = document.querySelectorAll('#deck-cards [data-card-id="c1"][data-sideboard="false"]');
        expect(rows.length).toBe(1);
        expect(rows[0].querySelector('.deck-qty-val').textContent).toBe('2');
        expect(document.getElementById('deck-main-count').textContent).toBe('2');
        expect(document.getElementById('deck-est-value').textContent).toBe('$0.50');
    });

    it('adds to the sideboard and reveals the sideboard count', async function () {
        setupDom('modern');
        loadScript();
        fetchHandler = function (url) {
            if (url.indexOf('groupBy=name') !== -1) {
                return { ok: true, gated: false, body: { data: [card()] } };
            }
            return { ok: true, gated: false, body: { data: { added: true } } };
        };

        var input = document.getElementById('deck-card-search');
        input.value = 'bears';
        input.dispatchEvent(new Event('input'));
        await wait(300);
        await flush();

        var sbBtn = document.querySelectorAll('#deck-search-results .deck-result-add')[1];
        sbBtn.click();
        await flush();

        var sbGroup = document.querySelector('#deck-cards .deck-group[data-group-type="Sideboard"]');
        expect(sbGroup).not.toBeNull();
        expect(sbGroup.querySelector('[data-card-id="c1"]').getAttribute('data-sideboard')).toBe(
            'true'
        );
        expect(document.getElementById('deck-side-count').textContent).toBe('1');
        expect(document.getElementById('deck-side-wrap').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('deck-main-count').textContent).toBe('0');
    });

    it('flags an illegal card with a badge and updates the illegal notice', async function () {
        setupDom('standard');
        loadScript();
        fetchHandler = function (url) {
            if (url.indexOf('groupBy=name') !== -1) {
                return { ok: true, gated: false, body: { data: [card({ legal: false })] } };
            }
            return { ok: true, gated: false, body: { data: { added: true } } };
        };

        var input = document.getElementById('deck-card-search');
        input.value = 'bears';
        input.dispatchEvent(new Event('input'));
        await wait(300);
        await flush();

        document.querySelector('#deck-search-results .deck-result-add').click();
        await flush();

        var row = document.querySelector('#deck-cards [data-card-id="c1"]');
        expect(row.querySelector('.deck-illegal-badge')).not.toBeNull();
        expect(document.getElementById('deck-illegal-count').textContent).toBe('1');
        expect(document.getElementById('deck-illegal-notice').classList.contains('hidden')).toBe(
            false
        );
    });
});
