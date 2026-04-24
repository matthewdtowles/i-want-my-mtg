import { test, expect } from '@playwright/test';

const TEST_USER = {
    email: 'integ@test.com',
    password: 'TestPass1!',
};

test.describe('Login flow', () => {
    test('shows login form', async ({ page }) => {
        await page.goto('/auth/login');
        await expect(page.locator('#login-form')).toBeVisible();
        await expect(page.locator('#user-email')).toBeVisible();
        await expect(page.locator('#user-password')).toBeVisible();
        await expect(page.locator('#login-btn')).toBeVisible();
    });

    test('successful login redirects to user page', async ({ page }) => {
        await page.goto('/auth/login');
        await page.locator('#user-email').fill(TEST_USER.email);
        await page.locator('#user-password').fill(TEST_USER.password);
        await page.locator('#login-btn').click();
        await page.waitForURL('/user');
        expect(page.url()).toMatch(/\/user$/);
    });

    test('failed login shows error', async ({ page }) => {
        await page.goto('/auth/login');
        await page.locator('#user-email').fill(TEST_USER.email);
        await page.locator('#user-password').fill('WrongPassword1!');
        await page.locator('#login-btn').click();
        // Should stay on login page or show an error
        await expect(page.locator('#user-email')).toBeVisible();
    });

    test('forgot password link is visible', async ({ page }) => {
        await page.goto('/auth/login');
        const forgotLink = page.locator('a[href="/auth/forgot-password"]');
        await expect(forgotLink).toBeVisible();
    });
});

test.describe('Logout flow', () => {
    test('logout clears session and redirects', async ({ page }) => {
        // First log in
        await page.goto('/auth/login');
        await page.locator('#user-email').fill(TEST_USER.email);
        await page.locator('#user-password').fill(TEST_USER.password);
        await page.locator('#login-btn').click();
        await page.waitForURL('/user');

        // Then log out (POST, matches the form in the navbar)
        const logoutResponse = await page.request.post('/auth/logout');
        expect(logoutResponse.ok() || logoutResponse.status() === 302).toBeTruthy();

        // Accessing an authenticated page should be denied - nav shows Sign In
        await page.goto('/inventory');
        await expect(page.locator('a[href^="/auth/login"]').first()).toBeVisible();
    });
});
