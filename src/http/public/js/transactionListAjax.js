document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('transaction-list-ajax');
    if (!container) return;

    var state = parseStateFromUrl();

    // Override filter.js by cloning the filter form (removes old listeners)
    var filterForm = document.getElementById('filter-form');
    if (filterForm) {
        var newForm = filterForm.cloneNode(true);
        filterForm.parentNode.replaceChild(newForm, filterForm);
        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
        });

        var filterInput = newForm.querySelector('#filter');
        if (filterInput) {
            var debounceTimeout;
            filterInput.addEventListener('input', function () {
                clearTimeout(debounceTimeout);
                var clearBtn = newForm.querySelector('#clear-filter-btn');
                if (clearBtn) clearBtn.style.display = this.value ? 'inline' : 'none';
                debounceTimeout = setTimeout(function () {
                    state.filter = filterInput.value;
                    state.page = 1;
                    fetchAndRender('replaceState');
                }, 300);
            });

            var clearBtn = newForm.querySelector('#clear-filter-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {
                    filterInput.value = '';
                    clearBtn.style.display = 'none';
                    state.filter = '';
                    state.page = 1;
                    fetchAndRender('replaceState');
                });
            }
        }
    }

    // Remove inline onchange from SSR limit select to prevent full-page reload
    var ssrLimitSelect = document.querySelector('.pagination-container select#limit');
    if (ssrLimitSelect) {
        ssrLimitSelect.removeAttribute('onchange');
    }

    // Intercept sort clicks via event delegation on thead
    document.addEventListener('click', function (e) {
        var link = e.target.closest('#transaction-list-ajax thead a.sort-btn');
        if (!link) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^\?/, ''));
        state.sort = params.get('sort') || '';
        state.ascend = params.get('ascend') === 'true';
        state.page = 1;
        fetchAndRender('pushState');
    });

    // Intercept pagination clicks
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.pagination-container a');
        if (!link || !container.parentElement.contains(link)) return;
        e.preventDefault();
        var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
        state.page = parseInt(params.get('page'), 10) || 1;
        if (params.has('limit')) state.limit = parseInt(params.get('limit'), 10) || 25;
        fetchAndRender('pushState');
    });

    // Intercept limit select change
    document.addEventListener('change', function (e) {
        if (e.target.id !== 'limit') return;
        var paginationParent = e.target.closest('.pagination-container');
        if (!paginationParent || !container.parentElement.contains(paginationParent)) return;
        e.preventDefault();
        state.limit = parseInt(e.target.value, 10) || 25;
        state.page = 1;
        fetchAndRender('pushState');
    });

    // Intercept limit form submit
    document.addEventListener('submit', function (e) {
        var paginationParent = e.target.closest('.pagination-container');
        if (paginationParent && container.parentElement.contains(paginationParent)) {
            e.preventDefault();
        }
    });

    // Back/forward button
    window.addEventListener('popstate', function () {
        state = parseStateFromUrl();
        var fi = document.querySelector('#filter');
        if (fi) fi.value = state.filter;
        fetchAndRender(null);
    });

    // Edit/save/cancel/delete handlers via event delegation
    document.addEventListener('click', function (e) {
        var editBtn = e.target.closest('.edit-transaction-button');
        if (editBtn && container.contains(editBtn)) {
            e.stopImmediatePropagation();
            var row = editBtn.closest('tr');
            toggleEditMode(row, true);
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

    function parseStateFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return {
            page: parseInt(params.get('page'), 10) || 1,
            limit: parseInt(params.get('limit'), 10) || 25,
            sort: params.get('sort') || '',
            ascend: params.get('ascend') === 'true',
            filter: params.get('filter') || '',
        };
    }

    function buildApiUrl() {
        var params = new URLSearchParams();
        params.set('page', state.page);
        params.set('limit', state.limit);
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', state.ascend);
        }
        if (state.filter) params.set('filter', state.filter);
        return '/api/v1/transactions?' + params.toString();
    }

    function buildBrowserUrl() {
        var params = new URLSearchParams();
        if (state.page > 1) params.set('page', state.page);
        if (state.limit !== 25) params.set('limit', state.limit);
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', String(state.ascend));
        }
        if (state.filter) params.set('filter', state.filter);
        var qs = params.toString();
        return '/transactions' + (qs ? '?' + qs : '');
    }

    function fetchAndRender(historyMethod) {
        var resultsEl = document.getElementById('filter-results');
        if (resultsEl) {
            resultsEl.style.minHeight = resultsEl.offsetHeight + 'px';
            resultsEl.innerHTML =
                '<div class="text-center py-16"><i class="fas fa-spinner fa-spin text-4xl text-teal-500"></i></div>';
        }

        fetch(buildApiUrl())
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                if (!json.success) {
                    showError(resultsEl, json.error || 'Failed to load transactions');
                    if (resultsEl) resultsEl.style.minHeight = '';
                    return;
                }
                renderTable(json.data, json.meta);
                renderPagination(json.meta);
                if (historyMethod) {
                    window.history[historyMethod]({}, '', buildBrowserUrl());
                }
                if (resultsEl) resultsEl.style.minHeight = '';
            })
            .catch(function (err) {
                console.error('Error fetching transactions:', err);
                showError(resultsEl, 'Failed to load transactions. Please try again.');
                if (typeof window.showToast === 'function')
                    window.showToast('Failed to load transactions', 'error');
                if (resultsEl) resultsEl.style.minHeight = '';
            });
    }

    function showError(el, message) {
        if (!el) return;
        el.innerHTML =
            '<div class="text-center py-16">' +
            '<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>' +
            '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">' +
            escapeHtml(message) +
            '</p>' +
            '</div>';
    }

    function renderTable(items, meta) {
        var resultsEl = document.getElementById('filter-results');
        if (!resultsEl) return;

        if (!items || items.length === 0) {
            resultsEl.innerHTML =
                '<div class="text-center py-16">' +
                '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
                '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">No transactions match your current filters</p>' +
                '<p class="text-gray-400 dark:text-gray-500 mt-2">Try a different search term or adjust your filters.</p>' +
                '<a href="/transactions" class="btn btn-secondary mt-6 inline-block">Clear Filters</a>' +
                '</div>';
            return;
        }

        var html = '<div class="table-wrapper"><table class="table-container w-full">';
        html += '<thead>' + renderTableHeaders() + '</thead>';
        html += '<tbody>';
        for (var i = 0; i < items.length; i++) {
            html += renderTransactionRow(items[i]);
        }
        html += '</tbody></table></div>';
        resultsEl.innerHTML = html;
    }

    function renderTableHeaders() {
        var headers = [
            { key: 'transaction.date', label: 'Date' },
            { key: 'transaction.type', label: 'Type' },
            { key: 'transaction_card.name', label: 'Card' },
            { key: '', label: 'Qty' },
            { key: 'transaction.pricePerUnit', label: 'Price' },
            { key: '', label: 'Total' },
            { key: '', label: '', classes: 'tx-actions-cell' },
        ];

        var html = '<tr class="table-header-row">';
        for (var i = 0; i < headers.length; i++) {
            var h = headers[i];
            if (h.key) {
                html += renderSortableHeader(h);
            } else {
                var classAttr = 'table-header' + (h.classes ? ' ' + h.classes : '');
                html += '<th class="' + classAttr + '">' + escapeHtml(h.label) + '</th>';
            }
        }
        html += '</tr>';
        return html;
    }

    function renderSortableHeader(header) {
        var isActive = state.sort === header.key;
        var nextAscend = isActive ? !state.ascend : true;
        var params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', String(state.limit));
        params.set('sort', header.key);
        params.set('ascend', String(nextAscend));
        if (state.filter) params.set('filter', state.filter);

        var arrow = isActive ? (state.ascend ? '&#9650;' : '&#9660;') : '';
        var classAttr = 'table-header' + (header.classes ? ' ' + header.classes : '');

        return (
            '<th class="' +
            classAttr +
            '">' +
            '<a href="?' +
            params.toString() +
            '" class="sort-btn">' +
            escapeHtml(header.label) +
            ' <span class="sort-icon">' +
            arrow +
            '</span>' +
            '</a></th>'
        );
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
            escapeHtml(tx.source || '') +
            '" data-notes="' +
            escapeHtml(tx.notes || '') +
            '">';

        // Date
        html += '<td class="table-cell pl-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">';
        html += '<span class="tx-display">' + escapeHtml(tx.date) + '</span>';
        html +=
            '<input type="date" class="tx-edit hidden w-28 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200" data-field="date" value="' +
            escapeHtml(tx.date) +
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
                escapeHtml(tx.cardUrl) +
                '" class="card-name-link">' +
                escapeHtml(tx.cardName || '') +
                '</a>';
        } else {
            html += escapeHtml(tx.cardName || tx.cardId);
        }
        if (tx.isFoil) {
            html += ' <span class="foil-badge">Foil</span>';
        }
        if (tx.setCode) {
            html +=
                ' <span class="text-gray-400 dark:text-gray-500 text-xs">(' +
                escapeHtml(tx.setCode.toUpperCase()) +
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
        html += '<span class="tx-display">' + toDollar(tx.pricePerUnit) + '</span>';
        html +=
            '<input type="number" class="tx-edit hidden w-20 text-sm border border-gray-300 dark:border-midnight-500 rounded px-1 py-0.5 bg-white dark:bg-midnight-700 text-gray-700 dark:text-gray-200 font-mono" data-field="pricePerUnit" value="' +
            tx.pricePerUnit +
            '" min="0" step="0.01" />';
        html += '</td>';

        // Total
        html += '<td class="table-cell font-mono">';
        html += '<span class="tx-total">' + toDollar(total) + '</span>';
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

    function renderPagination(meta) {
        var paginationEl = container.parentElement.querySelector('.pagination-container');

        if (!meta || meta.totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        var page = meta.page;
        var totalPages = meta.totalPages;

        if (!paginationEl) {
            paginationEl = document.createElement('section');
            paginationEl.className = 'pagination-container';
            container.parentNode.insertBefore(paginationEl, container.nextSibling);
        }

        var html = '';

        if (page > 1) {
            html +=
                '<a href="' +
                paginationHref(page - 1) +
                '" class="pagination-btn pagination-btn-primary">&lt;</a>';
            html +=
                '<a href="' +
                paginationHref(1) +
                '" class="pagination-btn pagination-btn-tertiary">1</a>';
        }

        var skipBack = page - Math.floor(totalPages / 3);
        if (skipBack > 1 && skipBack < page) {
            html +=
                '<a href="' +
                paginationHref(skipBack) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                skipBack +
                '</a>';
            html += '<span class="text-gray-400 dark:text-gray-500">...</span>';
        }

        html +=
            '<span class="pagination-btn pagination-btn-current" aria-current="page">' +
            page +
            '</span>';

        var skipForward = page + Math.floor(totalPages / 3);
        if (skipForward < totalPages && skipForward > page) {
            html += '<span class="text-gray-400 dark:text-gray-500">...</span>';
            html +=
                '<a href="' +
                paginationHref(skipForward) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                skipForward +
                '</a>';
        }

        if (page < totalPages) {
            html +=
                '<a href="' +
                paginationHref(totalPages) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                totalPages +
                '</a>';
            html +=
                '<a href="' +
                paginationHref(page + 1) +
                '" class="pagination-btn pagination-btn-primary">&gt;</a>';
        }

        // Limit selector
        html +=
            '<form method="get" action="/transactions" class="flex items-center gap-2 mb-4 mt-2">';
        html +=
            '<select id="limit" name="limit" class="input-field w-20 text-center py-1 pl-0 pr-2 text-xs sm:text-sm bg-white dark:bg-midnight-800 border border-teal-300 dark:border-teal-600 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none text-gray-900 dark:text-gray-100">';
        [25, 50, 100].forEach(function (val) {
            html +=
                '<option value="' +
                val +
                '"' +
                (state.limit === val ? ' selected' : '') +
                '>' +
                val +
                '</option>';
        });
        html += '</select>';
        html +=
            '<label for="limit" class="text-sm font-medium text-teal-700 dark:text-teal-300">per page</label>';
        html += '</form>';

        paginationEl.innerHTML = html;
    }

    function paginationHref(page) {
        var params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(state.limit));
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', String(state.ascend));
        }
        if (state.filter) params.set('filter', state.filter);
        return '/transactions?' + params.toString();
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
            var data = await response.json();
            if (data.success) {
                var dateDisplay = row.querySelector('td:first-child .tx-display');
                var qtyDisplay = row.querySelector('td:nth-child(4) .tx-display');
                var priceDisplay = row.querySelector('td:nth-child(5) .tx-display');
                var totalDisplay = row.querySelector('.tx-total');

                if (body.date && dateDisplay) dateDisplay.textContent = body.date;
                if (body.quantity && qtyDisplay) qtyDisplay.textContent = body.quantity;
                if (body.pricePerUnit !== undefined) {
                    if (priceDisplay) priceDisplay.textContent = toDollar(body.pricePerUnit);
                    row.dataset.rawPrice = body.pricePerUnit;
                }

                var qty = body.quantity || parseInt(qtyDisplay.textContent, 10);
                var price =
                    body.pricePerUnit !== undefined
                        ? body.pricePerUnit
                        : parseFloat(row.dataset.rawPrice);
                if (totalDisplay) totalDisplay.textContent = toDollar(qty * price);

                toggleEditMode(row, false);
            } else {
                var msg = data.error || 'Unknown error';
                if (typeof window.showToast === 'function') {
                    window.showToast('Failed to update: ' + msg, 'error');
                } else {
                    alert('Failed to update: ' + msg);
                }
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Error updating transaction', 'error');
            } else {
                alert('Error updating transaction.');
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
            var data = await response.json();
            if (data.success) {
                var row = deleteBtn.closest('tr');
                if (row) row.remove();
            } else {
                var msg = data.error || 'Failed to delete transaction';
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, 'error');
                } else {
                    console.error('Failed to delete transaction:', msg);
                }
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Error deleting transaction', 'error');
            }
        }
    }

    function toDollar(amount) {
        if (amount == null || amount === 0) return '-';
        var rounded = Math.round(amount * 100) / 100;
        var str = rounded.toFixed(2);
        str = '$' + str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return str;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
