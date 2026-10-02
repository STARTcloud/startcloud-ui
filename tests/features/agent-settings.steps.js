import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="agent-settings"]');

const dialogOf = page => page.getByRole('dialog').last();

const rawKeyOf = prefix => new RegExp(`\\b${prefix}\\.[a-zA-Z]+\\.[a-zA-Z]+`, 'u');

const tabOf = (page, key) => frameOf(page).locator(`.nav-tabs button[data-tab="${key}"]`);

When('I pick the agent settings tab {string}', async ({ page }, key) => {
  await tabOf(page, key).click();
});

When('I confirm the open delete dialog with {string}', async ({ page }, keyword) => {
  const dialog = dialogOf(page);
  await dialog.getByRole('textbox').fill(keyword);
  await dialog.locator('.modal-footer .btn-danger').click();
});

When("I press the agent settings page's {string} action", async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I type {string} into the agent settings field {string}', async ({ page }, text, id) => {
  await frameOf(page).locator(`[id="${id}"]`).fill(text);
});

When('I press {string} on the dialog row {string}', async ({ page }, action, text) => {
  await dialogOf(page)
    .locator('tbody tr')
    .filter({ hasText: text })
    .first()
    .locator(`[data-action="${action}"]`)
    .click();
});

Then('the agent settings page draws its frame', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
});

Then('the agent settings page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the agent settings route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="agent-settings-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the agent settings page says a super-admin is required', async ({ page }) => {
  await expect(
    page.locator('[data-page="agent-settings-denied"] [data-note="access-denied"]')
  ).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the agent settings tab {string} is shown', async ({ page }, key) => {
  await expect(frameOf(page).locator(`[data-settings-tab="${key}"]`)).toBeVisible();
  await expect(tabOf(page, key)).toHaveClass(/active/u);
});

Then('the agent settings page offers the tab {string}', async ({ page }, key) => {
  await expect(tabOf(page, key)).toBeVisible();
});

Then('the first secret entry is named {string}', async ({ page }, name) => {
  await expect(
    frameOf(page).locator('[data-panel="secrets"] input[type="text"]').first()
  ).toHaveValue(name);
});

Then('the agent settings page draws the {string} panel', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});

Then('the agent settings page notes {string}', async ({ page }, note) => {
  await expect(frameOf(page).locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the agent settings page notes no {string}', async ({ page }, note) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the agent settings page offers {string}', async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the agent settings field {string} reads {string}', async ({ page }, id, value) => {
  await expect(frameOf(page).locator(`[id="${id}"]`)).toHaveValue(value);
});

Then('the page draws no key under {string}', async ({ page }, prefix) => {
  await expect(page.locator('.list.row, h1').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(rawKeyOf(prefix));
});
