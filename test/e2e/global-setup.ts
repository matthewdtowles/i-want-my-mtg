import { test as setup } from '@playwright/test';
import { authenticateAndSave, AUTH_STATE_PATH } from './fixtures/auth.fixture';

setup('authenticate test user', async ({ page }) => {
    await authenticateAndSave(page);
});
