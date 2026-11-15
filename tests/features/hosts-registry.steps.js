import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const registryForm = page => page.locator('[data-form="server-add"]');

const statusOf = page => registryForm(page).locator('[data-note^="test-"]');

Then('the connection status reads {string}', async ({ page }, state) => {
  await expect(registryForm(page).locator(`[data-note="test-${state}"]`)).toBeVisible();
});

Then('the hosts page draws no connection status', async ({ page }) => {
  await expect(registryForm(page)).toBeVisible();
  await expect(statusOf(page)).toHaveCount(0);
});

When('I flip the self-signed switch of the host {string}', async ({ page }, label) => {
  await page
    .locator('[data-page="hosts"] tbody tr')
    .filter({ hasText: label })
    .locator('input[role="switch"]')
    .click();
});
