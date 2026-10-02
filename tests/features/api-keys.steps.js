import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const tableOf = page => page.locator('[data-panel="api-keys"] table');

const rowOf = (page, name) => tableOf(page).locator('tbody tr').filter({ hasText: name }).first();

When('I press {string} on the api key row {string}', async ({ page }, action, name) => {
  await rowOf(page, name).locator(`[data-action="${action}"]`).click();
});

Then('the api keys table lists {int} rows', async ({ page }, count) => {
  await expect(tableOf(page)).toBeVisible();
  await expect(tableOf(page).locator('tbody tr')).toHaveCount(count);
});

Then('the api key row {string} reads {string}', async ({ page }, name, text) => {
  await expect(rowOf(page, name).locator('.badge')).toHaveText(text);
});
