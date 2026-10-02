import fs from 'node:fs';
import { join, resolve } from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const TOOLS_STREAM_DIR = resolve('tests/fixtures/hosts-tools');
const STREAM_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  'x-accel-buffering': 'no',
};

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const REPLAY_TIMEOUT = 15000;

const frames = new WeakMap();

const framesOf = page => {
  if (!frames.has(page)) {
    frames.set(page, []);
  }
  return frames.get(page);
};

const listOf = page => page.locator('[data-page="machines"]');

const machineOf = page => page.locator('[data-page="machine"]');

const rowOf = (page, name) => listOf(page).locator(`[data-row-actions="${name}"]`);

const panelOf = (page, name) => machineOf(page).locator(`[data-panel="${name}"]`);

const snapshotsOf = page => panelOf(page, 'machine-snapshots');

const snapshotOf = (page, name) => snapshotsOf(page).locator(`[data-snapshot="${name}"]`);

const machineChart = (page, name) => machineOf(page).locator(`[data-chart="${name}"]`);

const controlsOf = page => page.locator('.action-menu .dropdown-menu.show');

const treeMenuOf = page => page.locator('.sidebar-menu');

const dialogOf = page => page.getByRole('dialog').last();

const noticesOf = (page, kind) => page.locator(`.notice-card-${kind}`);

Given('the stream answers the machine {word} frames', async ({ page }, name) => {
  await page.route('**/api/events**', route =>
    route.fulfill({
      status: 200,
      headers: STREAM_HEADERS,
      body: fs.readFileSync(join(TOOLS_STREAM_DIR, `${name}.sse`), 'utf8'),
    })
  );
});

Given('the host answers a screenshot of {string}', async ({ page }, name) => {
  await page.route(`**/api/**/machines/${name}/vnc/screenshot`, route => {
    framesOf(page).push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });
});

When("I follow the host page's machines link", async ({ page }) => {
  await page.locator('[data-link="machines"]').click();
});

When('I press {string} on the row of {string}', async ({ page }, action, name) => {
  await rowOf(page, name).locator(`[data-action="${action}"]`).click();
});

When("I press the machine page's {string} action", async ({ page }, action) => {
  await machineOf(page).locator(`[data-action="${action}"]`).click();
});

When("I type {string} as the machine's tags", async ({ page }, text) => {
  await machineOf(page).locator('#machine-tags').fill(text);
});

When("I type {string} as the machine's notes", async ({ page }, text) => {
  await machineOf(page).locator('#machine-notes').fill(text);
});

Then('the machines list draws {int} rows', async ({ page }, count) => {
  await expect(listOf(page).locator('[data-row-actions]')).toHaveCount(count);
});

Then('the machines list counts {int} {word}', async ({ page }, count, kind) => {
  await expect(listOf(page).locator(`[data-count="${kind}"]`)).toHaveAttribute(
    'data-number',
    String(count)
  );
});

Then('the machines list draws the {string} column', async ({ page }, column) => {
  await expect(listOf(page).locator(`thead th.col-${column}`)).toHaveCount(1);
});

Then('the machines list draws no {string} column', async ({ page }, column) => {
  await expect(listOf(page).locator('thead th.col-name')).toHaveCount(1);
  await expect(listOf(page).locator(`thead th.col-${column}`)).toHaveCount(0);
});

Then('the machines page asks nothing of the host', async ({ page }) => {
  await expect(listOf(page).locator('.empty-state')).toBeVisible();
  await expect(listOf(page).locator('table')).toHaveCount(0);
});

