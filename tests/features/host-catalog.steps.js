import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"]');

const tableOf = (page, name) => frameOf(page).locator(`[data-table="${name}"]`);

const rowOf = (page, name, text) =>
  tableOf(page, name).locator('tbody tr').filter({ hasText: text }).first();

const dialogOf = page => page.getByRole('dialog').last();

const namedDialogOf = (page, name) => page.locator(`[data-dialog="${name}"]`);

const locationOf = (page, id) => frameOf(page).locator(`[data-location="${id}"]`);

const sourceOf = (page, name) => frameOf(page).locator(`[data-source="${name}"]`);

When('I submit the catalog dialog {string}', async ({ page }, name) => {
  await namedDialogOf(page, name).locator('[data-action="submit"]').click();
});

When('I pick {string} in the catalog dialog select {string}', async ({ page }, value, id) => {
  await dialogOf(page).locator(`[id="${id}"]`).selectOption(value);
});

When('I check the section switch {string}', async ({ page }, id) => {
  await frameOf(page).locator(`[id="${id}"]`).check();
});

When(
  'I press the action {string} of the catalog location {string}',
  async ({ page }, action, id) => {
    await locationOf(page, id).locator(`[data-action="${action}"]`).click();
  }
);

When(
  'I press the action {string} of the catalog source {string}',
  async ({ page }, action, name) => {
    await sourceOf(page, name).locator(`[data-action="${action}"]`).click();
  }
);

When('I toggle the request pill {string}', async ({ page }, label) => {
  await page
    .locator('.navbar-search-panel .navbar-search-pills [role="button"]')
    .filter({ hasText: new RegExp(`^${label}$`, 'u') })
    .first()
    .click();
});

When('I tick the catalog row {string} of the {string} table', async ({ page }, text, name) => {
  await rowOf(page, name, text).locator('.col-select input').check();
});

When(
  'I type {string} into the catalog step {int} field {string}',
  async ({ page }, text, step, label) => {
    await dialogOf(page).locator(`[data-step="${step}"]`).getByLabel(label).fill(text);
  }
);

Then('the catalog card {string} lists {int} locations', async ({ page }, panel, count) => {
  await expect(frameOf(page).locator(`[data-panel="${panel}"] [data-location]`)).toHaveCount(count);
});

Then('the catalog card {string} lists {int} registries', async ({ page }, panel, count) => {
  await expect(frameOf(page).locator(`[data-panel="${panel}"] [data-source]`)).toHaveCount(count);
});

Then('the catalog dialog {string} draws', async ({ page }, name) => {
  await expect(namedDialogOf(page, name)).toBeVisible();
});

Then('the catalog dialog {string} is gone', async ({ page }, name) => {
  await expect(namedDialogOf(page, name)).toHaveCount(0);
});

Then('the catalog dialog {string} says why it cannot be sent', async ({ page }, name) => {
  await expect(namedDialogOf(page, name).locator('[data-note="problem"]')).toBeVisible();
});

Then('the catalog dialog {string} draws {int} steps', async ({ page }, name, count) => {
  await expect(namedDialogOf(page, name).locator('[data-step]')).toHaveCount(count);
});

Then('the catalog dialog select {string} offers {int} options', async ({ page }, id, count) => {
  await expect(dialogOf(page).locator(`[id="${id}"] option:not([value=""])`)).toHaveCount(count);
});

Then('the catalog dialog option {string} of {string} is held', async ({ page }, value, id) => {
  await expect(dialogOf(page).locator(`[id="${id}"] option[value="${value}"]`)).toBeDisabled();
});

Then('the catalog location {string} offers {string}', async ({ page }, id, action) => {
  await expect(locationOf(page, id).locator(`[data-action="${action}"]`)).toBeVisible();
});

