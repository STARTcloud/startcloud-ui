import { toneAt } from '../../../utils/chart';
import { chartOf } from '../charts/registry';
import { isGap } from '../charts/splice';

import { timeOf } from './series';

const STYLE = ['tone', 'dash', 'width', 'opacity', 'axis', 'digits'];

const SUMMARY_WIDTH = 2;

const NEUTRAL = '';

const styleOf = line =>
  Object.fromEntries(
    STYLE.filter(member => line[member] !== undefined).map(member => [member, line[member]])
  );

const nameOf = (line, t) => (line.labelKey ? t(line.labelKey) : line.label);

const pointsOf = (rows, value) =>
  rows.flatMap(row => {
    if (isGap(row)) {
      return [[timeOf(row), null]];
    }
    const number = value(row);
    return number === null ? [] : [[timeOf(row), number]];
  });

const carried = points => points.some(point => point[1] !== null);

const expanded = (line, rows) =>
  Object.entries(line.expand(rows)).map(([label, points]) => ({
    key: `${line.key}:${label}`,
    name: label,
    group: line.key,
    points,
    ...styleOf(line),
  }));

const drawn = (line, rows, t) => {
  const points = pointsOf(rows, line.value);
  if (line.optional && !carried(points)) {
    return [];
  }
  return [{ key: line.key, name: nameOf(line, t), group: line.key, points, ...styleOf(line) }];
};

/**
 * The value axes of one chart entry as the shared chart takes them, the
 * name translated where the entry names a key.
 *
 * @param {Object} entry - The registry entry
 * @param {Function} t - The translator
 * @returns {Array<Object>} The axes, `[{ name?, min?, max?, unit? }]`
 */
export const axesOf = (entry, t) =>
  entry.axes.map(({ nameKey, name, ...axis }) => ({
    ...(nameKey ? { name: t(nameKey) } : {}),
    ...(name ? { name } : {}),
    ...axis,
  }));

/**
 * The lines of one chart entry over the samples held: one line per
 * `lines` entry, its points the entry's `value` of every sample that
 * carries one and a null point at every gap row, a line that is
 * `optional` left out while it has no value, a line with `expand` drawn
 * once per member it answers, every line in the `group` of its pill, the
 * line's own key.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `rows`, the samples oldest first, and `t`
 * @returns {Array<Object>} The series of the shared chart
 */
export const linesOf = (entry, { rows, t }) =>
  entry.lines.flatMap(line => (line.expand ? expanded(line, rows) : drawn(line, rows, t)));

/**
 * What one chart of plain lines draws: its axes and its lines.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `rows` and `t`
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const lineSpec = (entry, chart) => ({
  axes: axesOf(entry, chart.t),
  series: linesOf(entry, chart),
});

/**
 * What one chart that draws every entity together draws: the entry's
 * `entityLines` once per entity of its `series`, each line keyed by the
 * entity and the member, named by the entity and the line's label, in
 * the entity's own tone unless the line names one, listed in the legend
 * under its `entity` and shown and hidden by its `group`.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `rows` and `t`
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const entitiesSpec = (entry, { rows, t }) => ({
  axes: axesOf(entry, t),
  series: Object.entries(entry.series(rows)).flatMap(([name, points], index) =>
    entry.entityLines.map(line => ({
      key: `${name}:${line.member}`,
      name: t(entry.texts.entityKey, { name, series: t(line.labelKey) }),
      entity: name,
      group: line.group,
      points: points[line.member],
      ...styleOf(line),
      tone: line.tone ?? toneAt(index),
    }))
  ),
});

/**
 * What the chart of one entity draws: the entry's `entityLines` over that
 * entity's points, each line keyed by its member and shown and hidden by
 * its `group`.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `points`, one entity's points by member, and `t`
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const entitySpec = (entry, { points, t }) => ({
  axes: axesOf(entry, t),
  series: entry.entityLines.map(line => ({
    key: line.member,
    name: t(line.labelKey),
    group: line.group,
    points: points[line.member],
    ...styleOf(line),
  })),
});

/**
 * What one summary chart draws: a line an entity of one member of its
 * points, in a tone of its own and listed in the legend under its name,
 * the entities that hold no point left out.
 *
 * @param {Object} entry - The registry entry
 * @param {string} member - The member of an entity's points, `first`, `second` or `total`
 * @param {Object<string, Object>} entities - The points per entity of the entry's `series`
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const summarySpec = (entry, member, entities, t) => ({
  axes: axesOf(entry, t),
  series: Object.entries(entities)
    .map(([name, points], index) => ({
      key: name,
      name,
      entity: name,
      points: points[member],
      tone: toneAt(index),
      width: SUMMARY_WIDTH,
    }))
    .filter(line => line.points.length > 0),
});

/**
 * The pills of one chart's header: for a chart of plain lines one pill a
 * line in the line's tone, a line left out of `series` drawing none; for
 * a chart drawn by entity lines the entry's `pills`, one a group, in the
 * neutral tone; none for a summary chart.
 *
 * @param {string} key - The chart's key in the registry
 * @param {Array<Object>} series - The series the chart draws
 * @param {Function} t - The translator
 * @returns {Array<{ key: string, label: string, tone: string }>} The pills
 */
export const chartPills = (key, series, t) => {
  const entry = chartOf(key);
  if (entry.pills) {
    return entry.pills.map(pill => ({ key: pill.key, label: t(pill.labelKey), tone: NEUTRAL }));
  }
  const present = new Set(series.map(line => line.group));
  return entry.lines
    .filter(line => present.has(line.key))
    .map(line => ({ key: line.key, label: nameOf(line, t), tone: line.tone }));
};

/**
 * The series with the ones of a group the person hid marked `hidden`, a
 * group `visibility` does not name shown.
 *
 * @param {Array<Object>} series - The series the chart draws
 * @param {Object<string, boolean>} visibility - The groups shown
 * @returns {Array<Object>} The series, hidden ones marked
 */
export const visibleSeries = (series, visibility) =>
  series.map(line => ({
    ...line,
    hidden: Boolean(line.group) && visibility[line.group] === false,
  }));

/**
 * What one performance chart of the host page draws of the samples held,
 * the lines and the value axes of its registry entry: the storage I/O
 * and the network three lines an entity, every entity a tone of its own;
 * the ARC, the CPU and the memory their plain lines.
 *
 * @param {string} metric - The chart's key in `CHART_ORDER`
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const chartSpec = (metric, chart) => {
  const entry = chartOf(metric);
  return entry.series ? entitiesSpec(entry, chart) : lineSpec(entry, chart);
};
