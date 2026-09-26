import axios from 'axios';

import { createApiClient } from './apiClient';
import { audienceOf, decodeJwt } from './jwt';

const REFRESH_AFTER_MS = 240000;
const PROVIDER_NAME = /^[A-Za-z0-9_-]+$/;

const normalizeUrl = url => url.replace(/\/+$/, '');

const isOidc = user => Boolean(user?.provider?.startsWith('oidc-'));

const idTokenOf = user => (isOidc(user) ? decodeJwt(decodeJwt(user.access_token)?.id_token) : null);

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
 * `stay_logged_in` is kept, the profile, claims and preferences
 * (`preferred_theme`, `preferred_language`, `preferred_pack`, `preferred_motion`) read and
 * written through the backend, and the backend's logout route for signing out everywhere. A
 * session it restores or completes is
 * `{ user, organizations, oidc, issuerUrl, clientId }`, the user being the
 * stored profile, the sign-in answer in the backend's snake_case wire
 * names, and `clientId` the `aud` of the ID token the backend embeds in
 * its JWT, empty for a local session. The API client drives `headers`, `retryAuth`,
 * `adoptResponse` and `endSession`, and the provider's own reads of the
 * profile, the claims, the preferences write and the trusted issuers go
 * through its own instance of that client, so a JWT the backend rotates
 * in an `x-refreshed-token` header on any of them is adopted.
 *
 * @param {Object} options - The app's side of the session
 * @param {string} options.baseUrl - The backend origin
 * @param {Object} options.events - The bus from `createSessionEvents`; `login` is emitted after a sign-in and `sessionEnded` when the backend rejects the session
 * @param {string} [options.storageKey] - localStorage key of the stored user
 * @returns {Object} The session provider `useSession`, the callback page, the API client and the app's login page drive
 */
export const createBackendSession = ({ baseUrl, events, storageKey = 'user' }) => {
  const api = `${baseUrl}/api`;
  let claimsPromise = null;
  let issuersPromise = null;

  const current = () => JSON.parse(localStorage.getItem(storageKey) || 'null');

  const store = user => localStorage.setItem(storageKey, JSON.stringify(user));

  const clear = () => {
    localStorage.removeItem(storageKey);
    claimsPromise = null;
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
        tokenRefreshTime: Date.now(),
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
    if (!user?.stay_logged_in || Date.now() - user.tokenRefreshTime < REFRESH_AFTER_MS) {
      return Promise.resolve(null);
    }
    return refreshToken();
  };

  const headers = async () => {
    await refreshIfNeeded();
    return authHeader();
  };

  const retryAuth = async () => Boolean(current()?.stay_logged_in && (await refreshToken()));

  const adoptResponse = responseHeaders => {
    const refreshed = responseHeaders?.['x-refreshed-token'];
    const user = refreshed ? current() : null;
    if (user) {
      store({ ...user, access_token: refreshed, tokenRefreshTime: Date.now() });
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
    return user
      ? {
          user,
          organizations: profileMemberships(user),
          oidc: isOidc(user),
          issuerUrl: '',
          clientId: audienceOf(idTokenOf(user)),
        }
      : null;
  };

  const load = async () => {
    claimsPromise = null;
    const session = restore();
    return session ? { ...session, issuerUrl: await issuerOf(session.user) } : null;
  };

  const reload = async () => {
    const user = current();
    if (!user) {
      return null;
    }
    const profile = await client.get('/api/user').catch(() => null);
    if (profile) {
      store({
        ...user,
        ...profile,
        stay_logged_in: user.stay_logged_in,
        tokenRefreshTime: user.tokenRefreshTime,
      });
    }
    return load();
  };

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
      store({ ...data, stay_logged_in: stayLoggedIn, tokenRefreshTime: Date.now() });
      events.emit('login');
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
    const profile = await axios
      .get(`${api}/user`, { headers: { 'x-access-token': token } })
      .then(({ data }) => data)
      .catch(() => null);
    store({
      ...(profile || {}),
      access_token: token,
      tokenRefreshTime: Date.now(),
      provider: decodeJwt(token)?.provider || null,
    });
    events.emit('login');
    return load();
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
