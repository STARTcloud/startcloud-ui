import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const WHEN_ID = 'profile-preferences/sign_in_notices/when';
const CHANNELS_ID = 'profile-preferences/sign_in_notices/channels';

const sectionOf = page => page.locator('#sign-in-notices');

const whenOf = page => sectionOf(page).locator(`[data-tiles="${WHEN_ID}"]`);

const channelsOf = page => sectionOf(page).locator(`[data-tiles="${CHANNELS_ID}"]`);

const channelOf = (page, channel) => channelsOf(page).locator(`input[data-value="${channel}"]`);

const formOf = page => page.locator('form[data-panel="preferences"]');

const noteOf = (page, note) => page.locator(`[data-note="${note}"]`);

const settingOf = (page, pointer) => page.locator(`[id$="${pointer}"]`);

const valuesOf = options => options.map(option => option.value).filter(Boolean);

const choicesOf = async select => {
  const values = await select.locator('option').evaluateAll(valuesOf);
  return values.join(', ');
};

const pickedOf = tiles =>
  tiles.locator('input:checked').evaluateAll(inputs => inputs.map(input => input.dataset.value));

const offeredOf = tiles =>
  tiles.locator('input').evaluateAll(inputs => inputs.map(input => input.dataset.value));

When('I pick {string} in the sign-in notices when tiles', async ({ page }, value) => {
  await whenOf(page).locator(`label:has(input[data-value="${value}"])`).click();
});

When('I turn on the sign-in notices channel {string}', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).not.toBeChecked();
  await channelsOf(page).locator(`label:has(input[data-value="${channel}"])`).click();
});

When('I turn off the sign-in notices channel {string}', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).toBeChecked();
  await channelsOf(page).locator(`label:has(input[data-value="${channel}"])`).click();
});

When('I follow the preferences summary to its last problem', async ({ page }) => {
  await formOf(page).locator('.form-error-summary a').last().click();
});

When('I press Remove on the user record method {string}', async ({ page }, text) => {
  await page
    .locator('li.list-group-item')
    .filter({ hasText: text })
    .locator('[data-action="tfa-method-remove"]')
    .click();
});

When('I choose {string} for the setting at {string}', async ({ page }, value, pointer) => {
  await settingOf(page, pointer).selectOption(value);
});

When('I type {string} into the setting at {string}', async ({ page }, text, pointer) => {
  await settingOf(page, pointer).fill(text);
});

Then('the sign-in notices section draws', async ({ page }) => {
  await expect(sectionOf(page)).toBeVisible();
});

Then('no sign-in notices section draws', async ({ page }) => {
  await expect(page.locator('[data-action="save-preferences"]')).toBeVisible();
  await expect(sectionOf(page)).toHaveCount(0);
});

Then('the sign-in notices section sits in the General card', async ({ page }) => {
  const card = page.locator('.tab-pane > .card').first();
  await expect(card.locator('[data-action="save-preferences"]')).toBeVisible();
  await expect(card.locator('#sign-in-notices')).toBeVisible();
});

Then('the sign-in notices when tiles read {string}', async ({ page }, value) => {
  await expect.poll(() => pickedOf(whenOf(page)).then(list => list.join(', '))).toBe(value);
});

Then('the sign-in notices when tiles offer {string}', async ({ page }, values) => {
  await expect.poll(() => offeredOf(whenOf(page)).then(list => list.join(', '))).toBe(values);
});

Then('the sign-in notices channel {string} is on', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).toBeChecked();
});

Then('the sign-in notices channel {string} is off', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).not.toBeChecked();
});

Then('the sign-in notices channels are dimmed', async ({ page }) => {
  await expect(channelsOf(page)).toHaveClass(/pref-tiles-dim/);
  await expect(channelOf(page, 'email')).toBeDisabled();
});

Then('the sign-in notices section carries the default badge', async ({ page }) => {
  await expect(sectionOf(page).locator('[data-badge="sign-in-notices-default"]')).toBeVisible();
});

Then('the sign-in notices section carries no default badge', async ({ page }) => {
  await expect(whenOf(page)).toBeVisible();
  await expect(sectionOf(page).locator('[data-badge="sign-in-notices-default"]')).toHaveCount(0);
});

Then('the sign-in notices when tiles name an error', async ({ page }) => {
  const first = whenOf(page).locator('input').first();
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  await expect(first).toHaveAttribute('aria-errormessage', `${WHEN_ID}-error`);
  await expect(sectionOf(page).locator(`[id="${WHEN_ID}-error"]`)).toBeVisible();
});

Then('the sign-in notices when tiles name no error', async ({ page }) => {
  await expect(whenOf(page)).toBeVisible();
  await expect(whenOf(page).locator('input').first()).not.toHaveAttribute('aria-invalid');
});

Then('the sign-in notices channels name an error', async ({ page }) => {
  await expect(channelOf(page, 'email')).toHaveAttribute('aria-invalid', 'true');
  await expect(channelOf(page, 'in_app')).toHaveAttribute('aria-invalid', 'true');
  await expect(channelOf(page, 'push')).toHaveAttribute('aria-invalid', 'true');
  await expect(channelOf(page, 'email')).toHaveAttribute(
    'aria-errormessage',
    `${CHANNELS_ID}-error`
  );
  await expect(sectionOf(page).locator(`[id="${CHANNELS_ID}-error"]`)).toBeVisible();
});

Then('the sign-in notices channels name no error', async ({ page }) => {
  await expect(channelOf(page, 'email')).toBeAttached();
  await expect(channelOf(page, 'email')).not.toHaveAttribute('aria-invalid');
});

Then('the preferences summary lists {int} problem(s)', async ({ page }, count) => {
  await expect(formOf(page).locator('.form-error-summary li')).toHaveCount(count);
});

Then('the preferences summary links to no control', async ({ page }) => {
  await expect(formOf(page).locator('.form-error-summary li')).toHaveCount(1);
  await expect(formOf(page).locator('.form-error-summary a')).toHaveCount(0);
});

Then('the sign-in notices channel {string} holds the focus', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).toBeFocused();
});

Then('the user record notes {string}', async ({ page }, note) => {
  await expect(noteOf(page, note)).toBeVisible();
});

Then('the user record notes no {string}', async ({ page }, note) => {
  await expect(page.locator('[data-action="tfa-method-remove"]').first()).toBeVisible();
  await expect(noteOf(page, note)).toHaveCount(0);
});

Then('the setting at {string} is drawn', async ({ page }, pointer) => {
  await expect(settingOf(page, pointer)).toBeVisible();
});

Then('the setting at {string} is not drawn', async ({ page }, pointer) => {
  await expect(settingOf(page, '/outbound/proxy/mode')).toBeVisible();
  await expect(settingOf(page, pointer)).toHaveCount(0);
});

Then('the setting at {string} offers the choices {string}', async ({ page }, pointer, values) => {
  await expect.poll(() => choicesOf(settingOf(page, pointer))).toBe(values);
});

Then('the setting at {string} masks its value', async ({ page }, pointer) => {
  await expect(settingOf(page, pointer)).toHaveAttribute('type', 'password');
});

Then('the setting at {string} is a comma list', async ({ page }, pointer) => {
  await expect(settingOf(page, pointer)).toHaveAttribute('type', 'text');
  await expect(settingOf(page, pointer)).toHaveValue('');
});
