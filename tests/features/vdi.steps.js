import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const STATUS_LABELS = {
  healthy: 'Healthy',
  cifs_broken: 'CIFS',
  icons_missing: 'Icons',
  stale: 'Stale',
  no_user: 'session',
};

const fleetOf = page => page.locator('[data-page="fleet"]');

const panelOf = page => page.locator('.navbar-search-panel');

const actionOf = (page, key) => panelOf(page).locator(`[data-panel-action="${key}"]`);

const crumbsOf = page => page.locator('.navbar .crumb');

const popoverOf = page => page.locator('#health-popover');

Then('the fleet page draws no toolbar', async ({ page }) => {
  await expect(fleetOf(page)).toBeVisible();
  await expect(fleetOf(page).locator('.btn', { hasText: /^(?:JSON|CSV)$/u })).toHaveCount(0);
  await expect(fleetOf(page).locator('[data-note="fleet-count"]')).toBeVisible();
});

Then('the fleet page draws no stream line', async ({ page }) => {
  await expect(fleetOf(page).locator('[data-note="fleet-count"]')).toBeVisible();
  await expect(fleetOf(page).locator('[data-stream]')).toHaveCount(0);
});

Then('the fleet count reads {string}', async ({ page }, text) => {
  await expect(fleetOf(page).locator('[data-note="fleet-count"]')).toHaveText(text);
});

Then('the filter panel offers the action {string}', async ({ page }, key) => {
  await expect(actionOf(page, key)).toBeVisible();
});

Then('the filter panel offers no action {string}', async ({ page }, key) => {
  await expect(panelOf(page).locator('.navbar-search-foot')).toBeVisible();
  await expect(actionOf(page, key)).toHaveCount(0);
});

When("I open the filter panel's action {string}", async ({ page }, key) => {
  await actionOf(page, key).click();
});

When("I press the filter panel's action {string}", async ({ page }, key) => {
  await actionOf(page, key).click();
});

Then(
  "the filter panel's action {string} offers the choice {string}",
  async ({ page }, key, choice) => {
    await expect(
      actionOf(page, key).locator('..').locator(`[data-panel-choice="${choice}"]`)
    ).toBeVisible();
  }
);

Then('the fleet table draws {int} open rows', async ({ page }, count) => {
  await expect(fleetOf(page).locator('tbody tr.detail-row')).toHaveCount(count);
});

When('I sort the fleet table by {string}', async ({ page }, column) => {
  await fleetOf(page).locator(`thead th.col-${column} button`).first().click();
});

When('I press the status card {string}', async ({ page }, key) => {
  await fleetOf(page)
    .locator('.fleet-card', { hasText: STATUS_LABELS[key] || key })
    .first()
    .click();
});

Then(
  'the swap cell of {string} reads {string} as {string}',
  async ({ page }, host, text, state) => {
    const cell = fleetOf(page).locator('tbody tr', { hasText: host }).locator('[data-swap]');
    await expect(cell).toHaveText(text);
    await expect(cell).toHaveAttribute('data-swap', state);
  }
);

Then('the fleet card {string} reads {string}', async ({ page }, label, text) => {
  await expect(
    fleetOf(page).locator('.fleet-card', { hasText: label }).locator('.fleet-card-ratio')
  ).toHaveText(text);
});

When('I press the pool card {string}', async ({ page }, name) => {
  await fleetOf(page).locator('.fleet-card', { hasText: name }).first().click();
});

Then('the crumbs read {string}', async ({ page }, text) => {
  await expect
    .poll(() =>
      crumbsOf(page).evaluateAll(nodes => nodes.map(node => node.innerText.trim()).join(' › '))
    )
    .toBe(text);
});

Then('the crumb {string} links to {string}', async ({ page }, label, to) => {
  await expect(crumbsOf(page).filter({ hasText: label }).first()).toHaveAttribute('href', to);
});

When('I follow the crumb {string}', async ({ page }, label) => {
  await crumbsOf(page).filter({ hasText: label }).first().click();
});

When('I hover the footer heart', async ({ page }) => {
  await page.locator('.footer .cursor-pointer').first().hover();
  await expect(popoverOf(page)).toBeVisible();
});

Then("the heart's popover stream reads {string}", async ({ page }, state) => {
  await expect(popoverOf(page).locator('[data-note="health-stream"]')).toHaveAttribute(
    'data-stream',
    state
  );
});

Then("the heart's popover names the last event", async ({ page }) => {
  await expect(popoverOf(page).locator('[data-note="health-stream"]')).toContainText('last event');
});

Then("the heart's popover draws no stream line", async ({ page }) => {
  await expect(popoverOf(page)).toBeVisible();
  await expect(popoverOf(page).locator('[data-note="health-stream"]')).toHaveCount(0);
});

Then("the heart's popover lists the tool {string} as {string}", async ({ page }, name, version) => {
  await expect(popoverOf(page).locator(`[data-tool="${name}"]`)).toContainText(version);
});

Then("the heart's popover lists the tool {string} as present", async ({ page }, name) => {
  const row = popoverOf(page).locator(`[data-tool="${name}"]`);
  await expect(row).toBeVisible();
  await expect(row).not.toHaveClass(/text-body-secondary/u);
});

Then("the heart's popover lists the tool {string} as missing", async ({ page }, name) => {
  await expect(popoverOf(page).locator(`[data-tool="${name}"]`)).toHaveClass(
    /text-body-secondary/u
  );
});

Then("the heart's popover names the host {string} as {string}", async ({ page }, fact, value) => {
  await expect(popoverOf(page).locator(`[data-host-fact="${fact}"]`)).toContainText(value);
});

Then("the heart's popover notes {string}", async ({ page }, code) => {
  await expect(popoverOf(page).locator(`[data-note-code="${code}"]`)).toBeVisible();
});
