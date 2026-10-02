import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const panelOf = page => page.locator('[data-panel="machine-console"]');

const dialogOf = page => page.locator('[data-dialog$="-console"]');

const consolePageOf = page => page.locator('[data-page="console"]');

When("I press the console panel's {string} action", async ({ page }, action) => {
  await panelOf(page).locator(`[data-action="${action}"]`).click();
});

When("I open the console panel's {string} menu", async ({ page }, menu) => {
  await panelOf(page).locator(`[data-menu="${menu}"] > button`).click();
});

When("I press the console dialog's {string} action", async ({ page }, action) => {
  await dialogOf(page).locator(`[data-action="${action}"]`).click();
});

Then('the console panel draws the {string} display', async ({ page }, kind) => {
  await expect(panelOf(page).locator(`[data-console="${kind}"]`)).toBeVisible();
});

Then('the console panel draws the {string} viewer', async ({ page }, kind) => {
  await expect(panelOf(page).locator(`[data-viewer="${kind}"]`)).toBeVisible();
});

Then('the console panel draws the {string} submenu', async ({ page }, submenu) => {
  await expect(panelOf(page).locator(`[data-submenu="${submenu}"]`)).toBeVisible();
});

Then('the console panel offers {string}', async ({ page }, action) => {
  await expect(panelOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the console panel offers no {string}', async ({ page }, action) => {
  await expect(panelOf(page).locator('[data-console]')).toBeVisible();
  await expect(panelOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then("the console panel's {string} action is held", async ({ page }, action) => {
  await expect(panelOf(page).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the console panel says no console is available', async ({ page }) => {
  await expect(panelOf(page).locator('[data-note="no-console"]')).toBeVisible();
});

Then('the console placeholder mark is {string}', async ({ page }, src) => {
  await expect(panelOf(page).locator('[data-note="console-placeholder"] img')).toHaveAttribute(
    'src',
    src
  );
});

Then('the hardware card offers {string}', async ({ page }, action) => {
  await expect(
    page.locator(`[data-panel="machine-hardware"] [data-action="${action}"]`)
  ).toBeVisible();
});

Then('the hardware card offers no {string}', async ({ page }, action) => {
  await expect(page.locator('[data-panel="machine-hardware"]')).toBeVisible();
  await expect(
    page.locator(`[data-panel="machine-hardware"] [data-action="${action}"]`)
  ).toHaveCount(0);
});

Then('the console dialog draws the {string} viewer', async ({ page }, kind) => {
  await expect(dialogOf(page).locator(`[data-viewer="${kind}"]`)).toBeVisible();
});

Then('the console dialog offers {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the console dialog offers no {string}', async ({ page }, action) => {
  await expect(dialogOf(page)).toBeVisible();
  await expect(dialogOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the console page draws the {string} viewer', async ({ page }, kind) => {
  await expect(consolePageOf(page).locator(`[data-viewer="${kind}"]`)).toBeVisible();
});

Then('the console page offers {string}', async ({ page }, action) => {
  await expect(consolePageOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the console page offers the VNC control bar', async ({ page }) => {
  await expect(consolePageOf(page).locator('.hw-vnc-controls')).toBeVisible();
});

Then('the console page says no console is available', async ({ page }) => {
  await expect(consolePageOf(page).locator('[data-note="no-console"]')).toBeVisible();
});
