import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const requests = new WeakMap();

const recorded = page => {
  if (!requests.has(page)) {
    requests.set(page, []);
  }
  return requests.get(page);
};

const toggleOf = (page, view) => page.locator(`.footer-tools [data-view="${view}"]`);

const taskRows = page => page.locator('.footer-pane tbody tr');

const DRAG_STEPS = 8;

const dragBy = async (page, selector, right, up) => {
  const box = await page.locator(selector).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + right, y - up, { steps: DRAG_STEPS });
  await page.mouse.up();
};

const sizeOf = (page, selector, side) =>
  page
    .locator(selector)
    .evaluate((node, name) => Math.round(node.getBoundingClientRect()[name]), side);

const rowOf = label => `.sidebar [data-sidebar-row]:has-text(${JSON.stringify(label)})`;

const ONE_SAMPLE = '[data-note="one-sample"]';

const panelOf = (page, name) => page.locator(`[data-panel="${name}"]`);

const chartOf = (page, metric) => page.locator(`[data-chart="${metric}"]`);

const seriesOf = (scope, group) => scope.locator(`[data-series="${group}"]`);

Given('the browser records its requests', ({ page }) => {
  page.on('request', request => recorded(page).push(new URL(request.url())));
});

When("I press the footer's {string} toggle", async ({ page }, view) => {
  await toggleOf(page, view).click();
});

When("I press the footer's {string} tool", async ({ page }, tool) => {
  await page.locator(`.footer-tools [data-tool="${tool}"]`).click();
});

When('I pick the priority floor {int}', async ({ page }, floor) => {
  await page.locator('.footer-tools [data-tool="priority"]').click();
  await page.locator(`.footer-tools [data-value="${floor}"]`).click();
});

When('I open the task of {string}', async ({ page }, target) => {
  await taskRows(page).filter({ hasText: target }).getByRole('button').click();
});

When('I open the account menu', async ({ page }) => {
  await page.locator('.user-menu > .nav-link').click();
  await expect(page.locator('.user-menu .dropdown-menu.show')).toBeVisible();
});

When('I confirm the open dialog', async ({ page }) => {
  const dialog = page.getByRole('dialog').last();
  const field = dialog.getByRole('textbox');
  const placeholder = await field.getAttribute('placeholder');
  const { keyword } = placeholder.match(/'(?<keyword>[^']+)'/).groups;
  await field.fill(keyword);
  await dialog.locator('.modal-footer .btn-danger').click();
});

When('I right-click the tree node {string}', async ({ page }, label) => {
  await page
    .locator('.sidebar-tree [data-sidebar-row]')
    .filter({ hasText: label })
    .first()
    .click({ button: 'right' });
});

When("I drag the footer's top edge {int} up", async ({ page }, up) => {
  await dragBy(page, '.footer-resize', 0, up);
});

When("I drag the footer's corner {int} right and {int} up", async ({ page }, right, up) => {
  await dragBy(page, '.footer-corner', right, up);
});

Then('the pane is {int} high', async ({ page }, height) => {
  await expect.poll(() => sizeOf(page, '.footer-pane', 'height')).toBe(height);
});

Then('the sidebar is {int} wide', async ({ page }, width) => {
  await expect.poll(() => sizeOf(page, '.sidebar', 'width')).toBe(width);
});

Then('the sidebar foot holds the account menu', async ({ page }) => {
  await expect(page.locator('.sidebar-foot .user-menu')).toBeVisible();
});

Then('the sidebar foot draws the avatar before the name', async ({ page }) => {
  const toggle = page.locator('.sidebar-foot .user-menu > .nav-link');
  await expect(toggle.locator('> :first-child')).toHaveClass(/user-menu-avatar/);
  await expect(toggle.locator('> :last-child')).toHaveClass(/user-menu-id/);
});

Then('the sidebar draws {string} above {string}', async ({ page }, upper, lower) => {
  const lowerTop = await sizeOf(page, rowOf(lower), 'top');
  await expect.poll(() => sizeOf(page, rowOf(upper), 'top')).toBeLessThan(lowerTop);
});

