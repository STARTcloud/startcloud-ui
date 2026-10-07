import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="dashboard"]');

const widgetOf = (page, id) => frameOf(page).locator(`[data-widget="${id}"]`);

const chartTileOf = (page, metric, host) =>
  widgetOf(page, 'charts').locator(`[data-widget-chart="${host}:${metric}"]`);

When('I press the dashboard action {string}', async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I toggle the dashboard widget {string}', async ({ page }, id) => {
  await frameOf(page).locator('[data-action="widgets"]').click();
  await page.locator(`[data-widget-toggle="${id}"]`).click();
  await page.keyboard.press('Escape');
});

Then('the dashboard draws its frame', async ({ page }) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page)).toHaveAttribute('data-answered', 'true');
});

Then('the dashboard draws the {string} widget', async ({ page }, id) => {
  await expect(widgetOf(page, id)).toBeVisible();
});

Then('the dashboard draws no {string} widget', async ({ page }, id) => {
  await expect(frameOf(page)).toHaveAttribute('data-answered', 'true');
  await expect(widgetOf(page, id)).toHaveCount(0);
});

Then('the dashboard tile {string} reads {string}', async ({ page }, name, text) => {
  await expect(frameOf(page).locator(`[data-tile="${name}"] [data-number]`)).toHaveText(text);
});

Then('the dashboard draws the host card {string} as {string}', async ({ page }, id, health) => {
  await expect(frameOf(page).locator(`[data-host-card="${id}"]`)).toHaveAttribute(
    'data-health',
    health
  );
});

Then('the dashboard draws the {string} chart of {string}', async ({ page }, metric, host) => {
  await expect(chartTileOf(page, metric, host).locator('canvas')).toBeVisible();
});

Then(
  "the dashboard's {string} chart of {string} reads {string}",
  async ({ page }, metric, host, text) => {
    await expect(chartTileOf(page, metric, host).locator('[data-widget-value]')).toHaveText(text);
  }
);

Then('the dashboard offers {string}', async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the dashboard offers no {string}', async ({ page }, action) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});
