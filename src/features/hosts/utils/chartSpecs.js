import { toneAt } from '../../../utils/chart';
import { chartOf } from '../charts/registry';

import { timeOf } from './series';

const STYLE = ['tone', 'dash', 'width', 'opacity', 'axis', 'digits'];

const SUMMARY_WIDTH = 2;

const styleOf = line =>
  Object.fromEntries(
    STYLE.filter(member => line[member] !== undefined).map(member => [member, line[member]])
  );

const hiddenOf = (line, visibility) => (line.group ? { hidden: !visibility[line.group] } : {});

const nameOf = (line, t) => (line.labelKey ? t(line.labelKey) : line.label);

const pointsOf = (rows, value) =>
  rows.flatMap(row => {
    const number = value(row);
    return number === null ? [] : [[timeOf(row), number]];
  });

const expanded = (line, rows, visibility) =>
  Object.entries(line.expand(rows)).map(([label, points]) => ({
    key: `${line.key}:${label}`,
    name: label,
    points,
    ...styleOf(line),
    ...hiddenOf(line, visibility),
  }));

const drawn = (line, rows, visibility, t) => {
  const points = pointsOf(rows, line.value);
  if (line.optional && points.length === 0) {
    return [];
  }
  return [
    {
      key: line.key,
      name: nameOf(line, t),
      points,
      ...styleOf(line),
      ...hiddenOf(line, visibility),
    },
  ];
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
 * carries one, a line that is `optional` left out while it has no point,
 * a line with `expand` drawn once per member it answers, and a line with
 * a group marked `hidden` while its group is not shown.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `rows`, the samples oldest first, `visibility`, the groups shown, and `t`
 * @returns {Array<Object>} The series of the shared chart
 */
export const linesOf = (entry, { rows, visibility, t }) =>
  entry.lines.flatMap(line =>
    line.expand ? expanded(line, rows, visibility) : drawn(line, rows, visibility, t)
  );

/**
 * What one chart of plain lines draws: its axes and its lines.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `rows`, `visibility` and `t`
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
 * the entity's own tone unless the line names one.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `rows`, `visibility` and `t`
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const entitiesSpec = (entry, { rows, visibility, t }) => ({
  axes: axesOf(entry, t),
  series: Object.entries(entry.series(rows)).flatMap(([name, points], index) =>
    entry.entityLines.map(line => ({
      key: `${name}:${line.member}`,
      name: t(entry.texts.entityKey, { name, series: t(line.labelKey) }),
      points: points[line.member],
      ...styleOf(line),
      tone: line.tone ?? toneAt(index),
      ...hiddenOf(line, visibility),
    }))
  ),
});

/**
 * What the chart of one entity draws: the entry's `entityLines` over that
 * entity's points, each line keyed by its member.
 *
 * @param {Object} entry - The registry entry
 * @param {Object} chart - `points`, one entity's points by member, `visibility` and `t`
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const entitySpec = (entry, { points, visibility, t }) => ({
  axes: axesOf(entry, t),
  series: entry.entityLines.map(line => ({
    key: line.member,
    name: t(line.labelKey),
    points: points[line.member],
    ...styleOf(line),
    ...hiddenOf(line, visibility),
  })),
});

/**
 * What one summary chart draws: a line an entity of one member of its
 * points, in a tone of its own, the entities that hold no point left out.
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
      points: points[member],
      tone: toneAt(index),
      width: SUMMARY_WIDTH,
    }))
    .filter(line => line.points.length > 0),
});

/**
 * The buttons that show and hide the groups of a chart's series, none
 * for a chart without groups.
 *
 * @param {string} key - The chart's key in the registry
 * @param {Function} t - The translator
 * @returns {Array<{ key: string, label: string, title: string, tone: string }>} The toggles
 */
export const chartToggles = (key, t) =>
  chartOf(key).toggles.map(({ key: group, labelKey, titleKey, tone }) => ({
    key: group,
    label: t(labelKey),
    title: t(titleKey),
    tone,
  }));

/**
 * What one performance chart of the host page draws of the samples held,
 * the lines and the value axes of its registry entry: the storage I/O
 * and the network three lines an entity, every entity a tone of its own;
 * the ARC, the CPU and the memory their plain lines. A group the person
 * hid stays in the answer as `hidden`, so the chart knows data is held.
 *
 * @param {string} metric - The chart's key in `CHART_ORDER`
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The samples held, oldest first
 * @param {Object<string, boolean>} chart.visibility - The groups shown
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const chartSpec = (metric, chart) => {
  const entry = chartOf(metric);
  return entry.series ? entitiesSpec(entry, chart) : lineSpec(entry, chart);
};
