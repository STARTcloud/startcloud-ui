import { hostHasFeature } from './capabilities';

/**
 * The reads the Overview's panels make, each the agent path it asks and
 * the tokens the host's own row must list for it, every one of them,
 * because an agent without the surface answers 404: the monitoring
 * service's status, health and summary and the network interfaces behind
 * `monitoring`, the ZFS pools and datasets behind `monitoring` and `zfs`,
 * the task queue's counts behind `tasks`, the swap summary behind `swap`
 * and the provisioning tools behind `provisioning`.
 */
export const READS = {
  'monitoring-status': { path: 'monitoring/status', tokens: ['monitoring'] },
  'monitoring-health': { path: 'monitoring/health', tokens: ['monitoring'] },
  'monitoring-summary': { path: 'monitoring/summary', tokens: ['monitoring'] },
  interfaces: { path: 'monitoring/network/interfaces', tokens: ['monitoring'] },
  pools: { path: 'monitoring/storage/pools', tokens: ['monitoring', 'zfs'] },
  datasets: { path: 'monitoring/storage/datasets', tokens: ['monitoring', 'zfs'] },
  'task-stats': { path: 'tasks/stats', tokens: ['tasks'] },
  swap: { path: 'system/swap/summary', tokens: ['swap'] },
  provisioning: { path: 'provisioning/status', tokens: ['provisioning'] },
};

/**
 * The series the performance charts draw, each the agent path its
 * history is read from, the member of the answer and of the event that
 * holds its rows, the event of the `monitoring` topic that carries a new
 * sample, the parameters the read sends beside `since` and `limit`, the
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
 * The time windows a chart's history is read over, hyperweaver-ui's ten,
 * each the minutes it reaches back and the key of its label.
 */
export const WINDOWS = [
  { key: '1min', minutes: 1, labelKey: 'hosts.charts.window.1min' },
  { key: '5min', minutes: 5, labelKey: 'hosts.charts.window.5min' },
  { key: '10min', minutes: 10, labelKey: 'hosts.charts.window.10min' },
  { key: '15min', minutes: 15, labelKey: 'hosts.charts.window.15min' },
  { key: '30min', minutes: 30, labelKey: 'hosts.charts.window.30min' },
  { key: '1hour', minutes: 60, labelKey: 'hosts.charts.window.1hour' },
  { key: '3hour', minutes: 180, labelKey: 'hosts.charts.window.3hour' },
  { key: '6hour', minutes: 360, labelKey: 'hosts.charts.window.6hour' },
  { key: '12hour', minutes: 720, labelKey: 'hosts.charts.window.12hour' },
  { key: '24hour', minutes: 1440, labelKey: 'hosts.charts.window.24hour' },
];

/**
 * The resolutions a chart's history is read at, hyperweaver-ui's four,
 * each the most samples the read asks for as `limit` and the key of its
 * label.
 */
export const RESOLUTIONS = [
  { key: 'realtime', limit: 125, labelKey: 'hosts.charts.resolution.realtime' },
  { key: 'high', limit: 38, labelKey: 'hosts.charts.resolution.high' },
  { key: 'medium', limit: 13, labelKey: 'hosts.charts.resolution.medium' },
  { key: 'low', limit: 5, labelKey: 'hosts.charts.resolution.low' },
];

export const DEFAULT_QUERY = { window: '15min', resolution: 'high' };

export const MAX_POINTS = 180;

const MINUTE_MS = 60 * 1000;

const DEFAULT_MINUTES = 15;

const DEFAULT_LIMIT = 38;

/**
 * The parameters a history read sends for a window and a resolution:
 * `since`, the instant the window reaches back to from `now`, and
 * `limit`, the most samples the resolution asks for; an unknown window
 * reads fifteen minutes and an unknown resolution 38 samples,
 * hyperweaver-ui's defaults.
 *
 * @param {{ window: string, resolution: string }} query - The window and the resolution
 * @param {number} now - The present, in milliseconds
 * @returns {{ since: string, limit: number }} The parameters
 */
export const historyParams = (query, now) => {
  const minutes = WINDOWS.find(entry => entry.key === query.window)?.minutes || DEFAULT_MINUTES;
  const limit = RESOLUTIONS.find(entry => entry.key === query.resolution)?.limit || DEFAULT_LIMIT;
  return { since: new Date(now - minutes * MINUTE_MS).toISOString(), limit };
};
