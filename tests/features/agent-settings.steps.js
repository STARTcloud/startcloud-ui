import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"]');

const dialogOf = page => page.getByRole('dialog').last();

const rawKeyOf = prefix => new RegExp(`\\b${prefix}\\.[a-zA-Z]+\\.[a-zA-Z]+`, 'u');

When('I confirm the open delete dialog with {string}', async ({ page }, keyword) => {
  const dialog = dialogOf(page);
  await dialog.getByRole('textbox').fill(keyword);
  await dialog.locator('.modal-footer .btn-danger').click();
});

When("I press the agent page's {string} action", async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I type {string} into the agent page field {string}', async ({ page }, text, id) => {
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

Then('the agent page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the agent route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="host-section-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the first secret entry is named {string}', async ({ page }, name) => {
  await expect(
    frameOf(page).locator('[data-panel="secrets"] input[type="text"]').first()
  ).toHaveValue(name);
});

Then('the agent page draws the {string} panel', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});

Then('the agent page notes {string}', async ({ page }, note) => {
  await expect(frameOf(page).locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the agent page notes no {string}', async ({ page }, note) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the agent page links to {string}', async ({ page }, href) => {
  await expect(frameOf(page).locator(`a[href="${href}"]`)).toBeVisible();
});

Then('the agent page offers {string}', async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the agent page offers no {string}', async ({ page }, action) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the agent page heading is in the {string} tone', async ({ page }, tone) => {
  await expect(frameOf(page).locator(`.section-heading .text-${tone}`)).toBeVisible();
});

Then(
  'the agent page draws the release notes with {int} headings and {int} items',
  async ({ page }, headings, items) => {
    const notes = frameOf(page).locator('[data-panel="update"] .upd-notes');
    await expect(notes).toBeVisible();
    await expect(notes.locator('h3')).toHaveCount(headings);
    await expect(notes.locator('li')).toHaveCount(items);
  }
);

Then('the agent page draws no release notes', async ({ page }) => {
  await expect(frameOf(page).locator('[data-panel="update"] .card')).toBeVisible();
  await expect(frameOf(page).locator('[data-panel="update"] .upd-label')).toHaveCount(0);
  await expect(frameOf(page).locator('[data-panel="update"] .upd-notes')).toHaveCount(0);
});

When('I fold the {string} section of the agent page', async ({ page }, name) => {
  await frameOf(page).locator(`[data-panel="${name}"] .section-card-chevron`).click();
});

Then('the {string} section of the agent page is folded', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toHaveAttribute(
    'data-folded',
    'true'
  );
});

Then('the {string} section of the agent page is open', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toHaveAttribute(
    'data-folded',
    'false'
  );
});

Then('the agent page lists the asset {string}', async ({ page }, name) => {
  await expect(frameOf(page).locator('.upd-asset').filter({ hasText: name }).first()).toBeVisible();
});

Then('the agent page lists no asset', async ({ page }) => {
  await expect(frameOf(page).locator('.upd-asset:visible')).toHaveCount(0);
});

Then('the agent page field {string} reads {string}', async ({ page }, id, value) => {
  await expect(frameOf(page).locator(`[id="${id}"]`)).toHaveValue(value);
});

Then('the page draws no key under {string}', async ({ page }, prefix) => {
  await expect(page.locator('.list.row, h1').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(rawKeyOf(prefix));
});
