import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const badgeOf = page => page.locator('.user-menu-badge').first();

const modalOf = page => page.locator('.notifications-modal');

const menuOf = page => page.locator('.user-menu .dropdown-menu');

Given('the identity provider {string} answers no discovery', async ({ page }, origin) => {
  await page.route(`${origin}/.well-known/**`, route => route.abort('connectionrefused'));
});

Then('the avatar badge reads {int}', async ({ page }, count) => {
  await expect(badgeOf(page)).toHaveText(String(count));
});

Then('the avatar badge is hidden', async ({ page }) => {
  await expect(page.locator('.user-menu').first()).toBeVisible();
  await expect(page.locator('.user-menu-badge')).toHaveCount(0);
});

Then("the notifications modal's first row reads {string}", async ({ page }, title) => {
  await expect(modalOf(page).locator('.notification-row').first()).toContainText(title);
});

Then(
  "the notifications modal's row {string} carries the system {string}",
  async ({ page }, title, system) => {
    await expect(
      modalOf(page)
        .locator('.notification-row', { hasText: title })
        .locator('.notification-item-system')
    ).toHaveText(system);
  }
);

Then(
  "the inbox page's row {string} carries the system {string}",
  async ({ page }, title, system) => {
    await expect(
      page
        .locator('.page-column .items-table tbody tr', { hasText: title })
        .locator('.notification-item-system')
    ).toHaveText(system);
  }
);

Then('the inbox page draws {int} unread rows', async ({ page }, count) => {
  await expect(
    page.locator('.page-column .items-table tbody tr .notification-item-dot')
  ).toHaveCount(count);
});

const cardOf = (page, kind) => page.locator(`.notice-card-${kind}`);

Then('the {word} notice card carries the countdown ring', async ({ page }, kind) => {
  await expect(
    cardOf(page, kind).locator('.notice-countdown circle.notice-countdown-fill')
  ).toHaveCount(1);
  await expect(cardOf(page, kind).locator('.notice-countdown button.btn-close')).toBeVisible();
});

Then('the {word} notice card goes away without a click', async ({ page }, kind) => {
  await page.mouse.move(0, 0);
  await expect(cardOf(page, kind)).toBeHidden({ timeout: 20000 });
});

Given('the browser may use the clipboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
});

When('I press the copy glyph of the {word} notice card', async ({ page }, kind) => {
  await cardOf(page, kind).locator('[data-tool="copy"]').click();
});

Then('the clipboard holds the text of the {word} notice card', async ({ page }, kind) => {
  const text = await cardOf(page, kind)
    .locator('.notice-text')
    .evaluate(node => node.textContent);
  expect(text).not.toBe('');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(text);
});

When('I rest the pointer on the {word} notice card and move it away', async ({ page }, kind) => {
  await cardOf(page, kind).hover();
  await page.mouse.move(0, 0);
});

Then('the {word} notice card started its ring {int} times', async ({ page }, kind, rounds) => {
  await expect(cardOf(page, kind)).toHaveAttribute('data-round', String(rounds));
  await expect(
    cardOf(page, kind).locator('.notice-countdown:not(.paused) circle.notice-countdown-fill')
  ).toHaveCount(1);
});

When("I press the account menu's Rebuild row", async ({ page }) => {
  await menuOf(page).locator('button.dropdown-item', { hasText: 'Rebuild catalog data' }).click();
});

Then("the account menu's Rebuild row runs", async ({ page }) => {
  await expect(
    menuOf(page).locator('button.dropdown-item', { hasText: 'Rebuild catalog data' })
  ).toBeDisabled();
});

Then("the account menu's Rebuild row is idle", async ({ page }) => {
  await expect(
    menuOf(page).locator('button.dropdown-item', { hasText: 'Rebuild catalog data' })
  ).toBeEnabled();
});
