import { client } from '../../../lib/runtime';
import { SELF, agentPath, isServerRole } from '../utils/hosts';

export { SELF, agentPath, isServerRole };

/**
 * The registry of agents of the server role, `GET /api/servers`; the
 * caller guards the role, an agent role holding no registry.
 *
 * @returns {Promise<Array<Object>>} The `servers` rows
 */
export const fetchServers = () => client.get('/api/servers').then(data => data.servers || []);

export const fetchStats = (status, id) => client.get(agentPath(status, id, 'stats'));

export const fetchMachines = (status, id) =>
  client.get(agentPath(status, id, 'machines')).then(data => data.machines || []);

export const fetchAgentStatus = (status, id) => client.get(agentPath(status, id, 'api/status'));

/**
 * One host's search, its own search path reached at the path the role
 * fixes.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} path - The search path the host's status names, e.g. `/api/search`
 * @param {Object} params - The query parameters
 * @param {AbortSignal} signal - Aborts the request
 * @returns {Promise<Object>} The answer
 */
export const searchHost = (status, id, path, params, signal) =>
  client.get(agentPath(status, id, path.replace(/^\/api\//u, '')), { params, signal });
