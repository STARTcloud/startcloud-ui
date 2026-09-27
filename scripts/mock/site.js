import { CONFIG_NAMES } from './config-data.js';
import { ROLE_STATUS, hosts, labelOf } from './fleet.js';
import { AGENT_MODE, empty, missing, now, ok, uniqueOf } from './kit.js';
import {
  ROLE_NAMES,
  hashOf,
  isAdmin,
  membershipsOf,
  organizations,
  people,
  personById,
} from './people.js';
import { RULES } from './rules.js';
import { TOPICS, broadcast, closeStreamsOf, publish } from './stream.js';

const HEALTH_MS = 45 * 1000;
const GIB = 1024 ** 3;
const SHARED_FEATURES = [
  'local-accounts',
  'setup',
  'admin',
  'org-console',
  'discover',
  'invitations',
  'favorites',
  'notifications',
  'search',
  'health',
  'events',
];
const SERVER_SERVICES = { database: 'ok', agents: 'ok', mail: 'ok', tasks: 'ok', storage: 'ok' };
const AGENT_SERVICES = { database: 'ok', hypervisor: 'ok', tasks: 'ok', storage: 'ok' };
const SERVER_PHASES = [
  { agents: 'warning: 1 of 6 unreachable' },
  { storage: 'warning: 91% used', agents: 'warning: 1 of 6 unreachable' },
  { mail: 'error: connection refused' },
  {},
];
const AGENT_PHASES = [
  {},
  { tasks: 'warning: 3 waiting' },
  { hypervisor: 'error: not answering', tasks: 'warning: 3 waiting' },
  { storage: 'warning: 88% used' },
];
const AVATARS = {
  [hashOf('hello@acme.example.com')]: '/brand/moonshinedev/mark.svg',
  [hashOf('jlee@example.com')]: '/brand/nomadservices/mark.svg',
};

const phases = AGENT_MODE ? AGENT_PHASES : SERVER_PHASES;
const steady = AGENT_MODE ? AGENT_SERVICES : SERVER_SERVICES;
const health = { phase: 0 };

/**
 * The status payload of the role the mock stands in for: the role's
 * fixture with every token of the shared chrome a hyperweaver backend can
 * answer, the links, the repository and the changelog of the About page,
 * the config file names and the topics of the one event stream.
 */
export const STATUS = {
  ...ROLE_STATUS,
  brand: {
    ...ROLE_STATUS.brand,
    repo: 'https://github.com/example/hyperweaver',
    changelog: 'https://github.com/example/hyperweaver/releases',
  },
  features: uniqueOf([...ROLE_STATUS.features, ...SHARED_FEATURES]),
  links: {
    docs: 'https://docs.example.com/hyperweaver',
    contact: 'mailto:support@example.com',
    api: 'https://docs.example.com/hyperweaver/api',
    community: [
      { label: 'Sponsor Hyperweaver', url: 'https://sponsors.example.com/hyperweaver' },
      { label: 'Community forum', url: 'https://forum.example.com/hyperweaver' },
    ],
  },
  ticket: null,
  config: CONFIG_NAMES,
  events: { path: '/api/events', topics: TOPICS },
};

const TICKET = {
  enabled: true,
  base_url: 'https://support.example.com/tickets/new?source=hyperweaver',
  req_type: 'sso',
  fallback_customer_id: 'A1B2C3',
  context: `${STATUS.role}|${STATUS.version}`,
};

const worst = services => {
  const words = Object.values(services);
  if (words.some(word => word.startsWith('error'))) {
    return 'error';
  }
  return words.some(word => word.startsWith('warning')) ? 'warning' : 'ok';
};

const healthNow = () => {
  const services = { ...steady, ...phases[health.phase % phases.length] };
  return { status: worst(services), timestamp: now(), services };
};

const moveHealth = () => {
  health.phase += 1;
  broadcast('health', 'health', healthNow());
};

/**
 * The health of the mock moves: every 45 seconds the services take the
 * next of four states, ok, warning and error mixed, and the new state is
 * sent on the `health` topic in the shape `GET /api/health` answers.
 *
 * @returns {void}
 */
export const startHealth = () => {
  setInterval(moveHealth, HEALTH_MS).unref();
};

const clientErrors = ctx => {
  (Array.isArray(ctx.body.entries) ? ctx.body.entries : []).forEach(entry => {
    console.log(`client error [${entry.category}] ${entry.url}: ${entry.message}`);
  });
  return empty(204);
};

const gravatar = ctx => {
  const url = AVATARS[ctx.params.hash];
  return url ? ok({ hash: ctx.params.hash, avatar_url: url }) : missing('No such profile.');
};

const result = ({ kind, org = '', name, title, subtitle, matched }) => ({
  kind,
  collection: '',
  org,
  name,
  version: '',
  provider: '',
  architecture: '',
  title,
  subtitle,
  matched,
});

const organizationRows = person =>
  membershipsOf(person)
    .filter(entry => organizations.has(entry.org))
    .map(entry => organizations.get(entry.org))
    .map(org => ({
      texts: [org.name, org.display_name, org.description],
      row: result({
        kind: 'organization',
        org: org.name,
        name: org.name,
        title: org.display_name,
        subtitle: org.description,
        matched: org.name,
      }),
    }));

