import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, Then } = createBdd(test);

const chromeMarkOf = page => page.locator('img.logo-cluster').first();

const aboutMarkOf = page => page.locator('img.prov-icon').first();

Given('the build answers no theme manifest', async ({ page }) => {
  await page.route('**/themes/themes.json', route => route.fulfill({ status: 404, body: '' }));
});

Given('the build answers 404 at {string}', async ({ page }, pathname) => {
  await page.route(`**${pathname}`, route => route.fulfill({ status: 404, body: '' }));
});

Then("the chrome's mark is {string}", async ({ page }, src) => {
  await expect(chromeMarkOf(page)).toHaveAttribute('src', src);
});

Then("the chrome's mark is drawn whole", async ({ page }) => {
  await expect
    .poll(() =>
      chromeMarkOf(page).evaluate(
        image =>
          image.complete &&
          (image.naturalWidth > 0 || image.getAttribute('src') === '/brand/startcloud/mark.svg')
      )
    )
    .toBe(true);
});

Then('the favicon is {string}', async ({ page }, href) => {
  await expect(page.locator('link#favicon')).toHaveAttribute('href', href);
});

Then('the About mark is {string}', async ({ page }, src) => {
  await expect(aboutMarkOf(page)).toHaveAttribute('src', src);
});
