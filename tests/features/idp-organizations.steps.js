import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Then } = createBdd(test);

Then('the page offers {int} choice tiles', async ({ page }, count) => {
  await expect(page.locator('button.choice-tile')).toHaveCount(count);
});

Then('the organizations page counts {int} memberships', async ({ page }, count) => {
  await expect(page.locator('.section-heading .small')).toHaveText(`· ${count}`);
  await expect(page.locator('.list li.list-group-item')).toHaveCount(count);
});

Then('the account menu offers no organization row and no console link', async ({ page }) => {
  const menu = page.locator('.user-menu .dropdown-menu.show');
  await expect(menu).toBeVisible();
  await expect(menu.locator('.dropdown-item .text-truncate')).toHaveCount(0);
  await expect(menu.locator('a[href="/org-console"]')).toHaveCount(0);
});
