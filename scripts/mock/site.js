import { Buffer } from 'buffer';

import { compareRowsFor, matchFields } from '../../src/utils/searchScore.js';

import { bootstrapOpen, oidcBound } from './agent-settings.js';
import { CONFIG_NAMES } from './config-data.js';
import { ROLE_STATUS, hostFor, hosts, labelOf } from './fleet.js';
import {
  AGENT_MODE,
  APIKEY_MODE,
  SELF,
  ZONE_MODE,
  empty,
  failure,
  invalid,
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
import { onTaskEnd } from './tasks.js';

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
  'health',
];
const SEARCH_FEATURES = ['search'];
const RULES_FEATURES = ['rules'];
const SEARCH_KINDS = AGENT_MODE ? ['machine', 'config'] : ['organization', 'user', 'host'];
const SEARCH_PATH = '/api/search';
const QUERY_MIN = 2;
const QUERY_MAX = 200;
const LIMIT_MAX = 50;
const LIMIT_DEFAULT = 5;
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
    return [...SEARCH_FEATURES, ...RULES_FEATURES];
  }
  return [
    ...SHARED_FEATURES,
    ...SEARCH_FEATURES,
    ...RULES_FEATURES,
    ...(ZONE_MODE ? [] : STREAM_FEATURES),
  ];
};

const eventsOf = () => {
  if (ZONE_MODE) {
    return {};
  }
  return { events: { path: '/api/events', topics: APIKEY_MODE ? AGENT_TOPICS : TOPICS } };
};

