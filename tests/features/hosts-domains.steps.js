import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const fieldOf = (page, id) => page.locator(`[id="${id}"]`);

Then('the page field {string} reads {string}', async ({ page }, id, value) => {
  await expect(fieldOf(page, id)).toHaveValue(value);
});

Then('the page field {string} is marked invalid', async ({ page }, id) => {
  await expect(fieldOf(page, id)).toHaveAttribute('aria-invalid', 'true');
});

Then('the page draws no field {string}', async ({ page }, id) => {
  await expect(page.locator('.tab-content')).toBeVisible();
  await expect(fieldOf(page, id)).toHaveCount(0);
});
