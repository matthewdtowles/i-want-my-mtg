/**
 * Sealed product inventory stepper controls.
 * Uses event delegation on .sealed-inv-stepper elements.
 * API: POST/PATCH/DELETE /api/v1/inventory/sealed
 */
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var busySteppers = {};

    document.body.addEventListener('click', function (event) {
        var incBtn = event.target.closest('.sealed-inv-btn--inc');
        var decBtn = event.target.closest('.sealed-inv-btn--dec');
        var btn = incBtn || decBtn;
        if (!btn) return;
        if (btn.hasAttribute('disabled')) return;

        event.stopImmediatePropagation();
        var stepper = btn.closest('.sealed-inv-stepper');
        if (!stepper) return;
        var uuid = stepper.getAttribute('data-sealed-uuid');
        if (!uuid) return;

        var qtyEl = stepper.querySelector('.sealed-inv-qty');
        if (!qtyEl) return;

        if (busySteppers[uuid]) return;
        busySteppers[uuid] = true;

        var currentQty = parseInt(qtyEl.textContent, 10);
        if (isNaN(currentQty) || currentQty < 0) currentQty = 0;
        var newQty = incBtn ? currentQty + 1 : currentQty - 1;

        if (newQty <= 0) {
            deleteSealedInventory(uuid)
                .then(function () {
                    updateStepperUi(uuid, 0);
                })
                .catch(function (err) {
                    console.error('Error removing sealed product:', err);
                })
                .finally(function () {
                    busySteppers[uuid] = false;
                });
        } else {
            var method = currentQty === 0 ? 'POST' : 'PATCH';
            saveSealedInventory(uuid, newQty, method)
                .then(function (savedQty) {
                    updateStepperUi(uuid, savedQty);
                })
                .catch(function (err) {
                    console.error('Error updating sealed product inventory:', err);
                })
                .finally(function () {
                    busySteppers[uuid] = false;
                });
        }
    });

    function saveSealedInventory(uuid, quantity, method) {
        return fetch('/api/v1/inventory/sealed', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                sealedProductUuid: uuid,
                quantity: quantity,
            }),
        })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                if (!json.success) throw new Error(json.error || 'Unknown error');
                return json.data && json.data.quantity != null ? json.data.quantity : quantity;
            });
    }

    function deleteSealedInventory(uuid) {
        return fetch('/api/v1/inventory/sealed', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ sealedProductUuid: uuid }),
        })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                if (!json.success) throw new Error(json.error || 'Unknown error');
                // `deleted: false` is a valid idempotent response (item already gone).
                // Either way the server state is "not in inventory", so the UI should
                // reflect 0 — the caller handles that unconditionally.
                if (json.data && json.data.deleted === false) {
                    console.warn('Sealed inventory delete returned deleted=false for', uuid);
                }
                return json;
            });
    }

    function updateStepperUi(uuid, qty) {
        var steppers = document.querySelectorAll(
            '.sealed-inv-stepper[data-sealed-uuid="' + uuid + '"]'
        );
        for (var i = 0; i < steppers.length; i++) {
            var el = steppers[i].querySelector('.sealed-inv-qty');
            if (el) {
                el.textContent = qty;
                el.classList.toggle('sealed-inv-qty--zero', qty === 0);
                el.classList.remove('sealed-inv-qty--pop');
                void el.offsetWidth;
                el.classList.add('sealed-inv-qty--pop');
            }
            var dec = steppers[i].querySelector('.sealed-inv-btn--dec');
            if (dec) {
                if (qty <= 0) {
                    dec.setAttribute('disabled', '');
                } else {
                    dec.removeAttribute('disabled');
                }
            }
        }
    }
});
