import { chartOf } from '../charts/registry';

import { entitySpec, lineSpec, summarySpec as summaryOf } from './chartSpecs';

/**
 * What one summary chart of the storage pages draws, the
 * `storage-summary` entry of the registry: a line a device of one member
 * of its points.
 *
 * @param {string} member - The member of a device's points, `first`, `second` or `total`
 * @param {Object<string, Object>} entities - The points per device of the entry's `series`
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const summarySpec = (member, entities, t) =>
  summaryOf(chartOf('storage-summary'), member, entities, t);

/**
 * What the chart of one device draws, the `disk-io` entry of the
 * registry over the device's points.
 *
 * @param {{ first: Array, second: Array, total: Array }} points - The device's points
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const ioSpec = (points, t) => entitySpec(chartOf('disk-io'), { points, t });

/**
 * What the chart of one pool draws, the `pool` entry of the registry
 * over the pool's points.
 *
 * @param {{ first: Array, second: Array, total: Array }} points - The pool's points
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const poolSpec = (points, t) => entitySpec(chartOf('pool'), { points, t });

/**
 * What one ARC chart draws, its entry of the registry over the ARC
 * samples held.
 *
 * @param {string} key - The chart's key in `ARC_CHARTS`
 * @param {Array<Object>} rows - The ARC samples held, oldest first
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const arcChartSpec = (key, rows, t) => lineSpec(chartOf(key), { rows, t });
