import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const panelOf = page => page.locator('[data-panel="machine-console"]');

const dialogOf = page => page.locator('[data-dialog$="-console"]');

const consolePageOf = page => page.locator('[data-page="console"]');

const paneOf = page => page.locator('[data-pane="consoles"]');

const tabsOf = page => paneOf(page).locator('.footer-consoles-tabs .nav-link');

const tabOf = (page, label) => tabsOf(page).filter({ hasText: label });

const controlsOf = page => page.locator('.action-menu .dropdown-menu.show');

const contextMenuOf = page => page.locator('.sidebar-menu');

const dropUpOf = page => page.locator('.footer-tools .dropdown-menu.show');

const bodyOf = (page, kind, label) =>
  paneOf(page).locator(
    `[data-console-body][data-console-kind="${kind}"][data-console-label="${label}"]`
  );

When("I press the console panel's {string} action", async ({ page }, action) => {
  await panelOf(page).locator(`[data-action="${action}"]`).click();
});

When("I open the console panel's {string} menu", async ({ page }, menu) => {
  await panelOf(page).locator(`[data-menu="${menu}"] > button`).click();
});

When("I press the console dialog's {string} action", async ({ page }, action) => {
  await dialogOf(page).locator(`[data-action="${action}"]`).click();
});

When("I press the Controls menu's {string} scope glyph", async ({ page }, action) => {
  await controlsOf(page).locator(`[data-scope="${action}"]`).click();
});

When('I right-click the footer tab {string}', async ({ page }, label) => {
  await tabOf(page, label).click({ button: 'right' });
});

When("I press the footer tab menu's {string} row", async ({ page }, row) => {
  await contextMenuOf(page).locator(`[data-menu-row="${row}"]`).click();
});

When("I press the footer drop-up's {string} row", async ({ page }, row) => {
  await dropUpOf(page).locator(`[data-menu-row="${row}"]`).click();
});

When('I send the command {string}', async ({ page }, text) => {
  await paneOf(page).locator('[data-field="command"]').fill(text);
  await paneOf(page).locator('[data-action="broadcast-send"]').click();
});

When('I open the commands history', async ({ page }) => {
  await paneOf(page).locator('[data-action="broadcast-history"]').click();
});

