import { mountAgentSettings } from './agent-settings.js';
import { mountArtifacts } from './artifacts.js';
import { mountCatalog } from './catalog.js';
import { consoleSocketMachine, mountConsoles } from './console.js';
import { mountDevices } from './devices.js';
import { mountFiles } from './files.js';
import {
  ATTIC_ID,
  REGISTRY,
  featuresOf,
  hostFor,
  hosts,
  labelOf,
  machineOrgsOf,
  rowOf,
  setOnline,
  statsOf,
} from './fleet.js';
import { logStreamSocket, mountHostSections } from './host-sections.js';
import { notifyAdmins } from './inbox.js';
import { AGENT_MODE, ok } from './kit.js';
import { mountMachineCreate } from './machine-create.js';
import { listedRow, mountMachineDetail } from './machine-detail.js';
import { mountMachineMetrics } from './machine-metrics.js';
import { mountMachineProvisioning } from './machine-provisioning.js';
import { mountMachineSettings } from './machine-settings.js';
import { mountMachineTools } from './machine-tools.js';
import { mountMachines } from './machines.js';
import { mountManage } from './manage.js';
import { mountMonitoring } from './monitoring.js';
import { mountNetworking } from './networking.js';
import { isAdmin, orgUuidsOf } from './people.js';
import { mountPower } from './power.js';
import { serverKeyOf } from './registry.js';
import { mountScreenshot } from './screenshot.js';
import { refuseSocket } from './socket.js';
import { mountStorage } from './storage.js';
import { broadcast } from './stream.js';
import { cancelledTask, listedTasks, openTaskStream, shownOutput, shownTask } from './tasks.js';
import { mountTerminal, openShell, ticketMachineOf } from './terminal.js';

const FLAP_MS = 120 * 1000;

const visibleTo = person => row => {
  if (isAdmin(person) || row.org_uuids.length === 0) {
    return [row];
  }
  const own = orgUuidsOf(person);
  const shared = row.org_uuids.filter(uuid => own.includes(uuid));
  return shared.length > 0 ? [{ ...row, org_uuids: shared }] : [];
};

const withKey = ctx => row =>
  ctx.url.searchParams.get('includeApiKeys') === 'true' && isAdmin(ctx.person)
    ? { ...row, api_key: serverKeyOf(row.id) }
    : row;

const servers = ctx =>
  ok({ success: true, servers: REGISTRY.flatMap(visibleTo(ctx.person)).map(withKey(ctx)) });

const ownedOf = ({ person, host }, row) => {
  const owners = machineOrgsOf(host, row.name);
  const own = orgUuidsOf(person);
  return isAdmin(person) ? owners : owners.filter(uuid => own.includes(uuid));
};

const decorated = ctx => {
  const rows = ctx.host.machines.map(row => listedRow(ctx.host, row));
  return AGENT_MODE ? rows : rows.map(row => ({ ...row, org_uuids: ownedOf(ctx, row) }));
};

const machines = ctx => ok({ machines: decorated(ctx), total: ctx.host.machines.length });

const agentStatus = ctx => {
  const { host } = ctx;
  const row = rowOf(host)?.capabilities || {};
  return ok({ role: 'agent', ...row, features: featuresOf(host), uptime: statsOf(host).uptime });
};

const shellSocket = ({ req, socket, host, params }) => {
  const session = host.terminals.get(params.session);
  if (!session) {
    refuseSocket(socket, '404 Not Found');
    return;
  }
  openShell({ req, socket, host, session });
};

const taskSocket = ({ req, socket, host, params }) => {
  const task = host.tasks.find(entry => entry.id === params.task);
  if (!task) {
    refuseSocket(socket, '404 Not Found');
    return;
  }
  openTaskStream({ req, socket, host, task });
};

/**
 * The machine a socket's ticket must be bound to: the task's machine for
 * a task stream, the console's machine for a console socket, none for
 * the stream of a host-level task and for the host's shell.
 *
 * @param {Object} host - The host
 * @param {Object} params - The socket route's parameters
 * @returns {string} The machine name, empty for an unbound ticket
 */
export const socketMachine = (host, params) => {
  const task = params.task ? host.tasks.find(entry => entry.id === params.task) : null;
  if (task) {
    return ticketMachineOf(task);
  }
  return consoleSocketMachine(host, params);
};

