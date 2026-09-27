import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

Then('the sidebar foot holds the account menu', async ({ page }) => {
  await expect(page.locator('.sidebar-foot .user-menu')).toBeVisible();
});
