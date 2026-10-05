import { createApiClient } from './apiClient';

const INFO_PATH = '/api/api-keys/info';
const USER_PATH = '/api/user';
const TRAY_CLAIM_PATH = '/api/auth/tray-claim';
const SILENT_START_PATH = '/api/auth/oidc/silent-start';
const CODE_START_PATH = '/api/auth/oidc/code-start';
const AUTH_CHANNEL = 'hw-auth';
const AUTH_UPDATED = 'auth-updated';
const TRAY_TOKEN = /[#&]tray=(?<token>[A-Za-z0-9_-]+)/u;
const DEAD_STATUSES = [401, 403];
const ROLES = { admin: 'super-admin', operator: 'admin', viewer: 'user' };
const ADMIN_ROLES = ['ROLE_USER', 'ROLE_ADMIN'];
const USER_ROLES = ['ROLE_USER'];
const KEPT_MEMBERS = [
  'id',
  'name',
  'role',
  'email',
  'auth_provider',
  'customer_id',
  'issuer',
  'subject',
];
const PREFERENCE_MEMBERS = [
  'preferred_mode',
  'preferred_theme',
  'preferred_motion',
  'preferred_language',
  'preferred_timezone',
];
const TIMEZONE_KEY = 'timezone';
const NOT_FOUND = 404;
const PUBLIC = { auth: false };
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let trayClaim = null;

const bearer = key => ({ Authorization: `Bearer ${key}` });

const isDead = error => DEAD_STATUSES.includes(error?.status);

const channelOf = () => {
  try {
    return new BroadcastChannel(AUTH_CHANNEL);
  } catch {
    return null;
  }
};

const stripFragment = () =>
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

const recordOf = profile =>
  Object.fromEntries(
    KEPT_MEMBERS.filter(member => profile?.[member] !== undefined).map(member => [
      member,
      profile[member],
    ])
  );

const recordOfAccount = account =>
  Object.fromEntries(
    Object.entries(account || {}).filter(([member]) => !PREFERENCE_MEMBERS.includes(member))
  );

const writeOwn = (key, value) => {
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
};

/**
 * The time zone the person chose on an agent host, the browser's own
 * `timezone` key; empty while none is chosen.
 *
 * @returns {string} The IANA zone name, or the empty string
 */
export const ownTimezone = () => localStorage.getItem(TIMEZONE_KEY) || '';

/**
 * The tray token a URL fragment carries, hyperweaver-ui's `#tray=`, the
 * single-use token the agent's tray Open and its `hwa://open` hand-off
 * put there; empty when the fragment carries none.
 *
 * @param {string} hash - `window.location.hash`
 * @returns {string} The token, or the empty string
 */
export const trayTokenOf = hash => TRAY_TOKEN.exec(String(hash || ''))?.groups.token || '';

/**
 * The session's user of an agent's API key, from the profile
 * `GET /api/api-keys/info` answered: the key's id, its name as the
 * username and the name, the federated identity a login minted the key
 * with where the profile carries it, the identity provider's origin as
 * `issuer` and the account's stable id as `subject`, null on a tray or
 * typed key, and the key's own role mapped onto
 * the hosts feature's ladder, the agent's `admin` its highest role and
 * so `super-admin`, `operator` `admin` and `viewer` `user`, with the
 * global `ROLE_ADMIN` beside it for an `admin` key, because the agent's
 * configuration routes are admin-only and the shared admin pages read
 * that one predicate.
 *
 * @param {Object} profile - The answer of `GET /api/api-keys/info`
 * @returns {Object} The user
 */
export const userOfKeyProfile = profile => ({
  id: profile.id,
  username: profile.name,
  name: profile.name,
  email: profile.email ?? null,
  auth_provider: profile.auth_provider ?? null,
  customer_id: profile.customer_id ?? null,
  issuer: profile.issuer ?? null,
  subject: profile.subject ?? null,
  role: ROLES[profile.role],
  roles: profile.role === 'admin' ? ADMIN_ROLES : USER_ROLES,
});

/**
 * The session's user while the agent answers `GET /api/user`: that
 * record in the identity provider's shape without its `preferred_*`
 * members, because the agent keeps no user preferences and the chrome
 * applies the browser's own keys, under the key's own profile, whose role
 * map decides `role` and `roles`; the key's profile alone while the agent
 * answered none.
 *
 * @param {Object} profile - The stored profile of `GET /api/api-keys/info`
 * @param {Object|null} account - The answer of `GET /api/user`, or null
 * @returns {Object} The user
 */
export const userOfAccount = (profile, account) => ({
  ...recordOfAccount(account),
  ...userOfKeyProfile(profile),
});

/**
 * hyperweaver-agent's API key as the session, the provider of the word
 * `apikey`: the key and, of the profile `GET /api/api-keys/info` answered
 * for it, the members the session reads stored together under
 * `storageKey`, never `last_used` or another member that moves on every
 * request, so a profile read again writes the same record and no other
 * tab of the origin hears a `storage` event for a record that did not
 * change; every request carrying the key as `Authorization: Bearer`, no
 * refresh (`retryAuth` false) and no credential rotated in a header.
 * `load()`, `reload()` and `refresh()` read the profile with the stored
 * key, a `401` or `403` there clearing the record, a dead credential,
 * while any other failure keeps it, so an agent that is restarting never
 * signs a person out; a `403` on any other route is a role too low and
 * touches the session not at all. Five ways in: `login(key)` proves a
 * pasted key with the profile read and stores it; `begin({ method:
 * 'silent' })` asks `POST /api/auth/oidc/silent-start` for a
 * `prompt=none` authorize URL and navigates there, the identity provider
 * returning through the agent's own callback to `/#tray=`;
 * `begin({ method: 'code' })` starts the RFC 8252 authorization-code
 * flow through `POST /api/auth/oidc/code-start` and answers the flow,
 * its handle, its authorize URL, the URL a person visits by hand and its
 * life, the page opening the authorize URL and reading the approved key
 * with the agent's held device-status request; `complete()` claims the
 * `#tray=` token of a tray Open or an
 * `hwa://open` once per page load, the fragment stripped before the
 * claim is sent, a stored key that still validates outranking the claim
 * so the agent's key list never grows by one per Open, and answers the
 * claimed session once, to the first caller, and never after the record
 * was forgotten, so a sign-in page reached after a sign-out is never sent
 * away by the claim of the page load before it; the first-boot bootstrap
 * and the desktop hand-off are the sign-in page's. `load()` runs the
 * claim first on any route, the tray landing the browser on `/` and not
 * on the sign-in page. A sign-in the provider completed is answered once
 * by the next `load()` without a second read, the profile the sign-in
 * just proved standing for it. A handoff tells the other tabs over the
 * `BroadcastChannel` `hw-auth`, `auth-updated` naming the storage key
 * that changed, the `storage` event the fallback, and a tab that hears it
 * while signed out or holding another key reloads; no ping, no pong and
 * no self-close, hyperweaver-ui's two timers, the handoff tab staying
 * open. Once the key is proved, `GET /api/user` is read with the same
 * bearer and held in memory, the person's record in the identity
 * provider's shape without its `preferred_*` members, because the agent
 * keeps no user preferences: the mode, the theme, the motion switch and
 * the language are the browser's own `mode`, `theme`, `motion` and
 * `language` keys, written by the person's own controls, and the time
 * zone the browser's own `timezone` key, read through `ownTimezone()`; a
 * `404` there leaves the key's profile as the whole identity, and any
 * other failure keeps the record last held. `savePreferences()` writes
 * the patch's `timezone` under that key, a null removing it, and sends
 * nothing, the agent having no preferences write. The agent has no organizations and no sign-out
 * route: the session is
 * `{ user, organizations: [], oidc: false, issuerUrl, clientId: '' }`,
 * `issuerUrl` the profile's `issuer` while a federated login minted the
 * key and empty otherwise, `claims()` null, and both sign-outs forget
 * the record; `endSession()` forgets it and ends the session on the bus
 * while a record is stored, and does nothing while none is, so the
 * refusals of requests sent after a sign-out end no session twice.
 *
 * @param {Object} options - The app's side of the session
 * @param {string} options.baseUrl - The agent's origin, the one that served the page
 * @param {Object} options.events - The bus from `createSessionEvents`; `login` is awaited after a sign-in and `sessionEnded` emitted when the agent rejects the session
 * @param {string} [options.storageKey] - localStorage key of the stored record
 * @returns {Object} The session provider `useSession`, the API client and the sign-in page drive
 */
export const createApiKeySession = ({ baseUrl, events, storageKey = 'apikey' }) => {
  let held = '';
  let account = null;
  let answered = null;
  let claimPending = null;
  let completePending = null;

  const current = () => JSON.parse(localStorage.getItem(storageKey) || 'null');

  const store = (key, profile) => {
    localStorage.setItem(storageKey, JSON.stringify({ key, profile: recordOf(profile) }));
    held = key;
  };

  const clear = () => {
    localStorage.removeItem(storageKey);
    held = '';
    account = null;
    answered = null;
  };

  const forget = () => {
    clear();
    completePending = null;
  };

  held = current()?.key || '';

  const authHeader = () => {
    const key = current()?.key;
    return key ? bearer(key) : {};
  };

  const headers = () => Promise.resolve(authHeader());

  const retryAuth = () => Promise.resolve(false);

  const adoptResponse = () => undefined;

  const endSession = () => {
    if (!current()?.key) {
      return;
    }
    forget();
    events.endSession();
  };

  const client = createApiClient({
    baseUrl,
    session: { headers, retryAuth, adoptResponse, endSession },
  });

  const sessionOf = record =>
    record?.key && record.profile
      ? {
          user: userOfAccount(record.profile, account),
          organizations: [],
          oidc: false,
          issuerUrl: record.profile.issuer || '',
          clientId: '',
        }
      : null;

  const restore = () => sessionOf(current());

  const profileOf = key => client.get(INFO_PATH, { ...PUBLIC, headers: bearer(key) });

  const accountOf = async key => {
    try {
      return await client.get(USER_PATH, { ...PUBLIC, headers: bearer(key) });
    } catch (error) {
      return error?.status === NOT_FOUND ? null : account;
    }
  };

  const prove = async key => {
    const profile = await profileOf(key);
    account = await accountOf(key);
    store(key, profile);
    return restore();
  };

  const keep = async key => {
    answered = await prove(key);
    return answered;
  };

  const channel = channelOf();

  const stale = () => {
    const stored = current()?.key || '';
    return Boolean(stored) && stored !== held;
  };

  const announce = () => {
    channel?.postMessage({ type: AUTH_UPDATED, key: storageKey, senderId: TAB_ID });
  };

  if (channel) {
    channel.onmessage = event => {
      const { type, key, senderId } = event.data || {};
      if (type === AUTH_UPDATED && key === storageKey && senderId !== TAB_ID && stale()) {
        window.location.reload();
      }
    };
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey && event.newValue && stale()) {
      window.location.reload();
    }
  });

  const validateStored = async stored => {
    try {
      answered = await prove(stored.key);
      return answered;
    } catch (error) {
      if (isDead(error)) {
        clear();
        return null;
      }
      return restore();
    }
  };

  const claimOnce = async token => {
    const stored = current();
    if (stored?.key) {
      const kept = await validateStored(stored);
      if (kept) {
        stripFragment();
        announce();
        return kept;
      }
    }
    stripFragment();
    const answer = await client.post(TRAY_CLAIM_PATH, { token }, PUBLIC).catch(() => null);
    if (!answer?.api_key) {
      return null;
    }
    const session = await keep(answer.api_key).catch(() => null);
    if (session) {
      announce();
    }
    return session;
  };

  const claim = () => {
    const token = trayTokenOf(window.location.hash);
    if (token && !trayClaim) {
      trayClaim = claimOnce(token);
      claimPending = trayClaim;
      completePending = trayClaim;
    }
    return trayClaim;
  };

  const complete = () => {
    claim();
    const pending = completePending;
    completePending = null;
    return pending || Promise.resolve(null);
  };

  const readProfile = async record => {
    try {
      return await prove(record.key);
    } catch (error) {
      if (isDead(error)) {
        forget();
        return null;
      }
      return restore();
    }
  };

  const load = async () => {
    claim();
    if (claimPending) {
      const pending = claimPending;
      claimPending = null;
      const claimed = await pending;
      if (claimed) {
        answered = null;
        return claimed;
      }
    }
    if (answered) {
      const session = answered;
      answered = null;
      return session;
    }
    const record = current();
    if (!record?.key) {
      return null;
    }
    return readProfile(record);
  };

  const begin = ({ method = '', navigate } = {}) => {
    if (method === 'silent') {
      return client.post(SILENT_START_PATH, {}, PUBLIC).then(answer => {
        if (answer?.authorize_url) {
          window.location.assign(answer.authorize_url);
        }
        return answer;
      });
    }
    if (method === 'code') {
      return client.post(CODE_START_PATH, {}, PUBLIC);
    }
    navigate('/login');
    return Promise.resolve(null);
  };

  const login = async apiKey => {
    const session = await keep(String(apiKey || '').trim());
    await events.emit('login');
    return session;
  };

  const claims = () => Promise.resolve(null);

  const savePreferences = patch => {
    if ('timezone' in patch) {
      writeOwn(TIMEZONE_KEY, patch.timezone);
    }
    return Promise.resolve();
  };

  const signOut = () => forget();

  const signOutEverywhere = () => {
    forget();
    window.location.assign('/');
    return Promise.resolve();
  };

  return {
    id: 'apikey',
    issuerUrl: '',
    oidc: false,
    storageKey,
    authHeader,
    current,
    restore,
    load,
    reload: load,
    refresh: load,
    begin,
    login,
    complete,
    headers,
    retryAuth,
    adoptResponse,
    endSession,
    claims,
    savePreferences,
    signOut,
    signOutEverywhere,
  };
};
