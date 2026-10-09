import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const modalOf = page => page.locator('.shortcuts-modal');

const searchBox = page => page.locator('.navbar-search input[type="search"]');

When("I press the sidebar foot's keyboard button", async ({ page }) => {
  await page.locator('.sidebar-foot [data-tool="shortcuts"]').click();
});

When("I press the account menu's keyboard shortcuts row", async ({ page }) => {
  await page.locator('.user-menu .dropdown-menu.show [data-tool="shortcuts"]').click();
});

Then('the navbar search is folded', async ({ page }) => {
  await expect(page.locator('.navbar .cluster-btn:not(.sidebar-toggle)').first()).toBeVisible();
  await expect(searchBox(page)).toHaveCount(0);
});

Then('the navbar search box holds the focus', async ({ page }) => {
  await expect(searchBox(page)).toBeFocused();
});

Then('the navbar search box reads {string}', async ({ page }, text) => {
  await expect(searchBox(page)).toHaveValue(text);
});

Then('the shortcuts modal is open', async ({ page }) => {
  await expect(modalOf(page)).toBeVisible();
  await expect(modalOf(page).locator('.modal-title')).toHaveAttribute('id', /.+/u);
});

Then('no shortcuts modal is open', async ({ page }) => {
  await expect(modalOf(page)).toHaveCount(0);
});

Then("the shortcuts modal's filter holds the focus", async ({ page }) => {
  await expect(modalOf(page).locator('input[type="search"]')).toBeFocused();
});

Then('the shortcuts modal draws the categories {string}', async ({ page }, list) => {
  const sections = modalOf(page).locator('[data-category]');
  await expect(sections).toHaveCount(list.split(', ').length);
  const keys = await sections.evaluateAll(nodes => nodes.map(node => node.dataset.category));
  expect(keys.join(', ')).toBe(list);
});

Then('the shortcuts modal lists the shortcut {string}', async ({ page }, key) => {
  await expect(modalOf(page).locator(`[data-shortcut="${key}"] kbd`).first()).toBeVisible();
});

Then('the sidebar is expanded', async ({ page }) => {
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-rail/u);
});

Then('the sidebar is the rail', async ({ page }) => {
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar-rail/u);
});

Then('the path begins with {string}', async ({ page }, pathname) => {
  await expect(page).toHaveURL(
    new RegExp(`^[^/]+//[^/]+${pathname.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u')
  );
});
