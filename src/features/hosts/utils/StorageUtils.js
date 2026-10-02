import { hostHasFeature } from './capabilities';
import { latestPer } from './resources';
import { timeOf } from './series';

const KIB = 1024;
const MIB = 1024 ** 2;
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
const SIZE_UNITS = {
  '': 1,
  B: 1,
  K: KIB,
  M: KIB ** 2,
  G: KIB ** 3,
  T: KIB ** 4,
  P: KIB ** 5,
  E: KIB ** 6,
  Z: KIB ** 7,
};
const PERCENT = 100;
const FULL_PERCENT = 80;
const WARM_PERCENT = 60;
const HOT_DEGREES = 60;
const WARM_DEGREES = 45;
const BUSY_MBPS = 50;
const WARM_MBPS = 10;
const AVERAGED_POINTS = 5;
const POOL_TYPE_TONES = { raidz2: 'success', raidz1: 'info', mirror: 'warning' };
const HEALTH_TONES = {
  online: 'success',
  healthy: 'success',
  optimal: 'success',
  degraded: 'warning',
  warning: 'warning',
  faulted: 'danger',
  offline: 'danger',
  error: 'danger',
};

const numberOf = value => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
};

const lower = value => String(value ?? '').toLowerCase();

const round = (value, digits) => parseFloat(value.toFixed(digits));

/**
 * Whether a host's own row lists `zfs`, the token of hyperweaver-ui's
 * Storage tab, checked strictly: a row that lists it not offers no
 * storage page, no door to it draws and its route draws the
 * not-available stub.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when the row lists `zfs`
 */
export const hostHasStorage = server => hostHasFeature(server, 'zfs');

/**
 * A byte count as a person reads it, hyperweaver-ui's steps of 1024
 * with two decimals at most; `0 B` for nothing and for a value that is
 * no count.
 *
 * @param {number|string} bytes - The byte count
 * @returns {string} The size and its unit
 */
export const formatBytes = bytes => {
  const count = numberOf(bytes);
  if (count <= 0) {
    return '0 B';
  }
  const index = Math.max(
    0,
    Math.min(Math.floor(Math.log(count) / Math.log(KIB)), UNITS.length - 1)
  );
  return `${round(count / KIB ** index, 2)} ${UNITS[index]}`;
};

/**
 * A share of a total in percent with one decimal, `0%` while either is
 * nothing.
 *
 * @param {number} used - The part
 * @param {number} total - The whole
 * @returns {string} The percent
 */
export const formatPercentage = (used, total) =>
  used && total ? `${((used / total) * PERCENT).toFixed(1)}%` : '0%';

/**
 * The tone a health word is drawn in, hyperweaver-ui's: success for
 * online, healthy and optimal, warning for degraded and warning, danger
 * for faulted, offline and error, info for every other word.
 *
 * @param {string} health - The health word
 * @returns {string} The Bootstrap tone
 */
export const healthTone = health => HEALTH_TONES[lower(health)] || 'info';

/**
 * A size as ZFS prints it, `176G` or `1.72T`, in bytes; a number stays
 * one; zero for a dash, `none`, `N/A` and anything unreadable.
 *
 * @param {string|number} text - The size
 * @returns {number} The bytes
 */
