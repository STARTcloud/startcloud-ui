import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const viewOf = page => page.locator('[data-view="machine-provisioning"]');

const editorOf = page => page.locator('[data-panel="provisioning-editor"]');

const dialogOf = page => page.getByRole('dialog').last();

const rolesListOf = page => page.locator('[data-list="roles"]');

const runGlyphOf = (page, name) =>
  rolesListOf(page).locator(`[data-role="${name}"] [data-action="run-role"]`);

When('I pick the editor tab {string}', async ({ page }, key) => {
  await editorOf(page).locator(`[data-tab="${key}"]`).click();
});

When('I add the catalog role {string}', async ({ page }, name) => {
  await editorOf(page).locator('.hw-cat-item').filter({ hasText: name }).first().click();
});

When('I add the custom role {string}', async ({ page }, name) => {
  await editorOf(page).locator('.hw-cat-custom input').fill(name);
  await editorOf(page).locator('[data-action="role-add-custom"]').click();
});

When('I press the run glyph of the role {string}', async ({ page }, name) => {
  await runGlyphOf(page, name).click();
});

When("I press the editor's {string} action", async ({ page }, action) => {
  await editorOf(page).locator(`[data-action="${action}"]`).first().click();
});

const hostsYmlOf = page => editorOf(page).locator('[data-tab-body="hosts-yml"]');

When('I replace the Hosts.yml with {string}', async ({ page }, text) => {
  const content = hostsYmlOf(page).locator('.cm-content');
  await content.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await content.pressSequentially(text);
});

When('I confirm the open dialog with {string}', async ({ page }, keyword) => {
  const dialog = dialogOf(page);
  await dialog.getByRole('textbox').fill(keyword);
  await dialog.locator('.modal-footer .btn-warning').click();
});

Then('the provisioning page names the provisioner {string}', async ({ page }, name) => {
  await expect(viewOf(page).locator('[data-provisioner]')).toHaveAttribute(
    'data-provisioner',
    name
  );
});

Then('the provisioning status reads {string}', async ({ page }, state) => {
  await expect(viewOf(page).locator('[data-provisioning-status]')).toHaveAttribute(
    'data-provisioning-status',
    state
  );
});

Then('the provisioning page notes {string}', async ({ page }, note) => {
  await expect(viewOf(page).locator(`[data-note="${note}"]`)).toBeVisible();
});

Then('the provisioning page draws no {string} panel', async ({ page }, name) => {
  await expect(viewOf(page).locator('[data-panel="machine-provisioning"]')).toBeVisible();
  await expect(page.locator(`[data-panel="${name}"]`)).toHaveCount(0);
});

Then('the provisioning page draws the field {string}', async ({ page }, id) => {
  await expect(viewOf(page).locator(`[id="${id}"]`)).toBeVisible();
});

Then('the editor lists {int} step cards', async ({ page }, count) => {
  await expect(editorOf(page).locator('[data-action="document-store"]')).toBeVisible();
  await expect(editorOf(page).locator('.hw-role-card')).toHaveCount(count);
});

Then('the catalog lists {int} roles', async ({ page }, count) => {
  await expect(editorOf(page).locator('.hw-cat-item')).toHaveCount(count);
});

Then('the run glyph of the role {string} is held', async ({ page }, name) => {
  await expect(runGlyphOf(page, name)).toBeDisabled();
});

Then('the editor offers no {string}', async ({ page }, action) => {
  await expect(editorOf(page).locator('.hw-role-card').first()).toBeVisible();
  await expect(editorOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the roles editor offers no {string}', async ({ page }, action) => {
  await expect(rolesListOf(page).locator('[data-role]').first()).toBeVisible();
  await expect(rolesListOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the roles catalog draws no search box', async ({ page }) => {
  await expect(page.locator('.hw-cat-item').first()).toBeVisible();
  await expect(page.locator('.hw-cat-search')).toHaveCount(0);
});

Then('the Hosts.yml editor reads {string}', async ({ page }, text) => {
  await expect(hostsYmlOf(page).locator('.cm-content')).toContainText(text);
});

Then('the Hosts.yml tab draws no {string} action', async ({ page }, action) => {
  await expect(hostsYmlOf(page).locator('[data-action="hosts-yml-save"]')).toBeVisible();
  await expect(editorOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the editor notes {string}', async ({ page }, note) => {
  await expect(editorOf(page).locator(`[data-note="${note}"]`)).toBeVisible();
});

Then('the editor offers the tab {string}', async ({ page }, key) => {
  await expect(editorOf(page).locator(`.nav-tabs [data-tab="${key}"]`)).toBeVisible();
});

Then('the editor draws on glass', async ({ page }) => {
  await expect(editorOf(page)).toBeVisible();
  await expect(viewOf(page).locator('.card [data-panel="provisioning-editor"]')).toHaveCount(0);
});
