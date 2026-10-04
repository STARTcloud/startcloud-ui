import { featuresOf } from './fleet.js';
import { AGENT_MODE, ok, problem, secondsUp } from './kit.js';
import { linkRows } from './machine-metrics.js';
import { emit } from './stream.js';

const SAMPLE_MS = 5000;
const KEPT = 720;
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const PERCENT = 100;
const MINUTE_MS = 60 * 1000;
const DAY_SAMPLES = (24 * 60 * MINUTE_MS) / SAMPLE_MS;
const SWAP_BYTES = 8 * GIB;
const DEFAULT_CORES = 8;
const DEFAULT_MEMORY = 32 * GIB;
const SILENT_HOSTS = ['2'];
const FAULTED_HOSTS = ['5'];
const LINKS = {
  zoneweaver: [
    { link: 'igb0', class: 'phys', state: 'up', mtu: 1500, over: '--', speed: 1000 },
    { link: 'igb1', class: 'phys', state: 'down', mtu: 1500, over: '--', speed: 0 },
    { link: 'stub0', class: 'etherstub', state: 'unknown', mtu: 9000, over: '--', speed: 0 },
    { link: 'vnic0', class: 'vnic', state: 'up', mtu: 1500, over: 'igb0', speed: 1000 },
    { link: 'vnic1', class: 'vnic', state: 'up', mtu: 9000, over: 'stub0', speed: 0 },
  ],
  hyperweaver: [
    { link: 'eth0', class: 'phys', state: 'up', mtu: 1500 },
    { link: 'lo', class: 'phys', state: 'up', mtu: 65536 },
    { link: 'wlan0', class: 'phys', state: 'down', mtu: 1500 },
  ],
};
const POOLS = [
  { pool: 'rpool', pool_type: 'mirror', alloc: '41.2G', free: '422G', capacity: 8.9 },
  { pool: 'tank', pool_type: 'raidz2', alloc: '5.31T', free: '9.24T', capacity: 36.5 },
];
const DEVICES = [
  { device_name: 'c0t5000C500A1B2C3D4d0', pool: 'rpool' },
  { device_name: 'c0t5000C500A1B2C3D5d0', pool: 'rpool' },
  { device_name: 'c0t5000C500B2C3D4E6d0', pool: 'tank' },
  { device_name: 'c0t5000C500B2C3D4E7d0', pool: 'tank' },
  { device_name: 'c0t5000C500B2C3D4E8d0', pool: 'tank' },
  { device_name: 'c0t5000C500B2C3D4E9d0', pool: 'tank' },
];
const DATASETS = [
  { name: 'rpool/ROOT', pool: 'rpool', type: 'filesystem', used: '6.05G' },
  { name: 'rpool/swap', pool: 'rpool', type: 'volume', used: '8.25G' },
  { name: 'tank/zones', pool: 'tank', type: 'filesystem', used: '4.80T' },
  { name: 'tank/zones/db-1', pool: 'tank', type: 'filesystem', used: '412G' },
  { name: 'tank/zones/db-1/boot', pool: 'tank', type: 'volume', used: '60G' },
  { name: 'tank/backups', pool: 'tank', type: 'filesystem', used: '512G' },
];
const AGENT_TOOLS = {
  vagrant: true,
  virtualbox: true,
  git: true,
  ansible: false,
  rsync: false,
  scp: true,
  builtin_sync: true,
};
const ZONE_TOOLS = {
  ansible: true,
  vagrant: true,
  'isc-dhcp': true,
  zrepl: false,
  dtrace: true,
  git: true,
  mtr: true,
  lsof: true,
  sysstat: true,
  tree: true,
  tmux: true,
  'ooce/library/libarchive': true,
  htop: true,
  ncdu: false,
  zadm: true,
  rsync: true,
  nano: true,
};
const states = new Map();

const iso = at => new Date(at).toISOString();

const round = (value, digits = 2) => Number(value.toFixed(digits));

const clamp = value => Math.min(PERCENT, Math.max(0, value));

const seedOf = host => [...String(host.id)].reduce((sum, mark) => sum + mark.charCodeAt(0), 0);

const shareAt = (at, minutes, phase) =>
  (Math.sin((at / (minutes * MINUTE_MS)) * 2 * Math.PI + phase) + 1) / 2;

