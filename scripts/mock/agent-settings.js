import { randomBytes } from 'crypto';

import { favoritesOf, savedFavorites } from './account.js';
import { SETUP_TOKEN } from './config.js';
import { featuresOf } from './fleet.js';
import { APIKEY_MODE, ago, failure, invalid, missing, now, ok, refusal } from './kit.js';
import {
  FIXTURE_PERSON,
  ISSUER,
  claimsOf,
  credentialOf,
  forgetApiKey,
  personById,
  registerApiKey,
} from './people.js';
import { publish } from './stream.js';
import { queue } from './tasks.js';

const DAY_MINUTES = 60 * 24;
const CHECKS_TO_APPROVE = 2;
const DEVICE_EXPIRES_S = 600;
const DEVICE_INTERVAL_S = 5;
const TRAY_DEMO_TOKEN = 'tray-demo-token';
const LATEST_VERSION = '1.3.0';
const KEY_REQUIRED =
  'API key required - provide either X-API-Key header or Authorization: Bearer header';
const SEED_KEYS = [
  [
    'Initial-Setup',
    'Initial bootstrap API key',
    30,
    DAY_MINUTES * 40,
    'hwk_seed_0001_initial',
    'admin',
  ],
  ['ci-runner', 'Nightly builds', 5, DAY_MINUTES * 12, 'hwk_seed_0002_ci', 'operator'],
  ['old-laptop', 'Revoked when the laptop was retired', null, DAY_MINUTES * 90, '', 'viewer'],
];
const bootstrap = { open: true };
const PREFERENCE_MEMBERS = ['language', 'mode', 'theme', 'motion', 'timezone'];
const PREFERENCE_CHOICES = { mode: ['light', 'dark', 'auto'], motion: ['auto', 'reduce'] };
const preferences = new Map();
const SECRET_CATEGORIES = [
  'hcl_download_portal_api_keys',
  'git_api_keys',
  'vagrant_atlas_token',
  'custom_resource_url',
  'docker_hub',
  'ssh_keys',
];
const states = new Map();

const offers = (host, token) => featuresOf(host).includes(token);

const keyRow = ([name, description, usedMinutes, ageMinutes, key, role], index) => ({
  id: index + 1,
  name,
  description,
  role,
  is_active: Boolean(key),
  last_used: usedMinutes === null ? null : ago(usedMinutes),
  created_at: ago(ageMinutes),
  key,
  identity: null,
});

const freshKey = () => `hwk_${randomBytes(12).toString('hex')}`;

const stateOf = host => {
  if (!states.has(host.id)) {
    const keys = SEED_KEYS.map(keyRow);
    keys.filter(row => row.key).forEach(row => registerApiKey(row.key, row.name, row.role));
    states.set(host.id, {
      secrets: Object.fromEntries(SECRET_CATEGORIES.map(category => [category, []])),
      keys,
      nextKeyId: keys.length + 1,
      update: {
        current_version: '1.2.0',
        latest_version: LATEST_VERSION,
        update_available: host.id === 'self' || String(host.id) === '1',
      },
      flows: new Map(),
      trayTokens: new Set([TRAY_DEMO_TOKEN]),
    });
    states.get(host.id).secrets.git_api_keys.push({ name: 'github', key: 'ghp_seeded' });
    states.get(host.id).secrets.ssh_keys.push({ name: 'deploy', key: '-----BEGIN KEY-----' });
  }
  return states.get(host.id);
};

const mintKey = (host, name, description, role = 'admin', identity = null) => {
  const state = stateOf(host);
  const key = freshKey();
  const row = {
    id: state.nextKeyId,
    name,
    description,
    role,
    is_active: true,
    last_used: null,
    created_at: now(),
    key,
    identity,
  };
  state.nextKeyId += 1;
  state.keys = [...state.keys, row];
  registerApiKey(key, name, role);
  return row;
};

const publicRow = (row, withKey) =>
  Object.fromEntries(
    Object.entries(row).filter(([member]) => member !== 'identity' && (withKey || member !== 'key'))
  );

