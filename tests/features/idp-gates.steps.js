import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const storedOf = (page, key) => page.evaluate(name => window.localStorage.getItem(name), key);

const nameOf = async (page, key) => JSON.parse((await storedOf(page, key)) || 'null')?.name;

const openDialogOf = page => page.locator('.modal.show');

const firstBoxOf = (page, id) => page.locator(`[id="${id}"]`);

const boxesOf = (page, id) => page.locator(`.code-input:has([id="${id}"]) input`);

Then('the browser remembers {string} under {string}', async ({ page }, value, key) => {
  await expect.poll(() => storedOf(page, key)).toBe(value);
});

Then('the browser holds {string} naming {string}', async ({ page }, key, name) => {
  await expect.poll(() => nameOf(page, key)).toBe(name);
});

Then('the code entry {string} draws {int} boxes', async ({ page }, id, count) => {
  await expect(boxesOf(page, id)).toHaveCount(count);
  await expect(firstBoxOf(page, id)).toHaveAttribute('autocomplete', 'one-time-code');
});

Then('the page draws no code entry {string}', async ({ page }, id) => {
  await expect(firstBoxOf(page, id)).toHaveCount(0);
});

When('I switch the step-up dialog to its {string} entry', async ({ page }, mode) => {
  await openDialogOf(page).locator(`[data-mode="${mode}"]`).click();
});

Then('the step-up dialog links to its {string} entry', async ({ page }, mode) => {
  await expect(openDialogOf(page).locator(`[data-mode="${mode}"]`)).toBeVisible();
});

Then('the step-up dialog links to no {string} entry', async ({ page }, mode) => {
  await expect(openDialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(openDialogOf(page).locator(`[data-mode="${mode}"]`)).toHaveCount(0);
});

Then('the button {string} carries the reason {string}', async ({ page }, name, reason) => {
  const button = page.locator(`span[title="${reason}"]`).getByRole('button', { name });
  await expect(button).toBeDisabled();
});
