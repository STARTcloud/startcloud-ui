import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { test as base } from 'playwright-bdd';

const FIXTURES_DIR = path.resolve('tests/fixtures');
const JSON_HEADERS = { 'content-type': 'application/json' };
const REPORT_KEY = 'POST /api/client-errors';

const readAnswer = (contract, file) =>
  fs.readFileSync(path.join(FIXTURES_DIR, contract, file), 'utf8');

const loadIndex = async contract => {
  const module = await import(pathToFileURL(path.join(FIXTURES_DIR, contract, 'index.js')).href);
  return module.default;
};

const keyOf = request => {
  const url = new URL(request.url());
  return `${request.method()} ${url.pathname}`;
};

/**
 * The fixture server of the testing contract: every request the shared UI
 * makes to `/api/*` is answered from `tests/fixtures/<contract>/index.js`,
 * keyed `"METHOD path"`, with the JSON file and status the key names; a
 * write whose body the scenario marked as refused answers the `refused`
 * file with 422; the error reporter's `POST /api/client-errors` answers
 * 204 on every fixture, since a scenario's expected failures are shipped
 * like any other; a key the fixture lacks answers 404 with a problem
 * body, so a scenario never reaches a dev proxy target.
 */
export class FixtureHost {
  constructor(page) {
    this.page = page;
    this.contracts = [];
    this.refuse = new Set();
    this.calls = [];
  }

  async serve(contract) {
    const index = await loadIndex(contract);
    this.contracts.unshift({ contract, index });
    if (this.contracts.length > 1) {
      return;
    }
    await this.page.route('**/api/**', route => this.answer(route));
  }

  refuseNext(method, pathname) {
    this.refuse.add(`${method.toUpperCase()} ${pathname}`);
  }

  answered(method, pathname) {
    const key = `${method.toUpperCase()} ${pathname}`;
    return this.calls.filter(call => call.key === key);
  }

  async answer(route) {
    const request = route.request();
    const key = keyOf(request);
    const body = request.postData();
    this.calls.push({ key, body: body ? JSON.parse(body) : null });
    if (key === REPORT_KEY) {
      await route.fulfill({ status: 204 });
      return;
    }
    const found = this.contracts.map(entry => [entry, entry.index[key]]).find(([, hit]) => hit);
    if (!found) {
      await route.fulfill({
        status: 404,
        headers: { 'content-type': 'application/problem+json' },
        body: JSON.stringify({ type: 'about:blank', title: 'Not Found', status: 404 }),
      });
      return;
    }
    const [{ contract }, hit] = found;
    if (hit.refused && this.refuse.has(key)) {
      this.refuse.delete(key);
      await route.fulfill({
        status: 422,
        headers: { 'content-type': 'application/problem+json' },
        body: readAnswer(contract, hit.refused),
      });
      return;
    }
    await route.fulfill({
      status: hit.status,
      headers: JSON_HEADERS,
      body: readAnswer(contract, hit.file),
    });
  }
}

export const test = base.extend({
  host: async ({ page }, provide) => {
    await provide(new FixtureHost(page));
  },
});

export { expect } from '@playwright/test';
