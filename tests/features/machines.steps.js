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

Then('the machines heading counts {int}', async ({ page }, count) => {
  const heading = listOf(page).locator('.section-heading');
  await expect(heading).toHaveCount(1);
  await expect(heading.locator('h5 + .small')).toHaveText(`· ${count}`);
  await expect(heading.locator('[data-count]')).toHaveCount(0);
});

Then('the machines heading pane reads {string}', async ({ page }, names) => {
  const pane = listOf(page).locator('.section-heading > .ms-auto');
  await expect(pane).toBeVisible();
  const drawn = await pane
    .locator(':scope > *')
    .evaluateAll(nodes =>
      nodes.map(node =>
        node.getAttribute('role') === 'group' ? 'view-toggle' : node.getAttribute('data-action')
      )
    );
  expect(drawn.join(',')).toBe(names);
});

When('I pick the {string} view of the machines list', async ({ page }, view) => {
  await listOf(page)
    .locator('.section-heading [role="group"] button')
    .nth(view === 'cards' ? 1 : 0)
    .click();
  await expect(listOf(page)).toHaveAttribute('data-view', view);
});

Then('the machines list draws {int} cards', async ({ page }, count) => {
  await expect(listOf(page).locator('[data-machine-card]')).toHaveCount(count);
});

Then('the machines list draws no table', async ({ page }) => {
  await expect(listOf(page).locator('[data-machine-card]').first()).toBeVisible();
  await expect(listOf(page).locator('table')).toHaveCount(0);
});

Then('the machine card {string} links to {string}', async ({ page }, name, href) => {
  await expect(
    listOf(page).locator(`[data-machine-card="${name}"] a.stretched-link`)
  ).toHaveAttribute('href', href);
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

Then('the {string} panel sits in the {string} column', async ({ page }, name, column) => {
  await expect(
    machineOf(page).locator(`[data-column="${column}"] [data-panel="${name}"]`)
  ).toBeVisible();
});

Then('the {string} panel sits outside the {string} column', async ({ page }, name, column) => {
  await expect(panelOf(page, name)).toBeVisible();
  await expect(
    machineOf(page).locator(`[data-column="${column}"] [data-panel="${name}"]`)
  ).toHaveCount(0);
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
  await dialogOf(page)
    .locator(
      '.modal-footer .btn-primary:not(.dropdown-toggle), [data-pane="wizard-nav"] [data-action="submit"]'
    )
    .click();
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

const policyTabOf = page => machineOf(page).locator('[data-tab-body="snapshots"]');

When('I choose {string} as the retention policy', async ({ page }, value) => {
  await policyTabOf(page).locator('#snapshot-policy-type').selectOption(value);
});

When("I type {string} as the retention policy's {string}", async ({ page }, text, field) => {
  await policyTabOf(page).locator(`[id="snapshot-policy-${field}"]`).fill(text);
});

When('I pick the snapshot {string}', async ({ page }, name) => {
  await snapshotsOf(page)
    .locator('tbody tr')
    .filter({ hasText: name })
    .locator('td.col-select input')
    .check();
});

Then('the machine page draws no heading row', async ({ page }) => {
  await expect(panelOf(page, 'machine-info')).toBeVisible();
  await expect(machineOf(page).locator('.section-heading')).toHaveCount(0);
});

const headingOf = page => machineOf(page).locator('.section-heading');

Then('the machine page draws one heading titled {string}', async ({ page }, title) => {
  await expect(headingOf(page)).toHaveCount(1);
  await expect(headingOf(page).locator('h5')).toHaveText(title);
  await expect(headingOf(page).locator('[data-tool="fold"]')).toHaveCount(0);
});

Then("the heading's pane offers {string}", async ({ page }, action) => {
  await expect(headingOf(page).locator(`.ms-auto [data-action="${action}"]`)).toBeVisible();
});

Then("the heading's pane offers no {string}", async ({ page }, action) => {
  await expect(headingOf(page).locator('.ms-auto [data-action="refresh"]')).toBeVisible();
  await expect(headingOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then("the heading's pane ends with Refresh", async ({ page }) => {
  await expect(headingOf(page).locator('.ms-auto > :last-child')).toHaveAttribute(
    'data-action',
    'refresh'
  );
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
  await expect(dialogOf(page).locator('[data-dialog]').first()).toBeVisible();
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

When('I dismiss the {word} notice', async ({ page }, kind) => {
  await noticesOf(page, kind).locator('.btn-close').first().click();
});

const machineNav = page => page.locator('[data-nav="machine"]');

const machineRowOf = (page, key) => machineNav(page).locator(`[data-nav-page="${key}"]`);

When('I follow the machine row {string}', async ({ page }, key) => {
  await machineRowOf(page, key).click();
});

Then('the machine column draws {int} page rows', async ({ page }, count) => {
  await expect(machineNav(page)).toBeVisible();
  await expect(machineNav(page).locator('[data-nav-page]')).toHaveCount(count);
  await expect(machineNav(page).locator('[data-nav-group]')).toHaveCount(0);
});

Then('the machine column draws the {string} row to {string}', async ({ page }, key, href) => {
  await expect(machineRowOf(page, key)).toHaveAttribute('href', href);
  await expect(machineRowOf(page, key).locator('svg')).toHaveCount(1);
});

Then('the machine column draws no {string} row', async ({ page }, key) => {
  await expect(machineRowOf(page, 'overview')).toBeVisible();
  await expect(machineRowOf(page, key)).toHaveCount(0);
});

Then('the machine row {string} is the active one', async ({ page }, key) => {
  await expect(machineRowOf(page, key)).toHaveClass(/active/u);
  await expect(machineNav(page).locator('.host-nav-row.active')).toHaveCount(1);
});

Then('the snapshots page draws no {string} panel', async ({ page }, name) => {
  await expect(snapshotsOf(page)).toBeVisible();
  await expect(panelOf(page, name)).toHaveCount(0);
});
