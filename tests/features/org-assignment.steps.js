import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const assignmentOf = page => page.locator('[data-dialog="org-assignment"]');

const orgRowOf = (page, uuid) => assignmentOf(page).locator(`[data-org="${uuid}"]`);

When('I toggle the organization row {string}', async ({ page }, uuid) => {
  await orgRowOf(page, uuid).click();
});

When('I press {string} on the hosts page', async ({ page }, action) => {
  await page.locator(`[data-page="hosts"] [data-action="${action}"]`).first().click();
});

Then('the assignment switcher lists {int} organization rows', async ({ page }, count) => {
  await expect(assignmentOf(page).locator('[data-org]')).toHaveCount(count);
});

Then('the organization row {string} is selected', async ({ page }, uuid) => {
  await expect(orgRowOf(page, uuid)).toHaveClass(/border-primary/u);
});

Then('the organization row {string} is not selected', async ({ page }, uuid) => {
  await expect(orgRowOf(page, uuid)).toBeVisible();
  await expect(orgRowOf(page, uuid)).not.toHaveClass(/border-primary/u);
});

Then('the organization row {string} reads {string}', async ({ page }, uuid, text) => {
  await expect(orgRowOf(page, uuid).locator('.fw-bold')).toHaveText(text);
});

Then('the organization row {string} is held', async ({ page }, uuid) => {
  await expect(orgRowOf(page, uuid)).toBeDisabled();
});

Then("the assignment's Save is held", async ({ page }) => {
  await expect(assignmentOf(page).locator('.modal-footer [data-action="submit"]')).toBeDisabled();
});

Then('the assignment switcher draws no uuid input', async ({ page }) => {
  await expect(assignmentOf(page).locator('.modal-footer')).toBeVisible();
  await expect(assignmentOf(page).locator('input')).toHaveCount(0);
});
