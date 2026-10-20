import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="host-section"]');

const dialogOf = page => page.getByRole('dialog').last();

const rawKeyOf = prefix => new RegExp(`\\b${prefix}\\.[a-zA-Z]+\\.[a-zA-Z]+`, 'u');

When('I confirm the open delete dialog with {string}', async ({ page }, keyword) => {
  const dialog = dialogOf(page);
  await dialog.getByRole('textbox').fill(keyword);
  await dialog.locator('.modal-footer .btn-danger').click();
});

When("I press the agent page's {string} action", async ({ page }, action) => {
  await frameOf(page).locator(`[data-action="${action}"]`).first().click();
});

When('I type {string} into the agent page field {string}', async ({ page }, text, id) => {
  await frameOf(page).locator(`[id="${id}"]`).fill(text);
});

When('I press {string} on the dialog row {string}', async ({ page }, action, text) => {
  await dialogOf(page)
    .locator('tbody tr')
    .filter({ hasText: text })
    .first()
    .locator(`[data-action="${action}"]`)
    .click();
});

Then('the agent page draws the not-available stub', async ({ page }) => {
  await expect(page.locator('.card .alert-info')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

Then('the agent route draws the host that did not answer', async ({ page }) => {
  const unknown = page.locator('[data-page="host-section-unknown"]');
  await expect(unknown.locator('.alert-danger')).toBeVisible();
  await expect(frameOf(page)).toHaveCount(0);
});

const secretRowOf = (page, name) =>
  frameOf(page).locator('[data-panel="secrets"] tbody tr').filter({ hasText: name }).first();

const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

Then('the secret row {string} is of kind {string}', async ({ page }, name, kind) => {
  await expect(secretRowOf(page, name).locator('[data-secret-kind]')).toHaveAttribute(
    'data-secret-kind',
    kind
  );
});

const markOf = (page, name, store) =>
  secretRowOf(page, name).locator(`[data-action="sync-mark"][data-store="${store}"]`);

Then(
  'the secret row {string} marks the store {string} as {string}',
  async ({ page }, name, store, state) => {
    await expect(markOf(page, name, store)).toHaveAttribute('data-sync-state', state);
  }
);

Then(
  'the secrets table heads the store {string} with {string}',
  async ({ page }, store, letter) => {
    await expect(
      frameOf(page).locator(`[data-panel="secrets"] thead th.col-sync-${store}`)
    ).toContainText(letter);
  }
);

When(
  'I press the store mark {string} of the secret row {string}',
  async ({ page }, store, name) => {
    await markOf(page, name, store).click();
  }
);

When(
  'I open the menu of the store mark {string} of the secret row {string}',
  async ({ page }, store, name) => {
    await markOf(page, name, store).click({ button: 'right' });
  }
);

Then('the store mark menu offers {string}', async ({ page }, rows) => {
  const drawn = await page
    .locator('.sidebar-menu [data-menu-row]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-menu-row')));
  expect(drawn.join(',')).toBe(rows);
});

When('I pick {string} in the store mark menu', async ({ page }, row) => {
  await page.locator(`.sidebar-menu [data-menu-row="${row}"]`).click();
});

When('I tick the secret row {string}', async ({ page }, name) => {
  await frameOf(page).getByRole('checkbox', { name, exact: true }).check();
});

When("I pick {string} in the section page's Actions menu", async ({ page }, action) => {
  await frameOf(page).locator('[data-action="secrets-actions"]').click();
  await page.locator(`.dropdown-menu.show [data-action="${action}"]`).click();
});

When('I toggle the filter pill of the kind of the secret row {string}', async ({ page }, name) => {
  const label = (await secretRowOf(page, name).locator('td.col-kind').innerText()).trim();
  await page
    .locator('.navbar-search-panel .navbar-search-pills [role="button"]')
    .filter({ hasText: new RegExp(`^${escaped(label)} \\(`, 'u') })
    .first()
    .click();
});

Then('the heading pane of the section page reads {string}', async ({ page }, names) => {
  const pane = frameOf(page).locator('.section-heading > .ms-auto').first();
  await expect(pane).toBeVisible();
  const drawn = await pane
    .locator(':scope > *')
    .evaluateAll(nodes =>
      nodes.map(node =>
        node.getAttribute('role') === 'group'
          ? 'view-toggle'
          : node.getAttribute('data-action') || node.getAttribute('data-pane')
      )
    );
  expect(drawn.join(',')).toBe(names);
});

Then('the section page draws no search box', async ({ page }) => {
  await expect(frameOf(page).locator('.section-heading').first()).toBeVisible();
  await expect(frameOf(page).locator('input[type="search"]')).toHaveCount(0);
});

Then('the agent page draws the {string} panel', async ({ page }, name) => {
  await expect(frameOf(page).locator(`[data-panel="${name}"]`)).toBeVisible();
});

Then('the agent page notes {string}', async ({ page }, note) => {
  await expect(frameOf(page).locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the agent page notes no {string}', async ({ page }, note) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-note="${note}"]`)).toHaveCount(0);
});

Then('the agent page links to {string}', async ({ page }, href) => {
  await expect(frameOf(page).locator(`a[href="${href}"]`).first()).toBeVisible();
});

Then('the agent page offers {string}', async ({ page }, action) => {
  await expect(frameOf(page).locator(`[data-action="${action}"]`).first()).toBeVisible();
});

Then('the agent page offers no {string}', async ({ page }, action) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(frameOf(page).locator(`[data-action="${action}"]`)).toHaveCount(0);
});

Then('the agent page heading is in the {string} tone', async ({ page }, tone) => {
  await expect(frameOf(page).locator(`.section-heading .text-${tone}`)).toBeVisible();
});

Then(
  'the agent page draws the release notes with {int} headings and {int} items',
  async ({ page }, headings, items) => {
    const notes = frameOf(page).locator('[data-panel="update"] .upd-notes');
    await expect(notes).toBeVisible();
    await expect(notes.locator('h3')).toHaveCount(headings);
    await expect(notes.locator('li')).toHaveCount(items);
  }
);

Then('the agent page draws no release notes', async ({ page }) => {
  await expect(frameOf(page).locator('[data-panel="update-overview"]')).toBeVisible();
  await expect(frameOf(page).locator('[data-panel="update"] .upd-label')).toHaveCount(0);
  await expect(frameOf(page).locator('[data-panel="update"] .upd-notes')).toHaveCount(0);
});

Then('the Update page draws no fold chevron', async ({ page }) => {
  const update = frameOf(page).locator('[data-panel="update"]');
  await expect(update.locator('.section-card-title').first()).toBeVisible();
  await expect(update.locator('.section-card-chevron')).toHaveCount(0);
});

Then('the agent page lists the asset {string}', async ({ page }, name) => {
  await expect(frameOf(page).locator('.upd-asset').filter({ hasText: name }).first()).toBeVisible();
});

const releaseOf = (page, tag) => frameOf(page).locator(`[data-release="${tag}"]`);

Then('the agent page draws the release {string} alone', async ({ page }, tag) => {
  const releases = frameOf(page).locator('[data-panel="update-release"]');
  await expect(releases).toHaveCount(1);
  await expect(releases).toHaveAttribute('data-release', tag);
});

Then('the agent page draws no release', async ({ page }) => {
  await expect(frameOf(page).locator('[data-panel="update-overview"]')).toBeVisible();
  await expect(frameOf(page).locator('[data-panel="update-release"]')).toHaveCount(0);
});

Then('the release {string} is marked {string}', async ({ page }, tag, mark) => {
  await expect(releaseOf(page, tag)).toHaveAttribute(`data-${mark}`, 'true');
});

Then('the release {string} is not marked {string}', async ({ page }, tag, mark) => {
  await expect(releaseOf(page, tag)).toHaveAttribute(`data-${mark}`, 'false');
});

Then('the release {string} is released by {string}', async ({ page }, tag, author) => {
  await expect(releaseOf(page, tag).locator('.upd-release-author')).toContainText(author);
});

Then('the release {string} links to {string}', async ({ page }, tag, href) => {
  await expect(releaseOf(page, tag).locator(`a[href="${href}"]`)).toBeVisible();
});

Then(
  'the release {string} draws the notes with {int} headings and {int} items',
  async ({ page }, tag, headings, items) => {
    const notes = releaseOf(page, tag).locator('.upd-notes');
    await expect(notes).toBeVisible();
    await expect(notes.locator('h3')).toHaveCount(headings);
    await expect(notes.locator('li')).toHaveCount(items);
  }
);

const assetsOf = (page, tag) =>
  frameOf(page).locator(`[data-panel="update-assets"][data-assets-of="${tag}"]`);

Then(
  'the assets of the release {string} draw in their own card after the Overview card',
  async ({ page }, tag) => {
    await expect(assetsOf(page, tag)).toBeVisible();
    const update = frameOf(page).locator('[data-panel="update"]');
    await expect(
      update.locator('[data-panel="update-overview"] ~ [data-panel="update-assets"]')
    ).toHaveCount(1);
    await expect(
      update.locator('[data-panel="update-overview"] [data-panel="update-assets"]')
    ).toHaveCount(0);
    await expect(releaseOf(page, tag).locator('[data-panel="update-assets"]')).toHaveCount(0);
  }
);

Then('the Update page draws the cards {string} in order', async ({ page }, titles) => {
  const drawn = frameOf(page).locator('[data-panel="update"] .section-card-title');
  await expect(drawn).toHaveCount(titles.split(',').length);
  expect((await drawn.allInnerTexts()).map(text => text.trim()).join(',')).toBe(titles);
});

Then(
  'the Update page draws the panels {string} in the {string} column',
  async ({ page }, names, column) => {
    const drawn = await frameOf(page)
      .locator(`[data-panel="update"] [data-column="${column}"] > [data-panel]`)
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-panel')));
    expect(drawn.join(',')).toBe(names);
  }
);

Then('the release {string} lists the asset {string}', async ({ page }, tag, name) => {
  await expect(
    assetsOf(page, tag).locator('.upd-asset').filter({ hasText: name }).first()
  ).toBeVisible();
});

Then('the release {string} shows the checksum {string}', async ({ page }, tag, checksum) => {
  await expect(
    assetsOf(page, tag).locator(`.upd-asset-checksum[title="${checksum}"]`)
  ).toBeVisible();
});

Then('the agent page field {string} reads {string}', async ({ page }, id, value) => {
  await expect(frameOf(page).locator(`[id="${id}"]`)).toHaveValue(value);
});

Then('the page draws no key under {string}', async ({ page }, prefix) => {
  await expect(page.locator('.list.row, h1').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(rawKeyOf(prefix));
});
