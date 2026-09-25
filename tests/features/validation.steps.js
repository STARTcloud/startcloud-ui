import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const SUMMARY_TITLE = 'There is a problem';

const summaryOf = page =>
  page.getByRole('alert').filter({ has: page.getByRole('heading', { name: SUMMARY_TITLE }) });

Then('the control {string} has no {string}', async ({ page }, label, attribute) => {
  const control = page.getByLabel(label);
  await expect(control).toBeVisible();
  await expect(control).not.toHaveAttribute(attribute);
});

Then(
  'the control {string} carries {string} as {string}',
  async ({ page }, label, attribute, value) => {
    await expect(page.getByLabel(label)).toHaveAttribute(attribute, value);
  }
);

Then(
  'the control {string} is described by the error {string}',
  async ({ page }, label, message) => {
    const control = page.getByLabel(label);
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    const errorId = await control.getAttribute('aria-errormessage');
    expect(errorId).toBeTruthy();
    await expect(control).toHaveAttribute('aria-describedby', errorId);
    await expect(page.locator(`[id="${errorId}"]`)).toContainText(message);
  }
);

Then('the error summary is focused', async ({ page }) => {
  await expect(summaryOf(page)).toBeFocused();
});

Then('the error summary lists {string}', async ({ page }, message) => {
  await expect(summaryOf(page).getByText(message)).toBeVisible();
});

Then('the host was not sent {word} to {string}', ({ host }, method, pathname) => {
  expect(host.answered(method, pathname)).toHaveLength(0);
});
