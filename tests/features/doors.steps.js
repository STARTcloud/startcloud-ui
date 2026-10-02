import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const hostTabs = page => page.locator('[data-tabs="host"] .nav-tabs');

const tabOf = (page, key) => hostTabs(page).locator(`[data-tab="${key}"]`);

const hostRow = (page, label) =>
  page.locator('.sidebar-tree [data-sidebar-row]').filter({ hasText: label }).first();

const childrenOf = (page, label) =>
  hostRow(page, label).locator(
    'xpath=following-sibling::div[contains(@class,"sidebar-children")][1]'
  );

const pageRows = (page, label) =>
  childrenOf(page, label).locator(
    ':scope > [data-sidebar-row]:has(.sidebar-row-icon):not(:has(.sidebar-dot))'
  );

const machineRows = (page, label) =>
  childrenOf(page, label).locator(':scope > [data-sidebar-row]:has(.sidebar-dot)');

const consoleTabs = page => page.locator('.nav-tabs [data-tab]');

When('I follow the host tab {string}', async ({ page }, key) => {
  await tabOf(page, key).click();
});

When('I open the tree node {string}', async ({ page }, label) => {
  await hostRow(page, label).click();
});

When('I pick the tree menu row {string}', async ({ page }, row) => {
  await page.locator(`.sidebar-menu [data-menu-row="${row}"]`).click();
});

When('I pick the console tab {string}', async ({ page }, key) => {
  await page.locator(`.nav-tabs [data-tab="${key}"]`).click();
});

Then('the host tab row draws {int} tabs', async ({ page }, count) => {
  await expect(hostTabs(page)).toBeVisible();
  await expect(hostTabs(page).locator('[data-tab]')).toHaveCount(count);
});

Then('the host tab row draws the {string} tab to {string}', async ({ page }, key, href) => {
  await expect(tabOf(page, key)).toHaveAttribute('href', href);
  await expect(tabOf(page, key).locator('svg')).toHaveCount(1);
});

Then('the host tab row draws no {string} tab', async ({ page }, key) => {
  await expect(hostTabs(page)).toBeVisible();
  await expect(tabOf(page, key)).toHaveCount(0);
});

Then('the host tab {string} is the active one', async ({ page }, key) => {
  await expect(tabOf(page, key)).toHaveClass(/active/u);
  await expect(hostTabs(page).locator('.nav-link.active')).toHaveCount(1);
});

Then('the page draws no host tab row', async ({ page }) => {
  await expect(page.locator('.list.row').first()).toBeVisible();
  await expect(page.locator('[data-tabs="host"]')).toHaveCount(0);
});

Then(
  'the tree draws {int} page rows under the tree node {string}',
  async ({ page }, count, label) => {
    await expect(childrenOf(page, label)).toBeVisible();
    await expect(pageRows(page, label)).toHaveCount(count);
  }
);

Then(
  'the tree draws {int} machine rows under the tree node {string}',
  async ({ page }, count, label) => {
    await expect(childrenOf(page, label)).toBeVisible();
    await expect(machineRows(page, label)).toHaveCount(count);
  }
);

Then('the Controls menu opens the host overview at {string}', async ({ page }, pathname) => {
  await page.locator('.action-menu [data-action="view-host"]').click();
  await expect(page).toHaveURL(new RegExp(`${pathname}$`, 'u'));
});

Then('the console tab strip draws {int} tabs as buttons', async ({ page }, count) => {
  await expect(consoleTabs(page)).toHaveCount(count);
  await expect(page.locator('.nav-tabs button.nav-link')).toHaveCount(count);
  await expect(page.locator('.nav-tabs a.nav-link')).toHaveCount(0);
});

Then('the console tab {string} is the active one', async ({ page }, key) => {
  await expect(page.locator(`.nav-tabs [data-tab="${key}"]`)).toHaveClass(/active/u);
  await expect(page.locator('.nav-tabs .nav-link.active')).toHaveCount(1);
});

Then('the console tab {string} carries the count {int}', async ({ page }, key, count) => {
  await expect(page.locator(`.nav-tabs [data-tab="${key}"] .badge.bg-warning`)).toHaveText(
    String(count)
  );
});

Then('the console tab {string} carries no count', async ({ page }, key) => {
  await expect(page.locator(`.nav-tabs [data-tab="${key}"]`)).toBeVisible();
  await expect(page.locator(`.nav-tabs [data-tab="${key}"] .badge`)).toHaveCount(0);
});
