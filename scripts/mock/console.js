import { randomUUID } from 'crypto';

import { ROLE_STATUS, featuresOf, machineOf, rowOf } from './fleet.js';
import { AGENT_MODE, now, ok, problem, refusal } from './kit.js';
import { openSocket } from './socket.js';
import { openShell } from './terminal.js';

const VRDE_BASE = 3389;
const WEB_BASE = 6080;
const SSH_USER = 'vagrant';
const NOT_RUNNING = { hyperweaver: 'Machine is not running', zoneweaver: 'Zone is not running' };
const MISSING = { hyperweaver: 'Machine not found', zoneweaver: 'Zone not found' };

const stores = new Map();

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, { vnc: new Map(), zlogin: new Map(), ssh: new Map() });
  }
  return stores.get(host.id);
};

const isZone = host => host.kind === 'zoneweaver';

const consolesOf = host =>
  (AGENT_MODE ? ROLE_STATUS.console : rowOf(host)?.capabilities?.console) || [];

const offersConsole = (host, token) => consolesOf(host).includes(token);

const offersFeature = (host, token) => featuresOf(host).includes(token);

const nameOf = ctx => decodeURIComponent(ctx.params.name);

const indexOf = (host, row) => host.machines.findIndex(entry => entry.name === row.name);

const addressOf = (host, index) => `192.168.${(Number(host.id) || 0) + 10}.${index + 20}`;

const behind = (offered, handler) => ctx =>
  offered(ctx.host) ? handler(ctx) : problem(404, 'Not Found');

const found = handler => ctx => {
  const row = machineOf(ctx.host, nameOf(ctx));
  return row ? handler({ ...ctx, row }) : refusal(404, MISSING[ctx.host.kind]);
};

const running = handler => ctx =>
  ctx.row.status === 'running' ? handler(ctx) : refusal(400, NOT_RUNNING[ctx.host.kind]);

const shellSession = ({ id, machine, by }) => ({
  id,
  machine_name: machine,
  by,
  status: 'active',
  created_at: now(),
  last_activity: now(),
  buffer: '',
  line: '',
  connection: null,
});

const vncInfo = ({ host, row }) => {
  const index = indexOf(host, row);
  return ok({
    machine_name: row.name,
    vrde_enabled: true,
    vrde_port: VRDE_BASE + index,
    vnc_capable: true,
    running: row.status === 'running',
    websocket_url: `/machines/${encodeURIComponent(row.name)}/vnc/websockify`,
    video: { width: 1024, height: 768, depth: 32 },
    additions_run_level: row.status === 'running' ? 2 : 0,
  });
};

const vncStart = ({ host, row }) => {
  const { vnc } = storeOf(host);
  const session = vnc.get(row.name) || {
    id: randomUUID(),
    machine_name: row.name,
    web_port: WEB_BASE + indexOf(host, row),
    vnc_port: 5900 + indexOf(host, row),
    status: 'active',
    created_at: now(),
  };
  vnc.set(row.name, session);
  return ok({ success: true, message: `VNC session started for ${row.name}`, ...session });
};

const vncSessionInfo = ({ host, row }) => {
  const session = storeOf(host).vnc.get(row.name) || null;
  return ok({
    machine_name: row.name,
    active_vnc_session: Boolean(session),
    vnc_session_info: session,
  });
};

const vncStop = ({ host, row }) => {
  const { vnc } = storeOf(host);
  if (!vnc.has(row.name)) {
    return refusal(404, 'No active VNC session');
  }
  vnc.delete(row.name);
  return ok({ success: true, message: `VNC session stopped for ${row.name}` });
};

const vncSessions = ctx => {
  const sessions = [...storeOf(ctx.host).vnc.values()];
  return ok({ sessions, total: sessions.length });
};

const zloginSessions = ctx => {
  const sessions = [...storeOf(ctx.host).zlogin.values()].map(
    ({ id, machine_name, status, created_at, last_activity }) => ({
      id,
      machine_name,
      status,
      created_at,
      last_activity,
    })
  );
  return ok(sessions);
};

