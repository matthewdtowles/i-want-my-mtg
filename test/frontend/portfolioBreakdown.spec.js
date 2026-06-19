/**
 * @jest-environment jsdom
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

var fetchGateImpl;

window.AjaxUtils = {
    escapeHtml: function (str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },
    toDollar: function (amount) {
        if (amount == null || amount === 0) return '-';
        return '$' + Number(amount).toFixed(2);
    },
    renderCardLink: function (url, name, imgSrc) {
        var html = '<a href="' + url + '" class="card-name-link"';
        if (imgSrc) html += ' data-card-img="' + imgSrc + '"';
        return html + '>' + name + '</a>';
    },
    fetchWithGate: function (url) {
        return fetchGateImpl(url);
    },
};

function rowHtml(key, expanded) {
    return (
        '<div class="breakdown-row" id="slice-' + key + '" data-key="' + key + '" data-loaded="' +
        (expanded ? 'true' : 'false') + '">' +
        '<a href="/portfolio/breakdown?by=set&expand=' + key + '" class="breakdown-row-toggle" ' +
        'role="button" aria-expanded="' + (expanded ? 'true' : 'false') + '" aria-controls="slice-cards-' + key + '">' +
        '<span class="breakdown-label">' + key + '</span>' +
        '</a>' +
        '<div class="breakdown-cards" id="slice-cards-' + key + '"' + (expanded ? '' : ' hidden') + '></div>' +
        '</div>'
    );
}

function loadScript() {
    jest.resetModules();
    require('../../src/http/public/js/portfolioBreakdown.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

function clickToggle(key) {
    document
        .querySelector('#slice-' + key + ' .breakdown-row-toggle')
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

beforeEach(function () {
    fetchGateImpl = jest.fn();
    document.body.innerHTML =
        '<div class="breakdown-list" data-dimension="set" data-colors="">' + rowHtml('tst', false) + '</div>';
});

describe('portfolioBreakdown drill-down', function () {
    it('lazy-loads and renders slice cards on first expand', function () {
        var cards = [
            { cardId: 'a', name: 'Test Angel', setCode: 'tst', number: '1', cardUrl: '/card/tst/1', imgSrc: 'img.jpg', quantity: 2, value: 10, valueFormatted: '$10.00' },
        ];
        fetchGateImpl.mockResolvedValue({ ok: true, gated: false, status: 200, body: { success: true, data: cards } });
        loadScript();

        clickToggle('tst');

        var toggle = document.querySelector('#slice-tst .breakdown-row-toggle');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(document.getElementById('slice-cards-tst').hasAttribute('hidden')).toBe(false);
        expect(fetchGateImpl).toHaveBeenCalledTimes(1);
        expect(fetchGateImpl.mock.calls[0][0]).toBe('/api/v1/portfolio/breakdown/cards?by=set&key=tst');

        return Promise.resolve().then(function () {
            var panel = document.getElementById('slice-cards-tst');
            expect(panel.innerHTML).toContain('Test Angel');
            expect(panel.innerHTML).toContain('data-card-img="img.jpg"');
            expect(panel.innerHTML).toContain('$10.00');
            expect(document.querySelector('#slice-tst').getAttribute('data-loaded')).toBe('true');
        });
    });

    it('collapses without refetching, then reuses cached cards on re-expand', function () {
        fetchGateImpl.mockResolvedValue({ ok: true, gated: false, status: 200, body: { success: true, data: [] } });
        loadScript();

        clickToggle('tst');
        return Promise.resolve().then(function () {
            // collapse
            clickToggle('tst');
            var toggle = document.querySelector('#slice-tst .breakdown-row-toggle');
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            expect(document.getElementById('slice-cards-tst').hasAttribute('hidden')).toBe(true);

            // re-expand: still loaded, no second fetch
            clickToggle('tst');
            expect(fetchGateImpl).toHaveBeenCalledTimes(1);
            expect(toggle.getAttribute('aria-expanded')).toBe('true');
        });
    });

    it('shows an error message when the fetch fails', function () {
        fetchGateImpl.mockResolvedValue({ ok: false, gated: false, status: 500, body: null });
        loadScript();

        clickToggle('tst');
        return Promise.resolve().then(function () {
            var panel = document.getElementById('slice-cards-tst');
            expect(panel.innerHTML).toContain('Could not load cards');
            expect(document.querySelector('#slice-tst').getAttribute('data-loaded')).toBe('false');
        });
    });

    it('includes the colors filter for the color dimension', function () {
        document.body.innerHTML =
            '<div class="breakdown-list" data-dimension="color" data-colors="U,W">' + rowHtml('U', false) + '</div>';
        fetchGateImpl.mockResolvedValue({ ok: true, gated: false, status: 200, body: { success: true, data: [] } });
        loadScript();

        clickToggle('U');
        expect(fetchGateImpl.mock.calls[0][0]).toBe(
            '/api/v1/portfolio/breakdown/cards?by=color&key=U&colors=U%2CW'
        );
    });
});