/**
 * The status payload of the role the mock stands in for: the role's
 * fixture with the shared chrome's tokens, the About page's links, the
 * config file names, `search` with the kinds this role answers, and the
 * event stream on the roles that stream.
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
  search: { path: SEARCH_PATH, kinds: SEARCH_KINDS },
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

const resultOf = row => ({
  kind: row.kind,
  id: String(row.id),
  collection: null,
  org: row.org || '',
  name: row.name || '',
  version: '',
  provider: '',
  architecture: '',
  anchor: row.anchor || '',
  source: null,
  title: row.title,
  subtitle: row.subtitle,
  facets: row.facets || {},
});

const organizationEntries = person =>
  membershipsOf(person)
    .filter(entry => organizations.has(entry.org))
    .map(entry => organizations.get(entry.org))
    .map(org => ({
      fields: [
        { field: 'name', text: org.name },
        { field: 'title', text: org.display_name },
        { field: 'description', text: org.description || '' },
      ],
      row: resultOf({
        kind: 'organization',
        id: org.name,
        org: org.name,
        name: org.name,
        title: org.display_name,
        subtitle: org.description || '',
      }),
    }));

const userEntries = person =>
  (isAdmin(person) ? [...people.values()] : []).map(user => ({
    fields: [
      { field: 'name', text: user.username },
      { field: 'title', text: user.name },
      { field: 'email', text: user.email },
    ],
    row: resultOf({
      kind: 'user',
      id: user.username,
      name: user.username,
      title: user.name,
      subtitle: user.email,
    }),
  }));

const hostEntries = () =>
  [...hosts.values()].map(host => ({
    fields: [
      { field: 'name', text: labelOf(host) },
      { field: 'hostname', text: host.facts.hostname || '' },
    ],
    row: resultOf({
      kind: 'host',
      id: host.id,
      name: labelOf(host),
      title: labelOf(host),
      subtitle: `${host.kind} · ${host.machines.length} machines`,
    }),
  }));

const machineEntries = host =>
  host.machines.map(machine => ({
    fields: [
      { field: 'name', text: machine.name },
      { field: 'notes', text: machine.notes || '' },
    ],
    row: resultOf({
      kind: 'machine',
      id: machine.name,
      name: machine.name,
      title: machine.name,
      subtitle: machine.status,
      facets: { status: machine.status },
    }),
  }));

const configEntries = () =>
  CONFIG_NAMES.map(name => ({
    fields: [{ field: 'name', text: name }],
    row: resultOf({ kind: 'config', id: name, name, title: name, subtitle: 'Configuration' }),
  }));

const entriesOf = person => {
  if (!AGENT_MODE) {
    return [...organizationEntries(person), ...userEntries(person), ...hostEntries()];
  }
  const host = hostFor(SELF);
  return [...machineEntries(host), ...configEntries()];
};

const inScope = (row, scope) => {
  const [kind, ...rest] = scope.split(':');
  if (kind === 'org') {
    return row.org === rest.join(':');
  }
  return kind !== 'collection';
};

const cursorOf = offset => Buffer.from(String(offset)).toString('base64url');

const offsetOf = after => Number(Buffer.from(String(after || ''), 'base64url').toString()) || 0;

const limitOf = value => Math.min(Math.max(Number(value) || LIMIT_DEFAULT, 1), LIMIT_MAX);

const requestOf = url => {
  const asked = String(url.searchParams.get('kinds') || '')
    .split(',')
    .filter(kind => SEARCH_KINDS.includes(kind));
  return {
    query: String(url.searchParams.get('q') || '').trim(),
    kinds: asked.length > 0 ? asked : SEARCH_KINDS,
    named: asked,
    scope: String(url.searchParams.get('scope') || ''),
    limit: limitOf(url.searchParams.get('limit')),
    offset: offsetOf(url.searchParams.get('after')),
  };
};

const pageOfKind = (rows, request) => {
  const start = request.named.length === 1 ? request.offset : 0;
  const page = rows.slice(start, start + request.limit);
  const more = request.named.length === 1 && start + request.limit < rows.length;
  return { page, next: more ? cursorOf(start + request.limit) : null };
};

const searched = ctx => {
  const request = requestOf(ctx.url);
  if (request.query.length < QUERY_MIN || request.query.length > QUERY_MAX) {
    return invalid([
      failure({ pointer: '/q', rule: 'length', params: { min: QUERY_MIN, max: QUERY_MAX } }),
    ]);
  }
  const found = entriesOf(ctx.person)
    .filter(entry => request.kinds.includes(entry.row.kind))
    .filter(entry => !request.scope || inScope(entry.row, request.scope))
    .flatMap(entry => {
      const match = matchFields(entry.fields, request.query);
      return match ? [{ ...entry.row, ...match }] : [];
    })
    .sort(compareRowsFor(request.query));
  const counts = {};
  const results = [];
  let next = null;
  request.kinds.forEach(kind => {
    const rows = found.filter(row => row.kind === kind);
    if (rows.length === 0) {
      return;
    }
    counts[kind] = { value: rows.length, relation: 'eq' };
    const page = pageOfKind(rows, request);
    results.push(...page.page);
    next = page.next || next;
  });
  return ok(
    {
      query: request.query,
      kinds: request.named,
      scope: request.scope,
      counts,
      results: results.sort(compareRowsFor(request.query)),
      next,
    },
    200,
    { 'Cache-Control': 'no-store' }
  );
};

const usage = (path, total, used) => ({ path, total, used, free: total - used });

const storage = () =>
  ok({
    boxes: usage('/var/lib/hyperweaver-server', 500 * GIB, 412 * GIB),
    isos: usage('/var/lib/hyperweaver-server/artifacts', 2000 * GIB, 1830 * GIB),
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
    closeStreamsOf(person.id);
  }
  return ok({ message: flag ? 'Suspended.' : 'Resumed.' });
};

/**
 * The routes every page asks beside its own: the status, the health, the
 * ticket system, the rules, the Gravatar proxy, the client's error
 * report, the search over this role's kinds, and the admin's roles,
 * suspension and storage; the health takes the next of its four states
 * each time a task ends and is sent on the `health` topic.
 *
 * @param {Object} router - `publicRoute`, `sessionRoute` and `adminRoute`
 * @returns {void}
 */
export const mountSite = ({ publicRoute, sessionRoute, adminRoute }) => {
  onTaskEnd(moveHealth);
  publicRoute('GET', '/api/status', status);
  publicRoute('GET', '/api/health', () => ok(healthNow()));
  publicRoute('GET', '/api/rules', () => ok(RULES));
  publicRoute('GET', '/api/config/ticket', () => ok({ ticket_system: TICKET }));
  publicRoute('GET', '/api/gravatar/profile/:hash', gravatar);
  publicRoute('POST', '/api/client-errors', clientErrors);
  sessionRoute('GET', SEARCH_PATH, searched);
  adminRoute('GET', '/api/roles', () => ok({ roles: ROLE_NAMES }));
  adminRoute('PUT', '/api/users/:id/roles', rolesSet);
  adminRoute('PUT', '/api/users/:id/suspend', suspended(true));
  adminRoute('PUT', '/api/users/:id/resume', suspended(false));
  adminRoute('GET', '/api/system/storage', storage);
};
