import { createApiClient } from './apiClient';

const DISPLAY_FIELDS = ['name', 'email', 'picture', 'roles', 'organizations', 'has_local_auth'];
const DROPPED_KEYS = [
  'intended_url',
  'activeOrganization',
  'push_enabled',
  'login_method',
  'sidebar_width',
  'sidebar_minimized',
];
const DROPPED_PREFIXES = ['table_prefs_', 'sidebar_open_', 'sidebar_view_'];
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const XSRF_COOKIES = ['__Host-XSRF-TOKEN', 'XSRF-TOKEN'];
const THEME_VALUES = ['auto', 'light', 'dark'];
const PROVIDER_NAME = /^[A-Za-z0-9_-]+$/;
const SAFE_PATH = /^\/(?![/\\])/;
const OPTIONAL = { auth: 'optional' };
const JSON_ACCEPT = { Accept: 'application/json' };

const cookieValue = name =>
  document.cookie
    .split('; ')
    .filter(entry => entry.startsWith(`${name}=`))
    .map(entry => decodeURIComponent(entry.slice(name.length + 1)))[0] || '';

const xsrfToken = () => XSRF_COOKIES.map(cookieValue).find(Boolean) || '';

const applyAccountPreferences = preferences => {
  if (!preferences) {
    return;
  }
  if (THEME_VALUES.includes(preferences.theme)) {
    localStorage.setItem('theme', preferences.theme);
  }
  if (preferences.language) {
    localStorage.setItem('i18nextLng', preferences.language);
  }
};

const displayFieldsOf = profile =>
  Object.fromEntries(DISPLAY_FIELDS.map(field => [field, profile?.[field] ?? null]));

const dropStorage = storageKey => {
  const keys = Object.keys(localStorage);
  keys
    .filter(
      key =>
        key === storageKey ||
        DROPPED_KEYS.includes(key) ||
        DROPPED_PREFIXES.some(prefix => key.startsWith(prefix))
    )
    .forEach(key => localStorage.removeItem(key));
};

const safeNext = (next, origin) => {
  const value = typeof next === 'string' ? next : '';
  if (SAFE_PATH.test(value)) {
    return value;
  }
  if (value.startsWith(`${origin}/`)) {
    return value;
  }
  return '';
};

/**
 * The memberships of the issuer's profile in the chrome's organization
 * shape: the uuid as the uuid, the roles list as it is, and the primary
 * flag.
 * @param {Object|null|undefined} user - The cached profile
 * @returns {Array<{ uuid: string, name: string, roles: string[], primary: boolean }>}
 */
export const accountMemberships = user =>
  (Array.isArray(user?.organizations) ? user.organizations : []).map(org => ({
    uuid: org.uuid,
    name: org.name,
    roles: Array.isArray(org.roles) ? org.roles.map(role => String(role).toUpperCase()) : [],
    primary: Boolean(org.primary),
  }));

/**
 * The identity provider's own session on its own origin: the HttpOnly
 * session cookie the browser carries, the `XSRF-TOKEN` cookie echoed as
 * `X-XSRF-TOKEN` on every method but GET, HEAD and OPTIONS, the display
 * fields of the profile cached under `storageKey`, `GET /api/user` as the
 * one confirmation of a session, the form-encoded `POST /login` answering
 * `next`, and `POST /user/logout` for both sign-outs. A session it
 * restores or loads is `{ user, organizations, oidc, issuerUrl }`, the
 * user being the cached display fields and `oidc` always false. The API
 * client drives `headers`, `retryAuth`, `adoptResponse` and `endSession`.
 * `load({ navigate })` and `begin({ method, navigate })` take the router's
 * `navigate` from `useSession`: a `403 onboarding_required` caches the
 * pending profile the body carries and moves in-router to its `next`, and
 * `begin` with no method, `local` or `magic-link` moves in-router to
 * `/login`, while `oidc-<id>` stays a top-level navigation.
 *
 * @param {Object} options - The app's side of the session
 * @param {string} options.baseUrl - The serving origin, the issuer itself
 * @param {Object} options.events - The bus from `createSessionEvents`; `login` is emitted after a sign-in and `sessionEnded` when the issuer rejects the session
 * @param {string} [options.storageKey] - localStorage key of the cached display fields
 * @returns {Object} The session provider `useSession`, the API client and the sign-in page drive
 */
