import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const wizardOf = page => page.locator('[data-dialog="machine-create"]');

const dialogOf = page => page.getByRole('dialog').last();

const rolesOf = page => page.locator('[data-list="roles"]');

const roleOf = (page, name) => rolesOf(page).locator(`[data-role="${name}"]`);

const fileOf = (page, role, kind) => roleOf(page, role).locator(`[data-file-kind="${kind}"]`);

const pickDialogOf = page => page.locator('[data-dialog="artifact-pick"]');

const secretFieldOf = (page, name) =>
  wizardOf(page).locator(`[data-field="secret"][data-field-name="${name}"]`);

When('I flip the role {string}', async ({ page }, name) => {
  await roleOf(page, name).locator('[data-action="role-switch"]').click();
});

When('I open the role {string}', async ({ page }, name) => {
  await roleOf(page, name).locator('.hw-expander').click();
});

When('I drag the role {string} onto the role {string}', async ({ page }, name, target) => {
  const grip = roleOf(page, name).locator('[data-action="role-grip"]');
  const head = roleOf(page, target).locator('.hw-rc-head');
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await grip.dispatchEvent('dragstart', { dataTransfer });
  await head.dispatchEvent('dragover', { dataTransfer });
  await head.dispatchEvent('drop', { dataTransfer });
  await grip.dispatchEvent('dragend', { dataTransfer });
});

When(
  'I press the {string} action of the {string} file of the role {string}',
  async ({ page }, action, kind, role) => {
    await fileOf(page, role, kind).locator(`[data-action="${action}"]`).click();
  }
);

When('I pick the file {string} in the pick dialog', async ({ page }, filename) => {
  await pickDialogOf(page)
    .locator('tbody tr', { hasText: filename })
    .locator('[data-action="file-pick-row"]')
    .click();
});

When('I press the {string} action of the field {string}', async ({ page }, action, id) => {
  await dialogOf(page).locator(`[id="${id}"] [data-action="${action}"]`).click();
});

When(
  'I press the fetch glyph of the {string} file of the role {string}',
  async ({ page }, kind, role) => {
    await fileOf(page, role, kind).locator('[data-action="artifact-fetch"]').click();
  }
);

When("I press the roles editor's {string} action", async ({ page }, action) => {
  await rolesOf(page).locator('..').locator(`[data-action="${action}"]`).click();
});

When('I press the {string} action of the secret field {string}', async ({ page }, action, name) => {
  await secretFieldOf(page, name).locator(`[data-action="${action}"]`).click();
});

Then('the secret field {string} reads {string}', async ({ page }, name, state) => {
  await expect(secretFieldOf(page, name).locator('[data-pick-state]')).toHaveAttribute(
    'data-pick-state',
    state
  );
});

