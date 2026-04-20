(function () {
    'use strict';

    var DEBOUNCE_MS = 250;
    var MIN_CHARS = 2;
    var LIMIT = 10;

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function rarityClass(rarity) {
        var r = (rarity || '').toLowerCase();
        if (r === 'common' || r === 'uncommon' || r === 'rare' || r === 'mythic') return r;
        return 'common';
    }

    function init() {
        var root = document.getElementById('deck-card-adder');
        if (!root) return;

        var deckId = root.getAttribute('data-deck-id');
        var input = document.getElementById('deck-add-search');
        var resultsEl = document.getElementById('deck-add-results');
        var qtyInput = document.getElementById('deck-add-qty');
        var sbCheckbox = document.getElementById('deck-add-sideboard');
        var statusEl = document.getElementById('deck-add-status');

        var debounceTimer = null;
        var controller = null;
        var activeIndex = -1;
        var currentResults = [];

        function hide() {
            resultsEl.classList.add('hidden');
            activeIndex = -1;
        }

        function show() {
            resultsEl.classList.remove('hidden');
        }

        function setStatus(msg, isError) {
            statusEl.textContent = msg || '';
            statusEl.classList.toggle('text-red-600', !!isError);
            statusEl.classList.toggle('text-gray-500', !isError);
        }

        function renderResults(cards) {
            currentResults = cards || [];
            if (!currentResults.length) {
                resultsEl.innerHTML =
                    '<div class="px-3 py-2 text-sm text-gray-500">No matches.</div>';
                show();
                return;
            }
            var html = '';
            for (var i = 0; i < currentResults.length; i++) {
                var c = currentResults[i];
                html +=
                    '<button type="button" data-index="' +
                    i +
                    '" class="deck-add-result w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-teal-50 dark:hover:bg-midnight-700 text-sm border-b border-gray-100 dark:border-midnight-700 last:border-0">' +
                    '<i class="ss ss-' +
                    escapeHtml(c.keyruneCode || c.setCode) +
                    ' ss-' +
                    rarityClass(c.rarity) +
                    ' ss-fw"></i>' +
                    '<span class="flex-1">' +
                    escapeHtml(c.name) +
                    '</span>' +
                    '<span class="text-xs text-gray-500 uppercase">' +
                    escapeHtml((c.setCode || '').toString()) +
                    '</span>' +
                    '<span class="text-xs text-gray-400">#' +
                    escapeHtml(c.number || '') +
                    '</span>' +
                    '</button>';
            }
            resultsEl.innerHTML = html;
            activeIndex = -1;
            show();
        }

        function highlight(index) {
            var items = resultsEl.querySelectorAll('.deck-add-result');
            for (var i = 0; i < items.length; i++) {
                items[i].classList.toggle('bg-teal-50', i === index);
                items[i].classList.toggle('dark:bg-midnight-700', i === index);
            }
            activeIndex = index;
            if (items[index]) {
                items[index].scrollIntoView({ block: 'nearest' });
            }
        }

        function fetchResults(term) {
            if (controller) controller.abort();
            controller = new AbortController();
            var url = '/api/v1/cards?q=' + encodeURIComponent(term) + '&limit=' + LIMIT;
            fetch(url, { credentials: 'same-origin', signal: controller.signal })
                .then(function (res) {
                    return res.json();
                })
                .then(function (json) {
                    if (!json || !json.success) {
                        renderResults([]);
                        return;
                    }
                    renderResults(json.data || []);
                })
                .catch(function (err) {
                    if (err.name !== 'AbortError') {
                        renderResults([]);
                    }
                });
        }

        function addCard(card) {
            var qty = parseInt(qtyInput.value, 10);
            if (!Number.isInteger(qty) || qty < 1) {
                setStatus('Enter a quantity of 1 or more.', true);
                return;
            }
            var isSideboard = sbCheckbox.checked;
            var form = new URLSearchParams();
            form.set('cardId', card.id);
            form.set('quantity', String(qty));
            form.set('isSideboard', String(isSideboard));
            form.set('mode', 'add');

            setStatus('Adding ' + card.name + '...');

            fetch('/decks/' + encodeURIComponent(deckId) + '/cards', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: form.toString(),
            })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function () {
                    setStatus('Added ' + qty + 'x ' + card.name + '. Reloading...');
                    window.location.reload();
                })
                .catch(function () {
                    setStatus('Failed to add card. Try again.', true);
                });
        }

        input.addEventListener('input', function () {
            var term = input.value.trim();
            clearTimeout(debounceTimer);
            if (term.length < MIN_CHARS) {
                hide();
                return;
            }
            debounceTimer = setTimeout(function () {
                fetchResults(term);
            }, DEBOUNCE_MS);
        });

        input.addEventListener('focus', function () {
            if (currentResults.length && input.value.trim().length >= MIN_CHARS) show();
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                hide();
                return;
            }
            if (resultsEl.classList.contains('hidden')) return;
            var items = resultsEl.querySelectorAll('.deck-add-result');
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlight(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlight(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0 && currentResults[activeIndex]) {
                    e.preventDefault();
                    addCard(currentResults[activeIndex]);
                }
            }
        });

        resultsEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.deck-add-result');
            if (!btn) return;
            var idx = parseInt(btn.getAttribute('data-index'), 10);
            if (isNaN(idx) || !currentResults[idx]) return;
            addCard(currentResults[idx]);
        });

        document.addEventListener('click', function (e) {
            if (!root.contains(e.target)) hide();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
