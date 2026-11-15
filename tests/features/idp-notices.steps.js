import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const WHEN_ID = 'profile-preferences/sign_in_notices/when';
const CHANNELS_ID = 'profile-preferences/sign_in_notices/channels';

const cardOf = page => page.locator('#sign-in-notices');

const whenOf = page => cardOf(page).locator(`[id="${WHEN_ID}"]`);

const channelOf = (page, channel) => cardOf(page).locator(`[data-channel="${channel}"]`);

const actionOf = (page, action) => cardOf(page).locator(`[data-action="${action}"]`);

const noteOf = (page, note) => page.locator(`[data-note="${note}"]`);

const settingOf = (page, pointer) => page.locator(`[id$="${pointer}"]`);

const valuesOf = options => options.map(option => option.value).filter(Boolean);

const choicesOf = async select => {
  const values = await select.locator('option').evaluateAll(valuesOf);
  return values.join(', ');
};

When('I choose {string} in the sign-in notices select', async ({ page }, value) => {
  await whenOf(page).selectOption(value);
});

When('I turn on the sign-in notices channel {string}', async ({ page }, channel) => {
  await channelOf(page, channel).check();
});

When('I turn off the sign-in notices channel {string}', async ({ page }, channel) => {
  await channelOf(page, channel).uncheck();
});

When("I press the sign-in notices card's {string} action", async ({ page }, action) => {
  await actionOf(page, action).click();
});

When('I follow the sign-in notices summary to its last problem', async ({ page }) => {
  await cardOf(page).locator('.form-error-summary a').last().click();
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

Then('the sign-in notices card draws', async ({ page }) => {
  await expect(cardOf(page)).toBeVisible();
});

Then('no sign-in notices card draws', async ({ page }) => {
  await expect(page.locator('[data-action="save-preferences"]')).toBeVisible();
  await expect(cardOf(page)).toHaveCount(0);
});

Then('the sign-in notices card follows the General card', async ({ page }) => {
  const cards = page.locator('.tab-pane > .card');
  await expect(cards.first().locator('[data-action="save-preferences"]')).toBeVisible();
  await expect(cards.nth(1)).toHaveAttribute('id', 'sign-in-notices');
});

Then('the sign-in notices select reads {string}', async ({ page }, value) => {
  await expect(whenOf(page)).toHaveValue(value);
});

Then('the sign-in notices select offers {string}', async ({ page }, values) => {
  await expect.poll(() => choicesOf(whenOf(page))).toBe(values);
});

Then('the sign-in notices channel {string} is on', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).toBeChecked();
});

Then('the sign-in notices channel {string} is off', async ({ page }, channel) => {
  await expect(channelOf(page, channel)).not.toBeChecked();
});

Then('the sign-in notices card carries the default badge', async ({ page }) => {
  await expect(cardOf(page).locator('[data-badge="sign-in-notices-default"]')).toBeVisible();
});

Then('the sign-in notices card carries no default badge', async ({ page }) => {
  await expect(actionOf(page, 'save-sign-in-notices')).toBeVisible();
  await expect(cardOf(page).locator('[data-badge="sign-in-notices-default"]')).toHaveCount(0);
});

Then('the sign-in notices card offers the {string} action', async ({ page }, action) => {
  await expect(actionOf(page, action)).toBeVisible();
});

Then('the sign-in notices card offers no {string} action', async ({ page }, action) => {
  await expect(actionOf(page, 'save-sign-in-notices')).toBeVisible();
  await expect(actionOf(page, action)).toHaveCount(0);
});

Then('the sign-in notices select names an error', async ({ page }) => {
  await expect(whenOf(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(whenOf(page)).toHaveAttribute('aria-errormessage', `${WHEN_ID}-error`);
  await expect(cardOf(page).locator(`[id="${WHEN_ID}-error"]`)).toBeVisible();
});

Then('the sign-in notices select names no error', async ({ page }) => {
  await expect(whenOf(page)).toBeVisible();
  await expect(whenOf(page)).not.toHaveAttribute('aria-invalid');
});

Then('the sign-in notices channels name an error', async ({ page }) => {
  await expect(channelOf(page, 'email')).toHaveAttribute('aria-invalid', 'true');
  await expect(channelOf(page, 'inbox')).toHaveAttribute('aria-invalid', 'true');
  await expect(channelOf(page, 'push')).toHaveAttribute('aria-invalid', 'true');
  await expect(channelOf(page, 'email')).toHaveAttribute(
    'aria-errormessage',
    `${CHANNELS_ID}-error`
  );
  await expect(cardOf(page).locator(`[id="${CHANNELS_ID}-error"]`)).toBeVisible();
});

Then('the sign-in notices channels name no error', async ({ page }) => {
  await expect(channelOf(page, 'email')).toBeVisible();
  await expect(channelOf(page, 'email')).not.toHaveAttribute('aria-invalid');
});

Then('the sign-in notices summary lists {int} problem(s)', async ({ page }, count) => {
  await expect(cardOf(page).locator('.form-error-summary li')).toHaveCount(count);
});

Then('the sign-in notices summary links to no control', async ({ page }) => {
  await expect(cardOf(page).locator('.form-error-summary li')).toHaveCount(1);
  await expect(cardOf(page).locator('.form-error-summary a')).toHaveCount(0);
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
