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
