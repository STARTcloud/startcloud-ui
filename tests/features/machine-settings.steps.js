import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const settingsOf = page => page.locator('[data-settings]');

const viewOf = page => page.locator('[data-view="machine-settings"]');

const settingsTab = (page, key) => settingsOf(page).locator(`.nav-tabs [data-tab="${key}"]`);

const dialogOf = page => page.getByRole('dialog').last();

const credentialRowsOf = page =>
  settingsOf(page).locator('[data-list="credentials"] [data-credential-row]');

const credentialOf = (page, id) =>
  settingsOf(page).locator(`[data-list="credentials"] [data-credential="${id}"]`);

const zoneDiskOf = (page, name) =>
  settingsOf(page).locator(`[data-editor="storage-devices"] [data-zone-disk="${name}"]`);

When('I pick the settings tab {string}', async ({ page }, key) => {
  await settingsTab(page, key).click();
});

When('I type {string} into the settings field {string}', async ({ page }, text, id) => {
  await settingsOf(page).locator(`[id="${id}"]`).fill(text);
});

When("I press the settings page's {string} action", async ({ page }, action) => {
  await settingsOf(page).locator(`[data-action="${action}"]`).click();
});

When('I press {string} on the zone disk {string}', async ({ page }, action, name) => {
  await zoneDiskOf(page, name).locator(`[data-action="${action}"]`).click();
});

When('I press the {string} action of the last credential', async ({ page }, action) => {
  await credentialRowsOf(page).last().locator(`[data-action="${action}"]`).click();
});

When('I flip the default of the credential {string}', async ({ page }, id) => {
  await credentialOf(page, id).locator('[data-action="credential-default"]').click();
});

Then('the credentials tab lists {int} credentials', async ({ page }, count) => {
  await expect(settingsOf(page).locator('[data-action="credential-add"]')).toBeVisible();
  await expect(credentialRowsOf(page)).toHaveCount(count);
});

Then('the credential {string} names {string}', async ({ page }, id, name) => {
  await expect(credentialOf(page, id).locator('[data-credential-pick] code')).toHaveText(name);
});

Then('the credential {string} is the default', async ({ page }, id) => {
  await expect(credentialOf(page, id).locator('[data-action="credential-default"]')).toBeChecked();
});

When('I press the preset {string}', async ({ page }, preset) => {
  await dialogOf(page).locator(`[data-preset="${preset}"]`).click();
});

Then('the settings page draws', async ({ page }) => {
  await expect(settingsOf(page)).toBeVisible();
});

Then('the page draws no settings view', async ({ page }) => {
  await expect(page.locator('[data-page="machine"]')).toBeVisible();
  await expect(viewOf(page)).toHaveCount(0);
});

Then('the settings tabs offer {string}', async ({ page }, key) => {
  await expect(settingsTab(page, key)).toBeVisible();
});

Then('the settings tabs offer no {string}', async ({ page }, key) => {
  await expect(settingsTab(page, 'general')).toBeVisible();
  await expect(settingsTab(page, key)).toHaveCount(0);
});

Then('the settings page notes {string}', async ({ page }, note) => {
  await expect(settingsOf(page).locator(`[data-note="${note}"]`)).toBeVisible();
});

Then('the settings page notes no {string}', async ({ page }, note) => {
  await expect(settingsOf(page)).toBeVisible();
  await expect(settingsOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the settings page lists {int} resource issue(s)', async ({ page }, count) => {
  await expect(settingsOf(page).locator('[data-list="resource-issues"] li')).toHaveCount(count);
});

Then('the storage editor lists {int} zone disks', async ({ page }, count) => {
  await expect(
    settingsOf(page).locator('[data-editor="storage-devices"] [data-zone-disk]')
  ).toHaveCount(count);
});

Then('the guest output reads exit {int}', async ({ page }, code) => {
  await expect(dialogOf(page).locator(`[data-guest-output="${code}"]`)).toBeVisible();
});
