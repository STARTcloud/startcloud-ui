import axios from 'axios';

import { createApiClient } from './apiClient';
import { audienceOf, decodeJwt } from './jwt';

const EXPIRY_MARGIN_MS = 60000;
const NOT_MODIFIED = 304;
const PROVIDER_NAME = /^[A-Za-z0-9_-]+$/;

const normalizeUrl = url => url.replace(/\/+$/, '');

const isOidc = user => Boolean(user?.provider?.startsWith('oidc-'));

const kept = user => Boolean(user?.stay_logged_in || isOidc(user));

const idTokenOf = user => (isOidc(user) ? decodeJwt(decodeJwt(user.access_token)?.id_token) : null);

const expiringSoon = user => {
  const exp = decodeJwt(user?.access_token)?.exp;
  return typeof exp === 'number' && exp * 1000 - Date.now() < EXPIRY_MARGIN_MS;
};

/**
 * The memberships of a backend profile in the chrome's organization shape:
 * the name as the uuid, because local organizations have none, the role
 * upper-cased into the roles list, and the row's `is_primary` as the
 * primary flag.
 * @param {Object|null|undefined} user - The stored profile
 * @returns {Array<{ uuid: string, name: string, roles: string[], primary: boolean }>}
 */
export const profileMemberships = user =>
  (Array.isArray(user?.organizations) ? user.organizations : []).map(org => ({
    uuid: org.name,
    name: org.name,
    roles: org.role ? [String(org.role).toUpperCase()] : [],
    primary: Boolean(org.is_primary),
  }));

const failure = (message, messageKey) => {
  const error = new Error(message);
  error.messageKey = messageKey;
  return error;
};

/**
 * The app's own backend as the session: username and password or a
 * provider redirect through the backend's OIDC routes, the backend's JWT
 * (`access_token` of the sign-in answer) stored under `storageKey` and
 * sent as `x-access-token`, refreshed through the refresh endpoint while
 * the session is kept, `stay_logged_in` or an OIDC session, which is kept
 * by definition, the identity provider's refresh token deciding its life,
 * before a request when the JWT's own `exp` claim is within a minute and
 * once more on a `401` the client replays, a check of the token at
 * request time and never a clock. The profile is read through
 * `GET /api/user` on every `load()`, conditionally on the last `ETag` the
 * backend answered, a `304` answering the session the last `200`
 * produced, and merged over the stored record without its `access_token`
 * member, so a profile read never replaces the JWT and never hands out a
 * credential, the stored token and `stay_logged_in` kept as they are; a
 * look, theme, motion or language changed at the identity provider is
 * picked up on a normal page refresh, the stored record is the fallback on
 * any failure but a `401`, which clears it, and `restore()` answers null
 * while the record carries no `id`, so a token-only record never paints
 * as signed in. The account's `preferred_theme`, `preferred_language`,
 * `preferred_pack` and `preferred_motion` ride the stored record, applied
 * in memory while signed in and never mirrored into the browser's own
 * keys, and leave with the record at sign-out. `complete()` and `login()`
 * store the credential, await `login` on the bus, whose handler is the one
 * `load()`, and answer the restored session, reading nothing themselves.
 * The backend's logout route signs out everywhere. A session it restores
 * or completes is `{ user, organizations, oidc, issuerUrl, clientId }`,
 * the user being the stored record, the sign-in answer in the backend's
 * snake_case wire names, and `clientId` the `aud` of the ID token the
 * backend embeds in its JWT, empty for a local session. The API client
 * drives `headers`, `retryAuth`, `adoptResponse` and `endSession`, and the
 * provider's own reads of the profile, the claims, the preferences write
 * and the trusted issuers go through its own instance of that client, so
 * a JWT the backend rotates in an `x-refreshed-token` header on any of
 * them is adopted.
 *
 * @param {Object} options - The app's side of the session
 * @param {string} options.baseUrl - The backend origin
 * @param {Object} options.events - The bus from `createSessionEvents`; `login` is awaited after a sign-in and `sessionEnded` emitted when the backend rejects the session
 * @param {string} [options.storageKey] - localStorage key of the stored user
 * @returns {Object} The session provider `useSession`, the callback page, the API client and the app's login page drive
 */
