const DAY = 86400;
const HOUR = 3600;
const MINUTE = 60;
const PERCENT = 100;
const SOFT_TOOLS = ['rsync', 'scp'];
const BUILTIN_SYNC = 'builtin_sync';
const HEALTH_TONES = { healthy: 'success', warning: 'warning' };

const isNumber = value => value !== null && value !== undefined && Number.isFinite(Number(value));

const clamp = value => Math.min(PERCENT, Math.max(0, value));

/**
 * A host's uptime in seconds as days, hours and minutes, null for an
 * uptime the agent did not answer.
 *
 * @param {number} seconds - The uptime in seconds
 * @returns {{ days: number, hours: number, minutes: number }|null} The parts
 */
export const uptimeParts = seconds => {
  if (!isNumber(seconds) || Number(seconds) <= 0) {
    return null;
  }
  const whole = Math.floor(Number(seconds));
  return {
    days: Math.floor(whole / DAY),
    hours: Math.floor((whole % DAY) / HOUR),
    minutes: Math.floor((whole % HOUR) / MINUTE),
  };
};

/**
 * How many logical processors a host's stats name, zero while they name
 * none.
 *
 * @param {Object|null} stats - The host's stats
 * @returns {number} The count
 */
export const coreCount = stats => (Array.isArray(stats?.cpus) ? stats.cpus.length : 0);

/**
 * The cumulative processor time a host's stats carry, idle and in all,
 * summed over its `cpus`: the user, nice, system and idle times alone,
 * because on illumos the `irq` time overlaps them and counting it made
 * hyperweaver-ui read a host many times busier than it was; null for
 * stats that carry no `cpus`.
 *
 * @param {Object|null} stats - The host's stats
 * @returns {{ idle: number, total: number }|null} The times
 */
export const cpuTotals = stats => {
  if (coreCount(stats) === 0) {
    return null;
  }
  return stats.cpus.reduce(
    (sum, cpu) => {
      const times = cpu.times || {};
      const idle = times.idle || 0;
      const busy = (times.user || 0) + (times.nice || 0) + (times.sys || 0);
      return { idle: sum.idle + idle, total: sum.total + busy + idle };
    },
    { idle: 0, total: 0 }
  );
};

/**
 * The share of the time between two readings of a host's processor times
 * that was not idle, in percent; null while there is no earlier reading
 * or the counters did not move forward, an agent that restarted.
 *
 * @param {{ idle: number, total: number }|null} previous - The earlier times
 * @param {{ idle: number, total: number }|null} next - The later times
 * @returns {number|null} The percent
 */
export const cpuUsageBetween = (previous, next) => {
  if (!previous || !next || next.total <= previous.total || next.idle < previous.idle) {
    return null;
  }
  const span = next.total - previous.total;
  return clamp(((span - (next.idle - previous.idle)) / span) * PERCENT);
};

export const NO_CPU = { id: '', stats: null, totals: null, percent: null };

/**
 * The processor use held of one host after one more reading of its
 * stats: the share between the times held and the reading's, the share
 * held before it kept while the counters did not move, a reading pushed
 * for a machine that started carrying the same times; what is held of
 * another host is dropped first, so two hosts' counters are never
 * compared.
 *
 * @param {{ id: string, stats: Object|null, totals: Object|null, percent: number|null }} held - What is held
 * @param {string} id - The host the reading is of
 * @param {Object|null} stats - The reading
 * @returns {{ id: string, stats: Object|null, totals: Object|null, percent: number|null }} What is held after it
 */
export const cpuStep = (held, id, stats) => {
  const base = held.id === id ? held : NO_CPU;
  const totals = cpuTotals(stats);
  return {
    id,
    stats,
    totals: totals || base.totals,
    percent: cpuUsageBetween(base.totals, totals) ?? base.percent,
  };
};

/**
 * The processor use the Overview draws: the newest CPU sample's own
 * `cpu_utilization_pct` where the host's series holds one, and the share
 * held between two readings of the host's stats otherwise; null while
 * neither can say.
 *
 * @param {Object} options - `sample`, the newest CPU sample, and `held`, the share `cpuStep` holds
 * @returns {number|null} The percent
 */
