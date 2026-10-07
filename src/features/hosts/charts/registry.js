import {
  MACHINE_SERIES,
  diskDevices,
  linkValues,
  machineValues,
  zoneValues,
} from '../utils/machineSeries';
import { SERIES } from '../utils/monitoring';
import {
  arcValues,
  coreSeries,
  cpuValues,
  memoryValues,
  networkSeries,
  poolSeries,
} from '../utils/series';
import { ioSeries } from '../utils/StorageUtils';

const PERCENT = 100;
const MONITORING = ['monitoring'];
const NO_GROUPS = {};
const NO_LINES = [];
const ALL_IO_GROUPS = { read: true, write: true, total: true };
const ZONE = 'machine.machineResourceCharts';
const MACHINE = 'machine.vboxResourceCharts';
const ENTITY_SERIES_KEY = 'hosts.charts.entitySeries';
const STORAGE_EMPTY = 'host.storageCharts.noData';
const BANDWIDTH_EMPTY = 'host.bandwidthCharts.noData';

const deviceSeries = rows => ioSeries(rows, row => row[SERIES['disk-io'].entity]);

const hostEntityLines = labels => [
  { member: 'first', group: 'read', labelKey: labels.read, dash: 'solid', width: 2, opacity: 0.55 },
  { member: 'second', group: 'write', labelKey: labels.write, dash: 'dash', width: 2, opacity: 1 },
  { member: 'total', group: 'total', labelKey: labels.total, dash: 'solid', width: 3, opacity: 1 },
];

const groupPills = labels => [
  { key: 'read', labelKey: labels.read },
  { key: 'write', labelKey: labels.write },
  { key: 'total', labelKey: labels.total },
];

const NETWORK_LABELS = {
  read: 'hosts.charts.network.rx',
  write: 'hosts.charts.network.tx',
  total: 'hosts.charts.network.total',
};

const POOL_IO_LABELS = {
  read: 'hosts.charts.poolIo.read',
  write: 'hosts.charts.poolIo.write',
  total: 'hosts.charts.poolIo.total',
};

const IO_LINES = [
  {
    member: 'first',
    group: 'read',
    labelKey: 'host.expandedChartOptions.seriesRead',
    tone: 'blue',
    width: 2,
  },
  {
    member: 'second',
    group: 'write',
    labelKey: 'host.expandedChartOptions.seriesWrite',
    tone: 'orange',
    width: 2,
  },
  {
    member: 'total',
    group: 'total',
    labelKey: 'host.expandedChartOptions.seriesTotal',
    tone: 'green',
    width: 3,
  },
];

const IO_PILLS = groupPills({
  read: 'host.storageCharts.read',
  write: 'host.storageCharts.write',
  total: 'host.storageCharts.total',
});

const BANDWIDTH_AXES = [
  { nameKey: 'host.expandedChartOptions.axisBandwidthMBs', min: 0, unit: ' MB/s' },
];

const MEGABIT_AXES = [{ nameKey: 'hosts.charts.network.axis', min: 0, unit: ' Mbps' }];

const machinePair = ({ keys, labels, values }) => [
  { key: keys[0], labelKey: labels[0], value: values[0], tone: 'blue', width: 2 },
  { key: keys[1], labelKey: labels[1], value: values[1], tone: 'orange', width: 2 },
];

const hostTexts = name => ({
  titleKey: `hosts.charts.${name}.title`,
  chartTitleKey: `hosts.charts.${name}.chartTitle`,
  expandedKey: `hosts.charts.${name}.expanded`,
  emptyKey: `hosts.charts.${name}.empty`,
});

/**
 * The host page's charts in the order it draws them.
 */
export const CHART_ORDER = ['pool-io', 'arc', 'network', 'cpu', 'memory'];

/**
 * The ARC page's charts in the order it draws them.
 */
export const ARC_CHARTS = ['arc-memory', 'arc-efficiency', 'arc-compression'];

