(function () {
    'use strict';

    var DEBOUNCE_MS = 300;
    var MIN_CHARS = 2;

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function initSearchSuggest(input) {
        var wrapper = input.parentElement;
        wrapper.style.position = 'relative';

        var dropdown = document.createElement('div');
        dropdown.className = 'search-suggest-dropdown hidden';
        wrapper.appendChild(dropdown);

        var debounceTimer = null;
        var controller = null;

        function hideDropdown() {
            dropdown.classList.add('hidden');
        }

        function showDropdown() {
            dropdown.classList.remove('hidden');
        }

        function renderDropdown(data) {
            var html = '';
            var hasCards = data.cards && data.cards.length > 0;
            var hasSets = data.sets && data.sets.length > 0;

            if (hasCards) {
                html += '<div class="suggest-section-header">Cards</div>';
                for (var i = 0; i < data.cards.length; i++) {
                    var card = data.cards[i];
                    html +=
                        '<a href="' +
                        escapeHtml(card.url) +
                        '" class="suggest-item">' +
                        '<i class="ss ss-' +
                        escapeHtml(card.keyruneCode) +
                        ' ss-' +
                        escapeHtml(card.rarity) +
                        ' ss-fw"></i>' +
                        '<span class="suggest-item-name">' +
                        escapeHtml(card.name) +
                        '</span>' +
                        '<span class="suggest-set-code">' +
                        escapeHtml(card.setCode).toUpperCase() +
                        '</span>' +
                        '</a>';
                }
            }

            if (hasSets) {
                html += '<div class="suggest-section-header">Sets</div>';
                for (var j = 0; j < data.sets.length; j++) {
                    var set = data.sets[j];
                    html +=
                        '<a href="' +
                        escapeHtml(set.url) +
                        '" class="suggest-item">' +
                        '<i class="ss ss-' +
                        escapeHtml(set.keyruneCode) +
                        ' ss-fw"></i>' +
                        '<span class="suggest-item-name">' +
                        escapeHtml(set.name) +
                        '</span>' +
                        '<span class="suggest-set-code">' +
                        escapeHtml(set.code).toUpperCase() +
                        '</span>' +
                        '</a>';
                }
            }

            var query = escapeHtml(data.query || '');
            html +=
                '<a href="/search?q=' +
                encodeURIComponent(data.query || '') +
                '" class="suggest-search-all">' +
                'Search for &ldquo;' +
                query +
                '&rdquo;' +
                '</a>';

            dropdown.innerHTML = html;
            showDropdown();
        }

        function fetchSuggestions(term) {
            if (controller) {
                controller.abort();
            }
            controller = new AbortController();

            fetch('/search/suggest?q=' + encodeURIComponent(term), {
                signal: controller.signal,
            })
                .then(function (res) {
                    return res.json();
                })
                .then(function (data) {
                    renderDropdown(data);
                })
                .catch(function (err) {
                    if (err.name !== 'AbortError') {
                        hideDropdown();
                    }
                });
        }

        input.addEventListener('input', function () {
            var term = input.value.trim();
            clearTimeout(debounceTimer);

            if (term.length < MIN_CHARS) {
                hideDropdown();
                return;
            }

            debounceTimer = setTimeout(function () {
                fetchSuggestions(term);
            }, DEBOUNCE_MS);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) {
                hideDropdown();
            }
        });

        input.addEventListener('focus', function () {
            if (input.value.trim().length >= MIN_CHARS && dropdown.innerHTML) {
                showDropdown();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var inputs = document.querySelectorAll('input[name="q"]');
        for (var i = 0; i < inputs.length; i++) {
            initSearchSuggest(inputs[i]);
        }
    });
})();
