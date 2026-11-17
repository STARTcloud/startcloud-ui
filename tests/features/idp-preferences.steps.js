import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const bodiesOf = (host, method, pathname) =>
  host.answered(method, pathname).map(call => call.body || {});

Then(
  'the host was sent {word} to {string} carrying {string} as some value',
  async ({ host }, method, pathname, member) => {
    await expect
      .poll(() =>
        bodiesOf(host, method, pathname).some(
          body => typeof body[member] === 'string' && body[member] !== ''
        )
      )
      .toBe(true);
  }
);

Then(
  'the host was sent {word} to {string} carrying no {string}',
  async ({ host }, method, pathname, member) => {
    await expect.poll(() => bodiesOf(host, method, pathname).length).toBeGreaterThan(0);
    expect(bodiesOf(host, method, pathname).every(body => !(member in body))).toBe(true);
  }
);

Then('the page draws no panel {string}', async ({ page }, panel) => {
  await expect(page.locator('[data-action="save-preferences"]')).toBeVisible();
  await expect(page.locator(`[data-panel="${panel}"]`)).toHaveCount(0);
});

Then('the sessions list writes the time {string}', async ({ page }, text) => {
  await expect(page.locator('.tab-content .list-group-item span[title]').first()).toHaveAttribute(
    'title',
    text
  );
});
