import { hostHasFeature } from './capabilities';

/**
 * The reads the Overview's panels and the networking page's tables make,
 * each the agent path it asks and
 * the tokens the host's own row must list for it, every one of them,
 * because an agent without the surface answers 404: the monitoring
 * service's status, health and summary, the network interfaces and the
 * IP addresses behind `monitoring`, the routing table behind `monitoring`
 * and `vnics`, the token of the agent that serves it until a token of
 * its own names it, the ZFS pools and datasets behind `monitoring` and `zfs`,
 * the task queue's counts behind `tasks`, the swap summary behind `swap`
 * and the provisioning tools behind `provisioning`.
 */
export const READS = {
  'monitoring-status': { path: 'monitoring/status', tokens: ['monitoring'] },
  'monitoring-health': { path: 'monitoring/health', tokens: ['monitoring'] },
  'monitoring-summary': { path: 'monitoring/summary', tokens: ['monitoring'] },
  interfaces: { path: 'monitoring/network/interfaces', tokens: ['monitoring'] },
  'ip-addresses': { path: 'monitoring/network/ipaddresses', tokens: ['monitoring'] },
  routes: { path: 'monitoring/network/routes', tokens: ['monitoring', 'vnics'] },
  pools: { path: 'monitoring/storage/pools', tokens: ['monitoring', 'zfs'] },
  datasets: { path: 'monitoring/storage/datasets', tokens: ['monitoring', 'zfs'] },
  disks: { path: 'monitoring/storage/disks', tokens: ['monitoring'] },
  'task-stats': { path: 'tasks/stats', tokens: ['tasks'] },
  swap: { path: 'system/swap/summary', tokens: ['swap'] },
  provisioning: { path: 'provisioning/status', tokens: ['provisioning'] },
  'network-addresses': { path: 'network/addresses', tokens: [], any: ['ip-addresses', 'vnics'] },
  vnics: { path: 'network/vnics', tokens: ['vnics'] },
  vlans: { path: 'network/vlans', tokens: ['vnics'] },
  etherstubs: { path: 'network/etherstubs', tokens: ['vnics'] },
  bridges: { path: 'network/bridges', tokens: ['vnics'], params: { extended: true } },
  aggregates: { path: 'network/aggregates', tokens: ['vnics'], params: { extended: true } },
  'network-spaces': { path: 'network/spaces', tokens: ['network-spaces'] },
  hostname: { path: 'network/hostname', tokens: [], any: ['hostname', 'vnics'] },
  dns: { path: 'system/dns', tokens: [], any: ['dns', 'vnics'] },
  'hosts-file': { path: 'system/hosts', tokens: ['hosts-file'] },
  'services-cdp': { path: 'services', tokens: ['vnics'], params: { pattern: 'cdp' } },
  'machines-usage': { path: 'monitoring/machines/usage', tokens: ['monitoring', 'network-spaces'] },
};

/**
 * The keys of `READS` the networking page's management draws, the reads
 * a queued task's end asks again.
 */
export const NETWORKING_READS = [
  'network-addresses',
  'vnics',
  'vlans',
  'etherstubs',
  'bridges',
  'aggregates',
  'network-spaces',
  'hostname',
  'dns',
  'hosts-file',
  'interfaces',
  'ip-addresses',
  'routes',
];

/**
 * The series the performance charts draw, each the agent path its
 * history is read from, the member of the answer and of the event that
 * holds its rows, the event of the `monitoring` topic that carries a new
 * sample, the parameters the read sends beside `since` and `until`, the
 * member that tells one entity's rows from another's, an interface or a
 * pool, and the tokens the host's own row must list.
 */
export const SERIES = {
  cpu: {
    path: 'monitoring/system/cpu',
    member: 'cpu',
    event: 'cpu-sample',
    params: { include_cores: true },
    entity: '',
    tokens: ['monitoring'],
  },
  memory: {
    path: 'monitoring/system/memory',
    member: 'memory',
    event: 'memory-sample',
    params: {},
    entity: '',
    tokens: ['monitoring'],
  },
  network: {
    path: 'monitoring/network/usage',
    member: 'usage',
    event: 'network-sample',
    params: { per_interface: true },
    entity: 'link',
    tokens: ['monitoring'],
  },
  'pool-io': {
    path: 'monitoring/storage/pool-io',
    member: 'poolio',
    event: 'pool-io-sample',
    params: { per_pool: true },
    entity: 'pool',
    tokens: ['monitoring', 'zfs'],
  },
  arc: {
    path: 'monitoring/storage/arc',
    member: 'arc',
    event: 'arc-sample',
    params: {},
    entity: '',
    tokens: ['monitoring', 'zfs'],
  },
  'disk-io': {
    path: 'monitoring/storage/disk-io',
    member: 'diskio',
    event: 'disk-io-sample',
    params: { per_device: true },
    entity: 'device_name',
    tokens: ['monitoring', 'zfs'],
  },
};

/**
 * Whether a host's own row lists every one of the tokens, checked
 * strictly: a row that has not answered offers nothing.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {Array<string>} tokens - The tokens a surface needs
 * @returns {boolean} True only when the row lists them all
 */
