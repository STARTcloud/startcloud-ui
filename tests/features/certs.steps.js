import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const MATERIAL = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/certs/material.json'), 'utf8')
);

const MIME = {
  pem: 'application/x-pem-file',
  key: 'application/x-pem-file',
  pfx: 'application/x-pkcs12',
  json: 'application/json',
};

const BINARY = ['pfx'];

const WASM = /\.wasm(?:\?|$)/u;

const VAULT_HEADING = '#certs-vault-heading';

const downloads = new WeakMap();

const engineAnswers = new WeakMap();

const listOf = (map, page) => {
  if (!map.has(page)) {
    map.set(page, []);
  }
  return map.get(page);
};

const extensionOf = name => name.slice(name.lastIndexOf('.') + 1);

const textOf = held => (typeof held === 'string' ? held : JSON.stringify(held));

const fileOf = name => {
  const extension = extensionOf(name);
  const held = MATERIAL[name];
  return {
    name,
    mimeType: MIME[extension],
    buffer: BINARY.includes(extension)
      ? Buffer.from(held, 'base64')
      : Buffer.from(textOf(held), 'utf8'),
  };
};

const certsPage = page => page.locator('[data-page^="certs-"]');

const actionOf = (page, action) =>
  certsPage(page).locator(`[data-action="${action}"]`).filter({ visible: true });

const zoneOf = (page, panel) => page.locator(`[data-panel="${panel}"] input[type="file"]`);

const inputPanel = page => page.locator('[data-panel="certs-input"]');

const inputArea = page => inputPanel(page).locator('textarea');

const vaultRows = page => page.locator('[data-page="certs-vault"] tbody tr');

const vaultRow = (page, text) => vaultRows(page).filter({ hasText: text }).first();

const issuedRow = (page, text, issuer) =>
  vaultRows(page)
    .filter({ hasText: text })
    .filter({ has: page.locator('td.col-issuer', { hasText: issuer }) });

const sharedTable = page => page.locator('[data-page="certs-shared"]');

const sharedRows = page =>
  sharedTable(page).locator('tbody tr:not(.table-group-row):not(.empty-row)');

const sharedRow = (page, text) => sharedRows(page).filter({ hasText: text }).first();

const openMenu = page => page.locator('.dropdown-menu.show');

const menuToggle = (page, menu) =>
  page.getByRole('button', { name: menu, exact: true }).and(page.locator('.dropdown-toggle'));

const decodeOptions = page => page.locator('[id="certs-decode-component"] option');

const relatedLinks = page => page.locator('[data-panel="record-related"] a');

const recordChain = page => page.locator('[data-panel="record-chain"]');

const componentRows = page => certsPage(page).locator('.scope-list .scope-row');

const componentRow = (page, text) => componentRows(page).filter({ hasText: text });

const outcomeOf = page =>
  certsPage(page).locator('[data-panel="outcome"]').filter({ visible: true });

const differences = page => page.locator('[data-panel="differences"] li');

const chainRows = page => page.locator('[data-page="certs-chain"] [data-list="chain"] li');

const controlOf = (page, id) => page.locator(`[id="${id}"]`);

const cardChevron = (page, id) => page.locator(`[id="${id}"] .section-card-chevron`);

const ekuRows = page =>
  page.locator('[data-panel="certs-subject"] .scope-list .scope-row').filter({ visible: true });

const keySource = page =>
  certsPage(page).locator('[data-panel="key-source"]').filter({ visible: true });

const recordHeading = page => page.locator('[data-page="certs-record"] > .section-heading');

const sidebarRows = page => page.locator('.sidebar a[data-sidebar-row]');

const sectionOf = (page, key) => page.locator(`.sidebar [data-section="${key}"]`);

const duplicateIds = () => {
  const seen = new Set();
  return [...document.querySelectorAll('[id]')]
    .map(node => node.id)
    .filter(id => id && (seen.has(id) || !seen.add(id)));
};

Given("the browser keeps the vault's sync to {string} off", async ({ page }, destination) => {
  await page.addInitScript(key => {
    const request = window.indexedDB.open('certs-vault', 1);
    request.onupgradeneeded = () => {
      const records = request.result.createObjectStore('records', { keyPath: 'id' });
      records.createIndex('kind', 'kind');
      records.createIndex('updated_at', 'updated_at');
      request.result.createObjectStore('preferences');
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('preferences', 'readwrite');
      transaction.objectStore('preferences').put({ [key]: false }, 'sync');
      transaction.oncomplete = () => db.close();
    };
  }, destination);
});

