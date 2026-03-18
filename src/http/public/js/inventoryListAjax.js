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
        html +=
            '<td class="table-cell" data-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" data-img-src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '">';
        html +=
            '<a href="' +
            AjaxUtils.escapeHtml(url) +
            '" class="card-name-link">' +
            AjaxUtils.escapeHtml(item.cardName || '') +
            '</a>';
        if (item.tags && item.tags.length > 0) {
            for (var t = 0; t < item.tags.length; t++) {
                html += '<span class="tag">' + AjaxUtils.escapeHtml(item.tags[t]) + '</span>';
            }
        }
        html += '<a href="' + AjaxUtils.escapeHtml(url) + '" class="card-img-link">';
        html +=
            '<img src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '" alt="' +
            AjaxUtils.escapeHtml(item.cardName || '') +
            '" class="card-img-preview" />';
        html += '</a></td>';

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
        html +=
            '<form class="delete-inventory-form" data-item-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '">';
        html +=
            '<input type="hidden" name="card-id" value="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" />';
        html += '<input type="hidden" name="isFoil" value="' + item.isFoil + '" />';
        html += '<button type="button" class="delete-inventory-button">';
        html += '<i class="fas fa-trash-alt"></i>';
        html += '</button></form></td>';

        html += '</tr>';
        return html;
    }

    function renderCardsOwnedForm(item) {
        var foilClass = item.isFoil ? 'foil' : 'normal';
        var html =
            '<form class="quantity-form quantity-form-' +
            foilClass +
            '"' +
            ' data-item-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" data-foil="' +
            item.isFoil +
            '">';
        html +=
            '<input type="hidden" name="cardId" value="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" />';
        html +=
            '<button type="button" class="increment-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-purple-400 active:text-purple-600">+</button>';
        html +=
            '<input type="number" name="quantity-owned" class="quantity-owned" value="' +
            item.quantity +
            '" data-id="' +
            AjaxUtils.escapeHtml(item.cardId) +
            '" />';
        html += '<input type="hidden" name="isFoil" value="' + item.isFoil + '" />';
        html +=
            '<button type="button" class="decrement-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-red-400 active:text-red-600">-</button>';
        html += '</form>';
        return html;
    }
});
