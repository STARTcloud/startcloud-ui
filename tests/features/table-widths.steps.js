import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const cellOf = (page, key) =>
  page.locator(`.items-table tbody tr`).first().locator(`td.col-${key}`);

const blockOf = (page, key) => cellOf(page, key).locator('.cell');

const widthOf = locator => locator.evaluate(element => element.getBoundingClientRect().width);

Then('the {string} cell of the first row is sized', async ({ page }, key) => {
  await expect(cellOf(page, key)).toHaveClass(/col-sized/u);
});

Then('the {string} cell of the first row is not sized', async ({ page }, key) => {
  await expect(cellOf(page, key)).toBeVisible();
  await expect(cellOf(page, key)).not.toHaveClass(/col-sized/u);
});

Then('the {string} cell of the first row is at least {int} wide', async ({ page }, key, pixels) => {
  await expect.poll(() => widthOf(blockOf(page, key))).toBeGreaterThanOrEqual(pixels);
});

Then('the {string} cell of the first row is at most {int} wide', async ({ page }, key, pixels) => {
  await expect.poll(() => widthOf(blockOf(page, key))).toBeLessThanOrEqual(pixels);
});

Then('the {string} cell of the first row truncates its text', async ({ page }, key) => {
  await expect
    .poll(() =>
      blockOf(page, key)
        .locator('code')
        .evaluate(element => element.scrollWidth > element.clientWidth)
    )
    .toBe(true);
});

Then(
  'the {string} cell of the first row shows at least {int} of its text',
  async ({ page }, key, pixels) => {
    await expect
      .poll(() =>
        blockOf(page, key)
          .locator('code')
          .evaluate(element => element.clientWidth)
      )
      .toBeGreaterThanOrEqual(pixels);
  }
);
