import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, Then } = createBdd(test);

const recordOf = page => page.locator('.tab-content');

const segmentOf = payload => Buffer.from(JSON.stringify(payload)).toString('base64url');

const tokenOf = payload => `.${segmentOf(payload)}.`;

Given(
  'the browser holds {string} as {string} signed in through {string}',
  async ({ page }, key, record, issuer) => {
    const token = tokenOf({ id_token: tokenOf({ iss: issuer }) });
    const user = { ...JSON.parse(record), access_token: token };
    await page.addInitScript(
      ([storageKey, storageValue]) => {
        window.localStorage.setItem(storageKey, storageValue);
      },
      [key, JSON.stringify(user)]
    );
  }
);

Then('the profile page draws no field {string}', async ({ page }, id) => {
  await expect(recordOf(page).locator(`[id="${id}"]`)).toHaveCount(0);
});
