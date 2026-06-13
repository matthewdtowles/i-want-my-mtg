/**
 * "Add to buy list" control (Phase 6.5). Used on the card page: POSTs the
 * card + chosen finish to /api/v1/buy-list (increments quantity). Finish comes
 * from the optional Normal/Foil select, else the card's only available finish.
 */
document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('buy-list-add-btn');
    if (!btn || typeof AjaxUtils === 'undefined') return;
    var result = document.getElementById('buy-list-add-result');
    var finishSelect = document.getElementById('buy-list-finish');

    function chosenFoil() {
        if (finishSelect) return finishSelect.value === 'true';
        // Single-finish card: foil only when it has no normal printing.
        return btn.getAttribute('data-has-normal') !== 'true';
    }

    btn.addEventListener('click', function () {
        var cardId = btn.getAttribute('data-card-id');
        if (!cardId) return;
        btn.disabled = true;
        AjaxUtils.fetchWithGate('/api/v1/buy-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: cardId, isFoil: chosenFoil(), quantity: 1 }),
        })
            .then(function (res) {
                btn.disabled = false;
                if (res.gated) return;
                if (!res.ok) {
                    if (result) result.textContent = 'Could not add.';
                    return;
                }
                if (result) result.textContent = 'Added to your buy list.';
            })
            .catch(function () {
                btn.disabled = false;
                if (result) result.textContent = 'Could not add.';
            });
    });
});
