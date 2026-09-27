export const SELF = 'self';

const SERVER_ROLE = 'hyperweaver-server';

/**
 * Whether the host behind `status` is the aggregating server, the role
 * that holds the registry of agents and proxies every agent path.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {boolean} True on the `hyperweaver-server` role
 */
export const isServerRole = status => status?.role === SERVER_ROLE;

/**
 * The path an agent read is sent to, as the status table fixes it: on the
 * server role `/api/agents/{id}/{path}`, the id encoded, and on an agent
 * role the agent's own `/api/{path}`, because the origin that served the
 * page is the one agent; `path` is root-relative with no leading slash.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string|number} id - The registry id, or `SELF` on an agent role
 * @param {string} path - The agent path, e.g. `stats`, `machines`, `api/status`
 * @returns {string} The request path
 */
export const agentPath = (status, id, path) =>
  isServerRole(status) ? `/api/agents/${encodeURIComponent(id)}/${path}` : `/api/${path}`;

export const hostLabel = server => server.entityName || server.hostname;

export const hostKey = server => String(server.id);

/**
 * The word the listed servers' instances go by: `zone` while every server
 * names a non-empty `capabilities.hypervisors` list of `bhyve` alone, and
 * `machine` otherwise, the neutral noun of a mix or an unknown agent.
 *
 * @param {Array<Object>} servers - The registry rows
 * @returns {string} `zone` or `machine`
 */
export const machineNoun = servers => {
  const hypervisors = servers.flatMap(server => server.capabilities?.hypervisors || []);
  const allBhyve =
    hypervisors.length > 0 && hypervisors.every(hypervisor => hypervisor === 'bhyve');
  return allBhyve ? 'zone' : 'machine';
};

/**
 * The one server of an agent role, the origin that served the page: the
 * literal `self` id, the agent's hostname from its status or the page's,
 * no entity name, and the status payload itself as the capabilities row.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Object} The server row
 */
export const selfServer = status => ({
  id: SELF,
  hostname: status.hostname || window.location.hostname,
  entityName: '',
  capabilities: status,
});

export const isRunning = (stats, name) => (stats?.runningmachines || []).includes(name);
