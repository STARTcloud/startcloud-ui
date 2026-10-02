import { featuresOf, machineOf } from './fleet.js';
import { ok, problem } from './kit.js';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const USAGE_MS = 5000;
const DISK_MS = 10000;
const MINUTE_MS = 60 * 1000;
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 200;
const VNIC = /^vnice3_(?<index>\d{4})_0$/u;
const VOLUMES = [
  { pool: 'rpool', device: 'boot' },
  { pool: 'rpool', device: 'data' },
];

const previous = new Map();

const iso = at => new Date(at).toISOString();

const round = (value, digits = 2) => Number(value.toFixed(digits));

const seedOf = text => [...String(text)].reduce((sum, mark) => sum + mark.charCodeAt(0), 0);

const shareAt = (at, minutes, phase) =>
  (Math.sin((at / (minutes * MINUTE_MS)) * 2 * Math.PI + phase) + 1) / 2;

const between = (low, high, share) => low + (high - low) * share;

const limitOf = url =>
  Math.min(Math.max(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);

const sinceOf = url => Date.parse(url.searchParams.get('since') || '') || 0;

const instants = ({ since, step, limit }) => {
  const last = Math.floor(Date.now() / step) * step;
  const first = since ? Math.max(since, last - (limit - 1) * step) : last;
  const count = Math.max(1, Math.floor((last - first) / step) + 1);
  return [...Array(Math.min(count, limit)).keys()].map(index => last - index * step);
};

const behind = (kind, handler) => ctx =>
  ctx.host.kind === kind && featuresOf(ctx.host).includes('monitoring')
    ? handler(ctx)
    : problem(404, 'Not Found');

const zonesOf = (host, url) => {
  const zone = url.searchParams.get('zone') || '';
  const rows = zone ? [machineOf(host, zone)].filter(Boolean) : host.machines;
  return rows.filter(row => row.status === 'running');
};

const usageRow = (host, row, at) => {
  const seed = seedOf(row.name);
  const busy = between(0.2, 9, shareAt(at, 6, seed));
  return {
    id: Math.floor(at / USAGE_MS) + seed,
    host: host.facts.hostname,
    zone_name: row.name,
    cpu_used: round(busy / 50, 3),
    cpu_pct: round(busy),
    rss_bytes: Math.round(between(1.5, 3.5, shareAt(at, 14, seed)) * GIB),
    swap_bytes: Math.round(4.5 * GIB),
    scan_timestamp: iso(at),
    createdAt: iso(at),
    updatedAt: iso(at),
  };
};

const counted = (member, rows) =>
  ok({ [member]: rows, totalCount: rows.length, returnedCount: rows.length });

const zoneUsage = ctx => {
  const { host, url } = ctx;
  const limit = limitOf(url);
  const zones = zonesOf(host, url);
  const rows = instants({ since: sinceOf(url), step: USAGE_MS, limit })
    .flatMap(at => zones.map(row => usageRow(host, row, at)))
    .slice(0, limit);
  return counted('usage', rows);
};

const diskRow = ({ host, row, volume, at }) => {
  const seed = seedOf(`${row.name}${volume.device}`);
  const seconds = DISK_MS / 1000;
  const read = between(0.05, 14, shareAt(at, 5, seed)) * MIB;
  const written = between(0.1, 22, shareAt(at, 8, seed)) * MIB;
  return {
    id: Math.floor(at / DISK_MS) + seed,
    host: host.facts.hostname,
    zone_name: row.name,
    dataset: `${volume.pool}/zones/${row.name}/${volume.device}`,
    pool: volume.pool,
    device: volume.device,
    read_ops: Math.round((read / 8192) * seconds),
    read_bytes: Math.round(read * seconds),
    write_ops: Math.round((written / 8192) * seconds),
    write_bytes: Math.round(written * seconds),
    read_bps: round(read),
    write_bps: round(written),
    read_iops: round(read / 8192),
    write_iops: round(written / 8192),
    interval_seconds: seconds,
    scan_timestamp: iso(at),
    createdAt: iso(at),
    updatedAt: iso(at),
  };
};

const zoneDiskIo = ctx => {
  const { host, url } = ctx;
  const limit = limitOf(url);
  const zones = zonesOf(host, url);
  const rows = instants({ since: sinceOf(url), step: DISK_MS, limit })
    .flatMap(at => zones.flatMap(row => VOLUMES.map(volume => diskRow({ host, row, volume, at }))))
    .slice(0, limit);
  return counted('diskio', rows);
};

const rateOf = (now, before, seconds) =>
  before === undefined || seconds <= 0 ? null : Math.round((now - before) / seconds);

const totalsOf = (row, at) => {
  const seed = seedOf(row.name);
  const seconds = at / 1000;
  return {
    rx: Math.round(seconds * between(20, 900, shareAt(at, 4, seed)) * 1024),
    tx: Math.round(seconds * between(10, 400, shareAt(at, 6, seed)) * 1024),
    read: Math.round(seconds * between(5, 1200, shareAt(at, 5, seed)) * 1024),
    written: Math.round(seconds * between(5, 1800, shareAt(at, 8, seed)) * 1024),
  };
};

const ratesOf = (key, totals, at) => {
  const held = previous.get(key);
  previous.set(key, { at, totals });
  const seconds = held ? (at - held.at) / 1000 : 0;
  return {
    rx: rateOf(totals.rx, held?.totals.rx, seconds),
    tx: rateOf(totals.tx, held?.totals.tx, seconds),
    read: rateOf(totals.read, held?.totals.read, seconds),
    written: rateOf(totals.written, held?.totals.written, seconds),
  };
};

const usageSample = (host, row, at) => {
  const seed = seedOf(row.name);
  const guest = round(between(0.5, 22, shareAt(at, 7, seed)));
  const vmm = round(between(0.1, 2, shareAt(at, 3, seed)));
  const additions = seed % 3 !== 0;
  const totals = totalsOf(row, at);
  const rates = ratesOf(`${host.id}|${row.name}`, totals, at);
  const free = Math.round(between(2, 6, shareAt(at, 12, seed)) * GIB);
  return {
    host: host.facts.hostname,
    machine_name: row.name,
    cpu_guest_pct: guest,
    cpu_vmm_pct: vmm,
    cpu_pct: round(guest + vmm),
    rss_bytes: additions ? 8 * GIB - free : null,
    ram_total_bytes: additions ? 8 * GIB : null,
    ram_free_bytes: additions ? free : null,
    guest_additions: additions,
    net_rx_bps: rates.rx,
    net_tx_bps: rates.tx,
    net_rx_total_bytes: totals.rx,
    net_tx_total_bytes: totals.tx,
    disk_read_bps: rates.read,
    disk_write_bps: rates.written,
    disk_read_total_bytes: totals.read,
    disk_write_total_bytes: totals.written,
    nics: [
      {
        adapter: 2,
        device: 'E1000#1',
        rx_bps: rates.rx,
        tx_bps: rates.tx,
        rx_total_bytes: totals.rx,
        tx_total_bytes: totals.tx,
      },
    ],
    scan_timestamp: iso(at),
  };
};

const machineUsage = ctx => {
  const { host, url } = ctx;
  const wanted = url.searchParams.get('machine_name') || '';
  const at = Date.now();
  const rows = host.machines
    .filter(row => row.status === 'running' && row.hypervisor !== 'utm')
    .filter(row => !wanted || row.name === wanted)
    .slice(0, limitOf(url))
    .map(row => usageSample(host, row, at));
  return ok({
    usage: rows,
    totalCount: rows.length,
    returnedCount: rows.length,
    sampling: { applied: false, strategy: 'realtime', samplesReturned: rows.length },
  });
};

const vnicRow = (link, at) => {
  const seed = seedOf(link);
  const received = between(0.1, 24, shareAt(at, 4, seed));
  const sent = between(0.05, 9, shareAt(at, 6, seed));
  return {
    link,
    rx_mbps: received.toFixed(2),
    tx_mbps: sent.toFixed(2),
    rx_bps: String(Math.round((received * 1000000) / 8)),
    tx_bps: String(Math.round((sent * 1000000) / 8)),
    interface_class: 'vnic',
    time_delta_seconds: (USAGE_MS / 1000).toFixed(2),
    scan_timestamp: iso(at),
  };
};

/**
 * The rows of `GET monitoring/network/usage` narrowed to the link the
 * request names, as the agents narrow them: the rows of that link among
 * the ones the collector holds, and for the link of a running zone,
 * which the collector does not sample, its own rows from `since` on,
 * oldest first, the rates text as zoneweaver-agent's decimals are on the
 * wire; every row while the request names no link.
 *
 * @param {Object} options - The host, the request's URL, the rows held, `since` and `limit`
 * @returns {Array<Object>} The rows
 */
export const linkRows = ({ host, url, rows, since, limit }) => {
  const link = url.searchParams.get('link') || '';
  if (!link) {
    return rows;
  }
  const own = rows.filter(row => row.link === link);
  const match = VNIC.exec(link);
  const machine = match ? host.machines[Number(match.groups.index) - 1] : null;
  if (own.length > 0 || machine?.status !== 'running') {
    return own;
  }
  return instants({ since, step: USAGE_MS, limit })
    .reverse()
    .map(at => vnicRow(link, at));
};

/**
 * The reads of the machine page's charts, each on the one agent that
 * answers it and behind `monitoring`, 404 everywhere else. On the
 * zoneweaver kind `GET monitoring/zones/usage`, one row a running zone
 * every five seconds, and `GET monitoring/zones/diskio`, one row a
 * volume of a running zone every ten, its boot and its data volume,
 * both newest first, from `since` on and `limit`
 * rows at most, the newest instant alone without `since`. On the
 * hyperweaver kind `GET monitoring/machines/usage`, the one sample taken
 * at the read of every running VirtualBox machine, `realtime`, a
 * machine on UTM and one that is off absent, the rates null on the first
 * read of a machine, and the memory null with `guest_additions` false
 * for a guest without the additions. The usage of one link is
 * `GET monitoring/network/usage` with `link`, narrowed by `linkRows`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountMachineMetrics = agentRoute => {
  agentRoute('GET', 'monitoring/zones/usage', behind('zoneweaver', zoneUsage));
  agentRoute('GET', 'monitoring/zones/diskio', behind('zoneweaver', zoneDiskIo));
  agentRoute('GET', 'monitoring/machines/usage', behind('hyperweaver', machineUsage));
};
