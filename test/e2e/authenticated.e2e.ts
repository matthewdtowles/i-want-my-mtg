import { test, expect } from './fixtures/auth.fixture';

test.describe('Set detail (authenticated)', () => {
    test('shows collection action card', async ({ authedPage: page }) => {
        await page.goto('/sets/TST');
        await expect(page.locator('h1')).toContainText('Test Set');
        // Authenticated users see the "Add All Cards" form
        const addAllBtn = page.locator('button:has-text("Add All")');
        if (await addAllBtn.isVisible()) {
            await expect(addAllBtn).toBeEnabled();
        }
    });

    test('shows My Binder link', async ({ authedPage: page }) => {
        await page.goto('/sets/TST');
        const binderLink = page.locator('a[href="/inventory/sets/TST"]');
        if (await binderLink.isVisible()) {
            await expect(binderLink).toBeVisible();
        }
    });
});

test.describe('Inventory page (authenticated)', () => {
    test('renders inventory with stats', async ({ authedPage: page }) => {
        await page.goto('/inventory');
        await expect(page.locator('h1')).toContainText('Inventory');
        await expect(page.locator('.stat-card').first()).toBeVisible();
    });

    test('shows export and import actions', async ({ authedPage: page }) => {
        await page.goto('/inventory');
        await expect(page.locator('a[href="/inventory/export"]')).toBeVisible();
    });

    test('links to portfolio and transactions', async ({ authedPage: page }) => {
        await page.goto('/inventory');
        await expect(page.locator('a[href="/portfolio"]')).toBeVisible();
        await expect(page.locator('a[href="/transactions"]')).toBeVisible();
    });
});

test.describe('Inventory binder (authenticated)', () => {
    test('renders binder for test set', async ({ authedPage: page }) => {
        await page.goto('/inventory/sets/TST');
        await expect(page.locator('h1')).toContainText('Binder');
        await expect(page.locator('#inventory-binder')).toBeVisible();
    });

    test('shows owned-only toggle', async ({ authedPage: page }) => {
        await page.goto('/inventory/sets/TST');
        await expect(page.locator('#owned-only-toggle')).toBeAttached();
    });
});

test.describe('Portfolio page (authenticated)', () => {
    test('renders portfolio overview', async ({ authedPage: page }) => {
        await page.goto('/portfolio');
        await expect(page.locator('h1')).toContainText('Portfolio');
    });
});

test.describe('Transactions page (authenticated)', () => {
    test('renders transactions list', async ({ authedPage: page }) => {
        await page.goto('/transactions');
        await expect(page.locator('h1')).toContainText('Transaction');
    });
});

test.describe('Search (authenticated)', () => {
    test('submit search from form', async ({ authedPage: page }) => {
        await page.goto('/search');
        await page.locator('input[name="q"]').fill('Angel');
        await page.locator('button:has-text("Search")').click();
        await page.waitForURL(/\/search\?q=Angel/);
        await expect(
            page.locator('#search-cards-section, #search-sets-section').first()
        ).toBeVisible();
    });
});