export const parseSize = text => {
  if (typeof text === 'number') {
    return Number.isFinite(text) ? Math.floor(text) : 0;
  }
  const clean = String(text ?? '').trim();
  if (!clean || clean === '-' || clean === 'none' || clean === 'N/A') {
    return 0;
  }
  const match = /^(?<num>[0-9.]+)\s*(?<unit>[KMGTPEZB]?)/iu.exec(clean);
  if (!match) {
    return 0;
  }
  const value = parseFloat(match.groups.num) * (SIZE_UNITS[match.groups.unit.toUpperCase()] || 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

/**
 * The records grouped by one member, a record without it left out.
 *
 * @param {Array<Object>} records - The rows
 * @param {string} key - The member to group by
 * @returns {Object<string, Array<Object>>} The groups
 */
export const groupByKey = (records, key) =>
  records.reduce((groups, record) => {
    const name = record[key];
    if (name) {
      groups[name] = [...(groups[name] || []), record];
    }
    return groups;
  }, {});

/**
 * The newest record of each group.
 *
 * @param {Object<string, Array<Object>>} groups - The groups of `groupByKey`
 * @returns {Array<Object>} One record a group
 */
export const extractLatestPerGroup = groups =>
  Object.values(groups)
    .map(records => [...records].sort((a, b) => timeOf(b) - timeOf(a))[0])
    .filter(Boolean);

/**
 * The records each drawn once by `getKey`, the newest of two that share
 * a key kept, an agent that keeps a history answering the rows of
 * several scans.
 *
 * @param {Array<Object>} items - The rows
 * @param {Function} getKey - Answers the key of one row
 * @returns {Array<Object>} One row a key
 */
export const deduplicateRecords = (items, getKey) =>
  items.reduce((kept, item) => {
    const index = kept.findIndex(entry => getKey(entry) === getKey(item));
    if (index < 0) {
      return [...kept, item];
    }
    return timeOf(item) > timeOf(kept[index]) ? kept.with(index, item) : kept;
  }, []);

const sameDisk = (first, second) =>
  (first.device_name === second.device_name && Boolean(second.device_name)) ||
  (first.serial_number === second.serial_number && Boolean(second.serial_number)) ||
  (first.device === second.device && Boolean(second.device)) ||
  (first.name === second.name && Boolean(second.name));

/**
 * The disks each drawn once, two rows one disk while they share a device
 * name, a serial number, a device or a name, the newest kept.
 *
 * @param {Array<Object>} disks - The rows
 * @returns {Array<Object>} One row a disk
 */
export const deduplicateDisksByIdentity = disks =>
  disks.reduce((kept, disk) => {
    const index = kept.findIndex(entry => sameDisk(entry, disk));
    if (index < 0) {
      return [...kept, disk];
    }
    return timeOf(disk) > timeOf(kept[index]) ? kept.with(index, disk) : kept;
  }, []);

/**
 * The I/O samples as three lines an entity, hyperweaver-ui's chart data:
 * the megabytes a second read as `first`, written as `second`, and both
 * together, each entity's points oldest first.
 *
 * @param {Array<Object>} rows - The samples held
 * @param {Function} entityOf - Answers the entity of one sample
 * @returns {Object<string, { first: Array, second: Array, total: Array }>} The points per entity
 */
export const ioSeries = (rows, entityOf) =>
  [...rows]
    .filter(row => entityOf(row) && Number.isFinite(timeOf(row)))
    .sort((a, b) => timeOf(a) - timeOf(b))
    .reduce((entities, row) => {
      const name = String(entityOf(row));
      const held = entities[name] || { first: [], second: [], total: [] };
      const read = numberOf(row.read_bandwidth_bytes) / MIB;
      const write = numberOf(row.write_bandwidth_bytes) / MIB;
      const at = timeOf(row);
      entities[name] = {
        first: [...held.first, [at, round(read, 3)]],
        second: [...held.second, [at, round(write, 3)]],
        total: [...held.total, [at, round(read + write, 3)]],
      };
      return entities;
    }, {});

export const poolName = row => row.pool || row.name || '';

export const datasetName = row => row.name || row.dataset || '';

export const diskName = row => row.device_name || row.device || row.name || '';

/**
 * The pools an agent answers, each drawn once, the newest row of each
 * where the agent keeps a history, in the order of their names.
 *
 * @param {Object|null} answer - The answer of `monitoring/storage/pools`
 * @returns {Array<Object>} One row a pool
 */
export const poolRows = answer => latestPer(answer?.pools, poolName);

/**
 * The datasets an agent answers, each drawn once, the newest row of
 * each, in the order of their names.
 *
 * @param {Object|null} answer - The answer of `monitoring/storage/datasets`
 * @returns {Array<Object>} One row a dataset
 */
export const datasetRows = answer => latestPer(answer?.datasets, datasetName);

/**
 * The disks an agent answers, each drawn once by its identity, in the
 * order of their device names.
 *
 * @param {Object|null} answer - The answer of `monitoring/storage/disks`
 * @returns {Array<Object>} One row a disk
 */
export const diskRows = answer =>
  deduplicateDisksByIdentity(Array.isArray(answer?.disks) ? answer.disks : []).sort((a, b) =>
    diskName(a).localeCompare(diskName(b))
  );

/**
 * The newest I/O sample of each device among the samples held, the rows
 * the disk I/O table draws.
 *
 * @param {Array<Object>} rows - The samples held
 * @returns {Array<Object>} One sample a device
 */
export const diskIoRows = rows => latestPer(rows, row => row.device_name);

/**
 * The newest I/O sample of each pool among the samples held, the rows
 * the pool I/O table draws.
 *
 * @param {Array<Object>} rows - The samples held
 * @returns {Array<Object>} One sample a pool
 */
export const poolIoRows = rows => latestPer(rows, row => row.pool);

/**
 * The key one disk is told from another by, its serial number or its
 * device name.
 *
 * @param {Object} disk - The disk's row
 * @returns {string} The key
 */
export const diskKey = disk =>
  String(disk.serial_number || disk.serial || disk.serialNumber || diskName(disk));

/**
 * The usage of one pool, hyperweaver-ui's arithmetic: the allocated and
 * the free bytes, read from the human sizes where the row carries them
 * and the `*_bytes` members otherwise, which the agent serves as
 * strings, their sum and the percent used.
 *
 * @param {Object} pool - The pool's row
 * @returns {{ alloc: number, free: number, total: number, percent: number }} The usage
 */
export const poolUsage = pool => {
  const alloc = parseSize(pool.alloc) || Number(pool.alloc_bytes) || 0;
  const free = parseSize(pool.free) || Number(pool.free_bytes) || 0;
  const total = alloc + free;
  return { alloc, free, total, percent: total > 0 ? round((alloc / total) * PERCENT, 1) : 0 };
};

/**
 * The tone a pool's usage is drawn in: danger over 80 percent, warning
 * over 60, success under.
 *
 * @param {number} percent - The percent used
 * @returns {string} The Bootstrap tone
 */
export const usageTone = percent => {
  if (percent > FULL_PERCENT) {
    return 'danger';
  }
  return percent > WARM_PERCENT ? 'warning' : 'success';
};

/**
 * The tone a disk's temperature is drawn in: danger over 60 degrees,
 * warning over 45, success under.
 *
 * @param {number} degrees - The temperature
 * @returns {string} The Bootstrap tone
 */
export const temperatureTone = degrees => {
  if (degrees > HOT_DEGREES) {
    return 'danger';
  }
  return degrees > WARM_DEGREES ? 'warning' : 'success';
};

/**
 * The megabytes a second one I/O sample moved, read, written and both.
 *
 * @param {Object} row - The sample
 * @returns {{ read: number, write: number, total: number }} The rates
 */
export const ioRates = row => {
  const read = numberOf(row?.read_bandwidth_bytes) / MIB;
  const write = numberOf(row?.write_bandwidth_bytes) / MIB;
  return { read, write, total: read + write };
};

/**
 * A rate in megabytes a second as a person reads it, hyperweaver-ui's
 * steps: megabytes from one, kilobytes under one, `0 B/s` for nothing.
 *
 * @param {number} mbps - The megabytes a second
 * @returns {string} The rate and its unit
 */
export const formatIoRate = mbps => {
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} MB/s`;
  }
  return mbps > 0 ? `${(mbps * KIB).toFixed(0)} KB/s` : '0 B/s';
};

/**
 * The tone a total I/O rate is drawn in, hyperweaver-ui's: danger over
 * fifty megabytes a second, warning over ten, success over nothing and
 * secondary for an idle device.
 *
 * @param {number} mbps - The megabytes a second, both ways
 * @returns {string} The Bootstrap tone
 */
export const ioTone = mbps => {
  if (mbps > BUSY_MBPS) {
    return 'danger';
  }
  if (mbps > WARM_MBPS) {
    return 'warning';
  }
  return mbps > 0 ? 'success' : 'secondary';
};

/**
 * The tone a pool's type is drawn in, hyperweaver-ui's: success for
 * raidz2, info for raidz1, warning for a mirror and dark for every other.
 *
 * @param {string} type - The pool's `pool_type`
 * @returns {string} The Bootstrap tone
 */
export const poolTypeTone = type => POOL_TYPE_TONES[type] || 'dark';

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesPool = matcher(row => [poolName(row), row.health, row.status]);

export const matchesDataset = matcher(row => [
  datasetName(row),
  row.type,
  row.mountpoint,
  row.mount,
  row.compression,
]);

export const matchesDisk = matcher(row => [
  diskName(row),
  row.model,
  row.product,
  row.serial_number,
  row.serial,
  row.disk_type,
  row.pool_assignment,
  row.pool,
]);

export const matchesDiskIo = matcher(row => [row.device_name, row.pool]);

export const matchesPoolIo = matcher(row => [row.pool, row.pool_type]);

const wordsOf = valueOf => row => {
  const value = valueOf(row);
  return value ? [String(value)] : [];
};

const wordOf = value => value;

/**
 * The filter groups of the pools table, one per enumerable column: the
 * health.
 */
export const POOL_FILTERS = [
  {
    key: 'health',
    labelKey: 'host.poolsTable.thHealth',
    values: wordsOf(row => row.health || row.status),
    activeClass: 'bg-success',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the datasets table: the type and the compression.
 */
export const DATASET_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.datasetsTable.typeHeader',
    values: wordsOf(row => row.type),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'compression',
    labelKey: 'host.datasetsTable.compressionHeader',
    values: wordsOf(row => row.compression),
    activeClass: 'bg-secondary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the disks table: the type, the health and the
 * pool.
 */
export const DISK_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.disksTable.typeHeader',
    values: wordsOf(row => row.disk_type || row.type || row.mediaType),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'health',
    labelKey: 'host.disksTable.healthHeader',
    values: wordsOf(row => row.health || row.status),
    activeClass: 'bg-success',
    labelFor: wordOf,
  },
  {
    key: 'pool',
    labelKey: 'host.disksTable.poolHeader',
    values: wordsOf(row => row.pool_assignment || row.pool),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the disk I/O table: the pool.
 */
export const DISK_IO_FILTERS = [
  {
    key: 'pool',
    labelKey: 'host.diskIOTable.poolHeader',
    values: wordsOf(row => row.pool),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the pool I/O table: the pool's type.
 */
export const POOL_IO_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.poolIOTable.type',
    values: wordsOf(row => row.pool_type),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
];

/**
 * The orders the charts of the devices draw in, hyperweaver-ui's four,
 * each the member of a device's points it orders by, none for the order
 * by name.
 */
export const STORAGE_CHART_SORTS = [
  { key: 'bandwidth', member: 'total', labelKey: 'host.storageCharts.sortByBandwidth' },
  { key: 'name', member: '', labelKey: 'host.storageCharts.sortByName' },
  { key: 'read', member: 'first', labelKey: 'host.storageCharts.sortByRead' },
  { key: 'write', member: 'second', labelKey: 'host.storageCharts.sortByWrite' },
];

export const DEFAULT_STORAGE_CHART_SORT = 'bandwidth';

const recentAverage = points => {
  const tail = points.slice(-AVERAGED_POINTS);
  return tail.length > 0 ? tail.reduce((sum, point) => sum + (point[1] || 0), 0) / tail.length : 0;
};

/**
 * The devices in the order their charts draw, hyperweaver-ui's: by name,
 * or by the average of the newest five rates of the member the order
 * names, the busiest first; a device that holds no point is left out.
 *
 * @param {Object<string, Object>} entities - The points per device of `ioSeries`
 * @param {string} order - The order's key in `STORAGE_CHART_SORTS`
 * @returns {Array<string>} The device names
 */
export const sortedChartEntries = (entities, order) => {
  const names = Object.keys(entities)
    .filter(name => entities[name].total.length > 0)
    .sort((a, b) => a.localeCompare(b));
  const member = STORAGE_CHART_SORTS.find(entry => entry.key === order)?.member || '';
  if (!member) {
    return names;
  }
  return names.sort(
    (first, second) =>
      recentAverage(entities[second][member]) - recentAverage(entities[first][member])
  );
};

/**
 * What hyperweaver-ui's ARC overview drew of the newest sample: the hit
 * ratio, the agent's own or the hits over the hits and misses, the
 * compression ratio where the sample carries the two sizes, and the
 * L2ARC hit ratio where it carries an L2ARC.
 *
 * @param {Object|null} arc - The newest ARC sample
 * @returns {{ hitRatio: number, compressionRatio: number|null, l2HitRatio: number, l2: boolean }} The ratios
 */
export const arcRatios = arc => {
  const hits = numberOf(arc?.hits ?? arc?.arc_hits);
  const misses = numberOf(arc?.misses ?? arc?.arc_misses);
  const own = numberOf(arc?.hit_ratio);
  const counted = hits + misses > 0 ? (hits / (hits + misses)) * PERCENT : 0;
  const hitRatio = own > 0 ? own : counted;
  const compressed = numberOf(arc?.compressed_size);
  const compressionRatio =
    compressed > 0 && numberOf(arc?.uncompressed_size) > 0
      ? round(numberOf(arc.uncompressed_size) / compressed, 2)
      : null;
  const l2Hits = numberOf(arc?.l2_hits);
  const l2Misses = numberOf(arc?.l2_misses);
  return {
    hitRatio: round(hitRatio, 1),
    compressionRatio,
    l2HitRatio: l2Hits + l2Misses > 0 ? round((l2Hits / (l2Hits + l2Misses)) * PERCENT, 1) : 0,
    l2: numberOf(arc?.l2_size) > 0,
  };
};

const stepTone = (steps, value) => steps.find(([floor]) => value > floor)?.[1] || steps.at(-1)[1];

export const hitRatioTone = ratio =>
  stepTone(
    [
      [95, 'success'],
      [90, 'info'],
      [80, 'warning'],
      [-1, 'danger'],
    ],
    ratio
  );

export const dataEfficiencyTone = efficiency =>
  stepTone(
    [
      [95, 'success'],
      [90, 'info'],
      [80, 'warning'],
      [-1, 'dark'],
    ],
    efficiency
  );

export const prefetchEfficiencyTone = efficiency =>
  stepTone(
    [
      [50, 'success'],
      [20, 'info'],
      [5, 'warning'],
      [-1, 'dark'],
    ],
    efficiency
  );

export const compressionRatioTone = ratio =>
  stepTone(
    [
      [2, 'success'],
      [1.5, 'info'],
      [1.1, 'warning'],
      [-1, 'dark'],
    ],
    ratio
  );

export const l2HitRatioTone = ratio =>
  stepTone(
    [
      [80, 'success'],
      [60, 'info'],
      [40, 'warning'],
      [-1, 'danger'],
    ],
    ratio
  );
