import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const FIXTURES_DIR = path.resolve('tests/fixtures');
const ACCOUNT_KEY = 'account';

const valueAt = (body, pointer) =>
  pointer
    .split('/')
    .filter(Boolean)
    .reduce(
      (node, segment) => (node && typeof node === 'object' ? node[segment] : undefined),
      body
    );

const sentAt = (host, method, pathname, pointer) =>
  host.answered(method, pathname).map(call => valueAt(call.body, pointer));

const rowForm = page =>
  page.locator('form').filter({ has: page.getByRole('button', { name: 'Add' }) });

const mapKeys = page => page.getByRole('textbox', { name: 'Key' }).and(page.locator('[readonly]'));

Given("the browser holds the {word} fixture's account", async ({ page }, contract) => {
  const account = fs.readFileSync(path.join(FIXTURES_DIR, contract, 'user.json'), 'utf8');
  await page.addInitScript(
    ([storageKey, storageValue]) => {
      window.localStorage.setItem(storageKey, storageValue);
    },
    [ACCOUNT_KEY, account]
  );
});

When('I fill the field placeholdered {string} with {string}', async ({ page }, text, value) => {
  await page.getByPlaceholder(text).fill(value);
});

When('I confirm the dialog with {string}', async ({ page }, name) => {
  await page.getByRole('dialog').getByRole('button', { name }).click();
});

When("I fill the row's {string} with {string}", async ({ page }, label, value) => {
  await rowForm(page).getByLabel(label).fill(value);
});

When("I choose {string} as the row's {string}", async ({ page }, value, label) => {
  await rowForm(page).getByLabel(label).selectOption(value);
});

Then('the control {string} has the value {string}', async ({ page }, label, value) => {
  await expect(page.getByLabel(label)).toHaveValue(value);
});

Then('the label {string} carries the badge {string}', async ({ page }, label, badge) => {
  await expect(
    page.locator('label', { hasText: label }).getByText(badge, { exact: true })
  ).toBeVisible();
});

Then('the map keys are {string}', async ({ page }, keys) => {
  await expect
    .poll(() => mapKeys(page).evaluateAll(nodes => nodes.map(node => node.value).join(',')))
    .toBe(keys);
});

Then(
  'the host was sent {word} to {string} carrying {string} at {string}',
  async ({ host }, method, pathname, value, pointer) => {
    await expect
      .poll(() => sentAt(host, method, pathname, pointer).some(sent => String(sent) === value))
      .toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} carrying null at {string}',
  async ({ host }, method, pathname, pointer) => {
    await expect
      .poll(() => sentAt(host, method, pathname, pointer).some(sent => sent === null))
      .toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} carrying nothing at {string}',
  async ({ host }, method, pathname, pointer) => {
    await expect.poll(() => host.answered(method, pathname).length).toBeGreaterThan(0);
    expect(sentAt(host, method, pathname, pointer).every(sent => sent === undefined)).toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} {int} times',
  async ({ host }, method, pathname, count) => {
    await expect.poll(() => host.answered(method, pathname).length).toBe(count);
  }
);
