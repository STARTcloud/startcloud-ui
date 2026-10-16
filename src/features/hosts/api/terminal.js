import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

import { sshSocketPath, startSshSession, stopSshSession } from './consoleAPI';

const listOf = data => {
  if (Array.isArray(data)) {
    return data;
  }
  return Array.isArray(data?.sessions) ? data.sessions : [];
};

/**
 * Start a host terminal session, `POST term/start` at the path the role
 * fixes; the answer is the session, its `id` the session.
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
 * Every host terminal session the agent holds, `GET term/sessions`,
 * each `{ id, status, shell, created_by, created_at, last_activity }`,
 * `created_by` the name of the key that started it, some agents nesting
 * them under `sessions`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The sessions
 */
export const listTermSessions = (status, id) =>
  client.get(agentPath(status, id, 'term/sessions')).then(listOf);

/**
 * Every SSH session the agent holds, `GET ssh/sessions`, each `{ id,
 * machine_name, status, ssh_host, ssh_port, ssh_username, created_by,
 * created_at, last_activity }`, some agents nesting them under `sessions`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The sessions
 */
export const listSshSessions = (status, id) =>
  client.get(agentPath(status, id, 'ssh/sessions')).then(listOf);

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
 * session, the route that stops it, the socket's path from the session,
 * the machine its ticket is bound to, none for a host shell, and `hello`,
 * the bytes sent once the socket opens, a newline that prompts the shell.
 */
export const HOST_SHELL = {
  key: 'host_shell',
  start: startTerminal,
  stop: stopTerminal,
  socketPath: session => `term/${session.id}`,
  ticketMachine: '',
  hello: '\n',
};

/**
 * The SSH shell of one machine as a terminal source: `POST
 * machines/{name}/ssh/start` with the candidate address `ipIndex` names,
 * `DELETE ssh/sessions/{id}/stop`, the socket at `ssh/{id}` with a ticket
 * bound to the machine, and nothing sent as it opens, the agent's own
 * connecting line filling the first screen.
 *
 * @param {string} name - The machine name
 * @param {number} [ipIndex] - The candidate address to target, 0-based
 * @returns {Object} The source
 */
export const sshShell = (name, ipIndex = 0) => ({
  key: 'ssh',
  start: (status, id) => startSshSession(status, id, name, ipIndex),
  stop: stopSshSession,
  socketPath: session => sshSocketPath(session.id),
  ticketMachine: name,
  hello: '',
});