export const cpuUsage = ({ sample, held }) =>
  isNumber(sample?.cpu_utilization_pct) ? clamp(Number(sample.cpu_utilization_pct)) : held;

/**
 * The memory the Overview draws, in bytes and percent: the newest memory
 * sample's total and used where the host's series holds one, the stats'
 * `totalmem` less `freemem` otherwise; null while neither names a total.
 *
 * @param {Object} options - `stats`, the host's stats, and `sample`, the newest memory sample
 * @returns {{ total: number, used: number, percent: number }|null} The use
 */
export const memoryUsage = ({ stats, sample }) => {
  const sampled = isNumber(sample?.total_memory_bytes) && isNumber(sample?.used_memory_bytes);
  const total = Number(sampled ? sample.total_memory_bytes : stats?.totalmem);
  const used = sampled ? Number(sample.used_memory_bytes) : total - Number(stats?.freemem);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(used)) {
    return null;
  }
  return { total, used, percent: clamp((used / total) * PERCENT) };
};

/**
 * The share of a host's memory its ZFS ARC holds, in percent of the
 * total: the ARC is memory already counted as used, so its share is held
 * to the used amount, the two samples never taken at the same instant.
 *
 * @param {{ total: number, used: number }|null} memory - The memory use
 * @param {number} arcBytes - The ARC's size in bytes
 * @returns {number} The percent, zero while there is no ARC to draw
 */
export const arcShare = (memory, arcBytes) =>
  memory && isNumber(arcBytes) && Number(arcBytes) > 0
    ? clamp((Math.min(Number(arcBytes), memory.used) / memory.total) * PERCENT)
    : 0;

const swapOf = ({ total, used, free, percent }) =>
  isNumber(total) && Number(total) > 0
    ? {
        total: Number(total),
        used: Number(used) || 0,
        free: Number(free) || 0,
        percent: clamp(Number(percent) || 0),
      }
    : null;

/**
 * The swap the Overview draws, in bytes and percent: the newest memory
 * sample's swap members where the host's series holds one that names a
 * swap total, the swap summary's otherwise; null for a host without
 * swap, which draws no swap row.
 *
 * @param {Object} options - `summary`, the answer of `system/swap/summary`, and `sample`, the newest memory sample
 * @returns {{ total: number, used: number, free: number, percent: number }|null} The use
 */
export const swapUsage = ({ summary, sample }) =>
  swapOf({
    total: sample?.swap_total_bytes,
    used: sample?.swap_used_bytes,
    free: sample?.swap_free_bytes,
    percent: sample?.swap_utilization_pct,
  }) ||
  swapOf({
    total: summary?.totalSwapBytes,
    used: summary?.usedSwapBytes,
    free: summary?.freeSwapBytes,
    percent: summary?.overallUtilization,
  });

const instantOf = row => new Date(row?.scan_timestamp || 0).getTime() || 0;

/**
 * The newest row of each entity of a list an agent keeps a history of,
 * one interface, pool or dataset drawn once however many scans the
 * answer holds, in the order of their names.
 *
 * @param {Array<Object>} rows - The rows answered
 * @param {Function} nameOf - Answers the entity a row belongs to
 * @returns {Array<Object>} One row an entity
 */
export const latestPer = (rows, nameOf) => {
  const newest = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const name = String(nameOf(row) ?? '');
    const held = newest.get(name);
    if (name && (!held || instantOf(row) > instantOf(held))) {
      newest.set(name, row);
    }
  });
  return [...newest.keys()].sort().map(name => newest.get(name));
};

/**
 * The counts hyperweaver-ui's network summary drew of a host's
 * interfaces: all of them, the physical ones, class `phys`, the virtual
 * ones, class `vnic`, and the ones up and down.
 *
 * @param {Array<Object>} interfaces - One row an interface
 * @returns {{ total: number, physical: number, virtual: number, up: number, down: number }} The counts
 */
