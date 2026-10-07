import { isGap, withGaps } from '../charts/splice';

import { WIDEST_MINUTES } from './monitoring';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const BITS = 8;
const MEGA = 1000000;
const PERCENT = 100;
const MINUTE_MS = 60 * 1000;

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

/**
 * New samples merged into the ones held: a row is added when no row of
 * its entity is held at its instant, so a read that overlaps what is
 * held, a history read older than a pushed sample and a sample pushed
 * twice add only what is new; the rows come out oldest first.
 *
 * @param {Array<Object>} held - The rows held, oldest first per entity
 * @param {Array<Object>} rows - The rows read or pushed, in any order
 * @param {Object} [options] - `entity`, the member that tells one entity's rows from another's
 * @returns {Array<Object>} The merged rows
 */
export const mergeRows = (held, rows, { entity = '' } = {}) => {
  const keyOf = row => (entity ? String(row[entity]) : '');
  const instantOf = row => `${keyOf(row)}|${timeOf(row)}`;
  const seen = new Set(held.map(instantOf));
  const added = rows.filter(row => {
    if (!Number.isFinite(timeOf(row)) || (entity && !row[entity]) || seen.has(instantOf(row))) {
      return false;
    }
    seen.add(instantOf(row));
    return true;
  });
  return [...held, ...added].sort((first, second) => timeOf(first) - timeOf(second));
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
 * The rows of a series inside a window measured from the newest row
 * held of each entity, never from the clock of the tab: of each entity
 * the rows no older than `minutes` before its newest row.
 *
 * @param {Array<Object>} rows - The rows held, oldest first per entity
 * @param {Object} options - `entity`, the member that tells one entity's rows from another's, and `minutes`, the window
 * @returns {Array<Object>} The rows inside the window
 */
export const windowOf = (rows, { entity = '', minutes }) => {
  const keyOf = row => (entity ? String(row[entity]) : '');
  const newest = new Map();
  rows.forEach(row => {
    newest.set(keyOf(row), Math.max(newest.get(keyOf(row)) ?? -Infinity, timeOf(row)));
  });
  const span = minutes * MINUTE_MS;
  return rows.filter(row => timeOf(row) >= newest.get(keyOf(row)) - span);
};

/**
 * The span the browser's store keeps of every series, the widest window
 * in milliseconds.
 */
export const KEPT_MS = WIDEST_MINUTES * MINUTE_MS;

/**
 * The rows a chart draws of a series: the ones inside the window before
 * the newest row held of each entity, every one of them, with a gap row
 * between two neighbours of one entity farther apart than two live
 * intervals while the live interval is known.
 *
 * @param {Array<Object>} rows - The rows held, oldest first per entity
 * @param {Object} options - `entity`, the member that tells one entity's rows from another's, `minutes`, the window, and `liveMs`, the agent's live interval in milliseconds, zero while unknown
 * @returns {Array<Object>} The rows drawn
 */
export const drawnRows = (rows, { entity = '', minutes, liveMs = 0 }) =>
  withGaps(windowOf(rows, { entity, minutes }), liveMs, entity);

/**
 * How many instants a series holds, the rows of several entities taken
 * at one instant counted once and a gap row not at all: one instant is
 * one sample, which a chart draws as points and says so.
 *
 * @param {Array<Object>} rows - The rows held
 * @returns {number} The count of distinct instants
 */
export const samplesIn = rows => new Set(rows.filter(row => !isGap(row)).map(timeOf)).size;

const scaled = (number, divisor, digits) =>
  digits === null ? number / divisor : round(number / divisor, digits);

const unlessGap = read => row => (isGap(row) ? null : read(row));

/**
 * A reader of one member of a sample as a number, zero for a member the
 * sample does not carry, divided by `divisor` and held to `digits`
 * decimals where given; null for a gap row.
 *
 * @param {string} member - The member, e.g. `cpu_utilization_pct`
 * @param {Object} [options] - `divisor` and `digits`
 * @returns {Function} `row => number|null`
 */
export const valueOf = (member, { divisor = 1, digits = null } = {}) =>
  unlessGap(row => scaled(numberOf(row[member]), divisor, digits));

/**
 * A reader of one member of a sample as a number, null for a member the
 * sample does not carry as one and for a gap row, so a line draws a
 * point only of the samples that carry it, divided by `divisor` and held
 * to `digits` decimals where given.
 *
 * @param {string} member - The member, e.g. `cached_bytes`
 * @param {Object} [options] - `divisor` and `digits`
 * @returns {Function} `row => number|null`
 */
export const carriedOf = (member, { divisor = 1, digits = null } = {}) =>
  unlessGap(row => (isNumber(row[member]) ? scaled(Number(row[member]), divisor, digits) : null));

const coreLabel = core => core.cpu_id ?? `cpu${core.core}`;

const withCores = (cores, row) => {
  (Array.isArray(row.per_core_parsed) ? row.per_core_parsed : []).forEach(core => {
    const label = coreLabel(core);
    cores[label] = [...(cores[label] || []), [timeOf(row), numberOf(core.utilization_pct)]];
  });
  return cores;
};

/**
 * The CPU samples as one line of points per core, named by the agent's
 * own `cpu_id` or, where it answers the core's number alone, `cpu` and
 * that number.
 *
 * @param {Array<Object>} rows - The rows held, oldest first
 * @returns {Object<string, Array>} The points per core
 */
export const coreSeries = rows => rows.reduce(withCores, {});

/**
 * The readers of a CPU sample the chart's lines draw: the overall use,
 * the IO delay where a sample carries one, and the three load averages.
 */
export const cpuValues = {
  overall: valueOf('cpu_utilization_pct'),
  ioDelay: carriedOf('io_delay_pct'),
  load1: valueOf('load_avg_1min'),
  load5: valueOf('load_avg_5min'),
  load15: valueOf('load_avg_15min'),
};

/**
 * The readers of a memory sample the chart's lines draw, in gigabytes,
 * each only of the samples that carry the number: used, free and cached.
 */
export const memoryValues = {
  used: carriedOf('used_memory_bytes', { divisor: GIB, digits: 2 }),
  free: carriedOf('free_memory_bytes', { divisor: GIB, digits: 2 }),
  cached: carriedOf('cached_bytes', { divisor: GIB, digits: 2 }),
};

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
  const at = timeOf(row);
  if (isGap(row)) {
    entities[name] = {
      first: [...held.first, [at, null]],
      second: [...held.second, [at, null]],
      total: [...held.total, [at, null]],
    };
    return entities;
  }
  const [first, second] = pointsOf(row);
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
 * received as `first`, sent as `second`, and both together, a gap row a
 * null point of each.
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
 * `first`, written as `second`, and both together, a gap row a null
 * point of each.
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

/**
 * The readers of an ARC sample the charts' lines draw: the size, the
 * target, the MRU and the MFU share in gigabytes, the hit ratio, the
 * agent's own or the hits over the hits and misses, the demand and the
 * prefetch efficiency in percent, and the compression ratio, one where
 * the sample carries no sizes to take it from; each null for a gap row.
 */
export const arcValues = {
  size: valueOf('arc_size', { divisor: GIB, digits: 2 }),
  target: valueOf('arc_target_size', { divisor: GIB, digits: 2 }),
  mru: valueOf('mru_size', { divisor: GIB, digits: 2 }),
  mfu: valueOf('mfu_size', { divisor: GIB, digits: 2 }),
  hitRatio: unlessGap(row => round(hitRatioOf(row), 1)),
  demandEfficiency: valueOf('data_demand_efficiency', { digits: 2 }),
  prefetchEfficiency: valueOf('data_prefetch_efficiency', { digits: 2 }),
  compressionRatio: unlessGap(row => round(compressionOf(row), 2)),
};
