/**
 * Tab controller for the set page's Cards/Sealed tabs.
 *
 * - Reads initial state from the ?tab= query param (default: cards)
 * - Click handlers switch panels, update the URL via history.pushState,
 *   and keep aria-selected in sync
 * - Listens for popstate so browser nav keeps the UI in sync
 *
 * The controller is a no-op on pages without the tab bar.
 */
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var tabBar = document.getElementById('set-product-tabs');
    if (!tabBar) return;

    var tabs = Array.prototype.slice.call(tabBar.querySelectorAll('.set-tab'));
    if (tabs.length === 0) return;

    function activate(tabName, options) {
        var opts = options || {};
        var matched = false;
        tabs.forEach(function (tab) {
            var name = tab.getAttribute('data-tab');
            var panel = document.getElementById(tab.getAttribute('aria-controls'));
            var active = name === tabName;
            if (active) matched = true;
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
            tab.classList.toggle('set-tab--active', active);
            if (panel) {
                if (active) {
                    panel.removeAttribute('hidden');
                } else {
                    panel.setAttribute('hidden', '');
                }
            }
        });

        // If the requested tab doesn't exist, fall back to cards
        if (!matched && tabName !== 'cards') {
            activate('cards', opts);
            return;
        }

        if (opts.updateUrl) {
            var url = new URL(window.location.href);
            if (tabName === 'cards') {
                url.searchParams.delete('tab');
            } else {
                url.searchParams.set('tab', tabName);
            }
            var newUrl = url.pathname + (url.search ? url.search : '') + url.hash;
            window.history.pushState({ tab: tabName }, '', newUrl);
        }
    }

    function tabFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return params.get('tab') || 'cards';
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var name = tab.getAttribute('data-tab');
            activate(name, { updateUrl: true });
        });
    });

    window.addEventListener('popstate', function () {
        activate(tabFromUrl(), { updateUrl: false });
    });

    // Initial sync — honor ?tab= on page load
    activate(tabFromUrl(), { updateUrl: false });
});
