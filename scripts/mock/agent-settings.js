import { randomBytes } from 'crypto';

import { favoritesOf, savedFavorites } from './account.js';
import { SETUP_TOKEN } from './config.js';
import { featuresOf } from './fleet.js';
import { APIKEY_MODE, ago, empty, missing, now, ok, refusal } from './kit.js';
import {
  FIXTURE_PERSON,
  ISSUER,
  claimsOf,
  clearedCookies,
  credentialOf,
  forgetApiKey,
  personById,
  refusedCookies,
  registerApiKey,
  sessionCookies,
} from './people.js';
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
const RELEASE_DOWNLOADS = 'https://github.com/Makr91/hyperweaver-agent/releases/download/v0.2.0';
const RELEASE_ASSETS = [
  [
    'hyperweaver-agent-0.2.0-windows-amd64.exe',
    40265318,
    '3f0c9a1b7e4d2c8f5a6b1d0e9c7a4f2b8d6e3c1a0f9b7d5e2c4a6f8b1d3e5c7a',
  ],
  [
    'hyperweaver-agent-0.2.0-darwin-arm64.pkg',
    43201331,
    'b7d5e2c4a6f8b1d3e5c7a9f0c9a1b7e4d2c8f5a6b1d0e9c7a4f2b8d6e3c1a0f9',
  ],
  [
    'hyperweaver-agent-0.2.0-linux-amd64.deb',
    38692454,
    'e9c7a4f2b8d6e3c1a0f9b7d5e2c4a6f8b1d3e5c7a3f0c9a1b7e4d2c8f5a6b1d0',
  ],
  ['update-info.json', 612, null],
  ['checksums.txt', 486, null],
];
const RELEASE_NOTES = `### Features

* config contract wire — five schema-backed configuration files under /api/config with setup routes, problem bodies, JSON Schema validation, merge-patch saves, restart list and timestamped backups; sources, catalogs, artifact paths and applications keyed by id; CONFIG_DIR and --config name the folder; Debian package ships seeds and the setup token ([fc3e640](https://github.com/Makr91/hyperweaver-agent/commit/fc3e64029c83c49823b3bfec02b1508c7c5e10b4))
* DPoP resource-server side — the Authorization scheme read, key-bound tokens only under DPoP with an RFC 9449 proof, bound-as-Bearer and unbound-as-DPoP refused, WWW-Authenticate on every 401 and exposed to CORS, RS256 and PS256 tokens with nbf, iat and a 60 s leeway, unknown kid refetched once; the event stream answers the topics the key's role may read; device-status held open until the flow changes ([9a58a35](https://github.com/Makr91/hyperweaver-agent/commit/9a58a35074bac54264e8be98d5b0c3aaca6b2f52))
* restart through the protocol handoff channel — the successor asks the running agent to release its port and databases and is answered once they are closed; HYPERWEAVER_RESTART, the bind and database retry loops and the browser poll removed ([aa36d60](https://github.com/Makr91/hyperweaver-agent/commit/aa36d606f27fba65c8b8ce8c1d1ddc1c3a53f2cf))
* search over machines, tasks, configuration files, templates and artifacts at GET /api/search with the OpenSearch description, the search status member and the update and search tokens, no preference store on the agent with the browser keeping a person's theme, mode, language and timezone, and the tray icon following ui.shi_mode live ([cae2ed1](https://github.com/Makr91/hyperweaver-agent/commit/cae2ed16bd3621e46cbe0f89c934e15e0d02206a))
* storage paths for machines, provisioners and templates, any number per kind with one default, a machine keeps the folder it was created in, storage_path_id on create and clone, /api/storage/paths routes, CONFIG_DIR honoured, Windows defaults for machines and provisioners under Roaming ([355cda0](https://github.com/Makr91/hyperweaver-agent/commit/355cda0039fe8a1b6bb10c788a6589539e05d61f))
* stream topics admin and monitoring — restart-required on every configuration save, restore and restart, admin-only with 403; cpu-sample, memory-sample and network-sample pushed when the collector takes them ([923c40b](https://github.com/Makr91/hyperweaver-agent/commit/923c40bb84c9fd61f0500ccea5b7a930590741cc))
* the family's release pipeline: the startcloud-ui pin in packaging/config/ui-version.yaml, the dependency-bump workflow, the bot token on release-please, prod-build and dev-build ([d9568d6](https://github.com/Makr91/hyperweaver-agent/commit/d9568d6de5e9959b5d7f8ad7f0a8005105ed79b4))
* utm support ([f564106](https://github.com/Makr91/hyperweaver-agent/commit/f564106e96277ffce9f5a1a7face4dd4c6593139))


### Bug Fixes

* a snapshot taken or deleted is written to the person's inbox like the other notable task ends ([578ab78](https://github.com/Makr91/hyperweaver-agent/commit/578ab78ab5a563ed229c717b6bfc99978c0a9eee))
* adding metrics ([4f01a3b](https://github.com/Makr91/hyperweaver-agent/commit/4f01a3b8d728379f9f66fbf5e85d68db9198d45c))
* dependency bumps, setup-go v7, zip-slip IsLocal barrier, provably-literal ORDER BY whitelist ([775fc84](https://github.com/Makr91/hyperweaver-agent/commit/775fc84683e0acc651efe80d6c71a868a4f3a83a))
* device sign-in slows its polling after a failed request and oidc.issuer must be https, finished items removed from the brief ([def1ed3](https://github.com/Makr91/hyperweaver-agent/commit/def1ed3c7eefb0e513bcb97782324c5eec2e4f39))
* every linter finding corrected in code, file reads through safepath, the refresh token in its own file, the deprecated curve check replaced, and golang.org/x/crypto raised past the ssh advisory ([64042d8](https://github.com/Makr91/hyperweaver-agent/commit/64042d85a3ffb5d72b0426d0fe50ca0e0cba9374))
* every plain comment naming an API route says its /api path, the secrets store's doc lines name the config routes in place of the retired settings surface ([33f8f30](https://github.com/Makr91/hyperweaver-agent/commit/33f8f30ac71fa66d5700cf295dda4db6417e9136))
* favorites and the notification inbox relay to the identity provider under the bound account's token with unread-count on the stream, the refresh token persists across restarts, a finished task with the notify flag is written to the person's inbox, key info and the profile carry issuer and subject, the brief loses its record-only sections ([8c1c51d](https://github.com/Makr91/hyperweaver-agent/commit/8c1c51dfe152cdeb05143dd427600518692d743d))
* final 500-line splits — settings schema literal extracted to section vars, server route table extracted to registerRoutes ([b82283d](https://github.com/Makr91/hyperweaver-agent/commit/b82283d678322c9ef6dff65cfb4fc932503568f3))
* GET /api/user in the identity provider's profile shape, GET and PATCH /api/user/preferences stored per person beside the config, profile-updated on the profile topic to that person alone, integrations in the scopes default ([ca12cfd](https://github.com/Makr91/hyperweaver-agent/commit/ca12cfd7d1b4e66ab68f7caab9065c8cc22fdd10))
* Hosts.yml Editor ([9b7fcc5](https://github.com/Makr91/hyperweaver-agent/commit/9b7fcc5c8794d162c53bbdde8fbc3b542116e4b7))
* hwa open carries the deploy query (create=machine with box or provisioner members) through to the signed-in UI, any other key refused ([ebc81d9](https://github.com/Makr91/hyperweaver-agent/commit/ebc81d9a322b8542d7924d2622a026454bd2a0a8))
* hyperweaver-agent and com.startcloud.hyperweaver-agent URL schemes beside hwa, on Windows, Linux and macOS ([e4fe3a2](https://github.com/Makr91/hyperweaver-agent/commit/e4fe3a2eb24bcb8f189e69ee045a4a04f2a172cc))
* machine-scoped WebSocket tickets — frozen cross-agent shape enforced on all five upgrade endpoints ([be2a4f7](https://github.com/Makr91/hyperweaver-agent/commit/be2a4f748aae4086525e36b96ecfe37929fe1fad))
* NAT forwards in the machine detail, setup_token in the bootstrap body, full paths in three API descriptions ([3530cb7](https://github.com/Makr91/hyperweaver-agent/commit/3530cb7110407daddec12e01ca474dcb4ea7c5e6))
* network-spaces surface, per-adapter VM traffic, NIC re-attachment, host address mutations, io_delay_pct, tray-key pruning, darwin-only utm prereq ([4a372d7](https://github.com/Makr91/hyperweaver-agent/commit/4a372d7cf3217198f54c70c4d8e686553702ee3f))
* OIDC client, validator and token source move to internal/oidc with the four handlers left in the server, Debian control depends on adduser and ca-certificates, the Windows installer drops its startup shortcut, README, CONTRIBUTING, Debian README and man5 describe the five configuration files, VBoxManage and Go 1.25.0, the brief loses its done rows ([a4ce4e6](https://github.com/Makr91/hyperweaver-agent/commit/a4ce4e6ce59bff186af03bbd6218c6da67466e43))
* OIDC device-flow login — RFC 8628 device grant, JWKS validation, TOFU account binding, admin-key mint, in-memory token refresh ([acf7b4c](https://github.com/Makr91/hyperweaver-agent/commit/acf7b4ca8d7725013a56b042a6399bdccc7dd373))
* OIDC manager split into binding, provider, validator, token source and client, 42 Swagger annotations name the structs the handlers write, man pages and CONTRIBUTING describe the five configuration files and VBoxManage, the brief loses its done rows ([c52f096](https://github.com/Makr91/hyperweaver-agent/commit/c52f096dcfb1117b294f6d127a670bd6545df5af))
* OIDC resource server — bearer access-token auth on the Agent API, JWKS cache with rotation retry, TOFU subject gate ([67b2d83](https://github.com/Makr91/hyperweaver-agent/commit/67b2d838da7e696f054659a6303959b93e5b431e))
* oidc scopes default drops organizations, the update check answers 200 with the reason, last_modified_by is the OIDC key's email, config wire fixtures and the agent's section 9 record in the brief ([2e1f39a](https://github.com/Makr91/hyperweaver-agent/commit/2e1f39ac2544f7ea5da2e0e74e85108534fe1fc6))
* OIDC UUID-first account binding with sub fallback, allowed_users matches UUIDs, device-start errors name the endpoint ([a66de3b](https://github.com/Makr91/hyperweaver-agent/commit/a66de3ba5fb0c3789f2508647e7a39c12ec272dd))
* RDP, API Shaping, General Improvments ([d6c1101](https://github.com/Makr91/hyperweaver-agent/commit/d6c1101156d305728a67dd1e91069bf7dbcd9146))
* RDP, API Shaping, General Improvments ([6a0f180](https://github.com/Makr91/hyperweaver-agent/commit/6a0f180a710050b8b8062c352654ef245f68659a))
* RDP, API Shaping, General Improvments ([fbb4213](https://github.com/Makr91/hyperweaver-agent/commit/fbb4213e4c50e85d24e7de7f465211159eb025cd))
* round-4 swaggo migration — machines, artifacts, provisioners, monitoring, terminals migrate to inline annotations; fragment keys deleted ([6137b15](https://github.com/Makr91/hyperweaver-agent/commit/6137b15c1eec49df40121db3dc19914920b3a13e))
* sidebar token and links.community in the status payload so the shared UI draws its shell in agent mode ([5150f80](https://github.com/Makr91/hyperweaver-agent/commit/5150f80cd70907518d1690f7ee97f6609d8800b2))`;
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

