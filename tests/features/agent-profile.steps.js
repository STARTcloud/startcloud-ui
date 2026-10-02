import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const menuOf = page => page.locator('.user-menu .dropdown-menu.show');

const cardOf = page => menuOf(page).locator('.user-card');

const notificationsRowOf = page =>
  menuOf(page).locator('button.dropdown-item:not(.text-danger)').first();

const modalOf = page => page.locator('.notifications-modal');

const recordOf = page => page.locator('.tab-content');

Given('the browser may show notifications', async ({ page }) => {
  await page.context().grantPermissions(['notifications']);
});

When("I press the account menu's Notifications row", async ({ page }) => {
  await notificationsRowOf(page).click();
  await expect(modalOf(page)).toBeVisible();
});

When('I turn the push switch on', async ({ page }) => {
  await modalOf(page).locator('#push-switch').click({ force: true });
});

Then(
  'the account menu draws the person {string} with the email {string}',
  async ({ page }, name, email) => {
    await expect(cardOf(page)).toContainText(name);
    await expect(cardOf(page)).toContainText(email);
  }
);

Then("the account menu's profile row opens {string}", async ({ page }, href) => {
  await expect(cardOf(page)).toHaveAttribute('href', href);
});

Then('the account menu offers the favorite {string} at {string}', async ({ page }, label, home) => {
  await expect(menuOf(page).locator(`a[href="${home}"]`)).toContainText(label);
});

Then("the account menu's Notifications row carries the count {int}", async ({ page }, count) => {
  await expect(notificationsRowOf(page).locator('.badge')).toHaveText(String(count));
});

Then('the account menu offers no Notifications row', async ({ page }) => {
  await expect(menuOf(page)).toBeVisible();
  await expect(menuOf(page).locator('button.dropdown-item:not(.text-danger)')).toHaveCount(0);
});

Then('the inbox page lists {int} rows', async ({ page }, count) => {
  await expect(page.locator('.page-column .items-table tbody tr')).toHaveCount(count);
});

Then('the notifications modal lists {int} rows', async ({ page }, count) => {
  await expect(modalOf(page).locator('.notification-row')).toHaveCount(count);
});

Then('the push switch stays off with its feedback', async ({ page }) => {
  await expect(modalOf(page).locator('small.text-danger')).toBeVisible();
  await expect(modalOf(page).locator('#push-switch')).not.toBeChecked();
});

When('I pick {string} in the profile select {string}', async ({ page }, value, id) => {
  await recordOf(page).locator(`[id="${id}"]`).selectOption(value);
});

Then('the profile page draws the editable preferences', async ({ page }) => {
  await expect(recordOf(page).locator('#profile-preferences-mode')).toBeEnabled();
  await expect(recordOf(page).locator('button[type="submit"]')).toBeVisible();
});

Then('the profile page draws its record read-only', async ({ page }) => {
  await expect(recordOf(page).locator('input[readonly]').first()).toBeVisible();
  await expect(recordOf(page).locator('button[type="submit"]')).toHaveCount(0);
});

Then('the profile page draws the Manage link to {string}', async ({ page }, href) => {
  await expect(recordOf(page).locator(`a[href="${href}"][target="_blank"]`)).toBeVisible();
});

Then('the profile page draws no Manage link', async ({ page }) => {
  await expect(recordOf(page).locator('input[readonly]').first()).toBeVisible();
  await expect(recordOf(page).locator('a[target="_blank"]')).toHaveCount(0);
});
