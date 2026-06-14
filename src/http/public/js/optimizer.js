/**
 * Cash-vs-store-credit optimizer (Phase 6.5). The buy-list table is fixed per
 * page load; only the bonus % changes. As the user edits it, fetch the
 * recomputed comparison from GET /api/v1/optimizer?bonus= (same backend the
 * page rendered) instead of mirroring cash-vs-credit.policy.ts client-side.
 *
 * The server already renders the result for the default bonus, so we only fetch
 * on user change. Requests are debounced and the latest one wins.
 */
document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('optimizer-root');
    var input = document.getElementById('bonus-input');
    if (!root || !input) return;

    var defaultBonus = parseFloat(root.getAttribute('data-default-bonus')) || 0;
    var debounceTimer = null;
    var latestRequest = 0;

    function money(n) {
        return (
            '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        );
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function bonusFraction() {
        var pct = parseFloat(input.value);
        if (!isFinite(pct) || pct < 0) pct = 0;
        return pct / 100;
    }

    function apply(data) {
        setText('store-credit', money(data.storeCredit));
        setText('store-credit-sub', '+' + money(data.storeCredit - data.cashValue) + ' vs cash');
        setText('cash-oop', money(data.cashOutOfPocket));
        setText('credit-oop', money(data.creditOutOfPocket));
        setText('credit-advantage', money(data.creditAdvantage));
        setText('locked-credit', money(data.lockedCredit));

        var rec = document.getElementById('recommendation');
        if (rec) {
            var html;
            if (data.recommendCredit) {
                html =
                    '<strong>Take store credit.</strong> It saves ' +
                    money(data.creditAdvantage) +
                    ' toward your buy list versus taking cash.';
            } else if (data.buyListRetail > 0) {
                html =
                    '<strong>Take cash.</strong> You&rsquo;re selling more than you&rsquo;re buying — keep ' +
                    money(data.cashLeftover) +
                    ' liquid rather than locking it in credit.';
            } else {
                html =
                    'Add cards to your <a href="/buy-list" class="text-teal-600 dark:text-teal-400 hover:underline">buy list</a> to see whether store credit beats cash.';
            }
            rec.innerHTML = html;
        }
    }

    function refresh() {
        var b = bonusFraction();

        // Export link stays current immediately, independent of the fetch.
        var exportLink = document.getElementById('export-link');
        if (exportLink) exportLink.setAttribute('href', '/optimizer/export.csv?bonus=' + b);

        var requestId = ++latestRequest;
        fetch('/api/v1/optimizer?bonus=' + b, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then(function (res) {
                return res.ok ? res.json() : null;
            })
            .then(function (body) {
                // Ignore stale responses and failures; keep the last good values.
                if (requestId !== latestRequest || !body || !body.data) return;
                apply(body.data);
            })
            .catch(function () {
                /* network error — leave the current values in place */
            });
    }

    input.value = String(Math.round(defaultBonus * 100));
    input.addEventListener('input', function () {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refresh, 250);
    });
});
