import { describe, expect, it } from 'vitest';

import { CHART_ORDER, chartOf } from '../../src/features/hosts/charts/registry.js';
import { chartPills, chartSpec, visibleSeries } from '../../src/features/hosts/utils/chartSpecs.js';

const FIRST = '2026-09-27T12:00:00.000Z';
const SECOND = '2026-09-27T12:00:10.000Z';
const GIB = 1024 ** 3;

const t = key => key;

const at = text => new Date(text).getTime();

const specOf = (metric, rows) => chartSpec(metric, { rows, t });

describe('the charts', () => {
  it('draw in the host page order, each with its own words', () => {
    expect(CHART_ORDER).toEqual(['pool-io', 'arc', 'network', 'cpu', 'memory']);
    expect(CHART_ORDER.every(metric => chartOf(metric).texts.emptyKey)).toBe(true);
    expect(chartOf('cpu').texts.emptyKey).toBe('hosts.charts.cpu.empty');
  });

  it('open with every pill pressed but the load averages', () => {
    expect(chartOf('cpu').groups).toEqual({
      overall: true,
      ioDelay: true,
      core: true,
      load1: false,
      load5: false,
      load15: false,
    });
    expect(chartOf('network').groups).toEqual({ read: true, write: true, total: true });
    expect(chartOf('arc').groups).toEqual({ size: true, target: true, hitRate: true });
  });
});

describe('chartPills', () => {
  it('answers one pill a line of a plain chart, in the line tone, a line not drawn giving none', () => {
    const row = {
      scan_timestamp: FIRST,
      cpu_utilization_pct: 12,
      per_core_parsed: [{ cpu_id: 'cpu0', utilization_pct: 10 }],
    };
    expect(chartPills('cpu', specOf('cpu', [row]).series, t)).toEqual([
      { key: 'overall', label: 'hosts.charts.cpu.overall', tone: 'blue' },
      { key: 'core', label: 'hosts.charts.cpu.cores', tone: 'teal' },
      { key: 'load1', label: 'hosts.charts.cpu.load1', tone: 'orange' },
      { key: 'load5', label: 'hosts.charts.cpu.load5', tone: 'green' },
      { key: 'load15', label: 'hosts.charts.cpu.load15', tone: 'pink' },
    ]);
    const plain = specOf('cpu', [{ scan_timestamp: FIRST, cpu_utilization_pct: 12 }]);
    expect(chartPills('cpu', plain.series, t).map(pill => pill.key)).toEqual([
      'overall',
      'load1',
      'load5',
      'load15',
    ]);
  });

  it('answers one pill a line of the ARC charts, every one shown as the chart opens', () => {
    const row = {
      scan_timestamp: FIRST,
      arc_size: GIB,
      arc_target_size: GIB,
      mru_size: GIB,
      mfu_size: GIB,
      hit_ratio: 90,
      data_demand_efficiency: 99,
      data_prefetch_efficiency: 50,
      compressed_size: GIB,
      uncompressed_size: 2 * GIB,
    };
    const pillsOf = key =>
      chartPills(key, specOf(key, [row]).series, t).map(pill => [pill.key, pill.tone]);
    expect(pillsOf('arc')).toEqual([
      ['size', 'blue'],
      ['target', 'red'],
      ['hitRate', 'green'],
    ]);
    expect(pillsOf('arc-memory')).toEqual([
      ['size', 'blue'],
      ['target', 'purple'],
      ['mru', 'green'],
      ['mfu', 'orange'],
    ]);
    expect(pillsOf('arc-efficiency')).toEqual([
      ['hitRatio', 'green'],
      ['demand', 'red'],
      ['prefetch', 'orange'],
    ]);
    expect(pillsOf('arc-compression')).toEqual([['compression', 'purple']]);
    ['arc', 'arc-memory', 'arc-efficiency', 'arc-compression'].forEach(key => {
      const { groups, lines } = chartOf(key);
      expect(groups).toEqual(Object.fromEntries(lines.map(line => [line.key, true])));
    });
  });

  it('answers the group pills of an entity chart in the neutral tone', () => {
    expect(chartPills('network', [], t).map(pill => [pill.key, pill.label, pill.tone])).toEqual([
      ['read', 'hosts.charts.network.rx', ''],
      ['write', 'hosts.charts.network.tx', ''],
      ['total', 'hosts.charts.network.total', ''],
    ]);
    expect(chartPills('storage-summary', [], t)).toEqual([]);
  });
});

