import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"][data-section="devices"]');

const inventoryOf = page => frameOf(page).locator('[data-panel="devices-inventory"]');

const pptOf = page => frameOf(page).locator('[data-panel="devices-ppt"]');

const summaryOf = page => frameOf(page).locator('[data-panel="devices-summary"]');

const dialogOf = page => page.locator('[data-dialog="device-details"]');

When('I search the devices page for {string}', async ({ page }, text) => {
  await page.locator('.navbar-search input[type="search"]').fill(text);
});

When('I press the devices action {string}', async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I open the details of the device {string}', async ({ page }, name) => {
  await inventoryOf(page)
    .locator('tbody tr')
    .filter({ hasText: name })
    .first()
    .locator('[data-action="device-details"]')
    .click();
});

When('I fold the {string} section of the devices page', async ({ page }, name) => {
  await frameOf(page)
    .locator(
      `[data-panel="devices-${name}"] [data-tool="fold"], [data-panel="devices-${name}"] .section-card-chevron`
    )
    .first()
    .click();
});

Then('the devices page draws its frame', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
});

Then('the devices page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the devices route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="host-section-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(page.locator('.card .alert-info')).toHaveCount(0);
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the devices page says a read failed', async ({ page }) => {
  await expect(frameOf(page).locator('[data-note="devices-failed"]')).toBeVisible();
});

Then('the devices page draws no passthrough table', async ({ page }) => {
  await expect(inventoryOf(page)).toBeVisible();
  await expect(pptOf(page)).toHaveCount(0);
});

Then('the device summary is the first section of the devices page', async ({ page }) => {
  await expect(summaryOf(page)).toBeVisible();
  await expect(frameOf(page).locator('[data-panel]').first()).toHaveAttribute(
    'data-panel',
    'devices-summary'
  );
});

Then('the device summary counts {int} pairs', async ({ page }, count) => {
  await expect(summaryOf(page).locator('[data-counts="devices"] [data-count]')).toHaveCount(count);
});

Then('the device summary counts {string} as {int}', async ({ page }, key, count) => {
  await expect(summaryOf(page).locator(`[data-count="${key}"] .badge`).last()).toHaveText(
    String(count)
  );
});

Then('the devices table lists {int} rows', async ({ page }, count) => {
  await expect(inventoryOf(page)).toBeVisible();
  await expect(inventoryOf(page).locator('tbody tr')).toHaveCount(count);
});

Then('the devices table draws the {string} column', async ({ page }, column) => {
  await expect(inventoryOf(page).locator(`thead th.col-${column}`)).toHaveCount(1);
});

Then('the devices table draws {string} in its {string} column', async ({ page }, text, column) => {
  const cells = inventoryOf(page).locator(`tbody td.col-${column}`);
  await expect(cells.getByText(text, { exact: true }).first()).toBeVisible();
});

Then('the first row of the devices table reads {string}', async ({ page }, text) => {
  await expect(inventoryOf(page).locator('tbody tr').first()).toContainText(text);
});

Then('the passthrough table lists {int} rows', async ({ page }, count) => {
  await expect(pptOf(page)).toBeVisible();
  await expect(pptOf(page).locator('tbody tr')).toHaveCount(count);
});

Then(
  'the passthrough table draws {string} in its {string} column',
  async ({ page }, text, column) => {
    const cells = pptOf(page).locator(`tbody td.col-${column}`);
    await expect(cells.getByText(text, { exact: true }).first()).toBeVisible();
  }
);

Then('the device dialog draws', async ({ page }) => {
  await expect(dialogOf(page)).toBeVisible();
});

Then('the device dialog lists the zone {string}', async ({ page }, zone) => {
  await expect(
    dialogOf(page).locator('[data-zones] .badge').filter({ hasText: zone })
  ).toBeVisible();
});

Then('the device dialog reads {string}', async ({ page }, text) => {
  await expect(dialogOf(page).getByText(text, { exact: true }).first()).toBeVisible();
});

Then('the {string} section of the devices page is folded', async ({ page }, name) => {
  const section = frameOf(page).locator(`[data-panel="devices-${name}"]`);
  await expect(section).toHaveAttribute('data-folded', 'true');
  await expect(section.locator('table, [data-counts], .card-body').first()).toBeHidden();
});
