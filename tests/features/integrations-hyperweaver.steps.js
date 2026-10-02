import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const cardOf = page => page.locator('#hyperweaver-service');

const fieldOf = (page, field) => cardOf(page).locator(`[data-field="${field}"]`);

When('I type {string} into the Hyperweaver field {string}', async ({ page }, text, field) => {
  await fieldOf(page, field).fill(text);
});

When("I press the Hyperweaver card's {string} action", async ({ page }, action) => {
  await cardOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I pick the Hyperweaver deploy target {string}', async ({ page }, value) => {
  await fieldOf(page, 'deploy-target').selectOption(value);
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

Then('the Hyperweaver servers table lists {int} rows', async ({ page }, count) => {
  await expect(cardOf(page).locator('tbody tr')).toHaveCount(count);
});

Then('the Hyperweaver deploy target reads {string}', async ({ page }, value) => {
  await expect(fieldOf(page, 'deploy-target')).toHaveValue(value);
});

Then('the Hyperweaver field {string} is invalid', async ({ page }, field) => {
  await expect(fieldOf(page, field)).toHaveAttribute('aria-invalid', 'true');
});

Then('the sidebar draws no row to {string}', async ({ page }, pathname) => {
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator(`.sidebar a[href="${pathname}"]`)).toHaveCount(0);
});
