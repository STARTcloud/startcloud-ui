import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const cardOf = page => page.locator('#hyperweaver-service');

const fieldOf = (page, field) => cardOf(page).locator(`[data-field="${field}"]`);

const targetsOf = page => cardOf(page).locator('[data-tiles$="/deploy_target"]');

When('I type {string} into the Hyperweaver field {string}', async ({ page }, text, field) => {
  await fieldOf(page, field).fill(text);
});

When("I press the Hyperweaver card's {string} action", async ({ page }, action) => {
  await cardOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I pick the Hyperweaver deploy target {string}', async ({ page }, value) => {
  await targetsOf(page).locator(`label:has(input[data-value="${value}"])`).click();
});

When('I follow the link to {string}', async ({ page }, pathname) => {
  await page.locator(`a[href="${pathname}"]`).first().click();
});

Then('the Hyperweaver card draws', async ({ page }) => {
  await expect(cardOf(page)).toBeVisible();
});

Then('no Hyperweaver card draws', async ({ page }) => {
  await expect(page.locator('.tab-content .card').first()).toBeVisible();
  await expect(cardOf(page)).toHaveCount(0);
});

Then('the Hyperweaver servers list {int} rows', async ({ page }, count) => {
  await expect(cardOf(page).locator('[data-action="save"], .pref-empty').first()).toBeVisible();
  await expect(cardOf(page).locator('[data-row="server"]')).toHaveCount(count);
});

Then('the Hyperweaver server {string} is the default', async ({ page }, text) => {
  await expect(
    cardOf(page)
      .locator('[data-row="server"]')
      .filter({ hasText: text })
      .locator('[data-badge="server-default"]')
  ).toBeVisible();
});

Then('the Hyperweaver deploy target reads {string}', async ({ page }, value) => {
  await expect(targetsOf(page).locator('input:checked')).toHaveAttribute('data-value', value);
});

Then('the Hyperweaver field {string} is invalid', async ({ page }, field) => {
  await expect(fieldOf(page, field)).toHaveAttribute('aria-invalid', 'true');
});

Then('the sidebar draws no row to {string}', async ({ page }, pathname) => {
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator(`.sidebar a[href="${pathname}"]`)).toHaveCount(0);
});
