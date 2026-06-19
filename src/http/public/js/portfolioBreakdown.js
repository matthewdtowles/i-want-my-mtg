/**
 * Portfolio Analytics drill-down (#535).
 *
 * Each breakdown row is a real link (`.breakdown-row-toggle`) that, with JS
 * off, navigates to `?expand=<key>` and the server renders that slice's cards
 * inline. Here we intercept the click and toggle the cards inline instead,
 * lazy-loading them from `/api/v1/portfolio/breakdown/cards` on first expand
 * and caching the rendered rows thereafter.
 *
 * Dimension + color-filter switching stays full-nav (see ROADMAP 10.5): only
 * drill-down is async, so the premium gate, SEO, and cheap dimension swaps all
 * stay server-side.
 */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof AjaxUtils === 'undefined') return;

    var list = document.querySelector('.breakdown-list[data-dimension]');
    if (!list || list.getAttribute('data-drilldown-ready') === 'true') return;
    list.setAttribute('data-drilldown-ready', 'true');

    var dimension = list.getAttribute('data-dimension') || 'set';
    var colors = list.getAttribute('data-colors') || '';

    function cardsUrl(key) {
        var params = new URLSearchParams();
        params.set('by', dimension);
        params.set('key', key);
        if (dimension === 'color' && colors) params.set('colors', colors);
        return '/api/v1/portfolio/breakdown/cards?' + params.toString();
    }

    function setExpanded(row, toggle, panel, expanded) {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (expanded) {
            panel.removeAttribute('hidden');
        } else {
            panel.setAttribute('hidden', '');
        }
    }

    function renderCards(cards) {
        if (!cards || !cards.length) {
            return '<p class="breakdown-cards-empty">No cards found in this slice.</p>';
        }
        var html = '';
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            html +=
                '<div class="breakdown-card-row">' +
                '<span class="breakdown-card-name">' +
                AjaxUtils.renderCardLink(c.cardUrl, c.name, c.imgSrc) +
                '</span>' +
                '<span class="breakdown-card-detail">' +
                '<span class="breakdown-card-set">' +
                AjaxUtils.escapeHtml((c.setCode || '').toUpperCase()) +
                ' #' +
                AjaxUtils.escapeHtml(c.number || '') +
                '</span>' +
                '<span class="breakdown-card-qty">' +
                (parseInt(c.quantity, 10) || 0) +
                '&times;</span>' +
                '<span class="breakdown-card-value">' +
                AjaxUtils.escapeHtml(c.valueFormatted || AjaxUtils.toDollar(c.value)) +
                '</span>' +
                '</span>' +
                '</div>';
        }
        return html;
    }

    function loadCards(row, toggle, panel) {
        var key = row.getAttribute('data-key');
        panel.innerHTML =
            '<div class="breakdown-cards-loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading cards&hellip;</div>';
        AjaxUtils.fetchWithGate(cardsUrl(key), { credentials: 'same-origin' })
            .then(function (res) {
                if (res.gated) {
                    // Premium toast already shown; collapse back so the UI
                    // doesn't get stuck open-but-empty.
                    panel.innerHTML = '';
                    row.setAttribute('data-loaded', 'false');
                    setExpanded(row, toggle, panel, false);
                    return;
                }
                if (!res.ok || !res.body || !res.body.success) {
                    panel.innerHTML =
                        '<p class="breakdown-cards-empty">Could not load cards. Please try again.</p>';
                    row.setAttribute('data-loaded', 'false');
                    return;
                }
                panel.innerHTML = renderCards(res.body.data);
                row.setAttribute('data-loaded', 'true');
            })
            .catch(function () {
                panel.innerHTML =
                    '<p class="breakdown-cards-empty">Could not load cards. Please try again.</p>';
                row.setAttribute('data-loaded', 'false');
            });
    }

    list.addEventListener('click', function (e) {
        var toggle = e.target.closest('.breakdown-row-toggle');
        if (!toggle || !list.contains(toggle)) return;
        e.preventDefault();

        var row = toggle.closest('.breakdown-row');
        if (!row) return;
        var panel = row.querySelector('.breakdown-cards');
        if (!panel) return;

        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
            setExpanded(row, toggle, panel, false);
            return;
        }

        setExpanded(row, toggle, panel, true);
        if (row.getAttribute('data-loaded') !== 'true') {
            loadCards(row, toggle, panel);
        }
    });
});
