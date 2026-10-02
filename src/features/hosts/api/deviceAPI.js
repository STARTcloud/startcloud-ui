import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * The PCI devices of one host, `GET host/devices`, asked for only of a
 * host that lists `devices`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} filters - `{ category?, ppt_enabled?, driver_attached?, available?, limit? }`
 * @returns {Promise<Object>} `{ devices, summary }`
 */
export const getHostDevices = (status, id, filters = {}) =>
  client.get(agentPath(status, id, 'host/devices'), { params: filters });

/**
 * The devices free for passthrough, `GET host/devices/available`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} filters - `{ category?, ppt_only? }`
 * @returns {Promise<Object>} `{ devices }`
 */
export const getAvailableDevices = (status, id, filters = {}) =>
  client.get(agentPath(status, id, 'host/devices/available'), { params: filters });

/**
 * The devices counted by category, `GET host/devices/categories`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ categories: { name: { total, ppt_capable } } }`
 */
export const getDeviceCategories = (status, id) =>
  client.get(agentPath(status, id, 'host/devices/categories'));

/**
 * The passthrough overview, `GET host/ppt-status`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ ppt_devices, summary }`
 */
export const getPPTStatus = (status, id) => client.get(agentPath(status, id, 'host/ppt-status'));

/**
 * Ask the agent to discover its devices again, `POST host/devices/refresh`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const refreshDeviceDiscovery = (status, id) =>
  client.post(agentPath(status, id, 'host/devices/refresh'));

/**
 * One device, `GET host/devices/{device}` by its id or PCI address.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} deviceId - The device's id or PCI address
 * @returns {Promise<Object>} The device
 */
export const getDeviceDetails = (status, id, deviceId) =>
  client.get(agentPath(status, id, `host/devices/${encodeURIComponent(deviceId)}`));