const releaseAssets = () =>
  RELEASE_ASSETS.map(([name, size, checksum]) => ({
    name,
    url: `${RELEASE_DOWNLOADS}/${name}`,
    size,
    checksum,
  }));

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
        release_notes: RELEASE_NOTES,
        assets: releaseAssets(),
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

const msg = (status, text, headers = {}) => ok({ msg: text }, status, headers);

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
    return msg(401, KEY_REQUIRED, refusedCookies(ctx.req));
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

const agentUser = ctx => {
  const row = keyOf(ctx);
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
    preferred_language: null,
    preferred_mode: null,
    preferred_theme: null,
    preferred_motion: null,
    preferred_timezone: null,
  });
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
  return empty(
    204,
    sessionCookies(mintKey(selfHost(ctx), 'Tray', 'Minted by the tray handoff').key)
  );
};

const openSession = ctx => {
  const key = String(ctx.body.api_key || '');
  const row = stateOf(selfHost(ctx)).keys.find(entry => entry.key && entry.key === key);
  if (!row) {
    return msg(401, 'Invalid API key', refusedCookies(ctx.req));
  }
  return empty(204, sessionCookies(row.key));
};

const closeSession = () => empty(204, clearedCookies());

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
  if (flow.pasted === false) {
    return ok({ status: 'pending' });
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
  return ok(
    {
      status: 'approved',
      entity_id: row.id,
      name: row.name,
      role: row.role,
      message: 'Login successful',
    },
    200,
    sessionCookies(row.key)
  );
};

