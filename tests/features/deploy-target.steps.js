import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const glyphOf = page => page.locator('a[data-deploy]').first();

Then('the Deploy glyph links to {string}', async ({ page }, href) => {
  await expect(glyphOf(page)).toHaveAttribute('href', href);
});

Then('the Deploy glyph opens in this window', async ({ page }) => {
  await expect(glyphOf(page)).toHaveAttribute('data-deploy', 'local');
  await expect(glyphOf(page)).not.toHaveAttribute('target');
});

Then('the Deploy glyph opens in a new tab', async ({ page }) => {
  await expect(glyphOf(page)).toHaveAttribute('data-deploy', 'server');
  await expect(glyphOf(page)).toHaveAttribute('target', '_blank');
});

Then('no Deploy glyph draws', async ({ page }) => {
  await expect(page.locator('.items-table-wrap, .card').first()).toBeVisible();
  await expect(page.locator('a[data-deploy]')).toHaveCount(0);
});
