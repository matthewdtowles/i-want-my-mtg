document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('price-alert-form');
    if (!form) return;

    var messageEl = document.getElementById('price-alert-form-message');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideMessage();

        var cardId = form.querySelector('input[name="cardId"]').value;
        var increasePctVal = form.querySelector('input[name="increasePct"]').value;
        var decreasePctVal = form.querySelector('input[name="decreasePct"]').value;

        var increasePct = increasePctVal !== '' ? parseFloat(increasePctVal) : null;
        var decreasePct = decreasePctVal !== '' ? parseFloat(decreasePctVal) : null;

        if (increasePct == null && decreasePct == null) {
            showMessage('At least one threshold (increase or decrease) is required.', 'error');
            return;
        }

        var body = { cardId: cardId };
        if (increasePct != null) body.increasePct = increasePct;
        if (decreasePct != null) body.decreasePct = decreasePct;

        try {
            var response = await fetch('/api/v1/price-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await response.json().catch(function () { return null; });

            if (response.ok && data && data.success) {
                showMessage('Price alert created! <a href="/price-alerts" class="underline">View alerts</a>', 'success');
                form.reset();
            } else {
                var msg = (data && data.error) || 'Failed to create price alert.';
                showMessage(msg, 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Error creating price alert.', 'error');
        }
    });

    function showMessage(html, type) {
        if (!messageEl) return;
        messageEl.classList.remove('hidden', 'text-teal-600', 'dark:text-teal-400', 'text-red-500', 'dark:text-red-400');
        if (type === 'success') {
            messageEl.classList.add('text-teal-600', 'dark:text-teal-400');
        } else {
            messageEl.classList.add('text-red-500', 'dark:text-red-400');
        }
        messageEl.innerHTML = html;
    }

    function hideMessage() {
        if (!messageEl) return;
        messageEl.classList.add('hidden');
        messageEl.innerHTML = '';
    }
});