const listKeys = ctx => {
  const withKey = ctx.url.searchParams.get('include_key') === 'true';
  return ok({ entities: stateOf(ctx.host).keys.map(row => publicRow(row, withKey)) });
};

const generateKey = ctx => {
  if (!ctx.body.name) {
    return refusal(400, 'name is required');
  }
  const row = mintKey(ctx.host, String(ctx.body.name), String(ctx.body.description || ''));
  return ok({ success: true, api_key: row.key, id: row.id, name: row.name }, 201);
};

const bootstrapKey = ctx => {
  const row = mintKey(ctx.host, 'Initial-Setup', 'Initial bootstrap API key');
  return ok({ success: true, api_key: row.key, id: row.id }, 201);
};

const deleteKey = ctx => {
  const state = stateOf(ctx.host);
  const row = state.keys.find(entry => String(entry.id) === ctx.params.id);
  if (!row) {
    return refusal(404, 'API key not found');
  }
  state.keys = state.keys.filter(entry => entry !== row);
  forgetApiKey(row.key);
  return ok({ success: true, message: `API key ${row.name} deleted` });
};

const applyUpdate = ctx => {
  const state = stateOf(ctx.host);
  const task = queue({
    host: ctx.host,
    by: ctx.person.username,
    operation: 'agent_update',
    target: 'agent',
    metadata: { target_version: state.update.latest_version },
  });
  return ok(
    {
      message: `Update to ${state.update.latest_version} queued`,
      task_id: task.id,
      target_version: state.update.latest_version,
    },
    202
  );
};

const secrets = ctx => ok(stateOf(ctx.host).secrets);

const saveSecrets = ctx => {
  const state = stateOf(ctx.host);
  const unknown = Object.keys(ctx.body).find(category => !SECRET_CATEGORIES.includes(category));
  if (unknown) {
    return refusal(400, `Unknown secret category: ${unknown}`);
  }
  state.secrets = { ...state.secrets, ...ctx.body };
  return ok({ success: true, message: 'Secrets updated' });
};

const selfHost = ctx => ctx.host || { id: 'self' };

const msg = (status, text) => ok({ msg: text }, status);

/**
 * Whether the first-key bootstrap is still open on the `hyperweaver-agent`
 * role, the status's `bootstrapAvailable`: open until the first key it
 * mints, closed after.
 *
 * @returns {boolean} True while open
 */
export const bootstrapOpen = () => bootstrap.open;

const keyOf = ctx => {
  const key = credentialOf(ctx.req);
  return stateOf(selfHost(ctx)).keys.find(entry => entry.key && entry.key === key) || null;
};

const identityOf = row =>
  row.identity
    ? {
        auth_provider: 'oidc',
        email: row.identity.email,
        customer_id: row.identity.customer_id,
        issuer: row.identity.issuer,
        subject: row.identity.subject,
      }
    : {};

const keyInfo = ctx => {
  if (!credentialOf(ctx.req)) {
    return msg(401, KEY_REQUIRED);
  }
  const row = keyOf(ctx);
  if (!row) {
    return msg(403, 'Invalid API key');
  }
  return ok({
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.role,
    created_at: row.created_at,
    last_used: row.last_used,
    ...identityOf(row),
  });
};

/**
 * Whether a key a federated login minted exists on the `hyperweaver-agent`
 * role, the mock's stand-in for the agent holding a live token for its
 * bound account: the status then lists `favorites` and `notifications`.
 *
 * @returns {boolean} True while such a key exists
 */
export const oidcBound = () =>
  [...states.values()].some(state => state.keys.some(row => row.key && row.identity));

const personKeyOf = row => row.identity?.email || row.name;

const prefsOf = row => {
  const name = personKeyOf(row);
  if (!preferences.has(name)) {
    preferences.set(name, Object.fromEntries(PREFERENCE_MEMBERS.map(member => [member, null])));
  }
  return preferences.get(name);
};

