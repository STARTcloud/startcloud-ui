import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="manage"]');

Then('the manage page draws no {string} panel', async ({ page }, name) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toHaveCount(0);
});
