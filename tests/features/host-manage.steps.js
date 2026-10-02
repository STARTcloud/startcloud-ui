import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="manage"]');

const sectionOf = (page, key) => frameOf(page).locator(`[data-panel="manage-${key}"]`);

const tableOf = (page, name) => frameOf(page).locator(`[data-table="${name}"]`);

const rowOf = (page, name, text) =>
  tableOf(page, name).locator('tbody tr').filter({ hasText: text }).first();

const dialogOf = page => page.getByRole('dialog').last();

When('I pick the tab {string} of the manage page', async ({ page }, key) => {
  await frameOf(page).locator(`.nav-tabs [data-tab="${key}"]`).click();
});

When(
  'I press {string} on the row {string} of the {string} table of the manage page',
  async ({ page }, action, text, name) => {
    await rowOf(page, name, text).locator(`[data-action="${action}"]`).click();
  }
);

When("I press the manage page's {string} action", async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I search the manage page for {string}', async ({ page }, text) => {
  await page.locator('.navbar-search input[type="search"]').fill(text);
});

When('I fold the {string} section of the manage page', async ({ page }, key) => {
  await sectionOf(page, key).locator('[data-tool="fold"]').click();
});

When('I choose {string} in the manage field {string}', async ({ page }, value, id) => {
  await frameOf(page).locator(`[id="${id}"]`).selectOption(value);
});

When('I type {string} into the manage field {string}', async ({ page }, text, id) => {
  await frameOf(page).locator(`[id="${id}"]`).fill(text);
});

When('I pick the dialog tab {string}', async ({ page }, key) => {
  await dialogOf(page).locator(`.nav-tabs [data-tab="${key}"]`).click();
});

Then('the manage page draws its frame', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
});

Then('the manage page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the manage route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="manage-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the manage page says an admin is required', async ({ page }) => {
  await expect(
    page.locator('[data-page="manage-denied"] [data-note="admin-required"]')
  ).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the manage page draws the {string} section', async ({ page }, key) => {
  await expect(sectionOf(page, key)).toBeVisible();
});

Then('the manage page draws the {string} panel', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});

Then('the manage page draws no {string} section', async ({ page }, key) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(sectionOf(page, key)).toHaveCount(0);
});

Then('the manage page draws {int} sections', async ({ page }, count) => {
  await expect(frameOf(page).locator('[data-panel^="manage-"]')).toHaveCount(count);
});

Then('the {string} section of the manage page draws no body', async ({ page }, key) => {
  await expect(sectionOf(page, key)).toBeVisible();
  await expect(sectionOf(page, key)).toHaveAttribute('data-own', 'false');
  await expect(sectionOf(page, key).locator('table')).toHaveCount(0);
});

Then('the {string} section of the manage page is folded', async ({ page }, key) => {
  await expect(sectionOf(page, key)).toHaveAttribute('data-folded', 'true');
  await expect(sectionOf(page, key).locator('table')).toHaveCount(0);
});

Then('the {string} section of the manage page is open', async ({ page }, key) => {
  await expect(sectionOf(page, key)).toHaveAttribute('data-folded', 'false');
});

Then('the {string} table of the manage page lists {int} rows', async ({ page }, name, count) => {
  await expect(tableOf(page, name)).toBeVisible();
  await expect(tableOf(page, name).locator('tbody tr')).toHaveCount(count);
});

Then(
  'the {string} table of the manage page draws the {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(1);
  }
);

Then(
  'the {string} table of the manage page draws no {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator('thead th').first()).toBeVisible();
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(0);
  }
);

Then('the {string} table of the manage page says {string}', async ({ page }, name, state) => {
  await expect(tableOf(page, name)).toHaveAttribute('data-state', state);
  await expect(tableOf(page, name).locator('.empty-state')).toBeVisible();
});

Then(
  'the row {string} of the {string} table of the manage page offers {string}',
  async ({ page }, text, name, action) => {
    await expect(rowOf(page, name, text).locator(`[data-action="${action}"]`)).toBeVisible();
  }
);

Then(
  'the row {string} of the {string} table of the manage page offers no {string}',
  async ({ page }, text, name, action) => {
    await expect(rowOf(page, name, text)).toBeVisible();
    await expect(rowOf(page, name, text).locator(`[data-action="${action}"]`)).toHaveCount(0);
  }
);

Then('the manage page offers {string}', async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then("the manage page's {string} action is held", async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeDisabled();
});

Then('the manage page notes {string}', async ({ page }, note) => {
  await expect(frameOf(page).locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the manage page notes no {string}', async ({ page }, note) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the open dialog lists {int} rows', async ({ page }, count) => {
  await expect(dialogOf(page).locator('tbody tr')).toHaveCount(count);
});
