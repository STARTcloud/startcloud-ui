import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const ANSWERS_DIR = path.resolve('tests/fixtures/idp-onboarding');

Given('the issuer answers the cancel with next {string}', async ({ page, host }, next) => {
  await page.route('**/auth-cancel', async route => {
    await host.serve('identity-signed-out');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ next }),
    });
  });
});

Given(
  'the issuer answers POST {string} with {int} from {string}',
  async ({ page }, pathname, status, file) => {
    await page.route(`**${pathname}`, route =>
      route.fulfill({
        status,
        contentType: status < 400 ? 'application/json' : 'application/problem+json',
        body: fs.readFileSync(path.join(ANSWERS_DIR, file), 'utf8'),
      })
    );
  }
);

Given("the browser's passkey prompt answers a credential", async ({ page }) => {
  await page.addInitScript(() => {
    const bytes = () => new Uint8Array([1, 2, 3, 4]).buffer;
    navigator.credentials.create = () =>
      Promise.resolve({
        id: 'AQIDBA',
        rawId: bytes(),
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          attestationObject: bytes(),
          clientDataJSON: bytes(),
          getTransports: () => ['internal'],
        },
        getClientExtensionResults: () => ({}),
      });
  });
});

Given('the browser answers {string} with an empty page', async ({ page }, pattern) => {
  await page.route(pattern, route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>client</title>' })
  );
});

When('I choose the option {string}', async ({ page }, name) => {
  await page.locator('label.option-card', { hasText: name }).click();
});

When('I name the passkey {string}', async ({ page }, name) => {
  await page.locator('#onboarding-passkey-name').fill(name);
});

Then('the page offers {int} options', async ({ page }, count) => {
  await expect(page.locator('label.option-card')).toHaveCount(count);
});

Then('the browser no longer holds {string}', async ({ page }, key) => {
  await expect
    .poll(() => page.evaluate(storageKey => window.localStorage.getItem(storageKey), key))
    .toBeNull();
});

Then('the button {string} is disabled', async ({ page }, name) => {
  await expect(page.getByRole('button', { name })).toBeDisabled();
});

Then('the button {string} is enabled', async ({ page }, name) => {
  await expect(page.getByRole('button', { name })).toBeEnabled();
});
