import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const listingOf = page =>
  page.locator('[data-page="host-section"][data-section="installers"] [data-table="installers"]');

const filesTableOf = page => listingOf(page).locator('table:has(tbody [data-artifact])');

const filesOf = page => listingOf(page).locator('tbody tr:has([data-artifact])');

const fileOf = (page, name) => filesOf(page).filter({ hasText: name }).first();

const transfersOf = page => listingOf(page).locator('[data-table="artifact-transfers"]');

const bulkPaneOf = page => listingOf(page).locator('[data-pane="bulk"]');

Then('the installer files listing draws', async ({ page }) => {
  await expect(listingOf(page)).toBeVisible();
});

Then('the installer files listing lists {int} files', async ({ page }, count) => {
  await expect(listingOf(page)).toBeVisible();
  await expect(filesOf(page)).toHaveCount(count);
});

Then('the installer files listing draws {int} groups', async ({ page }, count) => {
  await expect(listingOf(page).locator('tbody tr.table-group-row')).toHaveCount(count);
});

Then('the artifact transfers list {int} rows', async ({ page }, count) => {
  await expect(transfersOf(page).locator('tbody tr')).toHaveCount(count);
});

Then('the installer files listing lists no transfer', async ({ page }) => {
  await expect(listingOf(page)).toBeVisible();
  await expect(transfersOf(page)).toHaveCount(0);
});

Then('the installer files listing draws the {string} column', async ({ page }, column) => {
  await expect(filesTableOf(page).locator(`thead th.col-${column}`)).toHaveCount(1);
});

Then('the installer files listing draws no {string} column', async ({ page }, column) => {
  await expect(filesTableOf(page).locator('thead th').first()).toBeVisible();
  await expect(filesTableOf(page).locator(`thead th.col-${column}`)).toHaveCount(0);
});

Then(
  'the file {string} reads {string} in its {string} column',
  async ({ page }, name, value, column) => {
    await expect(fileOf(page, name)).toBeVisible();
    await expect(fileOf(page, name).locator(`td.col-${column}`)).toHaveText(value);
  }
);

Then('the file {string} offers {string}', async ({ page }, name, action) => {
  await expect(fileOf(page, name).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the file {string} offers no {string}', async ({ page }, name, action) => {
  await expect(fileOf(page, name)).toBeVisible();
  await expect(fileOf(page, name).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the file {string} holds {string}', async ({ page }, name, action) => {
  await expect(fileOf(page, name).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the file {string} carries a {string} badge', async ({ page }, name, tone) => {
  await expect(fileOf(page, name)).toBeVisible();
  await expect(fileOf(page, name).locator(`.badge.text-bg-${tone}`)).toHaveCount(1);
});

When('I open the menu of the file {string}', async ({ page }, name) => {
  await fileOf(page, name).locator('.dropdown-toggle').click();
  await expect(fileOf(page, name).locator('.dropdown-menu.show')).toBeVisible();
});

When('I press {string} on the file {string}', async ({ page }, action, name) => {
  await fileOf(page, name).locator(`[data-action="${action}"]`).click();
});

When('I tick the file {string}', async ({ page }, name) => {
  await fileOf(page, name).locator('.col-select input').check();
});

Then('the bulk pane offers {string}', async ({ page }, action) => {
  await expect(bulkPaneOf(page).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the bulk pane offers no {string}', async ({ page }, action) => {
  await expect(listingOf(page)).toBeVisible();
  await expect(bulkPaneOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

When('I press {string} in the bulk pane', async ({ page }, action) => {
  await bulkPaneOf(page).locator(`[data-action="${action}"]`).click();
});

Then(
  'the row {string} of the dialog table {string} reads {string} in its {string} column',
  async ({ page }, text, name, value, column) => {
    const row = page
      .getByRole('dialog')
      .last()
      .locator(`[data-table="${name}"] tbody tr`)
      .filter({ hasText: text })
      .first();
    await expect(row).toBeVisible();
    await expect(row.locator(`td.col-${column}`)).toHaveText(value);
  }
);