const between = (low, high, share) => low + (high - low) * share;

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const silent = host => !AGENT_MODE && SILENT_HOSTS.includes(String(host.id));

const coresOf = host => (Array.isArray(host.facts.cpus) ? host.facts.cpus.length : DEFAULT_CORES);

const memoryOf = host => Number(host.facts.totalmem) || DEFAULT_MEMORY;

const coreRow = ({ zone, index, busy }) => {
  const shares = {
    utilization_pct: round(busy),
    user_pct: round(busy * 0.7),
    system_pct: round(busy * 0.3),
    idle_pct: round(PERCENT - busy),
  };
  return zone ? { cpu_id: `cpu${index}`, iowait_pct: 0, ...shares } : { core: index, ...shares };
};

const cpuRow = (host, at) => {
  const seed = seedOf(host);
  const zone = isZone(host);
  const busy = between(6, 64, shareAt(at, 7, seed));
  const load = between(0.2, 3.4, shareAt(at, 11, seed));
  const delayed = zone || host.facts.platform === 'linux';
  return {
    ...(zone ? {} : { host: host.facts.hostname }),
    cpu_count: coresOf(host),
    cpu_utilization_pct: round(busy),
    user_pct: round(busy * 0.7),
    system_pct: round(busy * 0.3),
    idle_pct: round(PERCENT - busy),
    load_avg_1min: round(load),
    load_avg_5min: round(load * 0.8),
    load_avg_15min: round(load * 0.6),
    processes_running: 2,
    processes_blocked: 0,
    ...(delayed ? { io_delay_pct: round(between(0, 9, shareAt(at, 5, seed))) } : {}),
    per_core_parsed: [...Array(coresOf(host)).keys()].map(index =>
      coreRow({ zone, index, busy: clamp(busy + 22 * (shareAt(at, 3, seed + index) - 0.5)) })
    ),
    scan_timestamp: iso(at),
  };
};

const memoryRow = (host, at) => {
  const seed = seedOf(host);
  const total = memoryOf(host);
  const used = Math.round(total * between(0.42, 0.78, shareAt(at, 13, seed)));
  const swapped = Math.round(SWAP_BYTES * between(0.02, 0.3, shareAt(at, 17, seed)));
  return {
    ...(isZone(host) ? {} : { host: host.facts.hostname }),
    total_memory_bytes: total,
    available_memory_bytes: total - used,
    used_memory_bytes: used,
    free_memory_bytes: total - used,
    memory_utilization_pct: round((used / total) * PERCENT),
    swap_total_bytes: SWAP_BYTES,
    swap_used_bytes: swapped,
    swap_free_bytes: SWAP_BYTES - swapped,
    swap_utilization_pct: round((swapped / SWAP_BYTES) * PERCENT),
    scan_timestamp: iso(at),
  };
};

const linksOf = host => LINKS[host.kind].filter(entry => entry.state === 'up');

const networkRows = (host, at) =>
  linksOf(host).map((entry, index) => {
    const seed = seedOf(host) + index;
    const received = between(0.4, 86, shareAt(at, 4, seed));
    const sent = between(0.2, 31, shareAt(at, 6, seed));
    return {
      ...(isZone(host) ? {} : { host: host.facts.hostname }),
      link: entry.link,
      rx_mbps: round(received),
      tx_mbps: round(sent),
      rx_bps: Math.round((received * 1000000) / 8),
      tx_bps: Math.round((sent * 1000000) / 8),
      time_delta_seconds: SAMPLE_MS / 1000,
      scan_timestamp: iso(at),
    };
  });

const poolRows = (host, at) =>
  POOLS.map((entry, index) => {
    const seed = seedOf(host) + index;
    return {
      pool: entry.pool,
      pool_type: entry.pool_type,
      read_ops: String(Math.round(between(2, 240, shareAt(at, 5, seed)))),
      write_ops: String(Math.round(between(4, 310, shareAt(at, 8, seed)))),
      read_bandwidth_bytes: String(Math.round(between(0.1, 48, shareAt(at, 5, seed)) * MIB)),
      write_bandwidth_bytes: String(Math.round(between(0.3, 72, shareAt(at, 8, seed)) * MIB)),
      scan_timestamp: iso(at),
    };
  });