Then(
  'the tree node {string} begins where the label of {string} begins',
  async ({ page }, child, parent) => {
    const labelLeft = await sizeOf(page, `${rowOf(parent)} .sidebar-row-label`, 'left');
    await expect.poll(() => sizeOf(page, `${rowOf(child)} > :first-child`, 'left')).toBe(labelLeft);
  }
);

Then("the footer's name links to {string}", async ({ page }, pathname) => {
  await expect(page.locator(`.footer-edge-start a[href="${pathname}"]`)).toBeVisible();
});

Then('the footer holds the {string} toggle', async ({ page }, view) => {
  await expect(toggleOf(page, view)).toBeVisible();
});

Then('the footer holds no {string} toggle', async ({ page }, view) => {
  await expect(toggleOf(page, 'chevron')).toBeVisible();
  await expect(toggleOf(page, view)).toHaveCount(0);
});

Then('the tasks pane lists {int} tasks', async ({ page }, count) => {
  await expect(taskRows(page)).toHaveCount(count);
});

Then('the tasks pane draws the {string} column', async ({ page }, column) => {
  await expect(page.locator(`.footer-pane th[data-column="${column}"]`)).toBeVisible();
});

Then(
  'the host was asked {string} with {string} as {string}',
  async ({ page }, pathname, name, value) => {
    await expect
      .poll(() =>
        recorded(page).some(
          url => url.pathname === pathname && url.searchParams.get(name) === value
        )
      )
      .toBe(true);
  }
);

When('I pick the chart window {string}', async ({ page }, value) => {
  await panelOf(page, 'performance').locator('select[name="window"]').selectOption(value);
});

When('I pick the chart resolution {string}', async ({ page }, value) => {
  await panelOf(page, 'performance').locator('select[name="resolution"]').selectOption(value);
});

When('I toggle the {string} series of the {string} chart', async ({ page }, group, metric) => {
  await seriesOf(chartOf(page, metric), group).click();
});

When('I expand the {string} chart', async ({ page }, metric) => {
  await chartOf(page, metric).locator('[data-tool="expand"]').click();
});

Then('the host page draws the {string} panel', async ({ page }, name) => {
  await expect(panelOf(page, name)).toBeVisible();
});

Then('the host page draws no {string} panel', async ({ page }, name) => {
  await expect(panelOf(page, 'system-info')).toBeVisible();
  await expect(panelOf(page, name)).toHaveCount(0);
});

Then('the host page draws the {string} chart', async ({ page }, metric) => {
  await expect(chartOf(page, metric).locator('canvas')).toBeVisible();
});

Then('the host page draws no {string} chart', async ({ page }, metric) => {
  await expect(chartOf(page, 'cpu')).toBeVisible();
  await expect(chartOf(page, metric)).toHaveCount(0);
});

Then('the {string} chart says it draws one sample', async ({ page }, metric) => {
  await expect(chartOf(page, metric).locator(ONE_SAMPLE)).toBeVisible();
});

Then('the {string} chart says nothing of one sample', async ({ page }, metric) => {
  await expect(chartOf(page, metric).locator('canvas')).toBeVisible();
  await expect(chartOf(page, metric).locator(ONE_SAMPLE)).toHaveCount(0);
});

Then('the {string} series of the {string} chart is shown', async ({ page }, group, metric) => {
  await expect(seriesOf(chartOf(page, metric), group)).toHaveAttribute('aria-pressed', 'true');
});

Then('the {string} series of the {string} chart is hidden', async ({ page }, group, metric) => {
  await expect(seriesOf(chartOf(page, metric), group)).toHaveAttribute('aria-pressed', 'false');
});

Then('the expanded chart draws', async ({ page }) => {
  await expect(page.locator('.modal .chart-box-lg canvas')).toBeVisible();
});

Then('the {string} series of the expanded chart is shown', async ({ page }, group) => {
  await expect(seriesOf(page.locator('.modal'), group)).toHaveAttribute('aria-pressed', 'true');
});

Then('the {string} series of the expanded chart is hidden', async ({ page }, group) => {
  await expect(seriesOf(page.locator('.modal'), group)).toHaveAttribute('aria-pressed', 'false');
});

Then('the interfaces table lists {int} interfaces', async ({ page }, count) => {
  await expect(panelOf(page, 'interfaces').locator('tbody tr')).toHaveCount(count);
});
