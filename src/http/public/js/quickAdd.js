(function () {
    'use strict';

    var busy = {};

    async function fetchCurrentNormalQty(cardId) {
        try {
            var resp = await fetch(
                '/api/v1/inventory/quantities?cardIds=' + encodeURIComponent(cardId),
                { credentials: 'same-origin' }
            );
            if (!resp.ok) return 0;
            var body = await resp.json();
            if (body && body.success && Array.isArray(body.data) && body.data[0]) {
                return parseInt(body.data[0].normalQuantity, 10) || 0;
            }
        } catch (e) {
            /* fall through */
        }
        return 0;
    }

    async function quickAdd(cardId, btn) {
        var current = await fetchCurrentNormalQty(cardId);
        var newQty = current + 1;
        var method = current === 0 ? 'POST' : 'PATCH';
        var resp = await fetch('/inventory', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify([{ cardId: cardId, isFoil: false, quantity: newQty }]),
        });
        if (!resp.ok) {
            var err = null;
            try {
                err = await resp.json();
            } catch (e) {
                /* ignore */
            }
            throw new Error((err && err.error) || 'HTTP ' + resp.status);
        }
        return newQty;
    }

    document.body.addEventListener('click', async function (event) {
        var btn = event.target.closest('.tile-quick-add');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        var cardId = btn.getAttribute('data-card-id');
        if (!cardId || busy[cardId]) return;
        busy[cardId] = true;
        btn.classList.add('tile-quick-add--busy');
        try {
            var newQty = await quickAdd(cardId, btn);
            btn.classList.add('tile-quick-add--added');
            if (typeof window.showToast === 'function') {
                window.showToast('Added to inventory (now ' + newQty + ')', 'success');
            }
            if (typeof AppState !== 'undefined' && AppState.emit) {
                AppState.emit('inventory:updated', {
                    cardId: cardId,
                    isFoil: false,
                    quantity: newQty,
                });
            }
        } catch (error) {
            if (typeof window.showToast === 'function') {
                window.showToast(error.message || 'Failed to add to inventory', 'error');
            }
        } finally {
            btn.classList.remove('tile-quick-add--busy');
            busy[cardId] = false;
        }
    });
})();
