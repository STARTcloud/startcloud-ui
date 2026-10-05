import { historyParams } from './monitoring';
import { latestOf, networkRates, timeOf } from './series';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const LINK_PREFIX = 'link:';
const ONE_SAMPLE = 1;

/**
 * The series the machine page's charts draw, each the agent path it is
 * read from, the member of the answer that holds its rows, the parameter
 * that names what is asked for, the machine or the link, the member that
 * tells one entity's rows from another's, and whether the read reaches
 * back over the host's window: the usage and the per-volume disk I/O of
 * a zone, the usage of a VirtualBox machine, which the agent answers as
 * the one sample it takes at the read, and the usage of one link.
 */
export const MACHINE_SERIES = {
  'zone-usage': {
    path: 'monitoring/zones/usage',
    member: 'usage',
    target: 'zone',
    entity: '',
    windowed: true,
  },
  'zone-diskio': {
    path: 'monitoring/zones/diskio',
    member: 'diskio',
    target: 'zone',
    entity: 'dataset',
    windowed: true,
  },
  'machine-usage': {
    path: 'monitoring/machines/usage',
    member: 'usage',
    target: 'machine_name',
    entity: '',
    windowed: false,
  },
  link: {
    path: 'monitoring/network/usage',
    member: 'usage',
    target: 'link',
    entity: '',
    windowed: true,
  },
};

const round = (value, digits) => parseFloat(value.toFixed(digits));

const isNumber = value => value !== null && value !== undefined && Number.isFinite(Number(value));

const pointsOf = (rows, member, { divisor = 1, digits = 2 } = {}) =>
  rows
    .filter(row => isNumber(row[member]))
    .map(row => [timeOf(row), round(Number(row[member]) / divisor, digits)]);

/**
 * The key one link's series is held under, the link's name after
 * `link:`.
 *
 * @param {string} link - The link's name
 * @returns {string} The series' key
 */
export const linkMetric = link => `${LINK_PREFIX}${link}`;

/**
 * The link a series' key names, empty for a key that names none.
 *
 * @param {string} metric - The series' key
 * @returns {string} The link's name, or the empty string
 */
export const linkOf = metric =>
  metric.startsWith(LINK_PREFIX) ? metric.slice(LINK_PREFIX.length) : '';

/**
 * The entry of `MACHINE_SERIES` a series' key reads by, `link` for the
 * series of any link.
 *
 * @param {string} metric - The series' key
 * @returns {Object} The entry
 */
export const machineSeriesOf = metric => MACHINE_SERIES[linkOf(metric) ? 'link' : metric];

/**
 * The parameters a read of a machine's series sends: what is asked for
 * under the series' own parameter, the link of a link's series and the
 * machine of every other, and for a series read over the host's window
 * the `since` and `limit` of `historyParams`, `limit` 1 for the one
 * sample a VirtualBox machine's usage answers.
 *
 * @param {Object} options - The series, the machine, the window, the interval, the newest held sample and the present
 * @param {string} options.metric - The series' key
 * @param {string} options.name - The machine name
 * @param {string} options.window - The host's window key
 * @param {number} options.interval - The agent's collection interval in seconds, zero while unknown
 * @param {number} options.newest - The instant of the newest sample held in milliseconds, zero while none is held
 * @param {number} options.now - The present, in milliseconds
 * @returns {Object} The parameters
 */
export const machineSeriesParams = ({ metric, name, window, interval, newest, now }) => {
  const series = machineSeriesOf(metric);
  return {
    [series.target]: linkOf(metric) || name,
    ...(series.windowed ? historyParams({ window, interval, newest, now }) : { limit: ONE_SAMPLE }),
  };
};

/**
 * The links of a zone its charts draw, the `physical` of every network
 * resource its hardware names.
 *
 * @param {Object|null} zone - The zone's devices of `zoneHardware`
 * @returns {Array<string>} The links
 */
export const zoneLinks = zone => (zone?.nics || []).map(nic => nic.physical).filter(Boolean);

/**
 * The usage samples of a zone as the lines its charts draw: the share of
 * the host's processors in percent and the resident memory and the swap
 * in gigabytes, each only of the samples that carry the number.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ cpu: Array, resident: Array, swap: Array }} The points
 */
export const zoneUsageSeries = rows => ({
  cpu: pointsOf(rows, 'cpu_pct'),
  resident: pointsOf(rows, 'rss_bytes', { divisor: GIB }),
  swap: pointsOf(rows, 'swap_bytes', { divisor: GIB }),
});

const leafOf = dataset => String(dataset).split('/').pop();

const withPoint = (points, at, bytes) =>
  isNumber(bytes) ? [...points, [at, round(Number(bytes) / MIB, 3)]] : points;