const zloginStart = ({ host, row, person }) => {
  const { zlogin } = storeOf(host);
  const session = shellSession({ id: randomUUID(), machine: row.name, by: person.username });
  zlogin.set(session.id, session);
  return ok({
    success: true,
    session: {
      id: session.id,
      machine_name: session.machine_name,
      status: session.status,
      created_at: session.created_at,
    },
  });
};

const zloginStop = ctx => {
  const { zlogin } = storeOf(ctx.host);
  const session = zlogin.get(ctx.params.session);
  if (!session) {
    return refusal(404, 'Zlogin session not found');
  }
  session.connection?.close();
  zlogin.delete(session.id);
  return ok({ success: true, message: 'Zlogin session stopped' });
};

const sshStart = ({ host, row, body, person }) => {
  const index = indexOf(host, row);
  const candidates = [addressOf(host, index), '127.0.0.1'];
  const ipIndex = Number.isInteger(body.ip_index) ? body.ip_index : 0;
  if (ipIndex < 0 || ipIndex >= candidates.length) {
    return refusal(400, `ip_index out of range`, { ip_candidates: candidates });
  }
  const session = shellSession({ id: randomUUID(), machine: row.name, by: person.username });
  storeOf(host).ssh.set(session.id, session);
  return ok({
    id: session.id,
    machine_name: row.name,
    ssh_host: candidates[ipIndex],
    ssh_port: 22,
    ssh_username: SSH_USER,
    ip_candidates: candidates,
    ip_index: ipIndex,
    status: session.status,
    created_at: session.created_at,
  });
};

const sshStop = ctx => {
  const { ssh } = storeOf(ctx.host);
  const session = ssh.get(ctx.params.session);
  if (!session) {
    return refusal(404, 'SSH session not found');
  }
  session.connection?.close();
  ssh.delete(session.id);
  return ok({ success: true, message: 'SSH session stopped' });
};

const rdpInfo = ({ host, row }) => {
  const index = indexOf(host, row);
  const guest = addressOf(host, index);
  return ok({
    machine_name: row.name,
    targets: [
      {
        type: 'console',
        host: '127.0.0.1',
        port: VRDE_BASE + index,
        rdp_url: `rdp://127.0.0.1:${VRDE_BASE + index}`,
        description: 'VRDE console on the agent host',
      },
      {
        type: 'guest',
        host: guest,
        port: 3389,
        rdp_url: `rdp://${guest}:3389`,
        description: "The guest's own RDP server",
      },
    ],
  });
};

const launched = word => ctx =>
  ok({ success: true, machine_name: ctx.row.name, message: `${word} opened on the agent host` });

const ftpInfo = ({ host, row }) => {
  const index = indexOf(host, row);
  return ok({
    machine_name: row.name,
    sftp_url: `sftp://${SSH_USER}@127.0.0.1:${2222 + index}`,
    host: '127.0.0.1',
    port: 2222 + index,
    username: SSH_USER,
  });
};

const sessionSocket =
  kind =>
  ({ req, socket, host, params }) => {
    const session = storeOf(host)[kind].get(params.session);
    if (!session) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    openShell({ req, socket, host, session });
  };

const closedSocket = ({ req, socket }) => {
  const connection = openSocket({ req, socket, onText: () => undefined, onClose: () => undefined });
  connection.close();
};

/**
 * The machine a console socket's ticket must be bound to: the session's
 * machine for a zlogin or SSH socket and the route's machine for the VNC
 * websockify and the RDP bridge; empty for a socket that is none of them.
 *
 * @param {Object} host - The host
 * @param {Object} params - The socket route's parameters
 * @returns {string} The machine name, empty when the socket is not a console's
 */
export const consoleSocketMachine = (host, params) => {
  if (params.name) {
    return decodeURIComponent(params.name);
  }
  const store = storeOf(host);
  const session = store.zlogin.get(params.session) || store.ssh.get(params.session);
  return session ? session.machine_name : '';
};

