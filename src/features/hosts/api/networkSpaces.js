import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const spacePath = (status, id, family, name = '', verb = '') =>
  agentPath(
    status,
    id,
    `network/spaces/${family}${name ? `/${encodeURIComponent(name)}` : ''}${verb}`
  );

/**
 * Create a host-only interface, `POST network/spaces/hostonly` with the
 * body of `hostOnlyIfBody`, on a host that lists `network-spaces`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `hostOnlyIfBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const createHostOnlyIf = (status, id, body) =>
  client.post(spacePath(status, id, 'hostonly'), body);

/**
 * Modify a host-only interface, `PUT network/spaces/hostonly/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The interface's name
 * @param {Object} body - The body of `hostOnlyIfBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const modifyHostOnlyIf = (status, id, name, body) =>
  client.put(spacePath(status, id, 'hostonly', name), body);

/**
 * Remove a host-only interface, `DELETE network/spaces/hostonly/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The interface's name
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteHostOnlyIf = (status, id, name) =>
  client.delete(spacePath(status, id, 'hostonly', name));

/**
 * Create a host-only network, `POST network/spaces/hostonlynet` with the
 * body of `hostOnlyNetBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `hostOnlyNetBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const createHostOnlyNet = (status, id, body) =>
  client.post(spacePath(status, id, 'hostonlynet'), body);

/**
 * Modify a host-only network, `PUT network/spaces/hostonlynet/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The network's name
 * @param {Object} body - The body of `hostOnlyNetBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const modifyHostOnlyNet = (status, id, name, body) =>
  client.put(spacePath(status, id, 'hostonlynet', name), body);

/**
 * Remove a host-only network, `DELETE network/spaces/hostonlynet/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The network's name
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteHostOnlyNet = (status, id, name) =>
  client.delete(spacePath(status, id, 'hostonlynet', name));

/**
 * Create a NAT network, `POST network/spaces/natnetwork` with the body
 * of `natNetworkBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `natNetworkBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const createNatNetwork = (status, id, body) =>
  client.post(spacePath(status, id, 'natnetwork'), body);

/**
 * Modify a NAT network, `PUT network/spaces/natnetwork/{name}`, the
 * forwards removed and added in the body.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The network's name
 * @param {Object} body - The body of `natNetworkBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const modifyNatNetwork = (status, id, name, body) =>
  client.put(spacePath(status, id, 'natnetwork', name), body);

/**
 * Remove a NAT network, `DELETE network/spaces/natnetwork/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The network's name
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteNatNetwork = (status, id, name) =>
  client.delete(spacePath(status, id, 'natnetwork', name));

/**
 * Start or stop a NAT network's service,
 * `POST network/spaces/natnetwork/{name}/start` or `/stop`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The network's name
 * @param {string} action - `start` or `stop`
 * @returns {Promise<Object>} The agent's answer
 */
export const natNetworkService = (status, id, name, action) =>
  client.post(spacePath(status, id, 'natnetwork', name, `/${action}`));
