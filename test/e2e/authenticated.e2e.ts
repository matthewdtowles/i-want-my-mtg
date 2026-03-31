import { test, expect } from './fixtures/auth.fixture';

test.describe('Set detail (authenticated)', () => {
    test('shows collection action card', async ({ authedPage: page }) => {
        await page.goto('/sets');
        const setHref = (await page.locator('.table-row a').first().getAttribute('href'))!;
        await page.goto(setHref);
        await expect(page.locator('h1')).toBeVisible();
        // Authenticated users see the "Add All Cards" form
        await expect(page.locator('button:has-text("Add All")')).toBeVisible();
        await expect(page.locator('button:has-text("Add All")')).toBeEnabled();
    });

    test('shows My Binder link', async ({ authedPage: page }) => {
        await page.goto('/sets');
        const setHref = (await page.locator('.table-row a').first().getAttribute('href'))!;
        const setCode = setHref.split('/').pop()!;
        await page.goto(setHref);
        await expect(page.locator(`a[href="/inventory/sets/${setCode}"]`)).toBeVisible();
    });
});

test.describe('Inventory page (authenticated)', () => {
    test('renders inventory page', async ({ authedPage: page }) => {
        await page.goto('/inventory');
        await expect(page).toHaveURL('/inventory');
        // Page shows inventory content or empty state - either way, main content is visible
        await expect(page.locator('main').locator('h1, h3').first()).toBeVisible();
    });

    test('shows import action', async ({ authedPage: page }) => {
        await page.goto('/inventory');
        // Import guide link is always present (in empty state and in header when populated)
        await expect(
            page.locator('a[href="/inventory/import-export-guide"], a[href="/inventory/export"]').first()
        ).toBeVisible();
    });

    test('shows transactions nav link', async ({ authedPage: page }) => {
        await page.goto('/inventory');
        await expect(page.locator('a[href="/transactions"]').first()).toBeVisible();
    });
});

test.describe('Inventory binder (authenticated)', () => {
    test('renders binder for first set', async ({ authedPage: page }) => {
        await page.goto('/sets');
        const setHref = (await page.locator('.table-row a').first().getAttribute('href'))!;
        const setCode = setHref.split('/').pop()!;
        await page.goto(`/inventory/sets/${setCode}`);
        await expect(page.locator('h1')).toContainText('Binder');
        await expect(page.locator('#inventory-binder')).toBeVisible();
    });

    test('shows owned-only toggle', async ({ authedPage: page }) => {
        await page.goto('/sets');
        const setHref = (await page.locator('.table-row a').first().getAttribute('href'))!;
        const setCode = setHref.split('/').pop()!;
        await page.goto(`/inventory/sets/${setCode}`);
        await expect(page.locator('#owned-only-toggle')).toBeAttached();
    });
});

test.describe('Portfolio page (authenticated)', () => {
    test('renders portfolio page', async ({ authedPage: page }) => {
        await page.goto('/portfolio');
        await expect(page).toHaveURL('/portfolio');
        // Page shows portfolio content or empty state
        await expect(page.locator('main').locator('h1, h3').first()).toBeVisible();
    });
});

test.describe('Transactions page (authenticated)', () => {
    test('renders transactions page', async ({ authedPage: page }) => {
        await page.goto('/transactions');
        await expect(page).toHaveURL('/transactions');
        // Page shows transactions list or empty state
        await expect(page.locator('main').locator('h1, h3').first()).toBeVisible();
    });
});

test.describe('Search (authenticated)', () => {
    test('submit search from form', async ({ authedPage: page }) => {
        await page.goto('/search');
        await page.locator('main input[name="q"]').fill('Angel');
        await page.locator('button:has-text("Search")').click();
        await page.waitForURL(/\/search\?q=Angel/);
        await expect(
            page.locator('#search-cards-section, #search-sets-section').first()
        ).toBeVisible();
    });
});
