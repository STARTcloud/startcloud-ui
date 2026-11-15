import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const FIXTURES_DIR = path.resolve('tests/fixtures');

const posts = new WeakMap();

const postsOf = page => {
  if (!posts.has(page)) {
    posts.set(page, []);
  }
  return posts.get(page);
};

const answerPosts = (page, pathname, answer) =>
  page.route(`**${pathname}`, async route => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.fallback();
      return;
    }
    postsOf(page).push({ pathname, body: JSON.parse(request.postData() || 'null') });
    await route.fulfill(answer);
  });

Given('the terms post to {string} answers next {string}', async ({ page }, pathname, next) => {
  await answerPosts(page, pathname, {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ next }),
  });
});

Given(
  'the terms post to {string} answers {int} from {string}',
  async ({ page }, pathname, status, file) => {
    await answerPosts(page, pathname, {
      status,
      headers: { 'content-type': 'application/problem+json' },
      body: fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'),
    });
  }
);

When('I tick the terms field {string}', async ({ page }, id) => {
  await page.locator(`[id="${id}"]`).check();
});

When('I choose the terms option {string}', async ({ page }, option) => {
  await page.locator('label.option-card').filter({ hasText: option }).click();
});

When('I submit the terms form', async ({ page }) => {
  await page.locator('form.auth-form button[type="submit"]').click();
});

When('I press the terms element {string}', async ({ page }, css) => {
  await page.locator(css).click();
});

When('I press the {string} action of the terms copy {int}', async ({ page }, action, copy) => {
  await page.locator(`[data-copy="${copy}"] [data-action="${action}"]`).click();
});

Then('the terms blank {string} reads {string}', async ({ page }, name, text) => {
  await expect(page.locator(`[data-field="${name}"]`).first()).toHaveText(text);
});

Then('the terms page holds {int} element(s) matching {string}', async ({ page }, count, css) => {
  await expect(page.locator(css)).toHaveCount(count);
});

Then("the terms form's submit is held", async ({ page }) => {
  await expect(page.locator('form.auth-form button[type="submit"]')).toBeDisabled();
});

Then('the terms field {string} is marked wrong', async ({ page }, id) => {
  const control = page.locator(`[id="${id}"]`);
  await expect(control).toHaveAttribute('aria-invalid', 'true');
  await expect(control).toHaveAttribute('aria-errormessage', `${id}-error`);
  await expect(page.locator(`[id="${id}-error"]`)).toBeVisible();
});

Then('the terms field {string} names the error {string}', async ({ page }, id, message) => {
  await expect(page.locator(`[id="${id}"]`)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(`[id="${id}-error"]`)).toContainText(message);
});

Then(
  'the terms post to {string} carried the field {string} as the {word} {string}',
  async ({ page }, pathname, name, type, value) => {
    await expect
      .poll(() => {
        const sent = postsOf(page).find(post => post.pathname === pathname);
        const field = sent?.body?.fields?.[name];
        return `${typeof field} ${String(field)}`;
      })
      .toBe(`${type} ${value}`);
  }
);