const silentStart = () =>
  refusal(502, 'Identity provider unreachable: no identity provider is configured on the mock');

const CODE_EXPIRES_S = 300;

const codeStart = ctx => {
  const state = stateOf(selfHost(ctx));
  const handle = randomBytes(8).toString('hex');
  const flowState = randomBytes(16).toString('hex');
  const url = `https://auth.example.com/oauth2/authorize?response_type=code&client_id=hyperweaver-agent&redirect_uri=https%3A%2F%2Fauth.example.com%2Foauth2%2Fcode&state=${flowState}&code_challenge_method=S256`;
  state.flows.set(handle, { checks: CHECKS_TO_APPROVE - 1, state: flowState, pasted: false });
  return ok({ handle, authorize_url: url, manual_url: url, expires_in: CODE_EXPIRES_S });
};

const codeExchange = ctx => {
  const state = stateOf(selfHost(ctx));
  const flow = state.flows.get(String(ctx.body.handle || ''));
  const [code, flowState] = String(ctx.body.code || '').split('#');
  if (!flow) {
    return refusal(404, 'Unknown login handle');
  }
  if (!code) {
    return refusal(400, 'code is required');
  }
  if (flowState && flow.state && flowState !== flow.state) {
    return refusal(400, 'state does not match the flow');
  }
  flow.pasted = true;
  return ok({ status: 'approved' });
};

