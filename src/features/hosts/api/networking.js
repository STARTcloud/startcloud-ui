import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const named = (status, id, family, name, verb = '') =>
  agentPath(status, id, `network/${family}/${encodeURIComponent(name)}${verb}`);

/**
 * Create an IP address, `POST network/addresses` with the body of
 * `addressBody`, offered while the host lists `ip-addresses` or `vnics`;
 * a queued task on the agent of the zones and an answer at once on the
 * agent of VirtualBox and UTM.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `addressBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const createAddress = (status, id, body) =>
  client.post(agentPath(status, id, 'network/addresses'), body);

/**
 * Delete an IP address, `DELETE network/addresses/{addrobj}` with the
 * query of `addressDeleteParams`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} addrobj - The address object
 * @param {Object} params - The query of `addressDeleteParams`
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteAddress = (status, id, addrobj, params) =>
  client.delete(named(status, id, 'addresses', addrobj), { params });

/**
 * Enable an IP address, `PUT network/addresses/{addrobj}/enable`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} addrobj - The address object
 * @returns {Promise<Object>} The agent's answer
 */
export const enableAddress = (status, id, addrobj) =>
  client.put(named(status, id, 'addresses', addrobj, '/enable'));

/**
 * Disable an IP address, `PUT network/addresses/{addrobj}/disable`, the
 * answer's `note` shown when the agent gives one.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} addrobj - The address object
 * @returns {Promise<Object>} The agent's answer
 */
export const disableAddress = (status, id, addrobj) =>
  client.put(named(status, id, 'addresses', addrobj, '/disable'));

/**
 * One VNIC's details, `GET network/vnics/{link}`, on a host that lists
 * `vnics`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The VNIC's link
 * @returns {Promise<Object>} The agent's answer, the VNIC under `vnic`
 */
export const fetchVnic = (status, id, name) => client.get(named(status, id, 'vnics', name));

/**
 * Create a VNIC, `POST network/vnics` with the body of `vnicBody`, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `vnicBody`
 * @returns {Promise<Object>} The queued task
 */
export const createVnic = (status, id, body) =>
  client.post(agentPath(status, id, 'network/vnics'), body);

/**
 * Delete a VNIC, `DELETE network/vnics/{link}` with `temporary` false, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The VNIC's link
 * @returns {Promise<Object>} The queued task
 */
export const deleteVnic = (status, id, name) =>
  client.delete(named(status, id, 'vnics', name), { params: { temporary: false } });

/**
 * One etherstub's VNICs, `GET network/etherstubs/{name}` with
 * `show_vnics`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The etherstub's name
 * @returns {Promise<Object>} The agent's answer, the VNICs under `vnics`
 */
export const fetchEtherstub = (status, id, name) =>
  client.get(named(status, id, 'etherstubs', name), { params: { show_vnics: true } });

/**
 * Create an etherstub, `POST network/etherstubs` with the body of
 * `etherstubBody`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `etherstubBody`
 * @returns {Promise<Object>} The queued task
 */
export const createEtherstub = (status, id, body) =>
  client.post(agentPath(status, id, 'network/etherstubs'), body);

/**
 * Delete an etherstub, `DELETE network/etherstubs/{name}` with
 * `temporary` and `force` false, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The etherstub's name
 * @returns {Promise<Object>} The queued task
 */
export const deleteEtherstub = (status, id, name) =>
  client.delete(named(status, id, 'etherstubs', name), {
    params: { temporary: false, force: false },
  });

/**
 * One bridge's links and forwarding table, `GET network/bridges/{name}`
 * with `show_links` and `show_forwarding`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The bridge's name
 * @returns {Promise<Object>} The agent's answer
 */
export const fetchBridge = (status, id, name) =>
  client.get(named(status, id, 'bridges', name), {
    params: { show_links: true, show_forwarding: true },
  });

/**
 * Create a bridge, `POST network/bridges` with the body of
 * `bridgeBody`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `bridgeBody`
 * @returns {Promise<Object>} The queued task
 */
export const createBridge = (status, id, body) =>
  client.post(agentPath(status, id, 'network/bridges'), body);

/**
 * Delete a bridge, `DELETE network/bridges/{name}` with `force` false, a
 * queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The bridge's name
 * @returns {Promise<Object>} The queued task
 */
export const deleteBridge = (status, id, name) =>
  client.delete(named(status, id, 'bridges', name), { params: { force: false } });

/**
 * One aggregate's LACP state, `GET network/aggregates/{name}` with
 * `extended` and `lacp`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The aggregate's name
 * @returns {Promise<Object>} The agent's answer, the rows under `lacp`
 */
export const fetchAggregate = (status, id, name) =>
  client.get(named(status, id, 'aggregates', name), { params: { extended: true, lacp: true } });

/**
 * Create an aggregate, `POST network/aggregates` with the body of
 * `aggregateBody`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `aggregateBody`
 * @returns {Promise<Object>} The queued task
 */
export const createAggregate = (status, id, body) =>
  client.post(agentPath(status, id, 'network/aggregates'), body);

/**
 * Delete an aggregate, `DELETE network/aggregates/{name}` with
 * `temporary` false, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The aggregate's name
 * @returns {Promise<Object>} The queued task
 */
export const deleteAggregate = (status, id, name) =>
  client.delete(named(status, id, 'aggregates', name), { params: { temporary: false } });

/**
 * Act on a service, `POST services/action` with `{ action, fmri }`, the
 * disable of the CDP service before an aggregate is made.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ action, fmri }`
 * @returns {Promise<Object>} The agent's answer
 */
export const serviceAction = (status, id, body) =>
  client.post(agentPath(status, id, 'services/action'), body);

/**
 * Write the host's hostname, `PUT network/hostname` with the body of
 * `hostnameBody`, offered while the host lists `hostname` or `vnics`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `hostnameBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const saveHostname = (status, id, body) =>
  client.put(agentPath(status, id, 'network/hostname'), body);

/**
 * Write the host's DNS configuration, `PUT system/dns` with the body of
 * `dnsBody`, the answer's `backup` the path of the file kept before,
 * offered while the host lists `dns` or `vnics`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `dnsBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const saveDns = (status, id, body) => client.put(agentPath(status, id, 'system/dns'), body);

/**
 * Write the host's hosts file, `PUT system/hosts` with the body of
 * `hostsBody`, offered while the host lists `hosts-file`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `hostsBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const saveHostsFile = (status, id, body) =>
  client.put(agentPath(status, id, 'system/hosts'), body);
