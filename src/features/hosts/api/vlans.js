import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const vlanPath = (status, id, name) =>
  agentPath(status, id, `network/vlans/${encodeURIComponent(name)}`);

/**
 * One VLAN's details, `GET network/vlans/{link}`, asked for only of a
 * host that lists `vnics`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The VLAN's link name
 * @returns {Promise<Object>} The agent's answer, the VLAN under `vlan`
 */
export const fetchVlan = (status, id, name) => client.get(vlanPath(status, id, name));

/**
 * Create a VLAN, `POST network/vlans` with the body of `vlanBody`, a
 * queued task on the agent that serves it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `vlanBody`
 * @returns {Promise<Object>} The queued task
 */
export const createVlan = (status, id, body) =>
  client.post(agentPath(status, id, 'network/vlans'), body);

/**
 * Delete a VLAN, `DELETE network/vlans/{link}` with `temporary` false,
 * a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The VLAN's link name
 * @returns {Promise<Object>} The queued task
 */
export const deleteVlan = (status, id, name) =>
  client.delete(vlanPath(status, id, name), { params: { temporary: false } });