Then(
  'the certs preferences draw one Save and {int} destination switch(es)',
  async ({ page }, count) => {
    const card = page.locator('[data-panel="certs-preferences"]');
    await expect(card.locator('button[type="submit"]')).toHaveCount(1);
    await expect(
      card.locator('button[type="submit"][data-action="save-certs-preferences"]')
    ).toBeVisible();
    await expect(card.locator('[data-panel="certs-sync"] input[role="switch"]')).toHaveCount(count);
  }
);

const componentsSlot = (page, slot) =>
  certsPage(page).locator(
    `[id="certs-convert-components"] [data-list="certs-slots"] [data-slot="${slot}"]`
  );

Then('the components card slot {string} reads needed', async ({ page }, slot) => {
  await expect(componentsSlot(page, slot)).toHaveAttribute('data-slot-state', 'needed');
});

Then('the components card slot {string} reads loaded', async ({ page }, slot) => {
  await expect(componentsSlot(page, slot)).toHaveAttribute('data-slot-state', 'loaded');
});

Then('the output card draws no slot', async ({ page }) => {
  await expect(certsPage(page).locator('[id="certs-convert-output"] [data-slot]')).toHaveCount(0);
});

Given('the browser records its downloads', ({ page }) => {
  page.on('download', download => listOf(downloads, page).push(download.suggestedFilename()));
});

Given("the browser records the engine's answers", ({ page }) => {
  page.on('response', response => {
    if (WASM.test(response.url())) {
      listOf(engineAnswers, page).push(response.headers()['content-type'] || '');
    }
  });
});

When('I drop {string} into the input zone', async ({ page }, name) => {
  await zoneOf(page, 'certs-input').setInputFiles(fileOf(name));
});

When('I drop {string} and {string} into the input zone', async ({ page }, first, second) => {
  await zoneOf(page, 'certs-input').setInputFiles([fileOf(first), fileOf(second)]);
});

When('I drop {string} into the {string} zone', async ({ page }, name, panel) => {
  await zoneOf(page, panel).setInputFiles(fileOf(name));
});

When('I drop {string} into the vault', async ({ page }, name) => {
  await page.locator('[data-page="certs-vault"] input[type="file"]').setInputFiles(fileOf(name));
});

When('I paste the fixture {string} into the input zone', async ({ page }, name) => {
  await inputArea(page).fill(textOf(MATERIAL[name]));
});

When('I drop {string} onto the input textarea', async ({ page }, name) => {
  const file = fileOf(name);
  const dataTransfer = await page.evaluateHandle(
    ({ fileName, mimeType, bytes }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], fileName, { type: mimeType }));
      return transfer;
    },
    { fileName: file.name, mimeType: file.mimeType, bytes: [...file.buffer] }
  );
  await inputArea(page).dispatchEvent('drop', { dataTransfer });
});

Then('the input zone invites a drop', async ({ page }) => {
  await expect(
    inputPanel(page).locator('[data-overlay="drop"] [data-action="browse"]')
  ).toBeVisible();
});

Then('the input zone invites no drop', async ({ page }) => {
  await expect(inputArea(page)).toBeVisible();
  await expect(inputPanel(page).locator('[data-overlay="drop"]')).toHaveCount(0);
});

Then('the input textarea shows the text of {string}', async ({ page }, name) => {
  await expect(inputArea(page)).toHaveValue(textOf(MATERIAL[name]));
  await expect(inputArea(page)).toBeEditable();
});

Then('the input textarea holds a binary file', async ({ page }) => {
  await expect(inputArea(page)).toHaveAttribute('data-held', 'binary');
  await expect(inputArea(page)).not.toBeEditable();
});

Then('the input zone names the held file {string}', async ({ page }, name) => {
  await expect(inputPanel(page).locator('[data-chip="held-file"]')).toHaveText(name);
});

Then('the input zone names no held file', async ({ page }) => {
  await expect(inputArea(page)).toBeVisible();
  await expect(inputPanel(page).locator('[data-chip="held-file"]')).toHaveCount(0);
});

When("I press the certs page's {string} action", async ({ page }, action) => {
  await actionOf(page, action).click();
});

When('I pick the generate tab {string}', async ({ page }, key) => {
  await page.locator(`[data-page="certs-generate"] .nav-tabs [data-tab="${key}"]`).click();
});

When('I tick the vault row {string}', async ({ page }, name) => {
  await page.getByRole('checkbox', { name, exact: true }).check();
});

