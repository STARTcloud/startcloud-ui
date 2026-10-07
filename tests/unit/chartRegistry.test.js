import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ARC_CHARTS,
  CHARTS,
  CHART_ORDER,
  chartOf,
} from '../../src/features/hosts/charts/registry.js';
import {
  arcChartSpec,
  ioSpec,
  poolSpec,
  summarySpec as storageSummarySpec,
} from '../../src/features/hosts/utils/chartDefaults.js';
import { chartSpec, chartToggles } from '../../src/features/hosts/utils/chartSpecs.js';
import {
  diskSpec,
  linkSpec,
  machineCpuSpec,
  machineDiskSpec,
  machineMemorySpec,
  machineNetworkSpec,
  zoneCpuSpec,
  zoneMemorySpec,
} from '../../src/features/hosts/utils/machineChartSpecs.js';
import { diskDevices } from '../../src/features/hosts/utils/machineSeries.js';
import {
  interfaceSpec,
  summarySpec as networkSummarySpec,
} from '../../src/features/hosts/utils/networking.js';
import { CHART_TONES } from '../../src/utils/chart.js';
import { FIXTURES } from '../fixtures/charts/rows.js';

const SNAPSHOT = JSON.parse(
  readFileSync(new URL('../fixtures/charts/snapshot.json', import.meta.url), 'utf8')
);

const KEYS = [
  'cpu',
  'memory',
  'network',
  'pool-io',
  'arc',
  'disk-io',
  'pool',
  'storage-summary',
  'arc-memory',
  'arc-efficiency',
  'arc-compression',
  'network-summary',
  'interface',
  'zone-cpu',
  'zone-memory',
  'zone-disk',
  'zone-link',
  'machine-cpu',
  'machine-memory',
  'machine-network',
  'machine-disk',
];

const MEMBERS = ['first', 'second', 'total'];

const t = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);

const entries = KEYS.map(key => chartOf(key));

const linesOf = entry => [...entry.lines, ...(entry.entityLines || [])];

const toggledOf = groups =>
  Object.fromEntries(Object.keys(groups).map(key => [key, key === 'cores']));

describe('CHARTS', () => {
  it('holds one entry a chart under its own key and nothing else', () => {
    expect(Object.keys(CHARTS).sort()).toEqual([...KEYS].sort());
    entries.forEach(entry => {
      expect(entry.key).toBe(KEYS[entries.indexOf(entry)]);
      expect(chartOf(entry.key)).toBe(entry);
    });
  });

  it('gives every entry a feed, tokens, axes, lines, groups, toggles and texts', () => {
    entries.forEach(entry => {
      expect(typeof entry.feed.path).toBe('string');
      expect(typeof entry.feed.member).toBe('string');
      expect(Array.isArray(entry.tokens)).toBe(true);
      expect(entry.tokens).toContain('monitoring');
      expect(entry.axes.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.lines)).toBe(true);
      expect(typeof entry.groups).toBe('object');
      expect(Array.isArray(entry.toggles)).toBe(true);
      expect(typeof entry.cardLegend).toBe('boolean');
      expect(typeof entry.texts.emptyKey).toBe('string');
    });
  });

  it('draws each entry by plain lines, by entity lines or by summary charts', () => {
    entries.forEach(entry => {
      const ways = [
        entry.lines.length > 0,
        Boolean(entry.series && entry.entityLines),
        Boolean(entry.series && entry.charts),
      ].filter(Boolean);
      expect(ways).toHaveLength(1);
    });
  });

  it('paints every line in one of the ten tones, an entity line in its entity tone otherwise', () => {
    entries.forEach(entry => {
      entry.lines.forEach(line => expect(CHART_TONES).toContain(line.tone));
      (entry.entityLines || []).forEach(line =>
        expect(line.tone === undefined || CHART_TONES.includes(line.tone)).toBe(true)
      );
      entry.toggles.forEach(toggle =>
        expect(['info', 'warning', 'success']).toContain(toggle.tone)
      );
    });
  });

  it('gives no two lines of one chart the same key', () => {
    entries.forEach(entry => {
      const keys = linesOf(entry).map(line => line.key ?? line.member);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  it('gives every line a value, an expansion or a member, and a label where it is named', () => {
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        expect(typeof line.value === 'function' || typeof line.expand === 'function').toBe(true);
        expect(Boolean(line.labelKey) || Boolean(line.expand)).toBe(true);
      });
      (entry.entityLines || []).forEach(line => {
        expect(MEMBERS.includes(line.member) || ['read', 'write'].includes(line.member)).toBe(true);
        expect(typeof line.labelKey).toBe('string');
      });
    });
  });

  it('names a toggle for every group and a group for every toggle', () => {
    entries.forEach(entry => {
      expect(entry.toggles.map(toggle => toggle.key).sort()).toEqual(
        Object.keys(entry.groups).sort()
      );
    });
  });

  it('names the host page and the ARC page charts in order', () => {
    expect(CHART_ORDER).toEqual(SNAPSHOT.CHART_ORDER);
    expect(ARC_CHARTS.map(key => ({ key, ...chartOf(key).texts }))).toEqual(
      SNAPSHOT.storage.ARC_CHARTS.map(chart => ({
        ...chart,
        emptyKey: 'host.storageCharts.noData',
      }))
    );
  });
});

