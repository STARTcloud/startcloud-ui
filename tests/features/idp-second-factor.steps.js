import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const ANSWERS_DIR = path.resolve('tests/fixtures/idp-second-factor');

const coloursOf = page =>
  page.locator('.auth-alert-timer').evaluateAll(timers =>
    timers.map(timer => ({
      timer: window.getComputedStyle(timer).color,
      alert: window.getComputedStyle(timer.previousElementSibling).color,
    }))
  );

Given(
  'the issuer answers the form post {string} with {int} from {string}',
  async ({ page }, pathname, status, file) => {
    await page.route(`**${pathname}`, route => {
      if (route.request().method() !== 'POST') {
        return route.fallback();
      }
      return route.fulfill({
        status,
        contentType: status < 400 ? 'application/json' : 'application/problem+json',
        body: fs.readFileSync(path.join(ANSWERS_DIR, file), 'utf8'),
      });
    });
  }
);

When('I type the code {string}', async ({ page }, code) => {
  await page.locator('[id="tfa-code"]').click();
  await page.keyboard.type(code);
});

When('I submit the code', async ({ page }) => {
  await page.locator('form.auth-form button[type="submit"]').click();
});

When('I choose the option valued {string}', async ({ page }, value) => {
  await page.locator(`label.option-card:has(input[value="${value}"])`).click();
});

When('I press the control marked {string}', async ({ page }, action) => {
  await page.locator(`[data-action="${action}"]`).click();
});

When('I fill the field with the id {string} with {string}', async ({ page }, id, value) => {
  await page.locator(`[id="${id}"]`).fill(value);
});

When('I press the resend button', async ({ page }) => {
  await page.locator('form.auth-form button.auth-btn-secondary').click();
});

Then('the page holds {int} elements with the id {string}', async ({ page }, count, id) => {
  await expect(page.locator(`[id="${id}"]`)).toHaveCount(count);
});

Then('the page draws {int} forms', async ({ page }, count) => {
  await expect(page.locator('form.auth-form')).toHaveCount(count);
});

Then('the field {string} sits outside every option card', async ({ page }, id) => {
  await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  await expect(page.locator(`label.option-card [id="${id}"]`)).toHaveCount(0);
});

Then('the resend button is disabled', async ({ page }) => {
  await expect(page.locator('form.auth-form button.auth-btn-secondary')).toBeDisabled();
});

Then('the option {string} is disabled', async ({ page }, name) => {
  const card = page.locator('label.option-card.off', { hasText: name });
  await expect(card).toHaveCount(1);
  await expect(card.locator('input')).toBeDisabled();
});

Then('the page links to {string}', async ({ page }, href) => {
  await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
});

Then('the page draws {int} controls marked {string}', async ({ page }, count, action) => {
  await expect(page.locator('.card').first()).toBeVisible();
  await expect(page.locator(`[data-action="${action}"]`)).toHaveCount(count);
});

Then('the Two-factor section lists {int} method rows', async ({ page }, count) => {
  const section = page.locator('[id="profile-tfa"]');
  await expect(section).toBeVisible();
  await expect(section.locator('li.list-group-item')).toHaveCount(count);
});

Then('every alert countdown takes the colour of its alert', async ({ page }) => {
  await expect(page.locator('.auth-alert-timer').first()).toBeVisible();
  const colours = await coloursOf(page);
  colours.forEach(pair => expect(pair.timer).toBe(pair.alert));
});
