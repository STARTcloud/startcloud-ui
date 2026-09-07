import { authMethod } from '../utils/capabilities';

import { createAnonymousSession } from './anonymousSession';
import { createBackendSession } from './backendSession';
import { createBrowserOidc } from './browserOidc';
import { createCookieSession } from './cookieSession';
import { createReturnTo } from './returnTo';

const STORAGE_KEY = 'intended_url';
const COOKIE_AUTH_PATHS = [
  '/login',
  '/authenticator',
  '/authenticator-method',
  '/passwordRecovery',
  '/passwordReset',
  '/registration',
  '/complete-onboarding',
  '/qrcode',
  '/provider-registration',
  '/public',
  '/oauth2',
  '/activate',
  '/activated',
  '/ciba',
  '/connect',
  '/continue',
  '/link-account-consent',
  '/link-account',
  '/error',
];

/**
 * The session provider and the return-to helper for the host behind
 * `status`, chosen by its first `auth` token: `idp` is the browser as the
 * OIDC public client against `status.idp` with `/callback` as the only
 * auth path, `cookie` is the identity provider's own session on the
 * serving origin with `/login` as the sign-in page and every reserved
 * segment of the identity contract's sign-in, onboarding and interstitial
 * groups plus `/error` as the auth paths, `none` is no session at all,
 * anything else is the app's own backend session with `/login` as the
 * sign-in page.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} events - The bus from `createSessionEvents`
 * @returns {{ session: Object, returnTo: Object }} The provider `useSession` drives and the helper from `createReturnTo`
 */
export const createSession = (status, events) => {
  const method = authMethod(status);
  if (method === 'none') {
    return {
      session: createAnonymousSession({ events }),
      returnTo: createReturnTo({ storageKey: STORAGE_KEY, authPaths: [] }),
    };
  }
  if (method === 'idp') {
    return {
      session: createBrowserOidc({
        ...status.idp,
        events,
        apiBase: import.meta.env.DEV ? '' : status.idp.issuer,
      }),
      returnTo: createReturnTo({ storageKey: STORAGE_KEY, authPaths: ['/callback'] }),
    };
  }
  if (method === 'cookie') {
    return {
      session: createCookieSession({ baseUrl: window.location.origin, events }),
      returnTo: createReturnTo({
        storageKey: STORAGE_KEY,
        signInPath: '/login',
        authPaths: COOKIE_AUTH_PATHS,
      }),
    };
  }
  return {
    session: createBackendSession({ baseUrl: window.location.origin, events }),
    returnTo: createReturnTo({
      storageKey: STORAGE_KEY,
      signInPath: '/login',
      authPaths: ['/login', '/register', '/auth/', '/setup'],
    }),
  };
};
