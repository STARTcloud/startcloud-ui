import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"]');

const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const slideTo = (input, value) => {
  const { set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

When('I slide the section field {string} to {string}', async ({ page }, id, value) => {
  await frameOf(page).locator(`[id="${id}"]`).evaluate(slideTo, value);
});

Then('the section field {string} contains {string}', async ({ page }, id, text) => {
  await expect(frameOf(page).locator(`[id="${id}"]`)).toHaveValue(new RegExp(escaped(text), 'u'));
});
