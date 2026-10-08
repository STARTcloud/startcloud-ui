import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const SETTLE_MS = 750;

const navigationsOf = page => page.evaluate(() => window.__navigations || []);

Given("the page's navigations are watched", async ({ page }) => {
  await page.addInitScript(() => {
    window.__navigations = [];
    const record = url => {
      if (url !== undefined && url !== null) {
        window.__navigations.push(new URL(String(url), window.location.href).pathname);
      }
    };
    const { pushState, replaceState } = window.history;
    window.history.pushState = function pushRecorded(state, title, url) {
      record(url);
      return pushState.call(this, state, title, url);
    };
    window.history.replaceState = function replaceRecorded(state, title, url) {
      record(url);
      return replaceState.call(this, state, title, url);
    };
  });
});

When("I press the account menu's admin board", async ({ page }) => {
  await page.locator('.user-menu .dropdown-menu.show a[href="/admin"]').click();
});

Then('the pathname is {string}', async ({ page }, pathname) => {
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
});

Then('the page navigated to {string} {int} times', async ({ page }, pathname, count) => {
  await page.waitForTimeout(SETTLE_MS);
  const moves = await navigationsOf(page);
  expect(moves.filter(move => move === pathname)).toHaveLength(count);
});

Then('no {word} to {string} carried the header {string}', ({ host }, method, pathname, header) => {
  const calls = host.answered(method, pathname);
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.some(call => Boolean(call.headers[header.toLowerCase()]))).toBe(false);
});

Then('the page draws the sign-in placard', async ({ page }) => {
  await expect(page.locator('.app-scroll .sign-in').first()).toBeVisible();
});

Then('the header draws the action menu', async ({ page }) => {
  await expect(page.locator('.action-menu').first()).toBeVisible();
});

Then('the chrome draws no sidebar', async ({ page }) => {
  await expect(page.locator('.App')).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
});

Then('the account menu offers no API reference row', async ({ page }) => {
  const menu = page.locator('.user-menu .dropdown-menu.show');
  await expect(menu).toBeVisible();
  await expect(menu.locator('a[href="/api-docs"]')).toHaveCount(0);
});

Then('the chrome draws the sidebar row {string}', async ({ page }, label) => {
  await expect(
    page.locator('.sidebar [data-sidebar-row]').filter({ hasText: label }).first()
  ).toBeVisible();
});