When('I turn the terminal preferences switch {string} off', async ({ page }, name) => {
  const field = page.locator(`#terminal-prefs-${name}`);
  await expect(field).toBeChecked();
  await field.click();
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

Then('the console panel says the {string} console is in the footer', async ({ page }, kind) => {
  await expect(
    panelOf(page).locator(`[data-note="console-in-footer"][data-console-kind="${kind}"]`)
  ).toBeVisible();
});

Then('the console panel says no console is in the footer', async ({ page }) => {
  await expect(panelOf(page).locator('[data-console]')).toBeVisible();
  await expect(panelOf(page).locator('[data-note="console-in-footer"]')).toHaveCount(0);
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

Then("the Controls menu's {string} row opens in the {string}", async ({ page }, action, place) => {
  await expect(controlsOf(page).locator(`[data-action="${action}"] small`)).toHaveText(place);
});

Then('the footer pane draws the {string} console of {string}', async ({ page }, kind, label) => {
  await expect(bodyOf(page, kind, label)).toBeVisible();
});

Then('the footer pane draws no {string} console of {string}', async ({ page }, kind, label) => {
  await expect(paneOf(page)).toBeVisible();
  await expect(bodyOf(page, kind, label)).toHaveCount(0);
});

Then('the footer pane draws the {string} viewer', async ({ page }, kind) => {
  await expect(paneOf(page).locator(`[data-viewer="${kind}"]`)).toBeVisible();
});

Then('the footer pane draws {int} tabs', async ({ page }, count) => {
  await expect(paneOf(page)).toBeVisible();
  await expect(tabsOf(page)).toHaveCount(count);
});

Then('the footer pane draws no console', async ({ page }) => {
  await expect(paneOf(page).locator('[data-note="console-none"]')).toBeVisible();
});

Then('the footer tab {string} is active', async ({ page }, label) => {
  await expect(tabOf(page, label)).toHaveClass(/active/);
});

Then('the footer tab {string} accepts broadcasts', async ({ page }, label) => {
  await expect(tabOf(page, label)).toHaveClass(/accepts/);
});

Then('the footer tab {string} accepts no broadcasts', async ({ page }, label) => {
  await expect(tabOf(page, label)).toBeVisible();
  await expect(tabOf(page, label)).not.toHaveClass(/accepts/);
});

Then('the footer pane draws the commands bar', async ({ page }) => {
  await expect(paneOf(page).locator('[data-bar="console-commands"]')).toBeVisible();
});

Then('the footer pane draws no commands bar', async ({ page }) => {
  await expect(paneOf(page)).toBeVisible();
  await expect(paneOf(page).locator('[data-bar="console-commands"]')).toHaveCount(0);
});

Then('the commands bar says {string}', async ({ page }, text) => {
  await expect(paneOf(page).locator('[data-note="accept-count"]')).toHaveText(text);
});

Then('the commands history lists {string}', async ({ page }, text) => {
  await expect(page.locator(`[data-sent="${text}"]`)).toBeVisible();
});

Then('the footer tab menu offers {string}', async ({ page }, row) => {
  await expect(contextMenuOf(page).locator(`[data-menu-row="${row}"]`)).toBeVisible();
});

Then('the footer tab menu offers no {string}', async ({ page }, row) => {
  await expect(contextMenuOf(page).locator('[data-menu-row="close"]')).toBeVisible();
  await expect(contextMenuOf(page).locator(`[data-menu-row="${row}"]`)).toHaveCount(0);
});

Then('the footer drop-up offers {string}', async ({ page }, row) => {
  await expect(dropUpOf(page).locator(`[data-menu-row="${row}"]`)).toBeVisible();
});

Then('the footer drop-up offers no {string}', async ({ page }, row) => {
  await expect(dropUpOf(page).locator('[data-menu-row="close"]')).toBeVisible();
  await expect(dropUpOf(page).locator(`[data-menu-row="${row}"]`)).toHaveCount(0);
});

Then('the terminal preferences switch {string} is on', async ({ page }, name) => {
  await expect(page.locator(`#terminal-prefs-${name}`)).toBeChecked();
});

Then('the stored {string} carries {string} as {string}', async ({ page }, key, member, value) => {
  await expect
    .poll(() =>
      page.evaluate(
        ([storageKey, name]) => {
          const stored = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
          return stored && stored[name] !== undefined ? String(stored[name]) : null;
        },
        [key, member]
      )
    )
    .toBe(value);
});

const connectAsOf = page => page.locator('[data-dialog="connect-as"]');

Then('the Connect as dialog lists {string}', async ({ page }, ids) => {
  const items = connectAsOf(page).locator('[data-menu="connect-as"] [data-credential]');
  await expect(items.first()).toBeVisible();
  await expect
    .poll(() => items.evaluateAll(nodes => nodes.map(node => node.dataset.credential).join(',')))
    .toBe(ids);
});

When('I connect as {string} in the Connect as dialog', async ({ page }, id) => {
  await connectAsOf(page).locator(`[data-credential="${id}"]`).click();
});

Then('no Connect as dialog is open', async ({ page }) => {
  await expect(connectAsOf(page)).toHaveCount(0);
});

Then(
  'the host was sent {word} to {string} {int} times, each carrying {string} as {string}',
  async ({ host }, method, pathname, count, member, value) => {
    await expect
      .poll(() =>
        host
          .answered(method, pathname)
          .map(call => String(call.body?.[member]))
          .join(',')
      )
      .toBe(Array(count).fill(value).join(','));
  }
);

Then('the footer pane draws the RDP viewer signing in as {string}', async ({ page }, id) => {
  await expect(paneOf(page).locator(`[data-viewer="rdp"][data-credential="${id}"]`)).toBeAttached();
});

When('I connect as {string}', async ({ page }, id) => {
  await panelOf(page).locator(`[data-menu="connect-as"] [data-credential="${id}"]`).click();
});

Then("the console panel's Connect as menu lists {string}", async ({ page }, ids) => {
  const items = panelOf(page).locator('[data-menu="connect-as"] [data-credential]');
  await expect(items.first()).toBeVisible();
  await expect
    .poll(() => items.evaluateAll(nodes => nodes.map(node => node.dataset.credential).join(',')))
    .toBe(ids);
});

Then('the stored {string} holds {int} entries', async ({ page }, key, count) => {
  await expect
    .poll(() =>
      page.evaluate(storageKey => {
        const stored = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
        return Object.keys(stored).length;
      }, key)
    )
    .toBe(count);
});
