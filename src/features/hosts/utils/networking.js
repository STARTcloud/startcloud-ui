import { compareText } from '../../../utils/sort';
import { chartOf } from '../charts/registry';

import { hostHasFeature } from './capabilities';
import { entitySpec, summarySpec as summaryOf } from './chartSpecs';
import { latestPer } from './resources';
import { networkRates } from './series';

export const NETWORKING_TOKENS = ['vnics', 'network-spaces'];

const GIGABIT = 1000;
const KILO = 1000;
const BUSY_MBPS = 100;
const WARM_MBPS = 50;
const LIVE_MBPS = 1;
const RATE_DIGITS = 2;
const CLASS_TONES = { phys: 'primary', vnic: 'info' };
const UP_STATES = ['ok', 'up'];
const NO_ZONE = '--';
const PREFIX_MARK = '/';

const isNumber = value => value !== null && value !== undefined && Number.isFinite(Number(value));

const numberOf = value => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
};

const wordOf = value => value;

const lower = value => String(value ?? '').toLowerCase();

const textOf = value => (value === null || value === undefined ? '' : String(value));

/**
 * Whether a host's own row lists a token of the networking page,
 * hyperweaver-ui's gate checked strictly: `vnics`, the token of
 * zoneweaver-agent's link stack, or `network-spaces`, the token of
 * hyperweaver-agent's network spaces. A row that lists neither offers no
 * networking page: no door to it draws and its route draws the
 * not-available stub, nothing asked of the host.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when the row lists one of the two
 */
export const hostHasNetworking = server =>
  NETWORKING_TOKENS.some(token => hostHasFeature(server, token));

/**
 * The address of one address row, read as the row's backend answers it:
 * the row's own `ip_address` where it carries one, zoneweaver-agent's
 * address without its prefix, and otherwise the part of its `addr`
 * before the slash, hyperweaver-agent's one member, the whole `addr`
 * where it carries no slash; empty for a row that carries neither.
 *
 * @param {Object|null} row - The address row
 * @returns {string} The address, or the empty string
 */
export const addressOf = row => {
  if (textOf(row?.ip_address)) {
    return textOf(row.ip_address);
  }
  return textOf(row?.addr).split(PREFIX_MARK)[0];
};

/**
 * The prefix length of one address row as the table draws it, a slash
 * and the number, read as the row's backend answers it: the row's own
 * `prefix_length` where it carries one, and otherwise the part of its
 * `addr` after the slash; empty for a row that carries neither.
 *
 * @param {Object|null} row - The address row
 * @returns {string} The prefix, or the empty string
 */
export const prefixOf = row => {
  if (isNumber(row?.prefix_length)) {
    return `${PREFIX_MARK}${row.prefix_length}`;
  }
  const [, prefix = ''] = textOf(row?.addr).split(PREFIX_MARK);
  return prefix ? `${PREFIX_MARK}${prefix}` : '';
};

/**
 * The key one address row is told from another by, its address object
 * and its `addr`, because an agent may name every address of one
 * interface and version by the same address object.
 *
 * @param {Object} row - The address row
 * @returns {string} The key
 */
export const addressKey = row => `${row.addrobj}|${row.addr}`;

/**
 * The key one route is told from another by, its destination, its
 * gateway, its interface and its version.
 *
 * @param {Object} row - The route
 * @returns {string} The key
 */
export const routeKey = row =>
  [row.destination, row.gateway, row.interface, row.ip_version].join('|');

const scanned = row => Boolean(row?.scan_timestamp);

const newestRows = (rows, keyOf) => {
  const list = Array.isArray(rows) ? rows : [];
  return [...list.filter(row => !scanned(row)), ...latestPer(list.filter(scanned), keyOf)];
};

/**
 * The addresses an agent answers, each drawn once: a row without a scan
 * instant is a live row and is kept as it is, and of the rows that carry
 * one the newest of each address object is kept, an agent that keeps a
 * history answering the rows of several scans.
 *
 * @param {Object|null} answer - The answer of `monitoring/network/ipaddresses`
 * @returns {Array<Object>} One row an address
 */
export const addressRows = answer => newestRows(answer?.addresses, row => row.addrobj);

