import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const STREAM_DIR = path.resolve('tests/fixtures/events-networking');
const STREAM_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  'x-accel-buffering': 'no',
};
const RAW_KEY = /\b(?:host|navbar|chrome)\.[a-z][A-Za-z]+\.[a-z][A-Za-z]+/u;

const frameOf = page => page.locator('[data-page="host-section"]');

const MONITORING_PANELS = [
  'networking-summary',
  'networking-addresses',
  'networking-routes',
  'networking-interfaces',
  'networking-bandwidth',
  'networking-charts',
];

const tableOf = (page, name) => frameOf(page).locator(`[data-panel="networking-${name}"]`);

const summaryOf = page => frameOf(page).locator('[data-panel="networking-summary"]');

const interfaceCharts = page =>
  frameOf(page).locator('[data-panel="networking-interface-charts"] [data-chart]');

const overviewLink = page => page.locator('[data-panel="interfaces"] [data-link="networking"]');

const panelOf = page => page.locator('.navbar-search-panel');

const columnGroups = page =>
  panelOf(page)
    .locator('.navbar-search-group')
    .filter({ has: page.locator('.navbar-search-group-label', { hasText: /· Columns$/u }) });

Given('the stream answers the networking {word} frames', async ({ page }, name) => {
  await page.route('**/api/events**', route =>
    route.fulfill({
      status: 200,
      headers: STREAM_HEADERS,
      body: fs.readFileSync(path.join(STREAM_DIR, `${name}.sse`), 'utf8'),
    })
  );
});

When("I follow the overview's networking link", async ({ page }) => {
  await overviewLink(page).click();
});

When('I search the networking page for {string}', async ({ page }, text) => {
  await page.locator('.navbar-search input[type="search"]').fill(text);
});

When('I open the filter panel', async ({ page }) => {
  await page.locator('.navbar-search-tool[aria-pressed]').click();
  await expect(panelOf(page)).toBeVisible();
});

When('I toggle the filter pill {string}', async ({ page }, value) => {
  await panelOf(page)
    .locator('.navbar-search-pills [role="button"]')
    .filter({ hasText: new RegExp(`^${value} \\(`, 'u') })
    .first()
    .click();
});

When(
  'I toggle column {int} of the Columns group of the {string} table',
  async ({ page }, column, name) => {
    const title = await tableOf(page, name).locator('h5').first().innerText();
    await columnGroups(page)
      .filter({ has: page.locator('.navbar-search-group-label', { hasText: title.trim() }) })
      .first()
      .locator('.navbar-search-pills [role="button"]')
      .nth(column - 1)
      .click();
  }
);

When('I toggle column {int} of Columns group {int}', async ({ page }, column, group) => {
  await columnGroups(page)
    .nth(group - 1)
    .locator('.navbar-search-pills [role="button"]')
    .nth(column - 1)
    .click();
});

When('I pick the networking chart window {string}', async ({ page }, value) => {
  await frameOf(page).locator('select[name="window"]').selectOption(value);
});

When('I order the interface charts by {string}', async ({ page }, value) => {
  await frameOf(page).locator('select[name="chart-sort"]').selectOption(value);
});

When(
  'I sort the {string} table of the networking page by {string}',
  async ({ page }, name, column) => {
    await tableOf(page, name).locator(`thead th.col-${column} button`).first().click();
  }
);

When(
  'I add {string} to the sort of the {string} table of the networking page',
  async ({ page }, column, name) => {
    await tableOf(page, name)
      .locator(`thead th.col-${column} button`)
      .first()
      .click({ modifiers: ['Shift'] });
  }
);

When('I reset the sort of the {string} table of the networking page', async ({ page }, name) => {
  await tableOf(page, name).locator('[data-tool="reset-sort"]').click();
});

When('I fold the {string} section of the networking page', async ({ page }, name) => {
  await frameOf(page)
    .locator(
      `[data-panel="networking-${name}"] [data-tool="fold"], [data-panel="networking-${name}"] .section-card-chevron`
    )
    .first()
    .click();
});

When('I load the page again', async ({ page }) => {
  await page.reload();
});

Then('the networking page draws its frame', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
});

Then('the networking page draws no monitoring table and no chart', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(
    frameOf(page).locator(MONITORING_PANELS.map(panel => `[data-panel="${panel}"]`).join(', '))
  ).toHaveCount(0);
  await expect(frameOf(page).locator('[data-chart]')).toHaveCount(0);
});

Then('the networking page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the networking route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="host-section-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(page.locator('.card .alert-info')).toHaveCount(0);
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the networking page draws the {string} table', async ({ page }, name) => {
  await expect(tableOf(page, name)).toBeVisible();
});

Then('the networking page draws no {string} table', async ({ page }, name) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(tableOf(page, name)).toHaveCount(0);
});

