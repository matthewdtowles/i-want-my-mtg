/**
 * Published tournament decks: one horizontally-scrolling row per format. Each
 * row lazy-loads older decks (newest-first) as it's scrolled toward the end,
 * and "View all formats" pulls in the rows for non-primary formats on demand.
 *
 * The card/row markup here mirrors the publishedDeckCard.hbs / publishedDeckRow.hbs
 * partials - keep them in sync.
 */
(function () {
    var ROWS_ENDPOINT = '/published-decks/rows';
    var BATCH = 12;

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.deck-row').forEach(setupRow);

        var viewAllBtn = document.getElementById('view-all-formats');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', function () {
                viewAllBtn.disabled = true;
                loadOtherFormats(viewAllBtn);
            });
        }
    });

    /** Wire up a row's lazy side-scroll loading. */
    function setupRow(section) {
        var track = section.querySelector('.deck-row-track');
        var sentinel = section.querySelector('.deck-row-sentinel');
        if (!track || !sentinel) return;

        var state = {
            format: section.getAttribute('data-format'),
            nextOffset: parseInt(section.getAttribute('data-next-offset'), 10) || 0,
            hasMore: section.getAttribute('data-has-more') === 'true',
            loading: false,
        };
        if (!state.hasMore) return;

        if (typeof IntersectionObserver === 'undefined') {
            // No observer support: load the next batch whenever the track scrolls.
            track.addEventListener(
                'scroll',
                function () {
                    loadMore(track, sentinel, state);
                },
                { passive: true }
            );
            return;
        }

        var observer = new IntersectionObserver(
            function (entries) {
                if (entries[0].isIntersecting) loadMore(track, sentinel, state, observer);
            },
            // root is the scroll container; prefetch a bit before the end is reached.
            { root: track, rootMargin: '0px 300px 0px 0px' }
        );
        observer.observe(sentinel);
    }

    function loadMore(track, sentinel, state, observer) {
        if (state.loading || !state.hasMore) return;
        state.loading = true;

        var url =
            ROWS_ENDPOINT +
            '?format=' +
            encodeURIComponent(state.format) +
            '&offset=' +
            state.nextOffset +
            '&limit=' +
            BATCH;

        fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                state.loading = false;
                if (!json || !json.success || !json.data) {
                    state.hasMore = false;
                    if (observer) observer.disconnect();
                    return;
                }
                var data = json.data;
                (data.items || []).forEach(function (item) {
                    track.insertBefore(buildCard(item), sentinel);
                });
                state.nextOffset = data.nextOffset;
                state.hasMore = !!data.hasMore;
                if (!state.hasMore && observer) observer.disconnect();
            })
            .catch(function () {
                state.loading = false;
                state.hasMore = false;
                if (observer) observer.disconnect();
            });
    }

    /** Fetch and render the first batch for each non-primary format. */
    function loadOtherFormats(btn) {
        var formats = (btn.getAttribute('data-formats') || '')
            .split(',')
            .map(function (f) {
                return f.trim();
            })
            .filter(Boolean);
        var container = document.getElementById('other-format-rows');
        if (!container || formats.length === 0) {
            btn.remove();
            return;
        }

        Promise.all(
            formats.map(function (format) {
                return fetch(
                    ROWS_ENDPOINT + '?format=' + encodeURIComponent(format) + '&offset=0&limit=' + BATCH,
                    { credentials: 'same-origin' }
                )
                    .then(function (res) {
                        return res.json();
                    })
                    .then(function (json) {
                        return { format: format, data: json && json.success ? json.data : null };
                    })
                    .catch(function () {
                        return { format: format, data: null };
                    });
            })
        ).then(function (results) {
            results.forEach(function (r) {
                if (!r.data || !r.data.items || r.data.items.length === 0) return;
                var section = buildRow(r.format, r.data);
                container.appendChild(section);
                setupRow(section);
            });
            btn.remove();
        });
    }

    /** Build a row <section> matching publishedDeckRow.hbs, then fill its cards. */
    function buildRow(format, data) {
        var section = document.createElement('section');
        section.className = 'deck-row';
        section.setAttribute('data-format', format);
        section.setAttribute('data-next-offset', String(data.nextOffset));
        section.setAttribute('data-has-more', data.hasMore ? 'true' : 'false');

        var heading = document.createElement('h2');
        heading.className =
            'font-display font-semibold text-lg text-gray-900 dark:text-white mb-3';
        heading.textContent = capitalize(format);
        section.appendChild(heading);

        var track = document.createElement('div');
        track.className = 'deck-row-track flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x';

        var sentinel = document.createElement('div');
        sentinel.className = 'deck-row-sentinel shrink-0 w-px';
        sentinel.setAttribute('aria-hidden', 'true');

        (data.items || []).forEach(function (item) {
            track.appendChild(buildCard(item));
        });
        track.appendChild(sentinel);
        section.appendChild(track);
        return section;
    }

    /** Build one deck card, mirroring publishedDeckCard.hbs. */
    function buildCard(item) {
        var wrap = document.createElement('div');
        wrap.className = 'deck-row-item snap-start shrink-0 w-64';

        var a = document.createElement('a');
        a.href = item.url;
        a.className =
            'published-deck-card section-container block h-full hover:border-teal-400 dark:hover:border-teal-500 transition-colors';

        var title = document.createElement('span');
        title.className = 'block font-display font-semibold text-base text-gray-900 dark:text-white';
        title.textContent = item.title;
        a.appendChild(title);

        var pips = buildPips(item.colors);
        if (pips) a.appendChild(pips);

        if (item.tournamentName) {
            var tourney = document.createElement('div');
            tourney.className = 'mt-1 text-sm text-gray-600 dark:text-gray-400 truncate';
            tourney.textContent = item.tournamentName;
            a.appendChild(tourney);
        }

        var meta = document.createElement('div');
        meta.className =
            'mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400';
        var left = document.createElement('span');
        left.textContent = item.result ? item.result : item.cardCount + ' cards';
        var right = document.createElement('span');
        right.className = 'font-mono text-gray-900 dark:text-gray-100';
        right.textContent = item.estimatedValue;
        meta.appendChild(left);
        meta.appendChild(right);
        a.appendChild(meta);

        if (item.date) {
            var date = document.createElement('div');
            date.className = 'mt-1 text-xs text-gray-400';
            date.textContent = item.date;
            a.appendChild(date);
        }

        wrap.appendChild(a);
        return wrap;
    }

    /** Build the deck-colors pip span, mirroring deckColors.hbs. */
    function buildPips(colors) {
        if (!colors || colors.length === 0) return null;
        var span = document.createElement('span');
        span.className = 'deck-colors mt-2 inline-flex';
        span.title = 'Colors in this deck';
        colors.forEach(function (pip) {
            var i = document.createElement('i');
            i.className = 'ms ms-cost ms-shadow ms-' + pip.symbol + (pip.small ? ' deck-pip-sm' : '');
            span.appendChild(i);
        });
        return span;
    }

    function capitalize(value) {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    }
})();
