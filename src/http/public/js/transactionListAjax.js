document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('transaction-list-ajax');
    if (!container) return;

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/transactions',
        basePath: '/transactions',
        hasBaseOnly: false,
        renderContent: renderTable,
        errorMessage: 'Failed to load transactions',
    });
    if (!page) return;

    // Edit/save/cancel/delete handlers via event delegation
    document.addEventListener('click', function (e) {
        var editBtn = e.target.closest('.edit-transaction-button');
        if (editBtn && container.contains(editBtn)) {
            e.stopImmediatePropagation();
            toggleEditMode(editBtn.closest('tr'), true);
            return;
        }

        var cancelBtn = e.target.closest('.cancel-edit-button');
        if (cancelBtn && container.contains(cancelBtn)) {
            e.stopImmediatePropagation();
            var row = cancelBtn.closest('tr');
            row.querySelectorAll('.tx-edit[data-field]').forEach(function (input) {
                var displayEl = input.parentElement.querySelector('.tx-display');
                if (input.dataset.field === 'quantity') {
                    input.value = displayEl.textContent.trim();
                } else if (input.dataset.field === 'pricePerUnit') {
                    input.value = row.dataset.rawPrice;
                } else if (input.dataset.field === 'date') {
                    input.value = displayEl.textContent.trim();
                }
            });
            toggleEditMode(row, false);
            return;
        }

        var saveBtn = e.target.closest('.save-transaction-button');
        if (saveBtn && container.contains(saveBtn)) {
            e.stopImmediatePropagation();
            handleSave(saveBtn);
            return;
        }

        var deleteBtn = e.target.closest('.delete-transaction-button');
        if (deleteBtn && container.contains(deleteBtn)) {
            e.stopImmediatePropagation();
            handleDelete(deleteBtn);
            return;
        }
    });

    function renderTable(resultsEl, items) {
        if (!items || items.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No transactions match your current filters',
                hint: 'Try a different search term or adjust your filters.',
                clearHref: '/transactions',
                clearLabel: 'Clear Filters',
            });
            return;
        }

        var headers = [
            { key: 'transaction.date', label: 'Date' },
            { key: 'transaction.type', label: 'Type' },
            { key: 'transaction_card.name', label: 'Card' },
            { key: '', label: 'Qty' },
            { key: 'transaction.pricePerUnit', label: 'Price' },
            { key: '', label: 'Total' },
            { key: '', label: '', classes: 'tx-actions-cell' },
        ];

        var html = '<div class="table-wrapper"><table class="table-container w-full">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < items.length; i++) {
            html += renderTransactionRow(items[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderTransactionRow(tx) {
        var total = tx.quantity * tx.pricePerUnit;
        var html =
            '<tr class="table-row" data-transaction-id="' +
            tx.id +
            '" data-raw-price="' +
            tx.pricePerUnit +
            '" data-raw-fees="' +
            (tx.fees || 0) +
            '" data-source="' +
            AjaxUtils.escapeHtml(tx.source || '') +
            '" data-notes="' +
            AjaxUtils.escapeHtml(tx.notes || '') +
            '">';

        // Date
        html += '<td class="table-cell pl-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">';
        html += '<span class="tx-display">' + AjaxUtils.escapeHtml(tx.date) + '</span>';
        html +=
            '<input type="date" class="tx-edit hidden w-28 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200" data-field="date" value="' +
            AjaxUtils.escapeHtml(tx.date) +
            '" />';
        html += '</td>';

        // Type
        html += '<td class="table-cell">';
        if (tx.type === 'BUY') {
            html +=
                '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">BUY</span>';
        } else {
            html +=
                '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-hotpink-100 text-hotpink-700 dark:bg-hotpink-700/30 dark:text-hotpink-300">SELL</span>';
        }
        html += '</td>';

        // Card
        html += '<td class="table-cell">';
        if (tx.cardUrl) {
            html +=
                '<a href="' +
                AjaxUtils.escapeHtml(tx.cardUrl) +
                '" class="card-name-link">' +
                AjaxUtils.escapeHtml(tx.cardName || '') +
                '</a>';
        } else {
            html += AjaxUtils.escapeHtml(tx.cardName || tx.cardId);
        }
        if (tx.isFoil) {
            html += ' <span class="foil-badge">Foil</span>';
        }
        if (tx.setCode) {
            html +=
                ' <span class="text-gray-400 dark:text-gray-500 text-xs">(' +
                AjaxUtils.escapeHtml(tx.setCode.toUpperCase()) +
                ')</span>';
        }
        html += '</td>';

        // Qty
        html += '<td class="table-cell">';
        html += '<span class="tx-display">' + tx.quantity + '</span>';
        html +=
            '<input type="number" class="tx-edit hidden w-16 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200" data-field="quantity" value="' +
            tx.quantity +
            '" min="1" step="1" />';
        html += '</td>';

        // Price
        html += '<td class="table-cell font-mono">';
        html += '<span class="tx-display">' + AjaxUtils.toDollar(tx.pricePerUnit) + '</span>';
        html +=
            '<input type="number" class="tx-edit hidden w-20 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200 font-mono" data-field="pricePerUnit" value="' +
            tx.pricePerUnit +
            '" min="0" step="0.01" />';
        html += '</td>';

        // Total
        html += '<td class="table-cell font-mono">';
        html += '<span class="tx-total">' + AjaxUtils.toDollar(total) + '</span>';
        html += '</td>';

        // Actions
        html += '<td class="table-cell pr-2 tx-actions-cell">';
        if (tx.editable) {
            html += '<span class="tx-display inline-flex gap-1">';
            html +=
                '<button type="button" class="edit-transaction-button text-gray-400 hover:text-teal-500 dark:hover:text-teal-400" title="Edit"><i class="fas fa-pencil-alt"></i></button>';
            html +=
                '<button type="button" class="delete-transaction-button text-gray-400 hover:text-red-500 dark:hover:text-red-400" data-transaction-id="' +
                tx.id +
                '"><i class="fas fa-trash-alt"></i></button>';
            html += '</span>';
            html += '<span class="tx-edit hidden inline-flex gap-1">';
            html +=
                '<button type="button" class="save-transaction-button text-gray-400 hover:text-teal-500 dark:hover:text-teal-400" title="Save"><i class="fas fa-check"></i></button>';
            html +=
                '<button type="button" class="cancel-edit-button text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Cancel"><i class="fas fa-times"></i></button>';
            html += '</span>';
        } else {
            html +=
                '<span class="text-gray-300 dark:text-gray-600" title="Locked after 24 hours"><i class="fas fa-lock text-xs"></i></span>';
        }
        html += '</td>';

        html += '</tr>';
        return html;
    }

    function toggleEditMode(row, editing) {
        row.querySelectorAll('.tx-display').forEach(function (el) {
            el.classList.toggle('hidden', editing);
        });
        row.querySelectorAll('.tx-edit').forEach(function (el) {
            el.classList.toggle('hidden', !editing);
        });
    }

    async function handleSave(saveBtn) {
        var row = saveBtn.closest('tr');
        var txId = row.dataset.transactionId;
        var body = {};

        row.querySelectorAll('.tx-edit[data-field]').forEach(function (input) {
            var field = input.dataset.field;
            if (field === 'quantity') {
                body.quantity = parseInt(input.value, 10);
            } else if (field === 'pricePerUnit') {
                body.pricePerUnit = parseFloat(input.value);
            } else if (field === 'date') {
                body.date = input.value;
            }
        });

        try {
            var response = await fetch('/api/v1/transactions/' + txId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await response.json().catch(function () {
                return null;
            });
            if (response.ok && data && data.success) {
                var dateDisplay = row.querySelector('td:first-child .tx-display');
                var qtyDisplay = row.querySelector('td:nth-child(4) .tx-display');
                var priceDisplay = row.querySelector('td:nth-child(5) .tx-display');
                var totalDisplay = row.querySelector('.tx-total');

                if (body.date && dateDisplay) dateDisplay.textContent = body.date;
                if (body.quantity && qtyDisplay) qtyDisplay.textContent = body.quantity;
                if (body.pricePerUnit !== undefined) {
                    if (priceDisplay)
                        priceDisplay.textContent = AjaxUtils.toDollar(body.pricePerUnit);
                    row.dataset.rawPrice = body.pricePerUnit;
                }

                var qty = body.quantity || parseInt(qtyDisplay.textContent, 10);
                var price =
                    body.pricePerUnit !== undefined
                        ? body.pricePerUnit
                        : parseFloat(row.dataset.rawPrice);
                if (totalDisplay) totalDisplay.textContent = AjaxUtils.toDollar(qty * price);

                toggleEditMode(row, false);
            } else {
                var msg = (data && data.error) || 'Failed to update transaction.';
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, 'error');
                } else {
                    alert(msg);
                }
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            if (typeof window.showToast === 'function') {
                window.showToast(error.message || 'Error updating transaction.', 'error');
            } else {
                alert(error.message || 'Error updating transaction.');
            }
        }
    }

    async function handleDelete(deleteBtn) {
        var txId = deleteBtn.dataset.transactionId;
        if (!confirm('Delete this transaction?')) return;

        try {
            var response = await fetch('/api/v1/transactions/' + txId, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            var data = await response.json().catch(function () {
                return null;
            });
            if (response.ok && data && data.success) {
                var row = deleteBtn.closest('tr');
                if (row) row.remove();
            } else {
                var msg = (data && data.error) || 'Failed to delete transaction.';
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, 'error');
                } else {
                    alert(msg);
                }
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            if (typeof window.showToast === 'function') {
                window.showToast(error.message || 'Error deleting transaction.', 'error');
            }
        }
    }
});
