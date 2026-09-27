import { describe, expect, it } from 'vitest';

import {
  NO_CPU,
  arcShare,
  collectionOf,
  coreCount,
  cpuStep,
  cpuTotals,
  cpuUsage,
  cpuUsageBetween,
  healthTone,
  interfaceCounts,
  latestPer,
  memoryUsage,
  summaryRows,
  swapUsage,
  tableLabel,
  taskCounts,
  toolRows,
  uptimeParts,
} from '../../src/features/hosts/utils/resources.js';

const statsOf = cpus => ({ cpus: cpus.map(times => ({ times })) });

const EARLIER = statsOf([
  { user: 100, nice: 0, sys: 50, idle: 850, irq: 500 },
  { user: 200, nice: 0, sys: 50, idle: 750, irq: 500 },
]);
const LATER = statsOf([
  { user: 200, nice: 0, sys: 50, idle: 1250, irq: 900 },
  { user: 250, nice: 0, sys: 100, idle: 1150, irq: 900 },
]);

describe('uptimeParts', () => {
  it('answers the days, the hours and the minutes of an uptime in seconds', () => {
    expect(uptimeParts(3600)).toEqual({ days: 0, hours: 1, minutes: 0 });
    expect(uptimeParts(90061)).toEqual({ days: 1, hours: 1, minutes: 1 });
    expect(uptimeParts('7200')).toEqual({ days: 0, hours: 2, minutes: 0 });
  });

  it('answers nothing for an uptime the agent did not answer', () => {
    expect(uptimeParts(0)).toBeNull();
    expect(uptimeParts(undefined)).toBeNull();
    expect(uptimeParts('soon')).toBeNull();
  });
});

describe('cpuTotals', () => {
  it('sums the user, nice, system and idle times and leaves irq out', () => {
    expect(coreCount(EARLIER)).toBe(2);
    expect(cpuTotals(EARLIER)).toEqual({ idle: 1600, total: 2000 });
  });

  it('answers nothing for stats that carry no cpus', () => {
    expect(coreCount({})).toBe(0);
    expect(cpuTotals({})).toBeNull();
    expect(cpuTotals(null)).toBeNull();
    expect(cpuTotals({ cpus: [] })).toBeNull();
  });
});

describe('cpuUsageBetween', () => {
  it('answers the share of the time between two readings that was not idle', () => {
    expect(cpuUsageBetween(cpuTotals(EARLIER), cpuTotals(LATER))).toBe(20);
  });

  it('answers nothing without an earlier reading or while the counters did not move', () => {
    const totals = cpuTotals(EARLIER);
    expect(cpuUsageBetween(null, totals)).toBeNull();
    expect(cpuUsageBetween(totals, null)).toBeNull();
    expect(cpuUsageBetween(totals, totals)).toBeNull();
    expect(cpuUsageBetween(cpuTotals(LATER), totals)).toBeNull();
  });
});

describe('cpuStep', () => {
  it('holds no share after one reading and the share after a second', () => {
    const first = cpuStep(NO_CPU, '1', EARLIER);
    expect(first.percent).toBeNull();
    expect(first.totals).toEqual({ idle: 1600, total: 2000 });
    expect(cpuStep(first, '1', LATER).percent).toBe(20);
  });

  it('keeps the share held while the counters did not move', () => {
    const second = cpuStep(cpuStep(NO_CPU, '1', EARLIER), '1', LATER);
    expect(cpuStep(second, '1', LATER).percent).toBe(20);
  });

  it('never compares the counters of two hosts', () => {
    const held = cpuStep(NO_CPU, '1', EARLIER);
    const other = cpuStep(held, '2', LATER);
    expect(other.id).toBe('2');
    expect(other.percent).toBeNull();
  });
});

describe('cpuUsage', () => {
  it("draws the newest sample's use over the share held", () => {
    expect(cpuUsage({ sample: { cpu_utilization_pct: '33.3' }, held: 20 })).toBe(33.3);
    expect(cpuUsage({ sample: { cpu_utilization_pct: 150 }, held: 20 })).toBe(100);
    expect(cpuUsage({ sample: null, held: 20 })).toBe(20);
    expect(cpuUsage({ sample: {}, held: null })).toBeNull();
  });
});

describe('memoryUsage and arcShare', () => {
  it("takes the stats' total less free while no sample is held", () => {
    const memory = memoryUsage({ stats: { totalmem: 1000, freemem: 250 }, sample: null });
    expect(memory).toEqual({ total: 1000, used: 750, percent: 75 });
  });

  it("takes the newest sample's total and used where one is held", () => {
    const sample = { total_memory_bytes: '2000', used_memory_bytes: '500' };
    const memory = memoryUsage({ stats: { totalmem: 1000, freemem: 250 }, sample });
    expect(memory).toEqual({ total: 2000, used: 500, percent: 25 });
  });

  it('answers nothing while neither names a total', () => {
    expect(memoryUsage({ stats: {}, sample: null })).toBeNull();
    expect(memoryUsage({ stats: null, sample: {} })).toBeNull();
  });

  it('holds the ARC to the used amount', () => {
    const memory = { total: 1000, used: 750, percent: 75 };
    expect(arcShare(memory, 500)).toBe(50);
    expect(arcShare(memory, 900)).toBe(75);
    expect(arcShare(memory, 0)).toBe(0);
    expect(arcShare(null, 500)).toBe(0);
  });
});

