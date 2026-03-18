document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('transaction-form');
    if (!form) return;

    // Set default date to today
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Update price when foil selection changes
    const foilSelect = form.querySelector('select[name="isFoil"]');
    const priceInput = form.querySelector('input[name="pricePerUnit"]');
    if (foilSelect && priceInput) {
        foilSelect.addEventListener('change', function () {
            const isFoil = this.value === 'true';
            const newPrice = isFoil ? priceInput.dataset.foilPrice : priceInput.dataset.normalPrice;
            if (newPrice) {
                priceInput.value = newPrice;
            }
        });
    }

    // Handle form submission
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const msgEl = document.getElementById('transaction-form-message');

        const formData = new FormData(form);
        const body = {
            cardId: formData.get('cardId'),
            type: formData.get('type'),
            quantity: parseInt(formData.get('quantity'), 10),
            pricePerUnit: parseFloat(formData.get('pricePerUnit')),
            isFoil: formData.get('isFoil') === 'true',
            date: formData.get('date'),
            source: formData.get('source') || undefined,
        };

        try {
            const response = await fetch('/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();

            if (response.ok && data.success) {
                showMessage(msgEl, 'Transaction recorded!', 'success');
                form.querySelector('input[name="quantity"]').value = '1';
                if (!body.skipInventorySync) {
                    updateInventoryDisplay(body.type, body.quantity, body.isFoil);
                }
            } else {
                showMessage(msgEl, data.error || 'Failed to record transaction.', 'error');
            }
        } catch (error) {
            console.error('Error recording transaction:', error);
            showMessage(msgEl, error.message || 'Failed to record transaction.', 'error');
        }
    });

    // Handle sync inventory buttons (record untracked inventory as BUY)
    document.querySelectorAll('.sync-inventory-button').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var cardId = this.dataset.cardId;
            var quantity = parseInt(this.dataset.quantity, 10);
            var isFoil = this.dataset.isFoil === 'true';
            var price = parseFloat(this.dataset.price) || 0;

            var body = {
                cardId: cardId,
                type: 'BUY',
                quantity: quantity,
                pricePerUnit: price,
                isFoil: isFoil,
                date: new Date().toISOString().split('T')[0],
                skipInventorySync: true,
            };

            try {
                var response = await fetch('/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                var data = await response.json();
                if (response.ok && data.success) {
                    var container = this.closest('[id^="sync-"]');
                    if (container) container.remove();
                    var msgEl = document.getElementById('transaction-form-message');
                    showMessage(msgEl, 'Inventory synced as transaction!', 'success');
                } else {
                    var syncMsg = data.error || 'Failed to sync inventory.';
                    if (typeof window.showToast === 'function') {
                        window.showToast(syncMsg, 'error');
                    } else {
                        alert('Failed to sync: ' + syncMsg);
                    }
                }
            } catch (error) {
                console.error('Error syncing inventory:', error);
                if (typeof window.showToast === 'function') {
                    window.showToast(error.message || 'Error syncing inventory.', 'error');
                } else {
                    alert('Error syncing inventory.');
                }
            }
        });
    });

    function updateInventoryDisplay(type, quantity, isFoil) {
        var formClass = isFoil ? 'quantity-form-foil' : 'quantity-form-normal';
        var qtyForm = document.querySelector('.' + formClass);
        if (!qtyForm) return;
        var qtyInput = qtyForm.querySelector("input[name='quantity-owned']");
        if (!qtyInput) return;
        var current = parseInt(qtyInput.value, 10) || 0;
        var delta = type === 'BUY' ? quantity : -quantity;
        qtyInput.value = Math.max(0, current + delta);
    }

    function showMessage(el, text, type) {
        if (!el) return;
        el.textContent = text;
        el.className =
            'text-xs py-1 ' +
            (type === 'success'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-red-500 dark:text-red-400');
        el.classList.remove('hidden');
        setTimeout(function () {
            el.classList.add('hidden');
        }, 4000);
    }
});
