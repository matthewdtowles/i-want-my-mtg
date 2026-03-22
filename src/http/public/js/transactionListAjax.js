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
        return AjaxUtils.createTransactionRow(tx);
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
