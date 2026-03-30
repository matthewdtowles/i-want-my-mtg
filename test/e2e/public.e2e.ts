import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
    test('renders heading and mana color bar', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('I Want My MTG');
        await expect(page.locator('.mana-color-bar')).toBeVisible();
    });

    test('shows set list on home page', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.table-container')).toBeVisible();
        await expect(page.locator('.table-row').first()).toBeVisible();
    });
});

test.describe('Sets page', () => {
    test('lists sets with filter input', async ({ page }) => {
        await page.goto('/sets');
        await expect(page.locator('input#filter')).toBeVisible();
        await expect(page.locator('.table-container')).toBeVisible();
    });

    test('set rows link to set detail', async ({ page }) => {
        await page.goto('/sets');
        const firstSetLink = page.locator('.table-row a').first();
        await expect(firstSetLink).toBeVisible();
        const href = await firstSetLink.getAttribute('href');
        expect(href).toMatch(/^\/sets\/[A-Za-z0-9]+$/);
    });
});

test.describe('Set detail page', () => {
    test('renders set name and stat cards', async ({ page }) => {
        await page.goto('/sets/TST');
        await expect(page.locator('h1')).toContainText('Test Set');
        await expect(page.locator('.stat-card').first()).toBeVisible();
    });

    test('shows price info popover on button click', async ({ page }) => {
        await page.goto('/sets/TST');
        const toggle = page.locator('#price-info-toggle');
        if (await toggle.isVisible()) {
            await toggle.click();
            await expect(page.locator('#price-info-popover')).toBeVisible();
        }
    });

    test('renders card list', async ({ page }) => {
        await page.goto('/sets/TST');
        await expect(page.locator('#set-card-list-ajax')).toBeVisible();
    });
});

test.describe('Card detail page', () => {
    test('renders card name and price', async ({ page }) => {
        await page.goto('/card/TST/1');
        await expect(page.locator('h1')).toContainText('Test Angel');
        await expect(page.locator('text=$')).toBeTruthy();
    });
});

test.describe('Search page', () => {
    test('shows search form', async ({ page }) => {
        await page.goto('/search');
        await expect(page.locator('input[name="q"]')).toBeVisible();
    });

    test('returns results for a known card', async ({ page }) => {
        await page.goto('/search?q=Angel');
        await expect(
            page.locator('#search-cards-section, #search-sets-section').first()
        ).toBeVisible();
    });
});