/**
 * The routes an agent answers, each drawn once, the newest row of each
 * where the agent answers the rows of several scans.
 *
 * @param {Object|null} answer - The answer of `monitoring/network/routes`
 * @returns {Array<Object>} One row a route
 */
export const routeRows = answer => newestRows(answer?.routes, routeKey);

/**
 * The newest usage sample of each interface among the samples held of a
 * host, the rows the bandwidth table draws.
 *
 * @param {Array<Object>} rows - The samples held, oldest first an interface
 * @returns {Array<Object>} One sample an interface
 */
export const usageRows = rows => latestPer(rows, row => row.link);

/**
 * The megabits a second one usage sample moved, received, sent and both.
 *
 * @param {Object} row - The sample
 * @returns {{ rx: number, tx: number, total: number }} The rates
 */
export const bandwidthOf = row => {
  const { rx, tx } = networkRates(row);
  return { rx, tx, total: rx + tx };
};

/**
 * A rate in megabits a second as a person reads it, hyperweaver-ui's
 * steps: gigabits from a thousand megabits, megabits from one, kilobits
 * under one, and `0 bps` for nothing.
 *
 * @param {number} mbps - The megabits a second
 * @returns {string} The rate and its unit
 */
export const formatBandwidth = mbps => {
  const rate = numberOf(mbps);
  if (rate >= GIGABIT) {
    return `${(rate / GIGABIT).toFixed(RATE_DIGITS)} Gbps`;
  }
  if (rate >= 1) {
    return `${rate.toFixed(RATE_DIGITS)} Mbps`;
  }
  return rate > 0 ? `${(rate * KILO).toFixed(0)} Kbps` : '0 bps';
};

/**
 * The tone a total rate is drawn in, hyperweaver-ui's steps: danger over
 * a hundred megabits a second, warning over fifty, success over one, info
 * over nothing and dark for an idle interface.
 *
 * @param {number} mbps - The megabits a second, both ways
 * @returns {string} The Bootstrap tone
 */
export const bandwidthTone = mbps => {
  if (mbps > BUSY_MBPS) {
    return 'danger';
  }
  if (mbps > WARM_MBPS) {
    return 'warning';
  }
  if (mbps > LIVE_MBPS) {
    return 'success';
  }
  return mbps > 0 ? 'info' : 'dark';
};

/**
 * An interface's speed as a person reads it, gigabits from a thousand
 * megabits; empty for an interface whose speed the agent did not answer
 * or answered as nothing.
 *
 * @param {number} speed - The speed in megabits a second
 * @returns {string} The speed and its unit, or the empty string
 */
export const formatSpeed = speed => {
  const megabits = numberOf(speed);
  if (megabits <= 0) {
    return '';
  }
  return megabits >= GIGABIT ? `${megabits / GIGABIT} Gbps` : `${megabits} Mbps`;
};

/**
 * The tone an interface's class is drawn in, hyperweaver-ui's: primary
 * for a physical one, info for a virtual one and dark for every other.
 *
 * @param {string} name - The interface's `class`
 * @returns {string} The Bootstrap tone
 */
export const classTone = name => CLASS_TONES[name] || 'dark';

/**
 * The tone an address's state is drawn in: success while it reads `ok`
 * or `up`, warning for every other word.
 *
 * @param {string} state - The address's `state`
 * @returns {string} The Bootstrap tone
 */
export const addressTone = state => (UP_STATES.includes(state) ? 'success' : 'warning');

/**
 * The zone an interface belongs to, empty for an interface of the global
 * zone, answered as two dashes, and for a row that carries no zone.
 *
 * @param {Object} row - The interface
 * @returns {string} The zone's name, or the empty string
 */
export const zoneOf = row => (row?.zone && row.zone !== NO_ZONE ? String(row.zone) : '');

/**
 * The count a usage sample carries under one member, a whole number,
 * zero for a member the sample does not carry.
 *
 * @param {Object} row - The sample
 * @param {string} member - The member, e.g. `ipackets_delta`
 * @returns {number} The count
 */
export const packetsOf = (row, member) => Math.trunc(numberOf(row?.[member]));

/**
 * The seconds between a usage sample and the one before it.
 *
 * @param {Object} row - The sample
 * @returns {number} The seconds, zero for a sample that carries none
 */
export const intervalOf = row => numberOf(row?.time_delta_seconds);

