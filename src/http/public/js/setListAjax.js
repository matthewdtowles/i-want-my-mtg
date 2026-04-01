document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-list-ajax');
    if (!container) return;

    var authenticated = container.dataset.authenticated === 'true';

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/sets',
        basePath: '/sets',
        renderContent: renderTable,
        errorMessage: 'Failed to load sets',
        extraApiParams: function (state) {
            return state.sort ? '' : 'group=block';
        },
    });
    if (!page) return;

    function renderTable(resultsEl, sets, meta) {
        if (!sets || sets.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No sets match your search',
                clearHref: '/sets',
            });
            return;
        }

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

        if (meta && meta.multiSetBlockKeys) {
            var multiSetKeys = {};
            for (var m = 0; m < meta.multiSetBlockKeys.length; m++) {
                multiSetKeys[meta.multiSetBlockKeys[m]] = true;
            }
            var groups = SetListUtils.groupByBlock(sets, multiSetKeys);
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

        var rowClass = indented ? 'table-row block-child-row' : 'table-row';
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

    function formatWeeklyChange(prices) {
        if (!prices) return '';
        var change = prices.basePriceChangeWeekly;
        if (change == null || change === 0) change = prices.totalPriceChangeWeekly;
        if (change == null || change === 0) return '';
        return AjaxUtils.renderPriceChange(change);
    }
});