export const hostOffers = (server, tokens) => tokens.every(token => hostHasFeature(server, token));

/**
 * Whether a host's own row offers one read of `READS`: every token of
 * `tokens` and, where the read names `any`, at least one of those, the
 * any-of gate of a surface two agents list under different tokens.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {{ tokens: Array<string>, any?: Array<string> }} read - The entry of `READS`
 * @returns {boolean} True only when the row offers it
 */
export const readOffered = (server, read) =>
  hostOffers(server, read.tokens) &&
  (!read.any || read.any.some(token => hostHasFeature(server, token)));

/**
 * The time windows every chart of a host is read over, hyperweaver-ui's
 * ten, each its key, the word of hyperweaver-ui's option, and the
 * minutes it reaches back.
 */
export const WINDOWS = [
  { key: '1min', minutes: 1 },
  { key: '5min', minutes: 5 },
  { key: '10min', minutes: 10 },
  { key: '15min', minutes: 15 },
  { key: '30min', minutes: 30 },
  { key: '1hour', minutes: 60 },
  { key: '3hour', minutes: 180 },
  { key: '6hour', minutes: 360 },
  { key: '12hour', minutes: 720 },
  { key: '24hour', minutes: 1440 },
];

export const DEFAULT_QUERY = { window: '15min' };

/**
 * The minutes of the widest window, the span the browser's ring keeps of
 * every series.
 */
export const WIDEST_MINUTES = Math.max(...WINDOWS.map(entry => entry.minutes));

const SECOND_MS = 1000;

const MINUTE_MS = 60 * SECOND_MS;

const DEFAULT_MINUTES = 15;

/**
 * The minutes a window's key reaches back, fifteen for a key `WINDOWS`
 * does not name.
 *
 * @param {string} window - The window's key, e.g. `1hour`
 * @returns {number} The minutes
 */
export const windowMinutes = window =>
  WINDOWS.find(entry => entry.key === window)?.minutes || DEFAULT_MINUTES;

/**
 * The milliseconds a window's key reaches back.
 *
 * @param {string} window - The window's key, e.g. `1hour`
 * @returns {number} The span in milliseconds
 */
export const windowMs = window => windowMinutes(window) * MINUTE_MS;

/**
 * The samples a span holds at an agent's collection interval, every one
 * of them and one at least.
 *
 * @param {number} since - The span's start in milliseconds
 * @param {number} until - The span's end in milliseconds
 * @param {number} interval - The agent's collection interval in seconds, above zero
 * @returns {number} The sample count
 */
export const spanSamples = (since, until, interval) =>
  Math.max(1, Math.ceil((until - since) / SECOND_MS / interval));

/**
 * The occasions a series asks the agent on: `open`, the first read of a
 * series; `refresh`, a Refresh, a stale series read again and the
 * stream opening fresh or answering `reset`; `rewindow`, a change of the
 * window.
 */
export const HISTORY_MODES = { open: 'open', refresh: 'refresh', rewindow: 'rewindow' };

/**
 * The spans a series asks the agent for after the store is read, so the
 * agent answers only what the store lacks: the whole window from `start`
 * to `now` while nothing is held, on every occasion; otherwise the span
 * before the oldest held sample, from `start` to it, on `open` and
 * `rewindow` while the oldest held is newer than `start`, and the span
 * after the newest held sample, from it to `now`, on `open` and
 * `refresh`; none on a `rewindow` the store already reaches back over.
 *
 * @param {Object} options - What is held, the window and the occasion
 * @param {number|null} options.oldest - The instant of the oldest sample held in milliseconds, null while none is held
 * @param {number|null} options.newest - The instant of the newest sample held in milliseconds, null while none is held
 * @param {number} options.start - The instant the window reaches back to, in milliseconds
 * @param {number} options.now - The present, in milliseconds
 * @param {string} options.mode - One of `HISTORY_MODES`
 * @returns {Array<{ since: number, until: number }>} The spans, oldest first
 */
export const historySpans = ({ oldest, newest, start, now, mode }) => {
  if (oldest === null || newest === null) {
    return [{ since: start, until: now }];
  }
  const backward = mode !== HISTORY_MODES.refresh && oldest > start;
  const forward = mode !== HISTORY_MODES.rewindow;
  return [
    ...(backward ? [{ since: start, until: oldest }] : []),
    ...(forward ? [{ since: newest, until: now }] : []),
  ];
};

/**
 * The parameters a history read of one span sends: `since` and `until`,
 * the span's two instants as RFC 3339, and, while the agent's collection
 * interval is known, `limit`, the samples the span holds at that
 * interval; no `limit` while the interval is unknown.
 *
 * @param {Object} options - The span and the interval
 * @param {number} options.since - The span's start in milliseconds
 * @param {number} options.until - The span's end in milliseconds
 * @param {number} options.interval - The agent's collection interval in seconds, zero while unknown
 * @returns {{ since: string, until: string, limit?: number }} The parameters
 */
export const historyParams = ({ since, until, interval }) => ({
  since: new Date(since).toISOString(),
  until: new Date(until).toISOString(),
  ...(interval > 0 ? { limit: spanSamples(since, until, interval) } : {}),
});
