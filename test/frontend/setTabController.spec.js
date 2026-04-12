/**
 * @jest-environment jsdom
 */

function setupDom(initialTab) {
    var search = initialTab ? '?tab=' + initialTab : '';
    window.history.replaceState({}, '', '/sets/blb' + search);
    document.body.innerHTML =
        '<div id="set-product-tabs" role="tablist">' +
            '<button id="set-tab-cards" class="set-tab set-tab--active" role="tab" aria-selected="true" aria-controls="set-cards-panel" data-tab="cards">Cards</button>' +
            '<button id="set-tab-sealed" class="set-tab" role="tab" aria-selected="false" aria-controls="set-sealed-panel" data-tab="sealed">Sealed</button>' +
        '</div>' +
        '<div id="set-cards-panel" role="tabpanel">cards content</div>' +
        '<div id="set-sealed-panel" role="tabpanel" hidden>sealed content</div>';
}

function loadScript() {
    jest.resetModules();
    require('../../src/http/public/js/setTabController.js');
    // Fire DOMContentLoaded since the script attaches there
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('setTabController', function () {
    afterEach(function () {
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    test('activates the cards tab by default when no ?tab query param is present', function () {
        setupDom();
        loadScript();

        var cardsTab = document.getElementById('set-tab-cards');
        var sealedTab = document.getElementById('set-tab-sealed');
        var cardsPanel = document.getElementById('set-cards-panel');
        var sealedPanel = document.getElementById('set-sealed-panel');

        expect(cardsTab.getAttribute('aria-selected')).toBe('true');
        expect(sealedTab.getAttribute('aria-selected')).toBe('false');
        expect(cardsPanel.hasAttribute('hidden')).toBe(false);
        expect(sealedPanel.hasAttribute('hidden')).toBe(true);
    });

    test('activates the sealed tab on load when ?tab=sealed is in the URL', function () {
        setupDom('sealed');
        loadScript();

        var cardsTab = document.getElementById('set-tab-cards');
        var sealedTab = document.getElementById('set-tab-sealed');
        var cardsPanel = document.getElementById('set-cards-panel');
        var sealedPanel = document.getElementById('set-sealed-panel');

        expect(sealedTab.getAttribute('aria-selected')).toBe('true');
        expect(cardsTab.getAttribute('aria-selected')).toBe('false');
        expect(sealedPanel.hasAttribute('hidden')).toBe(false);
        expect(cardsPanel.hasAttribute('hidden')).toBe(true);
    });

    test('clicking the sealed tab switches panels and updates the URL', function () {
        setupDom();
        loadScript();

        document.getElementById('set-tab-sealed').click();

        expect(document.getElementById('set-tab-sealed').getAttribute('aria-selected')).toBe(
            'true'
        );
        expect(document.getElementById('set-tab-cards').getAttribute('aria-selected')).toBe(
            'false'
        );
        expect(document.getElementById('set-sealed-panel').hasAttribute('hidden')).toBe(false);
        expect(document.getElementById('set-cards-panel').hasAttribute('hidden')).toBe(true);
        expect(window.location.search).toBe('?tab=sealed');
    });

    test('clicking the cards tab removes the tab param from the URL', function () {
        setupDom('sealed');
        loadScript();

        document.getElementById('set-tab-cards').click();

        expect(document.getElementById('set-tab-cards').getAttribute('aria-selected')).toBe(
            'true'
        );
        expect(document.getElementById('set-cards-panel').hasAttribute('hidden')).toBe(false);
        expect(document.getElementById('set-sealed-panel').hasAttribute('hidden')).toBe(true);
        expect(window.location.search).toBe('');
    });

    test('applies the active class to the selected tab', function () {
        setupDom();
        loadScript();

        document.getElementById('set-tab-sealed').click();

        expect(
            document.getElementById('set-tab-sealed').classList.contains('set-tab--active')
        ).toBe(true);
        expect(
            document.getElementById('set-tab-cards').classList.contains('set-tab--active')
        ).toBe(false);
    });

    test('responds to popstate events to sync tab state with the browser', function () {
        setupDom();
        loadScript();

        window.history.pushState({}, '', '/sets/blb?tab=sealed');
        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(document.getElementById('set-tab-sealed').getAttribute('aria-selected')).toBe(
            'true'
        );
        expect(document.getElementById('set-sealed-panel').hasAttribute('hidden')).toBe(false);
    });

    test('does nothing when the tab bar is not present', function () {
        document.body.innerHTML = '<div>no tabs here</div>';
        expect(function () {
            loadScript();
        }).not.toThrow();
    });
});
