import { toneAt } from '../../../utils/chart';

import { arcSeries, cpuSeries, memorySeries, networkSeries, poolSeries } from './series';

const PERCENT = 100;

/**
 * The performance charts in the order the host page draws them,
 * hyperweaver-ui's: the storage I/O, the ZFS ARC, the network, the CPU
 * and the memory.
 */
export const CHART_ORDER = ['pool-io', 'arc', 'network', 'cpu', 'memory'];

/**
 * The keys of each chart's own words: the card's title, the sentence
 * that opens the chart's description, the expanded dialog's title and
 * the line drawn while the series holds no sample.
 */
export const CHART_TEXTS = {
  'pool-io': {
    titleKey: 'hosts.charts.poolIo.title',
    chartTitleKey: 'hosts.charts.poolIo.chartTitle',
    expandedKey: 'hosts.charts.poolIo.expanded',
    emptyKey: 'hosts.charts.poolIo.empty',
  },
  arc: {
    titleKey: 'hosts.charts.arc.title',
    chartTitleKey: 'hosts.charts.arc.chartTitle',
    expandedKey: 'hosts.charts.arc.expanded',
    emptyKey: 'hosts.charts.arc.empty',
  },
  network: {
    titleKey: 'hosts.charts.network.title',
    chartTitleKey: 'hosts.charts.network.chartTitle',
    expandedKey: 'hosts.charts.network.expanded',
    emptyKey: 'hosts.charts.network.empty',
  },
  cpu: {
    titleKey: 'hosts.charts.cpu.title',
    chartTitleKey: 'hosts.charts.cpu.chartTitle',
    expandedKey: 'hosts.charts.cpu.expanded',
    emptyKey: 'hosts.charts.cpu.empty',
  },
  memory: {
    titleKey: 'hosts.charts.memory.title',
    chartTitleKey: 'hosts.charts.memory.chartTitle',
    expandedKey: 'hosts.charts.memory.expanded',
    emptyKey: 'hosts.charts.memory.empty',
  },
};

/**
 * The groups of series each chart opens with, hyperweaver-ui's: every
 * group shown but the CPU chart's load averages; the ARC chart has no
 * groups to hide.
 */
export const DEFAULT_VISIBILITY = {
  'pool-io': { read: true, write: true, total: true },
  arc: {},
  network: { read: true, write: true, total: true },
  cpu: { overall: true, cores: true, load: false },
  memory: { used: true, free: true, cached: true },
};

/**
 * Whether each chart draws its legend in its card, hyperweaver-ui's:
 * every chart but the CPU's, whose cores would fill the card; the
 * expanded dialog draws the legend of every chart.
 */
export const CARD_LEGEND = {
  'pool-io': true,
  arc: true,
  network: true,
  cpu: false,
  memory: true,
};