Then('the secret field {string} names {string}', async ({ page }, name, text) => {
  await expect(secretFieldOf(page, name).locator('code')).toHaveText(text);
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

Then('the role {string} draws {int} dependency warnings', async ({ page }, name, count) => {
  await expect(roleOf(page, name)).toBeVisible();
  await expect(roleOf(page, name).locator('.hw-dep-warning')).toHaveCount(count);
});

Then('the role {string} draws the chip {string}', async ({ page }, name, chip) => {
  await expect(roleOf(page, name).locator(`[data-chip="${chip}"]`)).toBeVisible();
});

Then('the role {string} draws no chip {string}', async ({ page }, name, chip) => {
  await expect(roleOf(page, name)).toBeVisible();
  await expect(roleOf(page, name).locator(`[data-chip="${chip}"]`)).toHaveCount(0);
});

Then('the role {string} draws the field {string}', async ({ page }, name, id) => {
  await expect(roleOf(page, name).locator(`[id="${id}"]`)).toBeVisible();
});

Then("the wizard's field form draws no field {string}", async ({ page }, id) => {
  await expect(wizardOf(page).locator('[data-panel="wizard-fields"]')).toBeVisible();
  await expect(wizardOf(page).locator(`[data-panel="wizard-fields"] [id="${id}"]`)).toHaveCount(0);
});

Then('the pick dialog lists {int} files', async ({ page }, count) => {
  await expect(pickDialogOf(page).locator('[data-table="artifact-pick"] tbody tr')).toHaveCount(
    count
  );
});

Then('the {string} dialog is closed', async ({ page }, name) => {
  await expect(page.locator(`[data-dialog="${name}"]`)).toHaveCount(0);
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

const pillOf = (page, step) =>
  wizardOf(page).locator(`[data-list="create-steps"] [data-step="${step}"]`);

const previewOf = page => wizardOf(page).locator('[data-fold="hosts-yml-preview"]');

When('I follow the wizard step {string}', async ({ page }, step) => {
  await pillOf(page, step).click();
});

Then('the wizard is on the step {string}', async ({ page }, step) => {
  await expect(wizardOf(page)).toHaveAttribute('data-step', step);
});

Then('the wizard draws the step {string}', async ({ page }, step) => {
  await expect(pillOf(page, step)).toBeVisible();
});

Then('the wizard draws no step {string}', async ({ page }, step) => {
  await expect(pillOf(page, 'general')).toBeVisible();
  await expect(pillOf(page, step)).toHaveCount(0);
});

const domainRowsOf = page => dialogOf(page).locator('[data-list="domain-chain"] [data-source]');

Then('the domain list reads {string}', async ({ page }, domains) => {
  await expect(domainRowsOf(page).first()).toBeVisible();
  await expect
    .poll(() =>
      domainRowsOf(page).evaluateAll(nodes => nodes.map(node => node.dataset.value).join(','))
    )
    .toBe(domains);
});

When('I pick the domain of the source {string}', async ({ page }, source) => {
  await dialogOf(page).locator(`[data-list="domain-chain"] [data-source="${source}"]`).click();
});

Then("the open dialog's {string} action is held", async ({ page }, action) => {
  await expect(dialogOf(page).locator(`[data-action="${action}"]`)).toBeDisabled();
});

Then('the wizard step {string} is open', async ({ page }, step) => {
  await expect(pillOf(page, step)).toBeEnabled();
});

Then('the wizard step {string} is held', async ({ page }, step) => {
  await expect(pillOf(page, step)).toBeDisabled();
});

Then('the field {string} is marked from package', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`label[for="${id}"] [data-from="package"]`)).toBeVisible();
});

Then('the field {string} is not marked from package', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`label[for="${id}"]`)).toBeVisible();
  await expect(dialogOf(page).locator(`label[for="${id}"] [data-from="package"]`)).toHaveCount(0);
});

Then('the open dialog draws {int} rows of {string}', async ({ page }, count, row) => {
  await expect(dialogOf(page).locator(`[data-row="${row}"]`)).toHaveCount(count);
});

Then('the open dialog draws {int} network rows', async ({ page }, count) => {
  await expect(dialogOf(page).locator('[data-network-row]')).toHaveCount(count);
});

Then('the preview fold reads {string}', async ({ page }, state) => {
  await expect(previewOf(page)).toHaveAttribute('data-state', state);
});

