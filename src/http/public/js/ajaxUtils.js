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
        var qs = params.toString();
        return basePath + (qs ? '?' + qs : '');
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

    return {
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
        renderPriceChange: renderPriceChange,
        renderCompletionBar: renderCompletionBar,
    };
})();