Then(
  'the {string} table of the networking page lists {int} rows',
  async ({ page }, name, count) => {
    await expect(tableOf(page, name)).toBeVisible();
    await expect(tableOf(page, name).locator('tbody tr')).toHaveCount(count);
  }
);

Then(
  'the {string} table of the networking page draws the {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(1);
  }
);

Then(
  'the {string} table of the networking page draws no {string} column',
  async ({ page }, name, column) => {
    await expect(tableOf(page, name).locator('thead th').first()).toBeVisible();
    await expect(tableOf(page, name).locator(`thead th.col-${column}`)).toHaveCount(0);
  }
);

Then('the {string} table of the networking page says {string}', async ({ page }, name, state) => {
  await expect(tableOf(page, name)).toHaveAttribute('data-state', state);
  await expect(tableOf(page, name).locator('.empty-state')).toBeVisible();
  await expect(tableOf(page, name).locator('table')).toHaveCount(0);
});

Then(
  'the {string} table of the networking page draws {string} in its {string} column',
  async ({ page }, name, text, column) => {
    const cells = tableOf(page, name).locator(`tbody td.col-${column}`);
    await expect(cells.getByText(text, { exact: true })).toHaveCount(1);
  }
);

Then(
  'the {string} table of the networking page draws no {string} in its {string} column',
  async ({ page }, name, text, column) => {
    const cells = tableOf(page, name).locator(`tbody td.col-${column}`);
    await expect(cells.first()).toBeVisible();
    await expect(cells.getByText(text, { exact: true })).toHaveCount(0);
  }
);

Then(
  'the first row of the {string} table of the networking page reads {string}',
  async ({ page }, name, text) => {
    await expect(tableOf(page, name).locator('tbody tr').first()).toContainText(text);
  }
);

Then(
  'the {string} table of the networking page marks a sort by several columns',
  async ({ page }, name) => {
    await expect(tableOf(page, name).locator('[data-note="multi-sort"]')).toBeVisible();
  }
);

Then('the {string} section of the networking page is folded', async ({ page }, name) => {
  const section = frameOf(page).locator(`[data-panel="networking-${name}"]`);
  await expect(section).toHaveAttribute('data-folded', 'true');
  await expect(section.locator('table')).toHaveCount(0);
  await expect(section.locator('[data-chart]')).toHaveCount(0);
  await expect(section.locator('[data-counts="interfaces"]')).toBeHidden();
});

Then('the {string} section of the networking page is open', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="networking-${name}"]`)).toHaveAttribute(
    'data-folded',
    'false'
  );
});

Then('the network summary is the first section of the networking page', async ({ page }) => {
  await expect(summaryOf(page)).toBeVisible();
  await expect(frameOf(page).locator('[data-panel]').first()).toHaveAttribute(
    'data-panel',
    'networking-summary'
  );
});

Then('the networking page draws no network summary', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(summaryOf(page)).toHaveCount(0);
});

Then(
  'the network summary counts {int} in all, {int} physical, {int} virtual, {int} up and {int} down',
  async ({ page }, total, physical, virtual, up, down) => {
    const counts = summaryOf(page).locator('[data-counts="interfaces"]');
    await expect(counts).toHaveAttribute('data-total', String(total));
    await expect(counts).toHaveAttribute('data-physical', String(physical));
    await expect(counts).toHaveAttribute('data-virtual', String(virtual));
    await expect(counts).toHaveAttribute('data-up', String(up));
    await expect(counts).toHaveAttribute('data-down', String(down));
    await expect(counts.locator('[data-count] .badge')).toHaveCount(10);
  }
);

Then('the zone {string} of an interface opens {string}', async ({ page }, zone, href) => {
  const link = tableOf(page, 'interfaces')
    .locator('td.col-zone [data-link="zone"]')
    .filter({ hasText: zone })
    .first();
  await expect(link).toHaveAttribute('href', href);
});

Then('the zone {string} of an interface is plain text', async ({ page }, zone) => {
  const cell = tableOf(page, 'interfaces').locator('td.col-zone');
  await expect(cell.locator('[data-zone="plain"]').filter({ hasText: zone })).toBeVisible();
  await expect(cell.locator('a')).toHaveCount(0);
});

Then('the first interface chart is {string}', async ({ page }, name) => {
  await expect(interfaceCharts(page).first()).toHaveAttribute('data-chart', `interface:${name}`);
});

Then('the networking page draws {int} interface charts', async ({ page }, count) => {
  await expect(interfaceCharts(page)).toHaveCount(count);
});

Then("the overview's networking link opens {string}", async ({ page }, href) => {
  await expect(page.locator('[data-panel="interfaces"]')).toBeVisible();
  await expect(overviewLink(page)).toHaveAttribute('href', href);
});

Then('the page draws no key of hyperweaver-ui in place of its text', async ({ page }) => {
  await expect(page.locator('.list.row').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(RAW_KEY);
});