export const interfaceCounts = interfaces => ({
  total: interfaces.length,
  physical: interfaces.filter(row => row.class === 'phys').length,
  virtual: interfaces.filter(row => row.class === 'vnic').length,
  up: interfaces.filter(row => row.state === 'up').length,
  down: interfaces.filter(row => row.state === 'down').length,
});

/**
 * The tone a monitoring health word is drawn in, hyperweaver-ui's:
 * success for `healthy`, warning for `warning`, danger for every other
 * word, a service that is degraded or stopped or a host that faulted.
 *
 * @param {string} status - The health answer's `status`
 * @returns {string} `success`, `warning` or `danger`
 */
export const healthTone = status => HEALTH_TONES[status] || 'danger';

/**
 * The counts the task queue row draws, read by the names both agents
 * answer `tasks/stats` in.
 *
 * @param {Object|null} stats - The answer of `tasks/stats`
 * @returns {{ pending: number, running: number, completed: number, failed: number }} The counts
 */
export const taskCounts = stats => ({
  pending: Number(stats?.pending_tasks) || 0,
  running: Number(stats?.running_tasks) || 0,
  completed: Number(stats?.completed_tasks) || 0,
  failed: Number(stats?.failed_tasks) || 0,
});

/**
 * The provisioning tools a host answers, one row a tool, `builtin_sync`
 * read and left out: a tool that is missing is `soft` while it is rsync
 * or scp and the agent's built-in transport stands in for it, and hard
 * otherwise, the ones provisioning fails without.
 *
 * @param {Object|null} tools - The answer of `provisioning/status`, tool to installed
 * @returns {{ rows: Array<{ name: string, installed: boolean, soft: boolean }>, missing: number }} The rows and the count of hard tools missing
 */
export const toolRows = tools => {
  const builtin = tools?.[BUILTIN_SYNC] === true;
  const rows = Object.entries(tools || {})
    .filter(([name, installed]) => typeof installed === 'boolean' && name !== BUILTIN_SYNC)
    .map(([name, installed]) => ({
      name,
      installed,
      soft: !installed && builtin && SOFT_TOOLS.includes(name),
    }));
  return { rows, missing: rows.filter(row => !row.installed && !row.soft).length };
};

/**
 * A table's name as a person reads it, the agent's own key with its
 * camel case and its underscores opened into words.
 *
 * @param {string} key - The table's key, e.g. `networkUsage` or `cpu_samples`
 * @returns {string} The words
 */
export const tableLabel = key =>
  String(key)
    .replace(/(?<lower>[a-z])(?<upper>[A-Z])/gu, '$<lower> $<upper>')
    .replace(/_/gu, ' ');

/**
 * The tables of a monitoring summary that hold records, one row a table
 * with its count and the instant of its newest sample, none for an agent
 * that keeps no history.
 *
 * @param {Object|null} summary - The answer of `monitoring/summary`
 * @returns {Array<{ key: string, label: string, records: number, latest: string }>} The rows
 */
export const summaryRows = summary =>
  Object.entries(summary?.recordCounts || {})
    .filter(([, records]) => Number(records) > 0)
    .map(([key, records]) => ({
      key,
      label: tableLabel(key),
      records: Number(records),
      latest: summary?.latestData?.[key] || '',
    }));

/**
 * What the monitoring service keeps, read from its status: the
 * collection interval in seconds, `config.collection_interval`, the days
 * its samples are kept, `config.retention_days`, and the live interval in
 * seconds, `config.live_interval` or the collection interval while the
 * status names no live interval; zero for a member the agent does not
 * answer as one number.
 *
 * @param {Object|null} status - The answer of `monitoring/status`
 * @returns {{ interval: number, retention: number, live: number }} The three numbers
 */
export const collectionOf = status => {
  const interval = Number(status?.config?.collection_interval) || 0;
  return {
    interval,
    retention: Number(status?.config?.retention_days) || 0,
    live: Number(status?.config?.live_interval) || interval,
  };
};