const TOGGLES = {
  'pool-io': [
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
  arc: [],
  network: [
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
  cpu: [
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
  memory: [
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
};

/**
 * The buttons that show and hide the groups of a chart's series, in the
 * tones hyperweaver-ui's buttons took, none for a chart without groups.
 *
 * @param {string} metric - The chart's key in `CHART_ORDER`
 * @param {Function} t - The translator
 * @returns {Array<{ key: string, label: string, title: string, tone: string }>} The toggles
 */
export const chartToggles = (metric, t) =>
  TOGGLES[metric].map(({ key, labelKey, titleKey, tone }) => ({
    key,
    label: t(labelKey),
    title: t(titleKey),
    tone,
  }));

const ENTITY_LINES = [
  { member: 'first', group: 'read', dash: 'solid', width: 2, opacity: 0.55 },
  { member: 'second', group: 'write', dash: 'dash', width: 2, opacity: 1 },
  { member: 'total', group: 'total', dash: 'solid', width: 3, opacity: 1 },
];

const entityLines = ({ entities, labels, visibility, t }) =>
  Object.entries(entities).flatMap(([name, points], index) =>
    ENTITY_LINES.map(line => ({
      key: `${name}:${line.member}`,
      name: t('hosts.charts.entitySeries', { name, series: t(labels[line.group]) }),
      points: points[line.member],
      tone: toneAt(index),
      dash: line.dash,
      width: line.width,
      opacity: line.opacity,
      hidden: !visibility[line.group],
    }))
  );

const POOL_LABELS = {
  read: 'hosts.charts.poolIo.read',
  write: 'hosts.charts.poolIo.write',
  total: 'hosts.charts.poolIo.total',
};

const NETWORK_LABELS = {
  read: 'hosts.charts.network.rx',
  write: 'hosts.charts.network.tx',
  total: 'hosts.charts.network.total',
};

const poolSpec = ({ rows, visibility, t }) => ({
  axes: [{ name: t('hosts.charts.poolIo.axis'), min: 0, unit: ' MB/s' }],
  series: entityLines({ entities: poolSeries(rows), labels: POOL_LABELS, visibility, t }),
});

const networkSpec = ({ rows, visibility, t }) => ({
  axes: [{ name: t('hosts.charts.network.axis'), min: 0, unit: ' Mbps' }],
  series: entityLines({ entities: networkSeries(rows), labels: NETWORK_LABELS, visibility, t }),
});

const arcSpec = ({ rows, t }) => {
  const points = arcSeries(rows);
  return {
    axes: [
      { name: t('hosts.charts.arc.sizeAxis'), min: 0, unit: ' GB' },
      { name: t('hosts.charts.arc.hitAxis'), min: 0, max: PERCENT, unit: '%' },
    ],
    series: [
      {
        key: 'size',
        name: t('hosts.charts.arc.size'),
        points: points.size,
        tone: 'blue',
        width: 2,
      },
      {
        key: 'target',
        name: t('hosts.charts.arc.target'),
        points: points.target,
        tone: 'red',
        dash: 'dash',
        width: 2,
      },
      {
        key: 'hitRate',
        name: t('hosts.charts.arc.hitRate'),
        points: points.hitRatio,
        tone: 'green',
        width: 3,
        axis: 1,
        digits: 1,
      },
    ],
  };
};

const LOADS = [
  { key: 'load1', nameKey: 'hosts.charts.cpu.load1', tone: 'orange' },
  { key: 'load5', nameKey: 'hosts.charts.cpu.load5', tone: 'green' },
  { key: 'load15', nameKey: 'hosts.charts.cpu.load15', tone: 'pink' },
];

const ioDelayLines = (points, visibility, t) =>
  points.length > 0
    ? [
        {
          key: 'ioDelay',
          name: t('hosts.charts.cpu.ioDelay'),
          points,
          tone: 'yellow',
          dash: 'short-dash',
          width: 2,
          hidden: !visibility.overall,
        },
      ]
    : [];

const coreLines = (cores, visibility) =>
  Object.entries(cores).map(([label, points]) => ({
    key: `core:${label}`,
    name: label,
    points,
    tone: 'blue',
    width: 1,
    opacity: 0.5,
    hidden: !visibility.cores,
  }));

const loadLines = (points, visibility, t) =>
  LOADS.map(({ key, nameKey, tone }) => ({
    key,
    name: t(nameKey),
    points: points[key],
    tone,
    dash: 'short-dot',
    axis: 1,
    hidden: !visibility.load,
  }));

const cpuSpec = ({ rows, visibility, t }) => {
  const points = cpuSeries(rows);
  return {
    axes: [
      { name: t('hosts.charts.cpu.usageAxis'), min: 0, max: PERCENT },
      { name: t('hosts.charts.cpu.loadAxis') },
    ],
    series: [
      {
        key: 'overall',
        name: t('hosts.charts.cpu.overall'),
        points: points.overall,
        tone: 'blue',
        width: 3,
        hidden: !visibility.overall,
      },
      ...ioDelayLines(points.ioDelay, visibility, t),
      ...coreLines(points.cores, visibility),
      ...loadLines(points, visibility, t),
    ],
  };
};

const MEMORY_LINES = [
  { key: 'used', nameKey: 'hosts.charts.memory.used', tone: 'orange' },
  { key: 'free', nameKey: 'hosts.charts.memory.free', tone: 'green' },
  { key: 'cached', nameKey: 'hosts.charts.memory.cached', tone: 'blue' },
];

const memorySpec = ({ rows, visibility, t }) => {
  const points = memorySeries(rows);
  const lines = MEMORY_LINES.filter(line => points[line.key].length > 0);
  return {
    axes: [{ name: t('hosts.charts.memory.axis'), min: 0, unit: ' GB' }],
    series: lines.map(({ key, nameKey, tone }) => ({
      key,
      name: t(nameKey),
      points: points[key],
      tone,
      hidden: !visibility[key],
    })),
  };
};

const SPECS = {
  'pool-io': poolSpec,
  arc: arcSpec,
  network: networkSpec,
  cpu: cpuSpec,
  memory: memorySpec,
};

/**
 * What one performance chart draws of the samples held, the lines and
 * the value axes hyperweaver-ui's chart of that name drew, in tones of
 * the theme where it wrote colours: the storage I/O and the network
 * three lines an entity, the first faint, the second dashed, the total
 * heavy, every entity a tone of its own; the ARC its size and its
 * dashed target in gigabytes and its hit rate on a second axis of
 * percent; the CPU the overall use with the IO delay where a sample
 * carries one, a faint line per core and the three load averages dotted
 * on a second axis; the memory used, free and, only where a sample
 * carries it, cached, in gigabytes. A group the person hid stays in the
 * answer as `hidden`, so the chart knows data is held.
 *
 * @param {string} metric - The chart's key in `CHART_ORDER`
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The samples held, oldest first
 * @param {Object<string, boolean>} chart.visibility - The groups shown
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const chartSpec = (metric, chart) => SPECS[metric](chart);
