import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, Then } = createBdd(test);

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

Given(
  'the browser holds the cookie {string} as {string}',
  async ({ page, baseURL }, name, value) => {
    await page.context().addCookies([{ name, value, url: baseURL }]);
  }
);

Given('the browser leaves {string} unanswered', async ({ page }, pattern) => {
  await page.route(pattern, () => undefined);
});

Given('the served page carries {string} as {string}', async ({ page }, attribute, value) => {
  await page.addInitScript(
    ([name, stamped]) => {
      const stamp = () => document.documentElement.setAttribute(name, stamped);
      if (document.documentElement) {
        stamp();
      } else {
        document.addEventListener('DOMContentLoaded', stamp);
      }
    },
    [attribute, value]
  );
});

Then(
  'the form posting to {string} carries {string} as {string}',
  async ({ page }, action, name, value) => {
    const form = page.locator(`form[method="post"][action="${action}"]`);
    await expect(form).toHaveCount(1);
    await expect(form.locator(`input[name="${name}"]`)).toHaveValue(value);
  }
);

Then('the field {string} holds {string}', async ({ page }, label, value) => {
  await expect(page.getByLabel(label)).toHaveValue(value);
});

Then('the page holds {int} sandboxed frame(s)', async ({ page }, count) => {
  await expect(page.locator('iframe[sandbox="allow-scripts allow-same-origin"]')).toHaveCount(
    count
  );
});

Then('the link {string} opens {string}', async ({ page }, name, href) => {
  await expect(page.getByRole('link', { name })).toHaveAttribute('href', href);
});

Then('the link {string} points at a URL carrying {string}', async ({ page }, name, part) => {
  await expect(page.getByRole('link', { name })).toHaveAttribute(
    'href',
    new RegExp(escapeRegExp(part))
  );
});
