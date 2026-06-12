/**
 * @jest-environment jsdom
 */

beforeEach(function () {
    jest.resetModules();
});

function sellRow(key, payout, checked) {
    return (
        '<tr data-sell-row data-payout="' +
        payout +
        '">' +
        '<td><input type="checkbox" name="keys" value="' +
        key +
        '" class="sell-item-toggle"' +
        (checked === false ? '' : ' checked') +
        ' /></td>' +
        '</tr>'
    );
}

function vendorGroup(rowsHtml) {
    return (
        '<section data-vendor-group>' +
        '<input type="checkbox" class="sell-group-toggle" checked />' +
        '<span data-group-subtotal></span>' +
        '<table><tbody>' +
        rowsHtml +
        '</tbody></table>' +
        '</section>'
    );
}

function setupDom(groupsHtml) {
    document.body.innerHTML =
        '<span id="sell-total"></span>' +
        '<span id="sell-selected-count"></span>' +
        '<form id="sell-export-form" method="POST" action="/inventory/sell/export">' +
        groupsHtml +
        '<button type="submit" id="sell-export-btn">Export</button>' +
        '</form>';
}

function loadScript() {
    require('../../src/http/public/js/inventorySell.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

function changeCheckbox(checkbox, checked) {
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('inventorySell', function () {
    test('computes totals and counts on load', function () {
        setupDom(vendorGroup(sellRow('a:n', 10) + sellRow('b:f', 2.5)));
        loadScript();

        expect(document.getElementById('sell-total').textContent).toBe('$12.50');
        expect(document.getElementById('sell-selected-count').textContent).toBe('2');
        expect(document.querySelector('[data-group-subtotal]').textContent).toBe('$12.50');
        expect(document.getElementById('sell-export-btn').disabled).toBe(false);
    });

    test('unchecking an item updates totals and marks group indeterminate', function () {
        setupDom(vendorGroup(sellRow('a:n', 10) + sellRow('b:f', 2.5)));
        loadScript();

        changeCheckbox(document.querySelector('input[value="b:f"]'), false);

        expect(document.getElementById('sell-total').textContent).toBe('$10.00');
        expect(document.getElementById('sell-selected-count').textContent).toBe('1');
        var groupToggle = document.querySelector('.sell-group-toggle');
        expect(groupToggle.checked).toBe(false);
        expect(groupToggle.indeterminate).toBe(true);
    });

    test('group toggle selects and deselects all items in the group', function () {
        setupDom(vendorGroup(sellRow('a:n', 10) + sellRow('b:f', 2.5)));
        loadScript();

        changeCheckbox(document.querySelector('.sell-group-toggle'), false);

        expect(document.getElementById('sell-total').textContent).toBe('$0.00');
        expect(document.getElementById('sell-selected-count').textContent).toBe('0');
        expect(document.getElementById('sell-export-btn').disabled).toBe(true);
        document.querySelectorAll('.sell-item-toggle').forEach(function (box) {
            expect(box.checked).toBe(false);
        });

        changeCheckbox(document.querySelector('.sell-group-toggle'), true);
        expect(document.getElementById('sell-total').textContent).toBe('$12.50');
    });

    test('sums across multiple vendor groups with thousands separators', function () {
        setupDom(vendorGroup(sellRow('a:n', 1000)) + vendorGroup(sellRow('b:n', 500.5)));
        loadScript();

        expect(document.getElementById('sell-total').textContent).toBe('$1,500.50');
        var subtotals = document.querySelectorAll('[data-group-subtotal]');
        expect(subtotals[0].textContent).toBe('$1,000.00');
        expect(subtotals[1].textContent).toBe('$500.50');
    });
});
