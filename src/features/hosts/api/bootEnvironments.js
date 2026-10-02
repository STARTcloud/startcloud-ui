import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

/**
 * The boot environments of a host, `GET system/boot-environments`,
 * hyperweaver-ui's query: `detailed`, `snapshots` and the name pattern,
 * each only where given, answered the `boot_environments` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} params - The query, `bootEnvironmentParams`
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchBootEnvironments = (status, id, params) =>
  client
    .get(agentPath(status, id, 'system/boot-environments'), { params })
    .then(data => (Array.isArray(data?.boot_environments) ? data.boot_environments : []));

/**
 * Create a boot environment, `POST system/boot-environments` with the
 * body of `bootEnvironmentCreateBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const createBootEnvironment = (status, id, body) =>
  client.post(agentPath(status, id, 'system/boot-environments'), body);

/**
 * Activate a boot environment,
 * `POST system/boot-environments/{name}/activate` with `temporary`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The environment
 * @param {boolean} temporary - Whether the activation is for one boot
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const activateBootEnvironment = (status, id, name, temporary) =>
  client.post(agentPath(status, id, `system/boot-environments/${encoded(name)}/activate`), {
    temporary: Boolean(temporary),
  });

/**
 * Mount a boot environment, `POST system/boot-environments/{name}/mount`
 * with the mountpoint and the shared mode.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The environment
 * @param {Object} options - `mountpoint` and `sharedMode`
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const mountBootEnvironment = (status, id, name, { mountpoint, sharedMode }) =>
  client.post(agentPath(status, id, `system/boot-environments/${encoded(name)}/mount`), {
    mountpoint: mountpoint || `/mnt/${name}`,
    shared_mode: sharedMode || 'ro',
  });

/**
 * Unmount a boot environment,
 * `POST system/boot-environments/{name}/unmount` with `force`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The environment
 * @param {boolean} force - Whether to force the unmount
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const unmountBootEnvironment = (status, id, name, force) =>
  client.post(agentPath(status, id, `system/boot-environments/${encoded(name)}/unmount`), {
    force: Boolean(force),
  });

/**
 * Delete a boot environment, `DELETE system/boot-environments/{name}`,
 * `force` and `snapshots` as query members where set.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The environment
 * @param {Object} options - `force` and `snapshots`
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const deleteBootEnvironment = (status, id, name, { force, snapshots }) =>
  client.delete(agentPath(status, id, `system/boot-environments/${encoded(name)}`), {
    params: { ...(force ? { force: true } : {}), ...(snapshots ? { snapshots: true } : {}) },
  });
