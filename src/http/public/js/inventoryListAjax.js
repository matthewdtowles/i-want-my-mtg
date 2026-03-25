document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('inventory-list-ajax');
    if (!container) return;

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/inventory',
        basePath: '/inventory',
        renderContent: renderTable,
        errorMessage: 'Failed to load inventory',
    });
    if (!page) return;

    function renderTable(resultsEl, items) {
        if (!items || items.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No items match your current filters',
                hint: 'Try a different search term or adjust your filters.',
                clearHref: '/inventory',
                clearLabel: 'Clear Filters',
            });
            return;
        }

        var headers = [
            { key: 'inventory.quantity', label: 'Owned' },
            { key: 'card.name', label: 'Card' },
            { key: 'card.setCode', label: 'Set' },
            { key: 'prices.normal', label: 'Price' },
            { key: '', label: '', classes: 'xs-hide' },
        ];

        var html = '<div class="table-wrapper"><table class="table-container w-full">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < items.length; i++) {
            html += renderInventoryRow(items[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderInventoryRow(item) {
        var html = '<tr class="table-row">';

        // Owned column
        html += '<td class="table-cell">' + renderCardsOwnedForm(item) + '</td>';

        // Card name with hover preview and tags
        var imgSrc = item.imgSrc || '';
        var url = item.url || '#';
        html += '<td class="table-cell">';
        html += AjaxUtils.renderCardLink(url, item.cardName || '', imgSrc, item.tags);
        html += '</td>';

        // Set column
        var keyruneCode = item.keyruneCode || item.setCode || '';
        var rarity = item.rarity || '';
        html += '<td class="table-cell">';
        if (item.setCode) {
            html +=
                '<a href="/sets/' +
                AjaxUtils.escapeHtml(item.setCode) +
                '" class="table-link">' +
                '<i class="ss ss-' +
                AjaxUtils.escapeHtml(keyruneCode) +
                ' ss-' +
                AjaxUtils.escapeHtml(rarity) +
                ' ss-fw"></i> ' +
                AjaxUtils.escapeHtml(item.setCode.toUpperCase()) +
                '</a>';
        }
        html += '</td>';

        // Price column
        html += '<td class="table-cell">';
        var priceValue = item.isFoil ? item.priceFoil : item.priceNormal;
        var priceClass = item.isFoil ? 'price-foil' : 'price-normal';
        html += '<span class="' + priceClass + '">' + AjaxUtils.toDollar(priceValue) + '</span>';
        html += '</td>';

        // Delete column
        html += '<td class="table-cell delete-inventory-entry xs-hide">';
        html += AjaxUtils.createDeleteForm(item.cardId, item.isFoil);
        html += '</td>';

        html += '</tr>';
        return html;
    }

    function renderCardsOwnedForm(item) {
        return AjaxUtils.createQuantityForm(item.cardId, item.quantity, item.isFoil);
    }
});
