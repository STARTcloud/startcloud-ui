import { client } from '../../../lib/runtime';

const serverPath = serverId => `/api/servers/${encodeURIComponent(serverId)}`;

/**
 * The registry of agents with their API keys, `GET /api/servers` with
 * the query `include_api_keys`, hyperweaver-ui's read for the Servers
 * tab, answered `{ servers }`.
 *
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchServersWithKeys = () =>
  client
    .get('/api/servers', { params: { include_api_keys: true } })
    .then(data => (Array.isArray(data?.servers) ? data.servers : []));

/**
 * Register an agent, `POST /api/servers`, hyperweaver-ui's body: the
 * hostname, the port, the protocol, the `entity_name` of the key the
 * server bootstraps, `allow_insecure` and, where the person pasted one,
 * the existing `api_key`; refused `502` with the agent's own reason as
 * the problem's `title` and `409` for an agent already registered.
 *
 * @param {Object} body - The server
 * @returns {Promise<Object>} The server's answer
 */
export const addServer = body => client.post('/api/servers', body);

/**
 * Test an agent before registering it, `POST /api/servers/test` with the
 * hostname, the port, the protocol and `allow_insecure`, answered
 * `{ success, message, error, serverInfo }`, `serverInfo` the agent's
 * status payload with `bootstrapAvailable` among its members and
 * `message` the reason while `success` is false.
 *
 * @param {Object} body - The server
 * @returns {Promise<Object>} The server's answer
 */
export const testServer = body => client.post('/api/servers/test', body);

/**
 * Change whether the server accepts an agent's self-signed certificate,
 * `PATCH /api/servers/{id}` with `allow_insecure`, the one editable
 * member.
 *
 * @param {string|number} serverId - The registry id
 * @param {boolean} allowInsecure - Whether to accept it
 * @returns {Promise<Object>} The server's answer
 */
export const updateServer = (serverId, allowInsecure) =>
  client.patch(serverPath(serverId), { allow_insecure: allowInsecure });

/**
 * Remove an agent from the registry, `DELETE /api/servers/{id}`.
 *
 * @param {string|number} serverId - The registry id
 * @returns {Promise<Object>} The server's answer
 */
export const removeServer = serverId => client.delete(serverPath(serverId));
