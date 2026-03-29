(function () {
    'use strict';

    function escapeHtml(s) {
        return AppState.escapeHtml(s);
    }

    var SVG_LEFT =
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
        '</svg>';

    var SVG_RIGHT =
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
        '</svg>';

    function renderCard(card, qty, setCode, options) {
        options = options || {};
        var url = '/card/' + encodeURIComponent(setCode) + '/' + encodeURIComponent(card.number);
        var imgSrc = 'https://cards.scryfall.io/normal/front/' + card.imgSrc;
        var escapedName = escapeHtml(card.name);
        var escapedNumber = escapeHtml(card.number);
        var escapedId = escapeHtml(card.id);

        var isOwned = qty.normalQuantity > 0 || qty.foilQuantity > 0;
        var ownerClass = '';
        if (options.showOwnedState) {
            ownerClass = isOwned ? ' binder-card-owned' : ' binder-card-unowned';
        }

        var html =
            '<div class="binder-card' +
            ownerClass +
            '"' +
            ' data-card-id="' +
            escapedId +
            '"' +
            ' data-has-foil="' +
            !!card.hasFoil +
            '"' +
            ' data-has-non-foil="' +
            !!card.hasNonFoil +
            '">';

        html +=
            '<a href="' +
            escapeHtml(url) +
            '" title="' +
            escapedName +
            '">' +
            '<img src="' +
            escapeHtml(imgSrc) +
            '"' +
            ' alt="' +
            escapedName +
            '"' +
            ' loading="lazy" width="488" height="680"' +
            ' class="binder-card-img" />' +
            '</a>';

        html += '<span class="binder-card-number">#' + escapedNumber + '</span>';

        html +=
            '<div class="binder-card-overlay">' +
            '<span class="binder-card-overlay-name">' +
            escapedName +
            '</span>' +
            '<span class="binder-card-overlay-number">#' +
            escapedNumber +
            '</span>';

        if (options.authenticated) {
            html +=
                '<div class="binder-card-stepper">' +
                AjaxUtils.createStepperGroup(
                    card.id,
                    qty.normalQuantity,
                    qty.foilQuantity,
                    !!card.hasNonFoil,
                    !!card.hasFoil,
                    { compact: true }
                ) +
                '</div>';
        }

        html += '</div>';
        html += '</div>';
        return html;
    }

    function renderNav(currentPage, totalPages, inputId) {
        if (totalPages <= 1) return '';

        var prevDisabled = currentPage <= 1 ? ' disabled' : '';
        var nextDisabled = currentPage >= totalPages ? ' disabled' : '';

        return (
            '<nav class="binder-page-nav" data-total-pages="' +
            totalPages +
            '" aria-label="Binder page navigation">' +
            '<button type="button" class="binder-page-btn" data-dir="prev"' +
            prevDisabled +
            ' aria-label="Previous page">' +
            SVG_LEFT +
            '</button>' +
            '<span class="binder-page-indicator">' +
            '<label class="sr-only" for="' +
            escapeHtml(inputId) +
            '">Page</label>' +
            '<input id="' +
            escapeHtml(inputId) +
            '" type="number" class="binder-page-input"' +
            ' value="' +
            currentPage +
            '" min="1" max="' +
            totalPages +
            '"' +
            ' aria-label="Go to page" />' +
            '<span class="binder-page-total"> / ' +
            totalPages +
            '</span>' +
            '</span>' +
            '<button type="button" class="binder-page-btn" data-dir="next"' +
            nextDisabled +
            ' aria-label="Next page">' +
            SVG_RIGHT +
            '</button>' +
            '</nav>'
        );
    }

    function render(state, options) {
        options = options || {};
        var cards = state.cards || [];
        var totalPages = state.totalPages || 0;
        var currentPage = state.page || 1;
        var setCode = state.setCode || '';

        if (!cards.length) {
            var msg = state.ownedOnly ? 'No owned cards in this set' : 'No cards in this set';
            return '<div class="text-center py-16 text-gray-500">' + escapeHtml(msg) + '</div>';
        }

        var quantityMap = state.quantityMap || {};

        var showOwnedAttr = options.showOwnedState ? ' data-show-owned-state="true"' : '';
        var html = '<div class="binder-wrapper"' + showOwnedAttr + '>';

        // Left side arrow
        if (totalPages > 1) {
            var prevDisabled = currentPage <= 1 ? ' disabled' : '';
            html +=
                '<button type="button" class="binder-side-btn binder-side-btn--left" data-dir="prev"' +
                prevDisabled +
                ' aria-label="Previous page">' +
                SVG_LEFT +
                '</button>';
        }

        // Card grid with animation class
        var animClass = '';
        if (state.direction === 'right') animClass = ' binder-grid--enter-right';
        else if (state.direction === 'left') animClass = ' binder-grid--enter-left';

        html += '<div class="binder-grid' + animClass + '">';
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var qty = quantityMap[card.id] || { normalQuantity: 0, foilQuantity: 0 };
            html += renderCard(card, qty, setCode, options);
        }
        html += '</div>';

        // Right side arrow
        if (totalPages > 1) {
            var nextDisabled = currentPage >= totalPages ? ' disabled' : '';
            html +=
                '<button type="button" class="binder-side-btn binder-side-btn--right" data-dir="next"' +
                nextDisabled +
                ' aria-label="Next page">' +
                SVG_RIGHT +
                '</button>';
        }

        html += '</div>'; // close binder-wrapper

        // Bottom nav
        if (totalPages > 1) {
            html += renderNav(currentPage, totalPages, options.navInputId || 'binder-page-input');
        }

        return html;
    }

    window.BinderRenderer = {
        render: render,
        renderCard: renderCard,
        renderNav: renderNav,
    };
})();
