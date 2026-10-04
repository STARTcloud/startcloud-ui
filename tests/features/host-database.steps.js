import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"][data-section="database"]');

Then('the database page draws its totals', async ({ page }) => {
  await expect(frameOf(page).locator('[data-note="database-totals"]')).toBeVisible();
});
