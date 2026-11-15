import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const FIXTURES_DIR = path.resolve('tests/fixtures');
const posts = new WeakMap();

const countsOf = page => {
  if (!posts.has(page)) {
    posts.set(page, new Map());
  }
  return posts.get(page);
};

const answersOf = (folder, list) =>
  list.split(',').map(entry => {
    const [status, file] = entry.trim().split(/\s+/);
    return {
      status: Number(status),
      body: fs.readFileSync(path.join(FIXTURES_DIR, folder, file), 'utf8'),
    };
  });

const rowOf = (page, text) =>
  page.locator('tbody tr, li.list-group-item, .card.h-100').filter({ hasText: text });

const resendButton = page => page.locator('form.auth-form button.auth-btn-secondary');

Given(
  'the issuer answers POST {string} from the {word} fixture with {string}',
  async ({ page }, pathname, folder, list) => {
    const answers = answersOf(folder, list);
    await page.route(`**${pathname}`, route => {
      if (route.request().method() !== 'POST') {
        return route.fallback();
      }
      const counts = countsOf(page);
      const seen = counts.get(pathname) || 0;
      counts.set(pathname, seen + 1);
      const answer = answers[Math.min(seen, answers.length - 1)];
      return route.fulfill({
        status: answer.status,
        contentType: answer.status < 400 ? 'application/json' : 'application/problem+json',
        body: answer.body,
      });
    });
  }
);

Given("the browser's passkey prompt answers an assertion", async ({ page }) => {
  await page.addInitScript(() => {
    const bytes = () => new Uint8Array([1, 2, 3, 4]).buffer;
    navigator.credentials.get = () =>
      Promise.resolve({
        id: 'AQIDBA',
        rawId: bytes(),
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          authenticatorData: bytes(),
          clientDataJSON: bytes(),
          signature: bytes(),
          userHandle: null,
        },
        getClientExtensionResults: () => ({}),
      });
  });
});

When('I type {string} into the code entry {string}', async ({ page }, code, id) => {
  await page.locator(`[id="${id}"]`).click();
  await page.keyboard.type(code);
});

When('I press the primary auth button', async ({ page }) => {
  await page.locator('.auth-btn-primary').click();
});

When('I open the menu of the suspension row {string}', async ({ page }, text) => {
  await rowOf(page, text).locator('.dropdown-toggle').click();
});

Then('the issuer was sent POST to {string} {int} times', async ({ page }, pathname, count) => {
  await expect.poll(() => countsOf(page).get(pathname) || 0).toBe(count);
});

Then('the resend button is enabled', async ({ page }) => {
  await expect(resendButton(page)).toBeEnabled();
});

Then('the page draws {int} success notices', async ({ page }, count) => {
  await expect(page.locator('.auth-alert-success')).toHaveCount(count);
});

Then('the page draws {int} danger alerts', async ({ page }, count) => {
  await expect(page.locator('.auth-alert-danger')).toHaveCount(count);
});

Then('the page draws a countdown', async ({ page }) => {
  await expect(page.locator('[role="timer"]').first()).toBeVisible();
});

Then('the option valued {string} is disabled', async ({ page }, value) => {
  const card = page.locator(`label.option-card.off:has(input[value="${value}"])`);
  await expect(card).toHaveCount(1);
  await expect(card.locator('input')).toBeDisabled();
});

Then('the option valued {string} is offered', async ({ page }, value) => {
  const card = page.locator(`label.option-card:not(.off):has(input[value="${value}"])`);
  await expect(card).toHaveCount(1);
  await expect(card.locator('input')).toBeEnabled();
});

Then('the Two-factor section draws {int} locked notices', async ({ page }, count) => {
  const section = page.locator('[id="profile-tfa"]');
  await expect(section).toBeVisible();
  await expect(section.locator('.alert-warning:has(button)')).toHaveCount(count);
});

Then('the page offers no disabled option', async ({ page }) => {
  await expect(page.locator('label.option-card').first()).toBeVisible();
  await expect(page.locator('label.option-card.off')).toHaveCount(0);
});

Then('the open dialog draws {int} badges toned {string}', async ({ page }, count, tone) => {
  await expect(page.locator(`.modal.show .badge.${tone}`)).toHaveCount(count);
});
