import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : []);

/**
 * The storage locations of a host, `GET artifacts/storage/paths`,
 * answered `{ paths }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchStoragePaths = (status, id) =>
  client.get(agentPath(status, id, 'artifacts/storage/paths')).then(data => listOf(data, 'paths'));

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
 * The artifacts of a host, `GET artifacts` with hyperweaver-ui's query,
 * answered `{ artifacts, pagination }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} params - The query of `artifactQuery`
 * @returns {Promise<Object>} The answer
 */
export const fetchArtifacts = (status, id, params) =>
  client.get(agentPath(status, id, 'artifacts'), { params });

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
 * Delete artifacts, `DELETE artifacts/files`, hyperweaver-ui's body: the
 * ids, the files deleted with their records, not forced.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Array<string>} artifactIds - The ids
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteArtifacts = (status, id, artifactIds) =>
  client.delete(agentPath(status, id, 'artifacts/files'), {
    body: { artifact_ids: artifactIds, delete_files: true, force: false },
  });

/**
 * Scan the storage locations, `POST artifacts/scan`, hyperweaver-ui's
 * body: no checksums verified, no orphan removed; a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const scanArtifacts = (status, id) =>
  client.post(agentPath(status, id, 'artifacts/scan'), {
    verify_checksums: false,
    remove_orphaned: false,
  });

/**
 * Download a file from a URL into a storage location,
 * `POST artifacts/download` with the body of `downloadBody`, a queued
 * task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const downloadFromUrl = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/download'), body);

/**
 * Prepare an upload, `POST artifacts/upload/prepare` with the body of
 * `uploadPrepareBody`, answered with the `task_id` the file is sent
 * under.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const prepareUpload = (status, id, body) =>
  client.post(agentPath(status, id, 'artifacts/upload/prepare'), body);

/**
 * Send one file of a prepared upload, `POST artifacts/upload/{taskId}`
 * as multipart with the file under `file`, the progress reported as the
 * bytes go up.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} taskId - The task the prepare answered
 * @param {File} file - The file
 * @param {Function} onUploadProgress - axios's progress handler
 * @returns {Promise<Object>} The agent's answer
 */
export const uploadArtifact = (status, id, taskId, file, onUploadProgress) => {
  const body = new FormData();
  body.append('file', file);
  return client.request({
    method: 'POST',
    path: agentPath(status, id, `artifacts/upload/${encoded(taskId)}`),
    body,
    contentType: 'multipart',
    onUploadProgress,
  });
};

/**
 * Move an artifact to another storage location,
 * `POST artifacts/{id}/move` with the destination's id.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} artifactId - The artifact's id
 * @param {string} destinationId - The storage location's id
 * @returns {Promise<Object>} The agent's answer
 */
export const moveArtifact = (status, id, artifactId, destinationId) =>
  client.post(agentPath(status, id, `artifacts/${encoded(artifactId)}/move`), {
    destination_storage_location_id: destinationId,
  });

/**
 * Copy an artifact to another storage location,
 * `POST artifacts/{id}/copy` with the destination's id.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} artifactId - The artifact's id
 * @param {string} destinationId - The storage location's id
 * @returns {Promise<Object>} The agent's answer
 */
export const copyArtifact = (status, id, artifactId, destinationId) =>
  client.post(agentPath(status, id, `artifacts/${encoded(artifactId)}/copy`), {
    destination_storage_location_id: destinationId,
  });

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
