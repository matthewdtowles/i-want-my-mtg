/**
 * Buy-list page (Phase 6.5). Fetches the user's buy-list from
 * /api/v1/buy-list and renders editable rows (quantity stepper + remove),
 * plus a bulk-paste import. Mutations go back through the JSON API.
 */
document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('buy-list-ajax');
    if (!container) return;

    var API = '/api/v1/buy-list';

    function jsonHeaders() {
        return { 'Content-Type': 'application/json' };
    }

    function load() {
        AjaxUtils.showSpinner(container);
        AjaxUtils.fetchWithGate(API, { headers: { Accept: 'application/json' } })
            .then(function (res) {
                if (res.gated) return;
                if (!res.ok || !res.body || !res.body.data) {
                    AjaxUtils.showError(container, 'Failed to load your buy list.');
                    return;
                }
                render(res.body.data);
            })
            .catch(function () {
                AjaxUtils.showError(container, 'Failed to load your buy list.');
            });
    }

    function render(items) {
        if (!items || items.length === 0) {
            container.innerHTML =
                '<div class="text-center py-16">' +
                '<i class="fas fa-cart-plus text-5xl text-teal-300 dark:text-teal-600 mb-4" aria-hidden="true"></i>' +
                '<h3 class="page-title mt-4">Your buy list is empty</h3>' +
                '<p class="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">' +
                'Add cards from any card page, or paste a list above.</p>' +
                '<div class="flex justify-center gap-2 mt-6"><a href="/sets" class="btn btn-primary">Browse Sets</a></div>' +
                '</div>';
            return;
        }

        var rows = items.map(renderRow).join('');
        container.innerHTML =
            '<table class="w-full text-sm"><thead><tr class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-midnight-700">' +
            '<th class="py-2">Card</th><th class="py-2">Finish</th><th class="py-2">Price</th>' +
            '<th class="py-2">Qty</th><th class="py-2"></th></tr></thead><tbody>' +
            rows +
            '</tbody></table>';
    }

    function renderRow(item) {
        var price = item.isFoil ? item.priceFoil : item.priceNormal;
        var name = AjaxUtils.escapeHtml(item.cardName || item.cardId);
        var link = item.url
            ? '<a href="' +
              item.url +
              '" class="text-teal-600 dark:text-teal-400 hover:underline">' +
              name +
              '</a>'
            : name;
        return (
            '<tr data-card-id="' +
            item.cardId +
            '" data-foil="' +
            item.isFoil +
            '" ' +
            'class="border-b border-gray-100 dark:border-midnight-800">' +
            '<td class="py-2">' +
            link +
            '<span class="text-gray-400 ml-1">' +
            AjaxUtils.escapeHtml((item.setCode || '').toUpperCase()) +
            '</span></td>' +
            '<td class="py-2">' +
            (item.isFoil ? 'Foil' : 'Normal') +
            '</td>' +
            '<td class="py-2">' +
            (price != null ? AjaxUtils.toDollar(price) : '&mdash;') +
            '</td>' +
            '<td class="py-2"><div class="inline-flex items-center gap-2">' +
            '<button type="button" class="btn-qty bl-dec" aria-label="Decrease quantity">&minus;</button>' +
            '<span class="bl-qty w-8 text-center inline-block">' +
            item.quantity +
            '</span>' +
            '<button type="button" class="btn-qty bl-inc" aria-label="Increase quantity">+</button>' +
            '</div></td>' +
            '<td class="py-2 text-right"><button type="button" class="bl-remove text-red-500 hover:text-red-700" aria-label="Remove">' +
            '<i class="fas fa-trash" aria-hidden="true"></i></button></td>' +
            '</tr>'
        );
    }

    function setQuantity(cardId, isFoil, quantity) {
        return AjaxUtils.fetchWithGate(API, {
            method: 'PATCH',
            headers: jsonHeaders(),
            body: JSON.stringify({ cardId: cardId, isFoil: isFoil, quantity: quantity }),
        }).then(function (res) {
            if (!res.ok && !res.gated) throw new Error('update failed');
            load();
        });
    }

    function removeItem(cardId, isFoil) {
        return AjaxUtils.fetchWithGate(API, {
            method: 'DELETE',
            headers: jsonHeaders(),
            body: JSON.stringify({ cardId: cardId, isFoil: isFoil }),
        }).then(function (res) {
            if (!res.ok && !res.gated) throw new Error('remove failed');
            load();
        });
    }

    container.addEventListener('click', function (e) {
        var row = e.target.closest('tr[data-card-id]');
        if (!row) return;
        var cardId = row.getAttribute('data-card-id');
        var isFoil = row.getAttribute('data-foil') === 'true';
        var qty = parseInt(row.querySelector('.bl-qty').textContent, 10) || 1;

        if (e.target.closest('.bl-inc')) setQuantity(cardId, isFoil, qty + 1);
        else if (e.target.closest('.bl-dec')) setQuantity(cardId, isFoil, qty - 1);
        else if (e.target.closest('.bl-remove')) removeItem(cardId, isFoil);
    });

    // Bulk paste import
    var importBtn = document.getElementById('buy-list-import-btn');
    var importText = document.getElementById('buy-list-import-text');
    var importResult = document.getElementById('buy-list-import-result');
    if (importBtn && importText) {
        importBtn.addEventListener('click', function () {
            var text = importText.value.trim();
            if (!text) return;
            importBtn.disabled = true;
            AjaxUtils.fetchWithGate(API + '/import', {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({ text: text }),
            })
                .then(function (res) {
                    importBtn.disabled = false;
                    if (res.gated) return;
                    if (!res.ok || !res.body || !res.body.data) {
                        if (importResult) importResult.textContent = 'Import failed.';
                        return;
                    }
                    var d = res.body.data;
                    var msg = 'Added ' + d.saved + ' card' + (d.saved === 1 ? '' : 's') + '.';
                    if (d.errors && d.errors.length) {
                        msg += ' ' + d.errors.length + ' could not be matched.';
                    }
                    if (importResult) importResult.textContent = msg;
                    importText.value = '';
                    load();
                })
                .catch(function () {
                    importBtn.disabled = false;
                    if (importResult) importResult.textContent = 'Import failed.';
                });
        });
    }

    load();
});
