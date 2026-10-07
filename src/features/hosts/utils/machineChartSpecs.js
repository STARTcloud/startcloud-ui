import { chartOf } from '../charts/registry';

import { entitySpec, lineSpec } from './chartSpecs';

const NO_GROUPS = {};

const specOf = (key, { rows, t }) => lineSpec(chartOf(key), { rows, visibility: NO_GROUPS, t });

/**
 * What the processors chart of a zone draws, the `zone-cpu` entry of the
 * registry over its usage samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const zoneCpuSpec = chart => specOf('zone-cpu', chart);

/**
 * What the memory chart of a zone draws, the `zone-memory` entry of the
 * registry over its usage samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const zoneMemorySpec = chart => specOf('zone-memory', chart);

/**
 * What the disk chart of one volume of a zone draws, the `zone-disk`
 * entry of the registry over the volume's points.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Object} chart.device - The volume, an entry of `diskDevices`
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const diskSpec = ({ device, t }) =>
  entitySpec(chartOf('zone-disk'), { points: device, visibility: NO_GROUPS, t });

/**
 * What the network chart of one link of a zone draws, the `zone-link`
 * entry of the registry over the link's samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The link's samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const linkSpec = chart => specOf('zone-link', chart);

/**
 * What the processors chart of a VirtualBox machine draws, the
 * `machine-cpu` entry of the registry over its usage samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineCpuSpec = chart => specOf('machine-cpu', chart);

/**
 * What the memory chart of a VirtualBox machine draws, the
 * `machine-memory` entry of the registry over its usage samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineMemorySpec = chart => specOf('machine-memory', chart);

/**
 * What the network chart of a VirtualBox machine draws, the
 * `machine-network` entry of the registry over its usage samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineNetworkSpec = chart => specOf('machine-network', chart);

/**
 * What the disk chart of a VirtualBox machine draws, the `machine-disk`
 * entry of the registry over its usage samples.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineDiskSpec = chart => specOf('machine-disk', chart);
