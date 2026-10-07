import { describe, expect, it } from 'vitest';

import {
  KEPT_MS,
  arcValues,
  coreSeries,
  cpuValues,
  drawnRows,
  latestOf,
  memoryValues,
  mergeRows,
  networkRates,
  networkSeries,
  poolSeries,
  rowsOf,
  samplesIn,
  timeOf,
  windowOf,
} from '../../src/features/hosts/utils/series.js';

const GAP = { scan_timestamp: '2026-09-27T12:00:02.500Z', gap: true };

const FIRST = '2026-09-27T12:00:00.000Z';
const SECOND = '2026-09-27T12:00:05.000Z';
const THIRD = '2026-09-27T12:00:10.000Z';
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

const at = text => new Date(text).getTime();

const sample = (stamp, more = {}) => ({ scan_timestamp: stamp, ...more });

describe('timeOf and rowsOf', () => {
  it('read the instant of a sample and the rows under a member', () => {
    expect(timeOf(sample(FIRST))).toBe(at(FIRST));
    expect(Number.isNaN(timeOf({}))).toBe(true);
    expect(rowsOf({ cpu: [sample(FIRST)] }, 'cpu')).toEqual([sample(FIRST)]);
    expect(rowsOf({ cpu: 'none' }, 'cpu')).toEqual([]);
    expect(rowsOf(null, 'cpu')).toEqual([]);
  });
});

describe('mergeRows', () => {
  it('adds the rows not yet held, oldest first', () => {
    const merged = mergeRows([sample(FIRST)], [sample(THIRD), sample(FIRST), sample(SECOND)]);
    expect(merged.map(row => row.scan_timestamp)).toEqual([FIRST, SECOND, THIRD]);
  });

  it('adds a history read older than a pushed sample before it', () => {
    const merged = mergeRows([sample(THIRD)], [sample(FIRST), sample(SECOND)]);
    expect(merged.map(row => row.scan_timestamp)).toEqual([FIRST, SECOND, THIRD]);
  });

  it('adds nothing of a row pushed twice or of a row without an instant', () => {
    const held = [sample(FIRST), sample(SECOND)];
    expect(mergeRows(held, [sample(SECOND), sample(FIRST), {}])).toEqual(held);
  });

  it('tells the rows of one entity from another', () => {
    const held = [sample(FIRST, { link: 'eth0' })];
    const merged = mergeRows(
      held,
      [
        sample(FIRST, { link: 'eth0' }),
        sample(SECOND, { link: 'eth0' }),
        sample(FIRST, { link: 'wlan0' }),
        sample(SECOND, {}),
      ],
      { entity: 'link' }
    );
    expect(merged.map(row => [row.link, row.scan_timestamp])).toEqual([
      ['eth0', FIRST],
      ['wlan0', FIRST],
      ['eth0', SECOND],
    ]);
  });
});