const withDevice = (devices, row) => {
  const dataset = String(row.dataset);
  const held = devices[dataset] || {
    dataset,
    pool: row.pool || '',
    device: row.device || leafOf(dataset),
    read: [],
    write: [],
    readIops: null,
    writeIops: null,
  };
  const at = timeOf(row);
  devices[dataset] = {
    ...held,
    read: withPoint(held.read, at, row.read_bps),
    write: withPoint(held.write, at, row.write_bps),
    readIops: isNumber(row.read_iops) ? Math.round(Number(row.read_iops)) : held.readIops,
    writeIops: isNumber(row.write_iops) ? Math.round(Number(row.write_iops)) : held.writeIops,
  };
  return devices;
};

const byPoolThenDevice = (first, second) =>
  first.pool.localeCompare(second.pool) || first.device.localeCompare(second.device);

/**
 * The disk I/O samples of a zone as one entry a volume, never summed,
 * because the volumes of one machine may sit on different pools: the
 * volume's dataset, its pool and its device, the dataset's last part
 * where the row names no device, the megabytes a second read and written
 * as points, each only of the samples that carry the number, the agent
 * answering null for a rate it could not take, and the operations a
 * second of the newest sample that carries them, null while none does,
 * the entries ordered by pool and then by device.
 *
 * @param {Array<Object>} rows - The rows held, oldest first per dataset
 * @returns {Array<{ dataset: string, pool: string, device: string, read: Array, write: Array, readIops: number|null, writeIops: number|null }>} The volumes
 */
export const diskDevices = rows =>
  Object.values(rows.filter(row => row.dataset).reduce(withDevice, {})).sort(byPoolThenDevice);

/**
 * The usage samples of one link as the two lines its chart draws,
 * megabits a second received and sent.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ rx: Array, tx: Array }} The points
 */
export const linkSeries = rows => ({
  rx: rows.map(row => [timeOf(row), round(networkRates(row).rx, 3)]),
  tx: rows.map(row => [timeOf(row), round(networkRates(row).tx, 3)]),
});

/**
 * The usage samples of a VirtualBox machine as the lines its charts
 * draw, each only of the samples that carry the number, a rate being
 * null on the first observation: the guest's and the monitor's share of
 * the processors in percent, the memory used in gigabytes, and the
 * megabytes a second received, sent, read and written.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ cpuGuest: Array, cpuVmm: Array, memory: Array, netRx: Array, netTx: Array, diskRead: Array, diskWrite: Array }} The points
 */
export const machineUsageSeries = rows => ({
  cpuGuest: pointsOf(rows, 'cpu_guest_pct'),
  cpuVmm: pointsOf(rows, 'cpu_vmm_pct'),
  memory: pointsOf(rows, 'rss_bytes', { divisor: GIB }),
  netRx: pointsOf(rows, 'net_rx_bps', { divisor: MIB, digits: 3 }),
  netTx: pointsOf(rows, 'net_tx_bps', { divisor: MIB, digits: 3 }),
  diskRead: pointsOf(rows, 'disk_read_bps', { divisor: MIB, digits: 3 }),
  diskWrite: pointsOf(rows, 'disk_write_bps', { divisor: MIB, digits: 3 }),
});

const lastValue = points => (points.length > 0 ? points[points.length - 1][1] : null);

/**
 * What the badges of a zone's charts read of its newest usage sample:
 * the share of the host's processors and the resident memory in
 * gigabytes, null where the series holds no number.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ cpu: number|null, resident: number|null }} The newest values
 */
export const zoneUsageLatest = rows => {
  const series = zoneUsageSeries(rows);
  return { cpu: lastValue(series.cpu), resident: lastValue(series.resident) };
};

/**
 * What the badges of a VirtualBox machine's charts read of its newest
 * sample: the share of the host's processors, the guest's memory in
 * gigabytes, the megabytes a second received and sent, each null where
 * the sample carries no number, and whether the guest additions answer,
 * which the memory needs.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ cpu: number|null, memoryTotal: number|null, netRx: number|null, netTx: number|null, additions: boolean }} The newest values
 */
export const machineUsageLatest = rows => {
  const row = latestOf(rows);
  const series = machineUsageSeries(rows);
  return {
    cpu: isNumber(row?.cpu_pct) ? round(Number(row.cpu_pct), 1) : null,
    memoryTotal: isNumber(row?.ram_total_bytes)
      ? round(Number(row.ram_total_bytes) / GIB, 1)
      : null,
    netRx: lastValue(series.netRx),
    netTx: lastValue(series.netTx),
    additions: row?.guest_additions !== false,
  };
};