const diskRows = (host, at) =>
  DEVICES.map((entry, index) => {
    const seed = seedOf(host) + index + POOLS.length;
    return {
      device_name: entry.device_name,
      pool: entry.pool,
      read_ops: String(Math.round(between(1, 90, shareAt(at, 4, seed)))),
      write_ops: String(Math.round(between(2, 120, shareAt(at, 7, seed)))),
      read_bandwidth_bytes: String(Math.round(between(0.05, 22, shareAt(at, 4, seed)) * MIB)),
      write_bandwidth_bytes: String(Math.round(between(0.1, 31, shareAt(at, 7, seed)) * MIB)),
      scan_timestamp: iso(at),
    };
  });

const arcRow = (host, at) => {
  const seed = seedOf(host);
  const target = Math.round(memoryOf(host) * 0.25);
  const size = Math.round(target * between(0.7, 0.98, shareAt(at, 19, seed)));
  const hits = 9000000 + Math.round(at / 1000);
  const misses = 410000 + Math.round(at / 40000);
  return {
    arc_size: String(size),
    arc_target_size: String(target),
    arc_min_size: String(Math.round(target / 8)),
    arc_max_size: String(target),
    mru_size: String(Math.round(size * 0.38)),
    mfu_size: String(Math.round(size * 0.56)),
    hits: String(hits),
    misses: String(misses),
    hit_ratio: round((hits / (hits + misses)) * PERCENT),
    data_demand_efficiency: round(between(91, 99, shareAt(at, 9, seed))),
    data_prefetch_efficiency: round(between(38, 71, shareAt(at, 15, seed))),
    scan_timestamp: iso(at),
  };
};

const sampleOf = (host, at) => ({
  cpu: [cpuRow(host, at)],
  memory: [memoryRow(host, at)],
  usage: networkRows(host, at),
  poolio: offers(host, 'zfs') ? poolRows(host, at) : [],
  arc: offers(host, 'zfs') ? [arcRow(host, at)] : [],
  diskio: offers(host, 'zfs') ? diskRows(host, at) : [],
});

const kept = (rows, entities) => rows.slice(-KEPT * Math.max(1, entities));

const added = (state, sample) => ({
  cpu: kept([...state.cpu, ...sample.cpu], 1),
  memory: kept([...state.memory, ...sample.memory], 1),
  usage: kept([...state.usage, ...sample.usage], sample.usage.length),
  poolio: kept([...state.poolio, ...sample.poolio], sample.poolio.length),
  arc: kept([...state.arc, ...sample.arc], 1),
  diskio: kept([...state.diskio, ...sample.diskio], sample.diskio.length),
});

const seeded = host => {
  const last = Date.now();
  const empty = { cpu: [], memory: [], usage: [], poolio: [], arc: [], diskio: [] };
  return [...Array(KEPT).keys()]
    .map(index => last - (KEPT - 1 - index) * SAMPLE_MS)
    .reduce((state, at) => added(state, sampleOf(host, at)), empty);
};

const stateOf = host => {
  if (!states.has(host.id)) {
    states.set(host.id, seeded(host));
  }
  return states.get(host.id);
};

const thinned = (rows, limit) => {
  if (rows.length <= limit) {
    return rows;
  }
  const step = Math.max(1, Math.floor(rows.length / limit));
  return [...Array(limit).keys()].map(index => rows[Math.min(index * step, rows.length - 1)]);
};

const perEntity = (rows, entity, pick) => {
  const names = [...new Set(rows.map(row => row[entity]))].sort();
  return names.flatMap(name => pick(rows.filter(row => row[entity] === name)));
};

const zoneHistory = ({ rows, entity, since, limit }) => {
  const pick = since ? list => thinned(list, limit) : list => list.slice(-1);
  return entity ? perEntity(rows, entity, pick) : pick(rows);
};

const agentHistory = ({ rows, limit }) => [...rows].reverse().slice(0, limit);

const zoneStrategy = (since, entity) => {
  if (!since) {
    return entity ? `latest-per-${entity}-fast` : 'latest-system-wide';
  }
  return 'javascript-time-sampling';
};

const historyOf = ({ host, member, entity, since, limit }) => {
  if (silent(host)) {
    return { rows: sampleOf(host, Date.now())[member], strategy: 'realtime', applied: false };
  }
  const held = stateOf(host)[member];
  const rows = since ? held.filter(row => Date.parse(row.scan_timestamp) >= since) : held;
  return isZone(host)
    ? {
        rows: zoneHistory({ rows, entity, since, limit }),
        strategy: zoneStrategy(since, entity),
        applied: true,
      }
    : { rows: agentHistory({ rows, limit }), strategy: 'stored', applied: false };
};

