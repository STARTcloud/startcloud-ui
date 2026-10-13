import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const wizardOf = page => page.locator('[data-dialog="machine-create"]');

const dialogOf = page => page.getByRole('dialog').last();

const rolesOf = page => page.locator('[data-list="roles"]');

const roleOf = (page, name) => rolesOf(page).locator(`[data-role="${name}"]`);

const fileOf = (page, role, kind) => roleOf(page, role).locator(`[data-file-kind="${kind}"]`);

When('I flip the role {string}', async ({ page }, name) => {
  await roleOf(page, name).locator('[data-action="role-switch"]').click();
});

When('I open the role {string}', async ({ page }, name) => {
  await roleOf(page, name).locator('.hw-expander').click();
});

When('I drag the role {string} onto the role {string}', async ({ page }, name, target) => {
  await roleOf(page, name)
    .locator('[data-action="role-grip"]')
    .dragTo(roleOf(page, target).locator('.hw-rc-head'));
});

When(
  'I pick {string} as the {string} file of the role {string}',
  async ({ page }, filename, kind, role) => {
    await fileOf(page, role, kind).locator('select').selectOption(filename);
  }
);

When(
  'I press the fetch glyph of the {string} file of the role {string}',
  async ({ page }, kind, role) => {
    await fileOf(page, role, kind).locator('[data-action="artifact-fetch"]').click();
  }
);

When("I press the roles editor's {string} action", async ({ page }, action) => {
  await rolesOf(page).locator('..').locator(`[data-action="${action}"]`).click();
});

When('I pick the Safe ID door {string}', async ({ page }, door) => {
  await dialogOf(page).locator(`[data-action="safe-id-${door}"]`).click();
});

Then('the roles list reads {string}', async ({ page }, names) => {
  await expect
    .poll(async () => (await rolesOf(page).locator('[data-role]').allTextContents()).length)
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      rolesOf(page)
        .locator('[data-role]')
        .evaluateAll(nodes => nodes.map(node => node.dataset.role).join(','))
    )
    .toBe(names);
});

Then('the role {string} is {word}', async ({ page }, name, state) => {
  await expect(roleOf(page, name)).toHaveAttribute('data-enabled', String(state === 'on'));
});

Then('the role {string} notes {string}', async ({ page }, name, note) => {
  await expect(roleOf(page, name).locator(`[data-note="${note}"]`)).toBeVisible();
});

Then('the role {string} notes no {string}', async ({ page }, name, note) => {
  await expect(roleOf(page, name)).toBeVisible();
  await expect(roleOf(page, name).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the role {string} is titled {string}', async ({ page }, name, title) => {
  await expect(roleOf(page, name).locator('.hw-rc-role')).toHaveAttribute('title', title);
});

Then('the roles editor notes {string}', async ({ page }, note) => {
  await expect(page.locator(`[data-note="${note}"]`)).toBeVisible();
});

Then('the roles editor notes no {string}', async ({ page }, note) => {
  await expect(rolesOf(page)).toBeVisible();
  await expect(page.locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then(
  'the {string} file of the role {string} reads {string}',
  async ({ page }, kind, role, state) => {
    await expect(fileOf(page, role, kind).locator('[data-file-state]')).toHaveAttribute(
      'data-file-state',
      state
    );
  }
);

Then('the Create button waits on {int} downloads', async ({ page }, count) => {
  await expect(dialogOf(page).locator('[data-action="submit"]')).toHaveAttribute(
    'data-waits',
    String(count)
  );
});

Then('the Create button waits on no download', async ({ page }) => {
  await expect(dialogOf(page).locator('[data-action="submit"]')).not.toHaveAttribute('data-waits');
});

Then('the Safe ID source reads {string}', async ({ page }, source) => {
  await expect(dialogOf(page).locator('[data-field="safe-id"]')).toHaveAttribute(
    'data-safe-source',
    source
  );
});

When('I follow the wizard step {string}', async ({ page }, step) => {
  await wizardOf(page).locator(`[data-list="create-steps"] [data-step="${step}"]`).click();
});

Then('the wizard is on the step {string}', async ({ page }, step) => {
  await expect(wizardOf(page)).toHaveAttribute('data-step', step);
});

Then("the wizard's image list offers {string}", async ({ page }, label) => {
  await expect(
    wizardOf(page).locator('#machine-setting-box option', { hasText: label })
  ).toHaveCount(1);
});

Then("the wizard's confirm rows include {string}", async ({ page }, text) => {
  await expect(wizardOf(page).locator('[data-list="confirm-rows"]')).toContainText(text);
});

Then('the open dialog draws the list {string}', async ({ page }, name) => {
  await expect(dialogOf(page).locator(`[data-list="${name}"]`)).toBeVisible();
});

Then('the open dialog draws no list {string}', async ({ page }, name) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[data-list="${name}"]`)).toHaveCount(0);
});

Then("the wizard's provisioner card reads {string}", async ({ page }, state) => {
  await expect(wizardOf(page).locator('[data-note="provisioner-install"]')).toHaveAttribute(
    'data-state',
    state
  );
});

Then("the wizard's box registry card reads {string}", async ({ page }, state) => {
  await expect(wizardOf(page).locator('[data-note="box-source"]')).toHaveAttribute(
    'data-state',
    state
  );
});

Then('the open dialog offers {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the open dialog offers no {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});