describe('swapUsage', () => {
  const summary = {
    totalSwapBytes: 200,
    usedSwapBytes: 20,
    freeSwapBytes: 180,
    overallUtilization: 10,
  };

  it('follows the newest memory sample where it names a swap total', () => {
    const sample = {
      swap_total_bytes: 100,
      swap_used_bytes: 25,
      swap_free_bytes: 75,
      swap_utilization_pct: '25',
    };
    const swap = swapUsage({ summary, sample });
    expect(swap).toEqual({ total: 100, used: 25, free: 75, percent: 25 });
  });

  it('takes the swap summary otherwise and nothing for a host without swap', () => {
    const swap = swapUsage({ summary, sample: { swap_total_bytes: 0 } });
    expect(swap).toEqual({ total: 200, used: 20, free: 180, percent: 10 });
    expect(swapUsage({ summary: { totalSwapBytes: 0 }, sample: null })).toBeNull();
    expect(swapUsage({ summary: null, sample: null })).toBeNull();
  });
});

describe('latestPer and interfaceCounts', () => {
  const rows = [
    { link: 'vnic0', class: 'vnic', state: 'up', scan_timestamp: '2026-09-27T12:00:00.000Z' },
    { link: 'igb0', class: 'phys', state: 'down', scan_timestamp: '2026-09-27T11:59:00.000Z' },
    { link: 'igb0', class: 'phys', state: 'up', scan_timestamp: '2026-09-27T12:00:00.000Z' },
    { link: 'eth0', class: 'phys', state: 'down' },
    { class: 'phys', state: 'up' },
  ];

  it('keeps the newest row of each entity in the order of their names', () => {
    const kept = latestPer(rows, row => row.link);
    expect(kept.map(row => [row.link, row.state])).toEqual([
      ['eth0', 'down'],
      ['igb0', 'up'],
      ['vnic0', 'up'],
    ]);
    expect(latestPer(null, row => row.link)).toEqual([]);
  });

  it('counts the interfaces in all, physical, virtual, up and down', () => {
    const counts = interfaceCounts(latestPer(rows, row => row.link));
    expect(counts).toEqual({ total: 3, physical: 2, virtual: 1, up: 2, down: 1 });
  });
});

describe('healthTone', () => {
  it('draws healthy success, warning warning and every other word danger', () => {
    expect(healthTone('healthy')).toBe('success');
    expect(healthTone('warning')).toBe('warning');
    expect(healthTone('degraded')).toBe('danger');
    expect(healthTone('stopped')).toBe('danger');
    expect(healthTone(undefined)).toBe('danger');
  });
});

describe('taskCounts', () => {
  it('reads the counts by the names the agents answer', () => {
    const stats = { pending_tasks: 2, running_tasks: 1, completed_tasks: 40, failed_tasks: 3 };
    const none = { pending: 0, running: 0, completed: 0, failed: 0 };
    expect(taskCounts(stats)).toEqual({ pending: 2, running: 1, completed: 40, failed: 3 });
    expect(taskCounts({ pending: 9 })).toEqual(none);
    expect(taskCounts(null)).toEqual(none);
  });
});

describe('toolRows', () => {
  it('draws rsync and scp soft while the built-in transport stands in for them', () => {
    const tools = { vagrant: true, rsync: false, ansible: false, builtin_sync: true };
    expect(toolRows(tools)).toEqual({
      rows: [
        { name: 'vagrant', installed: true, soft: false },
        { name: 'rsync', installed: false, soft: true },
        { name: 'ansible', installed: false, soft: false },
      ],
      missing: 1,
    });
  });

  it('counts rsync missing on an agent without the built-in transport', () => {
    const answer = toolRows({ rsync: false, git: true, note: 'text' });
    expect(answer.rows.map(row => [row.name, row.soft])).toEqual([
      ['rsync', false],
      ['git', false],
    ]);
    expect(answer.missing).toBe(1);
    expect(toolRows(null)).toEqual({ rows: [], missing: 0 });
  });
});

describe('summaryRows', () => {
  it('opens a table key into words', () => {
    expect(tableLabel('networkUsage')).toBe('network Usage');
    expect(tableLabel('cpu_samples')).toBe('cpu samples');
  });

  it('lists the tables that hold records with their newest sample', () => {
    const summary = {
      recordCounts: { cpu_samples: 12, memory_samples: 0, network_samples: '7' },
      latestData: { cpu_samples: '2026-09-27T12:00:00Z' },
    };
    expect(summaryRows(summary)).toEqual([
      { key: 'cpu_samples', label: 'cpu samples', records: 12, latest: '2026-09-27T12:00:00Z' },
      { key: 'network_samples', label: 'network samples', records: 7, latest: '' },
    ]);
    expect(summaryRows({ recordCounts: {} })).toEqual([]);
    expect(summaryRows(null)).toEqual([]);
  });
});

describe('collectionOf', () => {
  it('reads the interval and the retention where the status answers one number each', () => {
    const status = { config: { collection_interval: 5, retention_days: 7 } };
    expect(collectionOf(status)).toEqual({ interval: 5, retention: 7 });
    expect(collectionOf({ config: { intervals: { storage: 300 } } })).toEqual({
      interval: 0,
      retention: 0,
    });
    expect(collectionOf(null)).toEqual({ interval: 0, retention: 0 });
  });
});
