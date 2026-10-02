import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const managerOf = page => page.locator('[data-page="manage"] [data-panel="file-manager"]');

Then('the file manager draws the path {string}', async ({ page }, path) => {
  await expect(managerOf(page)).toHaveAttribute('data-path', path);
});

Then('the file manager holds {string} back', async ({ page }, action) => {
  await expect(managerOf(page).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the file manager offers no {string}', async ({ page }, action) => {
  await expect(managerOf(page)).toBeVisible();
  await expect(managerOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});
