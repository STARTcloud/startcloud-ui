const UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

const KILO = 1024;

const HIGH_LOAD = 2;

const LOW_MEMORY_SHARE = 0.1;

const PERCENT = 100;

/**
 * A byte count as hyperweaver-ui's dashboard drew it, rounded to the
 * largest unit that fits.
 *
 * @param {number} bytes - The count
 * @returns {string} The text
 */
export const bytesToSize = bytes => {
  if (!bytes) {
    return '0 Byte';
  }
  const index = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(KILO)));
  return `${Math.round(bytes / KILO ** index)} ${UNITS[index]}`;
};

/**
 * Whether a host's stats say its load is high, a one-minute load over
 * two, hyperweaver-ui's rule.
 *
 * @param {Object|null} data - The host's stats
 * @returns {boolean} True for a high load
 */
export const hasHighLoad = data => Boolean(data?.loadavg) && data.loadavg[0] > HIGH_LOAD;

/**
 * Whether a host's stats say its memory is low, under a tenth free,
 * hyperweaver-ui's rule.
 *
 * @param {Object|null} data - The host's stats
 * @returns {boolean} True for low memory
 */
export const hasLowFreeMemory = data =>
  Boolean(data?.totalmem && data?.freemem) && data.freemem / data.totalmem < LOW_MEMORY_SHARE;

/**
 * The share of a host's memory in use, in whole percent, null while the
 * stats carry no total.
 *
 * @param {Object|null} data - The host's stats
 * @returns {number|null} The percent
 */
export const memoryPercentOf = data =>
  data?.totalmem && data?.freemem
    ? Math.round(((data.totalmem - data.freemem) / data.totalmem) * PERCENT)
    : null;

/**
 * The health of one host's result, hyperweaver-ui's three words: offline
 * while its stats did not answer, warning on a high load or low memory,
 * healthy otherwise.
 *
 * @param {{ success: boolean, data: Object|null }} serverResult - The host's result
 * @returns {string} `offline`, `warning` or `healthy`
 */
export const getServerHealthStatus = serverResult => {
  if (!serverResult.success || !serverResult.data) {
    return 'offline';
  }
  return hasHighLoad(serverResult.data) || hasLowFreeMemory(serverResult.data)
    ? 'warning'
    : 'healthy';
};

const STATUS_COLORS = {
  healthy: 'text-success',
  warning: 'text-warning',
  offline: 'text-danger',
};

/**
 * The text class a health word draws in.
 *
 * @param {string} status - The health word
 * @returns {string} The class
 */
export const getStatusColor = status => STATUS_COLORS[status] || 'text-muted';

/**
 * One host's result the dashboard draws, from what the hosts feature's
 * context holds of it: the registry row, whether its stats answered,
 * the stats, the health answer of `GET monitoring/health` where the
 * host lists `monitoring`, and the word for a host that did not answer.
 *
 * @param {Object} held - `server`, `stats`, `loaded`, `failed`, `health` and `error`
 * @returns {{ server: Object, success: boolean, data: Object|null, healthData: Object|null, error: string|null }} The result
 */
export const serverResultOf = ({ server, stats, loaded, failed, health, error }) => {
  const success = loaded && !failed && Boolean(stats);
  return {
    server,
    success,
    data: success ? stats : null,
    healthData: health || null,
    error: success ? null : error,
  };
};

const issueCountOf = result => {
  const faults = result.healthData?.faultStatus;
  return (
    (hasHighLoad(result.data) ? 1 : 0) +
    (hasLowFreeMemory(result.data) ? 1 : 0) +
    (result.healthData?.reboot_required ? 1 : 0) +
    (faults?.hasFaults ? faults.faultCount || 0 : 0)
  );
};

/**
 * The infrastructure summary of the dashboard, hyperweaver-ui's: the
 * hosts in all, online and offline, the machines in all, running and
 * stopped, the memory in all and in use, the healthy hosts, the issues,
 * a high load, low memory, a reboot owed and every fault each one, and
 * the hosts that owe a reboot.
 *
 * @param {Array<Object>} serverResults - The results of `serverResultOf`
 * @returns {Object} The summary
 */
export const calculateInfrastructureSummary = serverResults => {
  const summary = {
    totalServers: serverResults.length,
    onlineServers: 0,
    offlineServers: 0,
    totalZones: 0,
    runningZones: 0,
    stoppedZones: 0,
    totalMemory: 0,
    usedMemory: 0,
    healthyServers: 0,
    totalIssues: 0,
    serversRequiringReboot: 0,
  };
  serverResults.forEach(result => {
    if (!result.success || !result.data) {
      summary.offlineServers += 1;
      summary.totalIssues += 1;
      return;
    }
    summary.onlineServers += 1;
    const all = result.data.allmachines || [];
    const running = result.data.runningmachines || [];
    summary.totalZones += all.length;
    summary.runningZones += running.length;
    summary.stoppedZones += all.length - running.length;
    if (result.data.totalmem && result.data.freemem) {
      summary.totalMemory += result.data.totalmem;
      summary.usedMemory += result.data.totalmem - result.data.freemem;
    }
    if (result.healthData?.reboot_required) {
      summary.serversRequiringReboot += 1;
    }
    const issues = issueCountOf(result);
    if (issues > 0) {
      summary.totalIssues += issues;
    } else {
      summary.healthyServers += 1;
    }
  });
  return summary;
};

/**
 * Whether a host's result carries an issue the health dialog lists: a
 * health word other than healthy, a reboot owed or a fault.
 *
 * @param {Object} result - The result of `serverResultOf`
 * @returns {boolean} True for an unhealthy host
 */
export const isUnhealthy = result =>
  getServerHealthStatus(result) !== 'healthy' ||
  Boolean(result.healthData?.reboot_required) ||
  Boolean(result.healthData?.faultStatus?.hasFaults);
