import { bootstrapOpen, oidcBound } from './agent-settings.js';
import { CONFIG_NAMES } from './config-data.js';
import { ROLE_STATUS, hosts, labelOf } from './fleet.js';
import {
  AGENT_MODE,
  APIKEY_MODE,
  ZONE_MODE,
  empty,
  missing,
  now,
  ok,
  secondsUp,
  uniqueOf,
} from './kit.js';
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
const AGENT_AUTH = ['apikey', 'oidc'];
const AGENT_TOPICS = ['health', 'tasks', 'hosts', 'admin', 'monitoring'];
const AGENT_REPO = 'https://github.com/Makr91/hyperweaver-agent';
const AGENT_LINKS = { docs: '/docs', contact: '', api: '/api-docs' };
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
];
const STREAM_FEATURES = ['events'];
const BOUND_FEATURES = ['favorites', 'notifications'];
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

const sharedFeatures = () => {
  if (APIKEY_MODE) {
    return [];
  }
  return [...SHARED_FEATURES, ...(ZONE_MODE ? [] : STREAM_FEATURES)];
};

const eventsOf = () => {
  if (ZONE_MODE) {
    return {};
  }
  return { events: { path: '/api/events', topics: APIKEY_MODE ? AGENT_TOPICS : TOPICS } };
};

/**
 * The status payload of the role the mock stands in for: the role's
 * fixture with every token of the shared chrome a hyperweaver backend can
 * answer, the links, the repository and the changelog of the About page,
 * the config file names and, on the roles that stream, `events` and the
 * topics of the one event stream; the zone role streams none. The
 * `hyperweaver-agent` role answers the members its own status handler
 * answers and no other: `brand` with the agent's repository, `links`
 * with `/docs` and `/api-docs`, `auth` `apikey` and `oidc`, the tokens it
 * advertises, the five topics of its stream, `bootstrapAvailable` while
 * the first-key bootstrap is open, `shi_mode` and `uptime`, and
 * `favorites` and `notifications` in `features` while a key a federated
 * login minted exists, the agent's own rule for the tokens it lists only
 * while it holds a live token for its bound account.
 */
export const STATUS = {
  ...ROLE_STATUS,
  brand: {
    ...ROLE_STATUS.brand,
    repo: APIKEY_MODE ? AGENT_REPO : 'https://github.com/example/hyperweaver',
    ...(APIKEY_MODE ? {} : { changelog: 'https://github.com/example/hyperweaver/releases' }),
  },
  features: uniqueOf([...ROLE_STATUS.features, ...sharedFeatures()]),
  auth: AGENT_MODE ? AGENT_AUTH : ROLE_STATUS.auth,
  links: APIKEY_MODE
    ? AGENT_LINKS
    : {
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
  ...eventsOf(),
};

const status = () =>
  ok(
    APIKEY_MODE
      ? {
          ...STATUS,
          features: uniqueOf([...STATUS.features, ...(oidcBound() ? BOUND_FEATURES : [])]),
          bootstrapAvailable: bootstrapOpen(),
          shi_mode: false,
          uptime: secondsUp(),
        }
      : STATUS
  );

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
  publicRoute('GET', '/api/status', status);
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