const userRows = person =>
  (isAdmin(person) ? [...people.values()] : []).map(user => ({
    texts: [user.username, user.name, user.email],
    row: result({
      kind: 'user',
      name: user.username,
      title: user.name,
      subtitle: user.email,
      matched: user.username,
    }),
  }));

const hostRows = () =>
  [...hosts.values()].map(host => ({
    texts: [labelOf(host), host.facts.hostname || ''],
    row: result({
      kind: 'host',
      name: String(host.id),
      title: labelOf(host),
      subtitle: `${host.kind} · ${host.machines.length} machines`,
      matched: labelOf(host),
    }),
  }));

const machineRows = () =>
  [...hosts.values()].flatMap(host =>
    host.machines.map(machine => ({
      texts: [machine.name, machine.notes || ''],
      row: result({
        kind: 'machine',
        name: machine.name,
        title: machine.name,
        subtitle: `${machine.status} on ${labelOf(host)}`,
        matched: machine.name,
      }),
    }))
  );

const taskRows = () =>
  [...hosts.values()].flatMap(host =>
    host.tasks.map(task => ({
      texts: [task.operation, task.machine_name, task.error_message || ''],
      row: result({
        kind: 'task',
        name: task.id,
        title: `${task.operation} ${task.machine_name}`,
        subtitle: `${task.status} on ${labelOf(host)}`,
        matched: task.operation,
      }),
    }))
  );

const hits = (rows, needle) =>
  rows
    .filter(entry => entry.texts.some(text => String(text).toLowerCase().includes(needle)))
    .map(entry => entry.row);

const everyRow = person => [
  organizationRows(person),
  userRows(person),
  hostRows(),
  machineRows(),
  taskRows(),
];

const searched = ctx => {
  const { person, url } = ctx;
  const query = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit')) || 5;
  const needle = query.toLowerCase();
  const found = needle ? everyRow(person).map(rows => hits(rows, needle)) : [];
  const over = found.filter(rows => rows.length > limit);
  return ok({
    query,
    results: found.flatMap(rows => rows.slice(0, limit)),
    truncated: Object.fromEntries(over.map(rows => [rows[0].kind, rows.length - limit])),
  });
};

const usage = (path, total, used) => ({ path, total, used, free: total - used });

const storage = () =>
  ok({
    boxes: usage('/var/lib/hyperweaver-server', 500 * GIB, 412 * GIB),
    isos: usage('/var/lib/hyperweaver-server/artifacts', 2000 * GIB, 1830 * GIB),
  });

const updateCheck = () =>
  ok({
    is_apt_managed: true,
    update_available: true,
    current_version: STATUS.version,
    latest_version: '0.9.7',
  });

const hyperweaverRole = (person, admin) => {
  if (!admin) {
    return 'user';
  }
  return person.role === 'user' ? 'admin' : person.role;
};

const rolesSet = ctx => {
  const person = personById(ctx.params.id);
  if (!person) {
    return missing('No such account.');
  }
  const wanted = Array.isArray(ctx.body.roles) ? ctx.body.roles : [];
  person.roles = uniqueOf(['ROLE_USER', ...wanted.filter(name => ROLE_NAMES.includes(name))]);
  person.role = hyperweaverRole(person, isAdmin(person));
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: person.id });
  return ok({ message: 'The roles are saved.', roles: person.roles });
};

const suspended = flag => ctx => {
  const person = personById(ctx.params.id);
  if (!person) {
    return missing('No such account.');
  }
  person.suspended = flag;
  if (flag) {
    publish({ topic: 'session', event: 'session-terminated', data: {}, to: person.id });
    setTimeout(() => closeStreamsOf(person.id), 0).unref();
  }
  return ok({ message: flag ? 'Suspended.' : 'Resumed.' });
};

/**
 * The routes every page asks before and beside its own: the status, the
 * health, the ticket system, the rules, the Gravatar proxy, the client's
 * error report, the search over organizations, people, hosts, machines
 * and tasks, and the admin's roles, suspension, storage and update check.
 *
 * @param {Object} router - `publicRoute`, `sessionRoute` and `adminRoute`
 * @returns {void}
 */
export const mountSite = ({ publicRoute, sessionRoute, adminRoute }) => {
  publicRoute('GET', '/api/status', () => ok(STATUS));
  publicRoute('GET', '/api/health', () => ok(healthNow()));
  publicRoute('GET', '/api/rules', () => ok(RULES));
  publicRoute('GET', '/api/config/ticket', () => ok({ ticket_system: TICKET }));
  publicRoute('GET', '/api/gravatar/profile/:hash', gravatar);
  publicRoute('POST', '/api/client-errors', clientErrors);
  sessionRoute('GET', '/api/search', searched);
  adminRoute('GET', '/api/roles', () => ok({ roles: ROLE_NAMES }));
  adminRoute('PUT', '/api/users/:id/roles', rolesSet);
  adminRoute('PUT', '/api/users/:id/suspend', suspended(true));
  adminRoute('PUT', '/api/users/:id/resume', suspended(false));
  adminRoute('GET', '/api/system/storage', storage);
  adminRoute('GET', '/api/system/update-check', updateCheck);
};
