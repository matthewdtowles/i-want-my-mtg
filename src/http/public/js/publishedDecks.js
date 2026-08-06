/**
 * Published tournament decks: one grid section per format, newest first. Each
 * section appends its next batch when "Load more" is pressed, and "View all
 * formats" pulls in the sections for non-primary formats on demand.
 *
 * Loading is explicit rather than scroll-triggered: a horizontal track that
 * fetched as you neared its end made both the page length and the number of
 * decks unpredictable, and left keyboard users no way to reach the rest.
 *
 * The card/section markup here mirrors the publishedDeckCard.hbs /
 * publishedDeckRow.hbs partials - keep them in sync.
 */
(function () {
    var ROWS_ENDPOINT = '/published-decks/rows';
    var BATCH = 12;

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.deck-section').forEach(setupSection);

        var viewAllBtn = document.getElementById('view-all-formats');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', function () {
                viewAllBtn.disabled = true;
                loadOtherFormats(viewAllBtn);
            });
        }
    });

    /** Wire a section's "Load more" button. */
    function setupSection(section) {
        var grid = section.querySelector('.deck-section-grid');
        var button = section.querySelector('.deck-section-more');
        if (!grid || !button) return;

        var state = {
            format: section.getAttribute('data-format'),
            nextOffset: parseInt(section.getAttribute('data-next-offset'), 10) || 0,
            hasMore: section.getAttribute('data-has-more') === 'true',
            loading: false,
        };

        button.addEventListener('click', function () {
            loadMore(grid, button, state);
        });
    }

    function loadMore(grid, button, state) {
        if (state.loading || !state.hasMore) return;
        state.loading = true;
        button.disabled = true;
        var label = button.textContent;
        button.textContent = 'Loading...';

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
                    removeButton(button);
                    return;
                }
                var data = json.data;
                var first = null;
                (data.items || []).forEach(function (item) {
                    var card = buildCard(item);
                    if (!first) first = card;
                    grid.appendChild(card);
                });
                state.nextOffset = data.nextOffset;
                state.hasMore = !!data.hasMore;

                announce((data.items || []).length + ' more decks loaded.');

                if (state.hasMore) {
                    // Keep focus on the button. It is still there, still under the
                    // pointer, and moving focus into the grid scrolled the page far
                    // enough that you lost both the button and the row you were
                    // reading.
                    button.disabled = false;
                    button.textContent = label;
                    button.focus({ preventScroll: true });
                } else {
                    // The button is going away, so focus has to land somewhere:
                    // the first new card, scrolled by the smallest amount that
                    // brings it into view rather than yanked to the top.
                    removeButton(button);
                    if (first) {
                        first.focus({ preventScroll: true });
                        first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                    }
                }
            })
            .catch(function () {
                state.loading = false;
                removeButton(button);
            });
    }

    /**
     * Tell screen readers what arrived, since focus no longer moves to it.
     * Cleared first, then set on a timeout: successive loads produce the same
     * message and a live region will not re-announce unchanged text.
     */
    function announce(message) {
        var region = document.getElementById('aria-live-announcer');
        if (!region) return;
        region.textContent = '';
        setTimeout(function () {
            region.textContent = message;
        }, 100);
    }

    /** Drop the button (and its centering wrapper) once there is nothing left. */
    function removeButton(button) {
        var footer = button.closest ? button.closest('.deck-section-footer') : null;
        (footer || button).remove();
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
                    ROWS_ENDPOINT +
                        '?format=' +
                        encodeURIComponent(format) +
                        '&offset=0&limit=' +
                        BATCH,
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
                var section = buildSection(r.format, r.data);
                container.appendChild(section);
                setupSection(section);
            });
            btn.remove();
        });
    }

    /** Build a section matching publishedDeckRow.hbs, then fill its grid. */
    function buildSection(format, data) {
        var section = document.createElement('section');
        section.className = 'deck-section';
        section.setAttribute('data-format', format);
        section.setAttribute('data-next-offset', String(data.nextOffset));
        section.setAttribute('data-has-more', data.hasMore ? 'true' : 'false');

        var label = capitalize(format);
        var heading = document.createElement('h2');
        heading.className = 'font-display font-semibold text-lg text-gray-900 dark:text-white mb-3';
        heading.textContent = label;
        section.appendChild(heading);

        var grid = document.createElement('div');
        grid.className =
            'deck-section-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        (data.items || []).forEach(function (item) {
            grid.appendChild(buildCard(item));
        });
        section.appendChild(grid);

        if (data.hasMore) {
            var footer = document.createElement('div');
            footer.className = 'deck-section-footer mt-4 flex justify-center';
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'deck-section-more btn btn-secondary text-sm';
            button.textContent = 'Load more ' + label + ' decks';
            footer.appendChild(button);
            section.appendChild(footer);
        }
        return section;
    }

    /** Build one deck card, mirroring publishedDeckCard.hbs. */
    function buildCard(item) {
        var a = document.createElement('a');
        a.href = item.url;
        a.className =
            'published-deck-card section-container !p-0 overflow-hidden flex flex-col h-full ' +
            'hover:border-teal-400 dark:hover:border-teal-500 transition-colors group';

        var art = document.createElement('span');
        art.className = 'relative block h-24 bg-gray-200 dark:bg-midnight-700 shrink-0';
        if (item.coverImgSrc) {
            var img = document.createElement('img');
            img.src = item.coverImgSrc;
            // Decorative: the title over the scrim already names the deck.
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.width = 626;
            img.height = 457;
            img.className =
                'absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105';
            art.appendChild(img);
        }
        var scrim = document.createElement('span');
        scrim.className =
            'absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2';
        var title = document.createElement('span');
        title.className =
            'font-display font-semibold text-base text-white drop-shadow line-clamp-2 break-words';
        title.title = item.title;
        title.textContent = item.title;
        scrim.appendChild(title);
        art.appendChild(scrim);
        a.appendChild(art);

        var body = document.createElement('span');
        body.className = 'flex flex-col flex-1 p-3';

        var pips = buildPips(item.colors);
        if (pips) body.appendChild(pips);

        if (item.tournamentName) {
            var tourney = document.createElement('span');
            tourney.className = 'mt-1 block text-sm text-gray-600 dark:text-gray-400 truncate';
            tourney.textContent = item.tournamentName;
            body.appendChild(tourney);
        }

        var meta = document.createElement('span');
        meta.className =
            'mt-auto pt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400';
        var left = document.createElement('span');
        left.textContent = item.result ? item.result : item.cardCount + ' cards';
        var right = document.createElement('span');
        right.className = 'font-mono text-gray-900 dark:text-gray-100';
        right.textContent = item.estimatedValue;
        meta.appendChild(left);
        meta.appendChild(right);
        body.appendChild(meta);

        if (item.date) {
            var date = document.createElement('span');
            date.className = 'mt-1 block text-xs text-gray-400';
            date.textContent = item.date;
            body.appendChild(date);
        }

        a.appendChild(body);
        return a;
    }

    /** Build the deck-colors pip span, mirroring deckColors.hbs. */
    function buildPips(colors) {
        if (!colors || colors.length === 0) return null;
        var span = document.createElement('span');
        span.className = 'deck-colors inline-flex';
        span.title = 'Colors in this deck';
        colors.forEach(function (pip) {
            var i = document.createElement('i');
            i.className =
                'ms ms-cost ms-shadow ms-' + pip.symbol + (pip.small ? ' deck-pip-sm' : '');
            span.appendChild(i);
        });
        return span;
    }

    function capitalize(value) {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    }
})();
