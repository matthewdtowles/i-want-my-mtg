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

            if (data.success) {
                showMessage(msgEl, 'Transaction recorded!', 'success');
                form.querySelector('input[name="quantity"]').value = '1';
            } else {
                showMessage(msgEl, data.error || 'Failed to record transaction.', 'error');
            }
        } catch (error) {
            console.error('Error recording transaction:', error);
            showMessage(msgEl, 'Failed to record transaction.', 'error');
        }
    });

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
