import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const requests = new WeakMap();

const recorded = page => {
  if (!requests.has(page)) {
    requests.set(page, []);
  }
  return requests.get(page);
};

const toggleOf = (page, view) => page.locator(`.footer-tools [data-view="${view}"]`);

const taskRows = page => page.locator('.footer-pane tbody tr');

Given('the browser records its requests', ({ page }) => {
  page.on('request', request => recorded(page).push(new URL(request.url())));
});

When("I press the footer's {string} toggle", async ({ page }, view) => {
  await toggleOf(page, view).click();
});

When("I press the footer's {string} tool", async ({ page }, tool) => {
  await page.locator(`.footer-tools [data-tool="${tool}"]`).click();
});

When('I pick the priority floor {int}', async ({ page }, floor) => {
  await page.locator('.footer-tools [data-tool="priority"]').click();
  await page.locator(`.footer-tools [data-value="${floor}"]`).click();
});

When('I open the task of {string}', async ({ page }, target) => {
  await taskRows(page).filter({ hasText: target }).getByRole('button').click();
});

When('I confirm the open dialog', async ({ page }) => {
  const dialog = page.getByRole('dialog').last();
  const field = dialog.getByRole('textbox');
  const placeholder = await field.getAttribute('placeholder');
  const { keyword } = placeholder.match(/'(?<keyword>[^']+)'/).groups;
  await field.fill(keyword);
  await dialog.locator('.modal-footer .btn-danger').click();
});

Then('the sidebar foot holds the account menu', async ({ page }) => {
  await expect(page.locator('.sidebar-foot .user-menu')).toBeVisible();
});

Then("the footer's name links to {string}", async ({ page }, pathname) => {
  await expect(page.locator(`.footer-edge-start a[href="${pathname}"]`)).toBeVisible();
});

Then('the footer holds the {string} toggle', async ({ page }, view) => {
  await expect(toggleOf(page, view)).toBeVisible();
});

Then('the footer holds no {string} toggle', async ({ page }, view) => {
  await expect(toggleOf(page, 'chevron')).toBeVisible();
  await expect(toggleOf(page, view)).toHaveCount(0);
});

Then('the tasks pane lists {int} tasks', async ({ page }, count) => {
  await expect(taskRows(page)).toHaveCount(count);
});

Then('the tasks pane draws the {string} column', async ({ page }, column) => {
  await expect(page.locator(`.footer-pane th[data-column="${column}"]`)).toBeVisible();
});

Then(
  'the host was asked {string} with {string} as {string}',
  async ({ page }, pathname, name, value) => {
    await expect
      .poll(() =>
        recorded(page).some(
          url => url.pathname === pathname && url.searchParams.get(name) === value
        )
      )
      .toBe(true);
  }
);