describe('visibleSeries', () => {
  it('hides the series of a group pressed off and shows a group not named', () => {
    const series = [
      { key: 'a', group: 'read', points: [] },
      { key: 'b', group: 'write', points: [] },
      { key: 'c', points: [] },
    ];
    expect(visibleSeries(series, { read: false }).map(line => line.hidden)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe('chartSpec', () => {
  it('draws the CPU lines, the load averages on the second axis, each in the group of its pill', () => {
    const rows = [
      {
        scan_timestamp: FIRST,
        cpu_utilization_pct: 12,
        io_delay_pct: 1,
        per_core_parsed: [{ cpu_id: 'cpu0', utilization_pct: 10 }],
      },
    ];
    const spec = specOf('cpu', rows);
    expect(spec.axes).toHaveLength(2);
    expect(spec.series.map(line => [line.key, line.group, line.axis || 0])).toEqual([
      ['overall', 'overall', 0],
      ['ioDelay', 'ioDelay', 0],
      ['core:cpu0', 'core', 0],
      ['load1', 'load1', 1],
      ['load5', 'load5', 1],
      ['load15', 'load15', 1],
    ]);
    expect(spec.series[0].points).toEqual([[at(FIRST), 12]]);
  });

  it('draws no IO delay line for samples that carry none', () => {
    const spec = specOf('cpu', [{ scan_timestamp: FIRST, cpu_utilization_pct: 12 }]);
    expect(spec.series.map(line => line.key)).toEqual(['overall', 'load1', 'load5', 'load15']);
  });

  it('draws a gap row as a null point of every line, the cores seen before it too', () => {
    const rows = [
      {
        scan_timestamp: FIRST,
        cpu_utilization_pct: 12,
        per_core_parsed: [{ cpu_id: 'cpu0', utilization_pct: 10 }],
      },
      { scan_timestamp: SECOND, gap: true },
    ];
    const spec = specOf('cpu', rows);
    expect(spec.series.find(line => line.key === 'overall').points).toEqual([
      [at(FIRST), 12],
      [at(SECOND), null],
    ]);
    expect(spec.series.find(line => line.key === 'core:cpu0').points).toEqual([
      [at(FIRST), 10],
      [at(SECOND), null],
    ]);
  });

  it('draws the cached and swap lines only where a sample carries them', () => {
    const row = { scan_timestamp: FIRST, used_memory_bytes: GIB, free_memory_bytes: GIB };
    expect(specOf('memory', [row]).series.map(line => line.key)).toEqual(['used', 'free']);
    const cached = specOf('memory', [{ ...row, cached_bytes: GIB, swap_used_bytes: GIB }]);
    expect(cached.series.map(line => line.key)).toEqual(['used', 'free', 'cached', 'swap']);
    expect(cached.axes).toEqual([{ name: 'hosts.charts.memory.axis', min: 0, unit: ' GB' }]);
  });

  it('draws three lines an interface under its entity, every interface a tone of its own', () => {
    const rows = [
      { scan_timestamp: FIRST, link: 'eth0', rx_mbps: 1, tx_mbps: 2 },
      { scan_timestamp: FIRST, link: 'wlan0', rx_mbps: 3, tx_mbps: 4 },
    ];
    const spec = specOf('network', rows);
    expect(spec.series.map(line => [line.key, line.entity, line.group, line.tone])).toEqual([
      ['eth0:first', 'eth0', 'read', 'blue'],
      ['eth0:second', 'eth0', 'write', 'blue'],
      ['eth0:total', 'eth0', 'total', 'blue'],
      ['wlan0:first', 'wlan0', 'read', 'orange'],
      ['wlan0:second', 'wlan0', 'write', 'orange'],
      ['wlan0:total', 'wlan0', 'total', 'orange'],
    ]);
    expect(spec.series[2].points).toEqual([[at(FIRST), 3]]);
    expect(spec.axes[0].unit).toBe(' Mbps');
  });

  it('draws three lines a pool in megabytes a second', () => {
    const rows = [{ scan_timestamp: FIRST, pool: 'tank', read_bandwidth_bytes: 1048576 }];
    const spec = specOf('pool-io', rows);
    const keys = spec.series.map(line => line.key);
    expect(keys).toEqual(['tank:first', 'tank:second', 'tank:total']);
    expect(spec.series[0].points).toEqual([[at(FIRST), 1]]);
    expect(spec.axes[0].unit).toBe(' MB/s');
  });

  it('draws the ARC size and target in gigabytes and the hit rate in percent', () => {
    const row = { scan_timestamp: FIRST, arc_size: GIB, arc_target_size: 2 * GIB, hit_ratio: 90 };
    const spec = specOf('arc', [row]);
    expect(spec.series.map(line => [line.key, line.axis || 0, line.dash || 'solid'])).toEqual([
      ['size', 0, 'solid'],
      ['target', 0, 'dash'],
      ['hitRate', 1, 'solid'],
    ]);
    expect(spec.axes.map(axis => axis.unit)).toEqual([' GB', '%']);
  });
});
