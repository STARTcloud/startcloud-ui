import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const machinePath = (status, id, name, rest = '') =>
  agentPath(status, id, `machines/${encodeURIComponent(name)}${rest}`);

const sessionsOf = data => {
  if (Array.isArray(data)) {
    return data;
  }
  return Array.isArray(data?.sessions) ? data.sessions : [];
};

/**
 * Start a VNC console session of one machine, `POST machines/{name}/vnc/start`,
 * zoneweaver-agent's session model, answered the session row.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The session row
 */
export const startVncSession = (status, id, name) =>
  client.post(machinePath(status, id, name, '/vnc/start'));

/**
 * The VNC session of one machine, `GET machines/{name}/vnc/info`,
 * `{ active_vnc_session, vnc_session_info }`, the info carrying
 * `web_port`, `created_at` and `status`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The session's state
 */
export const fetchVncSessionInfo = (status, id, name) =>
  client.get(machinePath(status, id, name, '/vnc/info'));

/**
 * Stop the VNC console session of one machine, `DELETE machines/{name}/vnc/stop`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const stopVncSession = (status, id, name) =>
  client.delete(machinePath(status, id, name, '/vnc/stop'));

/**
 * Every VNC session of a host, `GET vnc/sessions`, narrowed by `filters`,
 * `status` and `machine_name`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [filters] - `status` and `machine_name`
 * @returns {Promise<Array<Object>>} The session rows
 */
export const fetchVncSessions = (status, id, filters = {}) =>
  client.get(agentPath(status, id, 'vnc/sessions'), { params: filters }).then(sessionsOf);

/**
 * The VNC facts of one machine, `GET machines/{name}/vnc`, hyperweaver-agent's
 * `{ vrde_enabled, vrde_port, vnc_capable, running, websocket_url, video,
 * additions_run_level }`: an answer that carries `vrde_enabled` is the
 * direct websockify model, VirtualBox's remote display being the console
 * with no session to start; any other answer means the session model.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The facts
 */
export const fetchVncInfo = (status, id, name) => client.get(machinePath(status, id, name, '/vnc'));

/**
 * Every zlogin session of a host, `GET zlogin/sessions`, each row its
 * `id`, `machine_name`, `status` and `created_at`; some agents nest the
 * rows under `sessions`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [filters] - `status` and `machine_name`
 * @returns {Promise<Array<Object>>} The session rows
 */
export const fetchZloginSessions = (status, id, filters = {}) =>
  client.get(agentPath(status, id, 'zlogin/sessions'), { params: filters }).then(sessionsOf);

/**
 * One zlogin session, `GET zlogin/sessions/{sessionId}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} sessionId - The session's id
 * @returns {Promise<Object>} The session row
 */
export const fetchZloginSession = (status, id, sessionId) =>
  client.get(agentPath(status, id, `zlogin/sessions/${encodeURIComponent(sessionId)}`));

/**
 * Stop one zlogin session, `DELETE zlogin/sessions/{sessionId}/stop`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} sessionId - The session's id
 * @returns {Promise<Object>} The agent's answer
 */
export const stopZloginSession = (status, id, sessionId) =>
  client.delete(agentPath(status, id, `zlogin/sessions/${encodeURIComponent(sessionId)}/stop`));

/**
 * Start a zlogin session of one zone, hyperweaver-ui's start: the
 * session the host already holds of the zone, read from
 * `GET zlogin/sessions`, is stopped first, then
 * `POST machines/{name}/zlogin/start` answers the session row, some
 * agents nesting it under `session`; the socket's path is derived from
 * the row's `id` by the caller.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The zone name
 * @returns {Promise<Object>} The session row
 */
export const startZloginSession = async (status, id, name) => {
  const existing = (await fetchZloginSessions(status, id)).find(
    session => session.machine_name === name
  );
  if (existing) {
    await stopZloginSession(status, id, existing.id);
  }
  const answer = await client.post(machinePath(status, id, name, '/zlogin/start'));
  return answer?.session || answer;
};

