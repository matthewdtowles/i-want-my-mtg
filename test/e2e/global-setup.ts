import { test as setup } from '@playwright/test';
import { authenticateAndSave } from './fixtures/auth.fixture';

setup('authenticate test user', async ({ page }) => {
    await authenticateAndSave(page);
});
