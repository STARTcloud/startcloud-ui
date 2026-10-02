import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const poolPath = (status, id, pool, rest = '') =>
  agentPath(status, id, `storage/pools/${encodeURIComponent(pool)}${rest}`);

const named = name => ({ params: { name } });

/**
 * The ZFS pools of one agent, `GET storage/pools`, asked for only of a
 * host that lists `zfs`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ pools: [{ name, size, alloc, free, capacity_percent, dedup_ratio, health, altroot }], total }`
 */
export const getZfsPools = (status, id) => client.get(agentPath(status, id, 'storage/pools'));

/**
 * Create a ZFS pool, `POST storage/pools`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ pool_name, vdevs: (string | { type, devices })[], properties?, force?, mount_point? }`
 * @returns {Promise<Object>} The queued task
 */
export const createZfsPool = (status, id, body) =>
  client.post(agentPath(status, id, 'storage/pools'), body);

/**
 * Every property of one pool, `GET storage/pools/{pool}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @returns {Promise<Object>} `{ name, properties: { prop: { value, source } } }`
 */
export const getZfsPool = (status, id, pool) => client.get(poolPath(status, id, pool));

/**
 * Destroy a pool, `DELETE storage/pools/{pool}` with `force`, a queued
 * task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {boolean} force - Whether to force the destruction
 * @returns {Promise<Object>} The queued task
 */
export const destroyZfsPool = (status, id, pool, force = false) =>
  client.delete(poolPath(status, id, pool), { data: { force } });

/**
 * The status of one pool, `GET storage/pools/{pool}/status`, the raw
 * `zpool status` text and its parsed vdev tree and scan.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @returns {Promise<Object>} `{ name, status, parsed: { vdevs, scan } }`
 */
export const getZfsPoolStatus = (status, id, pool) =>
  client.get(poolPath(status, id, pool, '/status'));

/**
 * Set the properties of one pool, `PUT storage/pools/{pool}/properties`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {Object<string, string>} properties - The changed properties
 * @returns {Promise<Object>} The queued task
 */
export const setZfsPoolProperties = (status, id, pool, properties) =>
  client.put(poolPath(status, id, pool, '/properties'), { properties });

/**
 * Start a scrub of one pool, `POST storage/pools/{pool}/scrub`, a queued
 * task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @returns {Promise<Object>} The queued task
 */
export const scrubZfsPool = (status, id, pool) => client.post(poolPath(status, id, pool, '/scrub'));

/**
 * Stop the scrub of one pool, `POST storage/pools/{pool}/scrub/stop`, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @returns {Promise<Object>} The queued task
 */
export const stopZfsPoolScrub = (status, id, pool) =>
  client.post(poolPath(status, id, pool, '/scrub/stop'));

/**
 * Upgrade one pool to the newest version, `POST storage/pools/{pool}/upgrade`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @returns {Promise<Object>} The queued task
 */
export const upgradeZfsPool = (status, id, pool) =>
  client.post(poolPath(status, id, pool, '/upgrade'));

/**
 * Export one pool, `POST storage/pools/{pool}/export` with `force`, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {boolean} force - Whether to force the export
 * @returns {Promise<Object>} The queued task
 */
export const exportZfsPool = (status, id, pool, force = false) =>
  client.post(poolPath(status, id, pool, '/export'), { force });

/**
 * The pools that can be imported, `GET storage/pools/importable`, the
 * parsed names and the raw `zpool import` text.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ pools: [{ name, id?, state? }], total, output, message? }`
 */
export const getImportableZfsPools = (status, id) =>
  client.get(agentPath(status, id, 'storage/pools/importable'));

/**
 * Import a pool, `POST storage/pools/import`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ pool_name?, pool_id?, new_name?, properties?, force? }`
 * @returns {Promise<Object>} The queued task
 */
export const importZfsPool = (status, id, body) =>
  client.post(agentPath(status, id, 'storage/pools/import'), body);

/**
 * Add vdevs to one pool, `POST storage/pools/{pool}/vdevs`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {Object} body - `{ vdevs: (string | { type, devices })[], force? }`
 * @returns {Promise<Object>} The queued task
 */
export const addZfsPoolVdevs = (status, id, pool, body) =>
  client.post(poolPath(status, id, pool, '/vdevs'), body);

/**
 * Remove one device from a pool, `POST storage/pools/{pool}/vdevs/remove`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {string} device - The device to remove
 * @returns {Promise<Object>} The queued task
 */
export const removeZfsPoolVdev = (status, id, pool, device) =>
  client.post(poolPath(status, id, pool, '/vdevs/remove'), { device });

/**
 * Replace one device of a pool, `POST storage/pools/{pool}/devices/replace`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {Object} body - `{ old_device, new_device, force? }`
 * @returns {Promise<Object>} The queued task
 */
export const replaceZfsPoolDevice = (status, id, pool, body) =>
  client.post(poolPath(status, id, pool, '/devices/replace'), body);

/**
 * Bring one device of a pool online, `POST storage/pools/{pool}/devices/online`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {Object} body - `{ device, expand? }`
 * @returns {Promise<Object>} The queued task
 */
export const onlineZfsPoolDevice = (status, id, pool, body) =>
  client.post(poolPath(status, id, pool, '/devices/online'), body);

/**
 * Take one device of a pool offline, `POST storage/pools/{pool}/devices/offline`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pool - The pool's name
 * @param {Object} body - `{ device, temporary? }`
 * @returns {Promise<Object>} The queued task
 */
