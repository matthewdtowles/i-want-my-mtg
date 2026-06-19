/**
 * Deck detail page (10.4 + 10.6 / #536): in-page card search, quantity
 * steppers, remove, rename/format, delete.
 *
 * Card mutations hit /api/v1/decks/:id/cards and update the DOM in place; totals
 * (deck value, board counts, group counts, illegal count) recompute client-side
 * from data-unit-value on each row. The search box (#536) queries the grouped
 * card endpoint (one row per name) and adds straight to main/sideboard, inserting
 * the new row (creating the type group if needed) without a full reload. Card art
 * on hover comes for free from cardPreview.js, which binds globally to any
 * .card-name-link[data-card-img]. Deck-level edits reload so the server
 * re-renders legality + grouping.
 */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof AjaxUtils === 'undefined') return;

    var root = document.querySelector('.content-wrapper[data-deck-id]');
    if (!root) return;
    var base = '/api/v1/decks/' + root.getAttribute('data-deck-id');
    var deckFormat = (root.getAttribute('data-deck-format') || '').trim();

    // Maindeck grouping order, mirrored from DeckPageOrchestrator so search-added
    // rows land in (and create) the same groups the server renders. 'Other'
    // sorts after the named types; 'Sideboard' always sorts last.
    var TYPE_ORDER = [
        'Creature',
        'Planeswalker',
        'Instant',
        'Sorcery',
        'Artifact',
        'Enchantment',
        'Battle',
        'Land',
    ];
    var TYPE_PLURAL = {
        Creature: 'Creatures',
        Planeswalker: 'Planeswalkers',
        Instant: 'Instants',
        Sorcery: 'Sorceries',
        Artifact: 'Artifacts',
        Enchantment: 'Enchantments',
        Battle: 'Battles',
        Land: 'Lands',
        Other: 'Other',
        Sideboard: 'Sideboard',
    };
    var EM_DASH = String.fromCharCode(0x2014);

    function primaryType(typeLine) {
        var head = (typeLine || '').split(EM_DASH)[0];
        for (var i = 0; i < TYPE_ORDER.length; i++) {
            if (head.indexOf(TYPE_ORDER[i]) !== -1) return TYPE_ORDER[i];
        }
        return 'Other';
    }

    function groupOrderIndex(key) {
        if (key === 'Sideboard') return 999;
        var idx = TYPE_ORDER.indexOf(key);
        return idx >= 0 ? idx : 500; // 'Other' between named types and sideboard
    }

    function fmt(n) {
        return '$' + (Math.round(n * 100) / 100).toFixed(2);
    }

    function unitValueOf(card) {
        // Mirrors PriceCalculationPolicy.calculateCardValue(normal, foil, false):
        // normal price, falling back to foil, then 0.
        var p = card && card.prices;
        if (!p) return 0;
        if (p.normal != null) return p.normal;
        if (p.foil != null) return p.foil;
        return 0;
    }

    function rowQty(row) {
        return parseInt(row.querySelector('.deck-qty-val').textContent, 10) || 0;
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
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
        var sideWrap = document.getElementById('deck-side-wrap');
        if (sideWrap) sideWrap.classList.toggle('hidden', sideCount === 0);

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

    // ── Row / group construction (search-added cards) ───────────────

    function buildRow(opts) {
        // opts: { cardId, name, url, imgSrc, unitValue, quantity, isSideboard, illegal }
        var row = document.createElement('div');
        row.className =
            'flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-midnight-800';
        row.setAttribute('data-card-id', opts.cardId);
        row.setAttribute('data-sideboard', opts.isSideboard ? 'true' : 'false');
        row.setAttribute('data-unit-value', String(opts.unitValue));

        var stepper = document.createElement('span');
        stepper.className =
            'inline-flex items-center rounded-md border border-gray-200 dark:border-midnight-700';
        stepper.innerHTML =
            '<button type="button" class="deck-step px-2 py-0.5 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400" data-delta="-1" aria-label="Decrease quantity">−</button>' +
            '<span class="deck-qty-val w-7 text-center text-sm font-mono">' +
            opts.quantity +
            '</span>' +
            '<button type="button" class="deck-step px-2 py-0.5 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400" data-delta="1" aria-label="Increase quantity">+</button>';
        row.appendChild(stepper);

        var link = document.createElement('a');
        link.href = opts.url;
        link.className = 'card-name-link flex-1 text-sm hover:text-teal-600 dark:hover:text-teal-400 truncate';
        if (opts.imgSrc) link.setAttribute('data-card-img', opts.imgSrc);
        link.textContent = opts.name;
        row.appendChild(link);

        if (opts.illegal) {
            var badge = document.createElement('span');
            badge.className =
                'deck-illegal-badge text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
            badge.title = 'Not legal in this format';
            badge.textContent = 'Not legal';
            row.appendChild(badge);
        }

        var lineValue = document.createElement('span');
        lineValue.className =
            'deck-line-value text-sm font-mono text-gray-600 dark:text-gray-400 w-16 text-right';
        lineValue.textContent = fmt(opts.quantity * opts.unitValue);
        row.appendChild(lineValue);

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'deck-remove px-2 text-gray-400 hover:text-red-500';
        remove.setAttribute('aria-label', 'Remove card');
        remove.innerHTML = '×';
        row.appendChild(remove);

        return row;
    }

    // Find the group section for a key, creating + ordering it if absent.
    function ensureGroup(key) {
        var container = document.getElementById('deck-cards');
        var existing = container.querySelector('.deck-group[data-group-type="' + key + '"]');
        if (existing) return existing.querySelector('.deck-group-rows');

        var group = document.createElement('div');
        group.className = 'deck-group mb-5';
        group.setAttribute('data-group-type', key);
        var label = TYPE_PLURAL[key] || key;
        group.innerHTML =
            '<h3 class="font-display font-semibold text-gray-700 dark:text-gray-200 mb-2">' +
            AjaxUtils.escapeHtml(label) +
            ' <span class="text-gray-400 font-normal">(<span class="deck-group-count">0</span>)</span></h3>' +
            '<div class="deck-group-rows"></div>';

        // Insert before the first existing group that sorts after this one (and
        // always before the empty-state placeholder), so the order matches the
        // server's TYPE_ORDER rendering.
        var newIndex = groupOrderIndex(key);
        var groups = container.querySelectorAll('.deck-group');
        var inserted = false;
        for (var i = 0; i < groups.length; i++) {
            var k = groups[i].getAttribute('data-group-type');
            if (groupOrderIndex(k) > newIndex) {
                container.insertBefore(group, groups[i]);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            var emptyState = document.getElementById('deck-empty-state');
            container.insertBefore(group, emptyState || null);
        }
        return group.querySelector('.deck-group-rows');
    }

    // Insert (or bump the quantity of) a card just added via search.
    function applyAdded(card, isSideboard) {
        var emptyState = document.getElementById('deck-empty-state');
        if (emptyState) emptyState.classList.add('hidden');

        var board = isSideboard ? 'true' : 'false';
        var existing = document.querySelector(
            '#deck-cards [data-card-id="' +
                (window.CSS && CSS.escape ? CSS.escape(card.id) : card.id) +
                '"][data-sideboard="' +
                board +
                '"]'
        );
        if (existing) {
            var qty = rowQty(existing) + 1;
            existing.querySelector('.deck-qty-val').textContent = qty;
            updateLineValue(existing, qty);
            recompute();
            return;
        }

        var key = isSideboard ? 'Sideboard' : primaryType(card.type);
        var rows = ensureGroup(key);
        var illegal = !!deckFormat && card.legal === false;
        var row = buildRow({
            cardId: card.id,
            name: card.name,
            url: card.url,
            imgSrc: card.imgSrc,
            unitValue: unitValueOf(card),
            quantity: 1,
            isSideboard: isSideboard,
            illegal: illegal,
        });
        rows.appendChild(row);
        recompute();
    }

    // ── Quantity steppers + remove (event-delegated so search-added rows work) ──

    var deckCards = document.getElementById('deck-cards');
    if (deckCards) {
        deckCards.addEventListener('click', function (e) {
            var stepBtn = e.target.closest ? e.target.closest('.deck-step') : null;
            if (stepBtn && deckCards.contains(stepBtn)) {
                onStep(stepBtn);
                return;
            }
            var removeBtn = e.target.closest ? e.target.closest('.deck-remove') : null;
            if (removeBtn && deckCards.contains(removeBtn)) {
                onRemove(removeBtn);
            }
        });
    }

    function onStep(btn) {
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
    }

    function onRemove(btn) {
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
    }

    // ── In-page card search (#536) ──────────────────────────────────

    var searchInput = document.getElementById('deck-card-search');
    var resultsBox = document.getElementById('deck-search-results');
    var searchStatus = document.getElementById('deck-search-status');
    var DEBOUNCE_MS = 250;
    var MIN_CHARS = 2;
    var debounceTimer = null;
    var searchSeq = 0;

    function setStatus(text) {
        if (!searchStatus) return;
        if (text) {
            searchStatus.textContent = text;
            searchStatus.classList.remove('hidden');
        } else {
            searchStatus.textContent = '';
            searchStatus.classList.add('hidden');
        }
    }

    function clearResults() {
        if (resultsBox) {
            resultsBox.innerHTML = '';
            resultsBox.classList.add('hidden');
        }
        if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
    }

    function buildResultItem(card) {
        var item = document.createElement('div');
        item.className =
            'deck-result flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-midnight-800';
        item.setAttribute('role', 'option');

        var link = document.createElement('a');
        link.href = card.url;
        link.className = 'card-name-link flex-1 text-sm truncate';
        if (card.imgSrc) link.setAttribute('data-card-img', card.imgSrc);
        link.textContent = card.name;
        item.appendChild(link);

        var value = unitValueOf(card);
        var meta = document.createElement('span');
        meta.className = 'text-xs text-gray-400 font-mono whitespace-nowrap';
        meta.textContent = (card.setCode ? card.setCode.toUpperCase() + ' · ' : '') + fmt(value);
        item.appendChild(meta);

        if (deckFormat && card.legal === false) {
            var warn = document.createElement('span');
            warn.className = 'text-xs text-red-600 dark:text-red-400 whitespace-nowrap';
            warn.title = 'Not legal in this format';
            warn.textContent = 'Not legal';
            item.appendChild(warn);
        }

        item.appendChild(makeAddButton(card, false, '+ Deck', 'Add to maindeck'));
        item.appendChild(makeAddButton(card, true, 'SB', 'Add to sideboard'));
        return item;
    }

    function makeAddButton(card, isSideboard, label, aria) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
            'deck-result-add btn btn-ghost text-xs px-2 py-0.5 whitespace-nowrap text-teal-600 dark:text-teal-400';
        btn.textContent = label;
        btn.setAttribute('aria-label', aria + ': ' + card.name);
        btn.addEventListener('click', function () {
            if (btn.disabled) return;
            btn.disabled = true;
            AjaxUtils.fetchWithGate(base + '/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId: card.id, isSideboard: isSideboard, quantity: 1 }),
            })
                .then(function (res) {
                    btn.disabled = false;
                    if (res.gated) return;
                    if (!res.ok) {
                        setStatus('Could not add ' + card.name + '.');
                        return;
                    }
                    applyAdded(card, isSideboard);
                    setStatus(
                        'Added ' + card.name + (isSideboard ? ' to sideboard.' : ' to maindeck.')
                    );
                })
                .catch(function () {
                    btn.disabled = false;
                    setStatus('Could not add ' + card.name + '.');
                });
        });
        return btn;
    }

    function renderResults(cards) {
        if (!resultsBox) return;
        resultsBox.innerHTML = '';
        if (!cards.length) {
            clearResults();
            setStatus('No cards found.');
            return;
        }
        cards.forEach(function (card) {
            resultsBox.appendChild(buildResultItem(card));
        });
        resultsBox.classList.remove('hidden');
        if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
        setStatus('');
    }

    function runSearch(term) {
        var seq = ++searchSeq;
        var url =
            '/api/v1/cards?groupBy=name&limit=15&q=' +
            encodeURIComponent(term) +
            (deckFormat ? '&format=' + encodeURIComponent(deckFormat) : '');
        AjaxUtils.fetchWithGate(url, { method: 'GET' })
            .then(function (res) {
                if (seq !== searchSeq) return; // a newer query superseded this one
                if (res.gated) return;
                if (!res.ok || !res.body || !res.body.data) {
                    setStatus('Search failed. Try again.');
                    return;
                }
                renderResults(res.body.data);
            })
            .catch(function () {
                if (seq !== searchSeq) return;
                setStatus('Search failed. Try again.');
            });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var term = searchInput.value.trim();
            if (debounceTimer) clearTimeout(debounceTimer);
            if (term.length < MIN_CHARS) {
                searchSeq++; // invalidate any in-flight query
                clearResults();
                setStatus('');
                return;
            }
            setStatus('Searching…');
            debounceTimer = setTimeout(function () {
                runSearch(term);
            }, DEBOUNCE_MS);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                clearResults();
                setStatus('');
            }
        });
    }

    // ── Deck-level edit (rename / format) + delete ──────────────────

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
