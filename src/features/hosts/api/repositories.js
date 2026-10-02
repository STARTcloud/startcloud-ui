import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

/**
 * The package repositories of a host, `GET system/repositories`,
 * hyperweaver-ui's query: `enabled_only` and the `publisher` pattern,
 * each only where given, answered the `publishers` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} params - The query, `repositoryParams`
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchRepositories = (status, id, params) =>
  client
    .get(agentPath(status, id, 'system/repositories'), { params })
    .then(data => (Array.isArray(data?.publishers) ? data.publishers : []));

/**
 * Add a repository, `POST system/repositories` with the body of
 * `addRepositoryBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const addRepository = (status, id, body) =>
  client.post(agentPath(status, id, 'system/repositories'), body);

/**
 * Modify a repository, `PUT system/repositories/{name}` with the body of
 * `editRepositoryBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The publisher
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const updateRepository = (status, id, name, body) =>
  client.put(agentPath(status, id, `system/repositories/${encoded(name)}`), body);

/**
 * Enable or disable a repository,
 * `POST system/repositories/{name}/enable` or `.../disable`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The publisher
 * @param {boolean} enable - Whether to enable
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const toggleRepository = (status, id, name, enable) =>
  client.post(
    agentPath(status, id, `system/repositories/${encoded(name)}/${enable ? 'enable' : 'disable'}`)
  );

/**
 * Remove a repository, `DELETE system/repositories/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The publisher
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const deleteRepository = (status, id, name) =>
  client.delete(agentPath(status, id, `system/repositories/${encoded(name)}`));