export const offlineZfsPoolDevice = (status, id, pool, body) =>
  client.post(poolPath(status, id, pool, '/devices/offline'), body);

/**
 * Ask the monitoring service for a collection now,
 * `POST monitoring/collect`, so the disk inventory is read fresh.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const forceMonitoringCollect = (status, id) =>
  client.post(agentPath(status, id, 'monitoring/collect'));

/**
 * The datasets of one agent, `GET storage/datasets`, with the filters
 * the caller names.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} params - `{ pool?, type?: filesystem|volume|snapshot|bookmark, recursive? }`
 * @returns {Promise<Object>} `{ datasets: [{ name, type, used, avail, refer, mountpoint }], total }`
 */
export const getZfsDatasets = (status, id, params = {}) =>
  client.get(agentPath(status, id, 'storage/datasets'), { params });

/**
 * Create a dataset or a volume, `POST storage/datasets`, a queued task;
 * a volume takes its size as `properties.volsize`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ name, type?: filesystem|volume, properties? }`
 * @returns {Promise<Object>} The queued task
 */
export const createZfsDataset = (status, id, body) =>
  client.post(agentPath(status, id, 'storage/datasets'), body);

/**
 * Every property of one dataset, `GET storage/dataset` with the name in
 * the query, because a dataset's name carries slashes.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The dataset's name
 * @returns {Promise<Object>} `{ name, properties: { prop: { value, source } } }`
 */
export const getZfsDataset = (status, id, name) =>
  client.get(agentPath(status, id, 'storage/dataset'), named(name));

/**
 * Destroy one dataset, `DELETE storage/dataset` with the name in the
 * query, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The dataset's name
 * @param {Object} body - `{ recursive?, force? }`
 * @returns {Promise<Object>} The queued task
 */
export const destroyZfsDataset = (status, id, name, body = {}) =>
  client.delete(agentPath(status, id, 'storage/dataset'), { data: body, ...named(name) });

/**
 * Set the properties of one dataset, `PUT storage/dataset/properties`, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The dataset's name
 * @param {Object<string, string>} properties - The changed properties
 * @returns {Promise<Object>} The queued task
 */
export const setZfsDatasetProperties = (status, id, name, properties) =>
  client.put(agentPath(status, id, 'storage/dataset/properties'), { properties }, named(name));

/**
 * Rename one dataset, `POST storage/dataset/rename`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The dataset's name
 * @param {Object} body - `{ new_name, recursive?, force? }`
 * @returns {Promise<Object>} The queued task
 */
export const renameZfsDataset = (status, id, name, body) =>
  client.post(agentPath(status, id, 'storage/dataset/rename'), body, named(name));

/**
 * Clone one snapshot to a new dataset, `POST storage/dataset/clone`, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {Object} body - `{ target, properties? }`
 * @returns {Promise<Object>} The queued task
 */
export const cloneZfsSnapshot = (status, id, snapshot, body) =>
  client.post(agentPath(status, id, 'storage/dataset/clone'), body, named(snapshot));

/**
 * Promote one clone to a dataset of its own, `POST storage/dataset/promote`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The dataset's name
 * @returns {Promise<Object>} The queued task
 */
export const promoteZfsDataset = (status, id, name) =>
  client.post(agentPath(status, id, 'storage/dataset/promote'), undefined, named(name));

/**
 * Snapshot one dataset, `POST storage/dataset/snapshots`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The dataset's name
 * @param {Object} body - `{ snapshot_name, recursive?, properties? }`
 * @returns {Promise<Object>} The queued task
 */
export const createZfsSnapshot = (status, id, name, body) =>
  client.post(agentPath(status, id, 'storage/dataset/snapshots'), body, named(name));

/**
 * Destroy one snapshot, `DELETE storage/snapshot`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {Object} body - `{ recursive?, defer? }`
 * @returns {Promise<Object>} The queued task
 */
export const destroyZfsSnapshot = (status, id, snapshot, body = {}) =>
  client.delete(agentPath(status, id, 'storage/snapshot'), { data: body, ...named(snapshot) });

/**
 * Roll one dataset back to a snapshot, `POST storage/snapshot/rollback`,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {Object} body - `{ recursive?, force? }`
 * @returns {Promise<Object>} The queued task
 */
export const rollbackZfsSnapshot = (status, id, snapshot, body = {}) =>
  client.post(agentPath(status, id, 'storage/snapshot/rollback'), body, named(snapshot));

/**
 * The holds of one snapshot, `GET storage/snapshot/holds`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @returns {Promise<Object>} `{ holds: [{ tag, timestamp }] }`
 */
export const getZfsSnapshotHolds = (status, id, snapshot) =>
  client.get(agentPath(status, id, 'storage/snapshot/holds'), named(snapshot));

/**
 * Hold one snapshot under a tag, `POST storage/snapshot/holds`, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {Object} body - `{ tag, recursive? }`
 * @returns {Promise<Object>} The queued task
 */
export const holdZfsSnapshot = (status, id, snapshot, body) =>
  client.post(agentPath(status, id, 'storage/snapshot/holds'), body, named(snapshot));

/**
 * Release one hold of a snapshot, `DELETE storage/snapshot/holds` with
 * the tag in the query, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {string} tag - The hold's tag
 * @returns {Promise<Object>} The queued task
 */
export const releaseZfsSnapshotHold = (status, id, snapshot, tag) =>
  client.delete(agentPath(status, id, 'storage/snapshot/holds'), {
    params: { name: snapshot, tag },
  });