describe('the host charts', () => {
  it('carry the words, the groups and the legend of each chart', () => {
    CHART_ORDER.forEach(metric => {
      expect(chartOf(metric).texts).toMatchObject(SNAPSHOT.CHART_TEXTS[metric]);
      expect(chartOf(metric).groups).toEqual(SNAPSHOT.DEFAULT_VISIBILITY[metric]);
      expect(chartOf(metric).cardLegend).toBe(SNAPSHOT.CARD_LEGEND[metric]);
    });
  });

  it('draw the same lines, axes and toggles over the same samples', () => {
    CHART_ORDER.forEach(metric => {
      const rows = FIXTURES.host[metric];
      const { groups } = chartOf(metric);
      expect(chartSpec(metric, { rows, visibility: groups, t })).toEqual(
        SNAPSHOT.host[metric].shown
      );
      expect(chartSpec(metric, { rows, visibility: toggledOf(groups), t })).toEqual(
        SNAPSHOT.host[metric].toggled
      );
      expect(chartToggles(metric, t)).toEqual(SNAPSHOT.host[metric].toggles);
    });
  });

  it('leave out the IO delay and the cached line while no sample carries them', () => {
    expect(
      chartSpec('cpu', { rows: FIXTURES.host.cpuPlain, visibility: chartOf('cpu').groups, t })
    ).toEqual(SNAPSHOT.host.cpuPlain);
    expect(
      chartSpec('memory', {
        rows: FIXTURES.host.memoryPlain,
        visibility: chartOf('memory').groups,
        t,
      })
    ).toEqual(SNAPSHOT.host.memoryPlain);
  });
});

describe('the machine charts', () => {
  it('draw the same lines and axes over the same samples', () => {
    const { zone, diskio, link, usage } = FIXTURES.machine;
    expect(zoneCpuSpec({ rows: zone, t })).toEqual(SNAPSHOT.machine.zoneCpu);
    expect(zoneMemorySpec({ rows: zone, t })).toEqual(SNAPSHOT.machine.zoneMemory);
    expect(diskDevices(diskio).map(device => diskSpec({ device, t }))).toEqual(
      SNAPSHOT.machine.disks
    );
    expect(linkSpec({ rows: link, t })).toEqual(SNAPSHOT.machine.link);
    expect(machineCpuSpec({ rows: usage, t })).toEqual(SNAPSHOT.machine.cpu);
    expect(machineMemorySpec({ rows: usage, t })).toEqual(SNAPSHOT.machine.memory);
    expect(machineNetworkSpec({ rows: usage, t })).toEqual(SNAPSHOT.machine.network);
    expect(machineDiskSpec({ rows: usage, t })).toEqual(SNAPSHOT.machine.disk);
  });
});

describe('the bandwidth charts', () => {
  const summary = chartOf('network-summary');
  const interfaces = summary.series(FIXTURES.host.network);

  it('list the three summary charts', () => {
    expect(summary.charts).toEqual(SNAPSHOT.networking.SUMMARY_CHARTS);
  });

  it('draw the same summary and interface lines over the same samples', () => {
    expect(MEMBERS.map(member => networkSummarySpec(member, interfaces, t))).toEqual(
      SNAPSHOT.networking.summary
    );
    expect(Object.keys(interfaces).map(name => interfaceSpec(interfaces[name], t))).toEqual(
      SNAPSHOT.networking.interfaces
    );
  });
});

describe('the storage charts', () => {
  const summary = chartOf('storage-summary');
  const devices = summary.series(FIXTURES.storage.diskIo);
  const pools = chartOf('pool').series(FIXTURES.host['pool-io']);

  it('list the three summary charts and the three toggles', () => {
    expect(summary.charts).toEqual(SNAPSHOT.storage.SUMMARY_CHARTS);
    expect(chartToggles('disk-io', t)).toEqual(SNAPSHOT.storage.toggles);
    expect(chartOf('pool').toggles).toBe(chartOf('disk-io').toggles);
    expect(chartOf('pool').groups).toBe(chartOf('disk-io').groups);
  });

  it('draw the same summary, device, pool and ARC lines over the same samples', () => {
    expect(MEMBERS.map(member => storageSummarySpec(member, devices, t))).toEqual(
      SNAPSHOT.storage.summary
    );
    expect(
      Object.keys(devices).map(name =>
        ioSpec(devices[name], { read: true, write: false, total: true }, t)
      )
    ).toEqual(SNAPSHOT.storage.devices);
    expect(
      Object.keys(pools).map(name =>
        poolSpec(pools[name], { read: true, write: true, total: true }, t)
      )
    ).toEqual(SNAPSHOT.storage.pools);
    expect(ARC_CHARTS.map(key => arcChartSpec(key, FIXTURES.host.arc, t))).toEqual(
      SNAPSHOT.storage.arc
    );
  });
});
