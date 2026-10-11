import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const VIEWS = ['table', 'cards'];

const bannerOf = (page, word) => page.locator(`.notice-banner [data-handoff="${word}"]`);

const hostsPage = page => page.locator('[data-page="hosts"]');

const cardOf = (page, id) => hostsPage(page).locator(`[data-host-card="${id}"]`);

const rowOf = (page, text) =>
  hostsPage(page).locator('.items-table tbody tr').filter({ hasText: text }).first();

const catalogCardOf = (page, name) =>
  page.locator('[data-table="provisioner-catalog"] .catalog-card').filter({
    has: page.locator('[data-field="byline"] code', { hasText: new RegExp(`^${name}$`, 'u') }),
  });

const dialogOf = page => page.getByRole('dialog').last();

Then('the hand-off banner draws for {string}', async ({ page }, word) => {
  await expect(bannerOf(page, word)).toBeVisible();
});

Then('no hand-off banner draws', async ({ page }) => {
  await expect(page.locator('[data-page]').first()).toBeVisible();
  await expect(page.locator('.notice-banner [data-handoff]')).toHaveCount(0);
});

When('I dismiss the hand-off banner', async ({ page }) => {
  await page.locator('.notice-banner:has([data-handoff]) .btn-close').click();
});

When('I switch the hosts page to {string}', async ({ page }, view) => {
  await hostsPage(page).locator('[role="group"] button').nth(VIEWS.indexOf(view)).click();
});

Then('the hosts page draws its {string}', async ({ page }, view) => {
  await expect(hostsPage(page)).toHaveAttribute('data-view', view);
  await expect(
    hostsPage(page)
      .locator(view === 'cards' ? '[data-list="host-cards"]' : 'table')
      .first()
  ).toBeVisible();
});

Then('the hosts page draws no pick', async ({ page }) => {
  await expect(hostsPage(page)).toBeVisible();
  await expect(hostsPage(page).locator('[data-pick]')).toHaveCount(0);
});

Then('the host card {string} is a press to {string}', async ({ page }, id, href) => {
  await expect(cardOf(page, id)).toHaveAttribute('data-pick', 'press');
  await expect(cardOf(page, id).locator('a.stretched-link')).toHaveAttribute('href', href);
});

Then('the host card {string} is held', async ({ page }, id) => {
  await expect(cardOf(page, id)).toHaveAttribute('aria-disabled', 'true');
  await expect(cardOf(page, id).locator('[data-note="held"]')).toBeVisible();
  await expect(cardOf(page, id).locator('a.stretched-link')).toHaveCount(0);
});

When('I press the host card {string}', async ({ page }, id) => {
  await cardOf(page, id).locator('a.stretched-link').click();
});

Then('the hosts row {string} is a press', async ({ page }, text) => {
  await expect(rowOf(page, text)).toHaveAttribute('data-pick', 'press');
  await expect(rowOf(page, text)).toHaveAttribute('role', 'link');
});

Then('the hosts row {string} is held', async ({ page }, text) => {
  await expect(rowOf(page, text)).toHaveAttribute('aria-disabled', 'true');
  await expect(rowOf(page, text).locator('[data-note="held"]')).toBeVisible();
});

When('I press the hosts row {string}', async ({ page }, text) => {
  await rowOf(page, text).locator('td.col-hostname').click();
});

Then(
  'the provisioner catalog marks {string} with {string} selected',
  async ({ page }, name, version) => {
    const card = catalogCardOf(page, name);
    await expect(card.locator('[data-card="provisioner"]')).toHaveAttribute('data-handed', 'true');
    await expect(card.locator(`.version-row.selected[data-version="${version}"]`)).toBeVisible();
  }
);

Then('the provisioner catalog marks no card', async ({ page }) => {
  await expect(page.locator('[data-table="provisioner-catalog"]')).toBeVisible();
  await expect(page.locator('[data-card="provisioner"][data-handed]')).toHaveCount(0);
});

Then("the open dialog's submit is held", async ({ page }) => {
  await expect(dialogOf(page).locator('[data-action="submit"]')).toBeDisabled();
});

Then("the open dialog's submit is offered", async ({ page }) => {
  await expect(dialogOf(page).locator('[data-action="submit"]')).toBeEnabled();
});
