import { isGap } from '../charts/splice';

import { historyParams } from './monitoring';
import { carriedOf, latestOf, networkRates, timeOf } from './series';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const LINK_PREFIX = 'link:';
const ONE_SAMPLE = 1;
const RATE_DIGITS = 3;

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

const lastCarried = (rows, read) =>
  rows
    .map(read)
    .filter(value => value !== null)
    .at(-1) ?? null;

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
 * machine of every other, and for a series read over a span the
 * `since`, `until` and `limit` of `historyParams`, `limit` 1 for the one
 * sample a VirtualBox machine's usage answers.
 *
 * @param {Object} options - The series, the machine, the span and the interval
 * @param {string} options.metric - The series' key
 * @param {string} options.name - The machine name
 * @param {number} options.since - The span's start in milliseconds
 * @param {number} options.until - The span's end in milliseconds
 * @param {number} options.interval - The agent's collection interval in seconds, zero while unknown
 * @returns {Object} The parameters
 */
export const machineSeriesParams = ({ metric, name, since, until, interval }) => {
  const series = machineSeriesOf(metric);
  return {
    [series.target]: linkOf(metric) || name,
    ...(series.windowed ? historyParams({ since, until, interval }) : { limit: ONE_SAMPLE }),
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
 * The readers of a zone's usage sample its charts' lines draw, each null
 * for a sample that does not carry the number: the share of the host's
 * processors in percent and the resident memory and the swap in
 * gigabytes.
 */
export const zoneValues = {
  cpu: carriedOf('cpu_pct', { digits: 2 }),
  resident: carriedOf('rss_bytes', { divisor: GIB, digits: 2 }),
  swap: carriedOf('swap_bytes', { divisor: GIB, digits: 2 }),
};

const leafOf = dataset => String(dataset).split('/').pop();

const withPoint = (points, at, bytes, gap) => {
  if (gap) {
    return [...points, [at, null]];
  }
  return isNumber(bytes) ? [...points, [at, round(Number(bytes) / MIB, 3)]] : points;
};

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
  const gap = isGap(row);
  devices[dataset] = {
    ...held,
    read: withPoint(held.read, at, row.read_bps, gap),
    write: withPoint(held.write, at, row.write_bps, gap),
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
 * answering null for a rate it could not take, a gap row a null point
 * of each, and the operations a second of the newest sample that carries
 * them, null while none does, the entries ordered by pool and then by
 * device.
 *
 * @param {Array<Object>} rows - The rows held, oldest first per dataset
 * @returns {Array<{ dataset: string, pool: string, device: string, read: Array, write: Array, readIops: number|null, writeIops: number|null }>} The volumes
 */
export const diskDevices = rows =>
  Object.values(rows.filter(row => row.dataset).reduce(withDevice, {})).sort(byPoolThenDevice);

/**
 * The readers of one link's usage sample its chart's lines draw, the
 * megabits a second received and sent, to three decimals, null for a gap
 * row.
 */
export const linkValues = {
  rx: row => (isGap(row) ? null : round(networkRates(row).rx, RATE_DIGITS)),
  tx: row => (isGap(row) ? null : round(networkRates(row).tx, RATE_DIGITS)),
};

/**
 * The readers of a VirtualBox machine's usage sample its charts' lines
 * draw, each null for a sample that does not carry the number, a rate
 * being null on the first observation: the guest's and the monitor's
 * share of the processors in percent, the memory used in gigabytes, and
 * the megabytes a second received, sent, read and written.
 */
export const machineValues = {
  cpuGuest: carriedOf('cpu_guest_pct', { digits: 2 }),
  cpuVmm: carriedOf('cpu_vmm_pct', { digits: 2 }),
  memory: carriedOf('rss_bytes', { divisor: GIB, digits: 2 }),
  netRx: carriedOf('net_rx_bps', { divisor: MIB, digits: RATE_DIGITS }),
  netTx: carriedOf('net_tx_bps', { divisor: MIB, digits: RATE_DIGITS }),
  diskRead: carriedOf('disk_read_bps', { divisor: MIB, digits: RATE_DIGITS }),
  diskWrite: carriedOf('disk_write_bps', { divisor: MIB, digits: RATE_DIGITS }),
};

/**
 * What the badges of a zone's charts read of its newest usage sample:
 * the share of the host's processors and the resident memory in
 * gigabytes, null where the series holds no number.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ cpu: number|null, resident: number|null }} The newest values
 */
export const zoneUsageLatest = rows => ({
  cpu: lastCarried(rows, zoneValues.cpu),
  resident: lastCarried(rows, zoneValues.resident),
});

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
  return {
    cpu: isNumber(row?.cpu_pct) ? round(Number(row.cpu_pct), 1) : null,
    memoryTotal: isNumber(row?.ram_total_bytes)
      ? round(Number(row.ram_total_bytes) / GIB, 1)
      : null,
    netRx: lastCarried(rows, machineValues.netRx),
    netTx: lastCarried(rows, machineValues.netTx),
    additions: row?.guest_additions !== false,
  };
};