const agentUser = ctx => {
  const row = keyOf(ctx);
  const stored = prefsOf(row);
  return ok({
    id: row.id,
    username: row.name,
    name: row.name,
    email: null,
    auth_provider: null,
    customer_id: null,
    issuer: null,
    subject: null,
    ...identityOf(row),
    role: row.role,
    organizations: [],
    preferred_language: stored.language,
    preferred_mode: stored.mode,
    preferred_theme: stored.theme,
    preferred_motion: stored.motion,
    preferred_timezone: stored.timezone,
  });
};

const preferenceFailure = (member, value) => {
  if (!PREFERENCE_MEMBERS.includes(member)) {
    return failure({ pointer: `/${member}`, rule: 'not' });
  }
  if (value !== null && typeof value !== 'string') {
    return failure({ pointer: `/${member}`, rule: 'type', params: { type: 'string' } });
  }
  const choices = PREFERENCE_CHOICES[member];
  if (value && choices && !choices.includes(value)) {
    return failure({ pointer: `/${member}`, rule: 'enum', params: { enum: choices } });
  }
  return null;
};

const patchedPreferences = ctx => {
  const row = keyOf(ctx);
  const body = ctx.body && typeof ctx.body === 'object' ? ctx.body : {};
  const failures = Object.entries(body)
    .map(([member, value]) => preferenceFailure(member, value))
    .filter(Boolean);
  if (failures.length > 0) {
    return invalid(failures);
  }
  const stored = prefsOf(row);
  let changed = false;
  Object.entries(body).forEach(([member, value]) => {
    const next = value || null;
    changed ||= stored[member] !== next;
    stored[member] = next;
  });
  if (changed) {
    publish({ topic: 'profile', event: 'profile-updated', data: {}, to: ctx.person.id });
  }
  return ok(stored);
};

const bound = ctx => Boolean(keyOf(ctx)?.identity);

const relayedFavorites = ctx => (bound(ctx) ? ok(favoritesOf(ctx.person)) : missing('Not Found'));

const savedRelayedFavorites = ctx => (bound(ctx) ? savedFavorites(ctx) : missing('Not Found'));

const bootstrapFirstKey = ctx => {
  if (!bootstrap.open) {
    return msg(403, 'Bootstrap endpoint auto-disabled after first use');
  }
  if (String(ctx.body.setup_token || '') !== SETUP_TOKEN) {
    return msg(403, 'Invalid or missing setup token. Read it from setup.token beside the config.');
  }
  const row = mintKey(
    selfHost(ctx),
    String(ctx.body.name || 'Direct-Login'),
    String(ctx.body.description || '')
  );
  bootstrap.open = false;
  return ok({
    api_key: row.key,
    message: 'Bootstrap API key generated successfully',
    note: 'The bootstrap endpoint is now disabled.',
  });
};

const trayClaim = ctx => {
  const state = stateOf(selfHost(ctx));
  const token = String(ctx.body.token || '');
  if (!token) {
    return msg(400, 'Tray token required');
  }
  if (!state.trayTokens.has(token)) {
    return msg(403, 'Invalid or expired tray token');
  }
  state.trayTokens.delete(token);
  return ok({
    api_key: mintKey(selfHost(ctx), 'Tray', 'Minted by the tray handoff').key,
    message: 'Tray login successful',
  });
};

const deviceStart = ctx => {
  const state = stateOf(selfHost(ctx));
  const handle = randomBytes(8).toString('hex');
  const code = randomBytes(3).toString('hex').toUpperCase();
  state.flows.set(handle, { checks: 0 });
  return ok({
    handle,
    user_code: code,
    verification_uri: 'https://auth.example.com/activate',
    verification_uri_complete: `https://auth.example.com/activate?user_code=${code}`,
    expires_in: DEVICE_EXPIRES_S,
    interval: DEVICE_INTERVAL_S,
  });
};

