import { describe, expect, it } from 'vitest';

import {
  CARD_LEGEND,
  CHART_ORDER,
  CHART_TEXTS,
  DEFAULT_VISIBILITY,
  chartSpec,
  chartToggles,
} from '../../src/features/hosts/utils/chartSpecs.js';

const FIRST = '2026-09-27T12:00:00.000Z';
const GIB = 1024 ** 3;

const t = key => key;

const at = text => new Date(text).getTime();

const specOf = (metric, rows, visibility = DEFAULT_VISIBILITY[metric]) =>
  chartSpec(metric, { rows, visibility, t });

describe('the charts', () => {
  it("draw in hyperweaver-ui's order, each with its own words", () => {
    expect(CHART_ORDER).toEqual(['pool-io', 'arc', 'network', 'cpu', 'memory']);
    expect(Object.keys(CHART_TEXTS).sort()).toEqual([...CHART_ORDER].sort());
    expect(CHART_TEXTS.cpu.emptyKey).toBe('hosts.charts.cpu.empty');
  });

  it('open with every group shown but the load averages', () => {
    expect(DEFAULT_VISIBILITY.cpu).toEqual({ overall: true, cores: true, load: false });
    expect(DEFAULT_VISIBILITY.network).toEqual({ read: true, write: true, total: true });
    expect(DEFAULT_VISIBILITY.arc).toEqual({});
  });

  it('draw the legend in every card but the CPU chart', () => {
    expect(CHART_ORDER.filter(metric => !CARD_LEGEND[metric])).toEqual(['cpu']);
  });
});

describe('chartToggles', () => {
  it('answers one button a group in the tone of the group', () => {
    const toggles = chartToggles('network', t);
    expect(toggles.map(toggle => [toggle.key, toggle.label, toggle.tone])).toEqual([
      ['read', 'hosts.charts.network.rx', 'info'],
      ['write', 'hosts.charts.network.tx', 'warning'],
      ['total', 'hosts.charts.network.total', 'success'],
    ]);
    expect(chartToggles('arc', t)).toEqual([]);
  });

  it('answers the three groups of the CPU chart', () => {
    const keys = chartToggles('cpu', t).map(toggle => toggle.key);
    expect(keys).toEqual(['overall', 'cores', 'load']);
  });
});

describe('chartSpec', () => {
  it('draws the CPU lines, the load averages hidden on the second axis', () => {
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
    expect(spec.series.map(line => [line.key, Boolean(line.hidden), line.axis || 0])).toEqual([
      ['overall', false, 0],
      ['ioDelay', false, 0],
      ['core:cpu0', false, 0],
      ['load1', true, 1],
      ['load5', true, 1],
      ['load15', true, 1],
    ]);
    expect(spec.series[0].points).toEqual([[at(FIRST), 12]]);
  });

  it('draws no IO delay line for samples that carry none', () => {
    const spec = specOf('cpu', [{ scan_timestamp: FIRST, cpu_utilization_pct: 12 }]);
    expect(spec.series.map(line => line.key)).toEqual(['overall', 'load1', 'load5', 'load15']);
  });

  it('draws the cached line only where a sample carries it', () => {
    const row = { scan_timestamp: FIRST, used_memory_bytes: GIB, free_memory_bytes: GIB };
    expect(specOf('memory', [row]).series.map(line => line.key)).toEqual(['used', 'free']);
    const cached = specOf('memory', [{ ...row, cached_bytes: GIB }]);
    expect(cached.series.map(line => line.key)).toEqual(['used', 'free', 'cached']);
    expect(cached.axes).toEqual([{ name: 'hosts.charts.memory.axis', min: 0, unit: ' GB' }]);
  });

  it('draws three lines an interface, every interface a tone of its own', () => {
    const rows = [
      { scan_timestamp: FIRST, link: 'eth0', rx_mbps: 1, tx_mbps: 2 },
      { scan_timestamp: FIRST, link: 'wlan0', rx_mbps: 3, tx_mbps: 4 },
    ];
    const spec = specOf('network', rows, { read: false, write: true, total: true });
    expect(spec.series.map(line => [line.key, line.tone, Boolean(line.hidden)])).toEqual([
      ['eth0:first', 'blue', true],
      ['eth0:second', 'blue', false],
      ['eth0:total', 'blue', false],
      ['wlan0:first', 'orange', true],
      ['wlan0:second', 'orange', false],
      ['wlan0:total', 'orange', false],
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