export const createCookieSession = ({ baseUrl, events, storageKey = 'account' }) => {
  let claimsPromise = null;

  const current = () => JSON.parse(localStorage.getItem(storageKey) || 'null');

  const store = profile => {
    localStorage.setItem(storageKey, JSON.stringify(displayFieldsOf(profile)));
  };

  const clear = () => {
    localStorage.removeItem(storageKey);
    claimsPromise = null;
  };

  const headers = (method = 'GET') => {
    if (SAFE_METHODS.includes(String(method).toUpperCase())) {
      return Promise.resolve({});
    }
    const token = xsrfToken();
    return Promise.resolve(token ? { 'X-XSRF-TOKEN': token } : {});
  };

  const retryAuth = () => Promise.resolve(false);

  const adoptResponse = () => undefined;

  const endSession = () => {
    clear();
    dropStorage(storageKey);
    events.endSession();
  };

  const provider = { headers, retryAuth, adoptResponse, endSession };

  const api = createApiClient({ baseUrl, session: provider });

  const sessionOf = user => {
    if (!user) {
      return null;
    }
    return { user, organizations: accountMemberships(user), oidc: false, issuerUrl: baseUrl };
  };

  const restore = () => sessionOf(current());

  const load = async ({ navigate }) => {
    claimsPromise = null;
    try {
      const profile = await api.get('/api/user', OPTIONAL);
      applyAccountPreferences(profile?.preferences);
      store(profile);
      return restore();
    } catch (error) {
      if (error.status === 401) {
        clear();
        return null;
      }
      if (error.status === 403 && error.code === 'onboarding_required') {
        store(error.data);
        const next = typeof error.data?.next === 'string' ? error.data.next : '';
        if (SAFE_PATH.test(next)) {
          navigate(next, { replace: true });
        }
      }
      return restore();
    }
  };

  const begin = ({ method = '', navigate } = {}) => {
    if (method.startsWith('oidc-')) {
      const id = method.slice('oidc-'.length);
      if (!PROVIDER_NAME.test(id)) {
        throw new Error('invalid authentication provider');
      }
      window.location.assign(`${baseUrl}/oauth2/authorization/${id}`);
      return;
    }
    if (method === 'silent') {
      return;
    }
    navigate('/login');
  };

  const login = async (username, password, stayLoggedIn = false) => {
    const form = new URLSearchParams({ username, password });
    if (stayLoggedIn) {
      form.set('remember-me', 'true');
    }
    const data = await api.post('/login', form, {
      ...OPTIONAL,
      contentType: 'form',
      headers: JSON_ACCEPT,
    });
    events.emit('login');
    return data?.next || '';
  };

  const complete = () => Promise.resolve(null);

  const claims = () => {
    claimsPromise ||= api.get('/api/userinfo/claims').catch(() => null);
    return claimsPromise;
  };

  const savePreferences = async patch => {
    if (!current()) {
      return;
    }
    const saved = await api.patch('/api/user/preferences', patch).catch(() => null);
    applyAccountPreferences(saved?.preferences);
  };

  const signOut = async () => {
    const next = await api
      .post('/user/logout', null, { ...OPTIONAL, headers: JSON_ACCEPT })
      .then(data => data?.next)
      .catch(() => '');
    clear();
    dropStorage(storageKey);
    window.location.assign(safeNext(next, baseUrl) || '/');
  };

  return {
    id: 'cookie',
    issuerUrl: baseUrl,
    oidc: false,
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
    signOutEverywhere: signOut,
  };
};
