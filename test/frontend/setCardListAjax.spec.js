/**
 * @jest-environment jsdom
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return {
            matches: false,
            addEventListener: function () {},
            removeEventListener: function () {},
        };
    };
}

// Captured renderContent callback and state from initListPage
var capturedConfig = null;
var capturedState = null;

window.AjaxUtils = {
    initListPage: function (config) {
        capturedConfig = config;
        return {
            container: config.container,
            state: capturedState,
            fetchAndRender: function () {},
        };
    },
    setupViewToggleInterceptor: function () {},
    updateViewToggle: function () {},
    renderEmptyState: function (el, opts) {
        el.innerHTML = '<div class="empty-state">' + opts.message + '</div>';
    },
    escapeHtml: function (str) {
        return str == null ? '' : String(str);
    },
};

function loadPage(html) {
    capturedConfig = null;
    capturedState = { page: 1, limit: 25, baseOnly: true };
    document.body.innerHTML =
        '<span data-owned-scope="base">base</span>' +
        '<span data-owned-scope="all" class="hidden">all</span>' +
        html +
        '<div id="set-card-list-ajax" data-set-code="tst" data-authenticated="true">' +
        '<div id="filter-results"></div></div>';
    jest.resetModules();
    require('../../src/http/public/js/setCardListAjax.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

function visibleScope() {
    return Array.prototype.filter
        .call(document.querySelectorAll('[data-owned-scope]'), function (el) {
            return !el.classList.contains('hidden');
        })
        .map(function (el) {
            return el.dataset.ownedScope;
        });
}

describe('setCardListAjax owned scope', function () {
    it('shows every card owned once Show All is on, and base cards again after Main Only', function () {
        loadPage('<a id="base-only-wrapper" href="/sets/tst?baseOnly=false">Show All</a>');
        var resultsEl = document.getElementById('filter-results');

        capturedState.baseOnly = false;
        capturedConfig.renderContent(resultsEl, [], null);
        expect(visibleScope()).toEqual(['all']);

        capturedState.baseOnly = true;
        capturedConfig.renderContent(resultsEl, [], null);
        expect(visibleScope()).toEqual(['base']);
    });

    it('keeps the server-chosen scope when the set has no Show All toggle', function () {
        loadPage('');
        capturedState.baseOnly = false;
        capturedConfig.renderContent(document.getElementById('filter-results'), [], null);
        expect(visibleScope()).toEqual(['base']);
    });
});
