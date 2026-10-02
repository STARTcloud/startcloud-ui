import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * The faults of a host, `GET system/fault-management/faults`,
 * hyperweaver-ui's query: `all`, `summary`, `limit` and `force_refresh`,
 * answered `{ faults, summary }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} params - The query
 * @returns {Promise<Object>} The faults and the summary
 */
export const fetchFaults = (status, id, params) =>
  client.get(agentPath(status, id, 'system/fault-management/faults'), { params });

/**
 * Act on a fault, `POST system/fault-management/actions/{action}`,
 * hyperweaver-ui's body: `{ target: uuid }` for an acquit and
 * `{ fmri }` for repaired and replaced.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} action - `acquit`, `repaired` or `replaced`
 * @param {Object} body - The body, `faultActionBody`
 * @returns {Promise<Object>} The agent's answer
 */
export const faultAction = (status, id, action, body) =>
  client.post(agentPath(status, id, `system/fault-management/actions/${action}`), body);

/**
 * The fault manager's modules, `GET system/fault-management/config`, the
 * `config` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchFaultConfig = (status, id) =>
  client
    .get(agentPath(status, id, 'system/fault-management/config'))
    .then(data => (Array.isArray(data?.config) ? data.config : []));