/**
 * The consoles of a machine on both agents, each answering as the agent
 * of the host's kind does. VNC behind the `vnc` console token:
 * `GET machines/{name}/vnc`, hyperweaver-agent's remote display facts,
 * `vrde_enabled` among them, 404 on the zoneweaver kind, whose
 * `POST machines/{name}/vnc/start` answers a session row, refused while
 * the zone does not run; `GET machines/{name}/vnc/info` answers
 * `active_vnc_session` with the session on both kinds; `vnc/stop` ends
 * it; `GET vnc/sessions` lists them. zlogin behind `zlogin`:
 * `GET zlogin/sessions`, `POST machines/{name}/zlogin/start`, answered
 * nested under `session`, and `DELETE zlogin/sessions/{id}/stop`. SSH
 * behind the `ssh` feature: `POST machines/{name}/ssh/start` answers the
 * session row with the guest's candidate addresses, an `ip_index` out
 * of range refused with them, and `DELETE ssh/sessions/{id}/stop` ends
 * it. RDP behind `rdp`: `GET machines/{name}/rdp` answers the console
 * and guest targets of a running machine. The launchers behind
 * `host-launchers`: `open-rdp`, `open-directory`, `open-ftp` and
 * `GET machines/{name}/ftp`. The sockets: `zlogin/{id}` and `ssh/{id}`
 * are the terminal's line shell on the session, and
 * `machines/{name}/vnc/websockify` and `machines/{name}/rdp-bridge` are
 * accepted and closed at once, no display standing behind the mock.
 *
 * @param {Object} router - `agentRoute` and `socketRoute`
 * @returns {void}
 */
export const mountConsoles = ({ agentRoute, socketRoute }) => {
  const vnc = handler => behind(host => offersConsole(host, 'vnc'), found(handler));
  const zlogin = handler => behind(host => offersConsole(host, 'zlogin'), handler);
  const ssh = handler => behind(host => offersFeature(host, 'ssh'), handler);
  const rdp = handler => behind(host => offersConsole(host, 'rdp'), found(handler));
  const launcher = handler => behind(host => offersFeature(host, 'host-launchers'), found(handler));
  agentRoute(
    'GET',
    'machines/:name/vnc',
    behind(host => !isZone(host), found(vncInfo))
  );
  agentRoute('POST', 'machines/:name/vnc/start', behind(isZone, found(running(vncStart))));
  agentRoute('GET', 'machines/:name/vnc/info', vnc(vncSessionInfo));
  agentRoute('DELETE', 'machines/:name/vnc/stop', vnc(vncStop));
  agentRoute(
    'GET',
    'vnc/sessions',
    behind(host => offersConsole(host, 'vnc'), vncSessions)
  );
  agentRoute('GET', 'zlogin/sessions', zlogin(zloginSessions));
  agentRoute('POST', 'machines/:name/zlogin/start', zlogin(found(running(zloginStart))));
  agentRoute('DELETE', 'zlogin/sessions/:session/stop', zlogin(zloginStop));
  agentRoute('POST', 'machines/:name/ssh/start', ssh(found(running(sshStart))));
  agentRoute('DELETE', 'ssh/sessions/:session/stop', ssh(sshStop));
  agentRoute('GET', 'machines/:name/rdp', rdp(running(rdpInfo)));
  agentRoute('POST', 'machines/:name/open-rdp', launcher(running(launched('RDP client'))));
  agentRoute('POST', 'machines/:name/open-directory', launcher(launched('File manager')));
  agentRoute('POST', 'machines/:name/open-ftp', launcher(launched('SFTP client')));
  agentRoute('GET', 'machines/:name/ftp', launcher(ftpInfo));
  socketRoute('zlogin/:session', sessionSocket('zlogin'));
  socketRoute('ssh/:session', sessionSocket('ssh'));
  socketRoute('machines/:name/vnc/websockify', closedSocket);
  socketRoute('machines/:name/rdp-bridge', closedSocket);
};
