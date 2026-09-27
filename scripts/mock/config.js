import { hasSteppedUp } from './account.js';
import { CONFIG_FILES, CONFIG_NAMES, CONFIG_SCHEMAS } from './config-data.js';
import { notifyAdmins } from './inbox.js';
import {
  SETUP_MODE,
  ago,
  copyOf,
  denied,
  empty,
  failure,
  missing,
  now,
  ok,
  stepUpRequired,
  typedProblem,
  unauthenticated,
} from './kit.js';
import { isAdmin } from './people.js';
import { valueFailure } from './rules.js';

const UPLOADS = '/etc/hyperweaver-server/uploads';
const UNREACHABLE = 'unreachable.example.com';
const POINTER_PART = /name="pointer"\r\n\r\n(?<pointer>[^\r\n]*)/;
const FILE_PART = /filename="(?<file>[^"]*)"/;

export const SETUP_TOKEN = 'mock-setup-token';

const SEEDED_RESTART = {
  pointer: '/server/port',
  title: 'HTTPS port',
  reason: 'the listener is bound at boot',
};

const files = copyOf(CONFIG_FILES);
const setup = { complete: !SETUP_MODE };
const pending = { entries: [SEEDED_RESTART], by: 'admin@example.com', at: ago(180) };

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const segmentsOf = pointer => pointer.split('/').filter(Boolean);

const childOf = (rule, segment) => {
  const own = rule?.properties?.[segment];
  const item = rule?.additionalProperties;
  return own || (isObject(item) ? item : null);
};

const ruleAt = (name, pointer) => segmentsOf(pointer).reduce(childOf, CONFIG_SCHEMAS[name]);

const leavesOf = (patch, base = '') =>
  Object.entries(patch).flatMap(([key, value]) =>
    isObject(value) ? leavesOf(value, `${base}/${key}`) : [{ pointer: `${base}/${key}`, value }]
  );

const merged = (target, patch) => {
  if (!isObject(patch)) {
    return patch;
  }
  const result = { ...(isObject(target) ? target : {}) };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = merged(result[key], value);
    }
  });
  return result;
};

const leafFailure = (name, { pointer, value }) => {
  const rule = ruleAt(name, pointer);
  if (rule?.readOnly) {
    return { pointer, rule: 'readOnly' };
  }
  const found = rule && value !== null && value !== '' ? valueFailure(rule, value) : null;
  return found ? { pointer, ...found } : null;
};

const failuresOf = (name, patch, base = '') =>
  leavesOf(patch)
    .map(leaf => leafFailure(name, leaf))
    .filter(Boolean)
    .map(found => failure({ ...found, pointer: `${base}${found.pointer}` }));

const refusedConfig = errors =>
  typedProblem({
    status: 422,
    name: 'validation',
    title: 'The configuration did not pass validation.',
    more: { errors },
  });

const restartsOf = (name, patch) =>
  leavesOf(patch)
    .map(leaf => ({ pointer: leaf.pointer, rule: ruleAt(name, leaf.pointer) }))
    .filter(({ rule }) => rule?.requiresRestart)
    .map(({ pointer, rule }) => ({ pointer, title: rule.title, reason: rule.restartReason }));

const isPending = pointer => pending.entries.some(row => row.pointer === pointer);

const remember = (entries, person) => {
  const fresh = entries.filter(entry => !isPending(entry.pointer));
  pending.entries = [...pending.entries, ...fresh];
  pending.by = person.email;
  pending.at = now();
};

const named = handler => ctx => {
  const name = decodeURIComponent(ctx.params.name);
  return CONFIG_NAMES.includes(name)
    ? handler({ ...ctx, name })
    : missing('No such configuration file.');
};

const saved = ctx => {
  const { name, body, person } = ctx;
  if (!isObject(body)) {
    return typedProblem({ status: 400, name: 'bad-request', title: 'The patch is no object.' });
  }
  const errors = failuresOf(name, body);
  if (errors.length > 0) {
    return refusedConfig(errors);
  }
  const restarts = restartsOf(name, body);
  files[name] = merged(files[name], body);
  if (restarts.length > 0) {
    remember(restarts, person);
  }
  notifyAdmins({
    title: `The ${name} configuration was changed`,
    body: `${person.name} saved ${leavesOf(body).length} values.`,
    type: 'ADMIN',
    severity: restarts.length > 0 ? 'WARNING' : 'INFO',
    navigate: `/admin/config/${name}`,
  });
  return ok({ message: 'Configuration saved.', requires_restart: restarts });
};

const restartStatus = () =>
  ok({
    restart_required: pending.entries.length > 0,
    requires_restart: pending.entries,
    last_modified_by: pending.by,
    last_modified_time: pending.at,
  });

const restarted = () => {
  pending.entries = [];
  return ok({ message: 'Restarting.' }, 202);
};

