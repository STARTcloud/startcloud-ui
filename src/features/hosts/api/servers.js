import { client } from '../../../lib/runtime';

const serverPath = serverId => `/api/servers/${encodeURIComponent(serverId)}`;

/**
 * The registry of agents with their API keys, `GET /api/servers` with
 * `includeApiKeys`, hyperweaver-ui's read for the Servers tab, answered
 * `{ servers }`.
 *
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchServersWithKeys = () =>
  client
    .get('/api/servers', { params: { includeApiKeys: true } })
    .then(data => (Array.isArray(data?.servers) ? data.servers : []));

/**
 * Register an agent, `POST /api/servers`, hyperweaver-ui's body: the
 * hostname, the port, the protocol, the entity name of the key the
 * server bootstraps, `allowInsecure` and, where the person pasted one,
 * the existing `apiKey`.
 *
 * @param {Object} body - The server
 * @returns {Promise<Object>} The server's answer
 */
export const addServer = body => client.post('/api/servers', body);

/**
 * Test an agent before registering it, `POST /api/servers/test` with the
 * hostname, the port, the protocol and `allowInsecure`, answered
 * `{ success, message, serverInfo }`.
 *
 * @param {Object} body - The server
 * @returns {Promise<Object>} The server's answer
 */
export const testServer = body => client.post('/api/servers/test', body);

/**
 * Change whether the server accepts an agent's self-signed certificate,
 * `PATCH /api/servers/{id}` with `allowInsecure`, the one editable member.
 *
 * @param {string|number} serverId - The registry id
 * @param {boolean} allowInsecure - Whether to accept it
 * @returns {Promise<Object>} The server's answer
 */
export const updateServer = (serverId, allowInsecure) =>
  client.patch(serverPath(serverId), { allowInsecure });

/**
 * Remove an agent from the registry, `DELETE /api/servers/{id}`.
 *
 * @param {string|number} serverId - The registry id
 * @returns {Promise<Object>} The server's answer
 */
export const removeServer = serverId => client.delete(serverPath(serverId));
