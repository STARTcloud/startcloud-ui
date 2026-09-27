import {
  ATTIC_ID,
  REGISTRY,
  featuresOf,
  hostFor,
  labelOf,
  machineOrgsOf,
  rowOf,
  setOnline,
  statsOf,
} from './fleet.js';
import { notifyAdmins } from './inbox.js';
import { AGENT_MODE, ok } from './kit.js';
import { mountMachines } from './machines.js';
import { mountMonitoring } from './monitoring.js';
import { isAdmin, orgUuidsOf } from './people.js';
import { mountPower } from './power.js';
import { refuseSocket } from './socket.js';
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

const servers = ctx => ok({ success: true, servers: REGISTRY.flatMap(visibleTo(ctx.person)) });

const ownedOf = ({ person, host }, row) => {
  const owners = machineOrgsOf(host, row.name);
  const own = orgUuidsOf(person);
  return isAdmin(person) ? owners : owners.filter(uuid => own.includes(uuid));
};

const decorated = ctx =>
  AGENT_MODE
    ? ctx.host.machines
    : ctx.host.machines.map(row => ({ ...row, org_uuids: ownedOf(ctx, row) }));

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
 * a task stream, none for the stream of a host-level task and for the
 * host's shell.
 *
 * @param {Object} host - The host
 * @param {Object} params - The socket route's parameters
 * @returns {string} The machine name, empty for an unbound ticket
 */
export const socketMachine = (host, params) => {
  const task = params.task ? host.tasks.find(entry => entry.id === params.task) : null;
  return task ? ticketMachineOf(task) : '';
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
 * agent routes of every host, its stats, machines (each row carrying
 * `org_uuids` on the server role, the machine's organizations an admin
 * reads whole and every other person reads their own of), status, the reads of
 * its Overview and its charts, tasks, power routes and terminal, with
 * the two sockets.
 *
 * @param {Object} router - `sessionRoute`, `agentRoute` and `socketRoute`
 * @returns {void}
 */
export const mountAgents = ({ sessionRoute, agentRoute, socketRoute }) => {
  if (!AGENT_MODE) {
    sessionRoute('GET', '/api/servers', servers);
  }
  agentRoute('GET', 'stats', ctx => ok(statsOf(ctx.host)));
  agentRoute('GET', 'machines', machines);
  agentRoute('GET', 'api/status', agentStatus);
  mountMonitoring(agentRoute);
  agentRoute('GET', 'tasks', listedTasks);
  agentRoute('GET', 'tasks/:task', shownTask);
  agentRoute('GET', 'tasks/:task/output', shownOutput);
  agentRoute('DELETE', 'tasks/:task', cancelledTask);
  mountMachines(agentRoute);
  mountPower(agentRoute);
  mountTerminal(agentRoute);
  socketRoute('term/:session', shellSocket);
  socketRoute('tasks/:task/stream', taskSocket);
};
