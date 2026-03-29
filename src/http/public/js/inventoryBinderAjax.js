document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('inventory-binder');
    if (!container) return;

    var setCode = container.dataset.setCode;
    var BINDER_LIMIT = window.matchMedia('(min-width: 640px)').matches ? 9 : 6;

    var machine = BinderCore.create({
        containerEl: container,
        resultsEl: container,
        setCode: setCode,
        authenticated: true,
        apiPath: '/api/v1/sets/' + encodeURIComponent(setCode) + '/cards',
        limit: BINDER_LIMIT,
        fetchInventory: true,
        hasOwnedOnly: true,
        showOwnedState: true,
        navInputId: 'binder-page-input',
    });

    // Owned-only toggle
    var ownedOnlyToggle = document.getElementById('owned-only-toggle');
    if (ownedOnlyToggle) {
        ownedOnlyToggle.addEventListener('change', function () {
            machine.setOwnedOnly(this.checked);
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT'
        )
            return;
        var state = machine.getState();
        if (e.key === 'ArrowLeft' && state.page > 1) {
            e.preventDefault();
            machine.navigate(state.page - 1, 'left');
        } else if (e.key === 'ArrowRight' && state.page < state.totalPages) {
            e.preventDefault();
            machine.navigate(state.page + 1, 'right');
        }
    });

    // Listen for inventory updates from updateInventory.js
    AppState.on('inventory:updated', function (e) {
        var d = e.detail;
        machine.patchQuantity(d.cardId, d.isFoil, d.quantity);
    });

    // Initial load
    machine.navigate(1, null);
});
