import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { When, Then } = createBdd(test);

const notes = new WeakMap();

const pathOf = page => page.locator('[data-panel="machine-topology"] [data-panel="network-path"]');

const hopOf = (page, id) => pathOf(page).locator(`[data-hop="${id}"]`);

const middles = page =>
  pathOf(page)
    .locator('[data-hop]')
    .evaluateAll(nodes =>
      Object.fromEntries(
        nodes.map(node => {
          const box = node.getBoundingClientRect();
          return [node.dataset.hop, { x: Math.round(box.left), y: box.top + box.height / 2 }];
        })
      )
    );

const segmentsOf = page =>
  pathOf(page)
    .locator('[data-seg]')
    .evaluateAll(nodes => nodes.map(node => node.dataset.seg.split('>')));

const crosses = (middle, [from, to], [otherFrom, otherTo]) =>
  middle[from].x === middle[otherFrom].x &&
  middle[from].y < middle[otherFrom].y &&
  middle[to].y > middle[otherTo].y;

const crossings = (segments, middle) =>
  segments.filter(segment => segments.some(other => crosses(middle, segment, other))).length;

When('I open the hop {string}', async ({ page }, id) => {
  await hopOf(page, id).click();
});

When('I clear the pinned stream', async ({ page }) => {
  await pathOf(page).locator('[data-tool="unpin"]').click();
});

When('the network path card is {int} wide', async ({ page }, width) => {
  await page.locator('[data-panel="machine-topology"]').evaluate((panel, room) => {
    const fit = panel.querySelector('.hw-path-fit');
    const outer = panel.getBoundingClientRect().width - fit.clientWidth + room;
    panel.style.setProperty('flex', `0 0 ${outer}px`);
    panel.style.setProperty('width', `${outer}px`);
    panel.style.setProperty('max-width', `${outer}px`);
  }, width);
  await expect
    .poll(() =>
      pathOf(page)
        .locator('.hw-path-fit')
        .evaluate(node => node.clientWidth)
    )
    .toBe(width);
});

When('I note the reads the host was sent', ({ page, host }) => {
  notes.set(page, host.calls.length);
});

Then('the network path lists the vNICs {string}', async ({ page }, list) => {
  const vnics = pathOf(page).locator('[data-kind="vnic"]');
  await expect(vnics).toHaveCount(list.split(', ').length);
  const order = await vnics.evaluateAll(nodes =>
    nodes
      .map(node => ({ id: node.dataset.hop, top: node.getBoundingClientRect().top }))
      .sort((first, second) => first.top - second.top)
      .map(node => node.id.slice('vnic:'.length))
  );
  expect(order.join(', ')).toBe(list);
});

Then('the network path draws the hop {string}', async ({ page }, id) => {
  await expect(hopOf(page, id)).toBeVisible();
});

Then('the network path draws {int} hops', async ({ page }, count) => {
  await expect(pathOf(page).locator('[data-hop]')).toHaveCount(count);
});

Then('the network path ends {int} path(s) at its switch', async ({ page }, count) => {
  await expect(pathOf(page).locator('[data-note="no-uplink"]')).toHaveCount(count);
});

Then('no wire of the network path crosses another', async ({ page }) => {
  await expect(pathOf(page).locator('[data-seg]').first()).toBeAttached();
  const middle = await middles(page);
  expect(crossings(await segmentsOf(page), middle)).toBe(0);
});

Then('no chip of the network path is wider than {int}', async ({ page }, width) => {
  const widths = await pathOf(page)
    .locator('[data-hop]')
    .evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
  expect(Math.max(...widths)).toBeLessThanOrEqual(width);
});

Then('the network path is drawn {string}', async ({ page }, level) => {
  await expect(pathOf(page).locator('.hw-path-fit')).toHaveAttribute('data-fit', level);
});

Then('the network path fits its card', async ({ page }) => {
  const fit = pathOf(page).locator('.hw-path-fit');
  const overflow = () =>
    fit.evaluate(node =>
      Math.max(
        node.firstElementChild.getBoundingClientRect().width - node.clientWidth,
        node.scrollWidth - node.clientWidth
      )
    );
  await expect.poll(overflow).toBeLessThanOrEqual(1);
});

Then('the network path draws the member wire {string} down', async ({ page }, id) => {
  const wire = pathOf(page).locator(`[data-seg="${id}"]`);
  await expect(wire).toHaveAttribute('data-down', 'true');
  await expect(pathOf(page).locator('[data-pill="down"]')).toHaveCount(1);
});

Then('the hop {string} shows its member dots', async ({ page }, id) => {
  await expect(hopOf(page, id).locator('[data-note="member-dots"]')).toBeVisible();
});

Then('the network path hides the hop {string}', async ({ page }, id) => {
  await expect(hopOf(page, id)).toBeHidden();
});

Then('the hop {string} carries the busiest ring', async ({ page }, id) => {
  await expect(hopOf(page, id)).toHaveAttribute('data-hot', 'true');
  await expect(hopOf(page, id).locator('[data-note="busiest"]')).toBeVisible();
});

Then('the hop {string} carries no busiest ring', async ({ page }, id) => {
  await expect(hopOf(page, id)).toHaveAttribute('data-hot', 'false');
  await expect(hopOf(page, id).locator('[data-note="busiest"]')).toHaveCount(0);
});

Then('the hop dialog draws the fact {string}', async ({ page }, fact) => {
  await expect(page.locator(`.modal [data-panel="hop-facts"] [data-fact="${fact}"]`)).toBeVisible();
});

Then('the host was sent no GET to {string} since the note', ({ page, host }, pathname) => {
  const since = host.calls.slice(notes.get(page) ?? 0);
  expect(since.filter(call => call.key === `GET ${pathname}`)).toHaveLength(0);
});

Then('the network path shows {string} alone', async ({ page }, id) => {
  await expect(pathOf(page)).toHaveAttribute('data-pinned', id);
  await expect(pathOf(page).locator('[data-note="pinned"]')).toBeVisible();
});

Then('the network path shows every stream', async ({ page }) => {
  await expect(pathOf(page)).toHaveAttribute('data-pinned', '');
  await expect(pathOf(page).locator('[data-note="pinned"]')).toHaveCount(0);
});
