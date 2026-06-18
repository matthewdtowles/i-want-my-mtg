/**
 * "Add to deck" control (10.4) on the card page. Loads the user's decks into a
 * select (GET /api/v1/decks), then POSTs the card to the chosen deck. Choosing
 * "New deck" prompts for a name, creates it, then adds the card.
 */
document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('deck-add');
    if (!container || typeof AjaxUtils === 'undefined') return;
    var select = document.getElementById('deck-add-select');
    var btn = document.getElementById('deck-add-btn');
    var result = document.getElementById('deck-add-result');
    var cardId = container.getAttribute('data-card-id');
    var NEW = '__new__';

    function setOptions(decks) {
        select.innerHTML = '';
        decks.forEach(function (d) {
            var opt = document.createElement('option');
            opt.value = String(d.id);
            opt.textContent = d.name;
            select.appendChild(opt);
        });
        var newOpt = document.createElement('option');
        newOpt.value = NEW;
        newOpt.textContent = decks.length ? '+ New deck…' : 'Create a deck…';
        select.appendChild(newOpt);
        btn.disabled = false;
    }

    AjaxUtils.fetchWithGate('/api/v1/decks', { method: 'GET' })
        .then(function (res) {
            if (res.gated) return;
            var decks = res.ok && res.body && res.body.data ? res.body.data : [];
            setOptions(decks);
        })
        .catch(function () {
            setOptions([]);
        });

    function addToDeck(deckId) {
        return AjaxUtils.fetchWithGate('/api/v1/decks/' + deckId + '/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: cardId, quantity: 1 }),
        });
    }

    btn.addEventListener('click', function () {
        if (!cardId) return;
        var value = select.value;
        if (result) result.textContent = '';
        btn.disabled = true;

        var resolveDeckId;
        if (value === NEW) {
            var name = (window.prompt('New deck name:') || '').trim();
            if (!name) {
                btn.disabled = false;
                return;
            }
            resolveDeckId = AjaxUtils.fetchWithGate('/api/v1/decks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name }),
            }).then(function (res) {
                if (res.gated) return null;
                if (!res.ok) throw new Error('create failed');
                var deck = res.body && res.body.data;
                var opt = document.createElement('option');
                opt.value = String(deck.id);
                opt.textContent = deck.name;
                select.insertBefore(opt, select.lastChild);
                select.value = String(deck.id);
                return deck.id;
            });
        } else if (value) {
            resolveDeckId = Promise.resolve(parseInt(value, 10));
        } else {
            btn.disabled = false;
            return;
        }

        resolveDeckId
            .then(function (deckId) {
                if (!deckId) {
                    btn.disabled = false;
                    return;
                }
                return addToDeck(deckId).then(function (res) {
                    btn.disabled = false;
                    if (res.gated) return;
                    if (!res.ok) {
                        if (result) result.textContent = 'Could not add.';
                        return;
                    }
                    var opt = select.options[select.selectedIndex];
                    if (result) result.textContent = 'Added to ' + (opt ? opt.textContent : 'deck') + '.';
                });
            })
            .catch(function () {
                btn.disabled = false;
                if (result) result.textContent = 'Could not add.';
            });
    });
});
