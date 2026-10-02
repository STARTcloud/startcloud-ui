import { toneAt } from '../../../utils/chart';

import { arcSeries } from './series';

const PERCENT = 100;

const SUMMARY_TITLE_KEYS = {
  read: 'host.expandedChartOptions.summaryRead',
  write: 'host.expandedChartOptions.summaryWrite',
  total: 'host.expandedChartOptions.summaryTotal',
};

/**
 * The three charts that draw every device together, hyperweaver-ui's
 * summary charts in its order, each the member of a device's points it
 * draws, the key of its card's title and the key of its expanded title.
 */
export const SUMMARY_CHARTS = [
  {
    key: 'read',
    member: 'first',
    titleKey: 'hostCharts.summaryCharts.readBandwidthTitle',
    expandedKey: SUMMARY_TITLE_KEYS.read,
  },
  {
    key: 'write',
    member: 'second',
    titleKey: 'hostCharts.summaryCharts.writeBandwidthTitle',
    expandedKey: SUMMARY_TITLE_KEYS.write,
  },
  {
    key: 'total',
    member: 'total',
    titleKey: 'hostCharts.summaryCharts.totalBandwidthTitle',
    expandedKey: SUMMARY_TITLE_KEYS.total,
  },
];

const IO_LINES = [
  {
    member: 'first',
    group: 'read',
    nameKey: 'host.expandedChartOptions.seriesRead',
    tone: 'blue',
    width: 2,
  },
  {
    member: 'second',
    group: 'write',
    nameKey: 'host.expandedChartOptions.seriesWrite',
    tone: 'orange',
    width: 2,
  },
  {
    member: 'total',
    group: 'total',
    nameKey: 'host.expandedChartOptions.seriesTotal',
    tone: 'green',
    width: 3,
  },
];

const bandwidthAxes = t => [
  { name: t('host.expandedChartOptions.axisBandwidthMBs'), min: 0, unit: ' MB/s' },
];

/**
 * The buttons that show and hide the read, the write and the total
 * lines of the device and pool charts, hyperweaver-ui's three in its
 * tones.
 *
 * @param {Function} t - The translator
 * @returns {Array<{ key: string, label: string, title: string, tone: string }>} The toggles
 */
export const ioToggles = t => [
  {
    key: 'read',
    label: t('host.storageCharts.read'),
    title: t('host.storageCharts.toggleRead'),
    tone: 'info',
  },
  {
    key: 'write',
    label: t('host.storageCharts.write'),
    title: t('host.storageCharts.toggleWrite'),
    tone: 'warning',
  },
  {
    key: 'total',
    label: t('host.storageCharts.total'),
    title: t('host.storageCharts.toggleTotal'),
    tone: 'success',
  },
];

