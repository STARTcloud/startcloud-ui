import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const rowOf = (page, text) =>
  page.locator('tbody tr, li.list-group-item, .card.h-100').filter({ hasText: text });

const actionOf = (page, text, action) => rowOf(page, text).locator(`[data-action="${action}"]`);

const switcherRow = (page, name) =>
  page.locator('.list-modal .list-group-item').filter({ hasText: name });

When(
  'I press the {string} action of the suspension row {string}',
  async ({ page }, action, text) => {
    await actionOf(page, text, action).click();
  }
);

When('I tick the suspension row {string}', async ({ page }, text) => {
  await rowOf(page, text).locator('input[type="checkbox"]').check();
});

When("I press the members' bulk {string} action", async ({ page }, action) => {
  await page.locator(`[data-action="bulk-${action}"]`).click();
});

When('I open the organization switcher from its {string} row', async ({ page }, name) => {
  await page.locator('.user-menu > .nav-link').click();
  await page.locator('.user-menu .dropdown-item').filter({ hasText: name }).click();
});

Then('the suspension row {string} offers the {string} action', async ({ page }, text, action) => {
  await expect(actionOf(page, text, action)).toHaveCount(1);
  await expect(actionOf(page, text, action)).toBeEnabled();
});

Then('the suspension row {string} offers no {string} action', async ({ page }, text, action) => {
  await expect(rowOf(page, text)).toHaveCount(1);
  await expect(actionOf(page, text, action)).toHaveCount(0);
});

Then(
  'the suspension row {string} holds the {string} action disabled',
  async ({ page }, text, action) => {
    await expect(actionOf(page, text, action)).toHaveCount(1);
    await expect(actionOf(page, text, action)).toBeDisabled();
  }
);

Then('the suspension row {string} carries the {string} badge', async ({ page }, text, badge) => {
  await expect(rowOf(page, text).locator(`[data-badge="${badge}"]`)).toBeVisible();
});

Then('the suspension row {string} draws its status as {string}', async ({ page }, text, tone) => {
  await expect(rowOf(page, text).locator('td.col-enabled .badge')).toHaveClass(
    new RegExp(`\\b${tone}\\b`, 'u')
  );
});

Then('the console heading carries the {string} badge', async ({ page }, badge) => {
  await expect(page.locator(`h4 [data-badge="${badge}"]`)).toBeVisible();
});

Then('the suspension page offers no {string} action', async ({ page }, action) => {
  await expect(page.locator('.section-heading').first()).toBeVisible();
  await expect(page.locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the switcher row {string} is the active one', async ({ page }, name) => {
  await expect(switcherRow(page, name)).toBeEnabled();
  await expect(switcherRow(page, name)).toHaveClass(/border-primary/u);
});

Then(
  'the switcher row {string} is disabled with the {string} badge',
  async ({ page }, name, badge) => {
    await expect(switcherRow(page, name)).toBeDisabled();
    await expect(switcherRow(page, name)).not.toHaveClass(/border-primary/u);
    await expect(switcherRow(page, name).locator(`[data-badge="${badge}"]`)).toBeVisible();
  }
);
