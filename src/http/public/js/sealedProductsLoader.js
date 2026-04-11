/**
 * Lazy-loads sealed products for the set detail page.
 * Watches #sealed-products-section via IntersectionObserver,
 * fetches from /api/v1/sets/:code/sealed-products, and renders a product grid.
 */
(function () {
    'use strict';

    var container = document.getElementById('sealed-products-section');
    if (!container) return;

    var setCode = container.getAttribute('data-set-code');
    if (!setCode) return;

    var authenticated = container.getAttribute('data-authenticated') === 'true';
    var listEl = document.getElementById('sealed-products-list');

    var observer = new IntersectionObserver(
        function (entries) {
            if (entries[0].isIntersecting) {
                observer.disconnect();
                fetchSealedProducts(setCode);
            }
        },
        { rootMargin: '200px' }
    );
    observer.observe(container);

    function fetchSealedProducts(code) {
        fetch('/api/v1/sets/' + encodeURIComponent(code) + '/sealed-products?limit=100', {
            credentials: 'same-origin',
        })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                if (!json.success) {
                    throw new Error(json.error || 'Failed to load sealed products');
                }
                if (!json.data || json.data.length === 0) {
                    container.style.display = 'none';
                    return;
                }
                renderProducts(json.data);
            })
            .catch(function () {
                listEl.innerHTML =
                    '<p class="text-sm text-red-500">Failed to load sealed products.</p>';
            });
    }

    function renderProducts(products) {
        var html =
            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">';

        for (var i = 0; i < products.length; i++) {
            var p = products[i];
            html += renderProductCard(p);
        }

        html += '</div>';
        listEl.innerHTML = html;
    }

    function renderProductCard(p) {
        var name = AjaxUtils.escapeHtml(p.name);
        var category = p.category ? AjaxUtils.escapeHtml(formatCategory(p.category)) : '';
        var subtype = p.subtype ? AjaxUtils.escapeHtml(formatCategory(p.subtype)) : '';
        var hasPrice = p.price && p.price.price != null && p.price.price > 0;
        var price = hasPrice ? AjaxUtils.toDollar(p.price.price) : '';
        var contents = p.contentsSummary ? AjaxUtils.escapeHtml(p.contentsSummary) : '';
        var link = '/sealed-products/' + encodeURIComponent(p.uuid);

        var html = '<div class="rounded-lg border border-gray-200 dark:border-gray-700 ' +
            'bg-white dark:bg-midnight-800 p-4 hover:shadow-md transition-shadow">';

        html += '<a href="' + link + '" class="block">';
        if (p.tcgplayerProductId) {
            html += '<div class="flex justify-center mb-3">';
            html += '<img src="https://product-images.tcgplayer.com/fit-in/200x200/' + AjaxUtils.escapeHtml(p.tcgplayerProductId) + '.jpg"';
            html += ' alt="' + name + '" class="max-h-32 rounded object-contain" loading="lazy" />';
            html += '</div>';
        }
        html += '<div class="flex items-start justify-between gap-2">';
        html += '<h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">' + name + '</h3>';
        if (hasPrice) {
            html += '<span class="text-sm font-medium text-teal-600 dark:text-teal-400 whitespace-nowrap">' + price + '</span>';
        }
        html += '</div>';

        if (category || subtype) {
            html += '<div class="mt-1 flex gap-2">';
            if (category) {
                html += '<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">' + category + '</span>';
            }
            if (subtype) {
                html += '<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">' + subtype + '</span>';
            }
            html += '</div>';
        }

        if (contents) {
            html += '<p class="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">' + contents + '</p>';
        }
        html += '</a>';

        if (authenticated) {
            html += renderStepper(p.uuid);
        }

        html += '</div>';
        return html;
    }

    function renderStepper(uuid) {
        var html = '<div class="sealed-inv-stepper mt-2 pt-2 border-t border-gray-100 dark:border-gray-700" data-sealed-uuid="' + AjaxUtils.escapeHtml(uuid) + '">';
        html += '<div class="flex items-center gap-2">';
        html += '<button type="button" class="sealed-inv-btn sealed-inv-btn--dec inv-stepper-btn inv-stepper-btn--dec" aria-label="Decrease quantity" disabled>';
        html += '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M5 12h14"/></svg>';
        html += '</button>';
        html += '<span class="sealed-inv-qty inv-stepper-qty sealed-inv-qty--zero inv-stepper-qty--zero" role="status" aria-live="polite">0</span>';
        html += '<button type="button" class="sealed-inv-btn sealed-inv-btn--inc inv-stepper-btn inv-stepper-btn--inc" aria-label="Increase quantity">';
        html += '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>';
        html += '</button>';
        html += '<span class="text-xs text-gray-400 dark:text-gray-500">owned</span>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function formatCategory(str) {
        return str.replace(/_/g, ' ').replace(/\b\w/g, function (c) {
            return c.toUpperCase();
        });
    }
})();
