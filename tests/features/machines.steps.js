import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

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
  await expect(panelOf(page, 'machine-info')).toBeVisible();
  await expect(machineOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then("the machine's {string} action is held", async ({ page }, action) => {
  await expect(machineOf(page).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the screenshot draws', async ({ page }) => {
  const image = panelOf(page, 'machine-screenshot').locator('img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
});

Then('the screenshot was read at {string} {int} times', async ({ page }, pathname, count) => {
  await expect.poll(() => framesOf(page).filter(path => path === pathname).length).toBe(count);
});

Then('the screenshot was never read', ({ page }) => {
  expect(framesOf(page)).toHaveLength(0);
});
