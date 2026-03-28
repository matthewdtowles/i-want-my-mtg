/**
 * @jest-environment jsdom
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

// Mock AjaxUtils.createStepperGroup since it requires DOM template cloning
window.AjaxUtils = {
    createStepperGroup: function (cardId, normalQty, foilQty, hasNormal, hasFoil, opts) {
        return '<div class="inv-stepper-group" data-mock="true"></div>';
    },
};

// Load AppState (dependency)
require('../../src/http/public/js/appState.js');

beforeEach(function () {
    jest.resetModules();
    delete window.BinderRenderer;
});

function loadRenderer() {
    require('../../src/http/public/js/binderRenderer.js');
    return window.BinderRenderer;
}

describe('BinderRenderer', function () {

    describe('renderCard', function () {
        var card = {
            id: 'card-123',
            name: 'Lightning Bolt',
            number: '141',
            imgSrc: 'a/b/c.jpg',
            hasFoil: true,
            hasNonFoil: true,
        };

        it('should render a binder card with correct structure', function () {
            var R = loadRenderer();
            var qty = { normalQuantity: 2, foilQuantity: 0 };
            var html = R.renderCard(card, qty, 'lea', { authenticated: true, showOwnedState: true });
            expect(html).toContain('class="binder-card binder-card-owned"');
            expect(html).toContain('data-card-id="card-123"');
            expect(html).toContain('href="/card/lea/141"');
            expect(html).toContain('alt="Lightning Bolt"');
            expect(html).toContain('binder-card-number');
            expect(html).toContain('#141');
        });

        it('should mark unowned cards correctly', function () {
            var R = loadRenderer();
            var qty = { normalQuantity: 0, foilQuantity: 0 };
            var html = R.renderCard(card, qty, 'lea', { authenticated: true, showOwnedState: true });
            expect(html).toContain('binder-card-unowned');
            expect(html).not.toContain('binder-card-owned');
        });

        it('should not add owned/unowned classes when showOwnedState is false', function () {
            var R = loadRenderer();
            var qty = { normalQuantity: 0, foilQuantity: 0 };
            var html = R.renderCard(card, qty, 'lea', { authenticated: true, showOwnedState: false });
            expect(html).not.toContain('binder-card-owned');
            expect(html).not.toContain('binder-card-unowned');
        });

        it('should include stepper when authenticated', function () {
            var R = loadRenderer();
            var qty = { normalQuantity: 0, foilQuantity: 0 };
            var html = R.renderCard(card, qty, 'lea', { authenticated: true, showOwnedState: false });
            expect(html).toContain('binder-card-stepper');
            expect(html).toContain('inv-stepper-group');
        });

        it('should not include stepper when not authenticated', function () {
            var R = loadRenderer();
            var qty = { normalQuantity: 0, foilQuantity: 0 };
            var html = R.renderCard(card, qty, 'lea', { authenticated: false, showOwnedState: false });
            expect(html).not.toContain('binder-card-stepper');
        });

        it('should escape card name for XSS prevention', function () {
            var R = loadRenderer();
            var xssCard = Object.assign({}, card, { name: '<script>alert("xss")</script>' });
            var qty = { normalQuantity: 0, foilQuantity: 0 };
            var html = R.renderCard(xssCard, qty, 'lea', { authenticated: false });
            expect(html).not.toContain('<script>');
            expect(html).toContain('&lt;script&gt;');
        });

        it('should include image with lazy loading and explicit dimensions', function () {
            var R = loadRenderer();
            var qty = { normalQuantity: 0, foilQuantity: 0 };
            var html = R.renderCard(card, qty, 'lea', { authenticated: false });
            expect(html).toContain('loading="lazy"');
            expect(html).toContain('width="488"');
            expect(html).toContain('height="680"');
        });
    });

    describe('renderNav', function () {
        it('should render bottom navigation with prev/next buttons', function () {
            var R = loadRenderer();
            var html = R.renderNav(2, 5, 'binder-page-input');
            expect(html).toContain('class="binder-page-nav"');
            expect(html).toContain('data-total-pages="5"');
            expect(html).toContain('value="2"');
            expect(html).toContain('max="5"');
        });

        it('should disable prev button on first page', function () {
            var R = loadRenderer();
            var html = R.renderNav(1, 5, 'binder-page-input');
            // The prev button should be disabled
            var prevMatch = html.match(/data-dir="prev"[^>]*/);
            expect(prevMatch[0]).toContain('disabled');
        });

        it('should disable next button on last page', function () {
            var R = loadRenderer();
            var html = R.renderNav(5, 5, 'binder-page-input');
            var nextMatch = html.match(/data-dir="next"[^>]*/);
            expect(nextMatch[0]).toContain('disabled');
        });

        it('should return empty string for single page', function () {
            var R = loadRenderer();
            var html = R.renderNav(1, 1, 'binder-page-input');
            expect(html).toBe('');
        });
    });

    describe('render', function () {
        var baseState = {
            page: 1,
            totalPages: 3,
            setCode: 'mkm',
            direction: null,
            cards: [
                { id: 'c1', name: 'Card One', number: '1', imgSrc: 'a/b/1.jpg', hasFoil: false, hasNonFoil: true },
                { id: 'c2', name: 'Card Two', number: '2', imgSrc: 'a/b/2.jpg', hasFoil: true, hasNonFoil: true },
            ],
            quantityMap: {
                c1: { normalQuantity: 1, foilQuantity: 0 },
                c2: { normalQuantity: 0, foilQuantity: 0 },
            },
        };

        it('should render full binder with wrapper, grid, and nav', function () {
            var R = loadRenderer();
            var html = R.render(baseState, { authenticated: true, showOwnedState: true });
            expect(html).toContain('binder-wrapper');
            expect(html).toContain('binder-grid');
            expect(html).toContain('binder-page-nav');
        });

        it('should include side arrow buttons when multiple pages', function () {
            var R = loadRenderer();
            var html = R.render(baseState, { authenticated: true, showOwnedState: true });
            expect(html).toContain('binder-side-btn--left');
            expect(html).toContain('binder-side-btn--right');
        });

        it('should not include side arrows for single page', function () {
            var R = loadRenderer();
            var state = Object.assign({}, baseState, { totalPages: 1 });
            var html = R.render(state, { authenticated: false });
            expect(html).not.toContain('binder-side-btn');
        });

        it('should apply enter-right animation class', function () {
            var R = loadRenderer();
            var state = Object.assign({}, baseState, { direction: 'right' });
            var html = R.render(state, { authenticated: false });
            expect(html).toContain('binder-grid--enter-right');
        });

        it('should apply enter-left animation class', function () {
            var R = loadRenderer();
            var state = Object.assign({}, baseState, { direction: 'left' });
            var html = R.render(state, { authenticated: false });
            expect(html).toContain('binder-grid--enter-left');
        });

        it('should disable prev side button on first page', function () {
            var R = loadRenderer();
            var html = R.render(baseState, { authenticated: false });
            var leftBtn = html.match(/binder-side-btn--left"[^>]*/);
            expect(leftBtn[0]).toContain('disabled');
        });

        it('should disable next side button on last page', function () {
            var R = loadRenderer();
            var state = Object.assign({}, baseState, { page: 3 });
            var html = R.render(state, { authenticated: false });
            var rightBtn = html.match(/binder-side-btn--right"[^>]*/);
            expect(rightBtn[0]).toContain('disabled');
        });

        it('should render empty state when no cards', function () {
            var R = loadRenderer();
            var state = Object.assign({}, baseState, { cards: [], totalPages: 0 });
            var html = R.render(state, { authenticated: false });
            expect(html).toContain('No cards');
        });

        it('should render each card in the grid', function () {
            var R = loadRenderer();
            var html = R.render(baseState, { authenticated: true, showOwnedState: true });
            expect(html).toContain('data-card-id="c1"');
            expect(html).toContain('data-card-id="c2"');
        });

        it('should render owned state message for ownedOnly empty state', function () {
            var R = loadRenderer();
            var state = Object.assign({}, baseState, { cards: [], totalPages: 0, ownedOnly: true });
            var html = R.render(state, { authenticated: true, showOwnedState: true });
            expect(html).toContain('No owned cards');
        });

        it('should use navInputId from options instead of default', function () {
            var R = loadRenderer();
            var html = R.render(baseState, { authenticated: false, navInputId: 'set-binder-page-input' });
            expect(html).toContain('id="set-binder-page-input"');
            expect(html).not.toContain('id="binder-page-input"');
        });

        it('should fall back to default binder-page-input when navInputId not provided', function () {
            var R = loadRenderer();
            var html = R.render(baseState, { authenticated: false });
            expect(html).toContain('id="binder-page-input"');
        });
    });
});
