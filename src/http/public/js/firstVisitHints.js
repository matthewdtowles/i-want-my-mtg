(function () {
    'use strict';

    var KEYS = {
        binder: 'iwmm_binderHintDismissed',
        portfolioMetrics: 'iwmm_portfolioMetricHintsDismissed',
        txImport: 'iwmm_txImportHintDismissed',
    };

    function storageAvailable() {
        try {
            var k = '__storage_test__';
            localStorage.setItem(k, '1');
            localStorage.removeItem(k);
            return true;
        } catch (e) {
            return false;
        }
    }

    var hasStorage = storageAvailable();

    function isDismissed(key) {
        if (!hasStorage) return false;
        try {
            return localStorage.getItem(key) === '1';
        } catch (e) {
            return false;
        }
    }

    function dismiss(key) {
        if (!hasStorage) return;
        try {
            localStorage.setItem(key, '1');
        } catch (e) {
            /* storage full or blocked */
        }
    }

    // --- Binder View Discovery ---
    function initBinderHint() {
        if (isDismissed(KEYS.binder)) return;
        var binderLink = document.querySelector('.binder-link');
        if (!binderLink) return;

        var hintId = 'fv-binder-hint';

        var bubble = document.createElement('div');
        bubble.id = hintId;
        bubble.className = 'fv-hint-bubble fv-hint-bubble--binder';
        bubble.setAttribute('role', 'status');

        var text = document.createElement('p');
        text.className = 'fv-hint-text';
        var icon = document.createElement('i');
        icon.className = 'fas fa-book-open';
        icon.setAttribute('aria-hidden', 'true');
        text.appendChild(icon);
        text.appendChild(
            document.createTextNode(' View as a binder \u2013 flip through your cards page by page')
        );
        bubble.appendChild(text);

        var dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'fv-hint-dismiss';
        dismissBtn.textContent = 'Got it';
        bubble.appendChild(dismissBtn);

        document.body.appendChild(bubble);
        binderLink.setAttribute('aria-describedby', hintId);

        function positionBubble() {
            var rect = binderLink.getBoundingClientRect();
            if (rect.bottom === 0 && rect.top === 0) {
                // Anchor is off-screen or hidden — hide bubble
                bubble.style.display = 'none';
                return;
            }
            bubble.style.display = '';
            bubble.style.top = rect.bottom + 8 + 'px';
            var left = rect.left - 80;
            bubble.style.left = Math.max(8, left) + 'px';
        }
        positionBubble();

        var repositionTimer = null;
        function throttledReposition() {
            if (repositionTimer) return;
            repositionTimer = setTimeout(function () {
                repositionTimer = null;
                positionBubble();
            }, 100);
        }
        window.addEventListener('scroll', throttledReposition, { passive: true });
        window.addEventListener('resize', throttledReposition, { passive: true });

        function removeBubble() {
            dismiss(KEYS.binder);
            binderLink.removeAttribute('aria-describedby');
            window.removeEventListener('scroll', throttledReposition);
            window.removeEventListener('resize', throttledReposition);
            bubble.remove();
        }

        dismissBtn.addEventListener('click', removeBubble);

        binderLink.addEventListener('click', removeBubble, { once: true });
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
            bubble.setAttribute('role', 'status');

            var hintP = document.createElement('p');
            hintP.className = 'fv-hint-text';
            hintP.textContent = hintText;
            bubble.appendChild(hintP);

            var dismissBtn = document.createElement('button');
            dismissBtn.type = 'button';
            dismissBtn.className = 'fv-hint-dismiss';
            dismissBtn.textContent = 'Got it';
            bubble.appendChild(dismissBtn);

            card.appendChild(btn);
            card.appendChild(bubble);

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.fv-hint-bubble--metric').forEach(function (b) {
                    if (b !== bubble) b.classList.add('hidden');
                });
                bubble.classList.toggle('hidden');
            });

            dismissBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                dismissAllMetricHints();
            });
        });

        document.addEventListener('click', function (e) {
            if (
                !e.target.closest('.fv-metric-hint-btn') &&
                !e.target.closest('.fv-hint-bubble--metric')
            ) {
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
        document
            .querySelectorAll('.fv-metric-hint-btn, .fv-hint-bubble--metric')
            .forEach(function (el) {
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
