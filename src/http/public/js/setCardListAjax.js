document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('set-card-list-ajax');
    if (!container) return;

    var setCode = container.dataset.setCode;
    var authenticated = container.dataset.authenticated === 'true';

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards',
        basePath: '/sets/' + encodeURIComponent(setCode),
        renderContent: renderTable,
        errorMessage: 'Failed to load cards',
        onSuccess: function (data, meta, done) {
            if (authenticated && data && data.length > 0) {
                fetchAndRenderInventory(data, done);
            } else {
                done();
            }
        },
    });
    if (!page) return;

    function renderTable(resultsEl, cards) {
        if (!cards || cards.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No cards match your search',
                clearHref: '/sets/' + AjaxUtils.escapeHtml(setCode),
            });
            return;
        }

        var headers = [
            { key: '', label: 'Owned' },
            { key: 'card.number', label: 'Card No.' },
            { key: 'card.name', label: 'Card' },
            { key: 'card.manaCost', label: 'Mana Cost', classes: 'xs-hide' },
            { key: 'card.rarity', label: 'Rarity', classes: 'xs-hide' },
            { key: 'price.normal', label: 'Normal', subtitle: '7d', classes: 'xs-hide' },
            { key: 'price.foil', label: 'Foil', subtitle: '7d', classes: 'xs-hide' },
            { key: '', label: 'Price', classes: 'xs-show' },
        ];

        var html = '<div class="table-wrapper"><table class="table-container">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < cards.length; i++) {
            html += renderCardRow(cards[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderCardRow(card) {
        var url = '/card/' + encodeURIComponent(setCode) + '/' + encodeURIComponent(card.number);
        var imgSrc = 'https://cards.scryfall.io/normal/front/' + card.imgSrc;

        var html = '<tr class="table-row">';

        // Owned column — placeholder, replaced by fetchAndRenderInventory if authenticated
        html +=
            '<td class="table-cell owned-cell" data-card-id="' +
            AjaxUtils.escapeHtml(card.id) +
            '"' +
            ' data-has-foil="' +
            !!card.hasFoil +
            '"' +
            ' data-has-non-foil="' +
            !!card.hasNonFoil +
            '">&mdash;</td>';

        // Card No.
        html += '<td class="table-cell">' + AjaxUtils.escapeHtml(card.number) + '</td>';

        // Card name with hover preview
        html += '<td data-img-src="' + AjaxUtils.escapeHtml(card.imgSrc) + '" class="table-cell">';
        html +=
            '<a href="' +
            url +
            '" class="card-name-link">' +
            AjaxUtils.escapeHtml(card.name) +
            '</a>';
        html += '<a href="' + url + '" class="card-img-link">';
        html +=
            '<img src="' +
            AjaxUtils.escapeHtml(imgSrc) +
            '" alt="' +
            AjaxUtils.escapeHtml(card.name) +
            '" class="card-img-preview" />';
        html += '</a></td>';

        // Mana Cost (xs-hide)
        html += '<td class="table-cell xs-hide">' + renderManaCost(card.manaCost) + '</td>';

        // Rarity (xs-hide)
        html +=
            '<td class="table-cell xs-hide">' + AjaxUtils.escapeHtml(card.rarity || '') + '</td>';

        // Normal price (xs-hide)
        html += '<td class="table-cell xs-hide">';
        if (card.hasNonFoil && card.prices && card.prices.normal != null) {
            html +=
                '<span class="price-normal">' + AjaxUtils.toDollar(card.prices.normal) + '</span>';
            if (card.prices.normalChangeWeekly != null && card.prices.normalChangeWeekly !== 0) {
                html += ' ' + AjaxUtils.renderPriceChange(card.prices.normalChangeWeekly);
            }
        }
        html += '</td>';

        // Foil price (xs-hide)
        html += '<td class="table-cell xs-hide">';
        if (card.hasFoil && card.prices && card.prices.foil != null) {
            html += '<span class="price-foil">' + AjaxUtils.toDollar(card.prices.foil) + '</span>';
            if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                html += ' ' + AjaxUtils.renderPriceChange(card.prices.foilChangeWeekly);
            }
        }
        html += '</td>';

        // Combined price (xs-show, mobile)
        html += '<td class="table-cell xs-show">';
        if (card.hasFoil && card.prices && card.prices.foil != null) {
            html += '<span class="price-foil">' + AjaxUtils.toDollar(card.prices.foil) + '</span>';
            if (card.prices.foilChangeWeekly != null && card.prices.foilChangeWeekly !== 0) {
                html += ' ' + AjaxUtils.renderPriceChange(card.prices.foilChangeWeekly);
            }
        }
        if (card.hasNonFoil && card.prices && card.prices.normal != null) {
            html +=
                '<span class="price-normal">' + AjaxUtils.toDollar(card.prices.normal) + '</span>';
        }
        if (
            card.prices &&
            card.prices.normalChangeWeekly != null &&
            card.prices.normalChangeWeekly !== 0
        ) {
            html += ' ' + AjaxUtils.renderPriceChange(card.prices.normalChangeWeekly);
        }
        html += '</td>';

        html += '</tr>';
        return html;
    }

    function renderManaCost(manaCost) {
        if (!manaCost) return '';
        return manaCost.replace(/\{([^}]+)\}/g, function (match, symbol) {
            var cssClass = 'ms ms-' + symbol.toLowerCase().replace('/', '');
            return '<i class="' + cssClass + ' ms-cost"></i>';
        });
    }

    function fetchAndRenderInventory(cards, onComplete) {
        var cardIds = cards
            .map(function (c) {
                return c.id;
            })
            .filter(Boolean);
        if (cardIds.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        fetch('/api/v1/inventory/quantities?cardIds=' + cardIds.join(','))
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                if (!json.success || !json.data) return;
                var quantityMap = {};
                for (var i = 0; i < json.data.length; i++) {
                    quantityMap[json.data[i].cardId] = json.data[i];
                }
                var cells = document.querySelectorAll('#set-card-list-ajax .owned-cell');
                for (var j = 0; j < cells.length; j++) {
                    var cell = cells[j];
                    var cardId = cell.getAttribute('data-card-id');
                    var hasFoil = cell.getAttribute('data-has-foil') === 'true';
                    var hasNonFoil = cell.getAttribute('data-has-non-foil') === 'true';
                    var qty = quantityMap[cardId] || { foilQuantity: 0, normalQuantity: 0 };
                    cell.innerHTML = renderOwnedForms(cardId, qty, hasFoil, hasNonFoil);
                }
            })
            .catch(function (err) {
                console.error('Error fetching inventory quantities:', err);
            })
            .finally(function () {
                if (onComplete) onComplete();
            });
    }

    function renderOwnedForms(cardId, qty, hasFoil, hasNonFoil) {
        var html = '';
        if (hasNonFoil) {
            html += renderOwnedForm(cardId, qty.normalQuantity, false);
        }
        if (hasFoil) {
            html += renderOwnedForm(cardId, qty.foilQuantity, true);
        }
        return html;
    }

    function renderOwnedForm(cardId, quantity, isFoil) {
        var foilClass = isFoil ? 'foil' : 'normal';
        var html =
            '<form class="quantity-form quantity-form-' +
            foilClass +
            '"' +
            ' data-item-id="' +
            AjaxUtils.escapeHtml(cardId) +
            '" data-foil="' +
            isFoil +
            '">';
        html +=
            '<input type="hidden" name="cardId" value="' + AjaxUtils.escapeHtml(cardId) + '" />';
        html +=
            '<button type="button" class="increment-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-purple-400 active:text-purple-600">+</button>';
        html +=
            '<input type="number" name="quantity-owned" class="quantity-owned" value="' +
            quantity +
            '" data-id="' +
            AjaxUtils.escapeHtml(cardId) +
            '" />';
        html += '<input type="hidden" name="isFoil" value="' + isFoil + '" />';
        html +=
            '<button type="button" class="decrement-quantity inventory-controller-button-' +
            foilClass +
            ' hover:text-red-400 active:text-red-600">-</button>';
        html += '</form>';
        return html;
    }
});
