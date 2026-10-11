import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

Then(
  'the host was sent {word} to {string} on the origin {string}',
  async ({ host }, method, pathname, origin) => {
    await expect
      .poll(() => host.answered(method, pathname).some(call => call.origin === origin))
      .toBe(true);
  }
);