const SAMPLE_EVENTS = {
  cpu: 'cpu-sample',
  memory: 'memory-sample',
  usage: 'network-sample',
  poolio: 'pool-io-sample',
  arc: 'arc-sample',
  diskio: 'disk-io-sample',
};

const sampled = (host, member) => {
  if (silent(host)) {
    return;
  }
  const rows = sampleOf(host, Date.now())[member];
  if (rows.length === 0) {
    return;
  }
  const state = stateOf(host);
  states.set(host.id, { ...state, [member]: kept([...state[member], ...rows], rows.length) });
  emit({ host, topic: 'monitoring', event: SAMPLE_EVENTS[member], data: { [member]: rows } });
};

const series =
  (member, entity = '') =>
  ctx => {
    const { host, url } = ctx;
    sampled(host, member);
    const since = Date.parse(url.searchParams.get('since') || '') || 0;
    const limit = Number(url.searchParams.get('limit')) || 100;
    const held = historyOf({ host, member, entity, since, limit });
    const { strategy, applied } = held;
    const rows =
      entity === 'link' ? linkRows({ host, url, rows: held.rows, since, limit }) : held.rows;
    const newest = isZone(host) ? rows[rows.length - 1] : rows[0];
    return ok({
      [member]: rows,
      totalCount: rows.length,
      returnedCount: rows.length,
      sampling: { applied, strategy, samplesReturned: rows.length },
      queryTime: 1,
      ...(entity ? {} : { latest: newest || null }),
    });
  };

const stored = host => !silent(host);

const serviceOf = host =>
  isZone(host)
    ? {
        isRunning: true,
        isInitialized: true,
        discoveryMode: 'direct',
        config: {
          enabled: true,
          intervals: { network_config: 60, network_usage: 20, storage: 300, system_metrics: 5 },
          retention: { network_usage: 7, storage: 30, system_metrics: 7, tasks: 30 },
        },
        stats: { systemMetricsRuns: secondsUp(), totalErrors: 0, uptime: secondsUp() },
        note: 'Collections run directly on their timers; progress via host_info last_*_scan timestamps',
      }
    : {
        isRunning: true,
        isInitialized: true,
        config: {
          storage_enabled: stored(host),
          collection_interval: SAMPLE_MS / 1000,
          retention_days: 7,
        },
        stats: stored(host) ? { collections: secondsUp(), last_collection: iso(Date.now()) } : {},
        note: stored(host)
          ? 'Storage mode: a background collector writes time series into per-datatype database files.'
          : 'Realtime mode: every request samples the OS live; enable monitoring.storage_enabled for stored history.',
      };

const zoneHealth = host => {
  const faulted = FAULTED_HOSTS.includes(String(host.id));
  return {
    status: faulted ? 'degraded' : 'healthy',
    lastUpdate: iso(Date.now()),
    networkErrors: 0,
    storageErrors: 0,
    faultStatus: {
      hasFaults: faulted,
      faultCount: faulted ? 1 : 0,
      severityLevels: faulted ? ['Minor'] : [],
      lastCheck: iso(Date.now()),
      faults: [],
      error: null,
    },
    recentActivity: { network: true, storage: true },
    uptime: Number(host.facts.uptime) + secondsUp(),
    reboot_required: false,
    reboot_info: null,
    service: serviceOf(host),
  };
};

const agentHealth = host => ({
  status: 'healthy',
  uptime: Number(host.facts.uptime) + secondsUp(),
  version: '1.2.0',
  service: { storage_enabled: stored(host), collector: stored(host), stats: {} },
  lastUpdate: stored(host) ? iso(Date.now()) : null,
});

const health = ctx => ok(isZone(ctx.host) ? zoneHealth(ctx.host) : agentHealth(ctx.host));

const newestOf = rows => (rows.length > 0 ? rows[rows.length - 1].scan_timestamp : null);