describe('windowOf, KEPT_MS and drawnRows', () => {
  const EARLY = '2026-09-27T11:44:59.000Z';
  const EDGE = '2026-09-27T11:45:05.000Z';

  it('keeps the window before the newest sample held', () => {
    const rows = [EARLY, EDGE, FIRST, SECOND].map(stamp => sample(stamp));
    expect(windowOf(rows, { minutes: 15 }).map(row => row.scan_timestamp)).toEqual([
      EDGE,
      FIRST,
      SECOND,
    ]);
  });

  it('measures the window of each entity from its own newest sample', () => {
    const rows = [
      sample(EARLY, { dataset: 'rpool/a' }),
      sample(FIRST, { dataset: 'rpool/a' }),
      sample(EARLY, { dataset: 'rpool/b' }),
    ];
    expect(
      windowOf(rows, { entity: 'dataset', minutes: 15 }).map(row => [
        row.dataset,
        row.scan_timestamp,
      ])
    ).toEqual([
      ['rpool/a', FIRST],
      ['rpool/b', EARLY],
    ]);
  });

  it('keeps the widest window, a day, in the store', () => {
    expect(KEPT_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('draws every sample of the window before the newest one', () => {
    const start = at(FIRST);
    const rows = [...Array(300).keys()].map(index =>
      sample(new Date(start + index * 1000).toISOString())
    );
    const drawn = drawnRows(rows, { minutes: 15 });
    expect(drawn).toHaveLength(300);
    expect(drawn[drawn.length - 1]).toEqual(rows[299]);
    expect(drawnRows(rows, { minutes: 1 })).toHaveLength(61);
    expect(drawnRows([], { minutes: 15 })).toEqual([]);
  });

  it('draws a gap row where two neighbours lie over two live intervals apart', () => {
    const rows = [sample(FIRST), sample(SECOND), sample('2026-09-27T12:00:30.000Z')];
    const drawn = drawnRows(rows, { minutes: 15, liveMs: 5000 });
    expect(drawn.map(row => row.gap === true)).toEqual([false, false, true, false]);
    expect(drawn[2].scan_timestamp).toBe('2026-09-27T12:00:17.500Z');
    expect(drawnRows(rows, { minutes: 15 })).toEqual(rows);
  });
});

describe('latestOf and samplesIn', () => {
  it('answer the newest sample and the count of instants, a gap row not counted', () => {
    const rows = [sample(FIRST), sample(THIRD), sample(SECOND)];
    const pair = [sample(FIRST, { link: 'eth0' }), sample(FIRST, { link: 'wlan0' })];
    expect(latestOf(rows)).toEqual(sample(THIRD));
    expect(latestOf([])).toBeNull();
    expect(samplesIn(rows)).toBe(3);
    expect(samplesIn(pair)).toBe(1);
    expect(samplesIn([sample(FIRST), GAP, sample(SECOND)])).toBe(2);
  });
});

describe('cpuValues and coreSeries', () => {
  const rows = [
    sample(FIRST, {
      cpu_utilization_pct: '12.5',
      io_delay_pct: 1.5,
      load_avg_1min: 0.4,
      load_avg_5min: 0.3,
      load_avg_15min: 0.2,
      per_core_parsed: [{ cpu_id: 'cpu0', utilization_pct: 10 }],
    }),
    sample(SECOND, {
      cpu_utilization_pct: 20,
      per_core_parsed: [{ core: 1, utilization_pct: 30 }],
    }),
  ];

  it('read the overall use, the load and the IO delay of the samples that carry one', () => {
    expect(rows.map(cpuValues.overall)).toEqual([12.5, 20]);
    expect(rows.map(cpuValues.ioDelay)).toEqual([1.5, null]);
    expect(rows.map(cpuValues.load1)).toEqual([0.4, 0]);
  });

  it('answer null for a gap row', () => {
    expect(cpuValues.overall(GAP)).toBeNull();
    expect(cpuValues.ioDelay(GAP)).toBeNull();
    expect(arcValues.hitRatio(GAP)).toBeNull();
    expect(arcValues.compressionRatio(GAP)).toBeNull();
    expect(coreSeries([GAP])).toEqual({});
  });

  it('names a core by its cpu_id, or cpu and the number of the core', () => {
    expect(coreSeries(rows)).toEqual({
      cpu0: [[at(FIRST), 10]],
      cpu1: [[at(SECOND), 30]],
    });
  });
});

describe('memoryValues', () => {
  it('answers gigabytes and the cached value only of the samples that carry it', () => {
    const rows = [
      sample(FIRST, {
        total_memory_bytes: 8 * GIB,
        used_memory_bytes: 6 * GIB,
        free_memory_bytes: 2 * GIB,
        cached_bytes: null,
      }),
      sample(SECOND, {
        total_memory_bytes: String(8 * GIB),
        used_memory_bytes: String(4 * GIB),
        free_memory_bytes: String(4 * GIB),
        cached_bytes: GIB,
      }),
    ];
    expect(rows.map(memoryValues.used)).toEqual([6, 4]);
    expect(rows.map(memoryValues.free)).toEqual([2, 4]);
    expect(rows.map(memoryValues.cached)).toEqual([null, 1]);
  });
});

describe('networkRates', () => {
  it("takes the agent's own megabits where it answers them", () => {
    expect(networkRates({ rx_mbps: '4.5', tx_mbps: 1.25 })).toEqual({ rx: 4.5, tx: 1.25 });
  });

  it('takes the byte deltas over the seconds otherwise, never under zero', () => {
    const row = { rbytes_delta: 1250000, obytes_delta: -5, time_delta_seconds: 10 };
    expect(networkRates(row)).toEqual({ rx: 1, tx: 0 });
    expect(networkRates({ rbytes_delta: 1250000, time_delta_seconds: 0 })).toEqual({
      rx: 0,
      tx: 0,
    });
  });
});

describe('networkSeries and poolSeries', () => {
  it('draw three lines an interface', () => {
    const rows = [
      sample(FIRST, { link: 'eth0', rx_mbps: 1, tx_mbps: 2 }),
      sample(SECOND, { link: 'eth0', rx_mbps: 3, tx_mbps: 0.5 }),
      sample(FIRST, { link: 'wlan0', rx_mbps: 0, tx_mbps: 0 }),
    ];
    expect(networkSeries(rows)).toEqual({
      eth0: {
        first: [
          [at(FIRST), 1],
          [at(SECOND), 3],
        ],
        second: [
          [at(FIRST), 2],
          [at(SECOND), 0.5],
        ],
        total: [
          [at(FIRST), 3],
          [at(SECOND), 3.5],
        ],
      },
      wlan0: {
        first: [[at(FIRST), 0]],
        second: [[at(FIRST), 0]],
        total: [[at(FIRST), 0]],
      },
    });
  });

  it('draw a null point of each line for a gap row', () => {
    const rows = [
      sample(FIRST, { link: 'eth0', rx_mbps: 1, tx_mbps: 2 }),
      { ...GAP, link: 'eth0' },
    ];
    expect(networkSeries(rows).eth0).toEqual({
      first: [
        [at(FIRST), 1],
        [at(GAP.scan_timestamp), null],
      ],
      second: [
        [at(FIRST), 2],
        [at(GAP.scan_timestamp), null],
      ],
      total: [
        [at(FIRST), 3],
        [at(GAP.scan_timestamp), null],
      ],
    });
  });

  it('draw three lines a pool in megabytes a second', () => {
    const rows = [
      sample(FIRST, {
        pool: 'tank',
        read_bandwidth_bytes: String(MIB),
        write_bandwidth_bytes: String(3 * MIB),
      }),
    ];
    expect(poolSeries(rows)).toEqual({
      tank: {
        first: [[at(FIRST), 1]],
        second: [[at(FIRST), 3]],
        total: [[at(FIRST), 4]],
      },
    });
  });
});

describe('arcValues', () => {
  it('answers the sizes in gigabytes and the hit ratio the agent answers', () => {
    const row = sample(FIRST, {
      arc_size: String(2 * GIB),
      arc_target_size: String(4 * GIB),
      mru_size: GIB,
      mfu_size: GIB,
      hit_ratio: '95.5',
      data_demand_efficiency: 99,
      data_prefetch_efficiency: 50,
    });
    expect(arcValues.size(row)).toBe(2);
    expect(arcValues.target(row)).toBe(4);
    expect(arcValues.mru(row)).toBe(1);
    expect(arcValues.hitRatio(row)).toBe(95.5);
    expect(arcValues.demandEfficiency(row)).toBe(99);
    expect(arcValues.prefetchEfficiency(row)).toBe(50);
    expect(arcValues.compressionRatio(row)).toBe(1);
  });

  it('takes the hit ratio from the hits and the misses where the agent answers none', () => {
    expect(arcValues.hitRatio(sample(FIRST, { hit_ratio: 0, hits: '90', misses: '10' }))).toBe(90);
    expect(arcValues.hitRatio(sample(FIRST))).toBe(0);
  });

  it('takes the compression ratio from the two sizes where a sample carries them', () => {
    const row = sample(FIRST, { compressed_size: GIB, uncompressed_size: 2 * GIB });
    expect(arcValues.compressionRatio(row)).toBe(2);
  });
});
