import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="manage"]');

const tableOf = (page, name) => frameOf(page).locator(`[data-table="${name}"]`);

const rowOf = (page, name, text) =>
  tableOf(page, name).locator('tbody tr').filter({ hasText: text }).first();

const dialogOf = page => page.getByRole('dialog').last();

const namedDialogOf = (page, name) => page.locator(`[data-dialog="${name}"]`);

const locationOf = (page, id) => frameOf(page).locator(`[data-location="${id}"]`);

const sourceOf = (page, name) => frameOf(page).locator(`[data-source="${name}"]`);

When('I submit the catalog dialog {string}', async ({ page }, name) => {
  await namedDialogOf(page, name).locator('[data-action="submit"]').click();
});

When('I pick {string} in the catalog dialog select {string}', async ({ page }, value, id) => {
  await dialogOf(page).locator(`[id="${id}"]`).selectOption(value);
});

When('I check the manage switch {string}', async ({ page }, id) => {
  await frameOf(page).locator(`[id="${id}"]`).check();
});

When(
  'I press the action {string} of the catalog location {string}',
  async ({ page }, action, id) => {
    await locationOf(page, id).locator(`[data-action="${action}"]`).click();
  }
);

When(
  'I press the action {string} of the catalog source {string}',
  async ({ page }, action, name) => {
    await sourceOf(page, name).locator(`[data-action="${action}"]`).click();
  }
);

When('I toggle the request pill {string}', async ({ page }, label) => {
  await page
    .locator('.navbar-search-panel .navbar-search-pills [role="button"]')
    .filter({ hasText: new RegExp(`^${label}$`, 'u') })
    .first()
    .click();
});

When('I tick the catalog row {string} of the {string} table', async ({ page }, text, name) => {
  await rowOf(page, name, text).locator('.col-select input').check();
});

When(
  'I type {string} into the catalog step {int} field {string}',
  async ({ page }, text, step, label) => {
    await dialogOf(page).locator(`[data-step="${step}"]`).getByLabel(label).fill(text);
  }
);

Then('the catalog card {string} lists {int} locations', async ({ page }, panel, count) => {
  await expect(frameOf(page).locator(`[data-panel="${panel}"] [data-location]`)).toHaveCount(count);
});

Then('the catalog card {string} lists {int} registries', async ({ page }, panel, count) => {
  await expect(frameOf(page).locator(`[data-panel="${panel}"] [data-source]`)).toHaveCount(count);
});

Then('the catalog dialog {string} draws', async ({ page }, name) => {
  await expect(namedDialogOf(page, name)).toBeVisible();
});

Then('the catalog dialog {string} is gone', async ({ page }, name) => {
  await expect(namedDialogOf(page, name)).toHaveCount(0);
});

Then('the catalog dialog {string} says why it cannot be sent', async ({ page }, name) => {
  await expect(namedDialogOf(page, name).locator('[data-note="problem"]')).toBeVisible();
});

Then('the catalog dialog {string} draws {int} steps', async ({ page }, name, count) => {
  await expect(namedDialogOf(page, name).locator('[data-step]')).toHaveCount(count);
});

Then('the catalog dialog select {string} offers {int} options', async ({ page }, id, count) => {
  await expect(dialogOf(page).locator(`[id="${id}"] option:not([value=""])`)).toHaveCount(count);
});

Then('the catalog dialog option {string} of {string} is held', async ({ page }, value, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"] option[value="${value}"]`)).toBeDisabled();
});

Then('the catalog location {string} offers {string}', async ({ page }, id, action) => {
  await expect(locationOf(page, id).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the catalog location {string} offers no {string}', async ({ page }, id, action) => {
  await expect(locationOf(page, id)).toBeVisible();
  await expect(locationOf(page, id).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the manage page offers no {string}', async ({ page }, action) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then(
  'the row {string} of the {string} table of the manage page holds {string}',
  async ({ page }, text, name, action) => {
    await expect(rowOf(page, name, text).locator(`[data-action="${action}"]`)).toBeDisabled();
  }
);

Then('the open dialog draws the panel {string}', async ({ page }, name) => {
  await expect(dialogOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});