/**
 * The Agent settings page's routes on every host: the update check
 * carrying the 0.2.0 release's notes as markdown and its five assets, and
 * its apply, a queued task, the secrets behind `secrets`, and the API
 * keys with their generate, bootstrap and delete;
 * and on the `hyperweaver-agent` role the six sign-in paths of its
 * brief, public and under `/api`, every one that signs in answering the
 * agent's session cookie and no key: the profile of a key, read with
 * the key as its bearer or its session cookie and refused 401 without
 * one, the cookie cleared, and 403 for an unknown one; a pasted key
 * handed to `POST /api/auth/session`, answered 204 for a live key and 401
 * for any other; `POST /api/auth/logout`, answered 204 with the cookie
 * cleared; the first-boot bootstrap under `setup_token`, open once; the
 * tray claim of the seeded token `tray-demo-token`, answered 204; the
 * device flow, approved on its second status check and minting a key
 * bound to the fixture's person, whose profile then carries
 * `auth_provider`, `email`, `customer_id`, `issuer` and `subject`; the
 * code flow, its start
 * answering a handle, an authorize URL and the same URL as the one a
 * person visits by hand, whose state the flow keeps, its status pending
 * until a code is pasted to
 * `POST /api/auth/oidc/code` with the handle, a state after the hash
 * checked against the flow's, and approved on the next status check as
 * the device flow is; and the silent probe, answered
 * 502 since no identity provider is reachable here. A minted key signs
 * in as the fixture's person. Beside them the person behind a key:
 * `GET /api/user` in the identity provider's shape under the key's own
 * role, every `preferred_*` member null because the agent keeps no user
 * preferences, and the favorites relayed as the mock's own store under a
 * key a federated login minted, 404 for a plain one.
 *
 * @param {Object} router - `publicRoute`, `sessionRoute` and `agentRoute`
 * @returns {void}
 */
export const mountAgentSettings = ({ publicRoute, sessionRoute, agentRoute }) => {
  if (APIKEY_MODE) {
    publicRoute('GET', '/api/api-keys/info', keyInfo);
    publicRoute('POST', '/api/api-keys/bootstrap', bootstrapFirstKey);
    publicRoute('POST', '/api/auth/tray-claim', trayClaim);
    publicRoute('POST', '/api/auth/session', openSession);
    publicRoute('POST', '/api/auth/logout', closeSession);
    publicRoute('POST', '/api/auth/oidc/device-start', deviceStart);
    publicRoute('GET', '/api/auth/oidc/device-status', deviceStatus);
    publicRoute('POST', '/api/auth/oidc/code-start', codeStart);
    publicRoute('POST', '/api/auth/oidc/code', codeExchange);
    publicRoute('POST', '/api/auth/oidc/silent-start', silentStart);
    sessionRoute('GET', '/api/user', agentUser);
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
