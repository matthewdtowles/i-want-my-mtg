/**
 * @jest-environment jsdom
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

// Captured renderContent callback from initListPage
var capturedConfig = null;
// The page's state object, so a test can pick the layout under test
var capturedState = null;

// Minimal AjaxUtils mock
window.AjaxUtils = {
    initListPage: function (config) {
        capturedConfig = config;
        return { container: config.container, state: capturedState, fetchAndRender: function () {} };
    },
    setupViewToggleInterceptor: function () {},
    updateViewToggle: function () {},
    renderEmptyState: function (el, opts) {
        el.innerHTML = '<div class="empty-state">' + opts.message + '</div>';
    },
    renderTableHeaderRow: function () {
        return '<tr><th>Set</th><th>Set Value</th><th>Release Date</th></tr>';
    },
    escapeHtml: function (str) {
        if (str == null) return '';
        return String(str);
    },
    renderTags: function (tags) {
        if (!tags || tags.length === 0) return '';
        return '<span class="tag">' + tags.join('</span><span class="tag">') + '</span>';
    },
    toDollar: function (amount) {
        if (amount == null || amount === 0) return '-';
        return '$' + Number(amount).toFixed(2);
    },
    renderCompletionBar: function (rate) {
        return '<div class="completion-bar">' + rate + '%</div>';
    },
    isSubscribed: function () {
        return document.body.getAttribute('data-subscribed') === 'true';
    },
    renderPriceChange: function (change) {
        var sign = change > 0 ? '+' : '';
        return '<span class="price-change">' + sign + '$' + Math.abs(change).toFixed(2) + '</span>';
    },
};

// Load SetListUtils dependency
require('../../src/http/public/js/setListUtils.js');

beforeEach(function () {
    capturedConfig = null;
    capturedState = { page: 1, limit: 25, view: 'grid' };
    document.body.innerHTML = '<div id="set-list-ajax" data-authenticated="false"><div id="filter-results"></div></div>';
});

function loadSetListAjax(view) {
    jest.resetModules();
    capturedState.view = view || 'grid';
    // Re-trigger DOMContentLoaded to run the script's init
    require('../../src/http/public/js/setListAjax.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    return capturedConfig;
}

function getResultsEl() {
    return document.getElementById('filter-results');
}

describe('setListAjax renderTable', function () {
    it('should render empty state when sets array is empty', function () {
        var config = loadSetListAjax('table');
        var resultsEl = getResultsEl();
        config.renderContent(resultsEl, [], null);

        expect(resultsEl.innerHTML).toContain('empty-state');
        expect(resultsEl.innerHTML).toContain('No sets match your search');
    });

    it('should render flat rows when meta has no multiSetBlockKeys', function () {
        var config = loadSetListAjax('table');
        var resultsEl = getResultsEl();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', keyruneCode: 'mid', tags: [], prices: { basePrice: 50 }, releaseDate: '2021-09-24' },
            { code: 'neo', name: 'Neon Dynasty', keyruneCode: 'neo', tags: [], prices: { basePrice: 40 }, releaseDate: '2022-02-18' },
        ];

        config.renderContent(resultsEl, sets, { page: 1, limit: 25, total: 2, totalPages: 1 });

        var rows = resultsEl.querySelectorAll('tbody tr');
        expect(rows.length).toBe(2);
        expect(rows[0].classList.contains('block-label-row')).toBe(false);
        expect(rows[0].classList.contains('block-child-row')).toBe(false);
    });

    it('should render block label rows and child indentation with multiSetBlockKeys', function () {
        var config = loadSetListAjax('table');
        var resultsEl = getResultsEl();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', block: 'Innistrad', parentCode: null, isMain: true, keyruneCode: 'mid', tags: [], prices: { basePrice: 50 }, releaseDate: '2021-09-24' },
            { code: 'mic', name: 'MH Commander', block: 'Innistrad', parentCode: 'mid', isMain: false, keyruneCode: 'mic', tags: [], prices: { basePrice: 10 }, releaseDate: '2021-09-24' },
        ];
        var meta = { page: 1, limit: 25, total: 1, totalPages: 1, multiSetBlockKeys: ['mid'] };

        config.renderContent(resultsEl, sets, meta);

        var labelRows = resultsEl.querySelectorAll('tr.block-label-row');
        expect(labelRows.length).toBe(1);
        expect(labelRows[0].textContent).toContain('Innistrad');

        var childRows = resultsEl.querySelectorAll('tr.block-child-row');
        expect(childRows.length).toBe(1);
        expect(childRows[0].innerHTML).toContain('MH Commander');

        // First set row should not be indented but should be a block group member
        var allDataRows = resultsEl.querySelectorAll('tbody tr.table-row');
        expect(allDataRows[0].classList.contains('block-child-row')).toBe(false);
        expect(allDataRows[0].classList.contains('block-group-member')).toBe(true);
        expect(allDataRows[0].innerHTML).toContain('Midnight Hunt');

        // All data rows in multi-set blocks should have block-group-member
        var memberRows = resultsEl.querySelectorAll('tr.block-group-member');
        expect(memberRows.length).toBe(2);
    });

    it('should not render block label for single-set groups not in multiSetBlockKeys', function () {
        var config = loadSetListAjax('table');
        var resultsEl = getResultsEl();
        var sets = [
            { code: 'neo', name: 'Neon Dynasty', block: 'Kamigawa', parentCode: null, isMain: true, keyruneCode: 'neo', tags: [], prices: { basePrice: 40 }, releaseDate: '2022-02-18' },
        ];
        var meta = { page: 1, limit: 25, total: 1, totalPages: 1, multiSetBlockKeys: [] };

        config.renderContent(resultsEl, sets, meta);

        var labelRows = resultsEl.querySelectorAll('tr.block-label-row');
        expect(labelRows.length).toBe(0);

        var dataRows = resultsEl.querySelectorAll('tbody tr.table-row');
        expect(dataRows.length).toBe(1);
        expect(dataRows[0].classList.contains('block-group-member')).toBe(false);
    });

    it('should render multiple block groups with labels', function () {
        var config = loadSetListAjax('table');
        var resultsEl = getResultsEl();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', block: 'Innistrad', parentCode: null, isMain: true, keyruneCode: 'mid', tags: [], prices: { basePrice: 50 }, releaseDate: '2021-09-24' },
            { code: 'mic', name: 'MH Commander', block: 'Innistrad', parentCode: 'mid', isMain: false, keyruneCode: 'mic', tags: [], prices: { basePrice: 10 }, releaseDate: '2021-09-24' },
            { code: 'neo', name: 'Neon Dynasty', block: 'Kamigawa', parentCode: null, isMain: true, keyruneCode: 'neo', tags: [], prices: { basePrice: 40 }, releaseDate: '2022-02-18' },
            { code: 'nec', name: 'ND Commander', block: 'Kamigawa', parentCode: 'neo', isMain: false, keyruneCode: 'nec', tags: [], prices: { basePrice: 8 }, releaseDate: '2022-02-18' },
        ];
        var meta = { page: 1, limit: 25, total: 2, totalPages: 1, multiSetBlockKeys: ['mid', 'neo'] };

        config.renderContent(resultsEl, sets, meta);

        var labelRows = resultsEl.querySelectorAll('tr.block-label-row');
        expect(labelRows.length).toBe(2);

        var childRows = resultsEl.querySelectorAll('tr.block-child-row');
        expect(childRows.length).toBe(2);
    });

    it('should include owned value column when authenticated', function () {
        document.body.innerHTML = '<div id="set-list-ajax" data-authenticated="true"><div id="filter-results"></div></div>';
        var config = loadSetListAjax('table');
        var resultsEl = getResultsEl();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', keyruneCode: 'mid', tags: [], prices: { basePrice: 50 }, releaseDate: '2021-09-24', ownedValue: 25.5, completionRate: 40 },
        ];

        config.renderContent(resultsEl, sets, { page: 1, limit: 25, total: 1, totalPages: 1 });

        expect(resultsEl.innerHTML).toContain('$25.50');
        expect(resultsEl.innerHTML).toContain('completion-bar');
    });
});

// The grid is the default layout, and must match partials/setTile.hbs.
describe('setListAjax renderGrid', function () {
    var GRID_SET = {
        code: 'mid',
        name: 'Midnight Hunt',
        keyruneCode: 'mid',
        tags: [],
        prices: { basePrice: 50, basePriceChangeWeekly: 1.25 },
        releaseDate: '2021-09-24',
        baseSize: 277,
        totalSize: 391,
        coverImgSrc: 'a/b/cover.jpg',
    };

    it('renders one tile per set, linking to the set page', function () {
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();

        config.renderContent(resultsEl, [GRID_SET], { page: 1, limit: 25, total: 1, totalPages: 1 });

        var tiles = resultsEl.querySelectorAll('a.set-tile');
        expect(tiles.length).toBe(1);
        expect(tiles[0].getAttribute('href')).toBe('/sets/mid');
        expect(tiles[0].textContent).toContain('Midnight Hunt');
    });

    it('builds the art_crop URL from the cover tail', function () {
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();

        config.renderContent(resultsEl, [GRID_SET], { page: 1, limit: 25, total: 1, totalPages: 1 });

        var img = resultsEl.querySelector('.set-tile-art');
        expect(img.getAttribute('src')).toBe(
            'https://cards.scryfall.io/art_crop/front/a/b/cover.jpg'
        );
    });

    it('renders a tile without art when the set has no cover', function () {
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();
        var noCover = Object.assign({}, GRID_SET, { coverImgSrc: undefined });

        config.renderContent(resultsEl, [noCover], { page: 1, limit: 25, total: 1, totalPages: 1 });

        expect(resultsEl.querySelectorAll('a.set-tile').length).toBe(1);
        expect(resultsEl.querySelector('.set-tile-art')).toBeNull();
    });

    it('shows release year and card count under the name', function () {
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();

        config.renderContent(resultsEl, [GRID_SET], { page: 1, limit: 25, total: 1, totalPages: 1 });

        expect(resultsEl.querySelector('.set-tile-sub').textContent).toContain('2021');
        expect(resultsEl.querySelector('.set-tile-sub').textContent).toContain('277');
    });

    it('labels block groups instead of indenting rows', function () {
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();
        var sets = [
            Object.assign({}, GRID_SET, { block: 'Innistrad', parentCode: null, isMain: true }),
            Object.assign({}, GRID_SET, {
                code: 'mic',
                name: 'MH Commander',
                block: 'Innistrad',
                parentCode: 'mid',
                isMain: false,
            }),
        ];
        var meta = { page: 1, limit: 25, total: 1, totalPages: 1, multiSetBlockKeys: ['mid'] };

        config.renderContent(resultsEl, sets, meta);

        var labels = resultsEl.querySelectorAll('.set-grid-label');
        expect(labels.length).toBe(1);
        expect(labels[0].textContent).toContain('Innistrad');
        expect(resultsEl.querySelectorAll('a.set-tile').length).toBe(2);
    });

    it('badges owned value only when authenticated and the set is owned', function () {
        document.body.innerHTML = '<div id="set-list-ajax" data-authenticated="true"><div id="filter-results"></div></div>';
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();
        var sets = [
            Object.assign({}, GRID_SET, { ownedTotal: 12, ownedValue: 25.5 }),
            Object.assign({}, GRID_SET, { code: 'neo', name: 'Neon Dynasty', ownedTotal: 0 }),
        ];

        config.renderContent(resultsEl, sets, { page: 1, limit: 25, total: 2, totalPages: 1 });

        var badges = resultsEl.querySelectorAll('.set-tile-owned');
        expect(badges.length).toBe(1);
        expect(badges[0].textContent).toContain('$25.50');
    });

    it('renders the empty state in grid view too', function () {
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();

        config.renderContent(resultsEl, [], null);

        expect(resultsEl.innerHTML).toContain('No sets match your search');
    });
});