/**
 * What one summary chart draws, a line a device in a tone of its own,
 * the devices that hold no point left out, megabytes a second on the
 * one axis.
 *
 * @param {string} member - The member of a device's points, `first`, `second` or `total`
 * @param {Object<string, Object>} entities - The points per device of `ioSeries`
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const summarySpec = (member, entities, t) => ({
  axes: bandwidthAxes(t),
  series: Object.entries(entities)
    .map(([name, points], index) => ({
      key: name,
      name,
      points: points[member],
      tone: toneAt(index),
      width: 2,
    }))
    .filter(line => line.points.length > 0),
});

/**
 * What the chart of one device or one pool draws, three lines, read,
 * written and both, the total heavy, a group the person hid kept in the
 * answer as `hidden`, megabytes a second on the one axis.
 *
 * @param {{ first: Array, second: Array, total: Array }} points - The entity's points
 * @param {Object<string, boolean>} visibility - The groups shown, `read`, `write` and `total`
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const ioSpec = (points, visibility, t) => ({
  axes: bandwidthAxes(t),
  series: IO_LINES.map(({ member, group, nameKey, tone, width }) => ({
    key: member,
    name: t(nameKey),
    points: points[member],
    tone,
    width,
    hidden: !visibility[group],
  })),
});

/**
 * What the ARC memory chart draws, hyperweaver-ui's: the size, the
 * dashed target, the MRU and the MFU in gigabytes.
 *
 * @param {Array<Object>} rows - The ARC samples held, oldest first
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const arcMemorySpec = (rows, t) => {
  const points = arcSeries(rows);
  return {
    axes: [{ name: t('hostCharts.arcCharts.memoryGbAxisLabel'), min: 0, unit: ' GB' }],
    series: [
      {
        key: 'size',
        name: t('hostCharts.arcCharts.arcSizeSeriesName'),
        points: points.size,
        tone: 'blue',
        width: 3,
      },
      {
        key: 'target',
        name: t('hostCharts.arcCharts.targetSizeSeriesName'),
        points: points.target,
        tone: 'purple',
        dash: 'dash',
        width: 2,
      },
      {
        key: 'mru',
        name: t('hostCharts.arcCharts.mruSizeSeriesName'),
        points: points.mru,
        tone: 'green',
        width: 2,
      },
      {
        key: 'mfu',
        name: t('hostCharts.arcCharts.mfuSizeSeriesName'),
        points: points.mfu,
        tone: 'orange',
        width: 2,
      },
    ],
  };
};

/**
 * What the ARC efficiency chart draws: the hit ratio, the demand and
 * the prefetch efficiency in percent.
 *
 * @param {Array<Object>} rows - The ARC samples held, oldest first
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const arcEfficiencySpec = (rows, t) => {
  const points = arcSeries(rows);
  return {
    axes: [
      { name: t('hostCharts.arcCharts.efficiencyAxisLabel'), min: 0, max: PERCENT, unit: '%' },
    ],
    series: [
      {
        key: 'hitRatio',
        name: t('hostCharts.arcCharts.hitRatioSeriesName'),
        points: points.hitRatio,
        tone: 'green',
        width: 3,
        digits: 1,
      },
      {
        key: 'demand',
        name: t('hostCharts.arcCharts.demandEfficiencySeriesName'),
        points: points.demandEfficiency,
        tone: 'red',
        width: 2,
      },
      {
        key: 'prefetch',
        name: t('hostCharts.arcCharts.prefetchEfficiencySeriesName'),
        points: points.prefetchEfficiency,
        tone: 'orange',
        width: 2,
      },
    ],
  };
};

/**
 * What the ARC compression chart draws: the compression ratio, from one.
 *
 * @param {Array<Object>} rows - The ARC samples held, oldest first
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const arcCompressionSpec = (rows, t) => ({
  axes: [{ name: t('hostCharts.arcCharts.compressionRatioAxisLabel'), min: 1, unit: 'x' }],
  series: [
    {
      key: 'compression',
      name: t('hostCharts.arcCharts.compressionRatioSeriesName'),
      points: arcSeries(rows).compressionRatio,
      tone: 'purple',
      width: 3,
    },
  ],
});

/**
 * The three ARC charts in hyperweaver-ui's order, each its key, the key
 * of its card's title, the key of its expanded title and its spec.
 */
export const ARC_CHARTS = [
  {
    key: 'arc-memory',
    titleKey: 'hostCharts.arcCharts.memoryAllocationTitle',
    expandedKey: 'host.expandedChartOptions.arcMemoryTitle',
    spec: arcMemorySpec,
  },
  {
    key: 'arc-efficiency',
    titleKey: 'hostCharts.arcCharts.cacheEfficiencyTitle',
    expandedKey: 'host.expandedChartOptions.arcEfficiencyTitle',
    spec: arcEfficiencySpec,
  },
  {
    key: 'arc-compression',
    titleKey: 'hostCharts.arcCharts.compressionEffectivenessTitle',
    expandedKey: 'host.expandedChartOptions.arcCompressionTitle',
    spec: arcCompressionSpec,
  },
];