Then('the row of {string} offers {string}', async ({ page }, name, action) => {
  await expect(rowOf(page, name).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the row of {string} offers no {string}', async ({ page }, name, action) => {
  await expect(rowOf(page, name)).toBeVisible();
  await expect(rowOf(page, name).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the machine page draws the {string} panel', async ({ page }, name) => {
  await expect(panelOf(page, name)).toBeVisible();
});

Then('the machine page draws no {string} panel', async ({ page }, name) => {
  await expect(panelOf(page, 'machine-info')).toBeVisible();
  await expect(panelOf(page, name)).toHaveCount(0);
});

Then('the machine page says the details are not available', async ({ page }) => {
  await expect(machineOf(page).locator('[data-note="no-detail"]')).toBeVisible();
});

Then('the machine page says the machine is not found', async ({ page }) => {
  await expect(machineOf(page).locator('[data-note="not-found"]')).toBeVisible();
  await expect(machineOf(page).locator('[data-panel]')).toHaveCount(0);
});

Then(
  'the host was sent {word} to {string} at least {int} times',
  async ({ host }, method, pathname, count) => {
    await expect
      .poll(() => host.answered(method, pathname).length, { timeout: REPLAY_TIMEOUT })
      .toBeGreaterThanOrEqual(count);
  }
);

Then('the machine reads {string}', async ({ page }, state) => {
  await expect(panelOf(page, 'machine-info').locator('[data-machine-state]')).toHaveAttribute(
    'data-machine-state',
    state
  );
});

Then('the machine belongs to {int} organization(s)', async ({ page }, count) => {
  await expect(
    panelOf(page, 'machine-info').locator('[data-machine-organizations]')
  ).toHaveAttribute('data-machine-organizations', String(count));
});

Then('the machine page names no organization', async ({ page }) => {
  await expect(panelOf(page, 'machine-info')).toBeVisible();
  await expect(panelOf(page, 'machine-info').locator('[data-machine-organizations]')).toHaveCount(
    0
  );
});

Then('the device tree lists {int} devices', async ({ page }, count) => {
  await expect(panelOf(page, 'machine-hardware').locator('.device-child')).toHaveCount(count);
});

Then('the guest information lists {int} addresses', async ({ page }, count) => {
  await expect(
    panelOf(page, 'machine-guest-info').locator('[data-list="guest-property-addresses"] > div')
  ).toHaveCount(count);
});

Then('the guest network dialog lists {int} interfaces', async ({ page }, count) => {
  await expect(page.locator('[data-dialog="guest-network"] tbody tr')).toHaveCount(count);
});

Then('the machine page offers {string}', async ({ page }, action) => {
  await expect(machineOf(page).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the machine page offers no {string}', async ({ page }, action) => {
  await expect(machineOf(page).locator('[data-panel]').first()).toBeVisible();
  await expect(machineOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then("the machine's {string} action is held", async ({ page }, action) => {
  await expect(machineOf(page).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the console screenshot draws', async ({ page }) => {
  const image = panelOf(page, 'machine-console').locator('[data-note="console-screenshot"]');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
});

Then('the screenshot was read at {string} {int} times', async ({ page }, pathname, count) => {
  await expect.poll(() => framesOf(page).filter(path => path === pathname).length).toBe(count);
});

Then(
  'the screenshot was read at {string} at least {int} times',
  async ({ page }, pathname, count) => {
    await expect
      .poll(() => framesOf(page).filter(path => path === pathname).length)
      .toBeGreaterThanOrEqual(count);
  }
);

Then('the screenshot was never read', ({ page }) => {
  expect(framesOf(page)).toHaveLength(0);
});

When("I press the Controls menu's {string} row", async ({ page }, action) => {
  await controlsOf(page).locator(`[data-action="${action}"]`).click();
});

When("I press the tree menu's {string} row", async ({ page }, row) => {
  await treeMenuOf(page).locator(`[data-menu-row="${row}"]`).click();
});

When('I open the More menu of the row of {string}', async ({ page }, name) => {
  await rowOf(page, name).locator('.dropdown-toggle').click();
});

When("I press the machines list's {string} action", async ({ page }, action) => {
  await listOf(page).locator(`[data-action="${action}"]`).click();
});

When('I press {string} on the snapshot {string}', async ({ page }, action, name) => {
  await snapshotOf(page, name).locator(`[data-action="${action}"]`).click();
});

When('I open the holds of the snapshot {string}', async ({ page }, name) => {
  await snapshotsOf(page)
    .locator('tbody tr')
    .filter({ hasText: name })
    .locator('[data-action="holds"]')
    .click();
});

When("I press the open dialog's {string} action", async ({ page }, action) => {
  await dialogOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I pick the naming {string}', async ({ page }, mode) => {
  await dialogOf(page).locator(`[data-mode="${mode}"]`).click();
});

When('I send the open dialog', async ({ page }) => {
  await dialogOf(page).locator('.modal-footer .btn-primary').click();
});

When('I type {string} into the field {string}', async ({ page }, text, id) => {
  await dialogOf(page).locator(`[id="${id}"]`).fill(text);
});

When("I type {string} as the hold's tag", async ({ page }, text) => {
  await dialogOf(page).locator('[data-field="hold-tag"]').fill(text);
});

When('I check the field {string}', async ({ page }, id) => {
  await dialogOf(page).locator(`[id="${id}"]`).check();
});

When('I choose {string} in the field {string}', async ({ page }, value, id) => {
  await dialogOf(page).locator(`[id="${id}"]`).selectOption(value);
});

When('I choose {string} as the retention policy', async ({ page }, value) => {
  await panelOf(page, 'machine-snapshot-policy')
    .locator('#snapshot-policy-type')
    .selectOption(value);
});

When("I type {string} as the retention policy's {string}", async ({ page }, text, field) => {
  await panelOf(page, 'machine-snapshot-policy')
    .locator(`[id="snapshot-policy-${field}"]`)
    .fill(text);
});

When("I refresh the machine's {string} chart", async ({ page }, name) => {
  await machineChart(page, name).locator('[data-tool="refresh"]').click();
});

Then('the Controls menu offers {string}', async ({ page }, action) => {
  await expect(controlsOf(page).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the Controls menu offers no {string}', async ({ page }, action) => {
  await expect(controlsOf(page)).toBeVisible();
  await expect(controlsOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the tree menu offers {string}', async ({ page }, row) => {
  await expect(treeMenuOf(page).locator(`[data-menu-row="${row}"]`)).toBeVisible();
});

Then('the tree menu offers no {string}', async ({ page }, row) => {
  await expect(treeMenuOf(page).locator('[data-menu-row="open"]')).toBeVisible();
  await expect(treeMenuOf(page).locator(`[data-menu-row="${row}"]`)).toHaveCount(0);
});

Then('the machines list offers {string}', async ({ page }, action) => {
  await expect(listOf(page).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the machines list offers no {string}', async ({ page }, action) => {
  await expect(listOf(page).locator('[data-row-actions]').first()).toBeVisible();
  await expect(listOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the {string} dialog is open', async ({ page }, name) => {
  await expect(page.locator(`[data-dialog="${name}"]`)).toBeVisible();
});

Then('no dialog is open', async ({ page }) => {
  await expect(page.locator('[data-dialog]')).toHaveCount(0);
});

Then('the open dialog notes {string}', async ({ page }, note) => {
  await expect(dialogOf(page).locator(`[data-note="${note}"]`)).toBeVisible();
});

Then('the open dialog notes no {string}', async ({ page }, note) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the open dialog draws the field {string}', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toBeVisible();
});

Then('the open dialog draws no field {string}', async ({ page }, id) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toHaveCount(0);
});

Then('the field {string} reads {string}', async ({ page }, id, value) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toHaveValue(value);
});

Then('the open dialog lists {int} resource issues', async ({ page }, count) => {
  await expect(dialogOf(page).locator('[data-list="resource-issues"] li')).toHaveCount(count);
});

Then('the holds dialog lists {int} datasets and {int} holds', async ({ page }, datasets, holds) => {
  const dialog = page.locator('[data-dialog="snapshot-holds"]');
  await expect(dialog.locator('[data-dataset]')).toHaveCount(datasets);
  await expect(dialog.locator('[data-hold]')).toHaveCount(holds);
});

Then('the page raised {int} {word} notice(s)', async ({ page }, count, kind) => {
  await expect(noticesOf(page, kind)).toHaveCount(count);
});

Then('the snapshots list draws {int} rows', async ({ page }, count) => {
  await expect(snapshotsOf(page).locator('tbody td.col-name')).toHaveCount(count);
});

Then('the snapshots list draws the {string} column', async ({ page }, column) => {
  await expect(snapshotsOf(page).locator(`thead th.col-${column}`)).toHaveCount(1);
});

Then('the snapshots list draws no {string} column', async ({ page }, column) => {
  await expect(snapshotsOf(page).locator('thead th.col-name')).toHaveCount(1);
  await expect(snapshotsOf(page).locator(`thead th.col-${column}`)).toHaveCount(0);
});

Then('the snapshot {string} sits {int} deep', async ({ page }, name, depth) => {
  const label = snapshotsOf(page).locator('.snapshot-name').filter({ hasText: name });
  await expect
    .poll(() => label.evaluate(node => node.style.getPropertyValue('--snapshot-depth')))
    .toBe(String(depth));
});

Then('the snapshot {string} offers {string}', async ({ page }, name, action) => {
  await expect(snapshotOf(page, name).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the snapshot {string} offers no {string}', async ({ page }, name, action) => {
  await expect(snapshotOf(page, name)).toBeVisible();
  await expect(snapshotOf(page, name).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the snapshot {string} holds {string} back', async ({ page }, name, action) => {
  await expect(snapshotOf(page, name).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the snapshots list offers no action', async ({ page }) => {
  await expect(snapshotsOf(page).locator('thead th.col-name')).toHaveCount(1);
  await expect(snapshotsOf(page).locator('[data-snapshot]')).toHaveCount(0);
  await expect(snapshotsOf(page).locator('[data-action="snapshot-take"]')).toHaveCount(0);
});

Then('the snapshots say the machine must be off', async ({ page }) => {
  await expect(snapshotsOf(page).locator('[data-note="utm-stopped-only"]')).toBeVisible();
  await expect(snapshotsOf(page).locator('table')).toHaveCount(0);
});

Then('the machine page draws the {string} chart', async ({ page }, name) => {
  await expect(machineChart(page, name).locator('canvas')).toBeVisible();
});

Then('the machine page draws no {string} chart', async ({ page }, name) => {
  await expect(panelOf(page, 'machine-info')).toBeVisible();
  await expect(machineChart(page, name)).toHaveCount(0);
});

Then('the machine page draws {int} charts', async ({ page }, count) => {
  await expect(machineOf(page).locator('[data-chart]')).toHaveCount(count);
});

Then("the machine's {string} chart names the dataset {string}", async ({ page }, name, dataset) => {
  await expect(machineChart(page, name).locator('[data-dataset]')).toHaveText(dataset);
});

Then("the machine's memory chart says the guest additions are needed", async ({ page }) => {
  await expect(machineChart(page, 'memory').locator('[data-note="guest-additions"]')).toBeVisible();
  await expect(machineChart(page, 'memory').locator('canvas')).toHaveCount(0);
});

Then("the machine's {string} chart says its read failed", async ({ page }, name) => {
  await expect(machineChart(page, name).locator('[data-note="chart-failed"]')).toBeVisible();
  await expect(machineChart(page, name).locator('canvas')).toHaveCount(0);
});

Then('the hardware lists {int} forwards', async ({ page }, count) => {
  await expect(
    panelOf(page, 'machine-hardware').locator('[data-list="nat-forwards"] > div')
  ).toHaveCount(count);
});

Then('the snapshots list offers no holds', async ({ page }) => {
  await expect(snapshotsOf(page).locator('thead th.col-name')).toHaveCount(1);
  await expect(snapshotsOf(page).locator('[data-action="holds"]')).toHaveCount(0);
});

Then('the holds dialog notes {string}', async ({ page }, note) => {
  await expect(page.locator(`[data-dialog="snapshot-holds"] [data-note="${note}"]`)).toBeVisible();
});

Then('the holds dialog says its read failed for {string}', async ({ page }, dataset) => {
  await expect(
    page.locator('[data-dialog="snapshot-holds"] [data-note="holds-failed"]')
  ).toContainText(dataset);
});

Then('the field {string} is checked', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toBeChecked();
});

Then('the field {string} is not checked', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).not.toBeChecked();
});

When('I uncheck the field {string}', async ({ page }, id) => {
  await dialogOf(page).locator(`[id="${id}"]`).uncheck();
});

When("I press the {word} notice's action", async ({ page }, kind) => {
  await noticesOf(page, kind).locator('.btn-outline-secondary').first().click();
});

const machineTabs = page => machineOf(page).locator('[data-tabs="machine"] .nav-tabs');

const machineTabOf = (page, key) => machineTabs(page).locator(`[data-tab="${key}"]`);

When('I follow the machine tab {string}', async ({ page }, key) => {
  await machineTabOf(page, key).click();
});

Then('the machine tab row draws {int} tabs', async ({ page }, count) => {
  await expect(machineTabs(page)).toBeVisible();
  await expect(machineTabs(page).locator('[data-tab]')).toHaveCount(count);
});

Then('the machine tab row draws the {string} tab to {string}', async ({ page }, key, href) => {
  await expect(machineTabOf(page, key)).toHaveAttribute('href', href);
  await expect(machineTabOf(page, key).locator('svg')).toHaveCount(1);
});

Then('the machine tab row draws no {string} tab', async ({ page }, key) => {
  await expect(machineTabs(page)).toBeVisible();
  await expect(machineTabOf(page, key)).toHaveCount(0);
});

Then('the machine tab {string} is the active one', async ({ page }, key) => {
  await expect(machineTabOf(page, key)).toHaveClass(/active/u);
  await expect(machineTabs(page).locator('.nav-link.active')).toHaveCount(1);
});

Then('the page draws no machine tab row', async ({ page }) => {
  await expect(panelOf(page, 'machine-info')).toBeVisible();
  await expect(machineOf(page).locator('[data-tabs="machine"]')).toHaveCount(0);
});

Then('the snapshots page draws no {string} panel', async ({ page }, name) => {
  await expect(snapshotsOf(page)).toBeVisible();
  await expect(panelOf(page, name)).toHaveCount(0);
});
