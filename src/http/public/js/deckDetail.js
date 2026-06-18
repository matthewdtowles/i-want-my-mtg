/**
 * Deck detail page (10.4): quantity steppers, remove, rename/format, delete.
 * Card mutations hit /api/v1/decks/:id/cards and update the DOM in place;
 * totals (deck value, board counts, group counts, illegal count) recompute
 * client-side from data-unit-value on each row. Deck-level edits reload so the
 * server re-renders legality + grouping.
 */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof AjaxUtils === 'undefined') return;

    var root = document.querySelector('.content-wrapper[data-deck-id]');
    if (!root) return;
    var base = '/api/v1/decks/' + root.getAttribute('data-deck-id');

    function fmt(n) {
        return '$' + (Math.round(n * 100) / 100).toFixed(2);
    }

    function rowQty(row) {
        return parseInt(row.querySelector('.deck-qty-val').textContent, 10) || 0;
    }

    function recompute() {
        var rows = document.querySelectorAll('#deck-cards [data-card-id]');
        var total = 0;
        var mainCount = 0;
        var sideCount = 0;
        rows.forEach(function (row) {
            var qty = rowQty(row);
            var unit = parseFloat(row.getAttribute('data-unit-value')) || 0;
            total += qty * unit;
            if (row.getAttribute('data-sideboard') === 'true') sideCount += qty;
            else mainCount += qty;
        });
        setText('deck-est-value', fmt(total));
        setText('deck-main-count', mainCount);
        setText('deck-side-count', sideCount);

        document.querySelectorAll('.deck-group').forEach(function (group) {
            var count = 0;
            group.querySelectorAll('[data-card-id]').forEach(function (row) {
                count += rowQty(row);
            });
            var span = group.querySelector('.deck-group-count');
            if (span) span.textContent = count;
        });

        var notice = document.getElementById('deck-illegal-notice');
        if (notice) {
            var badges = document.querySelectorAll('#deck-cards .deck-illegal-badge').length;
            setText('deck-illegal-count', badges);
            notice.classList.toggle('hidden', badges === 0);
        }
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function updateLineValue(row, qty) {
        var unit = parseFloat(row.getAttribute('data-unit-value')) || 0;
        var lv = row.querySelector('.deck-line-value');
        if (lv) lv.textContent = fmt(qty * unit);
    }

    function removeRow(row) {
        var group = row.closest('.deck-group');
        row.remove();
        if (group && group.querySelectorAll('[data-card-id]').length === 0) group.remove();
        if (!document.querySelector('#deck-cards [data-card-id]')) {
            window.location.reload();
            return;
        }
        recompute();
    }

    function cardPayload(row, extra) {
        var payload = {
            cardId: row.getAttribute('data-card-id'),
            isSideboard: row.getAttribute('data-sideboard') === 'true',
        };
        if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
        return payload;
    }

    function isRowBusy(row) {
        return row.getAttribute('data-busy') === '1';
    }

    // Lock the whole row (both steppers + remove) during an in-flight mutation,
    // so overlapping clicks can't fire out-of-order PATCH/DELETE requests.
    function setRowBusy(row, busy) {
        row.setAttribute('data-busy', busy ? '1' : '0');
        row.querySelectorAll('.deck-step, .deck-remove').forEach(function (b) {
            b.disabled = busy;
        });
    }

    document.querySelectorAll('#deck-cards .deck-step').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var row = btn.closest('[data-card-id]');
            if (!row) return;
            var next = rowQty(row) + (parseInt(btn.getAttribute('data-delta'), 10) || 0);
            if (next < 0) next = 0;
            if (isRowBusy(row)) return;
            setRowBusy(row, true);
            AjaxUtils.fetchWithGate(base + '/cards', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardPayload(row, { quantity: next })),
            })
                .then(function (res) {
                    setRowBusy(row, false);
                    if (res.gated || !res.ok) return;
                    if (next <= 0) {
                        removeRow(row);
                    } else {
                        row.querySelector('.deck-qty-val').textContent = next;
                        updateLineValue(row, next);
                        recompute();
                    }
                })
                .catch(function () {
                    setRowBusy(row, false);
                });
        });
    });

    document.querySelectorAll('#deck-cards .deck-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var row = btn.closest('[data-card-id]');
            if (!row) return;
            if (isRowBusy(row)) return;
            setRowBusy(row, true);
            AjaxUtils.fetchWithGate(base + '/cards', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardPayload(row)),
            })
                .then(function (res) {
                    setRowBusy(row, false);
                    if (res.gated || !res.ok) return;
                    removeRow(row);
                })
                .catch(function () {
                    setRowBusy(row, false);
                });
        });
    });

    var editForm = document.getElementById('deck-edit-form');
    var editResult = document.getElementById('deck-edit-result');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('deck-name-input').value.trim();
            var format = document.getElementById('deck-format-input').value;
            if (!name) {
                if (editResult) editResult.textContent = 'Enter a name.';
                return;
            }
            var body = { name: name };
            if (format) body.format = format;
            AjaxUtils.fetchWithGate(base, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
                .then(function (res) {
                    if (res.gated) return;
                    if (res.ok) window.location.reload();
                    else if (editResult) editResult.textContent = 'Could not save.';
                })
                .catch(function () {
                    if (editResult) editResult.textContent = 'Could not save.';
                });
        });
    }

    var deleteBtn = document.getElementById('deck-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
            if (!window.confirm('Delete this deck? This cannot be undone.')) return;
            AjaxUtils.fetchWithGate(base, { method: 'DELETE' }).then(function (res) {
                if (res.gated) return;
                if (res.ok) window.location.href = '/decks';
            });
        });
    }
});
