import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const AGENT_ORIGIN = 'https://127.0.0.1:9421';
const AGENT_STATUS = { role: 'agent', version: '1.0.0', brand: { name: 'Hyperweaver Agent' } };

const glyphOf = page => page.locator('a[data-deploy]').first();

const menuOf = page => page.locator('.deploy-split.show [data-menu="deploy"]');

const rowOf = (page, word) => menuOf(page).locator(`[data-deploy-row="${word}"]`);

const agentDialogOf = page => page.locator('[data-dialog="deploy-agent"]');

const asked = new WeakMap();

const askedOf = (page, origin) => {
  if (!asked.has(page)) {
    asked.set(page, {});
  }
  const byOrigin = asked.get(page);
  byOrigin[origin] ||= 0;
  return byOrigin;
};

const answering = (page, origin) =>
  page.route(`${origin}/api/status`, route => {
    askedOf(page, origin)[origin] += 1;
    return route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify(AGENT_STATUS),
    });
  });

const silent = (page, origin) =>
  page.route(`${origin}/**`, route => {
    askedOf(page, origin)[origin] += 1;
    return route.abort('connectionrefused');
  });

Given('the local agent answers its status', async ({ page }) => {
  await answering(page, AGENT_ORIGIN);
});

Given('the local agent does not answer', async ({ page }) => {
  await silent(page, AGENT_ORIGIN);
});

Given('the server {string} does not answer', async ({ page }, origin) => {
  await silent(page, origin);
});

When('I press the Deploy glyph', async ({ page }) => {
  await glyphOf(page).click();
});

When('I open the Deploy menu', async ({ page }) => {
  await page
    .locator('.deploy-split [data-action="deploy-more"]')
    .filter({ visible: true })
    .first()
    .click();
  await expect(menuOf(page)).toBeVisible();
});

When("I press the Deploy menu's {string} row", async ({ page }, word) => {
  await rowOf(page, word).click();
});

Then('the Deploy menu offers {string} linking to {string}', async ({ page }, word, href) => {
  await expect(rowOf(page, word)).toHaveAttribute('href', href);
});

Then('the Deploy menu offers {int} rows', async ({ page }, count) => {
  await expect(menuOf(page).locator('[data-deploy-row]')).toHaveCount(count);
});

Then('the Deploy menu row {string} opens in this window', async ({ page }, word) => {
  await expect(rowOf(page, word)).not.toHaveAttribute('target');
});

Then('the Deploy menu row {string} opens in a new tab', async ({ page }, word) => {
  await expect(rowOf(page, word)).toHaveAttribute('target', '_blank');
});

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

Then('the local agent was asked its status', async ({ page }) => {
  await expect.poll(() => askedOf(page, AGENT_ORIGIN)[AGENT_ORIGIN]).toBeGreaterThan(0);
});

Then('the server {string} was asked its status', async ({ page }, origin) => {
  await expect.poll(() => askedOf(page, origin)[origin]).toBeGreaterThan(0);
});

Then('the no-agent dialog offers {string} linking to {string}', async ({ page }, action, href) => {
  await expect(agentDialogOf(page).locator(`[data-action="${action}"]`)).toHaveAttribute(
    'href',
    href
  );
});

Then('the no-agent dialog offers no {string}', async ({ page }, action) => {
  await expect(agentDialogOf(page)).toBeVisible();
  await expect(agentDialogOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('no no-agent dialog is open', async ({ page }) => {
  await expect.poll(() => askedOf(page, AGENT_ORIGIN)[AGENT_ORIGIN]).toBeGreaterThan(0);
  await expect(agentDialogOf(page)).toHaveCount(0);
});

Then("the warning notice's action links to {string}", async ({ page }, href) => {
  await expect(page.locator('.notice-card-warning a').first()).toHaveAttribute('href', href);
});