Then('the preview contains {string}', async ({ page }, text) => {
  await expect(previewOf(page).locator('.cm-content')).toContainText(text);
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

Then('the open dialog scrolls its body within the viewport', async ({ page }) => {
  const dialog = dialogOf(page);
  await expect(dialog.locator('.modal-body')).toHaveCSS('overflow-y', 'auto');
  await expect
    .poll(() =>
      dialog
        .locator('.modal-dialog')
        .evaluate(node => node.getBoundingClientRect().height <= window.innerHeight)
    )
    .toBe(true);
  await expect
    .poll(() =>
      dialog.locator('.modal-content').evaluate(node => node.scrollHeight <= node.clientHeight)
    )
    .toBe(true);
  await expect(dialog.locator('.modal-footer [data-action="submit"]')).toBeInViewport({
    ratio: 1,
  });
});

Then('the field {string} carries the placeholder {string}', async ({ page }, id, text) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toHaveAttribute('placeholder', text);
});

When(
  'I press Install on the version {string} in the version catalog',
  async ({ page }, version) => {
    await page
      .locator(
        `[data-dialog="version-catalog"] [data-action="version-install"][data-version="${version}"]`
      )
      .click();
  }
);

Then('the open dialog offers {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the open dialog offers no {string}', async ({ page }, action) => {
  await expect(dialogOf(page).locator('.modal-footer')).toBeVisible();
  await expect(dialogOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

const foldOf = (page, name) => wizardOf(page).locator(`[data-fold="${name}"]`);

When('I open the wizard fold {string}', async ({ page }, name) => {
  await foldOf(page, name).locator('> summary').click();
});

Then('the wizard fold {string} is open', async ({ page }, name) => {
  await expect(foldOf(page, name)).toHaveAttribute('open', '');
});

Then('the wizard fold {string} is closed', async ({ page }, name) => {
  await expect(foldOf(page, name)).toBeVisible();
  await expect(foldOf(page, name)).not.toHaveAttribute('open');
});

Then('the field {string} is marked invalid', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).toHaveClass(/is-invalid/u);
});

Then('the field {string} is not marked invalid', async ({ page }, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"]`)).not.toHaveClass(/is-invalid/u);
});

Then("the open dialog's {string} action links to {string}", async ({ page }, action, href) => {
  await expect(dialogOf(page).locator(`a[data-action="${action}"]`)).toHaveAttribute('href', href);
});

Then('the page draws the panel {string}', async ({ page }, name) => {
  await expect(page.locator(`[data-panel="${name}"]`)).toBeVisible();
});

When('I type {string} into the page field {string}', async ({ page }, text, id) => {
  await page.locator(`[id="${id}"]`).fill(text);
});

When("I press the page's {string} action", async ({ page }, action) => {
  await page.locator(`[data-action="${action}"]`).click();
});

Then('the domain list reads the sources {string}', async ({ page }, sources) => {
  await expect(domainRowsOf(page).first()).toBeVisible();
  await expect
    .poll(() =>
      domainRowsOf(page).evaluateAll(nodes => nodes.map(node => node.dataset.source).join(','))
    )
    .toBe(sources);
});

Then(
  'the preview names the refused member {string} as {string}',
  async ({ page }, member, text) => {
    await expect(
      wizardOf(page).locator(`[data-list="preview-refused"] [data-member="${member}"]`)
    ).toContainText(text);
  }
);

When('I drag the network row {int} onto the network row {int}', async ({ page }, from, to) => {
  const source = wizardOf(page).locator(`[data-network-row="${from}"]`);
  const target = wizardOf(page).locator(`[data-network-row="${to}"]`);
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
});

const provisionerPickOf = page => wizardOf(page).locator('[data-field="provisioner"]');

const pickerOf = page => page.locator('[data-dialog="provisioner-pick"]');

const pickerCardOf = (page, family) =>
  pickerOf(page).locator(`.catalog-card[data-action="pick-family"][data-item="${family}"]`);

Then('the provisioner pick reads {string}', async ({ page }, text) => {
  await expect(provisionerPickOf(page).locator('[data-pick-state="picked"] code')).toHaveText(text);
});

Then('the provisioner pick is empty', async ({ page }) => {
  await expect(provisionerPickOf(page).locator('[data-pick-state="none"]')).toBeVisible();
  await expect(provisionerPickOf(page).locator('[data-pick-state="picked"]')).toHaveCount(0);
});

Then('the pick dialog draws {int} provisioner cards', async ({ page }, count) => {
  await expect(pickerOf(page).locator('[data-table="provisioner-pick"]')).toHaveAttribute(
    'data-state',
    'ready'
  );
  await expect(pickerOf(page).locator('.catalog-card')).toHaveCount(count);
});

Then('the pick dialog card {string} picks the family', async ({ page }, family) => {
  await expect(pickerCardOf(page, family)).toHaveClass(/cursor-pointer/u);
  await expect(pickerCardOf(page, family)).toHaveAttribute('role', 'link');
});

Then(
  'the pick dialog card {string} offers the version {string}',
  async ({ page }, family, version) => {
    await expect(
      pickerCardOf(page, family).locator(
        `[data-action="provisioner-pick-version"][data-version="${version}"]`
      )
    ).toBeAttached();
  }
);

When(
  'I press the card of the provisioner {string} in the pick dialog',
  async ({ page }, family) => {
    await pickerCardOf(page, family).locator('.card-title').click();
  }
);

When(
  'I open the versions of the provisioner {string} in the pick dialog',
  async ({ page }, family) => {
    await pickerCardOf(page, family).locator('[data-fold="versions-fold"] > summary').click();
  }
);

When(
  'I pick the version {string} of the provisioner {string} in the pick dialog',
  async ({ page }, version, family) => {
    await pickerCardOf(page, family)
      .locator(`[data-action="provisioner-pick-version"][data-version="${version}"]`)
      .click();
  }
);

When('I click the backdrop of the open dialog', async ({ page }) => {
  await page
    .locator('.modal.show')
    .last()
    .click({ position: { x: 5, y: 5 } });
});
