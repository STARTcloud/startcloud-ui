import { ago, empty, failure, invalid, missing, ok } from './kit.js';
import { FIXTURE_PERSON } from './people.js';
import { publish } from './stream.js';

const SERVICE = 'hyperweaver';
const ORIGIN = '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$';
const MAX_SERVERS = 20;
const MAX_LABEL = 100;
const LOCAL = 'local';
const DAY_MINUTES = 60 * 24;

const connected = new Map([
  [
    FIXTURE_PERSON,
    {
      connected_at: ago(DAY_MINUTES * 12),
      settings: {
        servers: [
          { origin: 'https://hw.example.com', label: 'Office', default: true },
          { origin: 'https://lab.example.com:8443', label: 'Lab', default: false },
        ],
        deploy_target: 'https://hw.example.com',
      },
    },
  ],
]);

const profileUpdated = person =>
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: person.id });

const rowOf = person => {
  const held = connected.get(person.id);
  return {
    id: SERVICE,
    name: 'Hyperweaver',
    icon_url: '/brand/integrations/hyperweaver.svg',
    status: 'connected',
    connected_at: held.connected_at,
    settings_url: `/user/integrations/${SERVICE}`,
    settings: held.settings,
  };
};

/**
 * The `integrations` rows of one person's record, the same rows
 * `GET /api/user/integrations` answers as `services`; null while the
 * person connected nothing, so the member is absent, never empty.
 *
 * @param {Object} person - The person
 * @returns {Array<Object>|null} The rows
 */
export const integrationsOf = person => (connected.has(person.id) ? [rowOf(person)] : null);

const serverFailures = (row, index) => {
  const base = `/servers/${index}`;
  const errors = [];
  if (typeof row?.origin !== 'string' || row.origin === '') {
    errors.push(failure({ pointer: `${base}/origin`, rule: 'required' }));
  } else if (!new RegExp(ORIGIN, 'u').test(row.origin)) {
    errors.push(
      failure({ pointer: `${base}/origin`, rule: 'pattern', params: { pattern: ORIGIN } })
    );
  }
  if (typeof row?.label === 'string' && row.label.length > MAX_LABEL) {
    errors.push(
      failure({ pointer: `${base}/label`, rule: 'maxLength', params: { maxLength: MAX_LABEL } })
    );
  }
  return errors;
};

const listFailures = servers => {
  const errors = [];
  if (servers.length > MAX_SERVERS) {
    errors.push(
      failure({ pointer: '/servers', rule: 'maxItems', params: { maxItems: MAX_SERVERS } })
    );
  }
  const origins = servers.map(row => row?.origin);
  if (new Set(origins).size !== origins.length) {
    errors.push(failure({ pointer: '/servers', rule: 'unique', params: { scope: 'servers' } }));
  }
  if (servers.filter(row => row?.default === true).length > 1) {
    errors.push(failure({ pointer: '/servers', rule: 'maxItems', params: { maxItems: 1 } }));
  }
  return errors;
};

const targetFailures = (target, servers) => {
  if (target === LOCAL || servers.some(row => row?.origin === target)) {
    return [];
  }
  return [failure({ pointer: '/deploy_target', rule: 'enum', params: {} })];
};

const settingsFailures = body => {
  const servers = Array.isArray(body?.servers) ? body.servers : null;
  if (!servers) {
    return [failure({ pointer: '/servers', rule: 'required' })];
  }
  return [
    ...servers.flatMap(serverFailures),
    ...listFailures(servers),
    ...targetFailures(body.deploy_target, servers),
  ];
};

const withDefault = servers =>
  servers.some(row => row.default)
    ? servers
    : servers.map((row, i) => ({ ...row, default: i === 0 }));

const cleanSettings = body => ({
  servers: withDefault(
    body.servers.map(row => ({
      origin: row.origin,
      label: typeof row.label === 'string' ? row.label : '',
      default: row.default === true,
    }))
  ),
  deploy_target: body.deploy_target || LOCAL,
});

const known = ctx => ctx.params.service === SERVICE;

const listed = ctx => {
  const rows = integrationsOf(ctx.person);
  return ok(rows ? { services: rows } : {});
};

const saved = ctx => {
  if (!known(ctx) || !connected.has(ctx.person.id)) {
    return missing('No such service.');
  }
  const errors = settingsFailures(ctx.body);
  if (errors.length > 0) {
    return invalid(errors);
  }
  connected.get(ctx.person.id).settings = cleanSettings(ctx.body);
  profileUpdated(ctx.person);
  return ok(rowOf(ctx.person));
};

const attached = ctx => {
  if (!known(ctx)) {
    return missing('No such service.');
  }
  const { origin, label } = ctx.body;
  const errors = serverFailures({ origin, label }, 0).map(error => ({
    ...error,
    pointer: error.pointer.replace('/servers/0', ''),
  }));
  if (errors.length > 0) {
    return invalid(errors);
  }
  const held = connected.get(ctx.person.id);
  const servers = held ? held.settings.servers : [];
  if (servers.some(row => row.origin === origin)) {
    return invalid([failure({ pointer: '/origin', rule: 'unique', params: { scope: 'servers' } })]);
  }
  const first = servers.length === 0;
  const next = [
    ...servers,
    { origin, label: typeof label === 'string' ? label : '', default: first },
  ];
  connected.set(ctx.person.id, {
    connected_at: held ? held.connected_at : new Date().toISOString(),
    settings: {
      servers: next,
      deploy_target: first ? origin : held.settings.deploy_target,
    },
  });
  profileUpdated(ctx.person);
  return ok(rowOf(ctx.person), held ? 200 : 201);
};

const detached = ctx => {
  if (!known(ctx) || !connected.has(ctx.person.id)) {
    return missing('No such service.');
  }
  connected.delete(ctx.person.id);
  profileUpdated(ctx.person);
  return empty(204);
};

/**
 * The connected services of the identity contract on the backend
 * session: the read of `GET /api/user/integrations`, `services` present
 * only for a person who connected something, the fixture's person born
 * connected to Hyperweaver with two servers; the whole-settings
 * `PATCH /api/user/integrations/hyperweaver`, refused 422 with pointers
 * for a bad origin, a duplicate, a label over 100, more than one default
 * or a deploy target outside the list; the register
 * `POST /api/user/integrations/hyperweaver/connect`, the first server
 * becoming the default and the deploy target; and the
 * `DELETE /api/user/integrations/hyperweaver` that disconnects. An unknown
 * service answers 404 and every write sends `profile-updated` to the
 * person.
 *
 * @param {Object} router - `sessionRoute`
 * @returns {void}
 */
export const mountIntegrations = ({ sessionRoute }) => {
  sessionRoute('GET', '/api/user/integrations', listed);
  sessionRoute('PATCH', '/api/user/integrations/:service', saved);
  sessionRoute('POST', '/api/user/integrations/:service/connect', attached);
  sessionRoute('DELETE', '/api/user/integrations/:service', detached);
};
