import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const NAV_KEY = /\bhosts\.nav\.[a-zA-Z]+/u;

const hostNav = page => page.locator('[data-nav="host"]');

const rowOf = (page, key) => hostNav(page).locator(`[data-nav-page="${key}"]`);

const groupOf = (page, key) => hostNav(page).locator(`[data-nav-group="${key}"]`);

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

When('I follow the host row {string}', async ({ page }, key) => {
  await rowOf(page, key).click();
});

When('I fold the host group {string}', async ({ page }, key) => {
  await groupOf(page, key).locator('.host-nav-caret').click();
});

When('I collapse the host column', async ({ page }) => {
  await hostNav(page).locator('[data-nav-tool="collapse"]').click();
});

When('I expand the host column', async ({ page }) => {
  await hostNav(page).locator('[data-nav-tool="expand"]').click();
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

Then('the host column draws {int} page rows', async ({ page }, count) => {
  await expect(hostNav(page)).toBeVisible();
  await expect(hostNav(page).locator('[data-nav-page]')).toHaveCount(count);
});

Then('the host column draws the {string} row to {string}', async ({ page }, key, href) => {
  await expect(rowOf(page, key)).toHaveAttribute('href', href);
  await expect(rowOf(page, key).locator('svg')).toHaveCount(1);
});

Then('the host column draws no {string} row', async ({ page }, key) => {
  await expect(rowOf(page, 'overview')).toBeVisible();
  await expect(rowOf(page, key)).toHaveCount(0);
});

Then('the host column draws the {string} group', async ({ page }, key) => {
  await expect(groupOf(page, key)).toBeVisible();
  await expect(groupOf(page, key).locator('.host-nav-caret')).toBeVisible();
});

Then('the host column draws no {string} group', async ({ page }, key) => {
  await expect(rowOf(page, 'overview')).toBeVisible();
  await expect(groupOf(page, key)).toHaveCount(0);
});

Then('the host column draws the groups {string}', async ({ page }, list) => {
  await expect(rowOf(page, 'overview')).toBeVisible();
  const keys = await hostNav(page)
    .locator('[data-nav-group]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-nav-group')));
  expect(keys).toEqual(list ? list.split(',').map(key => key.trim()) : []);
});

Then('the host column draws the rows {string}', async ({ page }, list) => {
  await expect(rowOf(page, 'overview')).toBeVisible();
  const keys = await hostNav(page)
    .locator('[data-nav-page]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-nav-page')));
  expect(keys).toEqual(list.split(',').map(key => key.trim()));
});

Then('the host row {string} is the active one', async ({ page }, key) => {
  await expect(rowOf(page, key)).toHaveClass(/active/u);
  await expect(hostNav(page).locator('.host-nav-row.active')).toHaveCount(1);
});

Then('the host group {string} is folded', async ({ page }, key) => {
  await expect(groupOf(page, key)).toHaveAttribute('aria-expanded', 'false');
  await expect(groupOf(page, key)).toHaveAttribute('data-folded', '');
});

Then('the host group {string} is open', async ({ page }, key) => {
  await expect(groupOf(page, key)).toHaveAttribute('aria-expanded', 'true');
});

Then('the host column is a rail', async ({ page }) => {
  await expect(page.locator('[data-nav="host"][data-rail]')).toBeVisible();
  await expect(hostNav(page).locator('.host-nav-top-label')).toHaveCount(0);
  await expect(hostNav(page).locator('[data-nav-group]')).toHaveCount(0);
  await expect(hostNav(page).locator('[data-nav-tool="expand"]')).toBeVisible();
});

Then('the host column is open', async ({ page }) => {
  await expect(hostNav(page)).toBeVisible();
  await expect(page.locator('[data-nav="host"][data-rail]')).toHaveCount(0);
  await expect(hostNav(page).locator('.host-nav-top-label')).toBeVisible();
  await expect(hostNav(page).locator('[data-nav-tool="collapse"]')).toBeVisible();
});

Then('the host column draws its resize handle', async ({ page }) => {
  await expect(hostNav(page).locator('[data-nav-tool="resize"]')).toHaveAttribute(
    'aria-valuemin',
    '160'
  );
  await expect(hostNav(page).locator('[data-nav-tool="resize"]')).toHaveAttribute(
    'aria-valuemax',
    '360'
  );
});

Then('the host column draws no key of hyperweaver-ui in place of its text', async ({ page }) => {
  await expect(rowOf(page, 'overview')).toBeVisible();
  await expect(hostNav(page)).not.toContainText(NAV_KEY);
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
