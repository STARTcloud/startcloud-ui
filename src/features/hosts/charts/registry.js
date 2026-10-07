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

const IO_TOGGLES = [
  {
    key: 'read',
    labelKey: 'host.storageCharts.read',
    titleKey: 'host.storageCharts.toggleRead',
    tone: 'info',
  },
  {
    key: 'write',
    labelKey: 'host.storageCharts.write',
    titleKey: 'host.storageCharts.toggleWrite',
    tone: 'warning',
  },
  {
    key: 'total',
    labelKey: 'host.storageCharts.total',
    titleKey: 'host.storageCharts.toggleTotal',
    tone: 'success',
  },
];

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
 * `digits`, the `group` its toggle shows and hides, `optional` for a line
 * left out while no sample carries it, and `expand(rows)` for a line
 * drawn once per core; `series(rows)`, the builder that groups the
 * samples by entity, with `entityLines`, the lines drawn of each entity
 * by the member of its points, or `charts`, the summary charts drawn one
 * line an entity of one member; `groups`, the groups shown as the chart
 * opens; `toggles`, the buttons of the groups; `cardLegend`, whether the
 * card draws the legend; and `texts`, the keys of the chart's words.
 */
export const CHARTS = {
  cpu: {
    key: 'cpu',
    feed: SERIES.cpu,
    tokens: SERIES.cpu.tokens,
    axes: [
      { nameKey: 'hosts.charts.cpu.usageAxis', min: 0, max: PERCENT },
      { nameKey: 'hosts.charts.cpu.loadAxis' },
    ],
    lines: [
      {
        key: 'overall',
        labelKey: 'hosts.charts.cpu.overall',
        value: cpuValues.overall,
        tone: 'blue',
        width: 3,
        group: 'overall',
      },
      {
        key: 'ioDelay',
        labelKey: 'hosts.charts.cpu.ioDelay',
        value: cpuValues.ioDelay,
        tone: 'yellow',
        dash: 'short-dash',
        width: 2,
        group: 'overall',
        optional: true,
      },
      { key: 'core', expand: coreSeries, tone: 'blue', width: 1, opacity: 0.5, group: 'cores' },
      {
        key: 'load1',
        labelKey: 'hosts.charts.cpu.load1',
        value: cpuValues.load1,
        tone: 'orange',
        dash: 'short-dot',
        axis: 1,
        group: 'load',
      },
      {
        key: 'load5',
        labelKey: 'hosts.charts.cpu.load5',
        value: cpuValues.load5,
        tone: 'green',
        dash: 'short-dot',
        axis: 1,
        group: 'load',
      },
      {
        key: 'load15',
        labelKey: 'hosts.charts.cpu.load15',
        value: cpuValues.load15,
        tone: 'pink',
        dash: 'short-dot',
        axis: 1,
        group: 'load',
      },
    ],
    groups: { overall: true, cores: true, load: false },
    toggles: [
      {
        key: 'overall',
        labelKey: 'hosts.charts.cpu.avg',
        titleKey: 'hosts.charts.cpu.toggleAvg',
        tone: 'info',
      },
      {
        key: 'cores',
        labelKey: 'hosts.charts.cpu.cores',
        titleKey: 'hosts.charts.cpu.toggleCores',
        tone: 'info',
      },
      {
        key: 'load',
        labelKey: 'hosts.charts.cpu.load',
        titleKey: 'hosts.charts.cpu.toggleLoad',
        tone: 'info',
      },
    ],
    cardLegend: false,
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
        group: 'used',
        optional: true,
      },
      {
        key: 'free',
        labelKey: 'hosts.charts.memory.free',
        value: memoryValues.free,
        tone: 'green',
        group: 'free',
        optional: true,
      },
      {
        key: 'cached',
        labelKey: 'hosts.charts.memory.cached',
        value: memoryValues.cached,
        tone: 'blue',
        group: 'cached',
        optional: true,
      },
    ],
    groups: { used: true, free: true, cached: true },
    toggles: [
      {
        key: 'used',
        labelKey: 'hosts.charts.memory.used',
        titleKey: 'hosts.charts.memory.toggleUsed',
        tone: 'info',
      },
      {
        key: 'free',
        labelKey: 'hosts.charts.memory.free',
        titleKey: 'hosts.charts.memory.toggleFree',
        tone: 'success',
      },
      {
        key: 'cached',
        labelKey: 'hosts.charts.memory.cached',
        titleKey: 'hosts.charts.memory.toggleCached',
        tone: 'warning',
      },
    ],
    cardLegend: true,
    texts: hostTexts('memory'),
  },
  network: {
    key: 'network',
    feed: SERIES.network,
    tokens: SERIES.network.tokens,
    axes: MEGABIT_AXES,
    lines: NO_LINES,
    series: networkSeries,
    entityLines: hostEntityLines({
      read: 'hosts.charts.network.rx',
      write: 'hosts.charts.network.tx',
      total: 'hosts.charts.network.total',
    }),
    groups: ALL_IO_GROUPS,
    toggles: [
      {
        key: 'read',
        labelKey: 'hosts.charts.network.rx',
        titleKey: 'hosts.charts.network.toggleRx',
        tone: 'info',
      },
      {
        key: 'write',
        labelKey: 'hosts.charts.network.tx',
        titleKey: 'hosts.charts.network.toggleTx',
        tone: 'warning',
      },
      {
        key: 'total',
        labelKey: 'hosts.charts.network.total',
        titleKey: 'hosts.charts.network.toggleTotal',
        tone: 'success',
      },
    ],
    cardLegend: true,
    texts: { ...hostTexts('network'), entityKey: ENTITY_SERIES_KEY },
  },
  'pool-io': {
    key: 'pool-io',
    feed: SERIES['pool-io'],
    tokens: SERIES['pool-io'].tokens,
    axes: [{ nameKey: 'hosts.charts.poolIo.axis', min: 0, unit: ' MB/s' }],
    lines: NO_LINES,
    series: poolSeries,
    entityLines: hostEntityLines({
      read: 'hosts.charts.poolIo.read',
      write: 'hosts.charts.poolIo.write',
      total: 'hosts.charts.poolIo.total',
    }),
    groups: ALL_IO_GROUPS,
    toggles: [
      {
        key: 'read',
        labelKey: 'hosts.charts.poolIo.read',
        titleKey: 'hosts.charts.poolIo.toggleRead',
        tone: 'info',
      },
      {
        key: 'write',
        labelKey: 'hosts.charts.poolIo.write',
        titleKey: 'hosts.charts.poolIo.toggleWrite',
        tone: 'warning',
      },
      {
        key: 'total',
        labelKey: 'hosts.charts.poolIo.total',
        titleKey: 'hosts.charts.poolIo.toggleTotal',
        tone: 'success',
      },
    ],
    cardLegend: true,
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
    groups: NO_GROUPS,
    toggles: [],
    cardLegend: true,
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
    groups: ALL_IO_GROUPS,
    toggles: IO_TOGGLES,
    cardLegend: true,
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
    groups: ALL_IO_GROUPS,
    toggles: IO_TOGGLES,
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
    groups: NO_GROUPS,
    toggles: [],
    cardLegend: true,
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
    groups: NO_GROUPS,
    toggles: [],
    cardLegend: true,
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
    groups: NO_GROUPS,
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
      { member: 'first', labelKey: 'hosts.charts.network.rx', tone: 'blue', width: 2 },
      { member: 'second', labelKey: 'hosts.charts.network.tx', tone: 'orange', width: 2 },
      { member: 'total', labelKey: 'hosts.charts.network.total', tone: 'green', width: 3 },
    ],
    groups: NO_GROUPS,
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
      { member: 'read', labelKey: `${ZONE}.readSeries`, tone: 'blue', width: 2 },
      { member: 'write', labelKey: `${ZONE}.writeSeries`, tone: 'orange', width: 2 },
    ],
    groups: NO_GROUPS,
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
    toggles: [],
    cardLegend: true,
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
