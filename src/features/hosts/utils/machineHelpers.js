import { humanSize } from './zfsUtils';

/**
 * A media entry with the controller and the port of its row added where
 * the row names them.
 *
 * @param {Object} entry - The disk or CD-ROM entry
 * @param {Object} row - The editor's row
 * @returns {Object} The entry
 */
export const withAddressing = (entry, row) => {
  if (row.controller?.trim()) {
    entry.controller = row.controller.trim();
  }
  if (row.port !== undefined && row.port !== '') {
    entry.port = Number(row.port);
  }
  return entry;
};

/**
 * The `add_cdroms` entry of one row, a cached ISO by name or a path on the
 * host, falsy while the row names neither.
 *
 * @param {Object} row - The editor's row
 * @returns {Object|string} The entry
 */
export const cdromEntry = row => {
  const iso = (row.iso || '').trim();
  const path = (row.path || '').trim();
  return row.source === 'iso' ? iso && { iso } : path && { path };
};

/**
 * The `add_filesystems` entries of the editor's rows, each with a host
 * directory and a mount point.
 *
 * @param {Array<Object>} rows - The editor's rows
 * @returns {Array<Object>} The entries
 */
export const filesystemEntries = rows =>
  (rows || [])
    .filter(row => row.special.trim() && row.dir.trim())
    .map(row => ({
      special: row.special.trim(),
      dir: row.dir.trim(),
      ...(row.type.trim() && { type: row.type.trim() }),
      ...(row.options.trim() && { options: row.options.trim() }),
    }));

/**
 * The bridged interfaces of `GET provisioning/bridged-interfaces` as
 * uplink choices, the physical, aggregated and etherstub links that are
 * not down.
 *
 * @param {Object|Array} data - The agent's answer
 * @returns {Array<{ name: string, class: string, provisioning: boolean, status: string, wireless: boolean }>} The links
 */
export const flattenBridgedInterfaces = data => {
  const list = data?.interfaces || data?.bridged_interfaces || data || [];
  return (Array.isArray(list) ? list : [])
    .map(entry => (typeof entry === 'string' ? { name: entry } : entry || {}))
    .filter(
      entry =>
        !entry.class ||
        entry.class === 'phys' ||
        entry.class === 'aggr' ||
        entry.class === 'etherstub'
    )
    .map(entry => ({
      name: entry.name || entry.device || '',
      class: entry.class || '',
      provisioning: entry.provisioning === true,
      status: typeof entry.status === 'string' ? entry.status.toLowerCase() : '',
      wireless: entry.wireless === true,
    }))
    .filter(entry => entry.name && entry.status !== 'down');
};

/**
 * A row's configuration as an object, parsed when the agent answered it
 * as text, empty when it carries none or the text does not parse.
 *
 * @param {Object|null} holder - The row or the detail
 * @returns {Object} The configuration
 */
export const parseConfiguration = holder => {
  const configuration = holder?.configuration;
  if (!configuration) {
    return {};
  }
  if (typeof configuration === 'string') {
    try {
      return JSON.parse(configuration);
    } catch {
      return {};
    }
  }
  return configuration;
};

/**
 * The file names of the cached ISOs of `GET artifacts/iso`, the rows whose
 * file exists.
 *
 * @param {Object|Array} answer - The agent's answer
 * @returns {Array<string>} The file names
 */
export const isoFilenames = answer => {
  const rows = Array.isArray(answer) ? answer : answer?.artifacts || [];
  return rows.filter(row => row.file_exists !== false).map(row => row.filename);
};

/**
 * The label a blank field runs with, the agent's own default for `key`
 * from `GET machines/defaults`, `n/a` while it reports none.
 *
 * @param {Object|null} defaultsDoc - The defaults document
 * @param {string} key - The knob
 * @returns {string} The label
 */
export const agentDefaultLabel = (defaultsDoc, key) => {
  const value =
    defaultsDoc?.knob_defaults?.[`zones.${key}`] ??
    defaultsDoc?.knob_defaults?.[`settings.${key}`] ??
    defaultsDoc?.zones?.[key] ??
    defaultsDoc?.settings?.[key];
  return value !== undefined && value !== null && value !== '' ? String(value) : 'n/a';
};

const STATUS_VARIANTS = {
  running: 'success',
  starting: 'info',
  stopping: 'info',
  shutting_down: 'info',
  suspended: 'warning',
  paused: 'warning',
  configured: 'warning',
  installed: 'warning',
  ready: 'warning',
  stopped: 'danger',
  aborted: 'danger',
  incomplete: 'danger',
  down: 'danger',
};

export const machineStatusVariant = status =>
  STATUS_VARIANTS[(status || '').toLowerCase()] || 'secondary';

/**
 * The pools of `GET storage/pools` as picker options, each labelled with
 * its free space and a health other than online.
 *
 * @param {Array<Object>} zfsPools - The pools
 * @returns {Array<{ value: string, label: string }>} The options
 */
export const zfsPoolOptions = zfsPools =>
  zfsPools.map(pool => {
    const free = pool.free ? ` — ${humanSize(pool.free)} free` : '';
    const health = pool.health && pool.health !== 'ONLINE' ? ` · ${pool.health}` : '';
    return { value: pool.name, label: `${pool.name}${free}${health}` };
  });

/**
 * The datasets under one pool as picker options, each relative to the
 * pool.
 *
 * @param {Array<Object>} zfsDatasets - The datasets
 * @param {string} poolName - The pool
 * @returns {Array<{ value: string, label: string }>} The options
 */
export const zfsDatasetOptions = (zfsDatasets, poolName) =>
  zfsDatasets
    .filter(dataset => dataset.name.startsWith(`${poolName}/`))
    .map(dataset => {
      const relative = dataset.name.slice(poolName.length + 1);
      return { value: relative, label: relative };
    });
