import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, Then } = createBdd(test);

const SERVED_FROM_CACHE = { 'x-served-from': 'cache' };

Given("the host's status is the worker's saved copy", async ({ page, host }) => {
  await page.route('**/api/status', route =>
    host.answer({
      request: () => route.request(),
      fulfill: options =>
        route.fulfill({ ...options, headers: { ...options.headers, ...SERVED_FROM_CACHE } }),
    })
  );
});

Then('the warning banner offers {string} linking to {string}', async ({ page }, action, href) => {
  await expect(
    page.locator(`.notice-banner-warning [data-action="${action}"]`).first()
  ).toHaveAttribute('href', href);
});

Then('the warning banner offers no {string}', async ({ page }, action) => {
  await expect(page.locator('.notice-banner-warning').first()).toBeVisible();
  await expect(page.locator(`.notice-banner-warning [data-action="${action}"]`)).toHaveCount(0);
});
