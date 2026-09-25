import { createBdd } from 'playwright-bdd';

import { expect, test } from './fixtures.js';

const { Given, When, Then } = createBdd(test);

Given('the host answers the {word} fixture', async ({ host }, contract) => {
  await host.serve(contract);
});

Given('the host refuses the next {word} to {string}', ({ host }, method, pathname) => {
  host.refuseNext(method, pathname);
});

Given('the browser holds {string} as {string}', async ({ page }, key, value) => {
  await page.addInitScript(
    ([storageKey, storageValue]) => {
      window.localStorage.setItem(storageKey, storageValue);
    },
    [key, value]
  );
});

When('I open {string}', async ({ page }, pathname) => {
  await page.goto(pathname);
});

When('I click {string}', async ({ page }, name) => {
  await page.getByRole('button', { name }).or(page.getByRole('link', { name })).first().click();
});

When('I fill {string} with {string}', async ({ page }, label, value) => {
  await page.getByLabel(label).fill(value);
});

When('I press {string}', async ({ page }, key) => {
  await page.keyboard.press(key);
});

Then('I see {string}', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('I do not see {string}', async ({ page }, text) => {
  await expect(page.getByText(text, { exact: false })).toHaveCount(0);
});

Then('the page title is {string}', async ({ page }, title) => {
  await expect(page).toHaveTitle(title);
});

Then('the path is {string}', async ({ page }, pathname) => {
  await expect(page).toHaveURL(new RegExp(`${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});

Then('the document carries {string} as {string}', async ({ page }, attribute, value) => {
  await expect(page.locator('html')).toHaveAttribute(attribute, value);
});

Then('the host was sent {word} to {string}', async ({ host }, method, pathname) => {
  await expect.poll(() => host.answered(method, pathname).length).toBeGreaterThan(0);
});

Then(
  'the host was sent {word} to {string} carrying {string} as {string}',
  async ({ host }, method, pathname, member, value) => {
    await expect
      .poll(() =>
        host.answered(method, pathname).some(call => String(call.body?.[member]) === value)
      )
      .toBe(true);
  }
);
