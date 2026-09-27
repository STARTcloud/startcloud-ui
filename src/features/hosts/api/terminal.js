import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * Start a host terminal session, `POST term/start` at the path the role
 * fixes; the answer is the session row, its `id` the session.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The session row
 */
export const startTerminal = (status, id) => client.post(agentPath(status, id, 'term/start'));

/**
 * Stop a host terminal session, `DELETE term/sessions/{sessionId}/stop`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} sessionId - The session's id
 * @returns {Promise<Object>} The agent's answer
 */
export const stopTerminal = (status, id, sessionId) =>
  client.delete(agentPath(status, id, `term/sessions/${encodeURIComponent(sessionId)}/stop`));

/**
 * A short-lived ticket for one WebSocket upgrade, `GET ws-ticket`, bound
 * to `machine` when one is given and unbound, for a host-level stream,
 * when none is.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} [machine] - The machine the ticket is bound to
 * @returns {Promise<{ ticket: string }>} The ticket
 */
export const wsTicket = (status, id, machine = '') =>
  client.get(agentPath(status, id, 'ws-ticket'), machine ? { params: { machine } } : {});

/**
 * The WebSocket URL of an agent path at the origin that served the page:
 * `wss` on an `https` page and `ws` otherwise, the path the role fixes,
 * and the ticket as `?ticket=`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} path - The agent path, e.g. `term/{sessionId}`
 * @param {string} ticket - The ticket from `wsTicket`
 * @returns {string} The URL
 */
export const socketUrl = (status, id, path, ticket) => {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = `?ticket=${encodeURIComponent(ticket)}`;
  return `${scheme}//${window.location.host}${agentPath(status, id, path)}${query}`;
};

/**
 * The host shell as a terminal source: the route that starts the
 * session, the route that stops it, the socket's path from the session
 * row and the machine its ticket is bound to, none for a host shell.
 */
export const HOST_SHELL = {
  key: 'host-shell',
  start: startTerminal,
  stop: stopTerminal,
  socketPath: session => `term/${session.id}`,
  ticketMachine: '',
};
