import { MAX_POINTS } from './monitoring';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const BITS = 8;
const MEGA = 1000000;
const PERCENT = 100;

const round = (value, digits) => parseFloat(value.toFixed(digits));

const numberOf = value => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
};

const isNumber = value => value !== null && value !== undefined && Number.isFinite(Number(value));

/**
 * The instant a sample was taken, its `scan_timestamp` in milliseconds.
 *
 * @param {Object} row - The sample
 * @returns {number} The instant, `NaN` for a row without one
 */
export const timeOf = row => new Date(row?.scan_timestamp).getTime();

/**
 * The rows an answer or an event holds under one member, the REST
 * route's own, so a read and a pushed sample are taken with the same
 * code.
 *
 * @param {Object} answer - The answer's body, or the event's data
 * @param {string} member - The member that holds the rows, e.g. `cpu`
 * @returns {Array<Object>} The rows, none when the member is no list
 */
export const rowsOf = (answer, member) => (Array.isArray(answer?.[member]) ? answer[member] : []);

const capped = (rows, keyOf, limit) => {
  const counts = new Map();
  return rows
    .reduceRight((kept, row) => {
      const key = keyOf(row);
      const count = counts.get(key) || 0;
      if (count < limit) {
        counts.set(key, count + 1);
        kept.push(row);
      }
      return kept;
    }, [])
    .reverse();
};

/**
 * New samples merged into the ones held, a series only ever moving
 * forward: a row is added when it is newer than the newest row held of
 * its entity, so a read that overlaps what is held and a sample pushed
 * twice add nothing; the rows of one entity stay oldest first and the
 * `limit` newest of each are kept, the 180 points hyperweaver-ui kept.
 *
 * @param {Array<Object>} held - The rows held, oldest first per entity
 * @param {Array<Object>} rows - The rows read or pushed, in any order
 * @param {Object} [options] - `entity`, the member that tells one entity's rows from another's, and `limit`
 * @returns {Array<Object>} The merged rows
 */
export const mergeRows = (held, rows, { entity = '', limit = MAX_POINTS } = {}) => {
  const keyOf = row => (entity ? String(row[entity]) : '');
  const newest = new Map();
  held.forEach(row => {
    newest.set(keyOf(row), Math.max(newest.get(keyOf(row)) ?? -Infinity, timeOf(row)));
  });
  const added = [...rows]
    .filter(row => Number.isFinite(timeOf(row)) && (!entity || row[entity]))
    .sort((first, second) => timeOf(first) - timeOf(second))
    .filter(row => {
      const key = keyOf(row);
      const fresh = timeOf(row) > (newest.get(key) ?? -Infinity);
      if (fresh) {
        newest.set(key, timeOf(row));
      }
      return fresh;
    });
  return capped([...held, ...added], keyOf, limit);
};

/**
 * The newest sample of a series, null while it holds none.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {Object|null} The newest row
 */
export const latestOf = rows =>
  rows.reduce((latest, row) => (latest && timeOf(latest) >= timeOf(row) ? latest : row), null);

/**
 * How many instants a series holds, the rows of several entities taken
 * at one instant counted once: one instant is one sample, which a chart
 * draws as points and says so.
 *
 * @param {Array<Object>} rows - The rows held
 * @returns {number} The count of distinct instants
 */
export const samplesIn = rows => new Set(rows.map(timeOf)).size;

const coreLabel = core => core.cpu_id ?? `cpu${core.core}`;

const withCores = (cores, row) => {
  (Array.isArray(row.per_core_parsed) ? row.per_core_parsed : []).forEach(core => {
    const label = coreLabel(core);
    cores[label] = [...(cores[label] || []), [timeOf(row), numberOf(core.utilization_pct)]];
  });
  return cores;
};

/**
 * The CPU samples as the lines the chart draws: the overall use, the IO
 * delay where a sample carries one, a line per core named by the agent's
 * own `cpu_id` or, where it answers the core's number alone, `cpu` and
 * that number, and the three load averages.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ overall: Array, ioDelay: Array, cores: Object, load1: Array, load5: Array, load15: Array }} The points
 */
export const cpuSeries = rows => ({
  overall: rows.map(row => [timeOf(row), numberOf(row.cpu_utilization_pct)]),
  ioDelay: rows
    .filter(row => isNumber(row.io_delay_pct))
    .map(row => [timeOf(row), numberOf(row.io_delay_pct)]),
  cores: rows.reduce(withCores, {}),
  load1: rows.map(row => [timeOf(row), numberOf(row.load_avg_1min)]),
  load5: rows.map(row => [timeOf(row), numberOf(row.load_avg_5min)]),
  load15: rows.map(row => [timeOf(row), numberOf(row.load_avg_15min)]),
});

const gigabytes = (rows, member) =>
  rows
    .filter(row => isNumber(row[member]))
    .map(row => [timeOf(row), round(Number(row[member]) / GIB, 2)]);

