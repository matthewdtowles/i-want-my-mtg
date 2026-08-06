/**
 * @jest-environment jsdom
 */

/**
 * Covers the "Load more" flow that replaced the horizontal scroll rows: the
 * grid grows, offsets advance, the button retires when the format runs out,
 * and a failed request doesn't leave a dead button behind.
 */

function section(opts) {
    var hasMore = opts.hasMore === undefined ? true : opts.hasMore;
    document.body.innerHTML =
        '<section class="deck-section" data-format="' +
        (opts.format || 'modern') +
        '" data-next-offset="' +
        (opts.nextOffset === undefined ? 12 : opts.nextOffset) +
        '" data-has-more="' +
        hasMore +
        '">' +
        '<div class="deck-section-grid"></div>' +
        (hasMore
            ? '<div class="deck-section-footer">' +
              '<button type="button" class="deck-section-more">Load more Modern decks</button>' +
              '</div>'
            : '') +
        '</section>' +
        '<div id="aria-live-announcer"></div>';
    return {
        grid: document.querySelector('.deck-section-grid'),
        button: document.querySelector('.deck-section-more'),
    };
}

function item(overrides) {
    return Object.assign(
        {
            id: 1,
            title: 'Boros Energy',
            url: '/published-decks/1',
            colors: [{ symbol: 'r', small: false }],
            tournamentName: 'RC Dallas',
            result: '1st',
            cardCount: 60,
            estimatedValue: '$412.00',
            coverImgSrc: 'https://cards.scryfall.io/art_crop/front/a/b/c.jpg',
        },
        overrides || {}
    );
}

function respondWith(payload) {
    global.fetch = jest.fn().mockResolvedValue({
        json: function () {
            return Promise.resolve(payload);
        },
    });
}

/**
 * Load the script and run its init once.
 *
 * The module wires itself on DOMContentLoaded, and jsdom keeps document-level
 * listeners across tests in a file — dispatching the event would re-run every
 * previously loaded copy too, double-binding the button. So capture this
 * instance's handler and call it directly.
 */
function load() {
    jest.resetModules();
    var handler = null;
    var original = document.addEventListener;
    document.addEventListener = function (type, callback) {
        if (type === 'DOMContentLoaded') {
            handler = callback;
            return;
        }
        return original.apply(document, arguments);
    };
    require('../../src/http/public/js/publishedDecks.js');
    document.addEventListener = original;
    if (handler) handler();
}

// jsdom has no layout, so it does not implement scrollIntoView.
Element.prototype.scrollIntoView = function () {};

/** Drain the fetch -> json() -> render promise chain. */
function flush() {
    return new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });
}

describe('publishedDecks "Load more"', function () {
    afterEach(function () {
        delete global.fetch;
        document.body.innerHTML = '';
    });

    it('appends the next batch and advances the offset', async function () {
        var els = section({ nextOffset: 12 });
        respondWith({
            success: true,
            data: { items: [item(), item({ id: 2 })], nextOffset: 24, hasMore: true },
        });
        load();

        els.button.click();
        await flush();

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toContain('offset=12');
        expect(global.fetch.mock.calls[0][0]).toContain('format=modern');
        expect(els.grid.querySelectorAll('.published-deck-card').length).toBe(2);

        // A second press asks for the next page, not the same one again.
        els.button.click();
        await flush();
        expect(global.fetch.mock.calls[1][0]).toContain('offset=24');
    });

    it('keeps focus on the button while there is more to load', async function () {
        var els = section({});
        respondWith({
            success: true,
            data: { items: [item(), item({ id: 2 })], nextOffset: 24, hasMore: true },
        });
        load();

        els.button.click();
        await flush();

        // Moving focus into the grid scrolled the page ~1700px in one jump.
        expect(document.activeElement).toBe(els.button);
        expect(document.getElementById('aria-live-announcer').textContent).toContain(
            '2 more decks'
        );
    });

    it('moves focus to the first new card only once the button retires', async function () {
        var els = section({});
        respondWith({
            success: true,
            data: { items: [item(), item({ id: 2 })], nextOffset: 24, hasMore: false },
        });
        load();

        els.button.click();
        await flush();

        var cards = els.grid.querySelectorAll('.published-deck-card');
        expect(document.activeElement).toBe(cards[0]);
    });

    it('renders the cover art, and omits the img when there is none', async function () {
        var els = section({});
        respondWith({
            success: true,
            data: {
                items: [item(), item({ id: 2, coverImgSrc: undefined })],
                nextOffset: 24,
                hasMore: false,
            },
        });
        load();

        els.button.click();
        await flush();

        var cards = els.grid.querySelectorAll('.published-deck-card');
        var firstImg = cards[0].querySelector('img');
        expect(firstImg.getAttribute('src')).toContain('art_crop');
        // Decorative art must not be announced separately from the title.
        expect(firstImg.getAttribute('alt')).toBe('');
        expect(firstImg.getAttribute('aria-hidden')).toBe('true');
        expect(cards[1].querySelector('img')).toBeNull();
    });

    it('retires the button once the format has no more decks', async function () {
        var els = section({});
        respondWith({ success: true, data: { items: [item()], nextOffset: 24, hasMore: false } });
        load();

        els.button.click();
        await flush();

        expect(document.querySelector('.deck-section-more')).toBeNull();
        expect(document.querySelector('.deck-section-footer')).toBeNull();
        expect(els.grid.querySelectorAll('.published-deck-card').length).toBe(1);
    });

    it('retires the button when the request fails rather than leaving it dead', async function () {
        var els = section({});
        global.fetch = jest.fn().mockRejectedValue(new Error('network'));
        load();

        els.button.click();
        await flush();

        expect(document.querySelector('.deck-section-more')).toBeNull();
    });

    it('ignores a section that has nothing more to load', function () {
        section({ hasMore: false });
        global.fetch = jest.fn();
        load();

        expect(document.querySelector('.deck-section-more')).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('escapes deck text rather than injecting it as markup', async function () {
        var els = section({});
        respondWith({
            success: true,
            data: {
                items: [item({ title: '<img src=x onerror=alert(1)>' })],
                nextOffset: 24,
                hasMore: false,
            },
        });
        load();

        els.button.click();
        await flush();

        expect(els.grid.querySelectorAll('img').length).toBe(1); // the cover only
        expect(els.grid.textContent).toContain('<img src=x onerror=alert(1)>');
    });
});
