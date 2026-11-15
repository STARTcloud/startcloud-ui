import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const dialogOf = page => page.getByRole('dialog').last();

When('I pick the email template card of {string}', async ({ page }, kind) => {
  await page
    .locator('.list-group > .list-group-item')
    .filter({ has: page.locator('code.small', { hasText: kind }) })
    .locator('> div > input.form-check-input')
    .check();
});

Then('the email template bulk result reads {string}', async ({ page }, text) => {
  await expect(page.locator('[data-note="email-template-bulk-result"]')).toContainText(text);
});

Then('the email template preview draws {string}', async ({ page }, text) => {
  await expect(dialogOf(page).locator('iframe.email-preview')).toHaveAttribute('srcdoc', text);
});

Then(
  'the email template field {string} names the error {string}',
  async ({ page }, id, message) => {
    const control = dialogOf(page).locator(`[id="${id}"]`);
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAttribute('aria-errormessage', `${id}-error`);
    await expect(dialogOf(page).locator(`[id="${id}-error"]`)).toContainText(message);
  }
);

Then('the email template field {string} is marked wrong', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toHaveAttribute('aria-invalid', 'true');
});