/**
 * The memory samples as the lines the chart draws, in gigabytes: used,
 * free, total and, only of the samples that carry the number, cached.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {{ used: Array, free: Array, cached: Array, total: Array }} The points
 */
export const memorySeries = rows => ({
  used: gigabytes(rows, 'used_memory_bytes'),
  free: gigabytes(rows, 'free_memory_bytes'),
  cached: gigabytes(rows, 'cached_bytes'),
  total: gigabytes(rows, 'total_memory_bytes'),
});

const megabitsFrom = (bytes, seconds) =>
  seconds > 0 ? Math.max(0, (numberOf(bytes) / seconds) * BITS) / MEGA : 0;

/**
 * The megabits a second one network sample moved each way: the agent's
 * own `rx_mbps` and `tx_mbps` where it answers them, and the byte deltas
 * over `time_delta_seconds` otherwise, never under zero.
 *
 * @param {Object} row - The sample
 * @returns {{ rx: number, tx: number }} The two rates
 */
export const networkRates = row => {
  const seconds = numberOf(row.time_delta_seconds);
  return {
    rx: isNumber(row.rx_mbps) ? numberOf(row.rx_mbps) : megabitsFrom(row.rbytes_delta, seconds),
    tx: isNumber(row.tx_mbps) ? numberOf(row.tx_mbps) : megabitsFrom(row.obytes_delta, seconds),
  };
};

const withEntity = (entityOf, pointsOf) => (entities, row) => {
  const name = String(entityOf(row));
  const held = entities[name] || { first: [], second: [], total: [] };
  const [first, second] = pointsOf(row);
  const at = timeOf(row);
  entities[name] = {
    first: [...held.first, [at, round(first, 3)]],
    second: [...held.second, [at, round(second, 3)]],
    total: [...held.total, [at, round(first + second, 3)]],
  };
  return entities;
};

const networkPoints = row => {
  const { rx, tx } = networkRates(row);
  return [rx, tx];
};

const poolPoints = row => [
  numberOf(row.read_bandwidth_bytes) / MIB,
  numberOf(row.write_bandwidth_bytes) / MIB,
];

/**
 * The network samples as three lines an interface, megabits a second
 * received as `first`, sent as `second`, and both together.
 *
 * @param {Array<Object>} rows - The rows held, oldest first per interface
 * @returns {Object<string, { first: Array, second: Array, total: Array }>} The points per interface
 */
export const networkSeries = rows =>
  rows.reduce(
    withEntity(row => row.link, networkPoints),
    {}
  );

/**
 * The pool I/O samples as three lines a pool, megabytes a second read as
 * `first`, written as `second`, and both together.
 *
 * @param {Array<Object>} rows - The rows held, oldest first per pool
 * @returns {Object<string, { first: Array, second: Array, total: Array }>} The points per pool
 */
export const poolSeries = rows =>
  rows.reduce(
    withEntity(row => row.pool, poolPoints),
    {}
  );

const hitRatioOf = row => {
  if (isNumber(row.hit_ratio) && Number(row.hit_ratio) !== 0) {
    return Number(row.hit_ratio);
  }
  const hits = numberOf(row.hits ?? row.arc_hits);
  const misses = numberOf(row.misses ?? row.arc_misses);
  return hits + misses > 0 ? (hits / (hits + misses)) * PERCENT : 0;
};

const compressionOf = row => {
  const compressed = numberOf(row.compressed_size);
  return compressed > 0 && numberOf(row.uncompressed_size) > 0
    ? numberOf(row.uncompressed_size) / compressed
    : 1;
};

const pointsBy = (rows, valueOf, digits) =>
  rows.map(row => [timeOf(row), round(valueOf(row), digits)]);

/**
 * The ARC samples as the lines the charts draw: the size, the target,
 * the MRU and the MFU share in gigabytes, the hit ratio, the agent's own
 * or the hits over the hits and misses, the demand and the prefetch
 * efficiency in percent, and the compression ratio, one where the sample
 * carries no sizes to take it from.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {Object<string, Array>} The points of `size`, `target`, `mru`, `mfu`, `hitRatio`, `demandEfficiency`, `prefetchEfficiency` and `compressionRatio`
 */
export const arcSeries = rows => ({
  size: pointsBy(rows, row => numberOf(row.arc_size) / GIB, 2),
  target: pointsBy(rows, row => numberOf(row.arc_target_size) / GIB, 2),
  mru: pointsBy(rows, row => numberOf(row.mru_size) / GIB, 2),
  mfu: pointsBy(rows, row => numberOf(row.mfu_size) / GIB, 2),
  hitRatio: pointsBy(rows, hitRatioOf, 1),
  demandEfficiency: pointsBy(rows, row => numberOf(row.data_demand_efficiency), 2),
  prefetchEfficiency: pointsBy(rows, row => numberOf(row.data_prefetch_efficiency), 2),
  compressionRatio: pointsBy(rows, compressionOf, 2),
});
