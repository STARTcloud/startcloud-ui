import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const stubOf = page => page.locator('.card .alert-info');

Then('the route draws the not-available stub', async ({ page }) => {
  await expect(stubOf(page)).toBeVisible();
});

Then('the route draws no not-available stub', async ({ page }) => {
  await expect(stubOf(page)).toHaveCount(0);
});