const zoneSummary = host => {
  const state = stateOf(host);
  const usageAt = newestOf(state.usage);
  const scanned = iso(Date.now());
  return {
    host: host.facts.hostname,
    summary: {
      networkAccountingEnabled: true,
      networkErrors: 0,
      storageErrors: 0,
      platform: host.facts.platform,
      uptime: Number(host.facts.uptime) + secondsUp(),
    },
    lastCollected: { networkInterfaces: scanned, networkUsage: usageAt, storage: scanned },
    recordCounts: {
      networkInterfaces: LINKS.zoneweaver.length * 2,
      networkUsage: Math.min(DAY_SAMPLES, state.usage.length),
      ipAddresses: 12,
      routes: 0,
      zfsPools: POOLS.length * 2,
      zfsDatasets: DATASETS.length * 2,
      disks: 8,
    },
    latestData: {
      networkInterfaces: scanned,
      networkUsage: usageAt,
      ipAddresses: scanned,
      zfsPools: scanned,
      zfsDatasets: scanned,
      disks: scanned,
    },
    queryTime: '12ms',
  };
};

const agentSummary = host => {
  const state = stored(host) ? stateOf(host) : { cpu: [], memory: [], usage: [] };
  const counts = {
    cpu_samples: state.cpu.length,
    memory_samples: state.memory.length,
    network_samples: state.usage.length,
  };
  const latest = {
    cpu_samples: newestOf(state.cpu),
    memory_samples: newestOf(state.memory),
    network_samples: newestOf(state.usage),
  };
  return {
    host: host.facts.hostname,
    summary: { storage_enabled: stored(host), collector: stored(host) },
    recordCounts: stored(host) ? counts : {},
    latestData: stored(host) ? latest : {},
    lastCollected: stored(host) ? newestOf(state.cpu) : null,
    queryTime: 1,
  };
};

const summary = ctx => ok(isZone(ctx.host) ? zoneSummary(ctx.host) : agentSummary(ctx.host));

const scannedLinks = at =>
  LINKS.zoneweaver.map((entry, index) => ({
    id: index + 1 + (at > 0 ? LINKS.zoneweaver.length : 0),
    ...entry,
    duplex: entry.speed > 0 ? 'full' : 'unknown',
    zone: entry.class === 'vnic' ? 'db-1' : '--',
    scan_timestamp: iso(Date.now() - (at > 0 ? 0 : MINUTE_MS)),
  }));

const agentLinks = host =>
  LINKS.hyperweaver.map((entry, index) => ({
    ...entry,
    macaddress: entry.link === 'lo' ? '' : `08:00:27:4f:${seedOf(host) % 89}:0${index}`,
    addresses: entry.state === 'up' ? [`10.0.${seedOf(host) % 200}.${index + 10}/24`] : [],
  }));

const interfaces = ctx => {
  const rows = isZone(ctx.host) ? [...scannedLinks(1), ...scannedLinks(0)] : agentLinks(ctx.host);
  return ok({
    interfaces: rows,
    totalCount: rows.length,
    pagination: { limit: 100, offset: 0, hasMore: false },
  });
};

const twice = rows =>
  [0, MINUTE_MS * 5].flatMap((age, scan) =>
    rows.map((row, index) => ({
      id: scan * rows.length + index + 1,
      ...row,
      scan_timestamp: iso(Date.now() - age),
    }))
  );

const pools = ctx => {
  const rows = twice(
    POOLS.map(entry => ({
      host: ctx.host.facts.hostname,
      ...entry,
      health: 'ONLINE',
      status: 'ok',
      errors: 'No known data errors',
      scan_type: 'iostat',
    }))
  );
  return ok({ pools: rows, totalCount: rows.length });
};

const datasets = ctx => {
  const rows = twice(
    DATASETS.map(entry => ({
      host: ctx.host.facts.hostname,
      ...entry,
      compression: 'lz4',
      mounted: entry.type === 'filesystem' ? 'yes' : '-',
    }))
  );
  return ok({
    datasets: rows,
    totalCount: rows.length,
    pagination: { limit: 100, offset: 0, hasMore: false },
  });
};

const countOf = (host, status) => host.tasks.filter(task => task.status === status).length;

const erroredOf = host =>
  isZone(host) ? { completed_with_errors_tasks: countOf(host, 'completed_with_errors') } : {};

const taskStats = ctx => {
  const { host } = ctx;
  return ok({
    pending_tasks: countOf(host, 'pending'),
    running_tasks: countOf(host, 'running'),
    completed_tasks: countOf(host, 'completed'),
    ...erroredOf(host),
    failed_tasks: countOf(host, 'failed'),
    cancelled_tasks: countOf(host, 'cancelled'),
    max_concurrent_tasks: 5,
    task_processor_running: true,
  });
};