Then('the catalog location {string} offers no {string}', async ({ page }, id, action) => {
  await expect(locationOf(page, id)).toBeVisible();
  await expect(locationOf(page, id).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the section page offers no {string}', async ({ page }, action) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then(
  'the row {string} of the {string} table of the section page holds {string}',
  async ({ page }, text, name, action) => {
    await expect(rowOf(page, name, text).locator(`[data-action="${action}"]`)).toBeDisabled();
  }
);

Then('the open dialog draws the panel {string}', async ({ page }, name) => {
  await expect(dialogOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});

const hostCatalogOf = page => tableOf(page, 'provisioner-catalog');

const versionActionOf = (page, family, version) =>
  hostCatalogOf(page).locator(
    `[data-action="catalog-install"][data-family="${family}"][data-version="${version}"]`
  );

Then('the provisioner catalog draws {int} cards', async ({ page }, count) => {
  await expect(hostCatalogOf(page).locator('.catalog-card')).toHaveCount(count);
});

Then('the provisioner catalog draws the table', async ({ page }) => {
  await expect(hostCatalogOf(page).locator('table').first()).toBeVisible();
  await expect(hostCatalogOf(page).locator('.catalog-card')).toHaveCount(0);
});

Then('the provisioner catalog draws a {string} pill', async ({ page }, tier) => {
  const pill = hostCatalogOf(page)
    .locator(`.tier-badge.tier-${tier}`)
    .filter({ visible: true })
    .first();
  await expect(pill).toBeVisible();
  await expect(pill).not.toHaveClass(/bg-primary/u);
});

Then(
  'the provisioner catalog offers Install on {string} {string}',
  async ({ page }, family, version) => {
    await expect(versionActionOf(page, family, version).first()).toBeAttached();
  }
);

Then(
  'the provisioner catalog notes Installed on {string} {string}',
  async ({ page }, family, version) => {
    await expect(
      hostCatalogOf(page).locator(`[data-note="installed"][data-version="${version}"]`).first()
    ).toBeAttached();
    await expect(versionActionOf(page, family, version)).toHaveCount(0);
  }
);

When(
  'I press Install on {string} {string} in the provisioner catalog',
  async ({ page }, family, version) => {
    await versionActionOf(page, family, version).filter({ visible: true }).first().click();
  }
);

When('I switch the provisioner catalog to the table', async ({ page }) => {
  await hostCatalogOf(page).locator('[role="group"] button').first().click();
});

When('I pick {string} in the provisioner catalog source', async ({ page }, source) => {
  await frameOf(page).locator('#catalog-source').selectOption(source);
});

const cardOf = (page, name) =>
  hostCatalogOf(page)
    .locator('.catalog-card')
    .filter({
      has: page.locator('[data-field="byline"] code', { hasText: new RegExp(`^${name}$`, 'u') }),
    });

Then('the card {string} health reads {string} as {string}', async ({ page }, name, check, ok) => {
  await expect(cardOf(page, name).locator(`[data-check="${check}"]`)).toHaveAttribute(
    'data-ok',
    ok
  );
});

Then('the card {string} strip lists the providers {string}', async ({ page }, name, list) => {
  const chips = cardOf(page, name).locator('[data-panel="health"] [data-chip]');
  await expect
    .poll(() => chips.evaluateAll(nodes => nodes.map(node => node.dataset.chip).join(',')))
    .toBe(list);
});

Then('the card {string} folds are folded', async ({ page }, name) => {
  await expect(cardOf(page, name).locator('details.q-fold')).toHaveCount(2);
  await expect(cardOf(page, name).locator('details.q-fold[open]')).toHaveCount(0);
});

When('I open the {string} fold of the card {string}', async ({ page }, fold, name) => {
  await cardOf(page, name).locator(`[data-fold="${fold}"] > summary`).click();
});

When('I select the version {string} of the card {string}', async ({ page }, version, name) => {
  await cardOf(page, name)
    .locator(`[data-version="${version}"] .version-line .version-number`)
    .click();
});

When(
  'I open the details of the version {string} of the card {string}',
  async ({ page }, version, name) => {
    await cardOf(page, name)
      .locator(`[data-version="${version}"] [data-action="version-toggle"]`)
      .click();
  }
);

Then(
  'the card {string} quality is measured as {string} with {string}',
  async ({ page }, name, tier, score) => {
    const panel = cardOf(page, name).locator('[data-panel="quality"]');
    await expect(panel).toHaveAttribute('data-tier', tier);
    await expect(panel.locator(`details.meter.achieved[data-tier="${tier}"]`)).toHaveCount(1);
    await expect(cardOf(page, name).locator('[data-field="quality-score"]').first()).toHaveText(
      score
    );
  }
);

Then(
  'the card {string} version {string} links the box of {string} to {string}',
  async ({ page }, name, version, provider, href) => {
    await expect(
      cardOf(page, name).locator(`[data-version="${version}"] a[data-chip="${provider}"]`)
    ).toHaveAttribute('href', href);
  }
);

Then('the provisioner catalog is of the source {string}', async ({ page }, source) => {
  await expect(hostCatalogOf(page)).toHaveAttribute('data-catalog-source', source);
});

Then('the catalog dialog {string} marks the field {string} invalid', async ({ page }, name, id) => {
  const dialog = namedDialogOf(page, name);
  await expect(dialog.locator(`[id="${id}"]`)).toHaveClass(/is-invalid/u);
  await expect(dialog.locator(`[data-error="${id}"]`)).toBeVisible();
});

Then(
  'the field {string} of the catalog dialog {string} reads {string}',
  async ({ page }, id, name, value) => {
    await expect(namedDialogOf(page, name).locator(`[id="${id}"]`)).toHaveValue(value);
  }
);
