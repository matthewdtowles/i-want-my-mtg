document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('notification-list-ajax');
    if (!container) return;

    var page = AjaxUtils.initListPage({
        container: container,
        apiPath: '/api/v1/notifications',
        basePath: '/notifications',
        hasBaseOnly: false,
        hasFilter: false,
        renderContent: renderTable,
        errorMessage: 'Failed to load notifications',
    });
    if (!page) return;

    page.fetchAndRender(null);

    // Mark All Read button
    var markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', handleMarkAllRead);
    }

    // Event delegation for row click to mark as read
    document.addEventListener('click', function (e) {
        var row = e.target.closest('.notification-row');
        if (!row || !container.contains(row) || row.dataset.isRead !== 'false') return;
        if (e.target.closest('a') || e.target.closest('button')) {
            // Navigation may cancel in-flight fetch, so use keepalive
            markAsReadBeacon(row);
        } else {
            handleMarkAsRead(row);
        }
    });

    function renderTable(resultsEl, items) {
        if (!items || items.length === 0) {
            AjaxUtils.renderEmptyState(resultsEl, {
                message: 'No notifications found',
                hint: 'Notifications will appear when your price alerts are triggered.',
                clearHref: '/price-alerts',
                clearLabel: 'Manage Alerts',
            });
            return;
        }

        var headers = [
            { key: '', label: 'Card' },
            { key: '', label: 'Direction' },
            { key: '', label: 'Old Price' },
            { key: '', label: 'New Price' },
            { key: '', label: 'Change' },
            { key: '', label: 'Date', classes: 'xs-hide' },
        ];

        var html = '<div class="table-wrapper"><table class="table-container w-full">';
        html += '<thead>' + AjaxUtils.renderTableHeaderRow(headers, page.state) + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < items.length; i++) {
            html += renderNotificationRow(items[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderNotificationRow(notification) {
        var cardUrl = notification.setCode && notification.cardNumber
            ? '/card/' + encodeURIComponent(notification.setCode.toLowerCase()) + '/' + encodeURIComponent(notification.cardNumber)
            : null;
        var cardLabel = notification.cardName
            ? AjaxUtils.escapeHtml(notification.cardName)
            : AjaxUtils.escapeHtml(notification.cardId);
        if (notification.setCode) {
            cardLabel += ' <span class="text-gray-400 dark:text-gray-500 text-xs">(' + AjaxUtils.escapeHtml(notification.setCode.toUpperCase()) + ')</span>';
        }

        var unreadClass = notification.isRead ? '' : ' border-l-2 border-teal-400';
        var html = '<tr class="table-row notification-row' + unreadClass + '"'
            + ' data-notification-id="' + notification.id + '"'
            + ' data-is-read="' + notification.isRead + '"'
            + ' style="cursor: pointer;">';

        // Card
        html += '<td class="table-cell">';
        if (cardUrl) {
            html += '<a href="' + cardUrl + '" class="table-link">' + cardLabel + '</a>';
        } else {
            html += cardLabel;
        }
        html += '</td>';

        // Direction badge
        var isIncrease = notification.direction === 'increase';
        var badgeClasses = isIncrease
            ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
            : 'bg-hotpink-100 text-hotpink-700 dark:bg-hotpink-700/30 dark:text-hotpink-300';
        var directionLabel = isIncrease ? 'UP' : 'DOWN';
        html += '<td class="table-cell">';
        html += '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClasses + '">' + directionLabel + '</span>';
        html += '</td>';

        // Old Price
        html += '<td class="table-cell font-mono">' + AjaxUtils.toDollar(notification.oldPrice) + '</td>';

        // New Price
        html += '<td class="table-cell font-mono">' + AjaxUtils.toDollar(notification.newPrice) + '</td>';

        // Change %
        var changeSign = notification.changePct >= 0 ? '+' : '';
        var changeColor = notification.changePct >= 0
            ? 'text-teal-600 dark:text-teal-400'
            : 'text-red-500 dark:text-red-400';
        html += '<td class="table-cell ' + changeColor + ' font-medium">' + changeSign + notification.changePct.toFixed(1) + '%</td>';

        // Date
        html += '<td class="table-cell xs-hide text-gray-500 dark:text-gray-400">' + formatDate(notification.createdAt) + '</td>';

        html += '</tr>';
        return html;
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    function markAsReadBeacon(row) {
        var notificationId = row.dataset.notificationId;
        fetch('/api/v1/notifications/' + notificationId + '/read', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
        });
        row.dataset.isRead = 'true';
        row.classList.remove('border-l-2', 'border-teal-400');
    }

    async function handleMarkAsRead(row) {
        var notificationId = row.dataset.notificationId;
        try {
            var response = await fetch('/api/v1/notifications/' + notificationId + '/read', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                row.dataset.isRead = 'true';
                row.classList.remove('border-l-2', 'border-teal-400');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function handleMarkAllRead() {
        try {
            var response = await fetch('/api/v1/notifications/read-all', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                var rows = container.querySelectorAll('.notification-row');
                rows.forEach(function (row) {
                    row.dataset.isRead = 'true';
                    row.classList.remove('border-l-2', 'border-teal-400');
                });
                if (typeof window.showToast === 'function') {
                    window.showToast('All notifications marked as read.', 'success');
                }
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to mark all as read.', 'error');
            }
        }
    }
});