/**
 * Start an SSH session against one running machine,
 * `POST machines/{name}/ssh/start`, answered the session row, `{ id,
 * machine_name, ssh_host, ssh_port, ssh_username, ip_candidates,
 * ip_index }`; `ipIndex` picks among the guest's candidate addresses,
 * sent as `ip_index` when it is not the first.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {number} [ipIndex] - The candidate address to target, 0-based
 * @returns {Promise<Object>} The session row
 */
export const startSshSession = (status, id, name, ipIndex = 0) =>
  client.post(
    machinePath(status, id, name, '/ssh/start'),
    Number.isInteger(ipIndex) && ipIndex > 0 ? { ip_index: ipIndex } : undefined
  );

/**
 * Stop one SSH session, `DELETE ssh/sessions/{sessionId}/stop`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} sessionId - The session's id
 * @returns {Promise<Object>} The agent's answer
 */
export const stopSshSession = (status, id, sessionId) =>
  client.delete(agentPath(status, id, `ssh/sessions/${encodeURIComponent(sessionId)}/stop`));

/**
 * The RDP targets of one running machine, `GET machines/{name}/rdp`,
 * `{ machine_name, targets: [{ type, host, port, rdp_url, description }] }`,
 * `type` `console` for the hypervisor's remote display and `guest` for
 * the guest's own; a machine with no target answers 400.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The targets
 */
export const fetchRdpInfo = (status, id, name) => client.get(machinePath(status, id, name, '/rdp'));

/**
 * Open the agent host's own RDP client at one machine,
 * `POST machines/{name}/open-rdp`, behind `host-launchers`; `target`
 * `console` or `guest`, the agent's default when none is given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} [target] - `console` or `guest`
 * @returns {Promise<Object>} The agent's answer
 */
export const openRdp = (status, id, name, target = '') =>
  client.post(machinePath(status, id, name, '/open-rdp'), target ? { target } : {});

/**
 * Open one machine's working directory in the agent host's file manager,
 * `POST machines/{name}/open-directory`, behind `host-launchers`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const openDirectory = (status, id, name) =>
  client.post(machinePath(status, id, name, '/open-directory'));

/**
 * Open the agent host's own sftp handler at one machine,
 * `POST machines/{name}/open-ftp`, behind `host-launchers`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const openFtp = (status, id, name) =>
  client.post(machinePath(status, id, name, '/open-ftp'));

/**
 * The SFTP address of one machine for the browser's own handler,
 * `GET machines/{name}/ftp`, `{ sftp_url, host, port, username }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The address
 */
export const fetchFtpInfo = (status, id, name) => client.get(machinePath(status, id, name, '/ftp'));

/**
 * The socket path of a machine's VNC console, `machines/{name}/vnc/websockify`,
 * the one path both models ride, the agent proxying its display behind it.
 *
 * @param {string} name - The machine name
 * @returns {string} The agent path
 */
export const vncSocketPath = name => `machines/${encodeURIComponent(name)}/vnc/websockify`;

/**
 * The socket path of a zlogin session, `zlogin/{sessionId}`.
 *
 * @param {string} sessionId - The session's id
 * @returns {string} The agent path
 */
export const zloginSocketPath = sessionId => `zlogin/${encodeURIComponent(sessionId)}`;

/**
 * The socket path of an SSH session, `ssh/{sessionId}`.
 *
 * @param {string} sessionId - The session's id
 * @returns {string} The agent path
 */
export const sshSocketPath = sessionId => `ssh/${encodeURIComponent(sessionId)}`;

/**
 * The socket path of the RDP bridge of a machine, `machines/{name}/rdp-bridge`.
 *
 * @param {string} name - The machine name
 * @returns {string} The agent path
 */
export const rdpBridgePath = name => `machines/${encodeURIComponent(name)}/rdp-bridge`;

/**
 * The query the RDP bridge's socket URL ends in for the guest's own RDP
 * server in place of the hypervisor's remote display, `&target=guest`
 * after the ticket, and nothing for the display itself.
 *
 * @param {string} target - `console` or `guest`
 * @returns {string} The query to append
 */
export const rdpTargetQuery = target => (target === 'guest' ? '&target=guest' : '');
