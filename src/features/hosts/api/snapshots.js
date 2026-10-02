import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const NOT_FOUND = 404;

const HOLDS = 'storage/snapshot/holds';

const snapshotsPath = (status, id, name, rest = '') =>
  agentPath(status, id, `machines/${encodeURIComponent(name)}/snapshots${rest}`);

const snapshotPath = (status, id, name, snapshot, rest = '') =>
  snapshotsPath(status, id, name, `/${encodeURIComponent(snapshot)}${rest}`);

/**
 * The snapshots of one machine, `GET machines/{name}/snapshots`, asked
 * for only of a host that lists `machine-snapshots`: hyperweaver-agent
 * answers the tree of VirtualBox, each row its `name`, `uuid`,
 * `description`, `node` and `current`, and zoneweaver-agent the
 * snapshots of the zone's datasets, each row its `name`, `description`,
 * `created`, `datasets`, `dataset_names`, `used_bytes` and `holds`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Array<Object>>} The `snapshots` rows
 */
export const fetchSnapshots = (status, id, name) =>
  client
    .get(snapshotsPath(status, id, name))
    .then(data => (Array.isArray(data?.snapshots) ? data.snapshots : []));

/**
 * Take a snapshot of one machine, `POST machines/{name}/snapshots`, a
 * queued task: the body names the snapshot, `name`, or the `prefix` a
 * dated name is made from with the `retention` that keeps the newest of
 * them, and carries `description`, `quiesce` and `live` where asked for.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Object} body - The body of `takeBody`
 * @returns {Promise<Object>} The queued task
 */
export const takeSnapshot = (status, id, name, body) =>
  client.post(snapshotsPath(status, id, name), body);

/**
 * Restore one machine to a snapshot,
 * `POST machines/{name}/snapshots/{snapshot}/restore`, a queued task the
 * agent runs on a machine that is off alone.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} snapshot - The snapshot's name
 * @returns {Promise<Object>} The queued task
 */
export const restoreSnapshot = (status, id, name, snapshot) =>
  client.post(snapshotPath(status, id, name, snapshot, '/restore'));

/**
 * Delete one snapshot of a machine,
 * `DELETE machines/{name}/snapshots/{snapshot}`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} snapshot - The snapshot's name
 * @returns {Promise<Object>} The queued task
 */
export const deleteSnapshot = (status, id, name, snapshot) =>
  client.delete(snapshotPath(status, id, name, snapshot));

/**
 * Rename one snapshot of a machine or write its description,
 * `PUT machines/{name}/snapshots/{snapshot}`, a queued task: `new_name`
 * and `description`, either or both, an empty `description` clearing it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} snapshot - The snapshot's name
 * @param {Object} body - The body of `modifyBody`
 * @returns {Promise<Object>} The queued task
 */
export const modifySnapshot = (status, id, name, snapshot, body) =>
  client.put(snapshotPath(status, id, name, snapshot), body);

/**
 * The holds of one snapshot of one dataset,
 * `GET storage/snapshot/holds` with the snapshot, `dataset@snapshot`, as
 * `name`, asked for only of a host that lists `zfs`. The agent answers
 * 404 for a snapshot that carries no hold, which is no failure here: the
 * answer is an empty list.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @returns {Promise<Array<Object>>} The holds, `[{ name, tag, timestamp }]`
 */
export const fetchSnapshotHolds = (status, id, snapshot) =>
  client
    .get(agentPath(status, id, HOLDS), { params: { name: snapshot } })
    .then(data => (Array.isArray(data?.holds) ? data.holds : []))
    .catch(error => {
      if (error.status === NOT_FOUND) {
        return [];
      }
      throw error;
    });

/**
 * Hold one snapshot of one dataset under a tag,
 * `POST storage/snapshot/holds` with the snapshot as `name` and the
 * `tag` in the body, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {string} tag - The hold's tag
 * @returns {Promise<Object>} The queued task
 */
export const holdSnapshot = (status, id, snapshot, tag) =>
  client.post(agentPath(status, id, HOLDS), { tag }, { params: { name: snapshot } });

/**
 * Release one hold of one snapshot of one dataset,
 * `DELETE storage/snapshot/holds` with the snapshot as `name` and the
 * hold's `tag`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} snapshot - The snapshot, `dataset@snapshot`
 * @param {string} tag - The hold's tag
 * @returns {Promise<Object>} The queued task
 */
export const releaseSnapshotHold = (status, id, snapshot, tag) =>
  client.delete(agentPath(status, id, HOLDS), { params: { name: snapshot, tag } });
