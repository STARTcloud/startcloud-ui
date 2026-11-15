import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const statOf = (page, key) => page.locator(`[data-stat="${key}"]`);

const actionOf = (page, action) => page.locator(`[data-action="${action}"]`);

Then('the stat {string} counts {string}', async ({ page }, key, count) => {
  await expect(statOf(page, key)).toHaveAttribute('data-count', count);
});

Then('the page draws no stat {string}', async ({ page }, key) => {
  await expect(page.locator('.section-heading').first()).toBeVisible();
  await expect(statOf(page, key)).toHaveCount(0);
});

Then('the page offers the {string} action', async ({ page }, action) => {
  await expect(actionOf(page, action).first()).toBeVisible();
});

Then('the page offers no {string} action', async ({ page }, action) => {
  await expect(page.locator('.tab-content')).toBeVisible();
  await expect(actionOf(page, action)).toHaveCount(0);
});

Then('the page field {string} is not marked invalid', async ({ page }, id) => {
  await expect(page.locator(`[id="${id}"]`)).not.toHaveAttribute('aria-invalid', 'true');
});