export const createBackendSession = ({ baseUrl, events, storageKey = 'user' }) => {
  const api = `${baseUrl}/api`;
  let claimsPromise = null;
  let issuersPromise = null;
  let lastEtag = '';
  let lastSession = null;

  const current = () => JSON.parse(localStorage.getItem(storageKey) || 'null');

  const store = user => localStorage.setItem(storageKey, JSON.stringify(user));

  const clear = () => {
    localStorage.removeItem(storageKey);
    claimsPromise = null;
    lastEtag = '';
    lastSession = null;
  };

  const authHeader = () => {
    const user = current();
    return user?.access_token ? { 'x-access-token': user.access_token } : {};
  };

  const endSession = () => {
    clear();
    events.endSession();
  };

  const refreshToken = async () => {
    const user = current();
    if (!user) {
      return null;
    }
    try {
      const { data } = await axios.post(
        `${api}/auth/refresh-token`,
        { stay_logged_in: user.stay_logged_in },
        { headers: authHeader() }
      );
      if (!data.access_token) {
        return null;
      }
      const next = {
        ...user,
        ...data,
        stay_logged_in: data.stay_logged_in,
      };
      store(next);
      return next;
    } catch {
      return null;
    }
  };

  const refreshIfNeeded = () => {
    const user = current();
    if (!kept(user) || !expiringSoon(user)) {
      return Promise.resolve(null);
    }
    return refreshToken();
  };

  const headers = async () => {
    await refreshIfNeeded();
    return authHeader();
  };

  const retryAuth = async () => Boolean(kept(current()) && (await refreshToken()));

  const adoptResponse = responseHeaders => {
    const refreshed = responseHeaders?.['x-refreshed-token'];
    const user = refreshed ? current() : null;
    if (user) {
      store({ ...user, access_token: refreshed });
    }
  };

  const client = createApiClient({
    baseUrl,
    session: { headers, retryAuth, adoptResponse, endSession },
  });

  const trustedIssuers = () => {
    issuersPromise ||= client
      .get('/api/auth/oidc/issuers', { auth: false })
      .then(data => data.issuers || [])
      .catch(() => []);
    return issuersPromise;
  };

  const issuerOf = async user => {
    const issuer = idTokenOf(user)?.iss || '';
    if (!issuer.startsWith('https://')) {
      return '';
    }
    const trusted = await trustedIssuers();
    return trusted.some(entry => normalizeUrl(entry.issuer) === normalizeUrl(issuer)) ? issuer : '';
  };

  const restore = () => {
    const user = current();
    return user?.id
      ? {
          user,
          organizations: profileMemberships(user),
          oidc: isOidc(user),
          issuerUrl: '',
          clientId: audienceOf(idTokenOf(user)),
        }
      : null;
  };

  const resolved = async () => {
    const session = restore();
    lastSession = session ? { ...session, issuerUrl: await issuerOf(session.user) } : null;
    return lastSession;
  };

  const load = async () => {
    claimsPromise = null;
    if (!current()) {
      return null;
    }
    try {
      const answer = await client.get('/api/user', { etag: lastEtag });
      if (answer.status === NOT_MODIFIED) {
        return lastSession;
      }
      const profile = { ...answer.data };
      delete profile.access_token;
      const stored = current();
      if (!stored) {
        return null;
      }
      store({ ...stored, ...profile, stay_logged_in: stored.stay_logged_in });
      lastEtag = answer.etag;
    } catch (error) {
      if (error.status === 401) {
        clear();
        return null;
      }
    }
    return resolved();
  };

  const reload = load;

  const refresh = async () => ((await refreshToken()) ? load() : null);

  const begin = ({ method, silent = false }) => {
    if (!PROVIDER_NAME.test(method || '')) {
      throw new Error('invalid authentication provider');
    }
    window.location.assign(`${api}/auth/oidc/${method}${silent ? '?prompt=none' : ''}`);
  };

  const login = async (username, password, stayLoggedIn = false) => {
    const { data } = await axios.post(`${api}/auth/signin`, {
      username,
      password,
      stay_logged_in: stayLoggedIn,
    });
    if (data.access_token) {
      store({ ...data, stay_logged_in: stayLoggedIn });
      await events.emit('login');
    }
    return data;
  };

  const complete = async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      throw failure(params.get('error'), 'auth:errors.authenticationFailed');
    }
    const code = params.get('code');
    if (!code) {
      throw failure('no login code in callback', 'auth:errors.invalidResponse');
    }
    const token = await axios
      .post(`${api}/auth/oidc/exchange`, { code })
      .then(({ data }) => data?.token || null)
      .catch(() => null);
    if (!token) {
      throw failure('login code exchange failed', 'auth:errors.failedToProcess');
    }
    store({ access_token: token, provider: decodeJwt(token)?.provider || null });
    await events.emit('login');
    return restore();
  };

  const claims = () => {
    claimsPromise ||= client.get('/api/userinfo/claims').catch(() => null);
    return claimsPromise;
  };

  const savePreferences = async patch => {
    if (!current()) {
      return;
    }
    const saved = await client
      .patch('/api/user/preferences', patch)
      .then(() => true)
      .catch(() => false);
    const user = current();
    if (saved && user) {
      store({
        ...user,
        ...('theme' in patch ? { preferred_theme: patch.theme } : {}),
        ...(patch.language ? { preferred_language: patch.language } : {}),
        ...('pack' in patch ? { preferred_pack: patch.pack } : {}),
        ...('motion' in patch ? { preferred_motion: patch.motion } : {}),
      });
    }
  };

  const signOut = () => clear();

  const signOutEverywhere = async () => {
    const response = isOidc(current())
      ? await axios.post(`${api}/auth/oidc/logout`, {}, { headers: authHeader() }).catch(() => null)
      : null;
    clear();
    window.location.assign(response?.data?.redirect_url || '/');
  };

  return {
    id: 'backend',
    issuerUrl: '',
    storageKey,
    authHeader,
    current,
    restore,
    load,
    reload,
    refresh,
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