When('I press {string} on the vault row {string}', async ({ page }, action, text) => {
  await vaultRow(page, text).locator('.dropdown-toggle').click();
  await openMenu(page).locator(`[data-action="${action}"]`).click();
});

When('I tick the shared row {string}', async ({ page }, name) => {
  await sharedTable(page).getByRole('checkbox', { name, exact: true }).check();
});

When('I pull the shared row {string}', async ({ page }, text) => {
  await sharedRow(page, text).locator('[data-action="pull"]').click();
});

When('I pick {string} in the {string} menu', async ({ page }, action, menu) => {
  await menuToggle(page, menu).click();
  await openMenu(page).locator(`[data-action="${action}"]`).click();
});

When('I follow the vault row {string} issued by {string}', async ({ page }, text, issuer) => {
  await issuedRow(page, text, issuer).locator('td.col-name a').click();
});

Then('the sidebar section {string} holds the row to {string}', async ({ page }, key, href) => {
  await expect(
    sectionOf(page, key).locator(`a[data-sidebar-row][href="${href}"]`).first()
  ).toBeVisible();
});

Then('the sidebar section {string} opens with the row to {string}', async ({ page }, key, href) => {
  await expect(sectionOf(page, key).locator('a[data-sidebar-row]').first()).toHaveAttribute(
    'href',
    href
  );
});

Then('the sidebar draws no section {string}', async ({ page }, key) => {
  await expect(sidebarRows(page).first()).toBeVisible();
  await expect(sectionOf(page, key)).toHaveCount(0);
});

Then('the {string} menu is drawn', async ({ page }, menu) => {
  await expect(menuToggle(page, menu)).toBeVisible();
});

Then('the vault row {string} is issued by {string}', async ({ page }, text, issuer) => {
  await expect(issuedRow(page, text, issuer)).toHaveCount(1);
});

Then("the record's related rows link {string}", async ({ page }, text) => {
  await expect(relatedLinks(page).filter({ hasText: text })).toHaveCount(1);
});

Then("the record's chain names {string}", async ({ page }, text) => {
  await expect(recordChain(page)).toContainText(text);
});

Then('the download is named {string}', async ({ page }, name) => {
  await expect.poll(() => listOf(downloads, page).includes(name)).toBe(true);
});

Then('the engine was served as {string}', async ({ page }, type) => {
  await expect.poll(() => listOf(engineAnswers, page).length).toBeGreaterThan(0);
  expect(listOf(engineAnswers, page).every(answer => answer.startsWith(type))).toBe(true);
});

Then('the vault heading holds the focus', async ({ page }) => {
  await expect(page.locator(VAULT_HEADING)).toBeFocused();
});

Then('the vault row {string} holds the focus', async ({ page }, name) => {
  await expect(vaultRow(page, name)).toBeFocused();
});

Then('the vault lists {int} rows', async ({ page }, count) => {
  await expect(vaultRows(page)).toHaveCount(count);
});

Then('the shared table lists {int} rows', async ({ page }, count) => {
  await expect(sharedRows(page)).toHaveCount(count);
});

Then('the shared table draws the {string} column', async ({ page }, column) => {
  await expect(sharedTable(page).locator(`thead th.col-${column}`)).toHaveCount(1);
});

Then('the shared table draws no {string} column', async ({ page }, column) => {
  await expect(sharedTable(page).locator('thead th.col-name')).toHaveCount(1);
  await expect(sharedTable(page).locator(`thead th.col-${column}`)).toHaveCount(0);
});

Then('the shared row {string} offers {string}', async ({ page }, text, label) => {
  await expect(sharedRow(page, text).locator('[data-action="pull"]')).toHaveText(label);
});

Then('the page carries no duplicate id', async ({ page }) => {
  await expect(certsPage(page)).toBeVisible();
  expect(await page.evaluate(duplicateIds)).toEqual([]);
});

Then('the decoded heading reads {string}', async ({ page }, text) => {
  await expect(page.locator('[data-panel="decoded"] .section-heading')).toContainText(text);
});

Then('the decode select lists {int} components', async ({ page }, count) => {
  await expect(decodeOptions(page)).toHaveCount(count);
});

Then('the decode select offers {string}', async ({ page }, text) => {
  await expect(decodeOptions(page).filter({ hasText: text })).toHaveCount(1);
});

Then('the components list {int} rows', async ({ page }, count) => {
  await expect(componentRows(page)).toHaveCount(count);
});

