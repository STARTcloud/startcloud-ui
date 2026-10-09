import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const wizardOf = page => page.locator('[data-dialog="machine-create"]');

const dialogOf = page => page.getByRole('dialog').last();

When('I follow the wizard step {string}', async ({ page }, step) => {
  await wizardOf(page).locator(`[data-list="create-steps"] [data-step="${step}"]`).click();
});

Then('the wizard is on the step {string}', async ({ page }, step) => {
  await expect(wizardOf(page)).toHaveAttribute('data-step', step);
});

Then("the wizard's image list offers {string}", async ({ page }, label) => {
  await expect(
    wizardOf(page).locator('#machine-setting-box option', { hasText: label })
  ).toHaveCount(1);
});

Then("the wizard's confirm rows include {string}", async ({ page }, text) => {
  await expect(wizardOf(page).locator('[data-list="confirm-rows"]')).toContainText(text);
});

Then('the open dialog draws the list {string}', async ({ page }, name) => {
  await expect(dialogOf(page).locator(`[data-list="${name}"]`)).toBeVisible();
});

Then('the open dialog draws no list {string}', async ({ page }, name) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[data-list="${name}"]`)).toHaveCount(0);
});

Then("the wizard's provisioner card reads {string}", async ({ page }, state) => {
  await expect(wizardOf(page).locator('[data-note="provisioner-install"]')).toHaveAttribute(
    'data-state',
    state
  );
});

Then("the wizard's box registry card reads {string}", async ({ page }, state) => {
  await expect(wizardOf(page).locator('[data-note="box-source"]')).toHaveAttribute(
    'data-state',
    state
  );
});

Then('the open dialog offers {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the open dialog offers no {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});
