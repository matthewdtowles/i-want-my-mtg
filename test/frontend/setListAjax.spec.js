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

// Minimal AjaxUtils mock
window.AjaxUtils = {
    initListPage: function (config) {
        capturedConfig = config;
        return { container: config.container, state: { page: 1, limit: 25 }, fetchAndRender: function () {} };
    },
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
    renderPriceChange: function (change) {
        var sign = change > 0 ? '+' : '';
        return '<span class="price-change">' + sign + '$' + Math.abs(change).toFixed(2) + '</span>';
    },
};

// Load SetListUtils dependency
require('../../src/http/public/js/setListUtils.js');

beforeEach(function () {
    capturedConfig = null;
    document.body.innerHTML = '<div id="set-list-ajax" data-authenticated="false"><div id="filter-results"></div></div>';
});

function loadSetListAjax() {
    jest.resetModules();
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
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();
        config.renderContent(resultsEl, [], null);

        expect(resultsEl.innerHTML).toContain('empty-state');
        expect(resultsEl.innerHTML).toContain('No sets match your search');
    });

    it('should render flat rows when meta has no multiSetBlockKeys', function () {
        var config = loadSetListAjax();
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
        var config = loadSetListAjax();
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

        // First set row should not be indented
        var allDataRows = resultsEl.querySelectorAll('tbody tr.table-row');
        expect(allDataRows[0].classList.contains('block-child-row')).toBe(false);
        expect(allDataRows[0].innerHTML).toContain('Midnight Hunt');
    });

    it('should not render block label for single-set groups not in multiSetBlockKeys', function () {
        var config = loadSetListAjax();
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
    });

    it('should render multiple block groups with labels', function () {
        var config = loadSetListAjax();
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
        var config = loadSetListAjax();
        var resultsEl = getResultsEl();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', keyruneCode: 'mid', tags: [], prices: { basePrice: 50 }, releaseDate: '2021-09-24', ownedValue: 25.5, completionRate: 40 },
        ];

        config.renderContent(resultsEl, sets, { page: 1, limit: 25, total: 1, totalPages: 1 });

        expect(resultsEl.innerHTML).toContain('$25.50');
        expect(resultsEl.innerHTML).toContain('completion-bar');
    });
});
