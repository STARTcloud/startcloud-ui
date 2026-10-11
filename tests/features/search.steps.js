import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const searchIcon = page => page.locator('.navbar [data-tool="search"]');

const searchBox = page => page.locator('.navbar-search input[type="search"]');

When('I type {string} in the navbar search box', async ({ page }, text) => {
  await searchBox(page).fill(text);
});

Then('the navbar draws the search icon', async ({ page }) => {
  await expect(searchIcon(page)).toBeVisible();
});

Then('the navbar draws no search icon', async ({ page }) => {
  await expect(page.locator('.navbar .cluster-btn:not(.sidebar-toggle)').first()).toBeVisible();
  await expect(searchIcon(page)).toHaveCount(0);
  await expect(page.locator('.navbar-search')).toHaveCount(0);
});

Then('the navbar search count reads {string}', async ({ page }, text) => {
  await expect(page.locator('.navbar-search-count')).toHaveText(text);
});
