import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const MONITORING_PANELS = [
  'storage-summary',
  'storage-pools',
  'storage-datasets',
  'storage-disks',
  'storage-disk-io',
  'storage-pool-io',
  'storage-arc',
  'storage-charts',
];

const frameOf = page => page.locator('[data-page="storage"]');

const tableOf = (page, name) => frameOf(page).locator(`[data-panel="storage-${name}"]`);

const summaryOf = page => frameOf(page).locator('[data-panel="storage-summary"]');

const managementOf = page => frameOf(page).locator('[data-panel="storage-management"]');

const poolOf = (page, name) => managementOf(page).locator(`[data-pool="${name}"]`);

const bayOf = (page, name) => managementOf(page).locator(`[data-bay="${name}"]`);

const deviceCharts = page =>
  frameOf(page).locator('[data-panel="storage-device-charts"] [data-chart]');

const poolCharts = page => frameOf(page).locator('[data-panel="storage-pool-charts"] [data-chart]');

const treeRows = page => managementOf(page).locator('[data-tree="datasets"] [data-dataset]');

const treeRowOf = (page, name) =>
  managementOf(page).locator(`[data-tree="datasets"] [data-dataset="${name}"]`);

const dialogOf = (page, name) => page.locator(`[data-dialog="${name}"]`);

const fieldOf = (page, id) => page.locator(`.modal #${id}`);

When('I search the storage page for {string}', async ({ page }, text) => {
  await page.locator('.navbar-search input[type="search"]').fill(text);
});

When('I pick the storage chart window {string}', async ({ page }, value) => {
  await frameOf(page).locator('select[name="window"]').selectOption(value);
});

When('I pick the storage chart resolution {string}', async ({ page }, value) => {
  await frameOf(page).locator('select[name="resolution"]').selectOption(value);
});

When('I order the device charts by {string}', async ({ page }, value) => {
  await frameOf(page).locator('select[name="chart-sort"]').selectOption(value);
});

When(
  'I sort the {string} table of the storage page by {string}',
  async ({ page }, name, column) => {
    await tableOf(page, name).locator(`thead th.col-${column} button`).first().click();
  }
);

When('I reset the sort of the {string} table of the storage page', async ({ page }, name) => {
  await tableOf(page, name).locator('[data-tool="reset-sort"]').click();
});

When('I fold the {string} section of the storage page', async ({ page }, name) => {
  await frameOf(page)
    .locator(
      `[data-panel="storage-${name}"] [data-tool="fold"], [data-panel="storage-${name}"] .section-card-chevron`
    )
    .first()
    .click();
});

When('I press the action {string} of the pool {string}', async ({ page }, action, name) => {
  await poolOf(page, name).locator(`[data-action="${action}"]`).click();
});

When('I press the storage action {string}', async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I press the bay {string}', async ({ page }, name) => {
  await bayOf(page, name).click();
});

When('I open the ZFS management tab {string}', async ({ page }, key) => {
  await managementOf(page).locator(`.nav-tabs [data-tab="${key}"]`).click();
});

When('I press the action {string} of the dataset row {string}', async ({ page }, action, name) => {
  await treeRowOf(page, name).locator(`[data-action="${action}"]`).click();
});

When('I pick {string} in the storage dialog select {string}', async ({ page }, value, id) => {
  await fieldOf(page, id).selectOption(value);
});

When('I fill the storage dialog field {string} with {string}', async ({ page }, id, value) => {
  await fieldOf(page, id).fill(value);
});

When('I tick the storage dialog field {string}', async ({ page }, id) => {
  await fieldOf(page, id).check();
});

When('I submit the storage dialog {string}', async ({ page }, name) => {
  await dialogOf(page, name).locator('[data-action="submit"]').click();
});

Then('the storage page draws its frame', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
});

Then('the storage page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the storage route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="storage-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(page.locator('.card .alert-info')).toHaveCount(0);
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the storage page draws no monitoring section', async ({ page }) => {
  await expect(managementOf(page)).toBeVisible();
  await expect(
    frameOf(page).locator(MONITORING_PANELS.map(panel => `[data-panel="${panel}"]`).join(', '))
  ).toHaveCount(0);
});

Then('the storage page draws the {string} section', async ({ page }, name) => {
  await expect(tableOf(page, name)).toBeVisible();
});

Then('the storage page draws no {string} section', async ({ page }, name) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(tableOf(page, name)).toHaveCount(0);
});

Then('the {string} table of the storage page lists {int} rows', async ({ page }, name, count) => {
  await expect(tableOf(page, name)).toBeVisible();
  await expect(tableOf(page, name).locator('tbody tr')).toHaveCount(count);
});

Then(
  'the {string} table of the storage page draws the {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(1);
  }
);

Then(
  'the {string} table of the storage page draws {string} in its {string} column',
  async ({ page }, name, text, column) => {
    const cells = tableOf(page, name).locator(`tbody td.col-${column}`);
    await expect(cells.getByText(text, { exact: true }).first()).toBeVisible();
  }
);

