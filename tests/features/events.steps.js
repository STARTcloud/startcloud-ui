import fs from 'node:fs';
import path from 'node:path';

import { createBdd } from 'playwright-bdd';

import { expect, test } from './support/fixtures.js';

const { Given, When, Then } = createBdd(test);

const STREAM_DIR = path.resolve('tests/fixtures/events');
const STREAM_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  'x-accel-buffering': 'no',
};
const requests = new WeakMap();

const gates = new WeakMap();

const recorded = page => {
  if (!requests.has(page)) {
    requests.set(page, []);
  }
  return requests.get(page);
};

const serveStream = (page, answer) =>
  page.route('**/api/events**', route => {
    const request = route.request();
    recorded(page).push({ url: new URL(request.url()), headers: request.headers() });
    return route.fulfill(answer);
  });

Given('the stream answers the {word} frames', async ({ page }, name) => {
  await serveStream(page, {
    status: 200,
    headers: STREAM_HEADERS,
    body: fs.readFileSync(path.join(STREAM_DIR, `${name}.sse`), 'utf8'),
  });
});

Given('the stream answers {int}', async ({ page }, status) => {
  await serveStream(page, { status, body: '' });
});

Given('the stream holds the {word} frames', async ({ page }, name) => {
  const gate = {};
  gate.opened = new Promise(resolve => {
    gate.release = resolve;
  });
  gates.set(page, gate);
  const body = fs.readFileSync(path.join(STREAM_DIR, `${name}.sse`), 'utf8');
  await page.route('**/api/events**', async route => {
    recorded(page).push({
      url: new URL(route.request().url()),
      headers: route.request().headers(),
    });
    await gate.opened;
    return route.fulfill({ status: 200, headers: STREAM_HEADERS, body });
  });
});

When('the stream releases its frames', ({ page }) => {
  gates.get(page).release();
});

Then('the stream was requested at {string}', async ({ page }, pathname) => {
  await expect.poll(() => recorded(page).length).toBeGreaterThan(0);
  expect(recorded(page).every(call => call.url.pathname === pathname)).toBe(true);
});

Then('the stream was requested with {string} as {string}', async ({ page }, name, value) => {
  await expect.poll(() => recorded(page).length).toBeGreaterThan(0);
  expect(recorded(page).every(call => call.url.searchParams.get(name) === value)).toBe(true);
});

Then('the stream request carried {string} as {string}', async ({ page }, header, value) => {
  await expect.poll(() => recorded(page).length).toBeGreaterThan(0);
  const [first] = recorded(page);
  expect(first.headers[header.toLowerCase()]).toBe(value);
});

Then('the stream request carried no {string}', async ({ page }, header) => {
  await expect.poll(() => recorded(page).length).toBeGreaterThan(0);
  const [first] = recorded(page);
  expect(first.headers[header.toLowerCase()]).toBeUndefined();
});

Then('the stream has been requested once', async ({ page }) => {
  await expect.poll(() => recorded(page).length).toBeGreaterThan(0);
  expect(recorded(page).length).toBe(1);
});
