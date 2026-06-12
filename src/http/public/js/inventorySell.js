// Market sell value page (6.4): recompute the headline total, per-vendor
// subtotals, and selected count as items are toggled. The checkboxes are the
// export form's inputs, so the CSV always matches the visible selection.
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sell-export-form');
    if (!form) return;

    const totalEl = document.getElementById('sell-total');
    const selectedCountEl = document.getElementById('sell-selected-count');
    const exportBtn = document.getElementById('sell-export-btn');

    const toDollar = (amount) => {
        const rounded = (Math.round(amount * 100) / 100).toFixed(2);
        return '$' + rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const recompute = () => {
        let total = 0;
        let selected = 0;
        form.querySelectorAll('[data-vendor-group]').forEach((group) => {
            let subtotal = 0;
            group.querySelectorAll('[data-sell-row]').forEach((row) => {
                const checkbox = row.querySelector('.sell-item-toggle');
                if (checkbox && checkbox.checked) {
                    subtotal += Number(row.dataset.payout) || 0;
                    selected++;
                }
            });
            const subtotalEl = group.querySelector('[data-group-subtotal]');
            if (subtotalEl) subtotalEl.textContent = toDollar(subtotal);
            const groupToggle = group.querySelector('.sell-group-toggle');
            if (groupToggle) {
                const boxes = group.querySelectorAll('.sell-item-toggle');
                const checked = group.querySelectorAll('.sell-item-toggle:checked');
                groupToggle.checked = checked.length === boxes.length;
                groupToggle.indeterminate = checked.length > 0 && checked.length < boxes.length;
            }
            total += subtotal;
        });
        if (totalEl) totalEl.textContent = toDollar(total);
        if (selectedCountEl) selectedCountEl.textContent = String(selected);
        if (exportBtn) exportBtn.disabled = selected === 0;
    };

    form.addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('sell-group-toggle')) {
            const group = target.closest('[data-vendor-group]');
            group.querySelectorAll('.sell-item-toggle').forEach((box) => {
                box.checked = target.checked;
            });
        }
        if (
            target.classList.contains('sell-group-toggle') ||
            target.classList.contains('sell-item-toggle')
        ) {
            recompute();
        }
    });

    recompute();
});