Then('the {string} table of the storage page says {string}', async ({ page }, name, state) => {
  await expect(tableOf(page, name)).toHaveAttribute('data-state', state);
  await expect(tableOf(page, name).locator('.empty-state')).toBeVisible();
  await expect(tableOf(page, name).locator('table')).toHaveCount(0);
});

Then(
  'the first row of the {string} table of the storage page reads {string}',
  async ({ page }, name, text) => {
    await expect(tableOf(page, name).locator('tbody tr').first()).toContainText(text);
  }
);

Then('the {string} section of the storage page is folded', async ({ page }, name) => {
  const section = frameOf(page).locator(`[data-panel="storage-${name}"]`);
  await expect(section).toHaveAttribute('data-folded', 'true');
  await expect(
    section.locator('table, [data-chart], [data-counts], .card-body').first()
  ).toBeHidden();
});

Then('the {string} section of the storage page is open', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="storage-${name}"]`)).toHaveAttribute(
    'data-folded',
    'false'
  );
});

Then('the storage summary is the first section of the storage page', async ({ page }) => {
  await expect(summaryOf(page)).toBeVisible();
  await expect(frameOf(page).locator('[data-panel]').first()).toHaveAttribute(
    'data-panel',
    'storage-summary'
  );
});

Then(
  'the storage summary counts {int} pools, {int} datasets and {int} disks',
  async ({ page }, pools, datasets, disks) => {
    const counts = summaryOf(page).locator('[data-counts="storage"]');
    await expect(counts).toHaveAttribute('data-pools', String(pools));
    await expect(counts).toHaveAttribute('data-datasets', String(datasets));
    await expect(counts).toHaveAttribute('data-disks', String(disks));
    await expect(counts.locator('[data-count] .badge')).toHaveCount(6);
  }
);

Then('the first device chart is {string}', async ({ page }, name) => {
  await expect(deviceCharts(page).first()).toHaveAttribute('data-chart', `device:${name}`);
});

Then('the storage page draws {int} device charts', async ({ page }, count) => {
  await expect(deviceCharts(page)).toHaveCount(count);
});

Then('the storage page draws {int} pool charts', async ({ page }, count) => {
  await expect(poolCharts(page)).toHaveCount(count);
});

Then('the ZFS management draws {int} pools', async ({ page }, count) => {
  await expect(managementOf(page).locator('[data-panel="storage-zfs-pools"]')).toHaveAttribute(
    'data-count',
    String(count)
  );
  await expect(managementOf(page).locator('[data-pool]')).toHaveCount(count);
});

Then('the pool {string} draws {int} drives', async ({ page }, name, count) => {
  await expect(poolOf(page, name).locator('[data-topology] [data-drive]')).toHaveCount(count);
});

Then('the pool {string} draws a scan in progress', async ({ page }, name) => {
  await expect(poolOf(page, name).locator('.hw-scan-bar')).toBeVisible();
});

Then('the pool {string} draws no scan', async ({ page }, name) => {
  await expect(poolOf(page, name).locator('[data-topology]')).toBeVisible();
  await expect(poolOf(page, name).locator('.hw-scan-bar')).toHaveCount(0);
});

Then('the chassis draws {int} bays', async ({ page }, count) => {
  await expect(managementOf(page).locator('[data-panel="storage-chassis"] [data-bay]')).toHaveCount(
    count
  );
});

Then('the bay {string} reads faulty', async ({ page }, name) => {
  await expect(bayOf(page, name)).toHaveClass(/hw-bay-faulty/u);
});

Then('the bay {string} reads free', async ({ page }, name) => {
  await expect(bayOf(page, name)).toHaveClass(/hw-bay-free/u);
});

Then('the storage dialog {string} draws', async ({ page }, name) => {
  await expect(dialogOf(page, name)).toBeVisible();
});

Then('the storage dialog {string} is gone', async ({ page }, name) => {
  await expect(dialogOf(page, name)).toHaveCount(0);
});

Then('the storage dialog {string} lists {int} rows', async ({ page }, name, count) => {
  await expect(dialogOf(page, name).locator('tbody tr')).toHaveCount(count);
});

Then('the storage dialog {string} says why it cannot be sent', async ({ page }, name) => {
  await expect(dialogOf(page, name).locator('[data-note="problem"]')).toBeVisible();
});

Then('the dataset tree draws {int} rows', async ({ page }, count) => {
  await expect(treeRows(page)).toHaveCount(count);
});

Then('the dataset tree draws the row {string}', async ({ page }, name) => {
  await expect(treeRowOf(page, name)).toBeVisible();
});

Then('the dataset tree draws no row {string}', async ({ page }, name) => {
  await expect(treeRows(page).first()).toBeVisible();
  await expect(treeRowOf(page, name)).toHaveCount(0);
});
