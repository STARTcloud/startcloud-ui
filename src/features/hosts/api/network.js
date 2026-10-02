import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const vnicPath = (status, id, vnic, verb = '') =>
  agentPath(status, id, `network/vnics/${encodeURIComponent(vnic)}${verb}`);

/**
 * The host's VNIC records, `GET network/vnics`, asked for only of a host
 * that lists `vnics`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ vnics, returned, source }`
 */
export const fetchVnics = (status, id) => client.get(agentPath(status, id, 'network/vnics'));

/**
 * One VNIC's link properties, `GET network/vnics/{vnic}/properties`, each
 * `{ property, value, default, possible }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} vnic - The VNIC name
 * @returns {Promise<Object>} `{ vnic, properties, timestamp }`
 */
export const fetchVnicProperties = (status, id, vnic) =>
  client.get(vnicPath(status, id, vnic, '/properties'));

/**
 * Set link properties on one VNIC, `PUT network/vnics/{vnic}/properties`
 * with `{ properties, temporary? }`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} vnic - The VNIC name
 * @param {Object} body - `{ properties, temporary? }`
 * @returns {Promise<Object>} The queued task
 */
export const setVnicProperties = (status, id, vnic, body) =>
  client.put(vnicPath(status, id, vnic, '/properties'), body);