const bearerOf = req => String(req.headers.authorization || '').replace('Bearer ', '');

const settingUp = ctx => !setup.complete && bearerOf(ctx.req) === SETUP_TOKEN;

const permitted = handler => ctx => {
  if (settingUp(ctx) || (ctx.person && isAdmin(ctx.person))) {
    return handler(ctx);
  }
  return ctx.person ? denied('This takes an administrator.') : unauthenticated('Sign in first.');
};

const uploaded = ctx => {
  const pointer = POINTER_PART.exec(ctx.raw)?.groups.pointer || '';
  const file = FILE_PART.exec(ctx.raw)?.groups.file || 'upload';
  if (ruleAt(ctx.name, pointer)?.action?.kind !== 'upload') {
    return refusedConfig([failure({ pointer: '/pointer', rule: 'pointer' })]);
  }
  return ok({ path: `${UPLOADS}/${file}` });
};

const unreachableIn = (values, base = '') =>
  Object.entries(isObject(values) ? values : {}).flatMap(([key, value]) => {
    const pointer = `${base}/${key}`;
    if (isObject(value)) {
      return unreachableIn(value, pointer);
    }
    return String(value).includes(UNREACHABLE) ? [pointer] : [];
  });

const tested = ctx => {
  const [pointer] = unreachableIn(ctx.body);
  if (pointer) {
    const params = { host: UNREACHABLE, port: 443 };
    return refusedConfig([failure({ pointer, rule: 'reachable', params })]);
  }
  return ok({ message: 'The test passed.' });
};

const ran = ctx => {
  if (ctx.person && !hasSteppedUp(ctx.person)) {
    return stepUpRequired();
  }
  notifyAdmins({
    title: `${ctx.params.verb} was started`,
    body: `Started from the ${ctx.name} configuration.`,
    type: 'SYSTEM',
    severity: 'INFO',
    navigate: `/admin/config/${ctx.name}`,
  });
  return ok({ message: 'Started.' }, 202);
};

const bearer = handler => ctx => {
  if (!settingUp(ctx)) {
    return unauthenticated('The setup token is missing or wrong.');
  }
  return handler(ctx);
};

const schemaOf = ctx => ok(CONFIG_SCHEMAS[ctx.name]);

const fileOf = ctx => ok(files[ctx.name]);

const setupSchemas = () => ok({ schemas: CONFIG_SCHEMAS });

const setupFiles = () => ok({ configs: files });

const verified = ctx => {
  if (setup.complete) {
    return missing('Setup is complete.');
  }
  return ctx.body.token === SETUP_TOKEN ? empty(204) : denied('The setup token is wrong.');
};

const completed = ctx => {
  const configs = isObject(ctx.body.configs) ? ctx.body.configs : {};
  const patches = Object.entries(configs).filter(([name]) => CONFIG_NAMES.includes(name));
  const errors = patches.flatMap(([name, patch]) => failuresOf(name, patch, `/configs/${name}`));
  if (errors.length > 0) {
    return refusedConfig(errors);
  }
  patches.forEach(([name, patch]) => {
    files[name] = merged(files[name], patch);
  });
  setup.complete = true;
  return ok({ message: 'Setup complete.' });
};

export const setupComplete = () => setup.complete;

/**
 * The config contract's routes: the restart status and the restart, a
 * file and its schema by name, the merge patch that answers what needs a
 * restart or a 422 with pointers, the three schema actions, upload, test
 * and run, the run stepping up first, and the setup routes under the
 * setup token; a host name holding `unreachable.example.com` fails a test
 * with the `reachable` rule.
 *
 * @param {Object} router - `publicRoute` and `adminRoute`
 * @returns {void}
 */
export const mountConfig = ({ publicRoute, adminRoute }) => {
  adminRoute('GET', '/api/config/restart-status', restartStatus);
  adminRoute('POST', '/api/config/restart', restarted);
  publicRoute('POST', '/api/config/:name/upload', permitted(named(uploaded)));
  publicRoute('POST', '/api/config/:name/test', permitted(named(tested)));
  publicRoute('POST', '/api/config/:name/run/:verb', permitted(named(ran)));
  adminRoute('GET', '/api/config/:name/schema', named(schemaOf));
  adminRoute('GET', '/api/config/:name', named(fileOf));
  adminRoute('PUT', '/api/config/:name', named(saved));
  publicRoute('GET', '/api/setup/status', () => ok({ setup_complete: setup.complete }));
  publicRoute('POST', '/api/setup/verify-token', verified);
  publicRoute('GET', '/api/setup/schema', bearer(setupSchemas));
  publicRoute('GET', '/api/setup', bearer(setupFiles));
  publicRoute('PUT', '/api/setup', bearer(completed));
};
