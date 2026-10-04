import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"]');

const sectionOf = (page, key) => page.locator(`[data-page="host-section"][data-section="${key}"]`);

const tableOf = (page, name) => frameOf(page).locator(`[data-table="${name}"]`);

const rowOf = (page, name, text) =>
  tableOf(page, name).locator('tbody tr').filter({ hasText: text }).first();

const dialogOf = page => page.getByRole('dialog').last();

When('I pick the tab {string} of the section page', async ({ page }, key) => {
  await frameOf(page).locator(`.nav-tabs [data-tab="${key}"]`).click();
});

When(
  'I press {string} on the row {string} of the {string} table of the section page',
  async ({ page }, action, text, name) => {
    await rowOf(page, name, text).locator(`[data-action="${action}"]`).click();
  }
);

When("I press the section page's {string} action", async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I search the section page for {string}', async ({ page }, text) => {
  await page.locator('.navbar-search input[type="search"]').fill(text);
});

When('I choose {string} in the section field {string}', async ({ page }, value, id) => {
  await frameOf(page).locator(`[id="${id}"]`).selectOption(value);
});

When('I type {string} into the section field {string}', async ({ page }, text, id) => {
  await frameOf(page).locator(`[id="${id}"]`).fill(text);
});

When('I pick the dialog tab {string}', async ({ page }, key) => {
  await dialogOf(page).locator(`.nav-tabs [data-tab="${key}"]`).click();
});

Then('the section page {string} draws', async ({ page }, key) => {
  await expect(sectionOf(page, key)).toBeVisible();
  await expect(sectionOf(page, key).locator('.section-heading').first()).toBeVisible();
});

Then('the section page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the section route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="host-section-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(page.locator('.card .alert-info')).toHaveCount(0);
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the section page says an admin is required', async ({ page }) => {
  await expect(
    page.locator('[data-page="host-section-denied"] [data-note="admin-required"]')
  ).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the section page says a super-admin is required', async ({ page }) => {
  await expect(
    page.locator('[data-page="host-section-denied"] [data-note="access-denied"]')
  ).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the section page draws the {string} panel', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});

Then('the section page draws no {string} panel', async ({ page }, name) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toHaveCount(0);
});

Then('the section page draws no folding section', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator('[data-panel^="manage-"]')).toHaveCount(0);
});

Then('the {string} table of the section page lists {int} rows', async ({ page }, name, count) => {
  await expect(tableOf(page, name)).toBeVisible();
  await expect(tableOf(page, name).locator('tbody tr')).toHaveCount(count);
});

Then(
  'the {string} table of the section page draws the {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(1);
  }
);

Then(
  'the {string} table of the section page draws no {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator('thead th').first()).toBeVisible();
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(0);
  }
);

Then('the {string} table of the section page says {string}', async ({ page }, name, state) => {
  await expect(tableOf(page, name)).toHaveAttribute('data-state', state);
  await expect(tableOf(page, name).locator('.empty-state')).toBeVisible();
});

Then(
  'the row {string} of the {string} table of the section page offers {string}',
  async ({ page }, text, name, action) => {
    await expect(rowOf(page, name, text).locator(`[data-action="${action}"]`)).toBeVisible();
  }
);

Then(
  'the row {string} of the {string} table of the section page offers no {string}',
  async ({ page }, text, name, action) => {
    await expect(rowOf(page, name, text)).toBeVisible();
    await expect(rowOf(page, name, text).locator(`[data-action="${action}"]`)).toHaveCount(0);
  }
);

Then('the section page offers {string}', async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then("the section page's {string} action is held", async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeDisabled();
});

Then('the section page notes {string}', async ({ page }, note) => {
  await expect(frameOf(page).locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the section page notes no {string}', async ({ page }, note) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the open dialog lists {int} rows', async ({ page }, count) => {
  await expect(dialogOf(page).locator('tbody tr')).toHaveCount(count);
});
