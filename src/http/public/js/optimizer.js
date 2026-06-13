/**
 * Cash-vs-store-credit optimizer (Phase 6.5). The cash value (C) and buy-list
 * retail (R) are fixed per page load; only the bonus % changes, so recompute
 * the comparison client-side as the user edits it. Mirrors
 * src/core/pricing/cash-vs-credit.policy.ts — keep the two in sync.
 */
document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('optimizer-root');
    var input = document.getElementById('bonus-input');
    if (!root || !input) return;

    var C = parseFloat(root.getAttribute('data-cash-value')) || 0;
    var R = parseFloat(root.getAttribute('data-buy-list-retail')) || 0;
    var defaultBonus = parseFloat(root.getAttribute('data-default-bonus')) || 0;

    function money(n) {
        return (
            '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        );
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function compute(b) {
        var storeCredit = C * (1 + b);
        var cashOutOfPocket = Math.max(0, R - C);
        var cashLeftover = Math.max(0, C - R);
        var creditOutOfPocket = Math.max(0, R - storeCredit);
        var lockedCredit = Math.max(0, storeCredit - R);
        var creditAdvantage = cashOutOfPocket - creditOutOfPocket;
        return {
            storeCredit: storeCredit,
            cashOutOfPocket: cashOutOfPocket,
            cashLeftover: cashLeftover,
            creditOutOfPocket: creditOutOfPocket,
            lockedCredit: lockedCredit,
            creditAdvantage: creditAdvantage,
            recommendCredit: creditAdvantage > 0,
        };
    }

    function render() {
        var pct = parseFloat(input.value);
        if (!isFinite(pct) || pct < 0) pct = 0;
        var b = pct / 100;
        var r = compute(b);

        setText('store-credit', money(r.storeCredit));
        setText('store-credit-sub', '+' + money(r.storeCredit - C) + ' vs cash');
        setText('cash-oop', money(r.cashOutOfPocket));
        setText('credit-oop', money(r.creditOutOfPocket));
        setText('credit-advantage', money(r.creditAdvantage));
        setText('locked-credit', money(r.lockedCredit));

        var rec = document.getElementById('recommendation');
        if (rec) {
            var html;
            if (r.recommendCredit) {
                html =
                    '<strong>Take store credit.</strong> It saves ' +
                    money(r.creditAdvantage) +
                    ' toward your buy list versus taking cash.';
            } else if (R > 0) {
                html =
                    '<strong>Take cash.</strong> You&rsquo;re selling more than you&rsquo;re buying — keep ' +
                    money(r.cashLeftover) +
                    ' liquid rather than locking it in credit.';
            } else {
                html =
                    'Add cards to your <a href="/buy-list" class="text-teal-600 dark:text-teal-400 hover:underline">buy list</a> to see whether store credit beats cash.';
            }
            rec.innerHTML = html;
        }

        var exportLink = document.getElementById('export-link');
        if (exportLink) exportLink.setAttribute('href', '/optimizer/export.csv?bonus=' + b);
    }

    input.value = String(Math.round(defaultBonus * 100));
    render();
    input.addEventListener('input', render);
});
