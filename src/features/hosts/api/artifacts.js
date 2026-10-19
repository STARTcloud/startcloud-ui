import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

/**
 * Make a storage location, `POST artifacts/storage/paths` with the name,
 * the path, the type and whether it is enabled.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ name, path, type, enabled }`
 * @returns {Promise<Object>} The agent's answer
 */
export const createStoragePath = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/storage/paths'), body);

/**
 * Change a storage location, `PUT artifacts/storage/paths/{id}` with the
 * members that change, the name and `enabled`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pathId - The location's id
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const updateStoragePath = (status, id, pathId, body) =>
  client.put(agentPath(status, id, `artifacts/storage/paths/${encoded(pathId)}`), body);

/**
 * Remove a storage location, `DELETE artifacts/storage/paths/{id}`,
 * hyperweaver-ui's body: not recursive, its records removed, not forced.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} pathId - The location's id
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteStoragePath = (status, id, pathId) =>
  client.delete(agentPath(status, id, `artifacts/storage/paths/${encoded(pathId)}`), {
    body: { recursive: false, remove_db_records: true, force: false },
  });

/**
 * The ISO images of a host's artifact storage, `GET artifacts/iso`,
 * asked for only of a host that lists `artifacts`, answered the artifact
 * list shape, `{ artifacts, total }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The answer
 */
export const fetchIsoArtifacts = (status, id) => client.get(agentPath(status, id, 'artifacts/iso'));

/**
 * The hard-disk images VirtualBox registers on a host, `GET media`,
 * asked for only of a host that lists `media`, answered
 * `{ media: [{ path, format, size_bytes, source_stamp, in_use_by }], total }`,
 * `source_stamp` `template`, `blank` or null for a disk the agent did not
 * make.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The answer
 */
export const fetchMedia = (status, id) => client.get(agentPath(status, id, 'media'));

/**
 * One artifact's detail, `GET artifacts/{id}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} artifactId - The artifact's id
 * @returns {Promise<Object>} The detail
 */
export const fetchArtifact = (status, id, artifactId) =>
  client.get(agentPath(status, id, `artifacts/${encoded(artifactId)}`));

/**
 * One artifact's file as a blob, `GET artifacts/{id}/download`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} artifactId - The artifact's id
 * @returns {Promise<Blob>} The file
 */
export const downloadArtifactFile = (status, id, artifactId) =>
  client.get(agentPath(status, id, `artifacts/${encoded(artifactId)}/download`), {
    responseType: 'blob',
  });
