import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const membersOf = call => Object.keys(call.body || {}).join(',');

const entryText = entry =>
  typeof entry === 'string'
    ? entry
    : [entry.name, entry.size, entry.controller].filter(Boolean).join(' · ');

const listOf = (call, member, key) => {
  const entries = call.body?.[member]?.[key];
  return Array.isArray(entries) ? entries.map(entryText).join(', ') : '';
};

const lacks = (call, member, key) =>
  Boolean(call.body?.[member]) && !Object.hasOwn(call.body[member], key);

When(
  "I fill the last {string} row's {string} with {string}",
  async ({ page }, row, label, value) => {
    await page.locator(`[data-row="${row}"]`).last().getByLabel(label).fill(value);
  }
);

Then(
  'the host was sent {word} to {string} carrying only {string}',
  async ({ host }, method, pathname, members) => {
    await expect
      .poll(() => host.answered(method, pathname).some(call => membersOf(call) === members))
      .toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} whose {string} carries {string} as {string}',
  async ({ host }, method, pathname, member, key, value) => {
    await expect
      .poll(() =>
        host.answered(method, pathname).some(call => String(call.body?.[member]?.[key]) === value)
      )
      .toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} whose {string} lists {string} as {string}',
  async ({ host }, method, pathname, member, key, value) => {
    await expect
      .poll(() => host.answered(method, pathname).some(call => listOf(call, member, key) === value))
      .toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} whose {string} lacks {string}',
  async ({ host }, method, pathname, member, key) => {
    await expect
      .poll(() => host.answered(method, pathname).some(call => lacks(call, member, key)))
      .toBe(true);
  }
);

Then('no facts pencil draws', async ({ page }) => {
  await expect(page.locator('.card-header').first()).toBeVisible();
  await expect(page.locator('[data-action="edit-facts"]')).toHaveCount(0);
});
