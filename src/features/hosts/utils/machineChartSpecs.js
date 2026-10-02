import { linkSeries, machineUsageSeries, zoneUsageSeries } from './machineSeries';

const PERCENT = { name: '%', min: 0, unit: '%' };
const GIGABYTES = { name: 'GB', min: 0, unit: ' GB' };
const MEGABYTES = { name: 'MB/s', min: 0, unit: ' MB/s' };
const MEGABITS = { name: 'Mbps', min: 0, unit: ' Mbps' };

const line = ({ key, nameKey, points, tone, t }) => ({
  key,
  name: t(nameKey),
  points,
  tone,
  width: 2,
});

const pair = ({ first, second, keys, names, t }) => [
  line({ key: keys[0], nameKey: names[0], points: first, tone: 'blue', t }),
  line({ key: keys[1], nameKey: names[1], points: second, tone: 'orange', t }),
];

const ZONE = 'machine.machineResourceCharts';

const MACHINE = 'machine.vboxResourceCharts';

const readWrite = scope => ({
  keys: ['read', 'write'],
  names: [`${scope}.readSeries`, `${scope}.writeSeries`],
});

const receivedSent = scope => ({
  keys: ['rx', 'tx'],
  names: [`${scope}.rxSeries`, `${scope}.txSeries`],
});

/**
 * What the processors chart of a zone draws: its share of the host's
 * processors in percent, one line in the theme's green.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const zoneCpuSpec = ({ rows, t }) => ({
  axes: [PERCENT],
  series: [
    line({
      key: 'cpu',
      nameKey: `${ZONE}.cpuSeries`,
      points: zoneUsageSeries(rows).cpu,
      tone: 'green',
      t,
    }),
  ],
});

/**
 * What the memory chart of a zone draws: the resident memory and the
 * swap in gigabytes.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const zoneMemorySpec = ({ rows, t }) => {
  const points = zoneUsageSeries(rows);
  return {
    axes: [GIGABYTES],
    series: pair({
      first: points.resident,
      second: points.swap,
      keys: ['resident', 'swap'],
      names: [`${ZONE}.residentSeries`, `${ZONE}.swapSeries`],
      t,
    }),
  };
};

/**
 * What the disk chart of one volume of a zone draws: the megabytes a
 * second read and written.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Object} chart.device - The volume, an entry of `diskDevices`
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const diskSpec = ({ device, t }) => ({
  axes: [MEGABYTES],
  series: pair({ first: device.read, second: device.write, ...readWrite(ZONE), t }),
});

/**
 * What the network chart of one link of a zone draws: the megabits a
 * second received and sent.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The link's samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const linkSpec = ({ rows, t }) => {
  const points = linkSeries(rows);
  return {
    axes: [MEGABITS],
    series: pair({ first: points.rx, second: points.tx, ...receivedSent(ZONE), t }),
  };
};

/**
 * What the processors chart of a VirtualBox machine draws: the guest's
 * share of the processors in the theme's green and the monitor's in its
 * purple, in percent.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineCpuSpec = ({ rows, t }) => {
  const points = machineUsageSeries(rows);
  return {
    axes: [PERCENT],
    series: [
      line({
        key: 'guest',
        nameKey: `${MACHINE}.guestSeries`,
        points: points.cpuGuest,
        tone: 'green',
        t,
      }),
      line({
        key: 'vmm',
        nameKey: `${MACHINE}.vmmSeries`,
        points: points.cpuVmm,
        tone: 'purple',
        t,
      }),
    ],
  };
};

/**
 * What the memory chart of a VirtualBox machine draws: the memory used,
 * in gigabytes.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineMemorySpec = ({ rows, t }) => ({
  axes: [GIGABYTES],
  series: [
    line({
      key: 'used',
      nameKey: `${MACHINE}.usedSeries`,
      points: machineUsageSeries(rows).memory,
      tone: 'blue',
      t,
    }),
  ],
});

/**
 * What the network chart of a VirtualBox machine draws: the megabytes a
 * second received and sent over every adapter.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineNetworkSpec = ({ rows, t }) => {
  const points = machineUsageSeries(rows);
  return {
    axes: [MEGABYTES],
    series: pair({ first: points.netRx, second: points.netTx, ...receivedSent(MACHINE), t }),
  };
};

/**
 * What the disk chart of a VirtualBox machine draws: the megabytes a
 * second read and written over every disk.
 *
 * @param {Object} chart - The chart's inputs
 * @param {Array<Object>} chart.rows - The usage samples held, oldest first
 * @param {Function} chart.t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const machineDiskSpec = ({ rows, t }) => {
  const points = machineUsageSeries(rows);
  return {
    axes: [MEGABYTES],
    series: pair({ first: points.diskRead, second: points.diskWrite, ...readWrite(MACHINE), t }),
  };
};