const deviceStatus = ctx => {
  const state = stateOf(selfHost(ctx));
  const handle = ctx.url.searchParams.get('handle') || '';
  const flow = state.flows.get(handle);
  if (!flow) {
    return refusal(404, 'Unknown login handle');
  }
  flow.checks += 1;
  if (flow.checks < CHECKS_TO_APPROVE) {
    return ok({ status: 'pending' });
  }
  state.flows.delete(handle);
  const person = personById(FIXTURE_PERSON);
  const row = mintKey(selfHost(ctx), person.email, 'Minted by the device flow', 'admin', {
    email: person.email,
    customer_id: claimsOf(person).customer_id,
    issuer: ISSUER,
    subject: person.uuid,
  });
  return ok({
    status: 'approved',
    api_key: row.key,
    entity_id: row.id,
    name: row.name,
    role: row.role,
    message: 'Login successful',
  });
};

const silentStart = () =>
  refusal(502, 'Identity provider unreachable: no identity provider is configured on the mock');

/**
 * The Agent settings page's routes on every host: the update check and
 * its apply, a queued task, the secrets behind `secrets`, and the API
 * keys with their generate, bootstrap and delete;
 * and on the `hyperweaver-agent` role the six sign-in paths of its
 * brief, public and under `/api`: the profile of a key, read with the
 * key as its bearer and refused 401 without one and 403 for an unknown
 * one; the first-boot bootstrap under `setup_token`, open once; the tray
 * claim of the seeded token `tray-demo-token`; the device flow, approved
 * on its second status check and minting a key bound to the fixture's
 * person, whose profile then carries `auth_provider`, `email`,
 * `customer_id`, `issuer` and `subject`; and the silent probe, answered
 * 502 since no identity provider is reachable here. A minted key signs
 * in as the fixture's person. Beside them the person behind a key:
 * `GET /api/user` in the identity provider's shape under the key's own
 * role, the preferences read and merged through `GET` and
 * `PATCH /api/user/preferences`, kept per person by the email a federated
 * login minted the key with, else the key's name, a change sent as
 * `profile-updated` on the `profile` topic, and the favorites relayed as
 * the mock's own store under a key a federated login minted, 404 for a
 * plain one.
 *
 * @param {Object} router - `publicRoute`, `sessionRoute` and `agentRoute`
 * @returns {void}
 */
export const mountAgentSettings = ({ publicRoute, sessionRoute, agentRoute }) => {
  if (APIKEY_MODE) {
    publicRoute('GET', '/api/api-keys/info', keyInfo);
    publicRoute('POST', '/api/api-keys/bootstrap', bootstrapFirstKey);
    publicRoute('POST', '/api/auth/tray-claim', trayClaim);
    publicRoute('POST', '/api/auth/oidc/device-start', deviceStart);
    publicRoute('GET', '/api/auth/oidc/device-status', deviceStatus);
    publicRoute('POST', '/api/auth/oidc/silent-start', silentStart);
    sessionRoute('GET', '/api/user', agentUser);
    sessionRoute('GET', '/api/user/preferences', ctx => ok(prefsOf(keyOf(ctx))));
    sessionRoute('PATCH', '/api/user/preferences', patchedPreferences);
    sessionRoute('GET', '/api/user/favorites', relayedFavorites);
    sessionRoute('PUT', '/api/user/favorites', savedRelayedFavorites);
  }
  agentRoute('GET', 'app/updates/check', ctx => ok(stateOf(ctx.host).update));
  agentRoute('POST', 'app/updates/apply', applyUpdate);
  agentRoute('GET', 'secrets', ctx =>
    offers(ctx.host, 'secrets') ? secrets(ctx) : missing('Not Found')
  );
  agentRoute('PUT', 'secrets', ctx =>
    offers(ctx.host, 'secrets') ? saveSecrets(ctx) : missing('Not Found')
  );
  agentRoute('GET', 'api-keys', listKeys);
  agentRoute('POST', 'api-keys/generate', generateKey);
  agentRoute('POST', 'api-keys/bootstrap', bootstrapKey);
  agentRoute('DELETE', 'api-keys/:id', deleteKey);
};
