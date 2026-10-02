import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const frameOf = page => page.locator('[data-page="networking"]');

const sectionOf = (page, name) => frameOf(page).locator(`[data-section="networking-${name}"]`);

const rowOf = (page, name, text) =>
  sectionOf(page, name).locator('tbody tr').filter({ hasText: text }).first();

const topologyOf = page => sectionOf(page, 'topology');

const dialogOf = page => page.getByRole('dialog').last();

When(
  'I press {string} on the {string} section row {string}',
  async ({ page }, tool, name, text) => {
    await rowOf(page, name, text).locator(`[data-tool="${tool}"]`).click();
  }
);

When(
  'I press {string} on row {int} of the {string} section',
  async ({ page }, tool, number, name) => {
    await sectionOf(page, name)
      .locator('tbody tr')
      .nth(number - 1)
      .locator(`[data-tool="${tool}"]`)
      .click();
  }
);

When("I press the {string} section's {string} tool", async ({ page }, name, tool) => {
  await sectionOf(page, name).locator(`[data-tool="${tool}"]`).first().click();
});

When('I fill the networking field {string} with {string}', async ({ page }, id, text) => {
  await frameOf(page).locator(`[id="${id}"]`).fill(text);
});

When('I switch the networking field {string}', async ({ page }, id) => {
  await frameOf(page).locator(`[id="${id}"]`).check();
});

When('I confirm the open warning dialog', async ({ page }) => {
  const dialog = dialogOf(page);
  const field = dialog.getByRole('textbox');
  const placeholder = await field.getAttribute('placeholder');
  const { keyword } = placeholder.match(/'(?<keyword>[^']+)'/u).groups;
  await field.fill(keyword);
  await dialog.locator('.modal-footer .btn-warning').click();
});

When("I press the open dialog's {string} tool", async ({ page }, tool) => {
  await dialogOf(page).locator(`[data-tool="${tool}"]`).first().click();
});

When('I fold the {string} section of the networking management', async ({ page }, name) => {
  await sectionOf(page, name).locator('[data-tool="fold"]').first().click();
});

When('I open the topology network {string}', async ({ page }, id) => {
  await topologyOf(page).locator(`[data-network="${id}"]`).first().click();
});

When("I press the topology's {string} tool", async ({ page }, tool) => {
  await topologyOf(page).locator(`[data-tool="${tool}"]`).first().click();
});

Then('the networking page draws the {string} section', async ({ page }, name) => {
  await expect(sectionOf(page, name)).toBeVisible();
});

Then('the networking page draws no {string} section', async ({ page }, name) => {
  await expect(frameOf(page)).toBeVisible();
  await expect(sectionOf(page, name)).toHaveCount(0);
});

Then(
  'the {string} section of the networking page lists {int} rows',
  async ({ page }, name, count) => {
    await expect(sectionOf(page, name)).toBeVisible();
    await expect(sectionOf(page, name).locator('tbody tr')).toHaveCount(count);
  }
);

Then('the {string} section of the networking page says {string}', async ({ page }, name, state) => {
  await expect(sectionOf(page, name)).toHaveAttribute('data-state', state);
});

Then('the {string} section row {string} offers {string}', async ({ page }, name, text, tool) => {
  await expect(rowOf(page, name, text).locator(`[data-tool="${tool}"]`)).toBeVisible();
});

Then('the {string} section row {string} offers no {string}', async ({ page }, name, text, tool) => {
  await expect(rowOf(page, name, text)).toBeVisible();
  await expect(rowOf(page, name, text).locator(`[data-tool="${tool}"]`)).toHaveCount(0);
});

Then('the {string} section offers the {string} tool', async ({ page }, name, tool) => {
  await expect(sectionOf(page, name).locator(`[data-tool="${tool}"]`).first()).toBeVisible();
});

Then('the {string} section offers no {string} tool', async ({ page }, name, tool) => {
  await expect(sectionOf(page, name)).toBeVisible();
  await expect(sectionOf(page, name).locator(`[data-tool="${tool}"]`)).toHaveCount(0);
});

Then('the networking page notes {string}', async ({ page }, note) => {
  await expect(frameOf(page).locator(`[data-note="${note}"]`).first()).toBeVisible();
});

Then('the {string} section of the networking management is folded', async ({ page }, name) => {
  await expect(sectionOf(page, name)).toHaveAttribute('data-folded', 'true');
  await expect(sectionOf(page, name).locator('table')).toHaveCount(0);
});

Then('the {string} section of the networking management is open', async ({ page }, name) => {
  await expect(sectionOf(page, name)).toHaveAttribute('data-folded', 'false');
});

Then('the networking field {string} reads {string}', async ({ page }, id, value) => {
  await expect(frameOf(page).locator(`[id="${id}"]`)).toHaveValue(value);
});

Then('the topology draws {int} consumers', async ({ page }, count) => {
  await expect(topologyOf(page).locator('[data-consumer]')).toHaveCount(count);
});

Then('the topology draws {int} carriers', async ({ page }, count) => {
  await expect(topologyOf(page).locator('[data-carrier]')).toHaveCount(count);
});

Then('the topology draws {int} networks', async ({ page }, count) => {
  await expect(topologyOf(page).locator('[data-network]')).toHaveCount(count);
});

Then('the topology draws {int} network chips', async ({ page }, count) => {
  await expect(topologyOf(page).locator('[data-netchip]')).toHaveCount(count);
});

Then('the topology draws the network {string}', async ({ page }, id) => {
  await expect(topologyOf(page).locator(`[data-network="${id}"]`)).toBeVisible();
});

Then('the topology draws the consumer {string}', async ({ page }, id) => {
  await expect(topologyOf(page).locator(`[data-consumer="${id}"]`)).toBeVisible();
});

Then('the topology pulse reads {string}', async ({ page }, state) => {
  await expect(topologyOf(page).locator('[data-pulse]')).toHaveAttribute('data-pulse', state);
});

Then('the topology drill panel is open', async ({ page }) => {
  await expect(topologyOf(page).locator('[data-panel="topology-drill"]')).toBeVisible();
});

Then('the topology drill panel is closed', async ({ page }) => {
  await expect(topologyOf(page)).toBeVisible();
  await expect(topologyOf(page).locator('[data-panel="topology-drill"]')).toHaveCount(0);
});

Then('the topology offers the {string} tool', async ({ page }, tool) => {
  await expect(topologyOf(page).locator(`[data-tool="${tool}"]`).first()).toBeVisible();
});

Then('the topology offers no {string} tool', async ({ page }, tool) => {
  await expect(topologyOf(page).locator('[data-pulse]')).toBeVisible();
  await expect(topologyOf(page).locator(`[data-tool="${tool}"]`)).toHaveCount(0);
});

Then(
  'the host was sent GET to {string} once more than to {string}',
  async ({ host }, more, fewer) => {
    await expect
      .poll(() => host.answered('GET', more).length - host.answered('GET', fewer).length)
      .toBe(1);
  }
);
