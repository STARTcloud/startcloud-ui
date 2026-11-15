import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const accountRows = page => page.locator('[data-account]');

const accountRow = (page, text) => accountRows(page).filter({ hasText: text });

const menuOf = page => page.locator('.user-menu .dropdown-menu.show');

const switcherOf = page => menuOf(page).locator('[data-action="switch-account"]');

const siblingOf = page =>
  page
    .context()
    .pages()
    .find(other => other !== page);

When('I pick the account {string}', async ({ page }, text) => {
  await accountRow(page, text).locator('[data-action="choose"]').click();
});

When("I press the account menu's account switcher", async ({ page }) => {
  await switcherOf(page).click();
  await expect(page.locator('.modal.show')).toBeVisible();
});

Then('the page lists {int} accounts', async ({ page }, count) => {
  await expect(accountRows(page)).toHaveCount(count);
});

Then('the account menu offers the account switcher', async ({ page }) => {
  await expect(menuOf(page)).toBeVisible();
  await expect(switcherOf(page)).toBeVisible();
});

Then('the account menu offers no account switcher', async ({ page }) => {
  await expect(menuOf(page)).toBeVisible();
  await expect(switcherOf(page)).toHaveCount(0);
});

Then('the sibling tab draws the account menu', async ({ page }) => {
  const sibling = siblingOf(page);
  await expect(sibling.locator('.user-menu').first()).toBeVisible();
  await sibling.evaluate(() => {
    window.__held = true;
  });
});

Then('the sibling tab reloaded', async ({ page }) => {
  const sibling = siblingOf(page);
  await sibling.waitForFunction(() => window.__held === undefined);
  await expect(sibling.locator('.user-menu').first()).toBeVisible();
});
