import { createBdd } from 'playwright-bdd';

import { expect, FixtureHost, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

let second = null;

const panelOf = page => page.locator('[data-panel="agent-sign-ins"]');

const storedOf = (page, key) => page.evaluate(name => window.localStorage.getItem(name), key);

When('I open {string} in a second tab', async ({ page, host }, pathname) => {
  [second] = await Promise.all([
    page.waitForEvent('popup'),
    page.evaluate(() => {
      window.open('', '_blank');
    }),
  ]);
  const mirror = new FixtureHost(second);
  await [...host.contracts]
    .reverse()
    .reduce((chain, { contract }) => chain.then(() => mirror.serve(contract)), Promise.resolve());
  await second.goto(pathname, { waitUntil: 'commit' });
});

Then('the second tab is closed', async () => {
  await expect.poll(() => second.isClosed()).toBe(true);
});

When("I press the sign-in page's {string} action", async ({ page }, action) => {
  await page.locator(`[data-action="${action}"]`).first().click();
});

When('I type {string} into the sign-in field {string}', async ({ page }, text, id) => {
  await page.locator(`[id="${id}"]`).fill(text);
});

When('I sign out from the account menu', async ({ page }) => {
  const menu = page.locator('.user-menu .dropdown-menu.show');
  if ((await menu.count()) === 0) {
    await page.locator('.user-menu > .nav-link').click();
  }
  await menu.locator('.text-danger').click();
});

Then('the sign-in page draws the agent sign-ins', async ({ page }) => {
  await expect(panelOf(page)).toBeVisible();
});

Then('the sign-in page draws no password form', async ({ page }) => {
  await expect(panelOf(page)).toBeVisible();
  await expect(page.locator('.auth-form')).toHaveCount(0);
});

Then('the sign-in page draws an {string} alert', async ({ page }, tone) => {
  await expect(panelOf(page).locator(`.auth-alert-${tone}`).first()).toBeVisible();
});

Then('the sign-in page shows the key {string}', async ({ page }, key) => {
  await expect(page.locator('[data-note="bootstrapped-key"] input')).toHaveValue(key);
});

Then('the sign-in page notes {string}', async ({ page }, note) => {
  await expect(page.locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the sign-in page notes no {string}', async ({ page }, note) => {
  await expect(page.locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the sign-in page offers {string}', async ({ page }, action) => {
  await expect(page.locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the sign-in page offers no {string}', async ({ page }, action) => {
  await expect(panelOf(page)).toBeVisible();
  await expect(page.locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then(
  'the host was sent {word} to {string} carrying the header {string} as {string}',
  async ({ host }, method, pathname, header, value) => {
    await expect
      .poll(() =>
        host.answered(method, pathname).some(call => call.headers[header.toLowerCase()] === value)
      )
      .toBe(true);
  }
);

Then('the address carries no fragment', async ({ page }) => {
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
});

Then('the tab stays open', ({ page }) => {
  expect(page.isClosed()).toBe(false);
});

Then('the chrome draws the account menu', async ({ page }) => {
  await expect(page.locator('.user-menu').first()).toBeVisible();
});

Then('the chrome draws the Sign in control', async ({ page }) => {
  await expect(page.locator('.sign-in').first()).toBeVisible();
  await expect(page.locator('.user-menu')).toHaveCount(0);
});

Then('the account menu offers the admin board', async ({ page }) => {
  await expect(page.locator('.user-menu .dropdown-menu.show a[href="/admin"]')).toBeVisible();
});

Then('the browser holds no {string}', async ({ page }, key) => {
  await expect.poll(() => storedOf(page, key)).toBeNull();
});

Then('the browser still holds {string}', async ({ page }, key) => {
  await expect.poll(() => storedOf(page, key)).not.toBeNull();
});

Then('the browser holds {string} carrying no {string}', async ({ page }, key, member) => {
  await expect.poll(() => storedOf(page, key)).not.toBeNull();
  expect(JSON.parse(await storedOf(page, key))).not.toHaveProperty(member);
});
