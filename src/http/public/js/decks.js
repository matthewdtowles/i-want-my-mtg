/**
 * Decks list page (10.4): create a deck (POST /api/v1/decks then open it) and
 * delete a deck inline. Uses AjaxUtils.fetchWithGate for the shared envelope.
 */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof AjaxUtils === 'undefined') return;

    var form = document.getElementById('deck-create-form');
    var result = document.getElementById('deck-create-result');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('deck-name').value.trim();
            var format = document.getElementById('deck-format').value;
            if (!name) {
                if (result) result.textContent = 'Enter a deck name.';
                return;
            }
            var body = { name: name };
            if (format) body.format = format;
            AjaxUtils.fetchWithGate('/api/v1/decks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
                .then(function (res) {
                    if (res.gated) return;
                    if (!res.ok) {
                        if (result) result.textContent = 'Could not create deck.';
                        return;
                    }
                    var id = res.body && res.body.data && res.body.data.id;
                    if (id) window.location.href = '/decks/' + id;
                    else window.location.reload();
                })
                .catch(function () {
                    if (result) result.textContent = 'Could not create deck.';
                });
        });
    }

    document.querySelectorAll('.deck-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-deck-id');
            var name = btn.getAttribute('data-deck-name') || 'this deck';
            if (!id) return;
            if (!window.confirm('Delete "' + name + '"? This cannot be undone.')) return;
            btn.disabled = true;
            AjaxUtils.fetchWithGate('/api/v1/decks/' + id, { method: 'DELETE' })
                .then(function (res) {
                    btn.disabled = false;
                    if (res.gated) return;
                    if (res.ok) {
                        var card = document.querySelector('.section-container[data-deck-id="' + id + '"]');
                        if (card) card.remove();
                    }
                })
                .catch(function () {
                    btn.disabled = false;
                });
        });
    });
});
