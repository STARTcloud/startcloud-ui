import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

const sectionOf = page =>
  page.locator(
    '[data-page="host-section"][data-section="installers"] [data-panel="artifact-storage"]'
  );

Then('the artifact section draws', async ({ page }) => {
  await expect(sectionOf(page)).toBeVisible();
});

Then('the installers page draws no artifact section', async ({ page }) => {
  await expect(page.locator('[data-page="host-section"][data-section="installers"]')).toBeVisible();
  await expect(sectionOf(page)).toHaveCount(0);
});

Then('the artifact section shows the {string} tab', async ({ page }, key) => {
  await expect(sectionOf(page)).toHaveAttribute('data-active', key);
});

Then('the artifact transfers list {int} rows', async ({ page }, count) => {
  await expect(sectionOf(page).locator('[data-table="artifact-transfers"] tbody tr')).toHaveCount(
    count
  );
});

Then('the artifact section lists no transfer', async ({ page }) => {
  await expect(sectionOf(page)).toBeVisible();
  await expect(sectionOf(page).locator('[data-table="artifact-transfers"]')).toHaveCount(0);
});
