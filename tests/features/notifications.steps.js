import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const badgeOf = page => page.locator('.user-menu-badge').first();

const modalOf = page => page.locator('.notifications-modal');

const menuOf = page => page.locator('.user-menu .dropdown-menu');

Given('the identity provider {string} answers no discovery', async ({ page }, origin) => {
  await page.route(`${origin}/.well-known/**`, route => route.abort('connectionrefused'));
});

Then('the avatar badge reads {int}', async ({ page }, count) => {
  await expect(badgeOf(page)).toHaveText(String(count));
});

Then('the avatar badge is hidden', async ({ page }) => {
  await expect(page.locator('.user-menu').first()).toBeVisible();
  await expect(page.locator('.user-menu-badge')).toHaveCount(0);
});

Then("the notifications modal's first row reads {string}", async ({ page }, title) => {
  await expect(modalOf(page).locator('.notification-row').first()).toContainText(title);
});

Then('the inbox page draws {int} unread rows', async ({ page }, count) => {
  await expect(
    page.locator('.page-column .items-table tbody tr .notification-item-dot')
  ).toHaveCount(count);
});

When("I press the account menu's Rebuild row", async ({ page }) => {
  await menuOf(page).locator('button.dropdown-item', { hasText: 'Rebuild catalog data' }).click();
});

Then("the account menu's Rebuild row runs", async ({ page }) => {
  await expect(
    menuOf(page).locator('button.dropdown-item', { hasText: 'Rebuild catalog data' })
  ).toBeDisabled();
});

Then("the account menu's Rebuild row is idle", async ({ page }) => {
  await expect(
    menuOf(page).locator('button.dropdown-item', { hasText: 'Rebuild catalog data' })
  ).toBeEnabled();
});
