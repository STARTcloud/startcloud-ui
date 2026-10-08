import { createApiClient } from './apiClient';

const INFO_PATH = '/api/api-keys/info';
const USER_PATH = '/api/user';
const SESSION_PATH = '/api/auth/session';
const LOGOUT_PATH = '/api/auth/logout';
const TRAY_CLAIM_PATH = '/api/auth/tray-claim';
const SILENT_START_PATH = '/api/auth/oidc/silent-start';
const CODE_START_PATH = '/api/auth/oidc/code-start';
const AUTH_CHANNEL = 'hw-auth';
const AUTH_PING = 'auth-ping';
const AUTH_PONG = 'auth-pong';
const AUTH_UPDATED = 'auth-updated';
const TRAY_TOKEN = /[#&]tray=(?<token>[A-Za-z0-9_-]+)/u;
const UNAUTHORIZED = 401;
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
const OPTIONAL = { auth: 'optional' };
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let trayClaim = null;

const isDead = error => error?.status === UNAUTHORIZED;

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

const identityOf = record =>
  record?.id === undefined || record.id === null ? '' : String(record.id);

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
 * @param {Object} profile - The cached profile of `GET /api/api-keys/info`
 * @param {Object|null} account - The answer of `GET /api/user`, or null
 * @returns {Object} The user
 */
export const userOfAccount = (profile, account) => ({
  ...recordOfAccount(account),
  ...userOfKeyProfile(profile),
});

/**
 * hyperweaver-agent's cookie session over its API keys, the provider of
 * the word `apikey`: the agent's one HttpOnly `__Host-hwa_session` cookie,
 * which the browser carries with its same-origin credentials on every
 * request and on the event stream, `headers()` answering `{}` for every
 * method because the agent guards its writes by the browser's own
 * `Sec-Fetch-Site` and `Origin` headers and the page attaches nothing, no
 * refresh (`retryAuth` false) and no credential rotated in a header; the
 * browser never holds the key. Of the profile
 * `GET /api/api-keys/info` answers, the display members the session reads
 * are cached under `storageKey`, never the key, `last_used` or another
 * member that moves on every request, so a profile read again writes the
 * same record and no other tab of the origin hears a `storage` event for
 * a record that did not change. `load()`, `reload()` and `refresh()` read
 * the profile while a record is cached, a `401` there clearing the
 * record, a dead session, while any other failure keeps it, so an agent
 * that is restarting never signs a person out; a `403` on any other route
 * is a role too low and touches the session not at all. Five ways in:
 * `login(key)` hands a pasted key to `POST /api/auth/session`, which
 * answers `204` with the cookie set or `401`, then reads the profile;
 * `adopt()` reads the profile of the session the agent's cookie already
 * carries, the approved answer of the code flow's device-status request
 * having set it; `begin({ method: 'silent' })` asks
 * `POST /api/auth/oidc/silent-start` for a `prompt=none` authorize URL
 * and navigates there, the identity provider returning through the
 * agent's own callback to `/#tray=`; `begin({ method: 'code' })` starts
 * the RFC 8252 authorization-code flow through
 * `POST /api/auth/oidc/code-start` and answers the flow, its handle, its
 * authorize URL, the URL a person visits by hand and its life, the page
 * opening the authorize URL and reading the approval with the agent's
 * held device-status request; `complete()` claims the `#tray=` token of a
 * tray Open or an `hwa://open` through `POST /api/auth/tray-claim`, which
 * sets the cookie, once per page load, the fragment stripped before the
 * claim is sent, a cached session that still validates outranking the
 * claim so the agent's key list never grows by one per Open, and answers
 * the claimed session once, to the first caller, and never after the
 * record was forgotten, so a sign-in page reached after a sign-out is
 * never sent away by the claim of the page load before it; the first-boot
 * bootstrap and the desktop hand-off are the sign-in page's. `login()`
 * and `adopt()` await `login` on the bus. `load()` runs the claim first on
 * any route, the tray landing the browser on `/` and not on the sign-in
 * page. A sign-in the provider completed is answered once by the next
 * `load()` without a second read, the profile the sign-in just proved
 * standing for it. A handoff tells the other tabs of the origin over the
 * `BroadcastChannel` `hw-auth`: `auth-ping`, which every open tab answers
 * with `auth-pong`, then `auth-updated` naming the storage key that
 * changed, the `storage` event the fallback, a tab that hears it while
 * signed out or holding another key's session, the cached profile's `id`
 * differing from its own, reloading into the session; the tab the tray or
 * the hand-off opened closes itself the moment a pong arrives and stays
 * open while none does, so a tab a person opened is never closed and
 * nothing waits on a clock, the answer itself being the signal. Once the
 * profile is read, `GET /api/user` is read on the same session and held
 * in memory, the person's record in the identity provider's shape without
 * its `preferred_*` members, because the agent keeps no user preferences:
 * the mode, the theme, the motion switch and the language are the
 * browser's own `mode`, `theme`, `motion` and `language` keys, written by
 * the person's own controls, and the time zone the browser's own
 * `timezone` key, read through `ownTimezone()`; a `404` there leaves the
 * key's profile as the whole identity, and any other failure keeps the
 * record last held. `savePreferences()` writes the patch's `timezone`
 * under that key, a null removing it, and sends nothing, the agent having
 * no preferences write. The agent has no organizations: the session is
 * `{ user, organizations: [], oidc: false, issuerUrl, clientId: '' }`,
 * `issuerUrl` the profile's `issuer` while a federated login minted the
 * key and empty otherwise, and `claims()` null. `signOut()` forgets the
 * record and sends `POST /api/auth/logout`, which clears the cookie;
 * `signOutEverywhere()` does the same and lands on `/`; `endSession()`
 * forgets the record and ends the session on the bus while a record is
 * cached, and does nothing while none is, so the refusals of requests
 * sent after a sign-out end no session twice.
 *
 * @param {Object} options - The app's side of the session
 * @param {string} options.baseUrl - The agent's origin, the one that served the page
 * @param {Object} options.events - The bus from `createSessionEvents`; `login` is awaited after a sign-in and `sessionEnded` emitted when the agent rejects the session
 * @param {string} [options.storageKey] - localStorage key of the cached profile
 * @returns {Object} The session provider `useSession`, the API client and the sign-in page drive
 */
export const createApiKeySession = ({ baseUrl, events, storageKey = 'apikey' }) => {
  let held = '';
  let account = null;
  let answered = null;
  let claimPending = null;
  let completePending = null;

  const current = () => JSON.parse(localStorage.getItem(storageKey) || 'null');

  const store = profile => {
    const record = recordOf(profile);
    localStorage.setItem(storageKey, JSON.stringify(record));
    held = identityOf(record);
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

  held = identityOf(current());

  const headers = () => Promise.resolve({});

  const retryAuth = () => Promise.resolve(false);

  const adoptResponse = () => undefined;

  const endSession = () => {
    if (!current()) {
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
    identityOf(record)
      ? {
          user: userOfAccount(record, account),
          organizations: [],
          oidc: false,
          issuerUrl: record.issuer || '',
          clientId: '',
        }
      : null;

  const restore = () => sessionOf(current());

  const accountOf = async () => {
    try {
      return await client.get(USER_PATH, OPTIONAL);
    } catch (error) {
      return error?.status === NOT_FOUND ? null : account;
    }
  };

  const prove = async () => {
    const profile = await client.get(INFO_PATH, OPTIONAL);
    account = await accountOf();
    store(profile);
    return restore();
  };

  const keep = async () => {
    answered = await prove();
    return answered;
  };

  const channel = channelOf();
  let handingOff = false;

  const stale = () => {
    const stored = identityOf(current());
    return Boolean(stored) && stored !== held;
  };

  const post = type => channel?.postMessage({ type, key: storageKey, senderId: TAB_ID });

  const announce = () => {
    handingOff = true;
    post(AUTH_PING);
    post(AUTH_UPDATED);
  };

  const hear = ({ type, key, senderId }) => {
    if (key !== storageKey || senderId === TAB_ID) {
      return;
    }
    if (type === AUTH_PING) {
      post(AUTH_PONG);
    } else if (type === AUTH_PONG && handingOff) {
      window.close();
    } else if (type === AUTH_UPDATED && stale()) {
      window.location.reload();
    }
  };

  if (channel) {
    channel.onmessage = event => hear(event.data || {});
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey && event.newValue && stale()) {
      window.location.reload();
    }
  });

  const validateStored = async () => {
    try {
      answered = await prove();
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
    if (current()) {
      const kept = await validateStored();
      if (kept) {
        stripFragment();
        announce();
        return kept;
      }
    }
    stripFragment();
    const claimed = await client.post(TRAY_CLAIM_PATH, { token }, OPTIONAL).then(
      () => true,
      () => false
    );
    if (!claimed) {
      return null;
    }
    const session = await keep().catch(() => null);
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

  const readProfile = async () => {
    try {
      return await prove();
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
    if (!current()) {
      return null;
    }
    return readProfile();
  };

  const begin = ({ method = '', navigate } = {}) => {
    if (method === 'silent') {
      return client.post(SILENT_START_PATH, {}, OPTIONAL).then(answer => {
        if (answer?.authorize_url) {
          window.location.assign(answer.authorize_url);
        }
        return answer;
      });
    }
    if (method === 'code') {
      return client.post(CODE_START_PATH, {}, OPTIONAL);
    }
    navigate('/login');
    return Promise.resolve(null);
  };

  const adopt = async () => {
    const session = await keep();
    await events.emit('login');
    return session;
  };

  const login = async apiKey => {
    await client.post(SESSION_PATH, { api_key: String(apiKey || '').trim() }, OPTIONAL);
    return adopt();
  };

  const claims = () => Promise.resolve(null);

  const savePreferences = patch => {
    if ('timezone' in patch) {
      writeOwn(TIMEZONE_KEY, patch.timezone);
    }
    return Promise.resolve();
  };

  const logout = () =>
    client.post(LOGOUT_PATH, null, OPTIONAL).then(
      () => undefined,
      () => undefined
    );

  const signOut = () => {
    forget();
    return logout();
  };

  const signOutEverywhere = async () => {
    forget();
    await logout();
    window.location.assign('/');
  };

  return {
    id: 'apikey',
    issuerUrl: '',
    oidc: false,
    storageKey,
    current,
    restore,
    load,
    reload: load,
    refresh: load,
    begin,
    login,
    adopt,
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