/**
 * Every chart the hosts feature draws, one entry a chart, the one place a
 * chart is described. An entry carries `key`; `feed`, the series table
 * row its samples are read and pushed by; `tokens`, the ones the host's
 * own row must list; `axes`, one or two value axes, each `nameKey` or a
 * literal `name`, `min`, `max` and `unit` where it has them; `lines`,
 * the lines drawn of every sample, each `key`, `labelKey` or `label`,
 * `value(row)`, its `axis`, `tone`, `dash`, `width`, `opacity`,
 * `digits`, `optional` for a line left out while no sample carries it,
 * and `expand(rows)` for a line drawn once per core, each line one pill
 * of the card's header in its tone; `series(rows)`, the builder that
 * groups the samples by entity, with `entityLines`, the lines drawn of
 * each entity by the member of its points, each in the `group` its pill
 * names, and `pills`, the groups' pills, each `key` and `labelKey`, or
 * `charts`, the summary charts drawn one line an entity of one member;
 * `groups`, the pills pressed as the chart opens, a pill not named
 * pressed; and `texts`, the keys of the chart's words.
 */
export const CHARTS = {
  cpu: {
    key: 'cpu',
    feed: SERIES.cpu,
    tokens: SERIES.cpu.tokens,
    axes: [
      { nameKey: 'hosts.charts.cpu.usageAxis', min: 0, max: PERCENT, unit: '%' },
      { nameKey: 'hosts.charts.cpu.loadAxis' },
    ],
    lines: [
      {
        key: 'overall',
        labelKey: 'hosts.charts.cpu.overall',
        value: cpuValues.overall,
        tone: 'blue',
        width: 3,
      },
      {
        key: 'ioDelay',
        labelKey: 'hosts.charts.cpu.ioDelay',
        value: cpuValues.ioDelay,
        tone: 'yellow',
        dash: 'short-dash',
        width: 2,
        optional: true,
      },
      {
        key: 'core',
        labelKey: 'hosts.charts.cpu.cores',
        expand: coreSeries,
        tone: 'teal',
        width: 1,
        opacity: 0.5,
      },
      {
        key: 'load1',
        labelKey: 'hosts.charts.cpu.load1',
        value: cpuValues.load1,
        tone: 'orange',
        dash: 'short-dot',
        axis: 1,
      },
      {
        key: 'load5',
        labelKey: 'hosts.charts.cpu.load5',
        value: cpuValues.load5,
        tone: 'green',
        dash: 'short-dot',
        axis: 1,
      },
      {
        key: 'load15',
        labelKey: 'hosts.charts.cpu.load15',
        value: cpuValues.load15,
        tone: 'pink',
        dash: 'short-dot',
        axis: 1,
      },
    ],
    groups: { overall: true, ioDelay: true, core: true, load1: false, load5: false, load15: false },
    texts: hostTexts('cpu'),
  },
  memory: {
    key: 'memory',
    feed: SERIES.memory,
    tokens: SERIES.memory.tokens,
    axes: [{ nameKey: 'hosts.charts.memory.axis', min: 0, unit: ' GB' }],
    lines: [
      {
        key: 'used',
        labelKey: 'hosts.charts.memory.used',
        value: memoryValues.used,
        tone: 'orange',
        optional: true,
      },
      {
        key: 'free',
        labelKey: 'hosts.charts.memory.free',
        value: memoryValues.free,
        tone: 'green',
        optional: true,
      },
      {
        key: 'cached',
        labelKey: 'hosts.charts.memory.cached',
        value: memoryValues.cached,
        tone: 'blue',
        optional: true,
      },
      {
        key: 'swap',
        labelKey: 'hosts.charts.memory.swap',
        value: memoryValues.swap,
        tone: 'purple',
        dash: 'dash',
        optional: true,
      },
    ],
    groups: { used: true, free: true, cached: true, swap: true },
    texts: hostTexts('memory'),
  },
  network: {
    key: 'network',
    feed: SERIES.network,
    tokens: SERIES.network.tokens,
    axes: MEGABIT_AXES,
    lines: NO_LINES,
    series: networkSeries,
    entityLines: hostEntityLines(NETWORK_LABELS),
    pills: groupPills(NETWORK_LABELS),
    groups: ALL_IO_GROUPS,
    texts: { ...hostTexts('network'), entityKey: ENTITY_SERIES_KEY },
  },
  'pool-io': {
    key: 'pool-io',
    feed: SERIES['pool-io'],
    tokens: SERIES['pool-io'].tokens,
    axes: [{ nameKey: 'hosts.charts.poolIo.axis', min: 0, unit: ' MB/s' }],
    lines: NO_LINES,
    series: poolSeries,
    entityLines: hostEntityLines(POOL_IO_LABELS),
    pills: groupPills(POOL_IO_LABELS),
    groups: ALL_IO_GROUPS,
    texts: { ...hostTexts('poolIo'), entityKey: ENTITY_SERIES_KEY },
  },
  arc: {
    key: 'arc',
    feed: SERIES.arc,
    tokens: SERIES.arc.tokens,
    axes: [
      { nameKey: 'hosts.charts.arc.sizeAxis', min: 0, unit: ' GB' },
      { nameKey: 'hosts.charts.arc.hitAxis', min: 0, max: PERCENT, unit: '%' },
    ],
    lines: [
      {
        key: 'size',
        labelKey: 'hosts.charts.arc.size',
        value: arcValues.size,
        tone: 'blue',
        width: 2,
      },
      {
        key: 'target',
        labelKey: 'hosts.charts.arc.target',
        value: arcValues.target,
        tone: 'red',
        dash: 'dash',
        width: 2,
      },
      {
        key: 'hitRate',
        labelKey: 'hosts.charts.arc.hitRate',
        value: arcValues.hitRatio,
        tone: 'green',
        width: 3,
        axis: 1,
        digits: 1,
      },
    ],
    groups: { size: true, target: true, hitRate: true },
    texts: hostTexts('arc'),
  },
  'disk-io': {
    key: 'disk-io',
    feed: SERIES['disk-io'],
    tokens: SERIES['disk-io'].tokens,
    axes: BANDWIDTH_AXES,
    lines: NO_LINES,
    series: deviceSeries,
    entityLines: IO_LINES,
    pills: IO_PILLS,
    groups: ALL_IO_GROUPS,
    texts: { titleKey: 'host.expandedChartOptions.individualTitle', emptyKey: STORAGE_EMPTY },
  },
  pool: {
    key: 'pool',
    feed: SERIES['pool-io'],
    tokens: SERIES['pool-io'].tokens,
    axes: BANDWIDTH_AXES,
    lines: NO_LINES,
    series: poolSeries,
    entityLines: IO_LINES,
    pills: IO_PILLS,
    groups: ALL_IO_GROUPS,
    texts: { titleKey: 'host.expandedChartOptions.poolTitle', emptyKey: STORAGE_EMPTY },
  },
  'storage-summary': {
    key: 'storage-summary',
    feed: SERIES['disk-io'],
    tokens: SERIES['disk-io'].tokens,
    axes: BANDWIDTH_AXES,
    lines: NO_LINES,
    series: deviceSeries,
    charts: [
      {
        key: 'read',
        member: 'first',
        titleKey: 'hostCharts.summaryCharts.readBandwidthTitle',
        expandedKey: 'host.expandedChartOptions.summaryRead',
      },
      {
        key: 'write',
        member: 'second',
        titleKey: 'hostCharts.summaryCharts.writeBandwidthTitle',
        expandedKey: 'host.expandedChartOptions.summaryWrite',
      },
      {
        key: 'total',
        member: 'total',
        titleKey: 'hostCharts.summaryCharts.totalBandwidthTitle',
        expandedKey: 'host.expandedChartOptions.summaryTotal',
      },
    ],
    groups: NO_GROUPS,
    texts: { emptyKey: STORAGE_EMPTY },
  },
  'arc-memory': {
    key: 'arc-memory',
    feed: SERIES.arc,
    tokens: SERIES.arc.tokens,
    axes: [{ nameKey: 'hostCharts.arcCharts.memoryGbAxisLabel', min: 0, unit: ' GB' }],
    lines: [
      {
        key: 'size',
        labelKey: 'hostCharts.arcCharts.arcSizeSeriesName',
        value: arcValues.size,
        tone: 'blue',
        width: 3,
      },
      {
        key: 'target',
        labelKey: 'hostCharts.arcCharts.targetSizeSeriesName',
        value: arcValues.target,
        tone: 'purple',
        dash: 'dash',
        width: 2,
      },
      {
        key: 'mru',
        labelKey: 'hostCharts.arcCharts.mruSizeSeriesName',
        value: arcValues.mru,
        tone: 'green',
        width: 2,
      },
      {
        key: 'mfu',
        labelKey: 'hostCharts.arcCharts.mfuSizeSeriesName',
        value: arcValues.mfu,
        tone: 'orange',
        width: 2,
      },
    ],
    groups: { size: true, target: true, mru: true, mfu: true },
    texts: {
      titleKey: 'hostCharts.arcCharts.memoryAllocationTitle',
      expandedKey: 'host.expandedChartOptions.arcMemoryTitle',
      emptyKey: STORAGE_EMPTY,
    },
  },
  'arc-efficiency': {
    key: 'arc-efficiency',
    feed: SERIES.arc,
    tokens: SERIES.arc.tokens,
    axes: [
      { nameKey: 'hostCharts.arcCharts.efficiencyAxisLabel', min: 0, max: PERCENT, unit: '%' },
    ],
    lines: [
      {
        key: 'hitRatio',
        labelKey: 'hostCharts.arcCharts.hitRatioSeriesName',
        value: arcValues.hitRatio,
        tone: 'green',
        width: 3,
        digits: 1,
      },
      {
        key: 'demand',
        labelKey: 'hostCharts.arcCharts.demandEfficiencySeriesName',
        value: arcValues.demandEfficiency,
        tone: 'red',
        width: 2,
      },
      {
        key: 'prefetch',
        labelKey: 'hostCharts.arcCharts.prefetchEfficiencySeriesName',
        value: arcValues.prefetchEfficiency,
        tone: 'orange',
        width: 2,
      },
    ],
    groups: { hitRatio: true, demand: true, prefetch: true },
    texts: {
      titleKey: 'hostCharts.arcCharts.cacheEfficiencyTitle',
      expandedKey: 'host.expandedChartOptions.arcEfficiencyTitle',
      emptyKey: STORAGE_EMPTY,
    },
  },
  'arc-compression': {
    key: 'arc-compression',
    feed: SERIES.arc,
    tokens: SERIES.arc.tokens,
    axes: [{ nameKey: 'hostCharts.arcCharts.compressionRatioAxisLabel', min: 1, unit: 'x' }],
    lines: [
      {
        key: 'compression',
        labelKey: 'hostCharts.arcCharts.compressionRatioSeriesName',
        value: arcValues.compressionRatio,
        tone: 'purple',
        width: 3,
      },
    ],
    groups: { compression: true },
    texts: {
      titleKey: 'hostCharts.arcCharts.compressionEffectivenessTitle',
      expandedKey: 'host.expandedChartOptions.arcCompressionTitle',
      emptyKey: STORAGE_EMPTY,
    },
  },
  'network-summary': {
    key: 'network-summary',
    feed: SERIES.network,
    tokens: SERIES.network.tokens,
    axes: MEGABIT_AXES,
    lines: NO_LINES,
    series: networkSeries,
    charts: [
      { key: 'rx', member: 'first', titleKey: 'host.bandwidthCharts.rxBandwidth' },
      { key: 'tx', member: 'second', titleKey: 'host.bandwidthCharts.txBandwidth' },
      { key: 'total', member: 'total', titleKey: 'host.bandwidthCharts.totalBandwidth' },
    ],
    groups: NO_GROUPS,
    texts: { emptyKey: BANDWIDTH_EMPTY },
  },
  interface: {
    key: 'interface',
    feed: SERIES.network,
    tokens: SERIES.network.tokens,
    axes: MEGABIT_AXES,
    lines: NO_LINES,
    series: networkSeries,
    entityLines: [
      { member: 'first', group: 'read', labelKey: NETWORK_LABELS.read, tone: 'blue', width: 2 },
      {
        member: 'second',
        group: 'write',
        labelKey: NETWORK_LABELS.write,
        tone: 'orange',
        width: 2,
      },
      { member: 'total', group: 'total', labelKey: NETWORK_LABELS.total, tone: 'green', width: 3 },
    ],
    pills: groupPills(NETWORK_LABELS),
    groups: ALL_IO_GROUPS,
    texts: { emptyKey: BANDWIDTH_EMPTY },
  },
  'zone-cpu': {
    key: 'zone-cpu',
    feed: MACHINE_SERIES['zone-usage'],
    tokens: MONITORING,
    axes: [{ name: '%', min: 0, unit: '%' }],
    lines: [
      { key: 'cpu', labelKey: `${ZONE}.cpuSeries`, value: zoneValues.cpu, tone: 'green', width: 2 },
    ],
    groups: NO_GROUPS,
    texts: {
      titleKey: `${ZONE}.cpuTitle`,
      emptyKey: `${ZONE}.waitingForSamples`,
      failKey: `${ZONE}.cpuMemoryFailed`,
    },
  },
  'zone-memory': {
    key: 'zone-memory',
    feed: MACHINE_SERIES['zone-usage'],
    tokens: MONITORING,
    axes: [{ name: 'GB', min: 0, unit: ' GB' }],
    lines: machinePair({
      keys: ['resident', 'swap'],
      labels: [`${ZONE}.residentSeries`, `${ZONE}.swapSeries`],
      values: [zoneValues.resident, zoneValues.swap],
    }),
    groups: NO_GROUPS,
    texts: {
      titleKey: `${ZONE}.memoryTitle`,
      emptyKey: `${ZONE}.waitingForSamples`,
      failKey: `${ZONE}.cpuMemoryFailed`,
    },
  },
  'zone-disk': {
    key: 'zone-disk',
    feed: MACHINE_SERIES['zone-diskio'],
    tokens: MONITORING,
    axes: [{ name: 'MB/s', min: 0, unit: ' MB/s' }],
    lines: NO_LINES,
    series: diskDevices,
    entityLines: [
      { member: 'read', group: 'read', labelKey: `${ZONE}.readSeries`, tone: 'blue', width: 2 },
      {
        member: 'write',
        group: 'write',
        labelKey: `${ZONE}.writeSeries`,
        tone: 'orange',
        width: 2,
      },
    ],
    pills: [
      { key: 'read', labelKey: `${ZONE}.readSeries` },
      { key: 'write', labelKey: `${ZONE}.writeSeries` },
    ],
    groups: { read: true, write: true },
    texts: {
      titleKey: `${ZONE}.diskTitle`,
      emptyKey: `${ZONE}.waitingForSamples`,
      failKey: `${ZONE}.diskIoFailed`,
    },
  },
  'zone-link': {
    key: 'zone-link',
    feed: MACHINE_SERIES.link,
    tokens: MONITORING,
    axes: [{ name: 'Mbps', min: 0, unit: ' Mbps' }],
    lines: machinePair({
      keys: ['rx', 'tx'],
      labels: [`${ZONE}.rxSeries`, `${ZONE}.txSeries`],
      values: [linkValues.rx, linkValues.tx],
    }),
    groups: NO_GROUPS,
    texts: {
      titleKey: `${ZONE}.networkTitle`,
      emptyKey: `${ZONE}.waitingForSamples`,
      failKey: `${ZONE}.networkFailed`,
    },
  },
  'machine-cpu': {
    key: 'machine-cpu',
    feed: MACHINE_SERIES['machine-usage'],
    tokens: MONITORING,
    axes: [{ name: '%', min: 0, unit: '%' }],
    lines: [
      {
        key: 'guest',
        labelKey: `${MACHINE}.guestSeries`,
        value: machineValues.cpuGuest,
        tone: 'green',
        width: 2,
      },
      {
        key: 'vmm',
        labelKey: `${MACHINE}.vmmSeries`,
        value: machineValues.cpuVmm,
        tone: 'purple',
        width: 2,
      },
    ],
    groups: NO_GROUPS,
    texts: {
      titleKey: `${MACHINE}.cpuTitle`,
      emptyKey: `${MACHINE}.waitingForSample`,
      failKey: `${MACHINE}.metricsFailed`,
    },
  },
  'machine-memory': {
    key: 'machine-memory',
    feed: MACHINE_SERIES['machine-usage'],
    tokens: MONITORING,
    axes: [{ name: 'GB', min: 0, unit: ' GB' }],
    lines: [
      {
        key: 'used',
        labelKey: `${MACHINE}.usedSeries`,
        value: machineValues.memory,
        tone: 'blue',
        width: 2,
      },
    ],
    groups: NO_GROUPS,
    texts: {
      titleKey: `${MACHINE}.memoryTitle`,
      emptyKey: `${MACHINE}.waitingForSample`,
      failKey: `${MACHINE}.metricsFailed`,
      additionsKey: `${MACHINE}.additionsRequiredNote`,
    },
  },
  'machine-network': {
    key: 'machine-network',
    feed: MACHINE_SERIES['machine-usage'],
    tokens: MONITORING,
    axes: [{ name: 'MB/s', min: 0, unit: ' MB/s' }],
    lines: machinePair({
      keys: ['rx', 'tx'],
      labels: [`${MACHINE}.rxSeries`, `${MACHINE}.txSeries`],
      values: [machineValues.netRx, machineValues.netTx],
    }),
    groups: NO_GROUPS,
    texts: {
      titleKey: `${MACHINE}.networkTitle`,
      emptyKey: `${MACHINE}.waitingForSample`,
      failKey: `${MACHINE}.metricsFailed`,
    },
  },
  'machine-disk': {
    key: 'machine-disk',
    feed: MACHINE_SERIES['machine-usage'],
    tokens: MONITORING,
    axes: [{ name: 'MB/s', min: 0, unit: ' MB/s' }],
    lines: machinePair({
      keys: ['read', 'write'],
      labels: [`${MACHINE}.readSeries`, `${MACHINE}.writeSeries`],
      values: [machineValues.diskRead, machineValues.diskWrite],
    }),
    groups: NO_GROUPS,
    texts: {
      titleKey: `${MACHINE}.diskTitle`,
      emptyKey: `${MACHINE}.waitingForSample`,
      failKey: `${MACHINE}.metricsFailed`,
    },
  },
};

/**
 * The entry of `CHARTS` under one key.
 *
 * @param {string} key - The chart's key, e.g. `cpu` or `zone-disk`
 * @returns {Object} The entry
 */
export const chartOf = key => CHARTS[key];

/**
 * The key in `SERIES` of the host series one chart is drawn over, empty
 * for a chart drawn over a machine's series.
 *
 * @param {string} key - The chart's key, e.g. `cpu` or `arc-memory`
 * @returns {string} The series' key, e.g. `cpu` or `arc`
 */
export const hostSeriesOf = key =>
  Object.keys(SERIES).find(name => SERIES[name] === chartOf(key).feed) || '';

/**
 * The charts the dashboard's Charts widget draws of every host that
 * offers them, each the chart's key and the groups of its lines it shows:
 * the overall CPU use and the total throughput of every interface.
 */
export const DASHBOARD_CHARTS = [
  { key: 'cpu', groups: ['overall'] },
  { key: 'network', groups: ['total'] },
];
