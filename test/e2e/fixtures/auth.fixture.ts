import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { test as base, expect, Page } from '@playwright/test';

const TEST_USER = {
    email: 'integ@test.com',
    password: 'TestPass1!',
};

const AUTH_STATE_PATH = 'test/e2e/.auth/user.json';

/**
 * Log in via the login form and save browser storage state for reuse.
 * This runs once as a setup project (see global-setup.ts).
 */
export async function authenticateAndSave(page: Page): Promise<void> {
    await page.goto('/auth/login');
    await page.locator('#user-email').fill(TEST_USER.email);
    await page.locator('#user-password').fill(TEST_USER.password);
    await page.locator('#login-btn').click();
    await page.waitForURL('/user');
    mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true });
    await page.context().storageState({ path: AUTH_STATE_PATH });
}

/**
 * Extend the base test with an `authedPage` fixture that uses
 * the saved storage state — no login needed per test.
 */
export const test = base.extend<{ authedPage: Page }>({
    authedPage: async ({ browser }, use) => {
        const context = await browser.newContext({
            storageState: AUTH_STATE_PATH,
        });
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

export { expect, TEST_USER, AUTH_STATE_PATH };
