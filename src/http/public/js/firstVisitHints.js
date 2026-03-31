(function () {
    'use strict';

    var KEYS = {
        binder: 'iwmm_binderHintDismissed',
        portfolioMetrics: 'iwmm_portfolioMetricHintsDismissed',
        txImport: 'iwmm_txImportHintDismissed',
    };

    function isDismissed(key) {
        return localStorage.getItem(key) === '1';
    }

    function dismiss(key) {
        localStorage.setItem(key, '1');
    }

    // --- Binder View Discovery ---
    function initBinderHint() {
        if (isDismissed(KEYS.binder)) return;
        var binderLink = document.querySelector('.binder-link');
        if (!binderLink) return;

        var bubble = document.createElement('div');
        bubble.className = 'fv-hint-bubble fv-hint-bubble--binder';
        bubble.setAttribute('role', 'tooltip');
        bubble.innerHTML =
            '<p class="fv-hint-text"><i class="fas fa-book-open" aria-hidden="true"></i> View as a binder - flip through your cards page by page</p>' +
            '<button type="button" class="fv-hint-dismiss">Got it</button>';
        document.body.appendChild(bubble);

        function positionBubble() {
            var rect = binderLink.getBoundingClientRect();
            bubble.style.top = (rect.bottom + 8) + 'px';
            var left = rect.left - 80;
            bubble.style.left = Math.max(8, left) + 'px';
        }
        positionBubble();

        bubble.querySelector('.fv-hint-dismiss').addEventListener('click', function () {
            dismiss(KEYS.binder);
            bubble.remove();
        });

        binderLink.addEventListener('click', function () {
            dismiss(KEYS.binder);
            bubble.remove();
        }, { once: true });
    }

    // --- Portfolio Metric Hints ---
    function initPortfolioMetricHints() {
        if (isDismissed(KEYS.portfolioMetrics)) return;
        var cards = document.querySelectorAll('[data-metric-hint]');
        if (!cards.length) return;

        cards.forEach(function (card) {
            var hintText = card.getAttribute('data-metric-hint');
            if (!hintText) return;

            card.classList.add('stat-card-hint-active');

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fv-metric-hint-btn';
            btn.setAttribute('aria-label', 'Explain this metric');
            btn.textContent = '?';

            var bubble = document.createElement('div');
            bubble.className = 'fv-hint-bubble fv-hint-bubble--metric hidden';
            bubble.innerHTML =
                '<p class="fv-hint-text">' + hintText + '</p>' +
                '<button type="button" class="fv-hint-dismiss">Got it</button>';

            card.appendChild(btn);
            card.appendChild(bubble);

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.fv-hint-bubble--metric').forEach(function (b) {
                    if (b !== bubble) b.classList.add('hidden');
                });
                bubble.classList.toggle('hidden');
            });

            bubble.querySelector('.fv-hint-dismiss').addEventListener('click', function (e) {
                e.stopPropagation();
                dismissAllMetricHints();
            });
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.fv-metric-hint-btn') && !e.target.closest('.fv-hint-bubble--metric')) {
                document.querySelectorAll('.fv-hint-bubble--metric').forEach(function (b) {
                    b.classList.add('hidden');
                });
            }
        });
    }

    function dismissAllMetricHints() {
        dismiss(KEYS.portfolioMetrics);
        document.querySelectorAll('[data-metric-hint]').forEach(function (card) {
            card.classList.remove('stat-card-hint-active');
        });
        document.querySelectorAll('.fv-metric-hint-btn, .fv-hint-bubble--metric').forEach(function (el) {
            el.remove();
        });
    }

    // --- Transaction Import Hint ---
    function initTxImportHint() {
        if (isDismissed(KEYS.txImport)) return;
        var txList = document.getElementById('transaction-list-ajax');
        if (!txList) return;

        var hint = document.createElement('div');
        hint.className = 'fv-import-hint';
        hint.innerHTML =
            '<i class="fas fa-lightbulb" aria-hidden="true"></i>' +
            '<span>Tip: Import multiple transactions at once using a CSV file. ' +
            'Use the <strong>Import CSV</strong> button above, or see the ' +
            '<a href="/guides/getting-started#transactions" class="fv-hint-link">Getting Started guide</a>.</span>' +
            '<button type="button" class="fv-hint-dismiss" aria-label="Dismiss tip">Dismiss</button>';

        txList.insertAdjacentElement('beforebegin', hint);

        hint.querySelector('.fv-hint-dismiss').addEventListener('click', function () {
            dismiss(KEYS.txImport);
            hint.remove();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initBinderHint();
        initPortfolioMetricHints();
        initTxImportHint();
    });
})();
