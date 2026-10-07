import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HISTORY,
  LIVE,
  isGap,
  recordOf,
  withGaps,
} from '../../src/features/hosts/charts/splice.js';
import { installIndexedDb } from '../support/indexedDb.js';

const SERIES = '3|cpu';
const LINKS = '3|network';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const NOON = Date.UTC(2026, 8, 27, 12, 0, 0);

const stamp = ms => new Date(ms).toISOString();

const sample = (ms, more = {}) => ({ scan_timestamp: stamp(ms), ...more });

const instants = rows => rows.map(row => Date.parse(row.scan_timestamp) - NOON);

const openV1 = (fake, entries) =>
  new Promise(resolve => {
    const request = fake.indexedDB.open('monitoring-samples', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('samples');
      Object.entries(entries).forEach(([key, rows]) => store.put(rows, key));
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
  });

let fake = null;
let store = null;

beforeEach(async () => {
  vi.resetModules();
  fake = installIndexedDb();
  store = await import('../../src/features/hosts/charts/store.js');
});

describe('add, range, newest and trim', () => {
  it('keeps one record a sample and reads a span oldest first', async () => {
    expect(await store.add(SERIES, sample(NOON + MINUTE))).toBe(true);
    expect(await store.add(SERIES, sample(NOON))).toBe(true);
    expect(await store.add(SERIES, sample(NOON + 2 * MINUTE))).toBe(true);
    expect(await store.add(SERIES, {})).toBe(false);
    expect(instants(await store.range(SERIES, NOON, NOON + 2 * MINUTE))).toEqual([
      0,
      MINUTE,
      2 * MINUTE,
    ]);
    expect(instants(await store.range(SERIES, NOON + MINUTE, NOON + MINUTE))).toEqual([MINUTE]);
    expect(await store.range('other', NOON, NOON + DAY)).toEqual([]);
    expect(await store.newest(SERIES)).toBe(NOON + 2 * MINUTE);
    expect(await store.newest('other')).toBeNull();
    expect(await store.oldest(SERIES)).toBe(NOON);
    expect(await store.oldest('other')).toBeNull();
  });

  it('keeps the rows of two interfaces taken at one instant as two records', async () => {
    await store.add(LINKS, sample(NOON, { link: 'igb0', rx_mbps: 1 }), 'link');
    await store.add(LINKS, sample(NOON, { link: 'vnic0', rx_mbps: 2 }), 'link');
    expect(await store.add(LINKS, sample(NOON, { rx_mbps: 3 }), 'link')).toBe(false);
    const rows = await store.range(LINKS, NOON, NOON);
    expect(rows.map(row => row.link)).toEqual(['igb0', 'vnic0']);
  });

  it('trims the samples older than the span before the newest held', async () => {
    await store.add(SERIES, sample(NOON - DAY - MINUTE));
    await store.add(SERIES, sample(NOON - DAY));
    await store.add(SERIES, sample(NOON));
    await store.trim(SERIES, DAY);
    expect(instants(await store.range(SERIES, NOON - 2 * DAY, NOON))).toEqual([-DAY, 0]);
  });

  it('answers empty while IndexedDB is unavailable', async () => {
    delete globalThis.indexedDB;
    expect(await store.add(SERIES, sample(NOON))).toBe(false);
    expect(await store.range(SERIES, NOON, NOON)).toEqual([]);
    expect(await store.newest(SERIES)).toBeNull();
    expect(await store.oldest(SERIES)).toBeNull();
    await expect(store.trim(SERIES, DAY)).resolves.toBeUndefined();
    await expect(store.addMany(SERIES, [sample(NOON)])).resolves.toBeUndefined();
  });
});

describe('addMany', () => {
  it('writes a duplicate instant of one entity as one record', async () => {
    await store.addMany(SERIES, [
      sample(NOON, { cpu_utilization_pct: 1 }),
      sample(NOON + MINUTE),
      sample(NOON, { cpu_utilization_pct: 2 }),
      {},
    ]);
    const rows = await store.range(SERIES, NOON, NOON + MINUTE);
    expect(rows).toHaveLength(2);
    expect(rows[0].cpu_utilization_pct).toBe(2);
  });

  it('keeps the pushed samples older than the span the history answered', async () => {
    const pushed = [...Array(10).keys()].map(index => sample(NOON - (10 - index) * MINUTE));
    await Promise.all(pushed.map(row => store.add(SERIES, row)));
    await store.addMany(SERIES, [sample(NOON - MINUTE), sample(NOON)]);
    const rows = await store.range(SERIES, NOON - DAY, NOON);
    expect(rows).toHaveLength(11);
    expect(instants(rows)[0]).toBe(-10 * MINUTE);
    expect(await store.newest(SERIES)).toBe(NOON);
  });

  it('drops a pushed sample older than the newest instant the history answered', async () => {
    await store.add(SERIES, sample(NOON - MINUTE, { origin: 'pushed' }));
    await store.add(SERIES, sample(NOON + MINUTE, { origin: 'pushed' }));
    await store.addMany(SERIES, [sample(NOON - MINUTE), sample(NOON)]);
    expect(await store.add(SERIES, sample(NOON - 2 * MINUTE))).toBe(false);
    expect(await store.add(SERIES, sample(NOON + 2 * MINUTE))).toBe(true);
    const rows = await store.range(SERIES, NOON - DAY, NOON + DAY);
    expect(instants(rows)).toEqual([-MINUTE, 0, MINUTE, 2 * MINUTE]);
    expect(rows[0].origin).toBeUndefined();
  });
});

describe('the migration from version 1', () => {
  it('splits every held array into records once and drops the old store', async () => {
    await openV1(fake, {
      '3|cpu': [sample(NOON), sample(NOON + MINUTE)],
      '3|network': [
        sample(NOON, { link: 'igb0' }),
        sample(NOON, { link: 'vnic0' }),
        sample(NOON + MINUTE, {}),
      ],
      'self|web-1|zone-diskio': [sample(NOON, { dataset: 'tank/a' })],
    });
    expect(instants(await store.range('3|cpu', NOON, NOON + DAY))).toEqual([0, MINUTE]);
    const links = await store.range('3|network', NOON, NOON + DAY);
    expect(links.map(row => row.link)).toEqual(['igb0', 'vnic0']);
    expect(await store.newest('self|web-1|zone-diskio')).toBe(NOON);
    const held = fake.databases.get('monitoring-samples');
    expect(held.version).toBe(2);
    expect(held.stores.get('samples').keyPath).toEqual(['series', 'instant', 'entity']);
  });
});

describe('recordOf', () => {
  it('names the series, the instant, the entity and the origin', () => {
    expect(
      recordOf({ series: LINKS, row: sample(NOON, { link: 'igb0' }), entity: 'link', origin: LIVE })
    ).toEqual({
      series: LINKS,
      instant: NOON,
      entity: 'igb0',
      origin: LIVE,
      row: sample(NOON, { link: 'igb0' }),
    });
    expect(recordOf({ series: SERIES, row: sample(NOON), origin: HISTORY }).entity).toBe('');
    expect(recordOf({ series: LINKS, row: sample(NOON), entity: 'link', origin: LIVE })).toBeNull();
    expect(recordOf({ series: SERIES, row: {}, origin: LIVE })).toBeNull();
  });
});

describe('withGaps', () => {
  const live = 5000;

  it('puts a gap row at the midpoint of a hole over two live intervals', () => {
    const rows = [sample(NOON), sample(NOON + live), sample(NOON + 4 * live)];
    const drawn = withGaps(rows, live);
    expect(drawn.map(isGap)).toEqual([false, false, true, false]);
    expect(drawn[2].scan_timestamp).toBe(stamp(NOON + 2.5 * live));
    expect(withGaps(rows, 0)).toBe(rows);
    expect(withGaps([sample(NOON), sample(NOON + 2 * live)], live).map(isGap)).toEqual([
      false,
      false,
    ]);
  });

  it('measures the hole of each entity on its own', () => {
    const rows = [
      sample(NOON, { link: 'igb0' }),
      sample(NOON, { link: 'vnic0' }),
      sample(NOON + live, { link: 'igb0' }),
      sample(NOON + 3 * live, { link: 'igb0' }),
      sample(NOON + 3 * live, { link: 'vnic0' }),
    ];
    const drawn = withGaps(rows, live, 'link');
    expect(drawn.map(row => [row.link, isGap(row)])).toEqual([
      ['igb0', false],
      ['vnic0', false],
      ['igb0', false],
      ['igb0', false],
      ['vnic0', true],
      ['vnic0', false],
    ]);
  });
});