Then('the component {string} is ticked', async ({ page }, text) => {
  await expect(componentRow(page, text).locator('input[type="checkbox"]')).toBeChecked();
});

Then("the certs page's {string} action is held", async ({ page }, action) => {
  await expect(actionOf(page, action)).toBeDisabled();
});

Then("the certs page's {string} action is free", async ({ page }, action) => {
  await expect(actionOf(page, action)).toBeEnabled();
});

When('I press the chevron of the certs card {string}', async ({ page }, id) => {
  await cardChevron(page, id).click();
});

Then('the outcome made reads {string}', async ({ page }, text) => {
  await expect(outcomeOf(page)).toContainText(text);
});

Then('the certs control {string} is checked', async ({ page }, id) => {
  await expect(controlOf(page, id)).toBeChecked();
});

Then('the certs control {string} is not checked', async ({ page }, id) => {
  await expect(controlOf(page, id)).not.toBeChecked();
});

Then('the certs control {string} is disabled', async ({ page }, id) => {
  await expect(controlOf(page, id)).toBeDisabled();
});

Then('the certs control {string} is enabled', async ({ page }, id) => {
  await expect(controlOf(page, id)).toBeEnabled();
});

Then('the certs control {string} is not drawn', async ({ page }, id) => {
  await expect(controlOf(page, id)).toHaveCount(0);
});

Then('the certs panel {string} is drawn', async ({ page }, panel) => {
  await expect(certsPage(page).locator(`[data-panel="${panel}"]`)).toBeVisible();
});

Then('the certs card {string} is folded', async ({ page }, id) => {
  await expect(cardChevron(page, id)).toHaveAttribute('aria-expanded', 'false');
});

Then('the certs card {string} is open', async ({ page }, id) => {
  await expect(cardChevron(page, id)).toHaveAttribute('aria-expanded', 'true');
});

When('I turn off the certs control {string}', async ({ page }, id) => {
  await controlOf(page, id).uncheck();
});

Then('the key source presses {string}', async ({ page }, mode) => {
  await expect(keySource(page).locator(`[data-action="key-${mode}"]`)).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

Then('the key source names the picked key {string}', async ({ page }, name) => {
  await expect(keySource(page).locator('[data-key-picked]')).toContainText(name);
  await expect(
    keySource(page).locator('[data-action^="key-"]:not([data-action="key-change"])')
  ).toHaveCount(0);
});

Then('the record page draws one heading with Edit in its pane and no pill', async ({ page }) => {
  await expect(recordHeading(page)).toHaveCount(1);
  await expect(recordHeading(page).locator('[data-action="edit"]')).toBeVisible();
  await expect(recordHeading(page).locator('.badge')).toHaveCount(0);
  await expect(
    page.locator('[data-page="certs-record"] [data-tool="fold"], [data-page="certs-record"] .card')
  ).toHaveCount(0);
});

Then('the outcome shows the made key', async ({ page }) => {
  await expect(outcomeOf(page).locator('[data-panel="outcome-key"] pre')).toContainText(
    'PRIVATE KEY'
  );
});

Then('the outcome shows no made key', async ({ page }) => {
  await expect(outcomeOf(page)).toBeVisible();
  await expect(outcomeOf(page).locator('[data-panel="outcome-key"]')).toHaveCount(0);
});

Then("the record's details read {string}", async ({ page }, text) => {
  await expect(page.locator('[data-panel="record-details"]')).toContainText(text);
});

Then("the record heading's pane holds {string} and {string}", async ({ page }, first, second) => {
  await expect(recordHeading(page).locator(`[data-action="${first}"]`)).toBeVisible();
  await expect(recordHeading(page).locator(`[data-action="${second}"]`)).toBeVisible();
  await expect(recordHeading(page).locator('[data-action="edit"]')).toHaveCount(0);
});

Then('the extended key usages draw in one row', async ({ page }) => {
  await expect(ekuRows(page)).toHaveCount(4);
  const tops = await ekuRows(page).evaluateAll(nodes =>
    nodes.map(node => Math.round(node.getBoundingClientRect().top))
  );
  expect(new Set(tops).size).toBe(1);
});

Then('the differences list {string}', async ({ page }, field) => {
  await expect(differences(page).filter({ hasText: field })).toHaveCount(1);
});

Then("the chain's first row names {string}", async ({ page }, text) => {
  await expect(chainRows(page).first()).toContainText(text);
});

Then("the chain's first row is marked {string}", async ({ page }, badge) => {
  await expect(chainRows(page).first().locator('.badge')).toHaveText(badge);
});
