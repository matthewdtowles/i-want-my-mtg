document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-list-ajax');
    if (!container) return;

    var authenticated = container.dataset.authenticated === 'true';
    var ART_CROP_BASE = 'https://cards.scryfall.io/art_crop/front/';

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/sets',
        basePath: '/sets',
        renderContent: renderList,
        errorMessage: 'Failed to load sets',
        extraApiParams: function (state) {
            return state.sort ? '' : 'group=block';
        },
    });
    if (!page) return;

    // Art tiles unless the visitor asked for the table. Anything else - including
    // the 'list' the URL parser falls back to - is the grid.
    function isTableView() {
        return page.state.view === 'table';
    }

    var toggleContainer = document.getElementById('set-view-toggle');
    if (toggleContainer) {
        AjaxUtils.setupViewToggleInterceptor({
            container: toggleContainer,
            state: page.state,
            fetchFn: page.fetchAndRender,
            // Distinct from the set page's list/binder toggle, which would
            // otherwise overwrite this preference.
            storageKey: 'setListViewPreference',
        });
    }

    function renderList(resultsEl, sets, meta) {
        if (!sets || sets.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No sets match your search',
                clearHref: '/sets',
            });
            syncToggle();
            return;
        }

        if (isTableView()) {
            renderTable(resultsEl, sets, meta);
        } else {
            renderGrid(resultsEl, sets, meta);
        }
        syncToggle();
    }

    function syncToggle() {
        if (toggleContainer) {
            AjaxUtils.updateViewToggle(toggleContainer, isTableView() ? 'table' : 'grid');
        }
    }

    /** Groups the page the same way the table does, so both layouts agree. */
    function groupsFor(sets, meta) {
        if (!meta || !meta.multiSetBlockKeys) return null;
        var multiSetKeys = {};
        for (var m = 0; m < meta.multiSetBlockKeys.length; m++) {
            multiSetKeys[meta.multiSetBlockKeys[m]] = true;
        }
        return SetListUtils.groupByBlock(sets, multiSetKeys);
    }

    /* ===== Grid view - mirrors partials/setGrid.hbs + partials/setTile.hbs ===== */

    // Same sorts the table offers as column headers, minus the static ones.
    var SORT_CHIPS = [
        { key: 'set.name', label: 'Set' },
        { key: 'setPrice.basePrice', label: 'Set Value' },
        { key: 'set.releaseDate', label: 'Release Date' },
    ];

    /**
     * Sort controls for the grid - mirrors partials/sortChips.hbs. Rendered with
     * the results because the AJAX re-render replaces the whole container, and
     * carries `sort-btn` so the shared sort interceptor picks the clicks up.
     */
    function renderSortChips() {
        var state = page.state;
        var html = '<div class="sort-chips" role="group" aria-label="Sort sets">';
        for (var i = 0; i < SORT_CHIPS.length; i++) {
            var chip = SORT_CHIPS[i];
            var isActive = state.sort === chip.key;
            // The arrow shows the direction the next click applies, matching the
            // server-rendered chips and the table headers.
            var nextAscend = isActive ? !state.ascend : true;
            var params = new URLSearchParams();
            params.set('page', '1');
            params.set('limit', String(state.limit));
            params.set('sort', chip.key);
            params.set('ascend', String(nextAscend));
            if (state.filter) params.set('filter', state.filter);
            if (state.baseOnly === false) params.set('baseOnly', 'false');

            html += '<a href="?' + params.toString() + '" class="sort-chip sort-btn';
            html += isActive ? ' sort-chip-active">' : '">';
            html += AjaxUtils.escapeHtml(chip.label);
            if (isActive) {
                html +=
                    ' <span class="sort-icon">' + (nextAscend ? '&#9650;' : '&#9660;') + '</span>';
            }
            html += '</a>';
        }
        return html + '</div>';
    }

    function renderGrid(resultsEl, sets, meta) {
        var html = renderSortChips() + '<div class="set-grid">';
        var groups = groupsFor(sets, meta);

        if (groups) {
            for (var g = 0; g < groups.length; g++) {
                if (groups[g].isMultiSet) {
                    html +=
                        '<h3 class="set-grid-label">' +
                        AjaxUtils.escapeHtml(groups[g].blockName) +
                        '</h3>';
                }
                for (var s = 0; s < groups[g].sets.length; s++) {
                    html += renderSetTile(groups[g].sets[s]);
                }
            }
        } else {
            for (var i = 0; i < sets.length; i++) {
                html += renderSetTile(sets[i]);
            }
        }

        html += '</div>';
        resultsEl.innerHTML = html;
    }

    function renderSetTile(set) {
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());
        var name = AjaxUtils.escapeHtml(set.name);
        var keyruneCode = AjaxUtils.escapeHtml(set.keyruneCode || set.code);
        var cardCount = set.baseSize || set.totalSize || 0;
        var year = (set.releaseDate || '').slice(0, 4);

        var html = '<a href="' + url + '" class="set-tile group">';
        if (set.coverImgSrc) {
            html +=
                '<img src="' +
                ART_CROP_BASE +
                AjaxUtils.escapeHtml(set.coverImgSrc) +
                '" alt="" aria-hidden="true" loading="lazy" decoding="async" ' +
                'width="626" height="457" class="set-tile-art" />';
        }
        if (set.tags && set.tags.length) {
            html += '<span class="set-tile-tags">' + AjaxUtils.renderTags(set.tags) + '</span>';
        }
        if (authenticated && set.ownedTotal) {
            html +=
                '<span class="set-tile-owned">' +
                AjaxUtils.toDollar(set.ownedValue) +
                ' owned</span>';
        }

        html += '<span class="set-tile-scrim">';
        html += '<i class="ss ss-' + keyruneCode + ' set-tile-symbol" aria-hidden="true"></i>';
        html += '<span class="set-tile-body">';
        html += '<span class="set-tile-name">' + name + '</span>';
        html += '<span class="set-tile-sub">' + year + ' &middot; ' + cardCount + ' cards</span>';
        html += '</span>';
        html += '<span class="set-tile-price">' + formatPrice(set.prices);
        html += formatTileChange(set.prices);
        html += '</span>';
        html += '</span>';

        if (AjaxUtils.isSubscribed() && set.completionRate) {
            html +=
                '<span class="set-tile-progress" aria-hidden="true">' +
                '<span class="set-tile-progress-fill" style="width: ' +
                Number(set.completionRate) +
                '%"></span></span>';
        }

        html += '</a>';
        return html;
    }

    /* ===== Table view - mirrors the table branch of partials/setList.hbs ===== */

    function renderTable(resultsEl, sets, meta) {
        var headers = [
            { key: 'set.name', label: 'Set' },
            { key: 'setPrice.basePrice', label: 'Set Value', subtitle: '7d', classes: 'xxs-hide' },
        ];
        if (authenticated) {
            headers.push({ key: '', label: 'Owned Value' });
        }
        headers.push({ key: 'set.releaseDate', label: 'Release Date', classes: 'xs-hide pr-2' });

        var html = '<div class="table-wrapper"><table class="min-w-full table-container">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';

        var groups = groupsFor(sets, meta);
        if (groups) {
            for (var g = 0; g < groups.length; g++) {
                var group = groups[g];
                if (group.isMultiSet) {
                    var colSpan = authenticated ? 4 : 3;
                    html += '<tr class="block-label-row">';
                    html += '<td colspan="' + colSpan + '" class="block-label">';
                    html += AjaxUtils.escapeHtml(group.blockName);
                    html += '</td></tr>';
                }
                for (var s = 0; s < group.sets.length; s++) {
                    group.sets[s]._blockGroupMember = group.isMultiSet;
                    html += renderSetRow(group.sets[s], group.isMultiSet && s > 0);
                }
            }
        } else {
            for (var i = 0; i < sets.length; i++) {
                html += renderSetRow(sets[i], false);
            }
        }

        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderSetRow(set, indented) {
        var keyruneCode = AjaxUtils.escapeHtml(set.keyruneCode || set.code);
        var name = AjaxUtils.escapeHtml(set.name);
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());

        var tagsHtml = AjaxUtils.renderTags(set.tags);

        var priceHtml = formatPrice(set.prices);
        var changeHtml = formatWeeklyChange(set.prices);

        var rowClass = 'table-row';
        if (set._blockGroupMember) rowClass += ' block-group-member';
        if (indented) rowClass += ' block-child-row';
        var html = '<tr class="' + rowClass + '">';
        html += '<td class="table-cell"><i class="ss ss-' + keyruneCode + ' ss-fw"></i> ';
        html += '<a href="' + url + '" class="table-link">' + name + '</a> ' + tagsHtml + '</td>';
        html += '<td class="table-cell xxs-hide">' + priceHtml + ' ' + changeHtml + '</td>';

        if (authenticated) {
            html += '<td class="table-cell">';
            if (set.ownedValue !== undefined && set.ownedValue !== null) {
                html +=
                    '<span class="text-sm font-medium text-gray-800 dark:text-gray-200">' +
                    AjaxUtils.toDollar(set.ownedValue) +
                    '</span>';
                html +=
                    '<div class="mt-0.5">' +
                    AjaxUtils.renderCompletionBar(set.completionRate || 0) +
                    '</div>';
            }
            html += '</td>';
        }

        html +=
            '<td class="table-cell xs-hide">' +
            AjaxUtils.escapeHtml(set.releaseDate || '') +
            '</td>';
        html += '</tr>';
        return html;
    }

    function formatPrice(prices) {
        if (!prices) return '-';
        var val = prices.basePrice;
        if (val == null || val <= 0) val = prices.basePriceAll;
        if (val == null || val <= 0) val = prices.totalPrice;
        if (val == null || val <= 0) val = prices.totalPriceAll;
        if (val == null || val <= 0) return '-';
        return AjaxUtils.toDollar(val);
    }

    function weeklyChange(prices) {
        if (!prices) return null;
        var change = prices.basePriceChangeWeekly;
        if (change == null || change === 0) change = prices.totalPriceChangeWeekly;
        return change == null || change === 0 ? null : change;
    }

    function formatWeeklyChange(prices) {
        var change = weeklyChange(prices);
        return change == null ? '' : AjaxUtils.renderPriceChange(change);
    }

    /**
     * The tile's badge sits on a dark scrim, so it uses the lighter
     * `set-tile-change-*` colors instead of the table's `price-change-*`.
     */
    function formatTileChange(prices) {
        var change = weeklyChange(prices);
        if (change == null) return '';
        var abs = AjaxUtils.toDollar(Math.abs(Math.round(change * 100) / 100));
        var sign = change > 0 ? '+' : '-';
        var direction = change > 0 ? 'positive' : 'negative';
        return (
            '<span class="set-tile-change set-tile-change-' +
            direction +
            '">' +
            sign +
            abs +
            '</span>'
        );
    }
});