const flap = () => {
  const host = hostFor(ATTIC_ID);
  const label = labelOf(host);
  const online = !host.online;
  setOnline(host, online);
  broadcast('hosts', 'servers-updated', {});
  notifyAdmins({
    title: online ? `Host ${label} answers again` : `Host ${label} is unreachable`,
    body: online ? 'Its agent was reached on the last try.' : 'Its agent did not answer.',
    type: 'ALERT',
    severity: online ? 'SUCCESS' : 'CRITICAL',
    navigate: `/hosts/${host.id}`,
  });
};

/**
 * On the server role one host, Attic, comes and goes every two minutes:
 * its registry row gains and loses its capabilities, `servers-updated` is
 * sent on the `hosts` topic and every admin gets a notification, so the
 * list of servers, the tree and the unread count move by push.
 *
 * @returns {void}
 */
export const startFlapping = () => {
  if (!AGENT_MODE) {
    setInterval(flap, FLAP_MS).unref();
  }
};

/**
 * The hosts feature's routes: the registry on the server role, each row
 * shown to the people of its organizations and to every admin, and the
 * agent routes of every host, its stats, machines (each row the one the
 * agent of the host's kind answers and carrying `org_uuids` on the
 * server role, the machine's organizations an admin reads whole and
 * every other person reads their own of), status, the reads of its
 * Overview and its charts, the reads of its networking page, the ZFS
 * management of its storage page and the reads of its devices page, tasks,
 * the reads and the writes of the
 * machine page, the tools of a machine, the create wizard's feeds and its
 * `POST machines`, mounted before the machine's own routes so
 * `machines/defaults` and `machines/ostypes` are not taken for a
 * machine's name, its provisioning, its Settings page and the reads of its charts,
 * the system group of its Manage page with its file system and its
 * artifact storage, the syslog, logs, ARC, boot environments, faults,
 * database and repositories sections of that page, the screen of a
 * machine, power routes, terminal and the consoles of a machine, with
 * the sockets of the shell, the task streams, the log streams and the
 * consoles, and the Agent settings page's routes with the agent's own
 * sign-ins. The registry carries each row's API key for an admin who
 * asks `includeApiKeys`.
 *
 * @param {Object} router - `publicRoute`, `sessionRoute`, `agentRoute` and `socketRoute`
 * @returns {void}
 */
export const mountAgents = ({ publicRoute, sessionRoute, agentRoute, socketRoute }) => {
  if (!AGENT_MODE) {
    sessionRoute('GET', '/api/servers', servers);
  }
  mountAgentSettings({ publicRoute, sessionRoute, agentRoute });
  agentRoute('GET', 'stats', ctx => ok(statsOf(ctx.host)));
  agentRoute('GET', 'machines', machines);
  agentRoute('GET', 'api/status', agentStatus);
  mountMonitoring(agentRoute);
  mountNetworking(agentRoute);
  mountStorage(agentRoute);
  mountDevices(agentRoute);
  agentRoute('GET', 'tasks', listedTasks);
  agentRoute('GET', 'tasks/:task', shownTask);
  agentRoute('GET', 'tasks/:task/output', shownOutput);
  agentRoute('DELETE', 'tasks/:task', cancelledTask);
  mountManage(agentRoute);
  mountHostSections(agentRoute);
  mountFiles(agentRoute);
  mountArtifacts(agentRoute);
  mountCatalog(agentRoute);
  mountMachines(agentRoute);
  mountMachineCreate({ sessionRoute, agentRoute });
  mountMachineDetail(agentRoute);
  mountMachineTools(agentRoute);
  mountMachineProvisioning(agentRoute);
  mountMachineSettings({ sessionRoute, agentRoute }, hosts);
  mountMachineMetrics(agentRoute);
  mountScreenshot(agentRoute);
  mountPower(agentRoute);
  mountTerminal(agentRoute);
  mountConsoles({ agentRoute, socketRoute });
  socketRoute('term/:session', shellSocket);
  socketRoute('tasks/:task/stream', taskSocket);
  socketRoute('logs/stream/:session', logStreamSocket);
};
