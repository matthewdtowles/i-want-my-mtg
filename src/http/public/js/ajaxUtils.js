/**
 * Shared AJAX utilities for pagination, formatting, and common rendering.
 * Used by all *Ajax.js page scripts to avoid duplication.
 */
var AjaxUtils = (function () {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function smoothScroll(el, block) {
        el.scrollIntoView({
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
            block: block || 'start',
        });
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function toDollar(amount) {
        if (amount == null || amount === 0) return '-';
        var rounded = Math.round(amount * 100) / 100;
        var str = rounded.toFixed(2);
        str = '$' + str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return str;
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

    function showSpinner(el) {
        if (!el) return;
        el.style.minHeight = el.offsetHeight + 'px';
        el.innerHTML =
            '<div class="text-center py-16"><i class="fas fa-spinner fa-spin text-4xl text-teal-500"></i></div>';
    }

    function clearMinHeight(el) {
        if (el) el.style.minHeight = '';
    }

    /**
     * Render pagination HTML given a page/totalPages/limit state and a href builder.
     * @param {object} opts
     * @param {number} opts.page - Current page
     * @param {number} opts.totalPages - Total pages
     * @param {number} opts.limit - Current limit
     * @param {function} opts.hrefBuilder - function(page) => href string
     * @param {string} opts.formAction - form action URL for the limit selector
     * @param {object} [opts.hiddenFields] - hidden fields for the limit form {name: value}
     * @returns {string} HTML string
     */
    function renderPaginationHtml(opts) {
        var page = opts.page;
        var totalPages = opts.totalPages;
        var limit = opts.limit;
        var hrefBuilder = opts.hrefBuilder;
        var formAction = opts.formAction;
        var hiddenFields = opts.hiddenFields || {};

        if (!totalPages || totalPages <= 1) return '';

        var html = '';

        if (page > 1) {
            html +=
                '<a href="' +
                hrefBuilder(page - 1) +
                '" class="pagination-btn pagination-btn-primary">&lt;</a>';
            html +=
                '<a href="' +
                hrefBuilder(1) +
                '" class="pagination-btn pagination-btn-tertiary">1</a>';
        }

        var skipBack = page - Math.floor(totalPages / 3);
        if (skipBack > 1 && skipBack < page) {
            html +=
                '<a href="' +
                hrefBuilder(skipBack) +
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
                hrefBuilder(skipForward) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                skipForward +
                '</a>';
        }

        if (page < totalPages) {
            html +=
                '<a href="' +
                hrefBuilder(totalPages) +
                '" class="pagination-btn pagination-btn-tertiary">' +
                totalPages +
                '</a>';
            html +=
                '<a href="' +
                hrefBuilder(page + 1) +
                '" class="pagination-btn pagination-btn-primary">&gt;</a>';
        }

        // Limit selector
        html +=
            '<form method="get" action="' +
            escapeHtml(formAction) +
            '" class="flex items-center gap-2 mb-4 mt-2">';
        var fieldNames = Object.keys(hiddenFields);
        for (var i = 0; i < fieldNames.length; i++) {
            var name = fieldNames[i];
            var value = hiddenFields[name];
            if (value !== undefined && value !== null && value !== '') {
                html +=
                    '<input type="hidden" name="' +
                    escapeHtml(name) +
                    '" value="' +
                    escapeHtml(String(value)) +
                    '" />';
            }
        }
        html +=
            '<select id="limit" name="limit" class="input-field w-20 text-center py-1 pl-0 pr-2 text-xs sm:text-sm bg-white dark:bg-midnight-800 border border-teal-300 dark:border-teal-600 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none text-gray-900 dark:text-gray-100">';
        [25, 50, 100].forEach(function (val) {
            html +=
                '<option value="' +
                val +
                '"' +
                (limit === val ? ' selected' : '') +
                '>' +
                val +
                '</option>';
        });
        html += '</select>';
        html +=
            '<label for="limit" class="text-sm font-medium text-teal-700 dark:text-teal-300">per page</label>';
        html += '</form>';

        return html;
    }

    /**
     * Update pagination element with rendered HTML. Handles empty/clearing.
     * Scrolls the results container into view after rendering.
     * @param {object} opts
     * @param {HTMLElement} opts.paginationEl - The pagination container element (or null)
     * @param {HTMLElement} opts.parentEl - Parent to search for .pagination-container
     * @param {HTMLElement} opts.insertAfterEl - Element to insert pagination after if it doesn't exist
     * @param {string} opts.html - Rendered pagination HTML (empty string = no pagination)
     * @param {HTMLElement} [opts.scrollTargetEl] - Element to scroll into view after render
     */
    function updatePaginationEl(opts) {
        var paginationEl =
            opts.paginationEl || opts.parentEl.querySelector('.pagination-container');

        if (!opts.html) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        if (!paginationEl) {
            paginationEl = document.createElement('section');
            paginationEl.className = 'pagination-container';
            opts.insertAfterEl.parentNode.insertBefore(
                paginationEl,
                opts.insertAfterEl.nextSibling
            );
        }

        paginationEl.innerHTML = opts.html;

        if (opts.scrollTargetEl) {
            smoothScroll(opts.scrollTargetEl, 'start');
        }
    }

    /**
     * Render a sortable table header <th> element.
     * @param {object} header - {key, label, subtitle?, classes?}
     * @param {object} state - Current state with sort, ascend, limit, filter, baseOnly
     * @param {string[]} [extraParams] - Additional state keys to include in sort href
     * @returns {string} HTML string
     */
    function renderSortableHeader(header, state, extraParams) {
        var isActive = state.sort === header.key;
        var nextAscend = isActive ? !state.ascend : true;
        var params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', String(state.limit));
        params.set('sort', header.key);
        params.set('ascend', String(nextAscend));
        if (state.filter) params.set('filter', state.filter);
        if (state.baseOnly === false) params.set('baseOnly', 'false');

        if (extraParams) {
            for (var i = 0; i < extraParams.length; i++) {
                var key = extraParams[i];
                if (state[key] !== undefined && state[key] !== null && state[key] !== '') {
                    params.set(key, String(state[key]));
                }
            }
        }

        var arrow = isActive ? (state.ascend ? '&#9650;' : '&#9660;') : '';
        var subtitleHtml = header.subtitle
            ? ' <span class="header-subtitle">(' + escapeHtml(header.subtitle) + '\u25B3)</span>'
            : '';
        var classAttr =
            'table-header' +
            (header.classes ? ' ' + header.classes : '') +
            (header.key === 'set.name' ? ' pl-2' : '');

        return (
            '<th class="' +
            classAttr +
            '">' +
            '<a href="?' +
            params.toString() +
            '" class="sort-btn">' +
            escapeHtml(header.label) +
            subtitleHtml +
            ' <span class="sort-icon">' +
            arrow +
            '</span>' +
            '</a></th>'
        );
    }

    /**
     * Render a non-sortable table header <th> element.
     * @param {object} header - {label, classes?}
     * @returns {string} HTML string
     */
    function renderStaticHeader(header) {
        var classAttr = 'table-header' + (header.classes ? ' ' + header.classes : '');
        return '<th class="' + classAttr + '">' + escapeHtml(header.label) + '</th>';
    }

    /**
     * Setup common AJAX interception for pagination, limit, and limit form submit.
     * @param {object} opts
     * @param {HTMLElement} opts.container - The AJAX container element
     * @param {object} opts.state - The state object (mutated by handlers)
     * @param {function} opts.fetchFn - Function to call after state change: fetchFn(historyMethod)
     * @param {boolean} [opts.scopeToContainer] - If true, scope pagination/limit events to container's parent
     */
    function setupPaginationInterceptors(opts) {
        var container = opts.container;
        var state = opts.state;
        var fetchFn = opts.fetchFn;
        var scopeToContainer = opts.scopeToContainer !== false;

        // Remove inline onchange from SSR limit select
        var ssrLimitSelect = scopeToContainer
            ? container.parentElement.querySelector('.pagination-container select#limit')
            : document.querySelector('.pagination-container select#limit');
        if (ssrLimitSelect) {
            ssrLimitSelect.removeAttribute('onchange');
        }

        // Intercept pagination clicks
        document.addEventListener('click', function (e) {
            var link = e.target.closest('.pagination-container a');
            if (!link) return;
            if (scopeToContainer && !container.parentElement.contains(link)) return;
            e.preventDefault();
            var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
            state.page = parseInt(params.get('page'), 10) || 1;
            if (params.has('limit')) state.limit = parseInt(params.get('limit'), 10) || 25;
            fetchFn('pushState');
        });

        // Intercept limit select change
        document.addEventListener('change', function (e) {
            if (e.target.id !== 'limit') return;
            if (scopeToContainer) {
                var paginationParent = e.target.closest('.pagination-container');
                if (!paginationParent || !container.parentElement.contains(paginationParent))
                    return;
            }
            e.preventDefault();
            state.limit = parseInt(e.target.value, 10) || 25;
            state.page = 1;
            fetchFn('pushState');
        });

        // Intercept limit form submit
        document.addEventListener('submit', function (e) {
            var paginationParent = e.target.closest('.pagination-container');
            if (paginationParent) {
                if (!scopeToContainer || container.parentElement.contains(paginationParent)) {
                    e.preventDefault();
                }
            }
        });
    }

    /**
     * Setup filter form interception (clone form, bind debounced input, clear button).
     * @param {object} opts
     * @param {object} opts.state - State object with .filter and .page
     * @param {function} opts.fetchFn - Function to call: fetchFn(historyMethod)
     */
    function setupFilterInterceptor(opts) {
        var state = opts.state;
        var fetchFn = opts.fetchFn;

        var filterForm = document.getElementById('filter-form');
        if (!filterForm) return;

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
                    fetchFn('replaceState');
                }, 300);
            });

            var clearBtn = newForm.querySelector('#clear-filter-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {
                    filterInput.value = '';
                    clearBtn.style.display = 'none';
                    state.filter = '';
                    state.page = 1;
                    fetchFn('replaceState');
                });
            }
        }
    }

    /**
     * Setup sort header click interception.
     * @param {object} opts
     * @param {string} opts.selector - CSS selector to scope sort link clicks (e.g. '#my-container thead a.sort-btn')
     * @param {object} opts.state - State object with .sort, .ascend, .page
     * @param {function} opts.fetchFn - Function to call: fetchFn(historyMethod)
     */
    function setupSortInterceptor(opts) {
        document.addEventListener('click', function (e) {
            var link = e.target.closest(opts.selector);
            if (!link) return;
            e.preventDefault();
            var params = new URLSearchParams(link.getAttribute('href').replace(/^\?/, ''));
            opts.state.sort = params.get('sort') || '';
            opts.state.ascend = params.get('ascend') === 'true';
            opts.state.page = 1;
            opts.fetchFn('pushState');
        });
    }

    /**
     * Setup baseOnly toggle interception.
     * @param {object} opts
     * @param {string} opts.selector - CSS selector for baseOnly links
     * @param {object} opts.state - State object with .baseOnly, .page
     * @param {function} opts.fetchFn - Function to call: fetchFn(historyMethod)
     */
    function setupBaseOnlyInterceptor(opts) {
        document.addEventListener('click', function (e) {
            var link = e.target.closest(opts.selector);
            if (!link) return;
            if (link.closest('.pagination-container')) return;
            e.preventDefault();
            var params = new URLSearchParams(link.getAttribute('href').replace(/^[^?]*\?/, ''));
            opts.state.baseOnly = params.has('baseOnly')
                ? params.get('baseOnly') !== 'false'
                : true;
            opts.state.page = 1;
            opts.fetchFn('pushState');
        });
    }

    /**
     * Update baseOnly toggle link text and href.
     * @param {object} opts
     * @param {HTMLElement} opts.container - Element to search for the toggle link
     * @param {object} opts.state - State with baseOnly, filter, limit
     * @param {string} opts.basePath - Base URL path (e.g. '/sets', '/inventory')
     */
    function updateBaseOnlyToggle(opts) {
        var toggle = opts.container.querySelector('a[href*="baseOnly"]');
        if (!toggle) return;
        toggle.classList.remove('hidden');
        var params = new URLSearchParams();
        if (opts.state.filter) params.set('filter', opts.state.filter);
        if (opts.state.limit !== 25) params.set('limit', String(opts.state.limit));
        if (opts.state.baseOnly) {
            params.set('baseOnly', 'false');
            toggle.setAttribute('href', opts.basePath + '?' + params.toString());
            toggle.textContent = 'Show All';
            toggle.className = toggle.className.replace('btn-primary', 'btn-secondary');
        } else {
            params.set('baseOnly', 'true');
            toggle.setAttribute('href', opts.basePath + '?' + params.toString());
            toggle.textContent = 'Main Only';
            toggle.className = toggle.className.replace('btn-secondary', 'btn-primary');
        }
    }

    /**
     * Setup view toggle (list/binder) interception.
     * @param {object} opts
     * @param {HTMLElement} opts.container - Element containing toggle buttons
     * @param {object} opts.state - State object with .view, .page
     * @param {function} opts.fetchFn - Function to call: fetchFn(historyMethod)
     * @param {function} [opts.onToggle] - Called after state.view changes with new view value
     */
    function setupViewToggleInterceptor(opts) {
        opts.container.addEventListener('click', function (e) {
            var btn = e.target.closest('.view-toggle-btn');
            if (!btn) return;
            e.preventDefault();
            var newView = btn.getAttribute('data-view');
            if (!newView || newView === opts.state.view) return;
            opts.state.view = newView;
            opts.state.page = 1;
            localStorage.setItem('setViewPreference', newView);
            if (opts.onToggle) opts.onToggle(newView);
            opts.fetchFn('pushState');
        });
    }

    /**
     * Update view toggle button active/inactive classes.
     * @param {HTMLElement} container - Element containing toggle buttons
     * @param {string} activeView - 'list' or 'binder'
     */
    function updateViewToggle(container, activeView) {
        var buttons = container.querySelectorAll('.view-toggle-btn');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var isActive = btn.getAttribute('data-view') === activeView;
            btn.classList.toggle('view-toggle-active', isActive);
            btn.classList.toggle('view-toggle-inactive', !isActive);
        }
    }

    /**
     * Parse common state from URL parameters.
     * @param {string[]} [extraKeys] - Additional keys to parse (beyond page, limit, sort, ascend, filter, baseOnly)
     * @returns {object} Parsed state
     */
    function parseStateFromUrl(extraKeys) {
        var params = new URLSearchParams(window.location.search);
        var state = {
            page: parseInt(params.get('page'), 10) || 1,
            limit: parseInt(params.get('limit'), 10) || 25,
            sort: params.get('sort') || '',
            ascend: params.get('ascend') === 'true',
            filter: params.get('filter') || '',
            baseOnly: params.has('baseOnly') ? params.get('baseOnly') !== 'false' : true,
            view: params.get('view') === 'binder' ? 'binder' : 'list',
        };
        if (extraKeys) {
            for (var i = 0; i < extraKeys.length; i++) {
                state[extraKeys[i]] = params.get(extraKeys[i]) || '';
            }
        }
        return state;
    }

    /**
     * Update an existing state object in-place from URL parameters.
     * Preserves object identity so closures (interceptors) stay in sync.
     * @param {object} state - The state object to update
     * @param {string[]} [extraKeys] - Additional keys to parse
     */
    function syncStateFromUrl(state, extraKeys) {
        var fresh = parseStateFromUrl(extraKeys);
        var keys = Object.keys(fresh);
        for (var i = 0; i < keys.length; i++) {
            state[keys[i]] = fresh[keys[i]];
        }
    }

    /**
     * Build a browser URL from state for history.pushState/replaceState.
     * @param {string} basePath - The base path (e.g. '/sets', '/inventory')
     * @param {object} state - Current state object
     * @param {object} [defaults] - Default values to omit from URL
     * @returns {string} URL string
     */
    function buildBrowserUrl(basePath, state, defaults) {
        defaults = defaults || {};
        var params = new URLSearchParams();
        if (state.q) params.set('q', state.q);
        if (state.page > 1) params.set('page', state.page);
        if (state.limit !== (defaults.limit || 25)) params.set('limit', state.limit);
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', String(state.ascend));
        }
        if (state.filter) params.set('filter', state.filter);
        if (state.baseOnly === false) params.set('baseOnly', 'false');
        if (state.view && state.view !== 'list') params.set('view', state.view);
        var qs = params.toString();
        return basePath + (qs ? '?' + qs : '');
    }

    /**
     * Clone the quantity form template and populate it.
     * @param {string} cardId
     * @param {number} quantity
     * @param {boolean} isFoil
     * @returns {string} outerHTML string
     */
    function createQuantityForm(cardId, quantity, isFoil) {
        var tpl = document.getElementById('tpl-quantity-form');
        var clone = tpl.content.cloneNode(true);
        var foilClass = isFoil ? 'foil' : 'normal';
        var form = clone.querySelector('form');
        form.classList.add('quantity-form-' + foilClass);
        form.setAttribute('data-item-id', cardId);
        form.setAttribute('data-foil', String(isFoil));
        form.querySelector('input[name="cardId"]').setAttribute('value', cardId);
        var incBtn = form.querySelector('.increment-quantity');
        incBtn.classList.add('inventory-controller-button-' + foilClass);
        var qtyInput = form.querySelector('.quantity-owned');
        qtyInput.setAttribute('value', quantity);
        qtyInput.setAttribute('data-id', cardId);
        form.querySelector('input[name="isFoil"]').setAttribute('value', String(isFoil));
        var decBtn = form.querySelector('.decrement-quantity');
        decBtn.classList.add('inventory-controller-button-' + foilClass);
        var wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        return wrapper.innerHTML;
    }

    /**
     * Render an inventory stepper for a single variant.
     * @param {string} cardId
     * @param {number} quantity
     * @param {boolean} isFoil
     * @param {object} [opts] - { compact: boolean }
     * @returns {string} outerHTML string
     */
    function createStepper(cardId, quantity, isFoil, opts) {
        var tpl = document.getElementById('tpl-inv-stepper');
        var clone = tpl.content.cloneNode(true);
        var el = clone.querySelector('.inv-stepper');
        var variant = isFoil ? 'foil' : 'normal';

        el.classList.add('inv-stepper--' + variant);
        el.setAttribute('data-card-id', cardId);
        el.setAttribute('data-foil', String(isFoil));
        if (opts && opts.compact) {
            el.classList.add('inv-stepper--sm');
        }

        var qtyEl = el.querySelector('.inv-stepper-qty');
        qtyEl.textContent = quantity;
        if (quantity === 0) {
            qtyEl.classList.add('inv-stepper-qty--zero');
        }

        var decBtn = el.querySelector('.inv-stepper-btn--dec');
        decBtn.setAttribute('aria-label', 'Decrease ' + variant + ' quantity');
        if (quantity <= 0) {
            decBtn.setAttribute('disabled', '');
        }

        var incBtn = el.querySelector('.inv-stepper-btn--inc');
        incBtn.setAttribute('aria-label', 'Increase ' + variant + ' quantity');

        var wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        return wrapper.innerHTML;
    }

    /**
     * Render a stepper group (normal + foil) with labels.
     * @param {string} cardId
     * @param {number} normalQty
     * @param {number} foilQty
     * @param {boolean} hasNormal
     * @param {boolean} hasFoil
     * @param {object} [opts] - { compact: boolean }
     * @returns {string} HTML string
     */
    function createStepperGroup(cardId, normalQty, foilQty, hasNormal, hasFoil, opts) {
        var html = '<div class="inv-stepper-group">';
        if (hasNormal) {
            html += '<div>';
            html += '<div class="inv-stepper-label inv-stepper-label--normal">Normal</div>';
            html += createStepper(cardId, normalQty, false, opts);
            html += '</div>';
        }
        if (hasFoil) {
            html += '<div>';
            html += '<div class="inv-stepper-label inv-stepper-label--foil">Foil</div>';
            html += createStepper(cardId, foilQty, true, opts);
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Clone the delete inventory form template and populate it.
     * @param {string} cardId
     * @param {boolean} isFoil
     * @returns {string} outerHTML string
     */
    function createDeleteForm(cardId, isFoil) {
        var tpl = document.getElementById('tpl-delete-inventory');
        var clone = tpl.content.cloneNode(true);
        var form = clone.querySelector('form');
        form.setAttribute('data-item-id', cardId);
        form.querySelector('input[name="card-id"]').setAttribute('value', cardId);
        form.querySelector('input[name="isFoil"]').setAttribute('value', String(isFoil));
        var wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        return wrapper.innerHTML;
    }

    /**
     * Clone the transaction row template and populate it.
     * @param {object} tx - Transaction object
     * @returns {string} outerHTML string
     */
    function createTransactionRow(tx) {
        var tpl = document.getElementById('tpl-transaction-row');
        var clone = tpl.content.cloneNode(true);
        var row = clone.querySelector('tr');
        var total = tx.quantity * tx.pricePerUnit;

        // Data attributes on <tr>
        row.setAttribute('data-transaction-id', tx.id);
        row.setAttribute('data-raw-price', tx.pricePerUnit);
        row.setAttribute('data-raw-fees', tx.fees || 0);
        row.setAttribute('data-source', tx.source || '');
        row.setAttribute('data-notes', tx.notes || '');

        // Date
        var dateDisplays = row.querySelectorAll('td:first-child .tx-display');
        if (dateDisplays.length) dateDisplays[0].textContent = tx.date;
        var dateInput = row.querySelector('input[data-field="date"]');
        if (dateInput) dateInput.setAttribute('value', tx.date);

        // Type
        if (tx.type === 'BUY') {
            var sellBadge = row.querySelector('.tx-type-sell');
            if (sellBadge) sellBadge.classList.add('hidden');
        } else {
            var buyBadge = row.querySelector('.tx-type-buy');
            if (buyBadge) buyBadge.classList.add('hidden');
            var sellEl = row.querySelector('.tx-type-sell');
            if (sellEl) sellEl.classList.remove('hidden');
        }

        // Card
        if (tx.cardUrl) {
            var cardLink = row.querySelector('.tx-card-link');
            cardLink.href = tx.cardUrl;
            cardLink.textContent = tx.cardName || '';
            cardLink.classList.remove('hidden');
        } else {
            var cardText = row.querySelector('.tx-card-text');
            cardText.textContent = tx.cardName || tx.cardId;
        }

        // Foil badge
        if (tx.isFoil) {
            row.querySelector('.tx-foil-badge').classList.remove('hidden');
        }

        // Set code
        if (tx.setCode) {
            var setCodeEl = row.querySelector('.tx-set-code');
            setCodeEl.textContent = '(' + tx.setCode.toUpperCase() + ')';
            setCodeEl.classList.remove('hidden');
        }

        // Qty
        var qtyDisplays = row.querySelectorAll('td:nth-child(4) .tx-display');
        if (qtyDisplays.length) qtyDisplays[0].textContent = tx.quantity;
        var qtyInput = row.querySelector('input[data-field="quantity"]');
        if (qtyInput) qtyInput.setAttribute('value', tx.quantity);

        // Price
        var priceDisplays = row.querySelectorAll('td:nth-child(5) .tx-display');
        if (priceDisplays.length) priceDisplays[0].textContent = toDollar(tx.pricePerUnit);
        var priceInput = row.querySelector('input[data-field="pricePerUnit"]');
        if (priceInput) priceInput.setAttribute('value', tx.pricePerUnit);

        // Total
        var totalEl = row.querySelector('.tx-total');
        if (totalEl) totalEl.textContent = toDollar(total);

        // Actions
        if (tx.editable) {
            var editableActions = row.querySelector('.tx-editable-actions');
            editableActions.classList.remove('hidden');
            var deleteBtn = row.querySelector('.delete-transaction-button');
            deleteBtn.setAttribute('data-transaction-id', tx.id);
        } else {
            var lockedIcon = row.querySelector('.tx-locked-icon');
            lockedIcon.classList.remove('hidden');
        }

        var wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        return wrapper.innerHTML;
    }

    /**
     * Render tag badges from an array of tag strings.
     * @param {string[]} tags
     * @returns {string} HTML string
     */
    function renderTags(tags) {
        if (!tags || !tags.length) return '';
        var html = '';
        for (var i = 0; i < tags.length; i++) {
            html += '<span class="tag">' + escapeHtml(tags[i]) + '</span>';
        }
        return html;
    }

    /**
     * Render a standardized card name link with optional image preview support.
     * @param {string} url - Card detail page URL
     * @param {string} name - Card display name
     * @param {string} [imgSrc] - Full image URL for hover preview
     * @param {string[]} [tags] - Array of tag strings
     * @returns {string} HTML string
     */
    function renderCardLink(url, name, imgSrc, tags) {
        var html = '<a href="' + escapeHtml(url) + '" class="card-name-link"';
        if (imgSrc) {
            html += ' data-card-img="' + escapeHtml(imgSrc) + '"';
        }
        html += '>' + escapeHtml(name) + '</a>';
        html += renderTags(tags);
        return html;
    }

    /**
     * Render a price change badge.
     * @param {number} change - Price change amount
     * @returns {string} HTML string
     */
    function renderPriceChange(change) {
        if (change == null || change === 0) return '';
        var abs = Math.abs(Math.round(change * 100) / 100);
        var formatted = toDollar(abs);
        if (change > 0) {
            return '<span class="price-change price-change-positive">+' + formatted + '</span>';
        }
        return '<span class="price-change price-change-negative">-' + formatted + '</span>';
    }

    /**
     * Render completion bar.
     * @param {number} rate - Completion percentage
     * @returns {string} HTML string
     */
    function renderCompletionBar(rate) {
        return (
            '<div class="completion-bar-container flex items-center relative">' +
            '<div class="completion-bar absolute top-0 left-0 h-full" style="width: ' +
            rate +
            '%;"></div>' +
            '<span class="w-full text-center z-10 font-bold relative">' +
            rate +
            '%</span>' +
            '</div>'
        );
    }

    /**
     * Build an API URL from a base path and state.
     * @param {string} apiPath - API endpoint path (e.g. '/api/v1/sets')
     * @param {object} state - Current state object
     * @returns {string} URL string
     */
    function buildApiUrl(apiPath, state, overrides) {
        var s = overrides ? mergeState(state, overrides) : state;
        var params = new URLSearchParams();
        params.set('page', s.page);
        params.set('limit', s.limit);
        if (s.sort) {
            params.set('sort', s.sort);
            params.set('ascend', s.ascend);
        }
        if (s.filter) params.set('filter', s.filter);
        if (s.baseOnly === false) params.set('baseOnly', 'false');
        return apiPath + '?' + params.toString();
    }

    function mergeState(state, overrides) {
        var merged = {};
        var keys = Object.keys(state);
        for (var i = 0; i < keys.length; i++) merged[keys[i]] = state[keys[i]];
        var oKeys = Object.keys(overrides);
        for (var j = 0; j < oKeys.length; j++) merged[oKeys[j]] = overrides[oKeys[j]];
        return merged;
    }

    /**
     * Build a pagination link href from state.
     * @param {string} basePath - Browser URL base path
     * @param {object} state - Current state object
     * @param {number} page - Target page number
     * @returns {string} URL string
     */
    function buildPaginationHref(basePath, state, page) {
        var params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(state.limit));
        if (state.sort) {
            params.set('sort', state.sort);
            params.set('ascend', String(state.ascend));
        }
        if (state.filter) params.set('filter', state.filter);
        if (state.baseOnly === false) params.set('baseOnly', 'false');
        return basePath + '?' + params.toString();
    }

    /**
     * Render a table header row from header definitions.
     * Headers with a `key` property are sortable; others are static.
     * @param {Array} headers - Array of {key?, label, subtitle?, classes?}
     * @param {object} state - Current state for sort indicators
     * @returns {string} HTML string
     */
    function renderTableHeaderRow(headers, state) {
        var html = '<tr class="table-header-row">';
        for (var i = 0; i < headers.length; i++) {
            var h = headers[i];
            if (h.key) {
                html += renderSortableHeader(h, state);
            } else {
                html += renderStaticHeader(h);
            }
        }
        html += '</tr>';
        return html;
    }

    /**
     * Render an empty state message in a container.
     * @param {HTMLElement} el - Container element
     * @param {object} opts
     * @param {string} opts.message - Main message text
     * @param {string} [opts.hint] - Secondary hint text
     * @param {string} [opts.clearHref] - URL for the clear/reset button
     * @param {string} [opts.clearLabel] - Label for the clear button (default: 'Clear Filter')
     */
    function renderEmptyState(el, opts) {
        el.innerHTML =
            '<div class="text-center py-16">' +
            '<i class="fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>' +
            '<p class="text-lg text-gray-600 dark:text-gray-400 font-medium mt-4">' +
            escapeHtml(opts.message) +
            '</p>' +
            '<p class="text-gray-400 dark:text-gray-500 mt-2">' +
            escapeHtml(opts.hint || 'Try a different search term or clear your filter.') +
            '</p>' +
            (opts.clearHref
                ? '<a href="' +
                  escapeHtml(opts.clearHref) +
                  '" class="btn btn-secondary mt-6 inline-block">' +
                  escapeHtml(opts.clearLabel || 'Clear Filter') +
                  '</a>'
                : '') +
            '</div>';
    }

    /**
     * Initialize a standard AJAX list page with pagination, filtering, sorting,
     * and optional baseOnly toggle.
     *
     * Handles the full lifecycle: state parsing, interceptor setup,
     * fetch/render/pagination/history, and popstate. Page-specific rendering
     * is provided via config.renderContent.
     *
     * @param {object} config
     * @param {HTMLElement} config.container - The AJAX container element
     * @param {string} config.apiPath - API endpoint path (e.g. '/api/v1/sets')
     * @param {string} config.basePath - Browser URL base path (e.g. '/sets')
     * @param {function} config.renderContent - function(resultsEl, data, meta) that renders page content
     * @param {boolean} [config.hasBaseOnly=true] - Whether the page has a baseOnly toggle
     * @param {boolean} [config.hasFilter=true] - Whether the page has a filter form
     * @param {string} [config.errorMessage] - Error message shown on fetch failure
     * @param {function} [config.onSuccess] - Callback after successful render: function(data, meta, done).
     *   Must call done() to clear the spinner min-height. If omitted, min-height is cleared automatically.
     * @returns {object|null} { container, state, fetchAndRender } or null if container not found
     */
    function initListPage(config) {
        var container = config.container;
        if (!container) return null;

        var containerId = container.id;
        var apiPath = config.apiPath;
        var basePath = config.basePath;
        var hasBaseOnly = config.hasBaseOnly !== false;
        var hasFilter = config.hasFilter !== false;
        var errorMsg = config.errorMessage || 'Failed to load data';

        var state = parseStateFromUrl();
        var binderMinHeight = 0;

        if (hasFilter) {
            setupFilterInterceptor({ state: state, fetchFn: fetchAndRender });
        }

        setupSortInterceptor({
            selector: '#' + containerId + ' thead a.sort-btn',
            state: state,
            fetchFn: fetchAndRender,
        });

        setupPaginationInterceptors({
            container: container,
            state: state,
            fetchFn: fetchAndRender,
            scopeToContainer: true,
        });

        if (hasBaseOnly) {
            setupBaseOnlyInterceptor({
                selector: '#' + containerId + ' a[href*="baseOnly"]',
                state: state,
                fetchFn: fetchAndRender,
            });
        }

        window.addEventListener('popstate', function () {
            syncStateFromUrl(state);
            if (hasFilter) {
                var fi = document.querySelector('#filter');
                if (fi) fi.value = state.filter;
            }
            fetchAndRender(null);
        });

        function fetchAndRender(historyMethod) {
            var resultsEl = document.getElementById('filter-results');
            if (state.view !== 'binder') {
                showSpinner(resultsEl);
            } else {
                // Hold container at established binder height (or current height on first load)
                resultsEl.style.minHeight = (binderMinHeight || resultsEl.offsetHeight) + 'px';
            }

            var fetchUrl = buildApiUrl(apiPath, state);
            if (config.extraApiParams) {
                var extra = config.extraApiParams(state);
                if (extra) {
                    var url = new URL(fetchUrl, window.location.origin);
                    var extraParams = new URLSearchParams(extra);
                    extraParams.forEach(function (value, key) {
                        url.searchParams.set(key, value);
                    });
                    fetchUrl = url.pathname + '?' + url.searchParams.toString();
                }
            }

            fetch(fetchUrl, { credentials: 'same-origin' })
                .then(function (res) {
                    return res.json();
                })
                .then(function (json) {
                    if (!json.success) {
                        showError(resultsEl, json.error || errorMsg);
                        clearMinHeight(resultsEl);
                        return;
                    }

                    config.renderContent(resultsEl, json.data, json.meta);

                    if (state.view === 'binder') {
                        // Establish permanent binder height - never shrinks while in binder view
                        var contentHeight = resultsEl.scrollHeight;
                        if (contentHeight > binderMinHeight) {
                            binderMinHeight = contentHeight;
                        }
                        resultsEl.style.minHeight = binderMinHeight + 'px';
                        // Scroll binder to top of viewport immediately (before async inventory fetch)
                        resultsEl.scrollIntoView({ behavior: 'auto', block: 'start' });
                    } else {
                        doRenderPagination(json.meta);
                    }

                    if (json.meta) {
                        var total = json.meta.totalItems || json.meta.total || 0;
                        var pg = json.meta.page || 1;
                        var tp = json.meta.totalPages || 1;
                        announce('Showing page ' + pg + ' of ' + tp + ', ' + total + ' results');
                    }

                    if (hasBaseOnly) {
                        updateBaseOnlyToggle({
                            container: container,
                            state: state,
                            basePath: basePath,
                        });
                    }

                    if (historyMethod) {
                        window.history[historyMethod]({}, '', buildBrowserUrl(basePath, state));
                    }

                    if (config.onSuccess) {
                        config.onSuccess(json.data, json.meta, function () {
                            if (state.view !== 'binder') {
                                clearMinHeight(resultsEl);
                            }
                        });
                    } else {
                        if (state.view !== 'binder') {
                            clearMinHeight(resultsEl);
                        }
                    }
                })
                .catch(function (err) {
                    console.error('Fetch error (' + apiPath + '):', err);
                    showError(resultsEl, errorMsg + '. Please try again.');
                    clearMinHeight(resultsEl);
                    binderMinHeight = 0;
                });
        }

        function doRenderPagination(meta) {
            var paginationEl = container.parentElement.querySelector('.pagination-container');

            if (!meta || meta.totalPages <= 1) {
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            var hiddenFields = {};
            if (state.sort) {
                hiddenFields.sort = state.sort;
                hiddenFields.ascend = String(state.ascend);
            }
            if (state.filter) hiddenFields.filter = state.filter;

            var html = renderPaginationHtml({
                page: meta.page,
                totalPages: meta.totalPages,
                limit: state.limit,
                hrefBuilder: function (page) {
                    return buildPaginationHref(basePath, state, page);
                },
                formAction: basePath,
                hiddenFields: hiddenFields,
            });

            updatePaginationEl({
                paginationEl: paginationEl,
                parentEl: container.parentElement,
                insertAfterEl: container,
                html: html,
                scrollTargetEl: document.getElementById('filter-results'),
            });
        }

        return {
            container: container,
            state: state,
            fetchAndRender: fetchAndRender,
        };
    }

    function announce(message) {
        var el = document.getElementById('aria-live-announcer');
        if (!el) return;
        el.textContent = '';
        setTimeout(function () {
            el.textContent = message;
        }, 100);
    }

    return {
        announce: announce,
        smoothScroll: smoothScroll,
        escapeHtml: escapeHtml,
        toDollar: toDollar,
        showError: showError,
        showSpinner: showSpinner,
        clearMinHeight: clearMinHeight,
        renderPaginationHtml: renderPaginationHtml,
        updatePaginationEl: updatePaginationEl,
        renderSortableHeader: renderSortableHeader,
        renderStaticHeader: renderStaticHeader,
        setupPaginationInterceptors: setupPaginationInterceptors,
        setupFilterInterceptor: setupFilterInterceptor,
        setupSortInterceptor: setupSortInterceptor,
        setupBaseOnlyInterceptor: setupBaseOnlyInterceptor,
        updateBaseOnlyToggle: updateBaseOnlyToggle,
        parseStateFromUrl: parseStateFromUrl,
        syncStateFromUrl: syncStateFromUrl,
        buildBrowserUrl: buildBrowserUrl,
        buildApiUrl: buildApiUrl,
        buildPaginationHref: buildPaginationHref,
        renderTableHeaderRow: renderTableHeaderRow,
        createQuantityForm: createQuantityForm,
        createStepper: createStepper,
        createStepperGroup: createStepperGroup,
        createDeleteForm: createDeleteForm,
        createTransactionRow: createTransactionRow,
        renderTags: renderTags,
        renderCardLink: renderCardLink,
        renderEmptyState: renderEmptyState,
        renderPriceChange: renderPriceChange,
        renderCompletionBar: renderCompletionBar,
        setupViewToggleInterceptor: setupViewToggleInterceptor,
        updateViewToggle: updateViewToggle,
        mergeState: mergeState,
        initListPage: initListPage,
    };
})();
