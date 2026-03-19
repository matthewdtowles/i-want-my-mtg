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
    });
    if (!page) return;

    function renderTable(resultsEl, sets) {
        if (!sets || sets.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No sets match your search',
                clearHref: '/sets',
            });
            return;
        }

        var headers = [
            { key: 'set.name', label: 'Set' },
            { key: 'setPrice.basePrice', label: 'Set Value', subtitle: '7d' },
        ];
        if (authenticated) {
            headers.push({ key: '', label: 'Owned Value' });
        }
        headers.push({ key: 'set.releaseDate', label: 'Release Date', classes: 'xs-hide pr-2' });

        var html = '<div class="table-wrapper"><table class="min-w-full table-container">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < sets.length; i++) {
            html += renderSetRow(sets[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderSetRow(set) {
        var keyruneCode = AjaxUtils.escapeHtml(set.keyruneCode || set.code);
        var name = AjaxUtils.escapeHtml(set.name);
        var url = '/sets/' + encodeURIComponent(set.code.toLowerCase());

        var tagsHtml = AjaxUtils.renderTags(set.tags);

        var priceHtml = formatPrice(set.prices);
        var changeHtml = formatWeeklyChange(set.prices);

        var html = '<tr class="table-row">';
        html += '<td class="table-cell"><i class="ss ss-' + keyruneCode + ' ss-fw"></i> ';
        html += '<a href="' + url + '" class="table-link">' + name + '</a> ' + tagsHtml + '</td>';
        html += '<td class="table-cell">' + priceHtml + ' ' + changeHtml + '</td>';

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
