import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const dialogOf = page => page.getByRole('dialog').last();

const cardOf = (page, kind) =>
  page
    .locator('.list-group > .list-group-item')
    .filter({ has: page.locator('code.small', { hasText: new RegExp(`^${kind}$`) }) });

const familyOf = (page, family) => page.locator(`[data-family="${family}"]`);

When('I pick the email template card of {string}', async ({ page }, kind) => {
  await cardOf(page, kind).locator('> div > input.form-check-input').check();
});

When(
  'I press the {string} action of the email template card of {string}',
  async ({ page }, action, kind) => {
    await cardOf(page, kind).locator(`[data-action="${action}"]`).first().click();
  }
);

Then('the email template family {string} is headed {string}', async ({ page }, family, title) => {
  await expect(familyOf(page, family).locator('.section-heading h5')).toHaveText(title);
});

Then('the email template family {string} lists {string}', async ({ page }, family, kinds) => {
  await expect
    .poll(() =>
      familyOf(page, family)
        .locator('code.small')
        .allTextContents()
        .then(names => names.join(', '))
    )
    .toBe(kinds);
});

Then('the email template field {string} is labelled {string}', async ({ page }, id, label) => {
  await expect(dialogOf(page).locator(`label[for="${id}"]`)).toHaveText(label);
});

Then('the email template preview reads {string}', async ({ page }, text) => {
  await expect(dialogOf(page).locator('[data-pane="email-template-preview-text"]')).toHaveText(
    text
  );
});

Then('the email template preview draws no frame', async ({ page }) => {
  await expect(dialogOf(page).locator('[data-pane="email-template-preview-text"]')).toBeVisible();
  await expect(dialogOf(page).locator('iframe.email-preview')).toHaveCount(0);
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