const swapSummary = ctx => {
  const { host } = ctx;
  const sample = memoryRow(host, Date.now());
  const path = isZone(host) ? '/dev/zvol/dsk/rpool/swap' : 'swap';
  return ok({
    host: host.facts.hostname,
    totalSwapBytes: sample.swap_total_bytes,
    usedSwapBytes: sample.swap_used_bytes,
    freeSwapBytes: sample.swap_free_bytes,
    overallUtilization: sample.swap_utilization_pct,
    swapAreaCount: 1,
    swapAreas: [
      {
        path,
        pool: isZone(host) ? 'rpool' : null,
        sizeBytes: sample.swap_total_bytes,
        usedBytes: sample.swap_used_bytes,
        utilization: sample.swap_utilization_pct,
      },
    ],
    poolDistribution: {},
    recommendations: [],
    lastScanned: sample.scan_timestamp,
    memoryStatsReference: null,
  });
};

const toolsOf = host => {
  if (isZone(host)) {
    return ZONE_TOOLS;
  }
  return host.facts.platform === 'darwin' ? { ...AGENT_TOOLS, utm: true } : AGENT_TOOLS;
};

const tools = ctx => ok(toolsOf(ctx.host));

const service = ctx => ok(serviceOf(ctx.host));

const behind = (tokens, handler) => ctx =>
  tokens.every(token => offers(ctx.host, token)) ? handler(ctx) : problem(404, 'Not Found');

/**
 * What the host page's Overview and its charts read, each route answered
 * as the agent of the host's kind answers it and 404 on a host that does
 * not list its tokens: the monitoring status, health and summary, the
 * interfaces, which the zoneweaver kind answers as the rows of two scans,
 * and the CPU, memory and network series behind `monitoring`; the pools,
 * the datasets, the pool I/O and the ARC behind `monitoring` and `zfs`;
 * the task queue's counts behind `tasks`, the swap summary behind `swap`
 * and the provisioning tools behind `provisioning`. Every series read of
 * a host that keeps history first takes one sample of its member, keeps
 * it and sends it on the `monitoring` topic as `cpu-sample`,
 * `memory-sample`, `network-sample`, `pool-io-sample`, `arc-sample` or
 * `disk-io-sample`. A series read with
 * `since` answers the history from that instant, thinned to `limit`
 * samples an entity and oldest first on the zoneweaver kind, the newest
 * `limit` rows newest first on the hyperweaver kind, and the one sample
 * taken now, `realtime`, on a host that keeps none; the network series
 * read with `link` answers that link's rows alone. Mounted before the
 * task routes, so `tasks/stats` is not read as a task's id.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountMonitoring = agentRoute => {
  const monitoring = ['monitoring'];
  const zfs = ['monitoring', 'zfs'];
  agentRoute('GET', 'monitoring/status', behind(monitoring, service));
  agentRoute('GET', 'monitoring/health', behind(monitoring, health));
  agentRoute('GET', 'monitoring/summary', behind(monitoring, summary));
  agentRoute('GET', 'monitoring/network/interfaces', behind(monitoring, interfaces));
  agentRoute('GET', 'monitoring/network/usage', behind(monitoring, series('usage', 'link')));
  agentRoute('GET', 'monitoring/system/cpu', behind(monitoring, series('cpu')));
  agentRoute('GET', 'monitoring/system/memory', behind(monitoring, series('memory')));
  agentRoute('GET', 'monitoring/storage/pools', behind(zfs, pools));
  agentRoute('GET', 'monitoring/storage/datasets', behind(zfs, datasets));
  agentRoute('GET', 'monitoring/storage/pool-io', behind(zfs, series('poolio', 'pool')));
  agentRoute('GET', 'monitoring/storage/arc', behind(zfs, series('arc')));
  agentRoute('GET', 'monitoring/storage/disk-io', behind(zfs, series('diskio', 'device_name')));
  agentRoute('GET', 'tasks/stats', behind(['tasks'], taskStats));
  agentRoute('GET', 'system/swap/summary', behind(['swap'], swapSummary));
  agentRoute('GET', 'provisioning/status', behind(['provisioning'], tools));
};
