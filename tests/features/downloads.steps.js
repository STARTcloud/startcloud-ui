import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

When('I fill the control {string} with {string}', async ({ page }, id, value) => {
  await page.locator(`[id="${id}"]`).fill(value);
});

When('I press the {string} action', async ({ page }, action) => {
  await page.locator(`[data-action="${action}"]`).click();
});

Then('the control {string} holds {string}', async ({ page }, id, value) => {
  await expect(page.locator(`[id="${id}"]`)).toHaveValue(value);
});