/**
 * Builds a column `when` that is true while any row carries the member,
 * a zero and a false counted as carried.
 *
 * @param {string} member - The member a column needs, e.g. `ipackets_delta`
 * @returns {Function} `when(rows)` for a table column
 */
export const carries = member => rows =>
  rows.some(row => row[member] !== undefined && row[member] !== null);

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesAddress = matcher(row => [
  row.interface,
  row.ip_address,
  row.addr,
  row.addrobj,
]);

export const matchesRoute = matcher(row => [
  row.interface,
  row.destination,
  row.gateway,
  row.destination_mask,
  row.flags,
]);

export const matchesInterface = matcher(row => [row.link, row.class, row.macaddress, zoneOf(row)]);

export const matchesUsage = matcher(row => [row.link]);

const wordsOf = member => row => (row[member] ? [String(row[member])] : []);

/**
 * The filter groups of the addresses table, one per enumerable column:
 * the version and the state.
 */
export const ADDRESS_FILTERS = [
  {
    key: 'version',
    labelKey: 'host.ipAddressTable.type',
    values: wordsOf('ip_version'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'state',
    labelKey: 'host.ipAddressTable.status',
    values: wordsOf('state'),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the routing table, one per enumerable column a
 * route carries: the version and the flags.
 */
export const ROUTE_FILTERS = [
  {
    key: 'version',
    labelKey: 'hosts.networking.routes.version',
    values: wordsOf('ip_version'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'flags',
    labelKey: 'hosts.networking.routes.flags',
    values: wordsOf('flags'),
    activeClass: 'bg-secondary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the interfaces table, one per enumerable column:
 * the class and the state.
 */
export const INTERFACE_FILTERS = [
  {
    key: 'class',
    labelKey: 'host.interfacesTable.class',
    values: wordsOf('class'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'state',
    labelKey: 'host.interfacesTable.state',
    values: wordsOf('state'),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
];

/**
 * The orders the charts of the interfaces draw in, hyperweaver-ui's four,
 * each the member of an interface's points it orders by, none for the
 * order by name.
 */
export const CHART_SORTS = [
  { key: 'bandwidth', member: 'total', labelKey: 'host.bandwidthCharts.sortBandwidth' },
  { key: 'name', member: '', labelKey: 'host.bandwidthCharts.sortName' },
  { key: 'rx', member: 'first', labelKey: 'host.bandwidthCharts.sortRx' },
  { key: 'tx', member: 'second', labelKey: 'host.bandwidthCharts.sortTx' },
];

export const DEFAULT_CHART_SORT = 'bandwidth';

const NO_GROUPS = {};

/**
 * What one summary chart of the Bandwidth page draws, the
 * `network-summary` entry of the registry: a line an interface of one
 * member of its points.
 *
 * @param {string} member - The member of an interface's points, `first`, `second` or `total`
 * @param {Object<string, Object>} entities - The points per interface of `networkSeries`
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const summarySpec = (member, entities, t) =>
  summaryOf(chartOf('network-summary'), member, entities, t);

/**
 * What the chart of one interface draws, the `interface` entry of the
 * registry over the interface's points.
 *
 * @param {{ first: Array, second: Array, total: Array }} points - The interface's points
 * @param {Function} t - The translator
 * @returns {{ axes: Array<Object>, series: Array<Object> }} The axes and the series of the shared chart
 */
export const interfaceSpec = (points, t) =>
  entitySpec(chartOf('interface'), { points, visibility: NO_GROUPS, t });

const lastOf = points => (points.length > 0 ? points[points.length - 1][1] : 0);

/**
 * The interfaces in the order their charts draw: by name, or by the
 * newest rate of the member the order names, the busiest first.
 *
 * @param {Object<string, Object>} entities - The points per interface of `networkSeries`
 * @param {string} order - The order's key in `CHART_SORTS`
 * @returns {Array<string>} The interface names
 */
export const sortedInterfaces = (entities, order) => {
  const names = Object.keys(entities).sort(compareText);
  const member = CHART_SORTS.find(entry => entry.key === order)?.member || '';
  if (!member) {
    return names;
  }
  return names.sort(
    (first, second) => lastOf(entities[second][member]) - lastOf(entities[first][member])
  );
};
