document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('price-alert-list-ajax');
    if (!container) return;

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/price-alerts',
        basePath: '/price-alerts',
        hasBaseOnly: false,
        hasFilter: false,
        renderContent: renderTable,
        errorMessage: 'Failed to load price alerts',
    });
    if (!page) return;

    // Event delegation for inline actions
    document.addEventListener('click', function (e) {
        var toggleBtn = e.target.closest('.toggle-active-button');
        if (toggleBtn && container.contains(toggleBtn)) {
            e.stopImmediatePropagation();
            handleToggleActive(toggleBtn);
            return;
        }

        var editBtn = e.target.closest('.edit-alert-button');
        if (editBtn && container.contains(editBtn)) {
            e.stopImmediatePropagation();
            toggleEditMode(editBtn.closest('tr'), true);
            return;
        }

        var cancelBtn = e.target.closest('.cancel-alert-edit');
        if (cancelBtn && container.contains(cancelBtn)) {
            e.stopImmediatePropagation();
            var row = cancelBtn.closest('tr');
            restoreEditValues(row);
            toggleEditMode(row, false);
            return;
        }

        var saveBtn = e.target.closest('.save-alert-button');
        if (saveBtn && container.contains(saveBtn)) {
            e.stopImmediatePropagation();
            handleSave(saveBtn);
            return;
        }

        var deleteBtn = e.target.closest('.delete-alert-button');
        if (deleteBtn && container.contains(deleteBtn)) {
            e.stopImmediatePropagation();
            handleDelete(deleteBtn);
            return;
        }
    });

    function renderTable(resultsEl, items) {
        if (!items || items.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No price alerts found',
                hint: 'Set up alerts on card pages to get notified when prices change.',
                clearHref: '/sets',
                clearLabel: 'Browse Sets',
            });
            return;
        }

        var headers = [
            { key: '', label: 'Card' },
            { key: '', label: 'Increase %' },
            { key: '', label: 'Decrease %' },
            { key: '', label: 'Active' },
            { key: '', label: 'Last Notified', classes: 'xs-hide' },
            { key: '', label: '', classes: 'alert-actions-cell' },
        ];

        var html = '<div class="table-wrapper"><table class="table-container w-full">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < items.length; i++) {
            html += renderAlertRow(items[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderAlertRow(alert) {
        var cardUrl = alert.setCode && alert.cardNumber
            ? '/card/' + encodeURIComponent(alert.setCode.toLowerCase()) + '/' + encodeURIComponent(alert.cardNumber)
            : null;
        var cardLabel = alert.cardName
            ? AjaxUtils.escapeHtml(alert.cardName)
            : AjaxUtils.escapeHtml(alert.cardId);
        if (alert.setCode) {
            cardLabel += ' <span class="text-gray-400 dark:text-gray-500 text-xs">(' + AjaxUtils.escapeHtml(alert.setCode.toUpperCase()) + ')</span>';
        }

        var html = '<tr class="table-row" data-alert-id="' + alert.id + '"'
            + ' data-increase="' + (alert.increasePct != null ? alert.increasePct : '') + '"'
            + ' data-decrease="' + (alert.decreasePct != null ? alert.decreasePct : '') + '">';

        // Card
        html += '<td class="table-cell">';
        if (cardUrl) {
            html += '<a href="' + cardUrl + '" class="table-link">' + cardLabel + '</a>';
        } else {
            html += cardLabel;
        }
        html += '</td>';

        // Increase %
        html += '<td class="table-cell">';
        html += '<span class="alert-display">' + formatPct(alert.increasePct) + '</span>';
        html += '<input type="number" class="alert-edit hidden w-20 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200" data-field="increasePct" value="' + (alert.increasePct != null ? alert.increasePct : '') + '" min="0" step="1" />';
        html += '</td>';

        // Decrease %
        html += '<td class="table-cell">';
        html += '<span class="alert-display">' + formatPct(alert.decreasePct) + '</span>';
        html += '<input type="number" class="alert-edit hidden w-20 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200" data-field="decreasePct" value="' + (alert.decreasePct != null ? alert.decreasePct : '') + '" min="0" step="1" />';
        html += '</td>';

        // Active toggle
        var activeClass = alert.isActive
            ? 'text-teal-600 dark:text-teal-400'
            : 'text-gray-400 dark:text-gray-600';
        var activeIcon = alert.isActive ? 'fa-toggle-on' : 'fa-toggle-off';
        html += '<td class="table-cell">';
        html += '<button type="button" class="toggle-active-button ' + activeClass + '" data-alert-id="' + alert.id + '" data-active="' + alert.isActive + '" title="' + (alert.isActive ? 'Deactivate' : 'Activate') + '">';
        html += '<i class="fas ' + activeIcon + ' text-xl"></i>';
        html += '</button>';
        html += '</td>';

        // Last Notified
        html += '<td class="table-cell xs-hide text-gray-500 dark:text-gray-400">';
        html += alert.lastNotifiedAt ? formatDate(alert.lastNotifiedAt) : '-';
        html += '</td>';

        // Actions
        html += '<td class="table-cell alert-actions-cell">';
        html += '<span class="alert-display inline-flex gap-1">';
        html += '<button type="button" class="edit-alert-button text-gray-400 hover:text-teal-500 dark:hover:text-teal-400" title="Edit"><i class="fas fa-pencil-alt"></i></button>';
        html += '<button type="button" class="delete-alert-button text-gray-400 hover:text-red-500 dark:hover:text-red-400" data-alert-id="' + alert.id + '" title="Delete"><i class="fas fa-trash-alt"></i></button>';
        html += '</span>';
        html += '<span class="alert-edit hidden inline-flex gap-1">';
        html += '<button type="button" class="save-alert-button text-gray-400 hover:text-teal-500 dark:hover:text-teal-400" title="Save"><i class="fas fa-check"></i></button>';
        html += '<button type="button" class="cancel-alert-edit text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Cancel"><i class="fas fa-times"></i></button>';
        html += '</span>';
        html += '</td>';

        html += '</tr>';
        return html;
    }

    function formatPct(val) {
        if (val == null) return '-';
        return val + '%';
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    function toggleEditMode(row, editing) {
        row.querySelectorAll('.alert-display').forEach(function (el) {
            el.classList.toggle('hidden', editing);
        });
        row.querySelectorAll('.alert-edit').forEach(function (el) {
            el.classList.toggle('hidden', !editing);
        });
    }

    function restoreEditValues(row) {
        var incInput = row.querySelector('input[data-field="increasePct"]');
        var decInput = row.querySelector('input[data-field="decreasePct"]');
        if (incInput) incInput.value = row.dataset.increase || '';
        if (decInput) decInput.value = row.dataset.decrease || '';
    }

    async function handleToggleActive(btn) {
        var alertId = btn.dataset.alertId;
        var currentActive = btn.dataset.active === 'true';
        var newActive = !currentActive;

        try {
            var response = await fetch('/api/v1/price-alerts/' + alertId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newActive }),
            });
            var data = await response.json().catch(function () { return null; });
            if (response.ok && data && data.success) {
                btn.dataset.active = String(newActive);
                btn.title = newActive ? 'Deactivate' : 'Activate';
                var icon = btn.querySelector('i');
                if (newActive) {
                    btn.className = 'toggle-active-button text-teal-600 dark:text-teal-400';
                    icon.className = 'fas fa-toggle-on text-xl';
                } else {
                    btn.className = 'toggle-active-button text-gray-400 dark:text-gray-600';
                    icon.className = 'fas fa-toggle-off text-xl';
                }
            } else {
                showToastOrAlert((data && data.error) || 'Failed to update alert.');
            }
        } catch (error) {
            showToastOrAlert(error.message || 'Error updating alert.');
        }
    }

    async function handleSave(saveBtn) {
        var row = saveBtn.closest('tr');
        var alertId = row.dataset.alertId;
        var body = {};

        var incInput = row.querySelector('input[data-field="increasePct"]');
        var decInput = row.querySelector('input[data-field="decreasePct"]');

        body.increasePct = incInput.value !== '' ? parseFloat(incInput.value) : null;
        body.decreasePct = decInput.value !== '' ? parseFloat(decInput.value) : null;

        if (body.increasePct == null && body.decreasePct == null) {
            showToastOrAlert('At least one threshold is required.');
            return;
        }

        try {
            var response = await fetch('/api/v1/price-alerts/' + alertId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await response.json().catch(function () { return null; });
            if (response.ok && data && data.success) {
                var incDisplay = row.querySelectorAll('.alert-display')[0];
                var decDisplay = row.querySelectorAll('.alert-display')[1];
                if (incDisplay) incDisplay.textContent = formatPct(body.increasePct);
                if (decDisplay) decDisplay.textContent = formatPct(body.decreasePct);
                row.dataset.increase = body.increasePct != null ? body.increasePct : '';
                row.dataset.decrease = body.decreasePct != null ? body.decreasePct : '';
                toggleEditMode(row, false);
            } else {
                showToastOrAlert((data && data.error) || 'Failed to update alert.');
            }
        } catch (error) {
            showToastOrAlert(error.message || 'Error updating alert.');
        }
    }

    async function handleDelete(deleteBtn) {
        var alertId = deleteBtn.dataset.alertId;
        if (!confirm('Delete this price alert?')) return;

        try {
            var response = await fetch('/api/v1/price-alerts/' + alertId, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            var data = await response.json().catch(function () { return null; });
            if (response.ok && data && data.success) {
                var row = deleteBtn.closest('tr');
                if (row) row.remove();
            } else {
                showToastOrAlert((data && data.error) || 'Failed to delete alert.');
            }
        } catch (error) {
            showToastOrAlert(error.message || 'Error deleting alert.');
        }
    }

    function showToastOrAlert(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, 'error');
        } else {
            alert(msg);
        }
    }
});
