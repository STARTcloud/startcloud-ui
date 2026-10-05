import { describe, expect, it } from 'vitest';

import {
  arcSeries,
  cpuSeries,
  drawnRows,
  latestOf,
  memorySeries,
  mergeRows,
  networkRates,
  networkSeries,
  poolSeries,
  ringRows,
  rowsOf,
  samplesIn,
  timeOf,
  windowOf,
} from '../../src/features/hosts/utils/series.js';

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

  it('keeps the newest rows of each entity up to the limit', () => {
    const rows = [sample(FIRST), sample(SECOND), sample(THIRD)];
    const merged = mergeRows([], rows, { limit: 2 });
    expect(merged.map(row => row.scan_timestamp)).toEqual([SECOND, THIRD]);
  });
});

describe('windowOf, ringRows and drawnRows', () => {
  const EARLY = '2026-09-27T11:44:59.000Z';
  const EDGE = '2026-09-27T11:45:05.000Z';
  const YESTERDAY = '2026-09-26T11:59:59.000Z';

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

  it('keeps the widest window in the ring and drops the day before it', () => {
    const rows = [sample(YESTERDAY), sample(EARLY), sample(SECOND)];
    expect(ringRows(rows).map(row => row.scan_timestamp)).toEqual([EARLY, SECOND]);
    expect(ringRows([])).toEqual([]);
  });

  it('draws the window before the newest sample, the 180 newest of it', () => {
    const start = at(FIRST);
    const rows = [...Array(300).keys()].map(index =>
      sample(new Date(start + index * 1000).toISOString())
    );
    const drawn = drawnRows(rows, { minutes: 15 });
    expect(drawn).toHaveLength(180);
    expect(drawn[drawn.length - 1]).toEqual(rows[299]);
    expect(drawnRows(rows, { minutes: 1 })).toHaveLength(61);
    expect(drawnRows([], { minutes: 15 })).toEqual([]);
  });
});

describe('latestOf and samplesIn', () => {
  it('answer the newest sample and the count of instants', () => {
    const rows = [sample(FIRST), sample(THIRD), sample(SECOND)];
    const pair = [sample(FIRST, { link: 'eth0' }), sample(FIRST, { link: 'wlan0' })];
    expect(latestOf(rows)).toEqual(sample(THIRD));
    expect(latestOf([])).toBeNull();
    expect(samplesIn(rows)).toBe(3);
    expect(samplesIn(pair)).toBe(1);
  });
});

describe('cpuSeries', () => {
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

  it('draws the overall use, the load and the IO delay of the samples that carry one', () => {
    const points = cpuSeries(rows);
    expect(points.overall).toEqual([
      [at(FIRST), 12.5],
      [at(SECOND), 20],
    ]);
    expect(points.ioDelay).toEqual([[at(FIRST), 1.5]]);
    expect(points.load1).toEqual([
      [at(FIRST), 0.4],
      [at(SECOND), 0],
    ]);
  });

  it('names a core by its cpu_id, or cpu and the number of the core', () => {
    expect(cpuSeries(rows).cores).toEqual({
      cpu0: [[at(FIRST), 10]],
      cpu1: [[at(SECOND), 30]],
    });
  });
});

describe('memorySeries', () => {
  it('answers gigabytes and the cached line only of the samples that carry it', () => {
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
    const points = memorySeries(rows);
    expect(points.used).toEqual([
      [at(FIRST), 6],
      [at(SECOND), 4],
    ]);
    expect(points.free).toEqual([
      [at(FIRST), 2],
      [at(SECOND), 4],
    ]);
    expect(points.cached).toEqual([[at(SECOND), 1]]);
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

describe('arcSeries', () => {
  it('answers the sizes in gigabytes and the hit ratio the agent answers', () => {
    const rows = [
      sample(FIRST, {
        arc_size: String(2 * GIB),
        arc_target_size: String(4 * GIB),
        mru_size: GIB,
        mfu_size: GIB,
        hit_ratio: '95.5',
        data_demand_efficiency: 99,
        data_prefetch_efficiency: 50,
      }),
    ];
    const points = arcSeries(rows);
    expect(points.size).toEqual([[at(FIRST), 2]]);
    expect(points.target).toEqual([[at(FIRST), 4]]);
    expect(points.mru).toEqual([[at(FIRST), 1]]);
    expect(points.hitRatio).toEqual([[at(FIRST), 95.5]]);
    expect(points.demandEfficiency).toEqual([[at(FIRST), 99]]);
    expect(points.prefetchEfficiency).toEqual([[at(FIRST), 50]]);
    expect(points.compressionRatio).toEqual([[at(FIRST), 1]]);
  });

  it('takes the hit ratio from the hits and the misses where the agent answers none', () => {
    const rows = [sample(FIRST, { hit_ratio: 0, hits: '90', misses: '10' })];
    expect(arcSeries(rows).hitRatio).toEqual([[at(FIRST), 90]]);
    expect(arcSeries([sample(FIRST)]).hitRatio).toEqual([[at(FIRST), 0]]);
  });

  it('takes the compression ratio from the two sizes where a sample carries them', () => {
    const rows = [sample(FIRST, { compressed_size: GIB, uncompressed_size: 2 * GIB })];
    expect(arcSeries(rows).compressionRatio).toEqual([[at(FIRST), 2]]);
  });
});
